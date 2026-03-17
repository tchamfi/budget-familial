"""
app-budget.py — Budget Famille TCHAMFONG
Version Premium : Design luxe, popups, suppression intelligente
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
    page_icon="💎",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# === CSS PREMIUM - Design Luxe Finance ===
st.markdown("""
<style>
/* ========================================
   PREMIUM FINANCE DASHBOARD THEME
   Luxe • Élégant • Moderne
   ======================================== */

/* Import Google Fonts - Élégant et unique */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

/* Root variables */
:root {
    --primary-emerald: #10B981;
    --primary-dark: #059669;
    --accent-gold: #F59E0B;
    --accent-gold-light: #FCD34D;
    --bg-dark: #0F172A;
    --bg-card: #1E293B;
    --bg-card-hover: #334155;
    --text-primary: #F8FAFC;
    --text-secondary: #94A3B8;
    --text-muted: #64748B;
    --gradient-primary: linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%);
    --gradient-gold: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
    --gradient-dark: linear-gradient(180deg, #0F172A 0%, #1E293B 100%);
    --shadow-glow: 0 0 40px rgba(16, 185, 129, 0.15);
    --shadow-card: 0 10px 40px rgba(0,0,0,0.3);
    --border-subtle: 1px solid rgba(255,255,255,0.08);
}

/* Global styles */
.stApp {
    background: var(--gradient-dark) !important;
    font-family: 'DM Sans', sans-serif !important;
}

/* Main container */
.main .block-container {
    padding: 2rem 3rem !important;
    max-width: 1400px !important;
}

/* Headers - Playfair Display pour l'élégance */
h1, h2, h3 {
    font-family: 'Playfair Display', serif !important;
    color: var(--text-primary) !important;
    letter-spacing: -0.02em;
}

h1 {
    font-size: 2.5rem !important;
    font-weight: 600 !important;
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

/* ========================================
   HEADER PREMIUM
   ======================================== */
.premium-header {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%);
    border: var(--border-subtle);
    border-radius: 20px;
    padding: 1.5rem 2rem;
    margin-bottom: 2rem;
    backdrop-filter: blur(10px);
    box-shadow: var(--shadow-glow);
}

.premium-title {
    font-family: 'Playfair Display', serif;
    font-size: 2.2rem;
    font-weight: 600;
    background: linear-gradient(135deg, #10B981 0%, #34D399 50%, #10B981 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 12px;
}

.premium-subtitle {
    font-family: 'DM Sans', sans-serif;
    color: var(--text-secondary);
    font-size: 0.95rem;
    margin-top: 4px;
    letter-spacing: 0.5px;
}

/* ========================================
   KPI CARDS - Style Finance Premium
   ======================================== */
.kpi-container {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
}

.kpi-card {
    background: var(--bg-card);
    border: var(--border-subtle);
    border-radius: 16px;
    padding: 1.5rem;
    position: relative;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.kpi-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--gradient-primary);
}

.kpi-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-card);
    border-color: rgba(16, 185, 129, 0.3);
}

.kpi-card.gold::before {
    background: var(--gradient-gold);
}

.kpi-label {
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
}

.kpi-value {
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.6rem;
    font-weight: 600;
    color: var(--text-primary);
}

.kpi-value.positive { color: #10B981; }
.kpi-value.negative { color: #EF4444; }
.kpi-value.gold { color: #F59E0B; }

/* ========================================
   TABS PREMIUM - Navigation élégante
   ======================================== */
.stTabs {
    background: transparent !important;
}

.stTabs [data-baseweb="tab-list"] {
    background: var(--bg-card) !important;
    border-radius: 16px !important;
    padding: 8px !important;
    gap: 8px !important;
    border: var(--border-subtle) !important;
}

.stTabs [data-baseweb="tab"] {
    font-family: 'DM Sans', sans-serif !important;
    font-weight: 600 !important;
    font-size: 0.95rem !important;
    color: var(--text-secondary) !important;
    background: transparent !important;
    border: none !important;
    border-radius: 12px !important;
    padding: 12px 24px !important;
    transition: all 0.3s ease !important;
}

.stTabs [data-baseweb="tab"]:hover {
    color: var(--text-primary) !important;
    background: rgba(255,255,255,0.05) !important;
}

.stTabs [aria-selected="true"] {
    background: var(--gradient-primary) !important;
    color: white !important;
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4) !important;
}

/* ========================================
   CARDS & CONTAINERS
   ======================================== */
.premium-card {
    background: var(--bg-card);
    border: var(--border-subtle);
    border-radius: 16px;
    padding: 1.5rem;
    margin-bottom: 1rem;
}

.premium-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: var(--border-subtle);
}

.premium-card-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.3rem;
    color: var(--text-primary);
    margin: 0;
}

/* ========================================
   CATEGORY ACCORDION - Charges
   ======================================== */
.category-header {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.08) 100%);
    border: 1px solid rgba(16, 185, 129, 0.2);
    border-radius: 12px;
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    transition: all 0.3s ease;
}

.category-header:hover {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.12) 100%);
    transform: translateX(4px);
}

.category-name {
    font-family: 'DM Sans', sans-serif;
    font-weight: 600;
    font-size: 1rem;
    color: var(--text-primary);
}

.category-total {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 600;
    color: #10B981;
    font-size: 1.1rem;
}

/* ========================================
   DATA TABLE - Lignes charges/épargne
   ======================================== */
.data-row {
    background: rgba(255,255,255,0.02);
    border-radius: 10px;
    padding: 0.75rem 1rem;
    margin: 0.5rem 0;
    display: flex;
    align-items: center;
    transition: all 0.2s ease;
    border: 1px solid transparent;
}

.data-row:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(16, 185, 129, 0.2);
}

.data-row-label {
    font-weight: 500;
    color: var(--text-primary);
    flex: 1;
}

/* ========================================
   INPUTS & FORMS - Style premium
   ======================================== */
.stNumberInput > div > div > input,
.stTextInput > div > div > input,
.stSelectbox > div > div {
    background: var(--bg-card) !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    border-radius: 10px !important;
    color: var(--text-primary) !important;
    font-family: 'JetBrains Mono', monospace !important;
}

.stNumberInput > div > div > input:focus,
.stTextInput > div > div > input:focus {
    border-color: var(--primary-emerald) !important;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important;
}

/* ========================================
   BUTTONS - Premium style
   ======================================== */
.stButton > button {
    font-family: 'DM Sans', sans-serif !important;
    font-weight: 600 !important;
    border-radius: 10px !important;
    padding: 0.6rem 1.5rem !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
}

.stButton > button[kind="primary"] {
    background: var(--gradient-primary) !important;
    border: none !important;
    color: white !important;
}

.stButton > button[kind="primary"]:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4) !important;
}

.stButton > button[kind="secondary"] {
    background: transparent !important;
    border: 1px solid rgba(255,255,255,0.2) !important;
    color: var(--text-secondary) !important;
}

.stButton > button[kind="secondary"]:hover {
    border-color: var(--primary-emerald) !important;
    color: var(--primary-emerald) !important;
}

/* Button spécial "Ajouter" */
.add-button {
    background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%) !important;
    border: none !important;
    color: white !important;
    font-weight: 600 !important;
    padding: 0.75rem 1.5rem !important;
    border-radius: 12px !important;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.add-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(245, 158, 11, 0.4);
}

/* ========================================
   EXPANDER - Accordéon stylé
   ======================================== */
.streamlit-expanderHeader {
    background: var(--bg-card) !important;
    border: var(--border-subtle) !important;
    border-radius: 12px !important;
    font-family: 'DM Sans', sans-serif !important;
    font-weight: 600 !important;
    color: var(--text-primary) !important;
}

.streamlit-expanderContent {
    background: rgba(30, 41, 59, 0.5) !important;
    border: var(--border-subtle) !important;
    border-top: none !important;
    border-radius: 0 0 12px 12px !important;
}

/* ========================================
   METRICS - Dashboard style
   ======================================== */
[data-testid="stMetricValue"] {
    font-family: 'JetBrains Mono', monospace !important;
    font-weight: 600 !important;
    font-size: 1.4rem !important;
    color: var(--text-primary) !important;
}

[data-testid="stMetricLabel"] {
    font-family: 'DM Sans', sans-serif !important;
    font-weight: 500 !important;
    color: var(--text-secondary) !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
    font-size: 0.8rem !important;
}

/* ========================================
   CHART STYLING
   ======================================== */
.stBarChart, .stLineChart {
    background: var(--bg-card) !important;
    border-radius: 16px !important;
    padding: 1rem !important;
    border: var(--border-subtle) !important;
}

/* ========================================
   DIVIDERS & SEPARATORS
   ======================================== */
hr {
    border: none !important;
    height: 1px !important;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent) !important;
    margin: 1.5rem 0 !important;
}

/* ========================================
   MODAL / DIALOG STYLING
   ======================================== */
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(5px);
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-content {
    background: var(--bg-card);
    border: var(--border-subtle);
    border-radius: 20px;
    padding: 2rem;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 25px 50px rgba(0,0,0,0.5);
}

.modal-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.5rem;
    color: var(--text-primary);
    margin-bottom: 1.5rem;
}

/* ========================================
   PROGRESS BARS
   ======================================== */
.stProgress > div > div {
    background: rgba(255,255,255,0.1) !important;
    border-radius: 10px !important;
}

.stProgress > div > div > div {
    background: var(--gradient-primary) !important;
    border-radius: 10px !important;
}

/* ========================================
   TOAST / ALERTS
   ======================================== */
.stSuccess, .stInfo, .stWarning, .stError {
    border-radius: 12px !important;
    border: none !important;
}

.stSuccess {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%) !important;
    border-left: 4px solid #10B981 !important;
}

/* ========================================
   SCROLLBAR CUSTOM
   ======================================== */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: var(--bg-dark);
}

::-webkit-scrollbar-thumb {
    background: var(--bg-card-hover);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--primary-emerald);
}

/* ========================================
   ANIMATIONS
   ======================================== */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.animate-fade-in {
    animation: fadeInUp 0.5s ease-out;
}

/* ========================================
   RESPONSIVE
   ======================================== */
@media (max-width: 768px) {
    .main .block-container {
        padding: 1rem !important;
    }
    
    .kpi-container {
        grid-template-columns: repeat(2, 1fr);
    }
    
    h1 {
        font-size: 1.8rem !important;
    }
}

/* Hide Streamlit branding */
#MainMenu {visibility: hidden;}
footer {visibility: hidden;}
header {visibility: hidden;}
</style>
""", unsafe_allow_html=True)

# === CONSTANTS ===
MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

# Catégories par défaut
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
    """Formate un montant en euros"""
    return f"{m:,.0f} €".replace(",", " ")

def get_all_categories(charges):
    """Récupère toutes les catégories existantes"""
    existing = set(ch.get("categorie", "") for ch in charges if ch.get("categorie"))
    all_cats = set(DEFAULT_CATEGORIES) | existing
    return sorted(list(all_cats))

def save_new_charge(categorie: str, description: str, compte: str, mois_list: list, annee: int, lionel: float, ophelie: float):
    """Crée une nouvelle charge avec ses montants pour les mois sélectionnés"""
    # Créer la charge
    cid = save_charge(categorie, description, compte)
    if cid:
        # Créer les montants pour chaque mois sélectionné
        for m in mois_list:
            save_charge_montant(cid, m, annee, lionel, ophelie)
        return True
    return False

def delete_charge_for_months(charge_id: str, mois_list: list, annee: int, delete_all: bool = False):
    """Supprime une charge pour certains mois ou complètement"""
    if delete_all:
        # Supprimer la charge et tous ses montants
        _delete_record("Charges", charge_id)
        # Les montants associés seront orphelins, on peut les nettoyer aussi
        records = _fetch_all("Charges_Montants")
        for rec in records:
            f = rec.get("fields", {})
            cid = f.get("charge_id", [""])[0] if isinstance(f.get("charge_id"), list) else f.get("charge_id")
            if cid == charge_id:
                _delete_record("Charges_Montants", rec["id"])
    else:
        # Supprimer uniquement les montants pour les mois spécifiés
        records = _fetch_all("Charges_Montants")
        for rec in records:
            f = rec.get("fields", {})
            cid = f.get("charge_id", [""])[0] if isinstance(f.get("charge_id"), list) else f.get("charge_id")
            if cid == charge_id and f.get("mois") in mois_list and f.get("annee") == annee:
                _delete_record("Charges_Montants", rec["id"])

def check_category_empty(categorie: str, charges: list, exclude_charge_id: str = None):
    """Vérifie si une catégorie sera vide après suppression d'une charge"""
    charges_in_cat = [ch for ch in charges if ch.get("categorie") == categorie and ch.get("id") != exclude_charge_id]
    return len(charges_in_cat) == 0

def save_new_epargne(type_ep, beneficiaire, ordre=999):
    """Créer un nouveau type d'épargne"""
    fields = {"type": type_ep, "beneficiaire": beneficiaire, "ordre": ordre}
    return _create_record("Epargne", fields)

def delete_epargne(epargne_id):
    """Supprimer un type d'épargne"""
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

# Mettre à jour les catégories avec celles existantes
st.session_state.categories = get_all_categories(data["charges"])

user = get_current_user()
mois_actuel = datetime.now().month if ANNEE == datetime.now().year else 12

# === PREMIUM HEADER ===
st.markdown("""
<div class="premium-header animate-fade-in">
    <h1 class="premium-title">
        💎 Budget Famille TCHAMFONG
    </h1>
    <p class="premium-subtitle">Gestion financière • Exercice {annee}</p>
</div>
""".format(annee=ANNEE), unsafe_allow_html=True)

# === HEADER CONTROLS ===
col1, col2, col3 = st.columns([6, 1, 1])
with col2:
    new_annee = st.selectbox("", [2026, 2027, 2028, 2029, 2030], index=0, label_visibility="collapsed")
    if new_annee != st.session_state.annee:
        st.session_state.annee = new_annee
        refresh()
with col3:
    user_name = user.get('name', 'User').split()[0] if user else 'User'
    if st.button(f"👤 {user_name}", type="secondary"):
        logout()

st.divider()

# === KPIs PREMIUM ===
rev = next((r for r in data["revenus"] if r.get("mois") == mois_actuel), {"lionel": 0, "ophelie": 0})
total_rev = rev.get("lionel", 0) + rev.get("ophelie", 0)
total_ch = sum(c.get("lionel", 0) + c.get("ophelie", 0) for c in data["charges_m"] if c.get("mois") == mois_actuel)
total_ep = sum(e.get("montant", 0) for e in data["epargne_m"] if e.get("mois") == mois_actuel)
solde = total_rev - total_ch - total_ep
taux = (total_ep / total_rev * 100) if total_rev > 0 else 0

# KPIs avec style
k1, k2, k3, k4, k5 = st.columns(5)
k1.metric("💵 Revenus", fmt(total_rev))
k2.metric("💸 Charges", fmt(total_ch))
k3.metric("🏦 Épargne", fmt(total_ep))
with k4:
    if solde >= 0:
        st.metric("💰 Reste à vivre", fmt(solde))
    else:
        st.metric("⚠️ Déficit", fmt(solde))
k5.metric("📊 Taux épargne", f"{taux:.1f}%")

st.divider()

# === TABS PREMIUM ===
tabs = st.tabs([
    "📊 Tableau de bord", 
    "💵 Revenus", 
    "💸 Charges", 
    "🏦 Épargne", 
    "⚙️ Paramètres"
])

# ------ TAB 1: DASHBOARD ------
with tabs[0]:
    col1, col2 = st.columns([1.5, 1])
    
    with col1:
        st.markdown("### 📈 Évolution mensuelle")
        chart_data = []
        for m in range(1, 13):
            r = next((x for x in data["revenus"] if x.get("mois") == m), {"lionel": 0, "ophelie": 0})
            c = sum(x.get("lionel", 0) + x.get("ophelie", 0) for x in data["charges_m"] if x.get("mois") == m)
            e = sum(x.get("montant", 0) for x in data["epargne_m"] if x.get("mois") == m)
            chart_data.append({
                "Mois": MOIS[m-1], 
                "Revenus": r.get("lionel",0)+r.get("ophelie",0), 
                "Charges": c, 
                "Épargne": e
            })
        
        df = pd.DataFrame(chart_data)
        df['Mois'] = pd.Categorical(df['Mois'], categories=MOIS, ordered=True)
        df = df.sort_values('Mois')
        st.bar_chart(df.set_index("Mois"), height=350, color=["#10B981", "#EF4444", "#F59E0B"])
    
    with col2:
        st.markdown("### 🎯 Objectifs épargne")
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
        st.markdown("### 📋 Bilan annuel")
        tr = sum(r.get("lionel",0)+r.get("ophelie",0) for r in data["revenus"])
        tc = sum(c.get("lionel",0)+c.get("ophelie",0) for c in data["charges_m"])
        te = sum(e.get("montant",0) for e in data["epargne_m"])
        
        col_a, col_b = st.columns(2)
        with col_a:
            st.markdown(f"**Revenus :** {fmt(tr)}")
            st.markdown(f"**Charges :** {fmt(tc)}")
        with col_b:
            st.markdown(f"**Épargne :** {fmt(te)}")
            solde_annuel = tr - tc - te
            if solde_annuel >= 0:
                st.markdown(f"**Solde :** <span style='color: #10B981'>{fmt(solde_annuel)}</span>", unsafe_allow_html=True)
            else:
                st.markdown(f"**Déficit :** <span style='color: #EF4444'>{fmt(solde_annuel)}</span>", unsafe_allow_html=True)

# ------ TAB 2: REVENUS ------
with tabs[1]:
    st.markdown("### 💵 Revenus mensuels")
    
    mois_rev = st.selectbox("Sélectionner le mois", range(1,13), format_func=lambda x: MOIS[x-1], index=mois_actuel-1, key="rev_mois")
    
    rev_data = next((r for r in data["revenus"] if r.get("mois") == mois_rev), None)
    
    col1, col2 = st.columns(2)
    with col1:
        st.markdown("#### 👨 Lionel")
        lionel = st.number_input("Montant (€)", value=float(rev_data.get("lionel", 0)) if rev_data else 0.0, step=100.0, key="rev_lionel", label_visibility="collapsed")
    with col2:
        st.markdown("#### 👩 Ophélie")
        ophelie = st.number_input("Montant (€)", value=float(rev_data.get("ophelie", 0)) if rev_data else 0.0, step=100.0, key="rev_ophelie", label_visibility="collapsed")
    
    st.markdown(f"### Total : **{fmt(lionel + ophelie)}**")
    
    if st.button("✓ Enregistrer les revenus", type="primary"):
        save_revenu(mois_rev, ANNEE, lionel, ophelie, rev_data.get("id") if rev_data else None)
        st.success("✅ Revenus enregistrés !")
        refresh()

# ------ TAB 3: CHARGES ------
with tabs[2]:
    st.markdown("### 💸 Charges mensuelles")
    
    # Header avec bouton Ajouter
    col_h1, col_h2 = st.columns([3, 1])
    with col_h1:
        mois_ch = st.selectbox("Sélectionner le mois", range(1,13), format_func=lambda x: MOIS[x-1], index=mois_actuel-1, key="ch_mois")
    with col_h2:
        st.write("")  # Spacer
        if st.button("➕ Ajouter une charge", type="primary", use_container_width=True):
            st.session_state.show_add_charge_modal = True
    
    # === MODAL AJOUT CHARGE ===
    if st.session_state.show_add_charge_modal:
        st.markdown("---")
        st.markdown("### ➕ Nouvelle charge")
        
        with st.container():
            col1, col2 = st.columns(2)
            
            with col1:
                # Choix catégorie existante ou nouvelle
                cat_options = st.session_state.categories + ["➕ Créer une nouvelle catégorie"]
                selected_cat = st.selectbox("Catégorie", cat_options, key="new_charge_cat")
                
                if selected_cat == "➕ Créer une nouvelle catégorie":
                    new_cat_name = st.text_input("Nom de la nouvelle catégorie", key="new_cat_name")
                    final_category = new_cat_name.upper() if new_cat_name else ""
                else:
                    final_category = selected_cat
                
                new_desc = st.text_input("Description de la charge", key="new_charge_desc")
                new_compte = st.selectbox("Compte", ["Commun", "Perso"], key="new_charge_compte")
            
            with col2:
                # Choix des mois
                mois_options = st.multiselect(
                    "Pour quel(s) mois ?",
                    options=range(1, 13),
                    format_func=lambda x: MOIS[x-1],
                    default=[mois_ch],
                    key="new_charge_mois"
                )
                
                # Option "Tous les mois"
                all_months = st.checkbox("Appliquer à tous les mois de l'année", key="new_charge_all_months")
                if all_months:
                    mois_options = list(range(1, 13))
                
                new_l = st.number_input("Montant Lionel (€)", min_value=0.0, step=10.0, key="new_charge_lionel")
                new_o = st.number_input("Montant Ophélie (€)", min_value=0.0, step=10.0, key="new_charge_ophelie")
            
            col_btn1, col_btn2, col_btn3 = st.columns([1, 1, 2])
            with col_btn1:
                if st.button("✓ Ajouter", type="primary"):
                    if new_desc and final_category and mois_options:
                        success = save_new_charge(final_category, new_desc, new_compte, mois_options, ANNEE, new_l, new_o)
                        if success:
                            st.success(f"✅ Charge '{new_desc}' ajoutée pour {len(mois_options)} mois !")
                            st.session_state.show_add_charge_modal = False
                            refresh()
                        else:
                            st.error("❌ Erreur lors de l'ajout")
                    else:
                        st.warning("⚠️ Veuillez remplir tous les champs")
            with col_btn2:
                if st.button("✕ Annuler", type="secondary"):
                    st.session_state.show_add_charge_modal = False
                    st.rerun()
        
        st.markdown("---")
    
    # === MODAL SUPPRESSION ===
    if st.session_state.delete_charge_info:
        info = st.session_state.delete_charge_info
        ch = info["charge"]
        
        st.markdown("---")
        st.markdown(f"### 🗑️ Supprimer : {ch.get('description')}")
        
        # Vérifier si c'est la dernière charge de la catégorie
        is_last_in_category = check_category_empty(ch.get("categorie"), data["charges"], ch.get("id"))
        
        delete_option = st.radio(
            "Que voulez-vous supprimer ?",
            [
                f"Uniquement pour {MOIS[mois_ch-1]} {ANNEE}",
                "Pour tous les mois de l'année",
                "Supprimer complètement la charge"
            ],
            key="delete_option"
        )
        
        if is_last_in_category:
            st.warning(f"⚠️ C'est la dernière charge de la catégorie '{ch.get('categorie')}'. La catégorie sera vide après suppression.")
        
        col_del1, col_del2, col_del3 = st.columns([1, 1, 2])
        with col_del1:
            if st.button("🗑️ Confirmer", type="primary"):
                if "Uniquement" in delete_option:
                    delete_charge_for_months(ch.get("id"), [mois_ch], ANNEE, delete_all=False)
                    st.success(f"✅ Charge supprimée pour {MOIS[mois_ch-1]}")
                elif "tous les mois" in delete_option:
                    delete_charge_for_months(ch.get("id"), list(range(1, 13)), ANNEE, delete_all=False)
                    st.success("✅ Charge supprimée pour tous les mois")
                else:
                    delete_charge_for_months(ch.get("id"), [], ANNEE, delete_all=True)
                    st.success("✅ Charge supprimée définitivement")
                
                st.session_state.delete_charge_info = None
                refresh()
        with col_del2:
            if st.button("✕ Annuler", type="secondary", key="cancel_delete"):
                st.session_state.delete_charge_info = None
                st.rerun()
        
        st.markdown("---")
    
    # === AFFICHAGE DES CHARGES PAR CATÉGORIE ===
    # En-tête tableau
    header_cols = st.columns([3, 1.5, 1.5, 1, 0.8])
    header_cols[0].markdown("**Charge**")
    header_cols[1].markdown("**Lionel €**")
    header_cols[2].markdown("**Ophélie €**")
    header_cols[3].markdown("**Total**")
    header_cols[4].markdown("**Actions**")
    st.markdown("---")
    
    total_general = 0
    for cat in st.session_state.categories:
        charges_cat = [ch for ch in data["charges"] if ch.get("categorie") == cat]
        if not charges_cat:
            continue
        
        cat_total = 0
        for ch in charges_cat:
            m = next((x for x in data["charges_m"] if x.get("charge_id") == ch.get("id") and x.get("mois") == mois_ch), {"lionel": 0, "ophelie": 0})
            cat_total += m.get("lionel", 0) + m.get("ophelie", 0)
        
        total_general += cat_total
        
        with st.expander(f"📁 {cat} — {fmt(cat_total)}", expanded=True):
            for ch in charges_cat:
                m = next((x for x in data["charges_m"] if x.get("charge_id") == ch.get("id") and x.get("mois") == mois_ch), 
                         {"lionel": 0, "ophelie": 0, "id": None})
                
                col1, col2, col3, col4, col5 = st.columns([3, 1.5, 1.5, 1, 0.8])
                with col1:
                    st.write(f"**{ch.get('description', '')}**")
                with col2:
                    nl = st.number_input("L", value=float(m.get("lionel", 0)), step=10.0, 
                                        key=f"l_{ch.get('id')}_{mois_ch}", label_visibility="collapsed")
                with col3:
                    no = st.number_input("O", value=float(m.get("ophelie", 0)), step=10.0, 
                                        key=f"o_{ch.get('id')}_{mois_ch}", label_visibility="collapsed")
                with col4:
                    st.write(f"**{fmt(nl + no)}**")
                with col5:
                    col_save, col_del = st.columns(2)
                    with col_save:
                        if st.button("✓", key=f"save_{ch.get('id')}_{mois_ch}", help="Sauvegarder"):
                            save_charge_montant(ch.get("id"), mois_ch, ANNEE, nl, no, m.get("id"))
                            st.toast("✅ Sauvegardé")
                            refresh()
                    with col_del:
                        if st.button("🗑", key=f"del_{ch.get('id')}_{mois_ch}", help="Supprimer"):
                            st.session_state.delete_charge_info = {"charge": ch, "mois": mois_ch}
                            st.rerun()
    
    st.markdown("---")
    st.markdown(f"## Total charges : **{fmt(total_general)}**")

# ------ TAB 4: ÉPARGNE ------
with tabs[3]:
    st.markdown("### 🏦 Épargne mensuelle")
    
    mois_ep = st.selectbox("Sélectionner le mois", range(1,13), format_func=lambda x: MOIS[x-1], index=mois_actuel-1, key="ep_mois")
    
    # Ajouter un type d'épargne
    with st.expander("➕ Ajouter un nouveau type d'épargne"):
        col1, col2, col3 = st.columns(3)
        with col1:
            new_type = st.text_input("Type (ex: PEA, LDD, Livret A)")
        with col2:
            new_benef = st.text_input("Bénéficiaire (ex: Lionel, Ophélie)")
        with col3:
            new_objectif = st.number_input("Objectif annuel (€)", min_value=0.0, step=100.0)
        
        if st.button("✓ Ajouter l'épargne", type="primary"):
            if new_type and new_benef:
                ep_id = save_new_epargne(new_type, new_benef)
                if ep_id and new_objectif > 0:
                    save_objectif(f"{new_type} {new_benef}", new_objectif)
                st.success("✅ Type d'épargne ajouté !")
                refresh()
            else:
                st.warning("⚠️ Veuillez remplir le type et le bénéficiaire")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### 💰 Montants mensuels")
        total_mensuel = 0
        for ep in data["epargne"]:
            m = next((x for x in data["epargne_m"] if x.get("epargne_id") == ep.get("id") and x.get("mois") == mois_ep), 
                     {"montant": 0, "id": None})
            total_mensuel += m.get("montant", 0)
            
            c1, c2, c3, c4 = st.columns([2.5, 1.5, 0.4, 0.4])
            with c1:
                st.write(f"**{ep.get('type')}** — {ep.get('beneficiaire')}")
            with c2:
                val = st.number_input("€", value=float(m.get("montant", 0)), step=50.0, 
                                     key=f"ep_{ep.get('id')}_{mois_ep}", label_visibility="collapsed")
            with c3:
                if st.button("✓", key=f"save_ep_{ep.get('id')}_{mois_ep}", help="Sauvegarder"):
                    save_epargne_montant(ep.get("id"), mois_ep, ANNEE, val, m.get("id"))
                    st.toast("✅ Sauvegardé")
                    refresh()
            with c4:
                if st.button("🗑", key=f"del_ep_{ep.get('id')}_{mois_ep}", help="Supprimer"):
                    delete_epargne(ep.get("id"))
                    st.toast("🗑️ Supprimé")
                    refresh()
        
        st.markdown(f"**Total : {fmt(total_mensuel)}**")
    
    with col2:
        st.markdown("#### 🎯 Objectifs annuels")
        for ep in data["epargne"]:
            key = f"{ep.get('type')} {ep.get('beneficiaire')}"
            obj = data["objectifs"].get(key, {})
            obj_val = obj.get("objectif", 0) if isinstance(obj, dict) else 0
            obj_id = obj.get("id") if isinstance(obj, dict) else None
            
            c1, c2, c3 = st.columns([2.5, 1.5, 0.5])
            with c1:
                st.write(f"**{key}**")
            with c2:
                nobj = st.number_input("Obj €", value=float(obj_val), step=100.0, 
                                      key=f"obj_{ep.get('id')}", label_visibility="collapsed")
            with c3:
                if st.button("✓", key=f"save_obj_{ep.get('id')}", help="Enregistrer"):
                    save_objectif(key, nobj, obj_id)
                    st.toast("✅ Objectif sauvegardé")
                    refresh()

# ------ TAB 5: PARAMÈTRES ------
with tabs[4]:
    st.markdown("### ⚙️ Paramètres")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("#### 👥 Utilisateurs autorisés")
        users = data["config"].get("authorized_users", "")
        new_users = st.text_area("Emails (séparés par des virgules)", value=users, height=100)
        if st.button("✓ Sauvegarder", type="primary"):
            rid = data["config"].get("_record_ids", {}).get("authorized_users")
            save_config("authorized_users", new_users, rid)
            st.success("✅ Sauvegardé !")
            refresh()
    
    with col2:
        st.markdown("#### ℹ️ Informations")
        st.write(f"**Utilisateur :** {user.get('email', '') if user else 'N/A'}")
        st.write(f"**Année :** {ANNEE}")
        st.write(f"**Mois courant :** {MOIS[mois_actuel-1]}")
        st.write(f"**Catégories :** {len(st.session_state.categories)}")
        st.write(f"**Charges :** {len(data['charges'])}")
        st.write(f"**Types d'épargne :** {len(data['epargne'])}")
        
        if st.button("🔄 Rafraîchir les données"):
            refresh()

# Footer Premium
st.markdown("---")
st.markdown("""
<div style="text-align: center; color: #64748B; font-size: 0.85rem; padding: 1rem 0;">
    💎 Budget Famille TCHAMFONG • Streamlit + Airtable • {annee}
</div>
""".format(annee=ANNEE), unsafe_allow_html=True)
