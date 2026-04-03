// ─── RECHERCHE DVF PAR RUE ───────────────────────────────────────────────────

// Coordonnées centre de chaque commune pour initialiser la carte
const COMMUNES_COORDS = {
  '94033': { lat: 48.8527, lng: 2.4707, nom: 'Fontenay-sous-Bois', zoom: 14 },
  '94068': { lat: 48.7964, lng: 2.5055, nom: 'Saint-Maur-des-Fossés', zoom: 13 },
  '94080': { lat: 48.8477, lng: 2.4392, nom: 'Vincennes', zoom: 14 },
  '94052': { lat: 48.8347, lng: 2.4817, nom: 'Nogent-sur-Marne', zoom: 14 },
  '94058': { lat: 48.8408, lng: 2.5040, nom: 'Le Perreux-sur-Marne', zoom: 14 },
  '94067': { lat: 48.8417, lng: 2.4208, nom: 'Saint-Mandé', zoom: 15 },
  '94018': { lat: 48.8200, lng: 2.4148, nom: 'Charenton-le-Pont', zoom: 14 },
  '94015': { lat: 48.8394, lng: 2.5212, nom: 'Bry-sur-Marne', zoom: 14 },
  '94046': { lat: 48.8057, lng: 2.4361, nom: 'Maisons-Alfort', zoom: 14 },
  '94042': { lat: 48.8181, lng: 2.4778, nom: 'Joinville-le-Pont', zoom: 14 },
  '94055': { lat: 48.7763, lng: 2.5369, nom: 'Ormesson-sur-Marne', zoom: 14 },
  '94002': { lat: 48.7942, lng: 2.4267, nom: 'Alfortville', zoom: 14 },
  '94060': { lat: 48.8048, lng: 2.5706, nom: 'Le Plessis-Trévise', zoom: 14 },
  '94071': { lat: 48.7714, lng: 2.5226, nom: 'Sucy-en-Brie', zoom: 13 },
  '94079': { lat: 48.8286, lng: 2.5449, nom: 'Villiers-sur-Marne', zoom: 14 },
  '94019': { lat: 48.7938, lng: 2.5437, nom: 'Chennevières-sur-Marne', zoom: 14 },
  '94038': { lat: 48.7791, lng: 2.5716, nom: 'La Queue-en-Brie', zoom: 14 },
  '94017': { lat: 48.8171, lng: 2.5143, nom: 'Champigny-sur-Marne', zoom: 13 },
  '94028': { lat: 48.7773, lng: 2.4591, nom: 'Créteil', zoom: 13 },
};

function RechercheRueDVF({ styles }) {
  const [commune, setCommune]   = useState('94033');
  const [rue, setRue]           = useState('');
  const [results, setResults]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [viewMode, setViewMode] = useState('split');

  const leafletMap   = useRef(null);
  const markersLayer = useRef(null);
  const mapContainer = useRef(null);
  // ── FIX : ref qui reste synchronisée avec le state commune ──
  const communeRef   = useRef(commune);
  useEffect(() => { communeRef.current = commune; }, [commune]);

  const COMMUNES = Object.entries(COMMUNES_COORDS)
    .map(([code, v]) => ({ code, nom: v.nom }))
    .sort((a, b) => a.nom.localeCompare(b.nom));

  // Charger Leaflet dynamiquement
  useEffect(() => {
    if (window.L) { setMapReady(true); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setMapReady(true);
    document.head.appendChild(script);
  }, []);

  // Initialiser la carte (une seule fois)
  useEffect(() => {
    if (!mapReady || !mapContainer.current || leafletMap.current) return;

    const coords = COMMUNES_COORDS['94033'];
    const map = window.L.map(mapContainer.current, { zoomControl: true })
      .setView([coords.lat, coords.lng], coords.zoom);

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    markersLayer.current = window.L.layerGroup().addTo(map);

    // Clic sur la carte → géocode via Nominatim
    // ── FIX : on lit communeRef.current (toujours à jour) ──
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
          { headers: { 'User-Agent': 'BudgetFamilialTchamfong/1.0' } }
        );
        const data = await res.json();
        const road = data.address?.road || data.address?.pedestrian || data.address?.street;
        if (!road) return;

        // Extraire nom de rue sans le type
        const nomRue = road
          .replace(/^(rue|avenue|av\.?|boulevard|bd\.?|impasse|allée|all\.?|chemin|place|pl\.?|villa|clos|résidence|rés\.?|res\.?|square|sq\.?|passage|voie)\s+/i, '')
          .toUpperCase();

        // Détecter la commune depuis Nominatim
        const ville = (data.address?.city || data.address?.town || data.address?.village || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const cp    = data.address?.postcode || '';

        // Chercher la commune correspondante dans nos 19 communes
        let codeDetecte = null;
        if (ville) {
          const match = Object.entries(COMMUNES_COORDS).find(([, v]) => {
            const nomNorm = v.nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return nomNorm.includes(ville.substring(0, 6)) || ville.includes(nomNorm.substring(0, 6));
          });
          if (match) codeDetecte = match[0];
        }
        // Fallback sur code postal (94XXX → chercher dans nos codes INSEE)
        if (!codeDetecte && cp.startsWith('94')) {
          const cpNum = parseInt(cp);
          const matchCp = Object.keys(COMMUNES_COORDS).find(code => {
            const insee = parseInt(code);
            return Math.abs(insee - cpNum) < 5;
          });
          if (matchCp) codeDetecte = matchCp;
        }

        const communeFinale = codeDetecte || communeRef.current;

        // Mettre à jour le sélecteur si commune détectée
        if (codeDetecte && codeDetecte !== communeRef.current) {
          setCommune(codeDetecte);
          // communeRef se met à jour via useEffect, mais on passe communeFinale directement
        }

        setRue(nomRue);
        // Lancer la recherche avec les valeurs correctes
        await lancerRecherche(nomRue, communeFinale);

      } catch (err) {
        console.error('Nominatim error:', err);
      }
    });

    leafletMap.current = map;
    setTimeout(() => map.invalidateSize(), 100);
  }, [mapReady]);

  // Recentrer la carte quand la commune change
  useEffect(() => {
    if (!leafletMap.current) return;
    const coords = COMMUNES_COORDS[commune];
    if (coords) leafletMap.current.setView([coords.lat, coords.lng], coords.zoom);
  }, [commune]);

  // Afficher les marqueurs quand les résultats changent
  useEffect(() => {
    if (!leafletMap.current || !markersLayer.current || !results) return;
    markersLayer.current.clearLayers();

    results.transactions.forEach(t => {
      if (!t.lat || !t.lng) return;
      const icon = window.L.divIcon({
        className: '',
        html: `<div style="background:#c9a84c;color:#fff;padding:3px 7px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3)">${Math.round(t.prix / 1000)}k</div>`,
        iconAnchor: [20, 10],
      });
      const marker = window.L.marker([t.lat, t.lng], { icon });
      marker.bindPopup(`
        <div style="font-family:DM Sans,sans-serif;min-width:180px">
          <div style="font-weight:700;font-size:14px;color:#1a3a5c;margin-bottom:4px">${t.adresse}</div>
          <div style="font-size:16px;font-weight:800;color:#c9a84c">${t.prix.toLocaleString('fr-FR')} €</div>
          <div style="font-size:12px;color:#5a7a9a;margin-top:2px">
            ${t.surface ? t.surface + ' m²' : ''}${t.prixM2 ? ' · ' + t.prixM2.toLocaleString('fr-FR') + ' €/m²' : ''}
          </div>
          <div style="font-size:11px;color:#8a9ab0;margin-top:4px">
            ${t.pieces ? t.pieces + ' pièces · ' : ''}${new Date(t.date).toLocaleDateString('fr-FR')}
          </div>
        </div>
      `);
      markersLayer.current.addLayer(marker);
    });

    if (results.transactions.filter(t => t.lat).length > 0) {
      const latlngs = results.transactions.filter(t => t.lat).map(t => [t.lat, t.lng]);
      leafletMap.current.fitBounds(latlngs, { padding: [30, 30], maxZoom: 16 });
    }
  }, [results]);

  const lancerRecherche = async (nomRue, codeCommune) => {
    const r = nomRue  !== undefined ? nomRue  : rue;
    const c = codeCommune !== undefined ? codeCommune : communeRef.current;
    if (!r.trim()) return;
    setLoading(true); setError(null); setResults(null);
    try {
      const res = await fetch(`/api/dvf?mode=rue&commune=${c}&rue=${encodeURIComponent(r.trim())}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const fmtLocal   = (n) => n ? Math.round(n).toLocaleString('fr-FR') + '\u00a0€' : '—';
  const fmtM2Local = (n) => n ? Math.round(n).toLocaleString('fr-FR') + '\u00a0€/m²' : '—';

  const mediane = (() => {
    if (!results?.transactions?.length) return null;
    const prix = results.transactions.map(t => t.prixM2).filter(Boolean).sort((a, b) => a - b);
    if (!prix.length) return null;
    const mid = Math.floor(prix.length / 2);
    return prix.length % 2 === 0 ? Math.round((prix[mid - 1] + prix[mid]) / 2) : prix[mid];
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Barre de contrôle */}
      <div style={{ background: '#fffdf8', border: '1px solid #e8dcc8', borderRadius: 16, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a3a5c' }}>
            🗺️ Recherche DVF par rue — cliquez sur la carte ou saisissez un nom
          </h3>
          <div style={{ display: 'flex', background: '#f0ead8', borderRadius: 8, padding: 3, gap: 2 }}>
            {[['split', '⬛⬛ Mixte'], ['map', '🗺️ Carte'], ['table', '📋 Tableau']].map(([v, l]) => (
              <button key={v} onClick={() => setViewMode(v)} style={{
                padding: '5px 10px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11,
                fontWeight: viewMode === v ? 700 : 400,
                background: viewMode === v ? '#fff' : 'transparent',
                color: viewMode === v ? '#c9a84c' : '#8a9ab0',
              }}>{l}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr auto', gap: 10, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#5a7a9a', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>Commune</label>
            <select value={commune} onChange={e => setCommune(e.target.value)} style={{ ...styles.select, width: '100%' }}>
              {COMMUNES.map(c => <option key={c.code} value={c.code}>{c.nom}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#5a7a9a', display: 'block', marginBottom: 4, textTransform: 'uppercase' }}>
              Nom de rue <span style={{ color: '#c4b898', fontWeight: 400 }}>(ou cliquez sur la carte)</span>
            </label>
            <input
              type="text" value={rue}
              onChange={e => setRue(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && lancerRecherche()}
              placeholder="ex: BEAUMONTS, GAMBETTA, VICTOR HUGO…"
              style={{ ...styles.input, width: '100%', paddingRight: 12 }}
            />
          </div>
          <button onClick={() => lancerRecherche()} disabled={loading || !rue.trim()} style={{
            padding: '10px 20px', background: loading ? '#8a9ab0' : '#c9a84c',
            color: '#fff', border: 'none', borderRadius: 8,
            cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13,
          }}>
            {loading ? '⏳' : '🔍 Chercher'}
          </button>
        </div>
        <p style={{ fontSize: 11, color: '#8a9ab0', marginTop: 8 }}>
          Source : data.gouv.fr — DVF DGFiP · Maisons uniquement · 2020 → juin 2025
        </p>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#991b1b' }}>
          ⚠ {error}
        </div>
      )}

      {/* Layout carte + tableau */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: viewMode === 'map' ? '1fr' : viewMode === 'table' ? '1fr' : '1fr 1fr',
        gap: 16,
      }}>
        {/* Carte */}
        {viewMode !== 'table' && (
          <div style={{ background: '#fffdf8', border: '1px solid #e8dcc8', borderRadius: 16, overflow: 'hidden', height: 520, position: 'relative' }}>
            {!mapReady && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0ead8', zIndex: 10 }}>
                <span style={{ color: '#8a9ab0', fontSize: 13 }}>Chargement de la carte…</span>
              </div>
            )}
            <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
            {!results && mapReady && (
              <div style={{
                position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(26,58,92,0.85)', color: '#fff', padding: '8px 16px',
                borderRadius: 20, fontSize: 12, fontWeight: 500, zIndex: 500, whiteSpace: 'nowrap',
              }}>
                👆 Cliquez sur une rue pour voir les ventes de maisons
              </div>
            )}
            {loading && (
              <div style={{
                position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                background: '#c9a84c', color: '#fff', padding: '6px 14px',
                borderRadius: 20, fontSize: 12, fontWeight: 600, zIndex: 500,
              }}>
                Recherche en cours…
              </div>
            )}
          </div>
        )}

        {/* Tableau */}
        {viewMode !== 'map' && (
          <div style={{ background: '#fffdf8', border: '1px solid #e8dcc8', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e8dcc8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {results ? (
                <>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#1a3a5c' }}>{results.rue} — {results.commune}</div>
                    <div style={{ fontSize: 11, color: '#8a9ab0', marginTop: 2 }}>
                      {results.nb} vente{results.nb > 1 ? 's' : ''} de maison{results.nb > 1 ? 's' : ''}
                    </div>
                  </div>
                  {mediane && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: '#8a9ab0', textTransform: 'uppercase', fontWeight: 600 }}>Prix médian</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#c9a84c' }}>{fmtM2Local(mediane)}</div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ color: '#8a9ab0', fontSize: 13 }}>
                  {loading ? 'Chargement…' : 'Cliquez sur la carte ou cherchez une rue'}
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', maxHeight: 456 }}>
              {results?.nb === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: '#8a9ab0', fontSize: 13 }}>
                  Aucune vente de maison trouvée.<br />
                  <span style={{ fontSize: 11 }}>Essayez avec un nom partiel</span>
                </div>
              )}
              {results?.transactions?.map((t, i) => (
                <div
                  key={i}
                  onClick={() => {
                    if (t.lat && leafletMap.current) {
                      leafletMap.current.setView([t.lat, t.lng], 17);
                      setViewMode('split');
                    }
                  }}
                  style={{
                    padding: '12px 20px', borderBottom: '1px solid #f0ead8',
                    cursor: t.lat ? 'pointer' : 'default',
                    background: i % 2 === 0 ? 'transparent' : '#faf7f2',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fef9f0'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : '#faf7f2'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a3a5c' }}>{t.adresse}</div>
                      <div style={{ fontSize: 11, color: '#8a9ab0', marginTop: 2 }}>
                        {new Date(t.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        {t.pieces ? ` · ${t.pieces} pièces` : ''}
                        {t.terrain ? ` · terrain ${t.terrain} m²` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#1a3a5c' }}>{fmtLocal(t.prix)}</div>
                      <div style={{ fontSize: 11, color: '#c9a84c', fontWeight: 600 }}>
                        {t.surface ? t.surface + ' m² · ' : ''}{fmtM2Local(t.prixM2)}
                      </div>
                    </div>
                  </div>
                  {t.lat && <div style={{ fontSize: 10, color: '#c4b898', marginTop: 4 }}>📍 Cliquer pour localiser sur la carte</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
