"""
app-budget.py — Budget Famille TCHAMFONG
Style Portfolio avec composants Streamlit natifs
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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

* { font-family: 'Inter', sans-serif !important; }

.stApp { background: #F8F9FB !important; }

#MainMenu, footer, header { visibility: hidden; }

.main .block-container {
    padding: 0 2rem 2rem 2rem !important;
    max-width: 1400px !important;
}

/* Tabs style portfolio */
.stTabs [data-baseweb="tab-list"] {
    background: white !important;
    border-radius: 16px !important;
    padding: 0.5rem !important;
    gap: 0.5rem !important;
    border: 1px solid #E5E7EB !important;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06) !important;
}

.stTabs [data-baseweb="tab"] {
    font-weight: 600 !important;
    color: #6B7280 !important;
    background: transparent !important;
    border-radius: 12px !important;
    padding: 0.75rem 1.5rem !important;
}

.stTabs [data-baseweb="tab"]:hover {
    color: #1F2937 !important;
    background: #F3F4F6 !important;
}

.stTabs [aria-selected="true"] {
    background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%) !important;
    color: white !important;
}

/* Boutons */
.stButton > button[kind="primary"] {
    background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%) !important;
    border: none !important;
    color: white !important;
    font-weight: 600 !important;
    border-radius: 10px !important;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3) !important;
}

.stButton > button[kind="secondary"] {
    background: white !important;
    border: 1px solid #E5E7EB !important;
    color: #6B7280 !important;
    font-weight: 500 !important;
    border-radius: 10px !important;
}

.stButton > button[kind="secondary"]:hover {
    border-color: #8B5CF6 !important;
    color: #8B5CF6 !important;
}

/* Inputs */
.stNumberInput input, .stTextInput input, .stTextArea textarea {
    background: white !important;
    border: 1px solid #E5E7EB !important;
    border-radius: 10px !important;
}

.stNumberInput input:focus, .stTextInput input:focus {
    border-color: #8B5CF6 !important;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1) !important;
}

/* Expanders */
.streamlit-expanderHeader {
    background: white !important;
    border: 1px solid #E5E7EB !important;
    border-radius: 12px !important;
    font-weight: 600 !important;
}

.streamlit-expanderContent {
    background: #FAFBFC !important;
    border: 1px solid #E5E7EB !important;
    border-top: none !important;
}

/* Metrics */
[data-testid="stMetricValue"] {
    font-weight: 700 !important;
    color: #22C55E !important;
}

[data-testid="stMetricLabel"] {
    font-weight: 600 !important;
    color: #6B7280 !important;
    text-transform: uppercase !important;
    font-size: 0.75rem !important;
}

/* Alerts */
.stSuccess { background: #ECFDF5 !important; border: 1px solid #A7F3D0 !important; border-radius: 12px !important; }
.stWarning { background: #FFFBEB !important; border: 1px solid #FDE68A !important; border-radius: 12px !important; }
.stError { background: #FEF2F2 !important; border: 1px solid #FECACA !important; border-radius: 12px !important; }
.stInfo { background: #EFF6FF !important; border: 1px solid #BFDBFE !important; border-radius: 12px !important; }

/* Progress */
.stProgress > div > div { background: #E5E7EB !important; border-radius: 10px !important; }
.stProgress > div > div > div { background: linear-gradient(135deg, #22C55E 0%, #4ADE80 100%) !important; border-radius: 10px !important; }

/* Divider */
hr { border: none !important; height: 1px !important; background: #E5E7EB !important; }
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
    return sorted(list(set(DEFAULT_CATEGORIES) | existing))

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
    return len([ch for ch in charges if ch.get("categorie") == categorie and ch.get("id") != exclude_charge_id]) == 0

def save_new_epargne(type_ep, beneficiaire, ordre=999):
    return _create_record("Epargne", {"type": type_ep, "beneficiaire": beneficiaire, "ordre": ordre})

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
user_name = user.get('name', 'User').split()[0] if user else 'User'
mois_actuel = datetime.now().month if ANNEE == datetime.now().year else 12

# ========================================
# HEADER SOMBRE STYLE PORTFOLIO
# ========================================
st.markdown(f"""
<div style="
    background: linear-gradient(135deg, #1a1f35 0%, #2d1f47 50%, #1a2540 100%);
    padding: 1.5rem 2rem;
    border-radius: 0 0 24px 24px;
    margin: -6rem -2rem 1.5rem -2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
">
    <div>
        <h1 style="
            font-size: 1.5rem;
            font-weight: 700;
            color: #22C55E;
            margin: 0;
        ">💰 Budget Famille TCHAMFONG</h1>
        <p style="color: #94A3B8; font-size: 0.9rem; margin: 0.25rem 0 0 0;">Exercice {ANNEE}</p>
    </div>
    <div style="display: flex; align-items: center; gap: 1rem;">
        <span style="color: #E2E8F0; font-size: 0.9rem;">👤 {user_name}</span>
    </div>
</div>
""", unsafe_allow_html=True)

# Contrôles header
col1, col2, col3 = st.columns([8, 1, 1])
with col2:
    new_annee = st.selectbox("", [2026, 2027, 2028, 2029, 2030], index=0, label_visibility="collapsed")
    if new_annee != st.session_state.annee:
        st.session_state.annee = new_annee
        refresh()
with col3:
    if st.button("Déconnexion", type="secondary"):
        logout()

# ========================================
# KPIs
# ========================================
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
k4.metric("💰 Reste", fmt(solde))
k5.metric("📊 Taux", f"{taux:.1f}%")

st.divider()

# ========================================
# TABS
# ========================================
tabs = st.tabs(["📊 DASHBOARD", "💵 REVENUS", "💸 CHARGES", "🏦 ÉPARGNE", "⚙️ PARAMÈTRES"])

# === TAB 1: DASHBOARD ===
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
        st.markdown("#### 🎯 Objectifs")
        for ep in data["epargne"]:
            key = f"{ep.get('type')} {ep.get('beneficiaire')}"
            cumul = sum(e.get("montant", 0) for e in data["epargne_m"] if e.get("epargne_id") == ep.get("id"))
            obj = data["objectifs"].get(key, {})
            objectif = obj.get("objectif", 0) if isinstance(obj, dict) else 0
            if objectif > 0:
                st.write(f"**{key}**")
                st.progress(min(1.0, cumul / objectif), text=f"{fmt(cumul)} / {fmt(objectif)}")
        
        st.divider()
        st.markdown("#### 📋 Bilan annuel")
        tr = sum(r.get("lionel",0)+r.get("ophelie",0) for r in data["revenus"])
        tc = sum(c.get("lionel",0)+c.get("ophelie",0) for c in data["charges_m"])
        te = sum(e.get("montant",0) for e in data["epargne_m"])
        st.write(f"**Revenus:** {fmt(tr)} | **Charges:** {fmt(tc)} | **Épargne:** {fmt(te)}")
        st.write(f"**Solde:** {fmt(tr-tc-te)}")

# === TAB 2: REVENUS ===
with tabs[1]:
    st.markdown("#### 💵 Revenus mensuels")
    mois_rev = st.selectbox("Mois", range(1,13), format_func=lambda x: MOIS[x-1], index=mois_actuel-1, key="rev_mois")
    rev_data = next((r for r in data["revenus"] if r.get("mois") == mois_rev), None)
    
    c1, c2 = st.columns(2)
    with c1:
        st.write("**👨 Lionel**")
        lionel = st.number_input("€", value=float(rev_data.get("lionel", 0)) if rev_data else 0.0, step=100.0, key="rev_l", label_visibility="collapsed")
    with c2:
        st.write("**👩 Ophélie**")
        ophelie = st.number_input("€", value=float(rev_data.get("ophelie", 0)) if rev_data else 0.0, step=100.0, key="rev_o", label_visibility="collapsed")
    
    st.info(f"**Total: {fmt(lionel + ophelie)}**")
    if st.button("✓ Enregistrer", type="primary", key="save_rev"):
        save_revenu(mois_rev, ANNEE, lionel, ophelie, rev_data.get("id") if rev_data else None)
        st.success("✅ OK!")
        refresh()

# === TAB 3: CHARGES ===
with tabs[2]:
    st.markdown("#### 💸 Charges mensuelles")
    
    ch1, ch2 = st.columns([3, 1])
    with ch1:
        mois_ch = st.selectbox("Mois", range(1,13), format_func=lambda x: MOIS[x-1], index=mois_actuel-1, key="ch_mois")
    with ch2:
        if st.button("➕ Ajouter", type="primary", use_container_width=True):
            st.session_state.show_add_charge_modal = True
    
    # Modal ajout
    if st.session_state.show_add_charge_modal:
        with st.container():
            st.markdown("##### ➕ Nouvelle charge")
            c1, c2 = st.columns(2)
            with c1:
                cat_opts = st.session_state.categories + ["➕ Nouvelle..."]
                sel_cat = st.selectbox("Catégorie", cat_opts, key="add_cat")
                if sel_cat == "➕ Nouvelle...":
                    new_cat = st.text_input("Nom catégorie", key="new_cat")
                    final_cat = new_cat.upper() if new_cat else ""
                else:
                    final_cat = sel_cat
                new_desc = st.text_input("Description", key="add_desc")
                new_compte = st.selectbox("Compte", ["Commun", "Perso"], key="add_compte")
            with c2:
                sel_mois = st.multiselect("Mois", range(1,13), format_func=lambda x: MOIS[x-1], default=[mois_ch], key="add_mois")
                if st.checkbox("Tous les mois", key="add_all"):
                    sel_mois = list(range(1, 13))
                add_l = st.number_input("Lionel €", min_value=0.0, step=10.0, key="add_l")
                add_o = st.number_input("Ophélie €", min_value=0.0, step=10.0, key="add_o")
            
            b1, b2, _ = st.columns([1, 1, 2])
            with b1:
                if st.button("✓ Ajouter", type="primary", key="confirm_add"):
                    if new_desc and final_cat and sel_mois:
                        save_new_charge(final_cat, new_desc, new_compte, sel_mois, ANNEE, add_l, add_o)
                        st.session_state.show_add_charge_modal = False
                        refresh()
            with b2:
                if st.button("Annuler", key="cancel_add"):
                    st.session_state.show_add_charge_modal = False
                    st.rerun()
            st.divider()
    
    # Modal suppression
    if st.session_state.delete_charge_info:
        ch = st.session_state.delete_charge_info["charge"]
        st.warning(f"🗑️ Supprimer: **{ch.get('description')}**")
        del_opt = st.radio("", [f"Ce mois ({MOIS[mois_ch-1]})", "Tous les mois", "Complètement"], key="del_opt", horizontal=True)
        
        if check_category_empty(ch.get("categorie"), data["charges"], ch.get("id")):
            st.info(f"ℹ️ Dernière charge de '{ch.get('categorie')}'")
        
        d1, d2, _ = st.columns([1, 1, 2])
        with d1:
            if st.button("🗑️ Confirmer", type="primary", key="confirm_del"):
                if "Ce mois" in del_opt:
                    delete_charge_for_months(ch.get("id"), [mois_ch], ANNEE)
                elif "Tous" in del_opt:
                    delete_charge_for_months(ch.get("id"), list(range(1,13)), ANNEE)
                else:
                    delete_charge_for_months(ch.get("id"), [], ANNEE, True)
                st.session_state.delete_charge_info = None
                refresh()
        with d2:
            if st.button("Annuler", key="cancel_del"):
                st.session_state.delete_charge_info = None
                st.rerun()
        st.divider()
    
    # Liste charges
    total_gen = 0
    for cat in st.session_state.categories:
        charges_cat = [ch for ch in data["charges"] if ch.get("categorie") == cat]
        if not charges_cat:
            continue
        
        cat_total = sum(
            next((x for x in data["charges_m"] if x.get("charge_id") == ch.get("id") and x.get("mois") == mois_ch), {}).get("lionel", 0) +
            next((x for x in data["charges_m"] if x.get("charge_id") == ch.get("id") and x.get("mois") == mois_ch), {}).get("ophelie", 0)
            for ch in charges_cat
        )
        total_gen += cat_total
        
        with st.expander(f"📁 {cat} — {fmt(cat_total)}", expanded=True):
            for ch in charges_cat:
                m = next((x for x in data["charges_m"] if x.get("charge_id") == ch.get("id") and x.get("mois") == mois_ch), {"lionel": 0, "ophelie": 0, "id": None})
                c1, c2, c3, c4, c5 = st.columns([3, 1.5, 1.5, 1, 0.8])
                c1.write(f"**{ch.get('description', '')}**")
                nl = c2.number_input("L", value=float(m.get("lionel", 0)), step=10.0, key=f"l_{ch.get('id')}", label_visibility="collapsed")
                no = c3.number_input("O", value=float(m.get("ophelie", 0)), step=10.0, key=f"o_{ch.get('id')}", label_visibility="collapsed")
                c4.write(f"**{fmt(nl + no)}**")
                with c5:
                    sc, dc = st.columns(2)
                    if sc.button("✓", key=f"s_{ch.get('id')}"):
                        save_charge_montant(ch.get("id"), mois_ch, ANNEE, nl, no, m.get("id"))
                        refresh()
                    if dc.button("🗑", key=f"d_{ch.get('id')}"):
                        st.session_state.delete_charge_info = {"charge": ch}
                        st.rerun()
    
    st.markdown(f"### Total: **{fmt(total_gen)}**")

# === TAB 4: ÉPARGNE ===
with tabs[3]:
    st.markdown("#### 🏦 Épargne")
    mois_ep = st.selectbox("Mois", range(1,13), format_func=lambda x: MOIS[x-1], index=mois_actuel-1, key="ep_mois")
    
    with st.expander("➕ Ajouter"):
        e1, e2, e3 = st.columns(3)
        nt = e1.text_input("Type")
        nb = e2.text_input("Bénéficiaire")
        no = e3.number_input("Objectif €", min_value=0.0, step=100.0)
        if st.button("✓ Ajouter", type="primary", key="add_ep"):
            if nt and nb:
                eid = save_new_epargne(nt, nb)
                if eid and no > 0:
                    save_objectif(f"{nt} {nb}", no)
                refresh()
    
    for ep in data["epargne"]:
        m = next((x for x in data["epargne_m"] if x.get("epargne_id") == ep.get("id") and x.get("mois") == mois_ep), {"montant": 0, "id": None})
        c1, c2, c3, c4 = st.columns([3, 1.5, 0.5, 0.5])
        c1.write(f"**{ep.get('type')}** — {ep.get('beneficiaire')}")
        val = c2.number_input("€", value=float(m.get("montant", 0)), step=50.0, key=f"ep_{ep.get('id')}", label_visibility="collapsed")
        if c3.button("✓", key=f"sep_{ep.get('id')}"):
            save_epargne_montant(ep.get("id"), mois_ep, ANNEE, val, m.get("id"))
            refresh()
        if c4.button("🗑", key=f"dep_{ep.get('id')}"):
            delete_epargne(ep.get("id"))
            refresh()

# === TAB 5: PARAMÈTRES ===
with tabs[4]:
    st.markdown("#### ⚙️ Paramètres")
    c1, c2 = st.columns(2)
    with c1:
        st.write("**Utilisateurs autorisés**")
        users = data["config"].get("authorized_users", "")
        new_users = st.text_area("Emails", value=users, height=100)
        if st.button("✓ Sauver", type="primary"):
            save_config("authorized_users", new_users, data["config"].get("_record_ids", {}).get("authorized_users"))
            refresh()
    with c2:
        st.write("**Infos**")
        st.write(f"Email: {user.get('email', '') if user else 'N/A'}")
        st.write(f"Année: {ANNEE}")
        st.write(f"Charges: {len(data['charges'])} | Épargnes: {len(data['epargne'])}")
        if st.button("🔄 Rafraîchir"):
            refresh()

st.markdown("<p style='text-align: center; color: #9CA3AF; font-size: 0.8rem; margin-top: 2rem;'>💰 Budget Famille TCHAMFONG</p>", unsafe_allow_html=True)
