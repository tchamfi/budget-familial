'use client';
import { useState, useEffect, useCallback } from 'react';

// ─── DONNÉES ────────────────────────────────────────────────────────────────

const TAUX = { 15: 2.85, 20: 3.05, 25: 3.20 };

const VILLES = [
  { nom: 'Saint-Mandé',           prixM2: 9800, securite: 5, transport: ['Métro 1'] },
  { nom: 'Vincennes',              prixM2: 8900, securite: 5, transport: ['Métro 1', 'RER A'] },
  { nom: 'Charenton-le-Pont',     prixM2: 7800, securite: 4, transport: ['Métro 8'] },
  { nom: 'Nogent-sur-Marne',      prixM2: 7200, securite: 5, transport: ['RER A', 'RER E'] },
  { nom: 'Le Perreux-sur-Marne',  prixM2: 6500, securite: 4, transport: ['RER A', 'RER E'] },
  { nom: 'Saint-Maur-des-Fossés', prixM2: 6100, securite: 5, transport: ['RER A'] },
  { nom: 'Bry-sur-Marne',         prixM2: 5900, securite: 4, transport: ['RER A'] },
  { nom: 'Fontenay-sous-Bois',    prixM2: 5800, securite: 4, transport: ['RER A', 'Métro 1'] },
  { nom: 'Maisons-Alfort',        prixM2: 5600, securite: 4, transport: ['Métro 8', 'RER D'] },
  { nom: 'Joinville-le-Pont',     prixM2: 5500, securite: 4, transport: ['RER A'] },
  { nom: 'Ormesson-sur-Marne',    prixM2: 5200, securite: 5, transport: ['Bus', 'RER proche'] },
  { nom: 'Alfortville',           prixM2: 4800, securite: 3, transport: ['RER D', 'Métro 8'] },
  { nom: 'Le Plessis-Trévise',    prixM2: 4800, securite: 4, transport: ['Bus'] },
  { nom: 'Sucy-en-Brie',          prixM2: 4600, securite: 4, transport: ['RER A'] },
  { nom: 'Villiers-sur-Marne',    prixM2: 4500, securite: 3, transport: ['RER E'] },
  { nom: 'Chennevières-sur-Marne',prixM2: 4400, securite: 4, transport: ['Bus'] },
  { nom: 'La Queue-en-Brie',      prixM2: 4300, securite: 4, transport: ['Bus'] },
  { nom: 'Champigny-sur-Marne',   prixM2: 4200, securite: 3, transport: ['RER A', 'RER E'] },
  { nom: 'Créteil',               prixM2: 4100, securite: 3, transport: ['Métro 8'] },
];

const ANNONCES_BASE = [
  { ville: 'Fontenay-sous-Bois',    quartier: 'Plateau',        surface: 105, chambres: 4, prix: 580000, terrain: 150, statut: 'new' },
  { ville: 'Fontenay-sous-Bois',    quartier: 'Rigollots',      surface: 95,  chambres: 4, prix: 520000, terrain: 100, statut: null },
  { ville: 'Joinville-le-Pont',     quartier: 'Centre',         surface: 110, chambres: 4, prix: 595000, terrain: 200, statut: 'nego' },
  { ville: 'Maisons-Alfort',        quartier: 'Charentonneau',  surface: 100, chambres: 4, prix: 540000, terrain: 120, statut: null },
  { ville: 'Sucy-en-Brie',          quartier: 'Centre-ville',   surface: 115, chambres: 5, prix: 510000, terrain: 300, statut: 'new' },
  { ville: 'Le Plessis-Trévise',    quartier: 'Centre',         surface: 108, chambres: 4, prix: 490000, terrain: 250, statut: null },
  { ville: 'Champigny-sur-Marne',   quartier: 'Coteaux',        surface: 102, chambres: 4, prix: 420000, terrain: 180, statut: 'nego' },
  { ville: 'Ormesson-sur-Marne',    quartier: 'Centre',         surface: 98,  chambres: 4, prix: 510000, terrain: 150, statut: null },
  { ville: 'Saint-Maur-des-Fossés', quartier: 'Adamville',      surface: 95,  chambres: 4, prix: 620000, terrain: 100, statut: 'new' },
  { ville: 'Bry-sur-Marne',         quartier: 'Centre',         surface: 100, chambres: 4, prix: 570000, terrain: 120, statut: null },
  { ville: 'Chennevières-sur-Marne',quartier: 'Centre',         surface: 110, chambres: 4, prix: 480000, terrain: 200, statut: null },
  { ville: 'La Queue-en-Brie',      quartier: 'Centre',         surface: 120, chambres: 5, prix: 500000, terrain: 400, statut: 'nego' },
];

// ─── UTILS ──────────────────────────────────────────────────────────────────

const fmt = (n) =>
  Math.round(n).toLocaleString('fr-FR') + '\u00a0€';

function calcMensualite(capital, tauxAnnuel, dureeAns) {
  if (capital <= 0) return 0;
  const tm = tauxAnnuel / 100 / 12;
  const n  = dureeAns * 12;
  return capital * (tm * Math.pow(1 + tm, n)) / (Math.pow(1 + tm, n) - 1);
}

function calcCapacite(mensualite, tauxAnnuel, dureeAns) {
  if (mensualite <= 0) return 0;
  const tm = tauxAnnuel / 100 / 12;
  const n  = dureeAns * 12;
  return mensualite * ((1 - Math.pow(1 + tm, -n)) / tm);
}

// ─── COMPOSANT PRINCIPAL ────────────────────────────────────────────────────

export default function SimulateurImmobilier() {
  const [activeTab, setActiveTab] = useState('simulation');

  // Inputs
  const [revLionel,   setRevLionel]   = useState(3900);
  const [revOphelie,  setRevOphelie]  = useState(4200);
  const [tauxPAS,     setTauxPAS]     = useState(13.4);
  const [chargesFixes,setChargesFixes]= useState(3614);
  const [apportPerso, setApportPerso] = useState(30000);
  const [mensActuelle,setMensActuelle]= useState(1692);
  const [crd,         setCrd]         = useState(312000);
  const [prixVente,   setPrixVente]   = useState(510000);
  const [duree,       setDuree]       = useState(25);
  const [surfaceMin,  setSurfaceMin]  = useState(100);
  const [nbChambres,  setNbChambres]  = useState(4);

  // Mode
  const [vendMaison,          setVendMaison]          = useState(true);
  const [modeCalc,            setModeCalc]            = useState('auto'); // 'auto' | 'mensualite'
  const [mensualiteSouhaitee, setMensualiteSouhaitee] = useState(2500);

  // Filtres villes
  const [filterSecurite, setFilterSecurite] = useState(4);
  const [filterBudget,   setFilterBudget]   = useState(600000);

  // ─── CALCULS ──────────────────────────────────────────────────────────────
  const calc = useCallback(() => {
    const revTotal    = revLionel + revOphelie;
    const revAvantPAS = revTotal / (1 - tauxPAS / 100);
    const mensMaxHCSF = revAvantPAS * 0.35;

    // Apport vente
    let soldeVente = 0, fraisAgence = 0, ira = 0;
    if (vendMaison) {
      fraisAgence = prixVente * 0.04;
      ira         = Math.min(crd * 0.03, mensActuelle * 6);
      soldeVente  = Math.max(0, prixVente - crd - fraisAgence - ira);
    }
    const apportTotal = apportPerso + soldeVente;

    // Mensualité disponible
    let mensDisponible = mensMaxHCSF;
    if (!vendMaison) mensDisponible = mensMaxHCSF - mensActuelle;

    const mensualiteUtilisee =
      modeCalc === 'mensualite'
        ? Math.min(mensualiteSouhaitee, mensDisponible)
        : mensDisponible;

    // Emprunt
    const taux     = TAUX[duree];
    const capacite = calcCapacite(mensualiteUtilisee, taux, duree);
    const budgetTotal = capacite + apportTotal;
    const budgetNet   = budgetTotal / 1.08;

    const emprunt  = budgetTotal - apportTotal;
    const mensFinal= calcMensualite(emprunt, taux, duree);
    const endett   = revAvantPAS > 0
      ? (mensFinal + (vendMaison ? 0 : mensActuelle)) / revAvantPAS * 100
      : 0;

    const coutCredit  = mensFinal * duree * 12 - emprunt;
    const resteAVivre = revTotal - mensFinal - (vendMaison ? 0 : mensActuelle) - chargesFixes;

    return {
      revTotal, revAvantPAS, mensMaxHCSF,
      soldeVente, fraisAgence, ira, apportTotal,
      mensualiteUtilisee, mensDisponible,
      taux, capacite, budgetTotal, budgetNet,
      emprunt, mensFinal, endett, coutCredit, resteAVivre,
    };
  }, [
    revLionel, revOphelie, tauxPAS, chargesFixes, apportPerso,
    mensActuelle, crd, prixVente, duree, vendMaison,
    modeCalc, mensualiteSouhaitee,
  ]);

  const r = calc();

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      {/* ── Header badges ── */}
      <div style={styles.headerBadges}>
        <span style={styles.badge('#d4af37', '#7a5c00')}>
          🏦 Taux {TAUX[duree].toFixed(2)}%
        </span>
        <span style={styles.badge(
          r.endett <= 25 ? '#d1fae5' : r.endett <= 35 ? '#fef3c7' : '#fee2e2',
          r.endett <= 25 ? '#065f46' : r.endett <= 35 ? '#92400e' : '#991b1b',
        )}>
          Endettement {r.endett.toFixed(1)}%
        </span>
        <span style={styles.badge('#e0e7ff', '#3730a3')}>
          Mode {modeCalc === 'auto' ? 'Auto HCSF' : 'Manuel'}
        </span>
      </div>

      {/* ── Onglets internes ── */}
      <div style={styles.tabs}>
        {[
          { id: 'simulation', label: '📊 Simulation' },
          { id: 'annonces',   label: '🏡 Annonces' },
          { id: 'scenarios',  label: '⚖️ Scénarios' },
          { id: 'villes',     label: '📍 Villes' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={activeTab === t.id ? styles.tabActive : styles.tab}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          TAB : SIMULATION
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'simulation' && (
        <div style={styles.simGrid}>

          {/* ── Colonne gauche : formulaires ── */}
          <div>
            {/* Mode de calcul */}
            <Card title="⚙️ Mode de calcul">
              <div style={styles.modeToggle}>
                {['auto', 'mensualite'].map(m => (
                  <button
                    key={m}
                    onClick={() => setModeCalc(m)}
                    style={modeCalc === m ? styles.modeBtnActive : styles.modeBtn}
                  >
                    {m === 'auto' ? 'Auto (HCSF max)' : 'Je choisis ma mensualité'}
                  </button>
                ))}
              </div>
              {modeCalc === 'mensualite' && (
                <div style={styles.sliderBox}>
                  <div style={styles.sliderHeader}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1a3a5c' }}>Mensualité souhaitée</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: '#c9a84c' }}>{fmt(mensualiteSouhaitee)}/mois</span>
                  </div>
                  <input
                    type="range"
                    min={500}
                    max={Math.round(r.mensMaxHCSF)}
                    step={50}
                    value={mensualiteSouhaitee}
                    onChange={e => setMensualiteSouhaitee(+e.target.value)}
                    style={styles.slider}
                  />
                  <div style={styles.sliderLabels}>
                    <span>500 €</span>
                    <span>Max HCSF : {fmt(r.mensMaxHCSF)}</span>
                  </div>
                </div>
              )}
              {modeCalc === 'auto' && (
                <p style={{ fontSize: 12, color: '#8a9ab0', marginTop: 8 }}>
                  Budget calculé selon la règle HCSF (35 % max d&apos;endettement)
                </p>
              )}
            </Card>

            {/* Revenus */}
            <Card title="💰 Revenus du foyer">
              <div style={styles.formGrid}>
                <FormField label="Revenu net Lionel (après PAS)" hint="Freelance portage salarial HIWAY" suffix="€/mois">
                  <NumInput value={revLionel} onChange={setRevLionel} />
                </FormField>
                <FormField label="Revenu net Ophélie (après PAS)" hint="CDI" suffix="€/mois">
                  <NumInput value={revOphelie} onChange={setRevOphelie} />
                </FormField>
                <FormField label="Taux PAS" suffix="%">
                  <NumInput value={tauxPAS} onChange={setTauxPAS} step={0.1} />
                </FormField>
                <FormField label="Charges fixes mensuelles" hint="Hors crédit immobilier" suffix="€/mois">
                  <NumInput value={chargesFixes} onChange={setChargesFixes} />
                </FormField>
              </div>
            </Card>

            {/* Situation actuelle */}
            <Card title="🏠 Maison actuelle (83 rue É. Maury)">
              <div style={styles.toggleRow}>
                <div
                  onClick={() => setVendMaison(v => !v)}
                  style={{ ...styles.toggle, background: vendMaison ? '#c9a84c' : '#c8d5e3', cursor: 'pointer' }}
                >
                  <div style={{ ...styles.toggleDot, transform: vendMaison ? 'translateX(22px)' : 'none' }} />
                </div>
                <span style={{ fontSize: 14, color: '#2d4a6d' }}>Je vends ma maison avant d&apos;acheter</span>
              </div>
              <div style={styles.formGrid}>
                <FormField label="Mensualité crédit actuel" suffix="€/mois">
                  <NumInput value={mensActuelle} onChange={setMensActuelle} />
                </FormField>
                <FormField label="Capital restant dû" hint="Rang 88 du tableau (avril 2026)" suffix="€">
                  <NumInput value={crd} onChange={setCrd} />
                </FormField>
                {vendMaison && (
                  <FormField label="Prix de vente estimé" hint="72m² Carrez + 35m² niv.0 • Plateau Fontenay" suffix="€" full>
                    <NumInput value={prixVente} onChange={setPrixVente} />
                  </FormField>
                )}
              </div>
            </Card>

            {/* Paramètres prêt */}
            <Card title="📈 Paramètres du prêt">
              <div style={styles.formGrid}>
                <FormField label="Apport personnel (hors vente)" hint="PEE Ophélie, épargne…" suffix="€">
                  <NumInput value={apportPerso} onChange={setApportPerso} />
                </FormField>
                <FormField label="Durée du prêt">
                  <select
                    value={duree}
                    onChange={e => setDuree(+e.target.value)}
                    style={styles.select}
                  >
                    <option value={15}>15 ans (2.85%)</option>
                    <option value={20}>20 ans (3.05%)</option>
                    <option value={25}>25 ans (3.20%)</option>
                  </select>
                </FormField>
                <FormField label="Surface recherchée" suffix="m²">
                  <NumInput value={surfaceMin} onChange={setSurfaceMin} />
                </FormField>
                <FormField label="Nombre de chambres">
                  <select
                    value={nbChambres}
                    onChange={e => setNbChambres(+e.target.value)}
                    style={styles.select}
                  >
                    <option value={3}>3 chambres</option>
                    <option value={4}>4 chambres</option>
                    <option value={5}>5 chambres</option>
                  </select>
                </FormField>
              </div>
            </Card>
          </div>

          {/* ── Colonne droite : résultats ── */}
          <div>
            {/* Budget hero */}
            <div style={styles.budgetHero}>
              <div style={styles.budgetHeroGrid}>
                <div>
                  <p style={styles.budgetLabel}>Budget net (hors notaire)</p>
                  <p style={styles.budgetValueLarge}>{fmt(r.budgetNet)}</p>
                  <p style={styles.budgetNote}>Prix d&apos;achat maximum</p>
                </div>
                <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
                <div>
                  <p style={styles.budgetLabel}>Budget tout compris</p>
                  <p style={{ ...styles.budgetValueLarge, fontSize: 22 }}>{fmt(r.budgetTotal)}</p>
                  <p style={styles.budgetNote}>Frais notaire inclus (~8%)</p>
                </div>
              </div>
            </div>

            {/* Décomposition apport */}
            <Card title="💎 Décomposition de l'apport">
              {vendMaison && (
                <>
                  <ApportRow label="Prix de vente maison"    value={fmt(prixVente)} />
                  <ApportRow label="− Capital restant dû"    value={'−' + fmt(crd)}        indent color="#dc2626" />
                  <ApportRow label="− Frais agence (4%)"     value={'−' + fmt(r.fraisAgence)} indent color="#dc2626" />
                  <ApportRow label="− IRA (remb. anticipé)"  value={'−' + fmt(r.ira)}      indent color="#dc2626" />
                  <div style={styles.soldeVenteRow}>
                    <span style={{ fontWeight: 600 }}>= Solde net vente</span>
                    <span style={{ fontWeight: 700, color: '#16a34a', fontSize: 15 }}>{fmt(r.soldeVente)}</span>
                  </div>
                </>
              )}
              <ApportRow label="Apport personnel" value={fmt(apportPerso)} />
              <ApportRow label="APPORT TOTAL" value={fmt(r.apportTotal)} total color="#16a34a" />
            </Card>

            {/* Récapitulatif calculs */}
            <Card>
              <ApportRow label="Revenus avant PAS"       value={fmt(r.revAvantPAS) + '/mois'} />
              <ApportRow label="Mensualité max HCSF (35%)" value={fmt(r.mensMaxHCSF) + '/mois'} />
              <ApportRow label="Capacité d'emprunt"      value={fmt(r.capacite)} />
              <div style={{ borderTop: '1px solid #e8dcc8', marginTop: 8, paddingTop: 8 }}>
                <ApportRow
                  label="Mensualité finale"
                  value={fmt(r.mensFinal) + '/mois'}
                  bold
                  color="#c9a84c"
                />
              </div>
              <ApportRow label="Coût total du crédit" value={fmt(r.coutCredit)} color="#d97706" />
              <ApportRow
                label="Reste à vivre"
                value={fmt(r.resteAVivre) + '/mois'}
                color={r.resteAVivre >= 2000 ? '#16a34a' : r.resteAVivre >= 1500 ? '#d97706' : '#dc2626'}
              />
            </Card>

            {/* Taux d'endettement */}
            <Card>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: '#5a7a9a' }}>Taux d&apos;endettement</span>
                  <span style={{
                    fontSize: 18, fontWeight: 700,
                    color: r.endett <= 25 ? '#16a34a' : r.endett <= 35 ? '#d97706' : '#dc2626',
                  }}>
                    {r.endett.toFixed(1)}%
                  </span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{
                    ...styles.progressFill,
                    width: Math.min(r.endett / 45 * 100, 100) + '%',
                    background: r.endett <= 25 ? '#16a34a' : r.endett <= 35 ? '#f59e0b' : '#ef4444',
                  }} />
                  {/* Marqueur 35% */}
                  <div style={{ ...styles.progressMarker, left: (35 / 45 * 100) + '%' }} />
                </div>
                <div style={styles.progressLabels}>
                  <span>0%</span>
                  <span>Confort : 25%</span>
                  <span style={{ color: '#ef4444' }}>Max : 35%</span>
                  <span>45%</span>
                </div>
              </div>
              <div style={{
                ...styles.statusBadge,
                background: r.endett <= 35 ? '#d1fae5' : '#fee2e2',
                color: r.endett <= 35 ? '#065f46' : '#991b1b',
              }}>
                {r.endett <= 35
                  ? '✓ Conforme HCSF — Financement validé'
                  : '✗ Dépasse 35% — Financement refusé'}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB : ANNONCES
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'annonces' && (
        <div>
          <div style={styles.annoncesHeader}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a3a5c' }}>
              Maisons disponibles dans votre budget
            </h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: '🔍 SeLoger',    href: `https://www.seloger.com/list.htm?projects=2&types=2&places=[{ci:940}]&price=${Math.round(r.budgetNet * 0.7)}/${Math.round(r.budgetNet)}&surface=${surfaceMin}/NaN&rooms=4,5` },
                { label: '🟠 LeBonCoin',  href: `https://www.leboncoin.fr/recherche?category=9&locations=Val-de-Marne&real_estate_type=house&price=${Math.round(r.budgetNet * 0.7)}-${Math.round(r.budgetNet)}&square=${surfaceMin}-max` },
                { label: "🏠 Bien'ici",   href: `https://www.bienici.com/recherche/achat/val-de-marne-94/maison?prix-max=${Math.round(r.budgetNet)}&surface-min=${surfaceMin}&nb-pieces-min=4` },
              ].map(l => (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer" style={styles.linkBtn}>
                  {l.label}
                </a>
              ))}
            </div>
          </div>

          <div style={styles.infoBox}>
            <span>ℹ️</span>
            <span>
              <strong>Annonces simulées</strong> basées sur les prix DVF 2024-2025 du Val-de-Marne.
              Cliquez sur les liens ci-dessus pour voir les vraies annonces avec vos critères pré-remplis.
            </span>
          </div>

          <div style={styles.annoncesGrid}>
            {ANNONCES_BASE
              .filter(a => a.surface >= surfaceMin - 15)
              .map((a, i) => {
                const overBy    = a.prix - r.budgetNet;
                const inBudget  = overBy <= 0;
                const slightly  = !inBudget && overBy <= 50000;
                const statusCls = inBudget ? 'in' : slightly ? 'slight' : 'out';
                const statusTxt = inBudget
                  ? '✓ Dans votre budget'
                  : slightly
                  ? `⚠ ${fmt(overBy)} au-dessus`
                  : `✗ Hors budget (+${fmt(overBy)})`;
                const statusStyle = {
                  in:     { bg: '#d1fae5', color: '#065f46' },
                  slight: { bg: '#fef3c7', color: '#92400e' },
                  out:    { bg: '#fee2e2', color: '#991b1b' },
                }[statusCls];

                return (
                  <div key={i} style={styles.annonceCard}>
                    <div style={styles.annonceImg}>
                      🏡
                      {a.statut === 'new'  && <span style={{ ...styles.annonceBadge, background: '#22c55e' }}>Nouveau</span>}
                      {a.statut === 'nego' && <span style={{ ...styles.annonceBadge, background: '#f59e0b' }}>Négociable</span>}
                    </div>
                    <div style={styles.annonceBody}>
                      <div>
                        <span style={{ fontSize: 18, fontWeight: 700, color: '#1a3a5c' }}>{fmt(a.prix)}</span>
                        <span style={{ fontSize: 12, color: '#8a9ab0', marginLeft: 6 }}>
                          {Math.round(a.prix / a.surface).toLocaleString('fr-FR')} €/m²
                        </span>
                      </div>
                      <p style={{ fontWeight: 600, color: '#2d4a6d', margin: '6px 0 2px' }}>
                        Maison {a.chambres} chambres
                      </p>
                      <p style={{ fontSize: 13, color: '#8a9ab0', marginBottom: 10 }}>
                        {a.ville} — {a.quartier}
                      </p>
                      <div style={styles.annonceSpecs}>
                        <span>⬛ {a.surface} m²</span>
                        <span>🏠 {a.chambres} ch.</span>
                        <span>🌿 {a.terrain} m²</span>
                      </div>
                      <div style={{ ...styles.annonceStatus, background: statusStyle.bg, color: statusStyle.color }}>
                        {statusTxt}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB : SCÉNARIOS
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'scenarios' && (
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a3a5c', marginBottom: 20 }}>
            Comparaison des scénarios
          </h3>
          <ScenariosGrid r={r} duree={duree} chargesFixes={chargesFixes} vendMaison={vendMaison}
            apportPerso={apportPerso} mensActuelle={mensActuelle} crd={crd} prixVente={prixVente} />
          <div style={{ ...styles.infoBox, marginTop: 20 }}>
            <span>💡</span>
            <span>
              <strong>Recommandation :</strong> Le scénario &quot;Vente puis achat&quot; est le plus sûr.
              Tu récupères l'apport de la vente et tu n'as qu'un seul crédit à gérer.
              Le scénario investissement locatif nécessite un taux d'endettement actuel très bas.
            </span>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          TAB : VILLES
      ════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'villes' && (
        <div>
          <Card title="🎯 Filtres">
            <div style={styles.formGrid}>
              <FormField label="Budget max" suffix="€">
                <NumInput value={filterBudget} onChange={setFilterBudget} />
              </FormField>
              <FormField label="Sécurité minimum">
                <select
                  value={filterSecurite}
                  onChange={e => setFilterSecurite(+e.target.value)}
                  style={styles.select}
                >
                  <option value={3}>3+ étoiles</option>
                  <option value={4}>4+ étoiles</option>
                  <option value={5}>5 étoiles</option>
                </select>
              </FormField>
            </div>
          </Card>

          <div style={styles.villesGrid}>
            {VILLES
              .filter(v => v.securite >= filterSecurite)
              .map((v, i) => {
                const prix     = v.prixM2 * surfaceMin;
                const inBudget = prix <= filterBudget;
                return (
                  <div key={i} style={{
                    ...styles.villeCard,
                    borderLeft: `3px solid ${inBudget ? '#22c55e' : '#f59e0b'}`,
                  }}>
                    <p style={{ fontWeight: 600, fontSize: 14, color: '#1a3a5c' }}>{v.nom}</p>
                    <p style={{ fontSize: 12, color: '#8a9ab0' }}>
                      {v.prixM2.toLocaleString('fr-FR')} €/m²
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: inBudget ? '#16a34a' : '#d97706', marginTop: 2 }}>
                      {fmt(prix)}
                    </p>
                    <p style={{ fontSize: 11, color: '#8a9ab0', marginTop: 4 }}>
                      {'⭐'.repeat(v.securite)} • {v.transport[0]}
                    </p>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={styles.footer}>
        Simulation indicative • Données DVF Val-de-Marne 2024-2025 • Taux avril 2026 • Règles HCSF (35% max)
      </div>
    </div>
  );
}

// ─── SOUS-COMPOSANTS ────────────────────────────────────────────────────────

function ScenariosGrid({ r, duree, chargesFixes, apportPerso, mensActuelle, crd, prixVente }) {
  const taux   = TAUX[duree];
  const fraisAgence = prixVente * 0.04;
  const ira         = Math.min(crd * 0.03, mensActuelle * 6);
  const soldeVente  = Math.max(0, prixVente - crd - fraisAgence - ira);
  const apportTotal = apportPerso + soldeVente;

  // Scénario 1 : Vente puis achat
  const mensMax1 = r.revAvantPAS * 0.35;
  const cap1     = calcCapacite(mensMax1, taux, duree);
  const budget1  = (cap1 + apportTotal) / 1.08;

  // Scénario 2 : Mensualité confort 25%
  const mensConfort = r.revAvantPAS * 0.25;
  const cap3        = calcCapacite(mensConfort, taux, duree);
  const budget3     = (cap3 + apportTotal) / 1.08;
  const rav3        = r.revTotal - mensConfort - chargesFixes;

  // Scénario 3 : Garder + investir locatif
  const mensMax2 = r.revAvantPAS * 0.35 - mensActuelle;
  const cap2     = mensMax2 > 0 ? calcCapacite(mensMax2, taux, duree) : 0;
  const budget2  = (cap2 + apportPerso) / 1.08;
  const endett2  = mensMax2 > 0 ? ((mensMax2 + mensActuelle) / r.revAvantPAS * 100) : 100;

  const scenarios = [
    {
      title: 'Vente puis achat',
      desc: 'Vendre votre maison, puis acheter plus grand',
      budget: budget1,
      mensualite: mensMax1,
      endett: r.revAvantPAS > 0 ? 35 : 0,
      apport: apportTotal,
      recommended: true,
      verdict: '✓ Conforme HCSF',
    },
    {
      title: 'Mensualité confort',
      desc: 'Endettement à 25% pour plus de sérénité',
      budget: budget3,
      mensualite: mensConfort,
      endett: 25,
      apport: apportTotal,
      recommended: false,
      verdict: `Reste à vivre : ${fmt(rav3)}`,
    },
    {
      title: 'Garder + investir',
      desc: 'Conserver votre maison et acheter pour louer',
      budget: budget2,
      mensualite: mensMax2,
      endett: endett2,
      apport: apportPerso,
      recommended: false,
      verdict: endett2 <= 35 ? '✓ Possible' : '✗ Endettement trop élevé',
    },
  ];

  return (
    <div style={styles.scenariosGrid}>
      {scenarios.map((s, i) => (
        <div key={i} style={{
          ...styles.scenarioCard,
          border: s.recommended ? '2px solid #22c55e' : '2px solid #e8dcc8',
        }}>
          {s.recommended && (
            <span style={styles.scenarioBadge}>Recommandé</span>
          )}
          <h4 style={{ fontWeight: 700, color: '#1a3a5c', marginBottom: 4 }}>{s.title}</h4>
          <p style={{ fontSize: 13, color: '#8a9ab0', marginBottom: 14 }}>{s.desc}</p>
          <p style={{ fontSize: 24, fontWeight: 700, color: '#c9a84c', marginBottom: 10 }}>{fmt(s.budget)}</p>
          <div style={{ fontSize: 13, color: '#5a7a9a' }}>
            {[
              ['Mensualité', `${fmt(s.mensualite)}/mois`],
              ['Endettement', `${s.endett.toFixed(1)}%`],
              ['Apport', fmt(s.apport)],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span>{label}</span><span style={{ fontWeight: 600 }}>{val}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #e8dcc8', marginTop: 8, paddingTop: 8, fontWeight: 700, color: '#1a3a5c' }}>
              {s.verdict}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div style={styles.card}>
      {title && <h3 style={styles.cardTitle}>{title}</h3>}
      {children}
    </div>
  );
}

function FormField({ label, hint, suffix, children, full }) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
      <label style={styles.label}>{label}</label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {children}
        {suffix && <span style={styles.suffix}>{suffix}</span>}
      </div>
      {hint && <p style={styles.hint}>{hint}</p>}
    </div>
  );
}

function NumInput({ value, onChange, step = 1 }) {
  return (
    <input
      type="number"
      value={value}
      step={step}
      onChange={e => onChange(+e.target.value)}
      style={styles.input}
    />
  );
}

function ApportRow({ label, value, indent, total, bold, color }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: total ? '10px 0 0' : '5px 0',
      paddingLeft: indent ? 14 : 0,
      borderTop: total ? '1px dashed #e8dcc8' : undefined,
      marginTop: total ? 6 : undefined,
      fontSize: indent ? 12 : 13,
      color: indent ? '#8a9ab0' : '#2d4a6d',
    }}>
      <span style={{ fontWeight: bold || total ? 700 : 400 }}>{label}</span>
      <span style={{ fontWeight: bold || total ? 700 : 500, color: color || '#1a3a5c' }}>
        {value}
      </span>
    </div>
  );
}

// ─── STYLES ─────────────────────────────────────────────────────────────────

const styles = {
  root: {
    fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    color: '#1a3a5c',
  },
  headerBadges: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  badge: (bg, color) => ({
    padding: '5px 12px',
    borderRadius: 99,
    fontSize: 12,
    fontWeight: 600,
    background: bg,
    color,
  }),
  tabs: {
    display: 'flex',
    gap: 4,
    borderBottom: '1px solid #e8dcc8',
    marginBottom: 24,
    overflowX: 'auto',
  },
  tab: {
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 500,
    color: '#8a9ab0',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  tabActive: {
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 600,
    color: '#c9a84c',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid #c9a84c',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  simGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: 24,
  },
  card: {
    background: '#fffdf8',
    border: '1px solid #e8dcc8',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#1a3a5c',
    marginBottom: 14,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 14,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: '#5a7a9a',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    padding: '9px 42px 9px 12px',
    border: '1px solid #e8dcc8',
    borderRadius: 8,
    fontSize: 14,
    color: '#1a3a5c',
    background: '#fffdf8',
    outline: 'none',
  },
  select: {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #e8dcc8',
    borderRadius: 8,
    fontSize: 14,
    color: '#1a3a5c',
    background: '#fffdf8',
    outline: 'none',
  },
  suffix: {
    position: 'absolute',
    right: 10,
    fontSize: 12,
    color: '#c9a84c',
    pointerEvents: 'none',
  },
  hint: {
    fontSize: 11,
    color: '#8a9ab0',
    marginTop: 3,
  },
  modeToggle: {
    display: 'flex',
    background: '#f0ead8',
    borderRadius: 8,
    padding: 4,
    gap: 4,
    marginBottom: 10,
  },
  modeBtn: {
    padding: '6px 12px',
    border: 'none',
    background: 'transparent',
    fontSize: 12,
    fontWeight: 500,
    color: '#8a9ab0',
    borderRadius: 6,
    cursor: 'pointer',
  },
  modeBtnActive: {
    padding: '6px 12px',
    border: 'none',
    background: '#fff',
    fontSize: 12,
    fontWeight: 600,
    color: '#c9a84c',
    borderRadius: 6,
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  sliderBox: {
    background: '#fef9f0',
    border: '1px solid #f0d9a0',
    borderRadius: 10,
    padding: 14,
    marginTop: 4,
  },
  sliderHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  slider: {
    width: '100%',
    accentColor: '#c9a84c',
  },
  sliderLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: '#c9a84c',
    marginTop: 6,
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  toggle: {
    width: 46,
    height: 24,
    borderRadius: 12,
    position: 'relative',
    flexShrink: 0,
    transition: 'background 0.2s',
  },
  toggleDot: {
    position: 'absolute',
    top: 3,
    left: 3,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s',
  },
  // Budget hero
  budgetHero: {
    background: 'linear-gradient(135deg, #1a3a5c 0%, #2d5986 100%)',
    borderRadius: 16,
    padding: 22,
    color: '#fff',
    marginBottom: 16,
  },
  budgetHeroGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1px 1fr',
    gap: 16,
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: 11,
    opacity: 0.75,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: 4,
  },
  budgetValueLarge: {
    fontSize: 28,
    fontWeight: 700,
    color: '#d4af37',
  },
  budgetNote: {
    fontSize: 11,
    opacity: 0.6,
    marginTop: 2,
  },
  soldeVenteRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#f0fdf4',
    margin: '6px -6px',
    padding: '8px 6px',
    borderRadius: 6,
  },
  progressBar: {
    height: 10,
    background: '#e8dcc8',
    borderRadius: 5,
    overflow: 'visible',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    transition: 'width 0.3s, background 0.3s',
  },
  progressMarker: {
    position: 'absolute',
    top: -4,
    width: 2,
    height: 18,
    background: '#ef4444',
  },
  progressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: '#8a9ab0',
    marginTop: 5,
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
  },
  // Annonces
  annoncesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 10,
  },
  infoBox: {
    background: '#fef9f0',
    border: '1px solid #f0d9a0',
    borderRadius: 10,
    padding: '12px 16px',
    fontSize: 13,
    color: '#92400e',
    display: 'flex',
    gap: 10,
    marginBottom: 20,
  },
  linkBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '7px 12px',
    background: '#fffdf8',
    border: '1px solid #e8dcc8',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 500,
    color: '#2d4a6d',
    textDecoration: 'none',
  },
  annoncesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 14,
  },
  annonceCard: {
    background: '#fffdf8',
    border: '1px solid #e8dcc8',
    borderRadius: 12,
    overflow: 'hidden',
  },
  annonceImg: {
    height: 120,
    background: 'linear-gradient(135deg, #f0ead8, #e8dcc8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 36,
    position: 'relative',
  },
  annonceBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    padding: '3px 8px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    color: '#fff',
  },
  annonceBody: {
    padding: '12px 14px 14px',
  },
  annonceSpecs: {
    display: 'flex',
    gap: 12,
    fontSize: 12,
    color: '#5a7a9a',
    borderTop: '1px solid #f0ead8',
    paddingTop: 10,
    marginBottom: 10,
  },
  annonceStatus: {
    padding: '6px 10px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
  },
  // Scénarios
  scenariosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 16,
  },
  scenarioCard: {
    background: '#fffdf8',
    borderRadius: 14,
    padding: 20,
    position: 'relative',
  },
  scenarioBadge: {
    position: 'absolute',
    top: -10,
    left: 14,
    padding: '3px 10px',
    background: '#22c55e',
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 4,
  },
  // Villes
  villesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 10,
  },
  villeCard: {
    background: '#fffdf8',
    border: '1px solid #e8dcc8',
    borderRadius: 10,
    padding: 12,
  },
  footer: {
    textAlign: 'center',
    marginTop: 32,
    paddingTop: 20,
    borderTop: '1px solid #e8dcc8',
    fontSize: 12,
    color: '#8a9ab0',
  },
};
