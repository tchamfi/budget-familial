// app/api/dvf/route.js
// Sources DVF :
//   2020-2025 → resource d7933994 (DVF géolocalisé Etalab, mis à jour semestriellement)
//   2014-2019 → resources par année (DVF brut DGFiP via cadastre.data.gouv.fr)
// Supabase gardé en fallback pour les stats historiques
import { getSessionUser, unauthorized } from '../../../lib/session';

export const dynamic = 'force-dynamic';

const TABULAR_BASE = 'https://tabular-api.data.gouv.fr/api/resources';

// Resource ID du fichier géolocalisé 2020→ (adresses + lat/lng)
const DVF_RECENT = 'd7933994-2c66-4131-a4da-cf7cd18040a4';

// Resource IDs des fichiers bruts par année 2014-2019 (adresses, pas de lat/lng)
// Source : cadastre.data.gouv.fr/dvf
const DVF_PAR_ANNEE = {
  '2019': '3004168d-bec4-44d9-a781-ef16f41856a2',
  '2018': '1be77ca5-dc1b-4e50-af2b-0240147e0346',
  '2017': '7161c9f2-3d91-4caf-afa2-cfe535807f04',
  '2016': '0ab442c5-57d1-4139-92dd-266bded72d42',
  '2015': 'f4ca5ea2-a329-4df5-b9ae-b6b5c87f7713',
  '2014': '463b6c72-8e75-4ad4-a49e-a64e19c1406e',
};

// Colonnes DVF brut (différentes du fichier géolocalisé)
const COL_BRUT = {
  commune:  'code_commune',
  voie:     'adresse_nom_voie',
  type:     'type_local',
  nature:   'nature_mutation',
  date:     'date_mutation',
  prix:     'valeur_fonciere',
  surface:  'surface_reelle_bati',
  pieces:   'nombre_pieces_principales',
  terrain:  'surface_terrain',
  lat:      'latitude',
  lng:      'longitude',
};
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

// Fetch depuis le fichier géolocalisé récent (2020→, avec lat/lng)
async function fetchDVFRecent({ commune, rue, dateMin, pageSize = 200 }) {
  const params = new URLSearchParams({
    'code_commune__exact': commune,
    'type_local__exact':   'Maison',
    'date_mutation__sort': 'desc',
    'page_size':           String(Math.min(pageSize, 200)),
  });
  if (rue) params.set('adresse_nom_voie__contains', rue.toUpperCase().trim());
  if (dateMin) params.set('date_mutation__greater', dateMin);

  const url = `${TABULAR_BASE}/${DVF_RECENT}/data/?${params}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) { console.error('[DVF recent]', res.status, await res.text().catch(()=>'')); return []; }
  const json = await res.json();
  console.log('[DVF recent] résultats:', json.data?.length, '| total:', json.meta?.total);

  const seen = new Set();
  return (json.data || [])
    .filter(t => parseFloat(t.surface_reelle_bati) > 0 && parseFloat(t.valeur_fonciere) > 10000
      && !seen.has(t.id_mutation) && seen.add(t.id_mutation))
    .map(t => {
      const surface = parseFloat(t.surface_reelle_bati);
      const prix    = Math.round(parseFloat(t.valeur_fonciere));
      return {
        date: t.date_mutation,
        adresse: [t.adresse_numero, t.adresse_suffixe, t.adresse_nom_voie].filter(Boolean).join(' '),
        prix, surface,
        pieces:  parseInt(t.nombre_pieces_principales) || null,
        terrain: parseFloat(t.surface_terrain) || null,
        prixM2:  surface > 0 ? Math.round(prix / surface) : null,
        lat: parseFloat(t.latitude) || null, lng: parseFloat(t.longitude) || null,
        commune: t.nom_commune || COMMUNES_94[commune] || commune,
        source: `DVF data.gouv.fr ${t.date_mutation?.slice(0, 4) || ''}`,
      };
    });
}

// Fetch depuis un fichier brut par année (2014-2019, avec adresses mais sans lat/lng)
async function fetchDVFAnnee(annee, { commune, rue, pageSize = 200 }) {
  const rid = DVF_PAR_ANNEE[String(annee)];
  if (!rid) return [];

  const params = new URLSearchParams({
    'code_commune__exact':    commune,
    'type_local__exact':      'Maison',
    'nature_mutation__exact': 'Vente',
    'date_mutation__sort':    'desc',
    'page_size':              String(Math.min(pageSize, 200)),
  });
  if (rue) params.set('adresse_nom_voie__contains', rue.toUpperCase().trim());

  const url = `${TABULAR_BASE}/${rid}/data/?${params}`;
  console.log(`[DVF ${annee}] fetch:`, url);
  const res = await fetch(url, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(15000) });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error(`[DVF ${annee}] erreur ${res.status}:`, txt.slice(0, 200));
    return [];
  }
  const json = await res.json();
  console.log(`[DVF ${annee}] résultats:`, json.data?.length, '| total:', json.meta?.total);

  return (json.data || [])
    .filter(t => parseFloat(t.surface_reelle_bati) > 0 && parseFloat(t.valeur_fonciere) > 10000)
    .map(t => {
      const surface = parseFloat(t.surface_reelle_bati);
      const prix    = Math.round(parseFloat(t.valeur_fonciere));
      return {
        date: t.date_mutation,
        adresse: [t.adresse_numero, t.adresse_suffixe, t.adresse_nom_voie].filter(Boolean).join(' '),
        prix, surface,
        pieces:  parseInt(t.nombre_pieces_principales) || null,
        terrain: parseFloat(t.surface_terrain) || null,
        prixM2:  surface > 0 ? Math.round(prix / surface) : null,
        lat: null, lng: null,
        commune: t.nom_commune || COMMUNES_94[commune] || commune,
        source: `DVF data.gouv.fr ${annee}`,
      };
    });
}

// Fetch toutes les années historiques en parallèle
async function fetchDVFHistorique({ commune, rue }) {
  const annees = ['2019', '2018', '2017', '2016', '2015', '2014'];
  const results = await Promise.all(annees.map(a => fetchDVFAnnee(a, { commune, rue })));
  return results.flat();
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
  if (!getSessionUser(request)) return unauthorized();
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
        fetchDVFRecent({ commune, rue, dateMin: '2020-01-01' }),
        fetchDVFHistorique({ commune, rue }),
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
        fetchDVFRecent({ commune, dateMin: '2020-01-01' }),
        fetchDVFHistorique({ commune, rue: null }),
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
        fetchDVFRecent({ commune, dateMin: '2023-01-01' }),
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
