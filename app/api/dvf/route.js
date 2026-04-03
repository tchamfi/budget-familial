// app/api/dvf/route.js
// Source : tabular-api.data.gouv.fr — DVF géolocalisé 2020-2025
// Format filtres : column__exact=val, column__contains=val, column__sort=desc
// Resource ID : d7933994-2c66-4131-a4da-cf7cd18040a4

const DVF_RESOURCE = 'd7933994-2c66-4131-a4da-cf7cd18040a4';
const TABULAR_BASE = `https://tabular-api.data.gouv.fr/api/resources/${DVF_RESOURCE}/data/`;

const COMMUNES_94 = {
  '94067': 'Saint-Mandé', '94080': 'Vincennes', '94018': 'Charenton-le-Pont',
  '94052': 'Nogent-sur-Marne', '94058': 'Le Perreux-sur-Marne',
  '94068': 'Saint-Maur-des-Fossés', '94015': 'Bry-sur-Marne',
  '94033': 'Fontenay-sous-Bois', '94046': 'Maisons-Alfort',
  '94042': 'Joinville-le-Pont', '94055': 'Ormesson-sur-Marne',
  '94002': 'Alfortville', '94060': 'Le Plessis-Trévise',
  '94071': 'Sucy-en-Brie', '94079': 'Villiers-sur-Marne',
  '94019': 'Chennevières-sur-Marne', '94038': 'La Queue-en-Brie',
  '94017': 'Champigny-sur-Marne', '94028': 'Créteil',
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const mode    = searchParams.get('mode') || 'rue';
  const commune = searchParams.get('commune');
  const rue     = searchParams.get('rue');

  if (!commune) return Response.json({ error: 'commune requis' }, { status: 400 });

  try {
    // ── MODE RUE ─────────────────────────────────────────────────────────
    if (mode === 'rue') {
      if (!rue) return Response.json({ error: 'rue requis' }, { status: 400 });

      // Format correct : column__operator=value (double underscore)
      const params = new URLSearchParams({
        'code_commune__exact':        commune,
        'adresse_nom_voie__contains': rue.toUpperCase().trim(),
        'date_mutation__sort':        'desc',
        'page_size':                  '200',
      });

      const res = await fetch(`${TABULAR_BASE}?${params}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Tabular API ${res.status}: ${txt.slice(0, 200)}`);
      }

      const json = await res.json();

      // Filtrer côté serveur : Maison uniquement, surface > 0, prix réaliste
      const maisons = (json.data || []).filter(t =>
        t.type_local === 'Maison' &&
        parseFloat(t.surface_reelle_bati) > 0 &&
        parseFloat(t.valeur_fonciere) > 10000
      );

      // Dédupliquer par id_mutation
      const seen = new Set();
      const uniques = maisons.filter(t => {
        if (seen.has(t.id_mutation)) return false;
        seen.add(t.id_mutation); return true;
      });

      const transactions = uniques.map(t => {
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
          commune: t.nom_commune,
        };
      }).sort((a, b) => new Date(b.date) - new Date(a.date));

      return Response.json({
        mode: 'rue', commune: COMMUNES_94[commune] || commune,
        rue: rue.toUpperCase().trim(), nb: transactions.length, transactions,
        source: 'DVF data.gouv.fr 2020-2025 (DGFiP)',
      }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
    }

    // ── MODE STATS ────────────────────────────────────────────────────────
    if (mode === 'stats') {
      const params = new URLSearchParams({
        'code_commune__exact': commune,
        'type_local__exact':   'Maison',
        'date_mutation__sort': 'desc',
        'page_size':           '200',
      });

      const res = await fetch(`${TABULAR_BASE}?${params}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) throw new Error(`Tabular API ${res.status}`);
      const json = await res.json();

      const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 2);
      const valides = (json.data || []).filter(t => {
        const surface = parseFloat(t.surface_reelle_bati);
        const prix    = parseFloat(t.valeur_fonciere);
        return surface >= 30 && prix > 50000 && new Date(t.date_mutation) >= cutoff;
      });

      const prixM2List = valides
        .map(t => parseFloat(t.valeur_fonciere) / parseFloat(t.surface_reelle_bati))
        .filter(p => p > 1000 && p < 20000).sort((a, b) => a - b);

      const mid = Math.floor(prixM2List.length / 2);
      const mediane = prixM2List.length === 0 ? null
        : prixM2List.length % 2 === 0
          ? Math.round((prixM2List[mid-1] + prixM2List[mid]) / 2)
          : Math.round(prixM2List[mid]);

      return Response.json({
        mode: 'stats', commune: COMMUNES_94[commune] || commune,
        prix_m2_median: mediane, nb_transactions: valides.length,
        source: 'DVF data.gouv.fr 2023-2025',
      }, { headers: { 'Cache-Control': 'public, max-age=86400' } });
    }

    return Response.json({ error: 'mode invalide' }, { status: 400 });

  } catch (e) {
    console.error('DVF route error:', e.message);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
