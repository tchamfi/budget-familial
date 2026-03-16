"""
app.py — Budget Familial Application
Application web Streamlit avec authentification Google SSO
"""

import streamlit as st
from datetime import datetime
from typing import Dict, List

# Modules locaux
from auth import is_authenticated, login_page, logout, get_current_user
from styles import get_css, format_money, get_category_class, get_compte_class
from airtable_store import (
    load_revenus, save_revenu,
    load_charges, load_charges_montants, save_charge, save_charge_montant, delete_charge,
    load_epargne, load_epargne_montants, save_epargne_montant,
    load_objectifs, save_objectif,
    load_config
)

# === CONFIG PAGE ===
st.set_page_config(
    page_title="Budget Familial 2026",
    page_icon="💰",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# === INJECT CSS ===
st.markdown(get_css(), unsafe_allow_html=True)

# === CONSTANTES ===
MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
ANNEE = 2026

CATEGORIES = [
    "LOGEMENT", "MAISON", "VOITURE & TRANSPORT", "ABONNEMENTS",
    "SPORT & SANTÉ", "ENFANTS", "ALIMENTAIRE", "LOISIRS",
    "DEPENSES EXCEPTIONNELLES"
]

# === AUTHENTIFICATION ===
if not is_authenticated():
    login_page()
    st.stop()

# === CHARGER LES DONNÉES ===
@st.cache_data(ttl=60)
def load_all_data():
    """Charge toutes les données depuis Airtable"""
    return {
        "revenus": load_revenus(ANNEE),
        "charges": load_charges(),
        "charges_montants": load_charges_montants(ANNEE),
        "epargne": load_epargne(),
        "epargne_montants": load_epargne_montants(ANNEE),
        "objectifs": load_objectifs(),
        "config": load_config()
    }

def refresh_data():
    """Force le rechargement des données"""
    st.cache_data.clear()
    st.rerun()

# Charger les données
data = load_all_data()
user = get_current_user()

# === HEADER ===
st.markdown(f"""
<div class="main-header">
    <div class="header-left">
        <div>
            <div class="header-title">💰 Budget Familial {ANNEE}</div>
            <div class="header-subtitle">Gestion financière simplifiée</div>
        </div>
    </div>
    <div class="header-right">
        <div class="user-badge">
            👤 {user.get('name', user.get('email', 'Utilisateur'))}
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# Bouton déconnexion (petit, discret)
col1, col2, col3 = st.columns([10, 1, 1])
with col3:
    if st.button("🚪", help="Déconnexion"):
        logout()

# === CALCULER LES KPIs ===
mois_actuel = datetime.now().month

def calculer_kpis():
    """Calcule les KPIs principaux"""
    revenus = data["revenus"]
    charges_m = data["charges_montants"]
    epargne_m = data["epargne_montants"]
    
    # Revenus du mois actuel
    rev_mois = next((r for r in revenus if r["mois"] == mois_actuel), None)
    total_revenus = (rev_mois["lionel"] + rev_mois["ophelie"]) if rev_mois else 0
    
    # Charges du mois actuel
    total_charges = sum(
        (c["lionel"] + c["ophelie"]) 
        for c in charges_m if c["mois"] == mois_actuel
    )
    
    # Épargne du mois actuel
    total_epargne = sum(
        c["montant"] for c in epargne_m if c["mois"] == mois_actuel
    )
    
    # Solde
    solde = total_revenus - total_charges - total_epargne
    
    # Taux d'épargne
    taux_epargne = (total_epargne / total_revenus * 100) if total_revenus > 0 else 0
    
    # Cumul annuel
    cumul_revenus = sum(r["lionel"] + r["ophelie"] for r in revenus)
    cumul_charges = sum(c["lionel"] + c["ophelie"] for c in charges_m)
    cumul_epargne = sum(c["montant"] for c in epargne_m)
    
    return {
        "revenus_mois": total_revenus,
        "charges_mois": total_charges,
        "epargne_mois": total_epargne,
        "solde_mois": solde,
        "taux_epargne": taux_epargne,
        "cumul_revenus": cumul_revenus,
        "cumul_charges": cumul_charges,
        "cumul_epargne": cumul_epargne
    }

kpis = calculer_kpis()

# === KPIs CARDS ===
st.markdown(f"""
<div class="kpi-container">
    <div class="kpi-card">
        <div class="kpi-label">💵 Revenus {MOIS[mois_actuel-1]}</div>
        <div class="kpi-value positive">{format_money(kpis['revenus_mois'])}</div>
    </div>
    <div class="kpi-card">
        <div class="kpi-label">💸 Charges {MOIS[mois_actuel-1]}</div>
        <div class="kpi-value negative">{format_money(kpis['charges_mois'])}</div>
    </div>
    <div class="kpi-card">
        <div class="kpi-label">🏦 Épargne {MOIS[mois_actuel-1]}</div>
        <div class="kpi-value info">{format_money(kpis['epargne_mois'])}</div>
    </div>
    <div class="kpi-card">
        <div class="kpi-label">💰 Reste à vivre</div>
        <div class="kpi-value {'positive' if kpis['solde_mois'] >= 0 else 'negative'}">{format_money(kpis['solde_mois'])}</div>
    </div>
    <div class="kpi-card">
        <div class="kpi-label">📊 Taux d'épargne</div>
        <div class="kpi-value">{kpis['taux_epargne']:.1f}%</div>
    </div>
</div>
""", unsafe_allow_html=True)

# === TABS NAVIGATION ===
tab_dashboard, tab_revenus, tab_charges, tab_epargne, tab_config = st.tabs([
    "📊 Tableau de bord",
    "💵 Revenus",
    "💸 Charges",
    "🏦 Épargne",
    "⚙️ Configuration"
])

# ================================================================
# TAB 1: TABLEAU DE BORD
# ================================================================
with tab_dashboard:
    st.markdown("### 📈 Vue d'ensemble")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### Évolution mensuelle")
        
        # Graphique évolution
        import pandas as pd
        
        evolution_data = []
        for m in range(1, 13):
            rev = next((r for r in data["revenus"] if r["mois"] == m), None)
            charges = sum((c["lionel"] + c["ophelie"]) for c in data["charges_montants"] if c["mois"] == m)
            epargne = sum(c["montant"] for c in data["epargne_montants"] if c["mois"] == m)
            
            evolution_data.append({
                "Mois": MOIS[m-1][:3],
                "Revenus": (rev["lionel"] + rev["ophelie"]) if rev else 0,
                "Charges": charges,
                "Épargne": epargne
            })
        
        df_evolution = pd.DataFrame(evolution_data)
        st.bar_chart(df_evolution.set_index("Mois"))
    
    with col2:
        st.markdown("#### Répartition des charges")
        
        # Charges par catégorie
        charges_by_cat = {}
        for charge in data["charges"]:
            cat = charge["categorie"]
            montants = [c for c in data["charges_montants"] if c["charge_id"] == charge["id"] and c["mois"] == mois_actuel]
            total = sum(c["lionel"] + c["ophelie"] for c in montants)
            if cat not in charges_by_cat:
                charges_by_cat[cat] = 0
            charges_by_cat[cat] += total
        
        if charges_by_cat:
            df_cat = pd.DataFrame([
                {"Catégorie": k, "Montant": v} 
                for k, v in sorted(charges_by_cat.items(), key=lambda x: -x[1])
                if v > 0
            ])
            if not df_cat.empty:
                st.bar_chart(df_cat.set_index("Catégorie"))
    
    # Objectifs d'épargne
    st.markdown("#### 🎯 Objectifs d'épargne")
    
    objectifs = data["objectifs"]
    epargne_types = data["epargne"]
    epargne_montants = data["epargne_montants"]
    
    for ep in epargne_types:
        ep_type = ep["type"]
        ep_benef = ep["beneficiaire"]
        ep_id = ep["id"]
        
        # Cumul pour ce type
        cumul = sum(m["montant"] for m in epargne_montants if m["epargne_id"] == ep_id)
        
        # Objectif
        obj_key = f"{ep_type} {ep_benef}" if ep_benef else ep_type
        obj_data = objectifs.get(obj_key, {})
        objectif = obj_data.get("objectif", 0) if isinstance(obj_data, dict) else 0
        
        if objectif > 0:
            pct = min(100, cumul / objectif * 100)
            color = "green" if pct >= 80 else "yellow" if pct >= 50 else "red"
            
            st.markdown(f"""
            <div class="progress-container">
                <div class="progress-header">
                    <span class="progress-label">{ep_type} {ep_benef}</span>
                    <span class="progress-value">{format_money(cumul)} / {format_money(objectif)}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill {color}" style="width: {pct}%"></div>
                </div>
            </div>
            """, unsafe_allow_html=True)

# ================================================================
# TAB 2: REVENUS
# ================================================================
with tab_revenus:
    st.markdown("### 💵 Gestion des revenus")
    
    # Sélection du mois
    mois_select = st.selectbox(
        "Sélectionner le mois",
        range(1, 13),
        format_func=lambda x: MOIS[x-1],
        index=mois_actuel - 1,
        key="revenus_mois"
    )
    
    # Trouver les revenus du mois
    rev_mois = next((r for r in data["revenus"] if r["mois"] == mois_select), None)
    
    col1, col2 = st.columns(2)
    
    with col1:
        lionel_rev = st.number_input(
            "👨 Revenus Lionel",
            min_value=0.0,
            value=float(rev_mois["lionel"]) if rev_mois else 0.0,
            step=100.0,
            key="rev_lionel"
        )
    
    with col2:
        ophelie_rev = st.number_input(
            "👩 Revenus Ophélie",
            min_value=0.0,
            value=float(rev_mois["ophelie"]) if rev_mois else 0.0,
            step=100.0,
            key="rev_ophelie"
        )
    
    st.markdown(f"**Total : {format_money(lionel_rev + ophelie_rev)}**")
    
    if st.button("💾 Enregistrer les revenus", type="primary"):
        record_id = rev_mois["id"] if rev_mois else None
        success = save_revenu(mois_select, ANNEE, lionel_rev, ophelie_rev, record_id)
        if success:
            st.success("✅ Revenus enregistrés !")
            refresh_data()
        else:
            st.error("❌ Erreur lors de l'enregistrement")

# ================================================================
# TAB 3: CHARGES
# ================================================================
with tab_charges:
    st.markdown("### 💸 Gestion des charges")
    
    # Sélection du mois
    mois_charges = st.selectbox(
        "Sélectionner le mois",
        range(1, 13),
        format_func=lambda x: MOIS[x-1],
        index=mois_actuel - 1,
        key="charges_mois"
    )
    
    # Afficher les charges existantes
    charges = data["charges"]
    montants = data["charges_montants"]
    
    # Grouper par catégorie
    charges_by_cat = {}
    for charge in charges:
        cat = charge["categorie"]
        if cat not in charges_by_cat:
            charges_by_cat[cat] = []
        
        # Trouver le montant du mois
        montant = next(
            (m for m in montants if m["charge_id"] == charge["id"] and m["mois"] == mois_charges),
            {"lionel": 0, "ophelie": 0, "id": None}
        )
        charges_by_cat[cat].append({
            **charge,
            "montant_lionel": montant["lionel"],
            "montant_ophelie": montant["ophelie"],
            "montant_id": montant.get("id")
        })
    
    # Formulaire d'édition
    with st.expander("➕ Ajouter une charge", expanded=False):
        col1, col2 = st.columns(2)
        with col1:
            new_cat = st.selectbox("Catégorie", CATEGORIES, key="new_charge_cat")
            new_desc = st.text_input("Description", key="new_charge_desc")
        with col2:
            new_compte = st.selectbox("Compte", ["Commun", "Perso"], key="new_charge_compte")
            new_lionel = st.number_input("Montant Lionel", min_value=0.0, step=10.0, key="new_charge_l")
            new_ophelie = st.number_input("Montant Ophélie", min_value=0.0, step=10.0, key="new_charge_o")
        
        if st.button("➕ Ajouter", type="primary"):
            if new_desc:
                charge_id = save_charge(new_cat, new_desc, new_compte)
                if charge_id:
                    save_charge_montant(charge_id, mois_charges, ANNEE, new_lionel, new_ophelie)
                    st.success("✅ Charge ajoutée !")
                    refresh_data()
            else:
                st.warning("⚠️ Description obligatoire")
    
    # Afficher par catégorie
    for cat, cat_charges in charges_by_cat.items():
        with st.expander(f"📂 {cat} ({len(cat_charges)} charges)", expanded=True):
            for charge in cat_charges:
                col1, col2, col3, col4, col5 = st.columns([3, 1, 1.5, 1.5, 0.5])
                
                with col1:
                    st.markdown(f"**{charge['description']}**")
                    st.caption(f"{'🏦 Commun' if charge['compte'] == 'Commun' else '👤 Perso'}")
                
                with col2:
                    pass
                
                with col3:
                    new_l = st.number_input(
                        "👨 L",
                        value=float(charge["montant_lionel"]),
                        min_value=0.0,
                        step=10.0,
                        key=f"charge_l_{charge['id']}_{mois_charges}",
                        label_visibility="collapsed"
                    )
                
                with col4:
                    new_o = st.number_input(
                        "👩 O",
                        value=float(charge["montant_ophelie"]),
                        min_value=0.0,
                        step=10.0,
                        key=f"charge_o_{charge['id']}_{mois_charges}",
                        label_visibility="collapsed"
                    )
                
                with col5:
                    if st.button("💾", key=f"save_{charge['id']}_{mois_charges}", help="Sauvegarder"):
                        save_charge_montant(
                            charge["id"], mois_charges, ANNEE, new_l, new_o,
                            charge.get("montant_id")
                        )
                        st.toast("✅ Sauvegardé")
                        refresh_data()

# ================================================================
# TAB 4: ÉPARGNE
# ================================================================
with tab_epargne:
    st.markdown("### 🏦 Gestion de l'épargne")
    
    # Sélection du mois
    mois_epargne = st.selectbox(
        "Sélectionner le mois",
        range(1, 13),
        format_func=lambda x: MOIS[x-1],
        index=mois_actuel - 1,
        key="epargne_mois"
    )
    
    epargne_types = data["epargne"]
    epargne_montants = data["epargne_montants"]
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### 💰 Épargne mensuelle")
        
        for ep in epargne_types:
            montant = next(
                (m for m in epargne_montants if m["epargne_id"] == ep["id"] and m["mois"] == mois_epargne),
                {"montant": 0, "id": None}
            )
            
            c1, c2, c3 = st.columns([2, 2, 1])
            with c1:
                st.markdown(f"**{ep['type']}** - {ep['beneficiaire']}")
            with c2:
                new_montant = st.number_input(
                    "Montant",
                    value=float(montant["montant"]),
                    min_value=0.0,
                    step=50.0,
                    key=f"ep_{ep['id']}_{mois_epargne}",
                    label_visibility="collapsed"
                )
            with c3:
                if st.button("💾", key=f"save_ep_{ep['id']}_{mois_epargne}"):
                    save_epargne_montant(ep["id"], mois_epargne, ANNEE, new_montant, montant.get("id"))
                    st.toast("✅ Sauvegardé")
                    refresh_data()
    
    with col2:
        st.markdown("#### 🎯 Objectifs annuels")
        
        objectifs = data["objectifs"]
        
        for ep in epargne_types:
            obj_key = f"{ep['type']} {ep['beneficiaire']}"
            obj_data = objectifs.get(obj_key, {})
            obj_value = obj_data.get("objectif", 0) if isinstance(obj_data, dict) else 0
            obj_id = obj_data.get("id") if isinstance(obj_data, dict) else None
            
            c1, c2, c3 = st.columns([2, 2, 1])
            with c1:
                st.markdown(f"**{obj_key}**")
            with c2:
                new_obj = st.number_input(
                    "Objectif",
                    value=float(obj_value),
                    min_value=0.0,
                    step=100.0,
                    key=f"obj_{ep['id']}",
                    label_visibility="collapsed"
                )
            with c3:
                if st.button("💾", key=f"save_obj_{ep['id']}"):
                    save_objectif(obj_key, new_obj, obj_id)
                    st.toast("✅ Objectif sauvegardé")
                    refresh_data()

# ================================================================
# TAB 5: CONFIGURATION
# ================================================================
with tab_config:
    st.markdown("### ⚙️ Configuration")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### 👥 Utilisateurs autorisés")
        config = data["config"]
        
        users = config.get("authorized_users", "tchamfong@gmail.com")
        new_users = st.text_area(
            "Emails (un par ligne ou séparés par des virgules)",
            value=users,
            height=100
        )
        
        if st.button("💾 Sauvegarder les utilisateurs"):
            from airtable_store import save_config
            record_id = config.get("_record_ids", {}).get("authorized_users")
            save_config("authorized_users", new_users, record_id)
            st.success("✅ Utilisateurs mis à jour")
            refresh_data()
    
    with col2:
        st.markdown("#### 📊 Données")
        
        if st.button("🔄 Rafraîchir les données"):
            refresh_data()
        
        st.markdown("---")
        
        st.markdown("#### ℹ️ Informations")
        st.info(f"""
        **Utilisateur connecté:** {user.get('email', 'N/A')}  
        **Année:** {ANNEE}  
        **Mois actuel:** {MOIS[mois_actuel-1]}
        """)

# === FOOTER ===
st.markdown("---")
st.markdown(
    f"<div style='text-align:center;color:#64748b;font-size:0.8rem;'>"
    f"Budget Familial {ANNEE} • Streamlit + Airtable • Made with ❤️"
    f"</div>",
    unsafe_allow_html=True
)
