// app/api/dvf/route.js
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code_commune = searchParams.get('code_commune');
  if (!code_commune) return Response.json({ error: 'code_commune requis' }, { status: 400 });
  try {
    const url = `https://api.cquest.org/dvf?code_commune=${code_commune}&nature_mutation=Vente&type_local=Maison&rows=500`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' }, next: { revalidate: 86400 } });
    if (!res.ok) return Response.json({ error: 'Erreur API DVF' }, { status: res.status });
    const data = await res.json();
    const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 3);
    const transactions = (data.resultats || []).filter(t => {
      const surface = parseFloat(t.surface_reelle_bati);
      const prix = parseFloat(t.valeur_fonciere);
      const date = new Date(t.date_mutation);
      return surface >= 50 && prix > 50000 && date >= cutoff && surface > 0;
    });
    const prixM2List = transactions
      .map(t => parseFloat(t.valeur_fonciere) / parseFloat(t.surface_reelle_bati))
      .filter(p => p > 1000 && p < 25000).sort((a, b) => a - b);
    let mediane = null;
    if (prixM2List.length > 0) {
      const mid = Math.floor(prixM2List.length / 2);
      mediane = prixM2List.length % 2 === 0
        ? Math.round((prixM2List[mid - 1] + prixM2List[mid]) / 2)
        : Math.round(prixM2List[mid]);
    }
    const dates = transactions.map(t => t.date_mutation).filter(Boolean).sort().reverse();
    return Response.json({
      code_commune, nb_transactions: transactions.length,
      prix_m2_median: mediane, derniere_mutation: dates[0] || null,
      source: 'DVF / DGFiP via api.cquest.org',
    }, { headers: { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600' } });
  } catch(e) {
    return Response.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
