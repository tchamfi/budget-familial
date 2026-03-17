"""
app-budget.py — Budget Familial
Version corrigée : UI améliorée, onglets visibles, pas de disquette
"""

import streamlit as st
from datetime import datetime
import pandas as pd

from airtable_store import (
    load_revenus, save_revenu,
    load_charges, load_charges_montants, save_charge, save_charge_montant,
    load_epargne, load_epargne_montants, save_epargne_montant,
    load_objectifs, save_objectif, load_config, save_config,
    _create_record, _delete_record
)

# === CONFIG ===
st.set_page_config(
    page_title="Budget Familial",
    page_icon="💰",
    layout="wide"
)

# === CSS pour onglets plus visibles ===
st.markdown("""
<style>
    /* Onglets plus gros et colorés */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
        background-color: #f0f2f6;
        padding: 8px;
        border-radius: 10px;
    }
    .stTabs [data-baseweb="tab"] {
        padding: 12px 24px;
        font-size: 16px;
        font-weight: 600;
        border-radius: 8px;
        background-color: white;
        border: 2px solid #e0e0e0;
    }
    .stTabs [aria-selected="true"] {
        background-color: #4CAF50 !important;
        color: white !important;
        border-color: #4CAF50 !important;
    }
    /* Bouton enregistrer plus visible */
    .save-btn {
        background-color: #4CAF50;
        color: white;
        padding: 4px 12px;
        border-radius: 4px;
        font-weight: bold;
    }
</style>
""", unsafe_allow_html=True)

# === CONSTANTS ===
MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

CATEGORIES = ["LOGEMENT", "MAISON", "VOITURE & TRANSPORT", "ABONNEMENTS",
              "SPORT & SANTÉ", "ENFANTS", "ALIMENTAIRE", "LOISIRS", "DEPENSES EXCEPTIONNELLES"]

# === AUTH ===
from auth import is_authenticated, login_page, logout, get_current_user

if not is_authenticated():
    login_page()
    st.stop()

# === STATE ===
if "annee" not in st.session_state:
    st.session_state.annee = 2026

# === HELPERS ===
def fmt(m):
    return f"{m:,.0f} €".replace(",", " ")

def save_new_epargne(type_ep, beneficiaire, ordre=999):
    """Créer un nouveau type d'épargne"""
    fields = {"type": type_ep, "beneficiaire": beneficiaire, "ordre": ordre}
    return _create_record("Epargne", fields)

def delete_epargne(epargne_id):
    """Supprimer un type d'épargne"""
    return _delete_record("Epargne", epargne_id)

def delete_charge(charge_id):
    """Supprimer une charge"""
    return _delete_record("Charges", charge_id)

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

user = get_current_user()
mois_actuel = datetime.now().month if ANNEE == datetime.now().year else 12

# === HEADER ===
col1, col2, col3 = st.columns([4, 1, 1])
with col1:
    st.title("💰 Budget Familial")
    st.caption(f"Exercice {ANNEE}")
with col2:
    new_annee = st.selectbox("Année", [2026, 2027, 2028, 2029, 2030], index=0, label_visibility="collapsed")
    if new_annee != st.session_state.annee:
        st.session_state.annee = new_annee
        refresh()
with col3:
    st.write(f"👤 {user.get('name', 'User').split()[0]}")
    if st.button("Déconnexion", type="secondary"):
        logout()

st.divider()

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

# === TABS (onglets bien visibles) ===
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
        st.subheader("📈 Évolution mensuelle")
        chart_data = []
        # Ordre des mois correct : Janvier -> Décembre
        for m in range(1, 13):
            r = next((x for x in data["revenus"] if x.get("mois") == m), {"lionel": 0, "ophelie": 0})
            c = sum(x.get("lionel", 0) + x.get("ophelie", 0) for x in data["charges_m"] if x.get("mois") == m)
            e = sum(x.get("montant", 0) for x in data["epargne_m"] if x.get("mois") == m)
            # Mois COMPLET, pas tronqué
            chart_data.append({
                "Mois": MOIS[m-1], 
                "Revenus": r.get("lionel",0)+r.get("ophelie",0), 
                "Charges": c, 
                "Épargne": e
            })
        
        df = pd.DataFrame(chart_data)
        # Forcer l'ordre des mois
        df['Mois'] = pd.Categorical(df['Mois'], categories=MOIS, ordered=True)
        df = df.sort_values('Mois')
        st.bar_chart(df.set_index("Mois"), height=350)
    
    with col2:
        st.subheader("🎯 Objectifs épargne")
        for ep in data["epargne"]:
            key = f"{ep.get('type')} {ep.get('beneficiaire')}"
            cumul = sum(e.get("montant", 0) for e in data["epargne_m"] if e.get("epargne_id") == ep.get("id"))
            obj = data["objectifs"].get(key, {})
            objectif = obj.get("objectif", 0) if isinstance(obj, dict) else 0
            if objectif > 0:
                pct = cumul / objectif
                st.write(f"**{key}**")
                st.progress(min(1.0, pct), text=f"{fmt(cumul)} / {fmt(objectif)}")
        
        st.subheader("📋 Bilan annuel")
        tr = sum(r.get("lionel",0)+r.get("ophelie",0) for r in data["revenus"])
        tc = sum(c.get("lionel",0)+c.get("ophelie",0) for c in data["charges_m"])
        te = sum(e.get("montant",0) for e in data["epargne_m"])
        st.write(f"Revenus : **{fmt(tr)}**")
        st.write(f"Charges : **{fmt(tc)}**")
        st.write(f"Épargne : **{fmt(te)}**")
        st.write(f"Solde : **{fmt(tr-tc-te)}**")

# ------ TAB 2: REVENUS ------
with tabs[1]:
    st.subheader("💵 Revenus")
    
    mois_rev = st.selectbox("Sélectionner le mois", range(1,13), format_func=lambda x: MOIS[x-1], index=mois_actuel-1, key="rev_mois")
    
    rev_data = next((r for r in data["revenus"] if r.get("mois") == mois_rev), None)
    
    col1, col2 = st.columns(2)
    with col1:
        lionel = st.number_input("Lionel (€)", value=float(rev_data.get("lionel", 0)) if rev_data else 0.0, step=100.0)
    with col2:
        ophelie = st.number_input("Ophélie (€)", value=float(rev_data.get("ophelie", 0)) if rev_data else 0.0, step=100.0)
    
    st.info(f"Total : **{fmt(lionel + ophelie)}**")
    
    if st.button("✓ Enregistrer les revenus", type="primary"):
        save_revenu(mois_rev, ANNEE, lionel, ophelie, rev_data.get("id") if rev_data else None)
        st.success("✅ Revenus enregistrés !")
        refresh()

# ------ TAB 3: CHARGES ------
with tabs[2]:
    st.subheader("💸 Charges")
    
    mois_ch = st.selectbox("Sélectionner le mois", range(1,13), format_func=lambda x: MOIS[x-1], index=mois_actuel-1, key="ch_mois")
    
    # Ajouter une charge
    with st.expander("➕ Ajouter une nouvelle charge"):
        col1, col2 = st.columns(2)
        with col1:
            new_cat = st.selectbox("Catégorie", CATEGORIES)
            new_desc = st.text_input("Description")
        with col2:
            new_compte = st.selectbox("Compte", ["Commun", "Perso"])
            new_l = st.number_input("Montant Lionel (€)", min_value=0.0, step=10.0, key="add_l")
            new_o = st.number_input("Montant Ophélie (€)", min_value=0.0, step=10.0, key="add_o")
        
        if st.button("Ajouter la charge", type="primary"):
            if new_desc:
                cid = save_charge(new_cat, new_desc, new_compte)
                if cid:
                    save_charge_montant(cid, mois_ch, ANNEE, new_l, new_o)
                    st.success("✅ Charge ajoutée !")
                    refresh()
    
    # En-tête des colonnes
    st.markdown("---")
    header_cols = st.columns([3, 1.5, 1.5, 1, 0.5])
    header_cols[0].markdown("**Charge**")
    header_cols[1].markdown("**Lionel €**")
    header_cols[2].markdown("**Ophélie €**")
    header_cols[3].markdown("**Total**")
    header_cols[4].markdown("")
    st.markdown("---")
    
    # Afficher par catégorie
    total_general = 0
    for cat in CATEGORIES:
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
                
                col1, col2, col3, col4, col5 = st.columns([3, 1.5, 1.5, 1, 0.5])
                with col1:
                    st.write(f"**{ch.get('description', '')}**")
                with col2:
                    nl = st.number_input("Lionel", value=float(m.get("lionel", 0)), step=10.0, 
                                        key=f"l_{ch.get('id')}_{mois_ch}", label_visibility="collapsed")
                with col3:
                    no = st.number_input("Ophélie", value=float(m.get("ophelie", 0)), step=10.0, 
                                        key=f"o_{ch.get('id')}_{mois_ch}", label_visibility="collapsed")
                with col4:
                    st.write(f"**{fmt(nl + no)}**")
                with col5:
                    # Menu avec les actions
                    action = st.selectbox("", ["", "✓", "🗑"], key=f"act_{ch.get('id')}_{mois_ch}", label_visibility="collapsed")
                    if action == "✓":
                        save_charge_montant(ch.get("id"), mois_ch, ANNEE, nl, no, m.get("id"))
                        st.toast("✅ Sauvegardé")
                        refresh()
                    elif action == "🗑":
                        delete_charge(ch.get("id"))
                        st.toast("🗑️ Supprimé")
                        refresh()
    
    st.error(f"**TOTAL CHARGES : {fmt(total_general)}**")

# ------ TAB 4: ÉPARGNE ------
with tabs[3]:
    st.subheader("🏦 Épargne")
    
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
        
        if st.button("Ajouter l'épargne", type="primary"):
            if new_type and new_benef:
                ep_id = save_new_epargne(new_type, new_benef)
                if ep_id and new_objectif > 0:
                    save_objectif(f"{new_type} {new_benef}", new_objectif)
                st.success("✅ Type d'épargne ajouté !")
                refresh()
            else:
                st.warning("Veuillez remplir le type et le bénéficiaire")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.write("### 💰 Montants mensuels")
        total_mensuel = 0
        for ep in data["epargne"]:
            m = next((x for x in data["epargne_m"] if x.get("epargne_id") == ep.get("id") and x.get("mois") == mois_ep), 
                     {"montant": 0, "id": None})
            total_mensuel += m.get("montant", 0)
            
            c1, c2, c3 = st.columns([2.5, 1.5, 0.5])
            with c1:
                st.write(f"**{ep.get('type')}** — {ep.get('beneficiaire')}")
            with c2:
                val = st.number_input("Montant", value=float(m.get("montant", 0)), step=50.0, 
                                     key=f"ep_{ep.get('id')}_{mois_ep}", label_visibility="collapsed")
            with c3:
                action = st.selectbox("", ["", "✓", "🗑"], key=f"act_ep_{ep.get('id')}_{mois_ep}", label_visibility="collapsed")
                if action == "✓":
                    save_epargne_montant(ep.get("id"), mois_ep, ANNEE, val, m.get("id"))
                    st.toast("✅ Sauvegardé")
                    refresh()
                elif action == "🗑":
                    delete_epargne(ep.get("id"))
                    st.toast("🗑️ Supprimé")
                    refresh()
        
        st.info(f"Total : **{fmt(total_mensuel)}**")
    
    with col2:
        st.write("### 🎯 Objectifs annuels")
        for ep in data["epargne"]:
            key = f"{ep.get('type')} {ep.get('beneficiaire')}"
            obj = data["objectifs"].get(key, {})
            obj_val = obj.get("objectif", 0) if isinstance(obj, dict) else 0
            obj_id = obj.get("id") if isinstance(obj, dict) else None
            
            c1, c2, c3 = st.columns([2.5, 1.5, 0.5])
            with c1:
                st.write(f"**{key}**")
            with c2:
                nobj = st.number_input("Objectif", value=float(obj_val), step=100.0, 
                                      key=f"obj_{ep.get('id')}", label_visibility="collapsed")
            with c3:
                if st.button("✓", key=f"save_obj_{ep.get('id')}", help="Enregistrer"):
                    save_objectif(key, nobj, obj_id)
                    st.toast("✅ Objectif sauvegardé")
                    refresh()

# ------ TAB 5: PARAMÈTRES ------
with tabs[4]:
    st.subheader("⚙️ Paramètres")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.write("### 👥 Utilisateurs autorisés")
        users = data["config"].get("authorized_users", "")
        new_users = st.text_area("Emails (séparés par des virgules)", value=users, height=100)
        if st.button("✓ Sauvegarder", type="primary"):
            rid = data["config"].get("_record_ids", {}).get("authorized_users")
            save_config("authorized_users", new_users, rid)
            st.success("✅ Sauvegardé !")
            refresh()
    
    with col2:
        st.write("### ℹ️ Informations")
        st.write(f"Utilisateur : **{user.get('email', '')}**")
        st.write(f"Année : **{ANNEE}**")
        st.write(f"Mois courant : **{MOIS[mois_actuel-1]}**")
        
        if st.button("🔄 Rafraîchir les données"):
            refresh()

# Footer
st.divider()
st.caption("Budget Familial • Streamlit + Airtable")
