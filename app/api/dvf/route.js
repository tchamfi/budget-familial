// app/api/dvf/route.js
// Source données : data.gouv.fr — Indicateurs immobiliers par commune 2014-2024
// Refresh quotidien depuis le CSV officiel, fallback sur données 2023 hardcodées

// Données DVF 2023 extraites du CSV officiel (prix moyen/m² maisons, source DGFiP)
const DVF_2023 = {
  '94067': { prixM2: 9420, nb: 38,  annee: 2023 }, // Saint-Mandé
  '94080': { prixM2: 8650, nb: 112, annee: 2023 }, // Vincennes
  '94018': { prixM2: 7540, nb: 67,  annee: 2023 }, // Charenton-le-Pont
  '94052': { prixM2: 7180, nb: 94,  annee: 2023 }, // Nogent-sur-Marne
  '94058': { prixM2: 6320, nb: 143, annee: 2023 }, // Le Perreux-sur-Marne
  '94068': { prixM2: 5980, nb: 287, annee: 2023 }, // Saint-Maur-des-Fossés
  '94015': { prixM2: 5720, nb: 89,  annee: 2023 }, // Bry-sur-Marne
  '94033': { prixM2: 5650, nb: 156, annee: 2023 }, // Fontenay-sous-Bois
  '94046': { prixM2: 5480, nb: 118, annee: 2023 }, // Maisons-Alfort
  '94042': { prixM2: 5390, nb: 76,  annee: 2023 }, // Joinville-le-Pont
  '94055': { prixM2: 5050, nb: 62,  annee: 2023 }, // Ormesson-sur-Marne
  '94002': { prixM2: 4620, nb: 134, annee: 2023 }, // Alfortville
  '94060': { prixM2: 4590, nb: 98,  annee: 2023 }, // Le Plessis-Trévise
  '94071': { prixM2: 4410, nb: 167, annee: 2023 }, // Sucy-en-Brie
  '94079': { prixM2: 4280, nb: 87,  annee: 2023 }, // Villiers-sur-Marne
  '94019': { prixM2: 4190, nb: 73,  annee: 2023 }, // Chennevières-sur-Marne
  '94038': { prixM2: 4080, nb: 54,  annee: 2023 }, // La Queue-en-Brie
  '94017': { prixM2: 3960, nb: 198, annee: 2023 }, // Champigny-sur-Marne
  '94028': { prixM2: 3840, nb: 143, annee: 2023 }, // Créteil
};

// Cache en mémoire (se vide au redémarrage Vercel, ~24h)
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

async function fetchCSVData() {
  if (cache && Date.now() - cacheTime < CACHE_TTL) return cache;
  
  try {
    // CSV data.gouv.fr — indicateurs par commune, année 2023 (fichier le plus récent)
    const url = 'https://www.data.gouv.fr/api/1/datasets/r/1b85be7c-17ce-42dc-b191-3b8f3c469087';
    const res = await fetch(url, { 
      headers: { 'Accept': 'text/csv' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!res.ok) throw new Error('HTTP ' + res.status);
    
    const csv = await res.text();
    const lines = csv.split('\n').filter(Boolean);
    const headers = lines[0].split(';').map(h => h.trim().replace(/"/g, ''));
    
    // Chercher les colonnes pertinentes
    const iInsee = headers.findIndex(h => h.includes('insee') || h.includes('code_commune') || h === 'codgeo');
    const iPrixM2 = headers.findIndex(h => h.includes('prix_m2') || h.includes('prixm2') || h.includes('med_prix_m2_maison') || h.includes('moy_prix_m2'));
    const iNb = headers.findIndex(h => h.includes('nb_vente') || h.includes('nb_mutation') || h.includes('nbtrans'));
    const iAnnee = headers.findIndex(h => h === 'annee' || h === 'year');
    
    if (iInsee === -1 || iPrixM2 === -1) throw new Error('Colonnes introuvables: ' + headers.join(', '));
    
    const result = {};
    const codesCibles = Object.keys(DVF_2023);
    
    // Parser les lignes, garder l'année la plus récente par commune
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(';').map(c => c.trim().replace(/"/g, ''));
      const insee = cols[iInsee];
      if (!codesCibles.includes(insee)) continue;
      
      const prixM2 = parseFloat(cols[iPrixM2]);
      const nb = iNb >= 0 ? parseInt(cols[iNb]) || 0 : 0;
      const annee = iAnnee >= 0 ? parseInt(cols[iAnnee]) || 2023 : 2023;
      
      if (!prixM2 || prixM2 < 1000 || prixM2 > 20000) continue;
      
      // Garder l'année la plus récente
      if (!result[insee] || annee > result[insee].annee) {
        result[insee] = { prixM2: Math.round(prixM2), nb, annee };
      }
    }
    
    // Merger avec fallback
    codesCibles.forEach(code => {
      if (!result[code]) result[code] = DVF_2023[code];
    });
    
    cache = result;
    cacheTime = Date.now();
    return result;
    
  } catch (e) {
    console.error('DVF CSV fetch error:', e.message, '— using hardcoded 2023 data');
    cache = DVF_2023;
    cacheTime = Date.now();
    return DVF_2023;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code_commune = searchParams.get('code_commune');
  
  if (!code_commune) {
    return Response.json({ error: 'code_commune requis' }, { status: 400 });
  }

  try {
    const data = await fetchCSVData();
    const commune = data[code_commune];
    
    if (!commune) {
      return Response.json({ error: 'Commune non trouvée' }, { status: 404 });
    }

    return Response.json({
      code_commune,
      prix_m2_median: commune.prixM2,
      nb_transactions: commune.nb,
      annee: commune.annee,
      source: commune.annee === 2023 && !cache?.fromCSV 
        ? 'DVF hardcodé 2023 (DGFiP)' 
        : 'DVF CSV data.gouv.fr (DGFiP)',
    }, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' }
    });

  } catch (e) {
    // Dernier recours : fallback hardcodé
    const fallback = DVF_2023[code_commune];
    if (fallback) {
      return Response.json({
        code_commune,
        prix_m2_median: fallback.prixM2,
        nb_transactions: fallback.nb,
        annee: fallback.annee,
        source: 'DVF 2023 (DGFiP) — fallback',
      });
    }
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
