"""
app-budget.py — Budget Famille TCHAMFONG
Style Portfolio : Header sombre dégradé + corps clair + accents vert/violet
"""

import streamlit as st
from datetime import datetime
import pandas as pd

from airtable_store import (
    load_revenus, save_revenu,
    load_charges, load_charges_montants, save_charge, save_charge_montant,
    load_epargne, load_epargne_montants, save_epargne_montant,
    load_objectifs, save_objectif, load_config, save_config,
    _create_record, _delete_record, _fetch_all
)

# === CONFIG ===
st.set_page_config(
    page_title="Budget Famille TCHAMFONG",
    page_icon="💰",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# === CSS STYLE PORTFOLIO ===
st.markdown("""
<style>
/* ========================================
   STYLE PORTFOLIO - Header sombre + Corps clair
   ======================================== */

/* Import Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* Reset et base */
* {
    font-family: 'Inter', sans-serif !important;
}

.stApp {
    background: #F8F9FB !important;
}

.main .block-container {
    padding: 0 !important;
    max-width: 100% !important;
}

/* Hide Streamlit elements */
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}
header {visibility: hidden;}

/* ========================================
   HERO HEADER - Style Portfolio
   ======================================== */
.hero-header {
    background: linear-gradient(135deg, #1a1f35 0%, #2d1f47 50%, #1a2540 100%);
    padding: 2rem 3rem;
    border-radius: 0 0 30px 30px;
    margin-bottom: 2rem;
}

.hero-content {
    max-width: 1200px;
    margin: 0 auto;
}

.hero-title {
    font-size: 2rem;
    font-weight: 700;
    background: linear-gradient(135deg, #22C55E 0%, #4ADE80 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
}

.hero-subtitle {
    color: #94A3B8;
    font-size: 1rem;
    margin-top: 0.25rem;
}

.hero-user {
    color: #E2E8F0;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

/* ========================================
   KPI CARDS - Style Portfolio
   ======================================== */
.kpi-section {
    max-width: 1200px;
    margin: -1rem auto 2rem auto;
    padding: 0 2rem;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 1rem;
}

.kpi-card {
    background: white;
    border-radius: 16px;
    padding: 1.25rem;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    border: 1px solid #E5E7EB;
    transition: all 0.3s ease;
}

.kpi-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.1);
}

.kpi-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #6B7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0.5rem;
}

.kpi-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #22C55E;
}

.kpi-value.expense {
    color: #EF4444;
}

.kpi-value.neutral {
    color: #1F2937;
}

/* ========================================
   CONTENT SECTION
   ======================================== */
.content-section {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem 2rem 2rem;
}

/* ========================================
   TABS - Style Portfolio
   ======================================== */
.stTabs {
    background: white !important;
    border-radius: 16px !important;
    padding: 0.5rem !important;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06) !important;
    border: 1px solid #E5E7EB !important;
    margin-bottom: 1.5rem !important;
}

.stTabs [data-baseweb="tab-list"] {
    background: transparent !important;
    gap: 0.5rem !important;
    border: none !important;
}

.stTabs [data-baseweb="tab"] {
    font-weight: 600 !important;
    font-size: 0.9rem !important;
    color: #6B7280 !important;
    background: transparent !important;
    border: none !important;
    border-radius: 12px !important;
    padding: 0.75rem 1.5rem !important;
    transition: all 0.2s ease !important;
}

.stTabs [data-baseweb="tab"]:hover {
    color: #1F2937 !important;
    background: #F3F4F6 !important;
}

.stTabs [aria-selected="true"] {
    background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%) !important;
    color: white !important;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3) !important;
}

/* ========================================
   CARDS - Conteneurs blancs
   ======================================== */
.white-card {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    border: 1px solid #E5E7EB;
    margin-bottom: 1rem;
}

.card-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #1F2937;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

/* ========================================
   CATEGORY HEADERS
   ======================================== */
.streamlit-expanderHeader {
    background: white !important;
    border: 1px solid #E5E7EB !important;
    border-radius: 12px !important;
    font-weight: 600 !important;
    color: #1F2937 !important;
}

.streamlit-expanderHeader:hover {
    background: #F9FAFB !important;
}

.streamlit-expanderContent {
    background: #FAFBFC !important;
    border: 1px solid #E5E7EB !important;
    border-top: none !important;
    border-radius: 0 0 12px 12px !important;
    padding: 1rem !important;
}

/* ========================================
   INPUTS - Style épuré
   ======================================== */
.stNumberInput > div > div > input,
.stTextInput > div > div > input,
.stTextArea textarea {
    background: white !important;
    border: 1px solid #E5E7EB !important;
    border-radius: 10px !important;
    color: #1F2937 !important;
    font-size: 0.95rem !important;
}

.stNumberInput > div > div > input:focus,
.stTextInput > div > div > input:focus,
.stTextArea textarea:focus {
    border-color: #8B5CF6 !important;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1) !important;
}

.stSelectbox > div > div {
    background: white !important;
    border: 1px solid #E5E7EB !important;
    border-radius: 10px !important;
}

/* ========================================
   BUTTONS - Violet comme Portfolio
   ======================================== */
.stButton > button {
    font-weight: 600 !important;
    border-radius: 10px !important;
    padding: 0.6rem 1.25rem !important;
    transition: all 0.2s ease !important;
}

.stButton > button[kind="primary"] {
    background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%) !important;
    border: none !important;
    color: white !important;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3) !important;
}

.stButton > button[kind="primary"]:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4) !important;
}

.stButton > button[kind="secondary"] {
    background: white !important;
    border: 1px solid #E5E7EB !important;
    color: #6B7280 !important;
}

.stButton > button[kind="secondary"]:hover {
    border-color: #8B5CF6 !important;
    color: #8B5CF6 !important;
}

/* Petit bouton action */
.action-btn {
    background: #F3F4F6 !important;
    border: none !important;
    color: #6B7280 !important;
    padding: 0.4rem 0.6rem !important;
    font-size: 0.85rem !important;
}

.action-btn:hover {
    background: #E5E7EB !important;
}

/* ========================================
   METRICS Streamlit
   ======================================== */
[data-testid="stMetricValue"] {
    font-weight: 700 !important;
    font-size: 1.4rem !important;
    color: #22C55E !important;
}

[data-testid="stMetricLabel"] {
    font-weight: 600 !important;
    color: #6B7280 !important;
    text-transform: uppercase !important;
    font-size: 0.75rem !important;
    letter-spacing: 0.5px !important;
}

/* Metric container */
[data-testid="metric-container"] {
    background: white !important;
    border-radius: 12px !important;
    padding: 1rem !important;
    border: 1px solid #E5E7EB !important;
}

/* ========================================
   CHARTS
   ======================================== */
.stBarChart {
    background: white !important;
    border-radius: 16px !important;
    padding: 1rem !important;
    border: 1px solid #E5E7EB !important;
}

/* ========================================
   PROGRESS BARS
   ======================================== */
.stProgress > div > div {
    background: #E5E7EB !important;
    border-radius: 10px !important;
}

.stProgress > div > div > div {
    background: linear-gradient(135deg, #22C55E 0%, #4ADE80 100%) !important;
    border-radius: 10px !important;
}

/* ========================================
   ALERTS
   ======================================== */
.stSuccess {
    background: #ECFDF5 !important;
    border: 1px solid #A7F3D0 !important;
    border-radius: 12px !important;
    color: #065F46 !important;
}

.stInfo {
    background: #EFF6FF !important;
    border: 1px solid #BFDBFE !important;
    border-radius: 12px !important;
    color: #1E40AF !important;
}

.stWarning {
    background: #FFFBEB !important;
    border: 1px solid #FDE68A !important;
    border-radius: 12px !important;
    color: #92400E !important;
}

.stError {
    background: #FEF2F2 !important;
    border: 1px solid #FECACA !important;
    border-radius: 12px !important;
    color: #991B1B !important;
}

/* ========================================
   MODAL / SECTIONS SPÉCIALES
   ======================================== */
.modal-section {
    background: #F9FAFB;
    border: 2px dashed #E5E7EB;
    border-radius: 16px;
    padding: 1.5rem;
    margin: 1rem 0;
}

.modal-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: #8B5CF6;
    margin-bottom: 1rem;
}

/* ========================================
   DIVIDERS
   ======================================== */
hr {
    border: none !important;
    height: 1px !important;
    background: #E5E7EB !important;
    margin: 1.5rem 0 !important;
}

/* ========================================
   FOOTER
   ======================================== */
.app-footer {
    text-align: center;
    color: #9CA3AF;
    font-size: 0.8rem;
    padding: 2rem;
    margin-top: 2rem;
}

/* ========================================
   RESPONSIVE
   ======================================== */
@media (max-width: 768px) {
    .hero-header {
        padding: 1.5rem !important;
    }
    
    .hero-title {
        font-size: 1.5rem !important;
    }
    
    .kpi-section {
        grid-template-columns: repeat(2, 1fr) !important;
    }
}
</style>
""", unsafe_allow_html=True)

# === CONSTANTS ===
MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

DEFAULT_CATEGORIES = ["LOGEMENT", "MAISON", "VOITURE & TRANSPORT", "ABONNEMENTS",
                      "SPORT & SANTÉ", "ENFANTS", "ALIMENTAIRE", "LOISIRS", "DEPENSES EXCEPTIONNELLES"]

# === AUTH ===
from auth import is_authenticated, login_page, logout, get_current_user

if not is_authenticated():
    login_page()
    st.stop()

# === STATE ===
if "annee" not in st.session_state:
    st.session_state.annee = 2026
if "show_add_charge_modal" not in st.session_state:
    st.session_state.show_add_charge_modal = False
if "delete_charge_info" not in st.session_state:
    st.session_state.delete_charge_info = None
if "categories" not in st.session_state:
    st.session_state.categories = DEFAULT_CATEGORIES.copy()

# === HELPERS ===
def fmt(m):
    return f"{m:,.0f} €".replace(",", " ")

def get_all_categories(charges):
    existing = set(ch.get("categorie", "") for ch in charges if ch.get("categorie"))
    all_cats = set(DEFAULT_CATEGORIES) | existing
    return sorted(list(all_cats))

def save_new_charge(categorie, description, compte, mois_list, annee, lionel, ophelie):
    cid = save_charge(categorie, description, compte)
    if cid:
        for m in mois_list:
            save_charge_montant(cid, m, annee, lionel, ophelie)
        return True
    return False

def delete_charge_for_months(charge_id, mois_list, annee, delete_all=False):
    if delete_all:
        _delete_record("Charges", charge_id)
        records = _fetch_all("Charges_Montants")
        for rec in records:
            f = rec.get("fields", {})
            cid = f.get("charge_id", [""])[0] if isinstance(f.get("charge_id"), list) else f.get("charge_id")
            if cid == charge_id:
                _delete_record("Charges_Montants", rec["id"])
    else:
        records = _fetch_all("Charges_Montants")
        for rec in records:
            f = rec.get("fields", {})
            cid = f.get("charge_id", [""])[0] if isinstance(f.get("charge_id"), list) else f.get("charge_id")
            if cid == charge_id and f.get("mois") in mois_list and f.get("annee") == annee:
                _delete_record("Charges_Montants", rec["id"])

def check_category_empty(categorie, charges, exclude_charge_id=None):
    charges_in_cat = [ch for ch in charges if ch.get("categorie") == categorie and ch.get("id") != exclude_charge_id]
    return len(charges_in_cat) == 0

def save_new_epargne(type_ep, beneficiaire, ordre=999):
    fields = {"type": type_ep, "beneficiaire": beneficiaire, "ordre": ordre}
    return _create_record("Epargne", fields)

def delete_epargne(epargne_id):
    return _delete_record("Epargne", epargne_id)

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

def dedupe(items, key_fn):
    seen = set()
    return [x for x in items if not (key_fn(x) in seen or seen.add(key_fn(x)))]

def refresh():
    st.cache_data.clear()
    st.rerun()

# === DATA ===
ANNEE = st.session_state.annee
data = load_data(ANNEE)
data["charges"] = dedupe(data["charges"], lambda x: x.get("description", ""))
data["epargne"] = dedupe(data["epargne"], lambda x: f"{x.get('type')}_{x.get('beneficiaire')}")
st.session_state.categories = get_all_categories(data["charges"])

user = get_current_user()
mois_actuel = datetime.now().month if ANNEE == datetime.now().year else 12

# === HERO HEADER ===
st.markdown(f"""
<div class="hero-header">
    <div class="hero-content" style="display: flex; justify-content: space-between; align-items: center;">
        <div>
            <h1 class="hero-title">💰 Budget Famille TCHAMFONG</h1>
            <p class="hero-subtitle">Gestion financière • Exercice {ANNEE}</p>
        </div>
        <div class="hero-user">
            👤 {user.get('name', 'User').split()[0] if user else 'User'}
        </div>
    </div>
</div>
""", unsafe_allow_html=True)

# === HEADER CONTROLS (année + déconnexion) ===
col1, col2, col3, col4 = st.columns([6, 1, 1, 1])
with col2:
    new_annee = st.selectbox("", [2026, 2027, 2028, 2029, 2030], index=0, label_visibility="collapsed")
    if new_annee != st.session_state.annee:
        st.session_state.annee = new_annee
        refresh()
with col3:
    if st.button("🔄", help="Rafraîchir"):
        refresh()
with col4:
    if st.button("🚪", help="Déconnexion"):
        logout()

# === KPIs ===
rev = next((r for r in data["revenus"] if r.get("mois") == mois_actuel), {"lionel": 0, "ophelie": 0})
total_rev = rev.get("lionel", 0) + rev.get("ophelie", 0)
total_ch = sum(c.get("lionel", 0) + c.get("ophelie", 0) for c in data["charges_m"] if c.get("mois") == mois_actuel)
total_ep = sum(e.get("montant", 0) for e in data["epargne_m"] if e.get("mois") == mois_actuel)
solde = total_rev - total_ch - total_ep
taux = (total_ep / total_rev * 100) if total_rev > 0 else 0

k1, k2, k3, k4, k5 = st.columns(5)
k1.metric("💵 Revenus", fmt(total_rev))
k2.metric("💸 Charges", fmt(total_ch))
k3.metric("🏦 Épargne", fmt(total_ep))
k4.metric("💰 Reste à vivre", fmt(solde))
k5.metric("📊 Taux épargne", f"{taux:.1f}%")

st.divider()

# === TABS ===
tabs = st.tabs(["📊 TABLEAU DE BORD", "💵 REVENUS", "💸 CHARGES", "🏦 ÉPARGNE", "⚙️ PARAMÈTRES"])

# ------ TAB 1: DASHBOARD ------
with tabs[0]:
    col1, col2 = st.columns([1.5, 1])
    
    with col1:
        st.markdown("#### 📈 Évolution mensuelle")
        chart_data = []
        for m in range(1, 13):
            r = next((x for x in data["revenus"] if x.get("mois") == m), {"lionel": 0, "ophelie": 0})
            c = sum(x.get("lionel", 0) + x.get("ophelie", 0) for x in data["charges_m"] if x.get("mois") == m)
            e = sum(x.get("montant", 0) for x in data["epargne_m"] if x.get("mois") == m)
            chart_data.append({"Mois": MOIS[m-1], "Revenus": r.get("lionel",0)+r.get("ophelie",0), "Charges": c, "Épargne": e})
        
        df = pd.DataFrame(chart_data)
        df['Mois'] = pd.Categorical(df['Mois'], categories=MOIS, ordered=True)
        df = df.sort_values('Mois')
        st.bar_chart(df.set_index("Mois"), height=350, color=["#22C55E", "#EF4444", "#8B5CF6"])
    
    with col2:
        st.markdown("#### 🎯 Objectifs épargne")
        for ep in data["epargne"]:
            key = f"{ep.get('type')} {ep.get('beneficiaire')}"
            cumul = sum(e.get("montant", 0) for e in data["epargne_m"] if e.get("epargne_id") == ep.get("id"))
            obj = data["objectifs"].get(key, {})
            objectif = obj.get("objectif", 0) if isinstance(obj, dict) else 0
            if objectif > 0:
                pct = cumul / objectif
                st.write(f"**{key}**")
                st.progress(min(1.0, pct), text=f"{fmt(cumul)} / {fmt(objectif)}")
        
        st.markdown("---")
        st.markdown("#### 📋 Bilan annuel")
        tr = sum(r.get("lionel",0)+r.get("ophelie",0) for r in data["revenus"])
        tc = sum(c.get("lionel",0)+c.get("ophelie",0) for c in data["charges_m"])
        te = sum(e.get("montant",0) for e in data["epargne_m"])
        st.write(f"**Revenus :** {fmt(tr)}")
        st.write(f"**Charges :** {fmt(tc)}")
        st.write(f"**Épargne :** {fmt(te)}")
        st.write(f"**Solde :** {fmt(tr-tc-te)}")

# ------ TAB 2: REVENUS ------
with tabs[1]:
    st.markdown("#### 💵 Revenus mensuels")
    
    mois_rev = st.selectbox("Mois", range(1,13), format_func=lambda x: MOIS[x-1], index=mois_actuel-1, key="rev_mois")
    rev_data = next((r for r in data["revenus"] if r.get("mois") == mois_rev), None)
    
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("**👨 Lionel**")
        lionel = st.number_input("€", value=float(rev_data.get("lionel", 0)) if rev_data else 0.0, step=100.0, key="rev_lionel", label_visibility="collapsed")
    with col2:
        st.markdown("**👩 Ophélie**")
        ophelie = st.number_input("€", value=float(rev_data.get("ophelie", 0)) if rev_data else 0.0, step=100.0, key="rev_ophelie", label_visibility="collapsed")
    
    st.info(f"**Total : {fmt(lionel + ophelie)}**")
    
    if st.button("✓ Enregistrer", type="primary", key="save_rev"):
        save_revenu(mois_rev, ANNEE, lionel, ophelie, rev_data.get("id") if rev_data else None)
        st.success("✅ Revenus enregistrés !")
        refresh()

# ------ TAB 3: CHARGES ------
with tabs[2]:
    st.markdown("#### 💸 Charges mensuelles")
    
    col_h1, col_h2 = st.columns([3, 1])
    with col_h1:
        mois_ch = st.selectbox("Mois", range(1,13), format_func=lambda x: MOIS[x-1], index=mois_actuel-1, key="ch_mois")
    with col_h2:
        st.write("")
        if st.button("➕ Ajouter une charge", type="primary", use_container_width=True):
            st.session_state.show_add_charge_modal = True
    
    # Modal ajout
    if st.session_state.show_add_charge_modal:
        st.markdown('<div class="modal-section">', unsafe_allow_html=True)
        st.markdown("##### ➕ Nouvelle charge")
        
        col1, col2 = st.columns(2)
        with col1:
            cat_options = st.session_state.categories + ["➕ Nouvelle catégorie..."]
            selected_cat = st.selectbox("Catégorie", cat_options, key="new_charge_cat")
            
            if selected_cat == "➕ Nouvelle catégorie...":
                new_cat_name = st.text_input("Nom de la catégorie", key="new_cat_name")
                final_category = new_cat_name.upper() if new_cat_name else ""
            else:
                final_category = selected_cat
            
            new_desc = st.text_input("Description", key="new_charge_desc")
            new_compte = st.selectbox("Compte", ["Commun", "Perso"], key="new_charge_compte")
        
        with col2:
            mois_options = st.multiselect("Mois concernés", options=range(1, 13), format_func=lambda x: MOIS[x-1], default=[mois_ch], key="new_charge_mois")
            all_months = st.checkbox("Tous les mois", key="new_charge_all")
            if all_months:
                mois_options = list(range(1, 13))
            
            new_l = st.number_input("Lionel €", min_value=0.0, step=10.0, key="new_charge_l")
            new_o = st.number_input("Ophélie €", min_value=0.0, step=10.0, key="new_charge_o")
        
        col_b1, col_b2, _ = st.columns([1, 1, 2])
        with col_b1:
            if st.button("✓ Ajouter", type="primary"):
                if new_desc and final_category and mois_options:
                    if save_new_charge(final_category, new_desc, new_compte, mois_options, ANNEE, new_l, new_o):
                        st.success(f"✅ '{new_desc}' ajoutée !")
                        st.session_state.show_add_charge_modal = False
                        refresh()
                else:
                    st.warning("⚠️ Remplir tous les champs")
        with col_b2:
            if st.button("✕ Annuler"):
                st.session_state.show_add_charge_modal = False
                st.rerun()
        
        st.markdown('</div>', unsafe_allow_html=True)
    
    # Modal suppression
    if st.session_state.delete_charge_info:
        info = st.session_state.delete_charge_info
        ch = info["charge"]
        
        st.markdown('<div class="modal-section">', unsafe_allow_html=True)
        st.markdown(f"##### 🗑️ Supprimer : {ch.get('description')}")
        
        is_last = check_category_empty(ch.get("categorie"), data["charges"], ch.get("id"))
        
        delete_opt = st.radio("Supprimer :", [
            f"Uniquement {MOIS[mois_ch-1]} {ANNEE}",
            "Tous les mois de l'année",
            "Supprimer complètement"
        ], key="del_opt")
        
        if is_last:
            st.warning(f"⚠️ Dernière charge de '{ch.get('categorie')}'")
        
        col_d1, col_d2, _ = st.columns([1, 1, 2])
        with col_d1:
            if st.button("🗑️ Confirmer", type="primary"):
                if "Uniquement" in delete_opt:
                    delete_charge_for_months(ch.get("id"), [mois_ch], ANNEE)
                elif "Tous les mois" in delete_opt:
                    delete_charge_for_months(ch.get("id"), list(range(1, 13)), ANNEE)
                else:
                    delete_charge_for_months(ch.get("id"), [], ANNEE, delete_all=True)
                st.session_state.delete_charge_info = None
                refresh()
        with col_d2:
            if st.button("✕ Annuler", key="cancel_del"):
                st.session_state.delete_charge_info = None
                st.rerun()
        
        st.markdown('</div>', unsafe_allow_html=True)
    
    # Tableau charges
    header = st.columns([3, 1.5, 1.5, 1, 0.8])
    header[0].markdown("**Charge**")
    header[1].markdown("**Lionel**")
    header[2].markdown("**Ophélie**")
    header[3].markdown("**Total**")
    header[4].markdown("")
    st.divider()
    
    total_gen = 0
    for cat in st.session_state.categories:
        charges_cat = [ch for ch in data["charges"] if ch.get("categorie") == cat]
        if not charges_cat:
            continue
        
        cat_total = sum(
            next((x for x in data["charges_m"] if x.get("charge_id") == ch.get("id") and x.get("mois") == mois_ch), {"lionel": 0, "ophelie": 0}).get("lionel", 0) +
            next((x for x in data["charges_m"] if x.get("charge_id") == ch.get("id") and x.get("mois") == mois_ch), {"lionel": 0, "ophelie": 0}).get("ophelie", 0)
            for ch in charges_cat
        )
        total_gen += cat_total
        
        with st.expander(f"📁 {cat} — {fmt(cat_total)}", expanded=True):
            for ch in charges_cat:
                m = next((x for x in data["charges_m"] if x.get("charge_id") == ch.get("id") and x.get("mois") == mois_ch), {"lionel": 0, "ophelie": 0, "id": None})
                
                c1, c2, c3, c4, c5 = st.columns([3, 1.5, 1.5, 1, 0.8])
                c1.write(f"**{ch.get('description', '')}**")
                nl = c2.number_input("L", value=float(m.get("lionel", 0)), step=10.0, key=f"l_{ch.get('id')}_{mois_ch}", label_visibility="collapsed")
                no = c3.number_input("O", value=float(m.get("ophelie", 0)), step=10.0, key=f"o_{ch.get('id')}_{mois_ch}", label_visibility="collapsed")
                c4.write(f"**{fmt(nl + no)}**")
                
                with c5:
                    col_s, col_d = st.columns(2)
                    if col_s.button("✓", key=f"s_{ch.get('id')}_{mois_ch}"):
                        save_charge_montant(ch.get("id"), mois_ch, ANNEE, nl, no, m.get("id"))
                        st.toast("✅ OK")
                        refresh()
                    if col_d.button("🗑", key=f"d_{ch.get('id')}_{mois_ch}"):
                        st.session_state.delete_charge_info = {"charge": ch, "mois": mois_ch}
                        st.rerun()
    
    st.divider()
    st.markdown(f"### Total : **{fmt(total_gen)}**")

# ------ TAB 4: ÉPARGNE ------
with tabs[3]:
    st.markdown("#### 🏦 Épargne mensuelle")
    
    mois_ep = st.selectbox("Mois", range(1,13), format_func=lambda x: MOIS[x-1], index=mois_actuel-1, key="ep_mois")
    
    with st.expander("➕ Ajouter un type d'épargne"):
        c1, c2, c3 = st.columns(3)
        new_type = c1.text_input("Type (PEA, LDD...)")
        new_benef = c2.text_input("Bénéficiaire")
        new_obj = c3.number_input("Objectif annuel €", min_value=0.0, step=100.0)
        
        if st.button("✓ Ajouter", type="primary", key="add_ep"):
            if new_type and new_benef:
                ep_id = save_new_epargne(new_type, new_benef)
                if ep_id and new_obj > 0:
                    save_objectif(f"{new_type} {new_benef}", new_obj)
                st.success("✅ Ajouté !")
                refresh()
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("**💰 Montants**")
        total_ep_mois = 0
        for ep in data["epargne"]:
            m = next((x for x in data["epargne_m"] if x.get("epargne_id") == ep.get("id") and x.get("mois") == mois_ep), {"montant": 0, "id": None})
            total_ep_mois += m.get("montant", 0)
            
            c1, c2, c3, c4 = st.columns([2.5, 1.5, 0.4, 0.4])
            c1.write(f"**{ep.get('type')}** — {ep.get('beneficiaire')}")
            val = c2.number_input("€", value=float(m.get("montant", 0)), step=50.0, key=f"ep_{ep.get('id')}_{mois_ep}", label_visibility="collapsed")
            if c3.button("✓", key=f"sep_{ep.get('id')}"):
                save_epargne_montant(ep.get("id"), mois_ep, ANNEE, val, m.get("id"))
                refresh()
            if c4.button("🗑", key=f"dep_{ep.get('id')}"):
                delete_epargne(ep.get("id"))
                refresh()
        
        st.info(f"**Total : {fmt(total_ep_mois)}**")
    
    with col2:
        st.markdown("**🎯 Objectifs**")
        for ep in data["epargne"]:
            key = f"{ep.get('type')} {ep.get('beneficiaire')}"
            obj = data["objectifs"].get(key, {})
            obj_val = obj.get("objectif", 0) if isinstance(obj, dict) else 0
            obj_id = obj.get("id") if isinstance(obj, dict) else None
            
            c1, c2, c3 = st.columns([2.5, 1.5, 0.5])
            c1.write(f"**{key}**")
            nobj = c2.number_input("€", value=float(obj_val), step=100.0, key=f"obj_{ep.get('id')}", label_visibility="collapsed")
            if c3.button("✓", key=f"sobj_{ep.get('id')}"):
                save_objectif(key, nobj, obj_id)
                refresh()

# ------ TAB 5: PARAMÈTRES ------
with tabs[4]:
    st.markdown("#### ⚙️ Paramètres")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("**👥 Utilisateurs autorisés**")
        users = data["config"].get("authorized_users", "")
        new_users = st.text_area("Emails (virgules)", value=users, height=100)
        if st.button("✓ Sauvegarder", type="primary"):
            rid = data["config"].get("_record_ids", {}).get("authorized_users")
            save_config("authorized_users", new_users, rid)
            st.success("✅ OK !")
            refresh()
    
    with col2:
        st.markdown("**ℹ️ Infos**")
        st.write(f"**Email :** {user.get('email', '') if user else 'N/A'}")
        st.write(f"**Année :** {ANNEE}")
        st.write(f"**Mois :** {MOIS[mois_actuel-1]}")
        st.write(f"**Charges :** {len(data['charges'])}")
        st.write(f"**Épargnes :** {len(data['epargne'])}")

# Footer
st.markdown("""
<div class="app-footer">
    💰 Budget Famille TCHAMFONG • Streamlit + Airtable
</div>
""", unsafe_allow_html=True)
