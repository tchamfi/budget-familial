// app/api/dvf/route.js
// Source unique : tabular-api.data.gouv.fr — DVF géolocalisé 2014→2025 (DGFiP/Etalab)
// Resource ID d7933994 = fichier unique couvrant toutes les années depuis 2014
// Supabase gardé uniquement pour le mode 'stats' (médiane historique)

const DVF_RESOURCE  = 'd7933994-2c66-4131-a4da-cf7cd18040a4';
const TABULAR_BASE  = `https://tabular-api.data.gouv.fr/api/resources/${DVF_RESOURCE}/data/`;
const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_ANON_KEY;

const COMMUNES_94 = {
  '94067': 'Saint-Mandé',         '94080': 'Vincennes',
  '94018': 'Charenton-le-Pont',   '94052': 'Nogent-sur-Marne',
  '94058': 'Le Perreux-sur-Marne','94068': 'Saint-Maur-des-Fossés',
  '94015': 'Bry-sur-Marne',       '94033': 'Fontenay-sous-Bois',
  '94046': 'Maisons-Alfort',      '94042': 'Joinville-le-Pont',
  '94055': 'Ormesson-sur-Marne',  '94002': 'Alfortville',
  '94060': 'Le Plessis-Trévise',  '94071': 'Sucy-en-Brie',
  '94079': 'Villiers-sur-Marne',  '94019': 'Chennevières-sur-Marne',
  '94038': 'La Queue-en-Brie',    '94017': 'Champigny-sur-Marne',
  '94028': 'Créteil',
};

// ─── DVF tabular API (2014-2025, avec adresses) ───────────────────────────────

async function fetchDVF({ commune, rue, dateMin, dateMax, pageSize = 500 }) {
  const params = new URLSearchParams({
    'code_commune__exact': commune,
    'type_local__exact':   'Maison',
    'date_mutation__sort': 'desc',
    'page_size':           String(pageSize),
  });

  // Filtre par rue si fourni
  if (rue) {
    params.set('adresse_nom_voie__contains', rue.toUpperCase().trim());
  }
  // Filtre date min si fourni (ex: "2014-01-01")
  if (dateMin) {
    params.set('date_mutation__greater', dateMin);
  }
  // Filtre date max si fourni (ex: "2019-12-31")
  if (dateMax) {
    params.set('date_mutation__less', dateMax);
  }

  const res = await fetch(`${TABULAR_BASE}?${params}`, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) throw new Error(`DVF API ${res.status}`);
  const json = await res.json();

  // Filtrer : surface > 0, prix réaliste, dédoublonner par id_mutation
  const seen = new Set();
  return (json.data || [])
    .filter(t =>
      parseFloat(t.surface_reelle_bati) > 0 &&
      parseFloat(t.valeur_fonciere) > 10000 &&
      !seen.has(t.id_mutation) && seen.add(t.id_mutation)
    )
    .map(t => {
      const surface = parseFloat(t.surface_reelle_bati);
      const prix    = Math.round(parseFloat(t.valeur_fonciere));
      return {
        date:    t.date_mutation,
        adresse: [t.adresse_numero, t.adresse_suffixe, t.adresse_nom_voie].filter(Boolean).join(' '),
        prix,
        surface,
        pieces:  parseInt(t.nombre_pieces_principales) || null,
        terrain: parseFloat(t.surface_terrain) || null,
        prixM2:  surface > 0 ? Math.round(prix / surface) : null,
        lat:     parseFloat(t.latitude)  || null,
        lng:     parseFloat(t.longitude) || null,
        commune: t.nom_commune || COMMUNES_94[commune] || commune,
        source:  `DVF data.gouv.fr ${t.date_mutation?.slice(0, 4) || ''}`,
      };
    });
}

// ─── Supabase (médiane historique uniquement) ─────────────────────────────────

async function fetchSupabaseStats(commune) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  const params = new URLSearchParams({
    'commune_code': `eq.${commune}`,
    'order':        'date_mutation.desc',
    'limit':        '500',
    'select':       'date_mutation,prix,surface,pieces,terrain',
  });
  const res = await fetch(`${SUPABASE_URL}/rest/v1/dvf_transactions?${params}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  return (await res.json()) || [];
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function mediane(arr) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : Math.round(sorted[mid]);
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode    = searchParams.get('mode') || 'rue';
  const commune = searchParams.get('commune');
  const rue     = searchParams.get('rue');

  if (!commune) return Response.json({ error: 'commune requis' }, { status: 400 });

  try {

    // ── MODE RUE : recherche par voie 2014-2025 ───────────────────────────────
    if (mode === 'rue') {
      if (!rue) return Response.json({ error: 'rue requis' }, { status: 400 });

      // Deux requêtes en parallèle pour couvrir toute la période :
      // - 2020-2025 : données récentes (tri desc, les plus récentes d'abord)
      // - 2014-2019 : données historiques (même rue, même commune)
      const [recent, ancien] = await Promise.all([
        fetchDVF({ commune, rue, dateMin: '2020-01-01', pageSize: 500 }),
        fetchDVF({ commune, rue, dateMin: '2014-01-01', dateMax: '2019-12-31', pageSize: 500 }),
      ]);

      const transactions = [...recent, ...ancien]
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      return Response.json({
        mode: 'rue',
        commune: COMMUNES_94[commune] || commune,
        rue: rue.toUpperCase().trim(),
        nb: transactions.length,
        nb_recents: recent.length,
        nb_historiques: ancien.length,
        transactions,
        source: 'DVF data.gouv.fr 2014-2025 (DGFiP/Etalab)',
      }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
    }

    // ── MODE HISTORIQUE : toutes les transactions 2014-2025 ───────────────────
    if (mode === 'historique') {
      // Fetch 2014-2019 et 2020-2025 en parallèle (deux requêtes pour contourner
      // la limite de page_size=500 sur une grande plage)
      const [recent, ancien] = await Promise.all([
        fetchDVF({ commune, dateMin: '2020-01-01', pageSize: 500 }),
        fetchDVF({ commune, dateMin: '2014-01-01', dateMax: '2019-12-31', pageSize: 500 }),
      ]);

      const all = [...recent, ...ancien].sort((a, b) => new Date(b.date) - new Date(a.date));

      // Médiane récente (2 dernières années) pour l'estimateur
      const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 2);
      const prixM2Recents = recent
        .filter(t => new Date(t.date) >= cutoff)
        .map(t => t.prixM2).filter(p => p && p > 1000 && p < 20000);

      // Évolution par année
      const byYear = {};
      all.forEach(t => {
        const y = t.date?.slice(0, 4);
        if (!y) return;
        if (!byYear[y]) byYear[y] = { nb: 0, prixM2: [] };
        byYear[y].nb++;
        if (t.prixM2 && t.prixM2 > 1000 && t.prixM2 < 20000) byYear[y].prixM2.push(t.prixM2);
      });

      const evolution = Object.entries(byYear)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([year, d]) => ({ year, nb: d.nb, prixM2Median: mediane(d.prixM2) }));

      return Response.json({
        mode: 'historique',
        commune: COMMUNES_94[commune] || commune,
        prix_m2_median: mediane(prixM2Recents),
        nb: all.length,
        nb_recents: recent.length,
        nb_historiques: ancien.length,
        transactions: all.slice(0, 500),
        evolution,
        source: 'DVF data.gouv.fr 2014-2025 (DGFiP/Etalab) — adresses complètes',
      }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
    }

    // ── MODE STATS : prix médian commune ─────────────────────────────────────
    if (mode === 'stats') {
      const [recent, histo] = await Promise.all([
        fetchDVF({ commune, dateMin: '2023-01-01', pageSize: 200 }),
        fetchSupabaseStats(commune),
      ]);

      const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 2);
      const prixM2Recent = recent
        .filter(t => new Date(t.date) >= cutoff)
        .map(t => t.prixM2).filter(p => p && p > 1000 && p < 20000);

      const prixM2Histo = histo
        .filter(r => r.surface > 0 && r.prix > 0)
        .map(r => Math.round(r.prix / r.surface))
        .filter(p => p > 1000 && p < 20000);

      return Response.json({
        mode: 'stats',
        commune: COMMUNES_94[commune] || commune,
        prix_m2_median:       mediane(prixM2Recent),
        prix_m2_median_histo: mediane(prixM2Histo),
        nb_transactions:      recent.length,
        nb_transactions_histo: histo.length,
      }, { headers: { 'Cache-Control': 'public, max-age=86400' } });
    }

    return Response.json({ error: 'mode invalide (rue | historique | stats)' }, { status: 400 });

  } catch (e) {
    console.error('DVF route error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
