// app/api/dvf/route.js
// Source : data.gouv.fr — DVF géolocalisé 2020-2025 (resource d7933994-2c66-4131-a4da-cf7cd18040a4)
// Deux modes :
//   ?mode=rue&commune=94033&rue=BEAUMONTS  → transactions maisons sur cette rue
//   ?mode=stats&commune=94033              → stats agrégées pour l'onglet Villes

const DVF_RESOURCE = 'd7933994-2c66-4131-a4da-cf7cd18040a4';
const TABULAR_BASE = 'https://tabular-api.data.gouv.fr/api/resources';

// Codes INSEE des 19 communes cibles
const COMMUNES_94 = {
  '94067': 'Saint-Mandé',
  '94080': 'Vincennes',
  '94018': 'Charenton-le-Pont',
  '94052': 'Nogent-sur-Marne',
  '94058': 'Le Perreux-sur-Marne',
  '94068': 'Saint-Maur-des-Fossés',
  '94015': 'Bry-sur-Marne',
  '94033': 'Fontenay-sous-Bois',
  '94046': 'Maisons-Alfort',
  '94042': 'Joinville-le-Pont',
  '94055': 'Ormesson-sur-Marne',
  '94002': 'Alfortville',
  '94060': 'Le Plessis-Trévise',
  '94071': 'Sucy-en-Brie',
  '94079': 'Villiers-sur-Marne',
  '94019': 'Chennevières-sur-Marne',
  '94038': 'La Queue-en-Brie',
  '94017': 'Champigny-sur-Marne',
  '94028': 'Créteil',
};

async function queryTabular(params) {
  const url = new URL(`${TABULAR_BASE}/${DVF_RESOURCE}/data/`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  
  const res = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15000),
    next: { revalidate: 3600 }
  });
  if (!res.ok) throw new Error('Tabular API ' + res.status);
  return res.json();
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'rue';
  const commune = searchParams.get('commune');
  const rue = searchParams.get('rue');

  if (!commune) return Response.json({ error: 'commune requis' }, { status: 400 });

  try {
    // ── MODE RUE : transactions maisons sur une rue précise ──────────────
    if (mode === 'rue') {
      if (!rue) return Response.json({ error: 'rue requis' }, { status: 400 });

      // Appel 1 : filter par commune
      // On récupère 200 lignes max, filtrées côté serveur sur rue + type Maison
      const data = await queryTabular({
        'filter[code_commune][exact]': commune,
        'filter[adresse_nom_voie][contains]': rue.toUpperCase(),
        'page_size': 200,
        'sort': '-date_mutation',
      });

      // Filtrer côté serveur : Maison uniquement, surface > 0, prix > 0
      const maisons = (data.data || []).filter(t =>
        t.type_local === 'Maison' &&
        parseFloat(t.surface_reelle_bati) > 0 &&
        parseFloat(t.valeur_fonciere) > 10000
      );

      // Dédupliquer par id_mutation (une mutation peut avoir plusieurs lignes)
      const seen = new Set();
      const uniques = maisons.filter(t => {
        if (seen.has(t.id_mutation)) return false;
        seen.add(t.id_mutation);
        return true;
      });

      const transactions = uniques.map(t => ({
        date: t.date_mutation,
        adresse: [t.adresse_numero, t.adresse_suffixe, t.adresse_nom_voie].filter(Boolean).join(' '),
        prix: Math.round(parseFloat(t.valeur_fonciere)),
        surface: parseFloat(t.surface_reelle_bati),
        pieces: parseInt(t.nombre_pieces_principales) || null,
        terrain: parseFloat(t.surface_terrain) || null,
        prixM2: t.surface_reelle_bati ? Math.round(parseFloat(t.valeur_fonciere) / parseFloat(t.surface_reelle_bati)) : null,
        lat: parseFloat(t.latitude) || null,
        lng: parseFloat(t.longitude) || null,
        commune: t.nom_commune,
      })).sort((a, b) => new Date(b.date) - new Date(a.date));

      return Response.json({
        mode: 'rue',
        commune: COMMUNES_94[commune] || commune,
        rue: rue.toUpperCase(),
        nb: transactions.length,
        transactions,
        source: 'DVF data.gouv.fr 2020-2025',
      }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
    }

    // ── MODE STATS : prix médian/m² pour l'onglet Villes ────────────────
    if (mode === 'stats') {
      const data = await queryTabular({
        'filter[code_commune][exact]': commune,
        'filter[type_local][exact]': 'Maison',
        'page_size': 500,
        'sort': '-date_mutation',
      });

      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 2);

      const valides = (data.data || []).filter(t => {
        const surface = parseFloat(t.surface_reelle_bati);
        const prix = parseFloat(t.valeur_fonciere);
        const date = new Date(t.date_mutation);
        return surface >= 30 && prix > 50000 && date >= cutoff;
      });

      const prixM2List = valides
        .map(t => parseFloat(t.valeur_fonciere) / parseFloat(t.surface_reelle_bati))
        .filter(p => p > 1000 && p < 20000)
        .sort((a, b) => a - b);

      const mid = Math.floor(prixM2List.length / 2);
      const mediane = prixM2List.length === 0 ? null
        : prixM2List.length % 2 === 0
          ? Math.round((prixM2List[mid - 1] + prixM2List[mid]) / 2)
          : Math.round(prixM2List[mid]);

      const derniere = valides.map(t => t.date_mutation).sort().reverse()[0];

      return Response.json({
        mode: 'stats',
        commune: COMMUNES_94[commune] || commune,
        prix_m2_median: mediane,
        nb_transactions: valides.length,
        derniere_mutation: derniere,
        source: 'DVF data.gouv.fr 2023-2025',
      }, { headers: { 'Cache-Control': 'public, max-age=86400' } });
    }

    return Response.json({ error: 'mode invalide' }, { status: 400 });

  } catch (e) {
    console.error('DVF route error:', e.message);
    return Response.json({ error: 'Erreur serveur: ' + e.message }, { status: 500 });
  }
}
