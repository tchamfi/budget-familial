"""
app-budget.py — Budget Familial
Design premium, style site vitrine professionnel
"""

import streamlit as st
from datetime import datetime
import pandas as pd

from auth import is_authenticated, login_page, logout, get_current_user
from airtable_store import (
    load_revenus, save_revenu,
    load_charges, load_charges_montants, save_charge, save_charge_montant,
    load_epargne, load_epargne_montants, save_epargne_montant,
    load_objectifs, save_objectif, load_config, save_config
)

# === CONFIG ===
st.set_page_config(
    page_title="Budget Familial",
    page_icon="💰",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# === CSS PREMIUM ===
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    /* Reset & Base */
    .stApp {
        background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    #MainMenu, footer, header {visibility: hidden;}
    .stDeployButton {display: none;}
    
    .block-container {
        max-width: 1200px;
        padding: 2rem 2rem 3rem;
    }
    
    /* Header Bar */
    .header-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        padding-bottom: 1.5rem;
        border-bottom: 1px solid #e2e8f0;
    }
    
    .logo-section {
        display: flex;
        align-items: center;
        gap: 14px;
    }
    
    .logo-icon {
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
    }
    
    .logo-text h1 {
        font-size: 1.5rem;
        font-weight: 700;
        color: #1e293b;
        margin: 0;
        line-height: 1.2;
    }
    
    .logo-text p {
        font-size: 0.85rem;
        color: #64748b;
        margin: 0;
    }
    
    .header-right {
        display: flex;
        align-items: center;
        gap: 16px;
    }
    
    .user-info {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 16px;
        background: #f1f5f9;
        border-radius: 24px;
    }
    
    .user-avatar {
        width: 32px;
        height: 32px;
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 600;
        font-size: 0.85rem;
    }
    
    .user-name {
        font-weight: 500;
        color: #334155;
        font-size: 0.9rem;
    }
    
    /* KPI Section */
    .kpi-section {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 20px;
        margin-bottom: 2rem;
    }
    
    @media (max-width: 1100px) {
        .kpi-section { grid-template-columns: repeat(3, 1fr); }
    }
    
    @media (max-width: 700px) {
        .kpi-section { grid-template-columns: repeat(2, 1fr); }
    }
    
    .kpi-card {
        background: white;
        border-radius: 16px;
        padding: 24px;
        border: 1px solid #e2e8f0;
        transition: all 0.2s ease;
    }
    
    .kpi-card:hover {
        border-color: #cbd5e1;
        box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }
    
    .kpi-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
    }
    
    .kpi-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
    }
    
    .kpi-icon.green { background: #dcfce7; }
    .kpi-icon.red { background: #fee2e2; }
    .kpi-icon.blue { background: #dbeafe; }
    .kpi-icon.purple { background: #f3e8ff; }
    .kpi-icon.amber { background: #fef3c7; }
    
    .kpi-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.3px;
    }
    
    .kpi-value {
        font-size: 1.75rem;
        font-weight: 700;
        color: #1e293b;
        margin-top: 4px;
    }
    
    .kpi-value.green { color: #16a34a; }
    .kpi-value.red { color: #dc2626; }
    .kpi-value.blue { color: #2563eb; }
    .kpi-value.purple { color: #7c3aed; }
    
    /* Content Grid */
    .content-grid {
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: 24px;
        margin-top: 1.5rem;
    }
    
    @media (max-width: 900px) {
        .content-grid { grid-template-columns: 1fr; }
    }
    
    /* Cards */
    .card {
        background: white;
        border-radius: 16px;
        padding: 24px;
        border: 1px solid #e2e8f0;
    }
    
    .card-title {
        font-size: 1rem;
        font-weight: 700;
        color: #1e293b;
        margin-bottom: 20px;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .card-title-icon {
        font-size: 1.2rem;
    }
    
    /* Tabs */
    .stTabs [data-baseweb="tab-list"] {
        background: white;
        border-radius: 12px;
        padding: 6px;
        gap: 4px;
        border: 1px solid #e2e8f0;
        width: fit-content;
    }
    
    .stTabs [data-baseweb="tab"] {
        font-weight: 600;
        font-size: 0.85rem;
        color: #64748b;
        border-radius: 8px;
        padding: 10px 18px;
        background: transparent;
    }
    
    .stTabs [data-baseweb="tab"]:hover {
        background: #f8fafc;
        color: #334155;
    }
    
    .stTabs [aria-selected="true"] {
        background: #3b82f6 !important;
        color: white !important;
    }
    
    /* Forms - Light theme */
    .stSelectbox > div > div,
    .stNumberInput > div > div > input,
    .stTextInput > div > div > input,
    .stTextArea textarea {
        background: white !important;
        border: 1.5px solid #e2e8f0 !important;
        border-radius: 10px !important;
        color: #1e293b !important;
        font-size: 0.9rem !important;
    }
    
    .stSelectbox > div > div:hover,
    .stNumberInput > div > div > input:hover,
    .stTextInput > div > div > input:hover {
        border-color: #cbd5e1 !important;
    }
    
    .stSelectbox > div > div:focus-within,
    .stNumberInput > div > div > input:focus,
    .stTextInput > div > div > input:focus {
        border-color: #3b82f6 !important;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
    }
    
    /* Dropdown menu - Light */
    [data-baseweb="popover"] {
        background: white !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 12px !important;
        box-shadow: 0 10px 40px rgba(0,0,0,0.1) !important;
    }
    
    [data-baseweb="menu"] {
        background: white !important;
    }
    
    [role="option"] {
        color: #1e293b !important;
        background: white !important;
    }
    
    [role="option"]:hover {
        background: #f1f5f9 !important;
    }
    
    [aria-selected="true"] {
        background: #eff6ff !important;
        color: #2563eb !important;
    }
    
    /* Progress bars */
    .progress-item {
        padding: 14px 16px;
        background: #f8fafc;
        border-radius: 10px;
        margin-bottom: 10px;
    }
    
    .progress-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }
    
    .progress-label {
        font-weight: 600;
        color: #334155;
        font-size: 0.85rem;
    }
    
    .progress-value {
        font-size: 0.8rem;
        color: #64748b;
    }
    
    .progress-track {
        height: 6px;
        background: #e2e8f0;
        border-radius: 3px;
        overflow: hidden;
    }
    
    .progress-fill {
        height: 100%;
        border-radius: 3px;
        transition: width 0.4s ease;
    }
    
    .progress-fill.green { background: linear-gradient(90deg, #22c55e, #4ade80); }
    .progress-fill.yellow { background: linear-gradient(90deg, #eab308, #facc15); }
    .progress-fill.red { background: linear-gradient(90deg, #ef4444, #f87171); }
    
    /* Buttons */
    .stButton > button {
        font-family: 'Inter', sans-serif;
        font-weight: 600;
        border-radius: 10px;
        padding: 8px 20px;
        font-size: 0.85rem;
        transition: all 0.2s;
    }
    
    .stButton > button[kind="primary"] {
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        border: none;
        color: white;
    }
    
    .stButton > button[kind="primary"]:hover {
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        transform: translateY(-1px);
    }
    
    .stButton > button[kind="secondary"] {
        background: white;
        border: 1.5px solid #e2e8f0;
        color: #64748b;
    }
    
    .stButton > button[kind="secondary"]:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
    }
    
    /* Expander */
    .streamlit-expanderHeader {
        background: #f8fafc !important;
        border-radius: 10px !important;
        font-weight: 600 !important;
        color: #334155 !important;
        border: 1px solid #e2e8f0 !important;
    }
    
    /* Footer */
    .app-footer {
        margin-top: 3rem;
        padding-top: 2rem;
        border-top: 1px solid #e2e8f0;
        text-align: center;
        color: #94a3b8;
        font-size: 0.85rem;
    }
    
    /* Labels */
    .stSelectbox label, .stNumberInput label, .stTextInput label {
        color: #475569 !important;
        font-weight: 500 !important;
        font-size: 0.85rem !important;
    }
    
    /* Summary stat */
    .stat-row {
        display: flex;
        justify-content: space-between;
        padding: 12px 0;
        border-bottom: 1px solid #f1f5f9;
    }
    
    .stat-row:last-child {
        border-bottom: none;
    }
    
    .stat-label {
        color: #64748b;
        font-size: 0.9rem;
    }
    
    .stat-value {
        font-weight: 600;
        color: #1e293b;
    }
</style>
""", unsafe_allow_html=True)

# === CONSTANTS ===
MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

CATEGORIES = ["LOGEMENT", "MAISON", "VOITURE & TRANSPORT", "ABONNEMENTS",
              "SPORT & SANTÉ", "ENFANTS", "ALIMENTAIRE", "LOISIRS", "DEPENSES EXCEPTIONNELLES"]

# === AUTH ===
if not is_authenticated():
    login_page()
    st.stop()

# === STATE ===
if "annee" not in st.session_state:
    st.session_state.annee = 2026

# === HELPERS ===
def fmt(montant):
    if montant >= 0:
        return f"{montant:,.0f} €".replace(",", " ")
    return f"-{abs(montant):,.0f} €".replace(",", " ")

@st.cache_data(ttl=60)
def load_data(annee):
    return {
        "revenus": load_revenus(annee),
        "charges": load_charges(),
        "charges_m": load_charges_montants(annee),
        "epargne": load_epargne(),
        "epargne_m": load_epargne_montants(annee),
        "objectifs": load_objectifs(),
        "config": load_config()
    }

def refresh():
    st.cache_data.clear()
    st.rerun()

# === DATA ===
ANNEE = st.session_state.annee
data = load_data(ANNEE)
user = get_current_user()
mois_courant = datetime.now().month if ANNEE == datetime.now().year else 12

# === HEADER ===
col1, col2 = st.columns([3, 1])

with col1:
    st.markdown(f"""
    <div class="logo-section">
        <div class="logo-icon">💰</div>
        <div class="logo-text">
            <h1>Budget Familial</h1>
            <p>Suivi financier {ANNEE}</p>
        </div>
    </div>
    """, unsafe_allow_html=True)

with col2:
    c1, c2 = st.columns([1, 1])
    with c1:
        annees = [2026, 2027, 2028, 2029, 2030]
        new_annee = st.selectbox("Année", annees, index=annees.index(ANNEE) if ANNEE in annees else 0, label_visibility="collapsed")
        if new_annee != ANNEE:
            st.session_state.annee = new_annee
            refresh()
    with c2:
        user_initial = user.get('name', 'U')[0].upper()
        st.markdown(f"""
        <div class="user-info">
            <div class="user-avatar">{user_initial}</div>
            <span class="user-name">{user.get('name', 'Utilisateur')}</span>
        </div>
        """, unsafe_allow_html=True)

# Logout button - discret
_, _, _, logout_col = st.columns([3, 1, 1, 0.5])
with logout_col:
    if st.button("↩ Quitter", type="secondary", use_container_width=True):
        logout()

st.markdown("<div style='height: 1rem;'></div>", unsafe_allow_html=True)

# === KPIs ===
rev = next((r for r in data["revenus"] if r["mois"] == mois_courant), {"lionel": 0, "ophelie": 0})
total_rev = rev.get("lionel", 0) + rev.get("ophelie", 0)
total_charges = sum(c.get("lionel", 0) + c.get("ophelie", 0) for c in data["charges_m"] if c.get("mois") == mois_courant)
total_epargne = sum(e.get("montant", 0) for e in data["epargne_m"] if e.get("mois") == mois_courant)
solde = total_rev - total_charges - total_epargne
taux = (total_epargne / total_rev * 100) if total_rev > 0 else 0

st.markdown(f"""
<div class="kpi-section">
    <div class="kpi-card">
        <div class="kpi-header">
            <div class="kpi-icon green">💵</div>
            <span class="kpi-label">Revenus {MOIS[mois_courant-1][:3]}</span>
        </div>
        <div class="kpi-value green">{fmt(total_rev)}</div>
    </div>
    <div class="kpi-card">
        <div class="kpi-header">
            <div class="kpi-icon red">💸</div>
            <span class="kpi-label">Charges {MOIS[mois_courant-1][:3]}</span>
        </div>
        <div class="kpi-value red">{fmt(total_charges)}</div>
    </div>
    <div class="kpi-card">
        <div class="kpi-header">
            <div class="kpi-icon blue">🏦</div>
            <span class="kpi-label">Épargne {MOIS[mois_courant-1][:3]}</span>
        </div>
        <div class="kpi-value blue">{fmt(total_epargne)}</div>
    </div>
    <div class="kpi-card">
        <div class="kpi-header">
            <div class="kpi-icon amber">💰</div>
            <span class="kpi-label">Reste à vivre</span>
        </div>
        <div class="kpi-value {'green' if solde >= 0 else 'red'}">{fmt(solde)}</div>
    </div>
    <div class="kpi-card">
        <div class="kpi-header">
            <div class="kpi-icon purple">📊</div>
            <span class="kpi-label">Taux épargne</span>
        </div>
        <div class="kpi-value purple">{taux:.1f}%</div>
    </div>
</div>
""", unsafe_allow_html=True)

# === TABS ===
tabs = st.tabs(["📊 Tableau de bord", "💵 Revenus", "💸 Charges", "🏦 Épargne", "⚙️ Paramètres"])

# --- TAB 1: DASHBOARD ---
with tabs[0]:
    col1, col2 = st.columns([1.3, 1])
    
    with col1:
        st.markdown("""
        <div class="card">
            <div class="card-title"><span class="card-title-icon">📈</span> Évolution mensuelle</div>
        </div>
        """, unsafe_allow_html=True)
        
        chart_data = []
        for m in range(1, 13):
            r = next((x for x in data["revenus"] if x.get("mois") == m), {"lionel": 0, "ophelie": 0})
            ch = sum(c.get("lionel", 0) + c.get("ophelie", 0) for c in data["charges_m"] if c.get("mois") == m)
            ep = sum(e.get("montant", 0) for e in data["epargne_m"] if e.get("mois") == m)
            chart_data.append({
                "Mois": MOIS[m-1][:3], 
                "Revenus": r.get("lionel", 0) + r.get("ophelie", 0), 
                "Charges": ch, 
                "Épargne": ep
            })
        
        df = pd.DataFrame(chart_data)
        st.bar_chart(df.set_index("Mois"), color=["#22c55e", "#ef4444", "#3b82f6"], height=350)
    
    with col2:
        st.markdown("""
        <div class="card">
            <div class="card-title"><span class="card-title-icon">🎯</span> Objectifs d'épargne</div>
        </div>
        """, unsafe_allow_html=True)
        
        has_objectives = False
        for ep in data["epargne"]:
            cumul = sum(e.get("montant", 0) for e in data["epargne_m"] if e.get("epargne_id") == ep.get("id"))
            obj_key = f"{ep.get('type', '')} {ep.get('beneficiaire', '')}"
            obj = data["objectifs"].get(obj_key, {})
            objectif = obj.get("objectif", 0) if isinstance(obj, dict) else 0
            
            if objectif > 0:
                has_objectives = True
                pct = min(100, cumul / objectif * 100)
                color = "green" if pct >= 80 else "yellow" if pct >= 50 else "red"
                st.markdown(f"""
                <div class="progress-item">
                    <div class="progress-row">
                        <span class="progress-label">{obj_key}</span>
                        <span class="progress-value">{fmt(cumul)} / {fmt(objectif)}</span>
                    </div>
                    <div class="progress-track">
                        <div class="progress-fill {color}" style="width: {pct}%;"></div>
                    </div>
                </div>
                """, unsafe_allow_html=True)
        
        if not has_objectives:
            st.info("Définissez vos objectifs dans l'onglet Épargne")
        
        # Résumé annuel
        st.markdown("<div style='height: 1rem;'></div>", unsafe_allow_html=True)
        st.markdown("""
        <div class="card">
            <div class="card-title"><span class="card-title-icon">📋</span> Résumé annuel</div>
        </div>
        """, unsafe_allow_html=True)
        
        total_rev_annuel = sum(r.get("lionel", 0) + r.get("ophelie", 0) for r in data["revenus"])
        total_charges_annuel = sum(c.get("lionel", 0) + c.get("ophelie", 0) for c in data["charges_m"])
        total_epargne_annuel = sum(e.get("montant", 0) for e in data["epargne_m"])
        
        st.markdown(f"""
        <div class="stat-row">
            <span class="stat-label">Total revenus</span>
            <span class="stat-value" style="color: #16a34a;">{fmt(total_rev_annuel)}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Total charges</span>
            <span class="stat-value" style="color: #dc2626;">{fmt(total_charges_annuel)}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Total épargne</span>
            <span class="stat-value" style="color: #2563eb;">{fmt(total_epargne_annuel)}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Solde net</span>
            <span class="stat-value">{fmt(total_rev_annuel - total_charges_annuel - total_epargne_annuel)}</span>
        </div>
        """, unsafe_allow_html=True)

# --- TAB 2: REVENUS ---
with tabs[1]:
    st.markdown("### 💵 Gestion des revenus")
    
    col1, col2 = st.columns([1, 3])
    with col1:
        mois_rev = st.selectbox("Mois", range(1, 13), format_func=lambda x: MOIS[x-1], index=mois_courant-1, key="mois_rev")
    
    rev_data = next((r for r in data["revenus"] if r.get("mois") == mois_rev), None)
    
    st.markdown("<div style='height: 1rem;'></div>", unsafe_allow_html=True)
    
    c1, c2, c3 = st.columns([1, 1, 1])
    with c1:
        lionel = st.number_input("👨 Lionel", value=float(rev_data.get("lionel", 0)) if rev_data else 0.0, step=100.0, format="%.0f")
    with c2:
        ophelie = st.number_input("👩 Ophélie", value=float(rev_data.get("ophelie", 0)) if rev_data else 0.0, step=100.0, format="%.0f")
    with c3:
        st.markdown(f"<div style='padding-top: 2rem;'><strong>Total : {fmt(lionel + ophelie)}</strong></div>", unsafe_allow_html=True)
    
    if st.button("💾 Enregistrer les revenus", key="save_rev", type="primary"):
        save_revenu(mois_rev, ANNEE, lionel, ophelie, rev_data.get("id") if rev_data else None)
        st.success("✅ Revenus enregistrés !")
        refresh()

# --- TAB 3: CHARGES ---
with tabs[2]:
    st.markdown("### 💸 Gestion des charges")
    
    col1, col2 = st.columns([1, 3])
    with col1:
        mois_ch = st.selectbox("Mois", range(1, 13), format_func=lambda x: MOIS[x-1], index=mois_courant-1, key="mois_ch")
    
    with st.expander("➕ Ajouter une nouvelle charge"):
        nc1, nc2 = st.columns(2)
        with nc1:
            new_cat = st.selectbox("Catégorie", CATEGORIES, key="new_cat")
            new_desc = st.text_input("Description", key="new_desc")
        with nc2:
            new_compte = st.selectbox("Compte", ["Commun", "Perso"], key="new_compte")
            new_l = st.number_input("Montant Lionel €", min_value=0.0, step=10.0, key="new_l", format="%.0f")
            new_o = st.number_input("Montant Ophélie €", min_value=0.0, step=10.0, key="new_o", format="%.0f")
        
        if st.button("➕ Ajouter", type="primary", key="add_charge"):
            if new_desc:
                cid = save_charge(new_cat, new_desc, new_compte)
                if cid:
                    save_charge_montant(cid, mois_ch, ANNEE, new_l, new_o)
                    st.success("✅ Charge ajoutée !")
                    refresh()
    
    # Grouper par catégorie
    by_cat = {}
    for ch in data["charges"]:
        cat = ch.get("categorie") or ch.get("description", "AUTRE")
        if cat not in by_cat:
            by_cat[cat] = []
        m = next((x for x in data["charges_m"] if x.get("charge_id") == ch.get("id") and x.get("mois") == mois_ch), 
                 {"lionel": 0, "ophelie": 0, "id": None})
        by_cat[cat].append({
            **ch, 
            "m_l": m.get("lionel", 0), 
            "m_o": m.get("ophelie", 0), 
            "m_id": m.get("id")
        })
    
    for cat, items in by_cat.items():
        total = sum(i.get("m_l", 0) + i.get("m_o", 0) for i in items)
        with st.expander(f"📂 {cat} — {fmt(total)}", expanded=True):
            for item in items:
                c1, c2, c3, c4 = st.columns([3, 1.5, 1.5, 0.5])
                with c1:
                    st.markdown(f"**{item.get('description', '')}**")
                with c2:
                    nl = st.number_input("L", value=float(item.get("m_l", 0)), step=10.0, 
                                        key=f"l_{item.get('id')}_{mois_ch}", label_visibility="collapsed", format="%.0f")
                with c3:
                    no = st.number_input("O", value=float(item.get("m_o", 0)), step=10.0, 
                                        key=f"o_{item.get('id')}_{mois_ch}", label_visibility="collapsed", format="%.0f")
                with c4:
                    if st.button("💾", key=f"s_{item.get('id')}_{mois_ch}"):
                        save_charge_montant(item.get("id"), mois_ch, ANNEE, nl, no, item.get("m_id"))
                        st.toast("✅ Sauvegardé")
                        refresh()

# --- TAB 4: ÉPARGNE ---
with tabs[3]:
    st.markdown("### 🏦 Gestion de l'épargne")
    
    col1, col2 = st.columns([1, 3])
    with col1:
        mois_ep = st.selectbox("Mois", range(1, 13), format_func=lambda x: MOIS[x-1], index=mois_courant-1, key="mois_ep")
    
    st.markdown("<div style='height: 1rem;'></div>", unsafe_allow_html=True)
    
    c1, c2 = st.columns(2)
    
    with c1:
        st.markdown("#### 💰 Montants mensuels")
        for ep in data["epargne"]:
            m = next((x for x in data["epargne_m"] if x.get("epargne_id") == ep.get("id") and x.get("mois") == mois_ep), 
                     {"montant": 0, "id": None})
            ec1, ec2, ec3 = st.columns([2, 1.5, 0.5])
            with ec1:
                st.markdown(f"**{ep.get('type', '')}** — {ep.get('beneficiaire', '')}")
            with ec2:
                val = st.number_input("€", value=float(m.get("montant", 0)), step=50.0, 
                                     key=f"ep_{ep.get('id')}_{mois_ep}", label_visibility="collapsed", format="%.0f")
            with ec3:
                if st.button("💾", key=f"sep_{ep.get('id')}_{mois_ep}"):
                    save_epargne_montant(ep.get("id"), mois_ep, ANNEE, val, m.get("id"))
                    st.toast("✅ Sauvegardé")
                    refresh()
    
    with c2:
        st.markdown("#### 🎯 Objectifs annuels")
        for ep in data["epargne"]:
            obj_key = f"{ep.get('type', '')} {ep.get('beneficiaire', '')}"
            obj = data["objectifs"].get(obj_key, {})
            obj_val = obj.get("objectif", 0) if isinstance(obj, dict) else 0
            obj_id = obj.get("id") if isinstance(obj, dict) else None
            
            oc1, oc2, oc3 = st.columns([2, 1.5, 0.5])
            with oc1:
                st.markdown(f"**{obj_key}**")
            with oc2:
                nobj = st.number_input("€", value=float(obj_val), step=100.0, 
                                      key=f"obj_{ep.get('id')}", label_visibility="collapsed", format="%.0f")
            with oc3:
                if st.button("💾", key=f"sobj_{ep.get('id')}"):
                    save_objectif(obj_key, nobj, obj_id)
                    st.toast("✅ Objectif sauvegardé")
                    refresh()

# --- TAB 5: CONFIG ---
with tabs[4]:
    st.markdown("### ⚙️ Paramètres")
    
    c1, c2 = st.columns(2)
    
    with c1:
        st.markdown("#### 👥 Utilisateurs autorisés")
        st.caption("Emails des personnes pouvant accéder à l'application")
        users = data["config"].get("authorized_users", "tchamfong@gmail.com,ophelie.linde@gmail.com")
        new_users = st.text_area("Emails (séparés par des virgules)", value=users, height=100)
        if st.button("💾 Sauvegarder", key="save_users", type="primary"):
            rid = data["config"].get("_record_ids", {}).get("authorized_users")
            save_config("authorized_users", new_users, rid)
            st.success("✅ Sauvegardé !")
            refresh()
    
    with c2:
        st.markdown("#### ℹ️ Informations")
        st.markdown(f"""
        <div class="card">
            <div class="stat-row">
                <span class="stat-label">Utilisateur connecté</span>
                <span class="stat-value">{user.get('email', 'N/A')}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Année affichée</span>
                <span class="stat-value">{ANNEE}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Mois courant</span>
                <span class="stat-value">{MOIS[mois_courant-1]}</span>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        st.markdown("<div style='height: 1rem;'></div>", unsafe_allow_html=True)
        if st.button("🔄 Rafraîchir les données", use_container_width=True):
            refresh()

# === FOOTER ===
st.markdown("""
<div class="app-footer">
    <p>Budget Familial • Fait avec ❤️ • Streamlit + Airtable</p>
</div>
""", unsafe_allow_html=True)
