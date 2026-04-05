// app/api/dvf/route.js
// Sources mergées :
//   2014-2019 → Supabase (PostgreSQL)
//   2020-2025 → tabular-api.data.gouv.fr (DGFiP)

const DVF_RESOURCE  = 'd7933994-2c66-4131-a4da-cf7cd18040a4';
const TABULAR_BASE  = `https://tabular-api.data.gouv.fr/api/resources/${DVF_RESOURCE}/data/`;
const SUPABASE_URL  = process.env.SUPABASE_URL;   // ex: https://caktmsnjvkqyrykxkayb.supabase.co
const SUPABASE_KEY  = process.env.SUPABASE_ANON_KEY; // clé publishable (lecture seule)

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

// ─── SUPABASE : données 2014-2019 ────────────────────────────────────────────

async function fetchSupabase(commune, dateMin = '2014-01-01', dateMax = '2019-12-31', limit = 500) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];

  const url = new URL(`${SUPABASE_URL}/rest/v1/dvf_transactions`);
  url.searchParams.set('commune_code', `eq.${commune}`);
  url.searchParams.set('date_mutation', `gte.${dateMin}`);
  // On ajoute aussi un filtre date_mutation <= dateMax
  url.searchParams.set('and', `(date_mutation.lte.${dateMax})`);
  url.searchParams.set('order', 'date_mutation.desc');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('select', 'date_mutation,prix,surface,pieces,terrain,dept,commune_nom');

  // Correction : Supabase utilise des paramètres séparés pour les filtres
  // On reconstruit proprement
  const params = new URLSearchParams({
    'commune_code': `eq.${commune}`,
    'date_mutation': `gte.${dateMin}`,
    'order': 'date_mutation.desc',
    'limit': String(limit),
    'select': 'date_mutation,prix,surface,pieces,terrain,dept,commune_nom',
  });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/dvf_transactions?${params}`, {
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Accept':        'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    console.error('Supabase error:', res.status, await res.text().catch(() => ''));
    return [];
  }

  const data = await res.json();
  // Filtrer côté client la borne haute de date (Supabase ne supporte pas 2 filtres sur la même colonne via query params)
  return (data || [])
    .filter(r => r.date_mutation <= dateMax)
    .map(r => ({
      date:    r.date_mutation,
      adresse: null,   // pas disponible dans Cerema DVF+
      prix:    r.prix,
      surface: r.surface,
      pieces:  r.pieces,
      terrain: r.terrain,
      prixM2:  r.surface > 0 ? Math.round(r.prix / r.surface) : null,
      lat:     null,   // pas dans ce format
      lng:     null,
      commune: r.commune_nom || COMMUNES_94[commune] || commune,
      source:  'DVF Cerema 2014-2019',
    }));
}

// ─── DATA.GOUV.FR : données 2020-2025 ────────────────────────────────────────

async function fetchDataGouv(commune, mode = 'rue', rue = null) {
  const params = new URLSearchParams({
    'code_commune__exact': commune,
    'type_local__exact':   'Maison',
    'date_mutation__sort': 'desc',
    'page_size':           '200',
  });

  if (mode === 'rue' && rue) {
    params.set('adresse_nom_voie__contains', rue.toUpperCase().trim());
  }

  const res = await fetch(`${TABULAR_BASE}?${params}`, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`data.gouv.fr ${res.status}`);

  const json = await res.json();
  const valides = (json.data || []).filter(t =>
    t.type_local === 'Maison' &&
    parseFloat(t.surface_reelle_bati) > 0 &&
    parseFloat(t.valeur_fonciere) > 10000
  );

  // Dédoublonnage par id_mutation
  const seen = new Set();
  return valides
    .filter(t => { if (seen.has(t.id_mutation)) return false; seen.add(t.id_mutation); return true; })
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
        source:  'DVF data.gouv.fr 2020-2025',
      };
    });
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode    = searchParams.get('mode') || 'stats';
  const commune = searchParams.get('commune');
  const rue     = searchParams.get('rue');

  if (!commune) return Response.json({ error: 'commune requis' }, { status: 400 });

  try {
    // ── MODE RUE : recherche par voie (2020-2025 uniquement — adresse non dispo dans Cerema) ──
    if (mode === 'rue') {
      if (!rue) return Response.json({ error: 'rue requis' }, { status: 400 });

      const transactions = await fetchDataGouv(commune, 'rue', rue);
      transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

      return Response.json({
        mode: 'rue',
        commune: COMMUNES_94[commune] || commune,
        rue: rue.toUpperCase().trim(),
        nb: transactions.length,
        transactions,
        source: 'DVF data.gouv.fr 2020-2025 (adresses non disponibles sur 2014-2019)',
      }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
    }

    // ── MODE STATS : prix médian toutes années confondues ─────────────────────
    if (mode === 'stats') {
      // Fetch en parallèle les deux sources
      const [recents, historiques] = await Promise.all([
        fetchDataGouv(commune, 'stats'),
        fetchSupabase(commune, '2014-01-01', '2019-12-31', 500),
      ]);

      // Pour les stats on filtre à 2 ans sur la source récente
      const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 2);
      const recentsFiltered = recents.filter(t => new Date(t.date) >= cutoff);

      // Médiane prix/m² sur les 2 dernières années (source récente)
      const prixM2Recents = recentsFiltered
        .map(t => t.prixM2)
        .filter(p => p && p > 1000 && p < 20000)
        .sort((a, b) => a - b);

      // Médiane prix/m² sur 2014-2019 (source historique)
      const prixM2Histo = historiques
        .map(t => t.prixM2)
        .filter(p => p && p > 1000 && p < 20000)
        .sort((a, b) => a - b);

      const mediane = (arr) => {
        if (!arr.length) return null;
        const mid = Math.floor(arr.length / 2);
        return arr.length % 2 === 0
          ? Math.round((arr[mid-1] + arr[mid]) / 2)
          : Math.round(arr[mid]);
      };

      return Response.json({
        mode: 'stats',
        commune: COMMUNES_94[commune] || commune,
        prix_m2_median:        mediane(prixM2Recents),
        prix_m2_median_histo:  mediane(prixM2Histo),
        nb_transactions:       recentsFiltered.length,
        nb_transactions_histo: historiques.length,
        source_recente:        'DVF data.gouv.fr 2023-2025',
        source_historique:     'DVF Cerema 2014-2019 (Supabase)',
      }, { headers: { 'Cache-Control': 'public, max-age=86400' } });
    }

    // ── MODE HISTORIQUE : toutes les transactions 2014-2025 ──────────────────
    if (mode === 'historique') {
      const [recents, historiques] = await Promise.all([
        fetchDataGouv(commune, 'stats'),
        fetchSupabase(commune, '2014-01-01', '2019-12-31', 1000),
      ]);

      // Merger et trier par date décroissante
      const all = [...recents, ...historiques]
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      // Grouper par année pour le graphique
      const byYear = {};
      all.forEach(t => {
        const year = t.date?.slice(0, 4);
        if (!year) return;
        if (!byYear[year]) byYear[year] = { nb: 0, prixM2: [] };
        byYear[year].nb++;
        if (t.prixM2 && t.prixM2 > 1000 && t.prixM2 < 20000) {
          byYear[year].prixM2.push(t.prixM2);
        }
      });

      const evolution = Object.entries(byYear)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([year, data]) => {
          const sorted = data.prixM2.sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          const mediane = sorted.length === 0 ? null
            : sorted.length % 2 === 0
              ? Math.round((sorted[mid-1] + sorted[mid]) / 2)
              : Math.round(sorted[mid]);
          return { year, nb: data.nb, prixM2Median: mediane };
        });

      return Response.json({
        mode: 'historique',
        commune: COMMUNES_94[commune] || commune,
        nb: all.length,
        nb_recents: recents.length,
        nb_historiques: historiques.length,
        transactions: all.slice(0, 200), // limiter à 200 pour le rendu
        evolution,
      }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
    }

    return Response.json({ error: 'mode invalide (rue | stats | historique)' }, { status: 400 });

  } catch (e) {
    console.error('DVF route error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
