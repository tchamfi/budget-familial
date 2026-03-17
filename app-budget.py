"""
app-budget.py — Budget Famille TCHAMFONG
100% Streamlit natif - propre et fonctionnel
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

# CSS minimal
st.markdown("""
<style>
#MainMenu, footer, header { visibility: hidden; }
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
if "show_add_charge" not in st.session_state:
    st.session_state.show_add_charge = False
if "delete_info" not in st.session_state:
    st.session_state.delete_info = None
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

def check_last_in_category(categorie, charges, exclude_id=None):
    return len([ch for ch in charges if ch.get("categorie") == categorie and ch.get("id") != exclude_id]) == 0

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
# HEADER
# ========================================
h1, h2, h3, h4 = st.columns([4, 1, 1, 1])
with h1:
    st.title("💰 Budget Famille TCHAMFONG")
    st.caption(f"Exercice {ANNEE} • Connecté : {user_name}")
with h2:
    new_annee = st.selectbox("Année", [2026, 2027, 2028, 2029, 2030], index=0, label_visibility="collapsed")
    if new_annee != st.session_state.annee:
        st.session_state.annee = new_annee
        refresh()
with h3:
    if st.button("🔄 Rafraîchir"):
        refresh()
with h4:
    if st.button("🚪 Déconnexion"):
        logout()

st.divider()

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
k4.metric("💰 Reste à vivre", fmt(solde))
k5.metric("📊 Taux épargne", f"{taux:.1f}%")

st.divider()

# ========================================
# TABS
# ========================================
tabs = st.tabs(["📊 Dashboard", "💵 Revenus", "💸 Charges", "🏦 Épargne", "⚙️ Paramètres"])

# === TAB 1: DASHBOARD ===
with tabs[0]:
    col1, col2 = st.columns([1.5, 1])
    
    with col1:
        st.subheader("📈 Évolution mensuelle")
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
        st.subheader("🎯 Objectifs épargne")
        for ep in data["epargne"]:
            key = f"{ep.get('type')} {ep.get('beneficiaire')}"
            cumul = sum(e.get("montant", 0) for e in data["epargne_m"] if e.get("epargne_id") == ep.get("id"))
            obj = data["objectifs"].get(key, {})
            objectif = obj.get("objectif", 0) if isinstance(obj, dict) else 0
            if objectif > 0:
                st.write(f"**{key}**")
                st.progress(min(1.0, cumul / objectif), text=f"{fmt(cumul)} / {fmt(objectif)}")
        
        st.divider()
        st.subheader("📋 Bilan annuel")
        tr = sum(r.get("lionel",0)+r.get("ophelie",0) for r in data["revenus"])
        tc = sum(c.get("lionel",0)+c.get("ophelie",0) for c in data["charges_m"])
        te = sum(e.get("montant",0) for e in data["epargne_m"])
        st.write(f"**Revenus:** {fmt(tr)}")
        st.write(f"**Charges:** {fmt(tc)}")
        st.write(f"**Épargne:** {fmt(te)}")
        st.write(f"**Solde:** {fmt(tr-tc-te)}")

# === TAB 2: REVENUS ===
with tabs[1]:
    st.subheader("💵 Revenus mensuels")
    
    mois_rev = st.selectbox("Mois", range(1,13), format_func=lambda x: MOIS[x-1], index=mois_actuel-1, key="rev_mois")
    rev_data = next((r for r in data["revenus"] if r.get("mois") == mois_rev), None)
    
    c1, c2 = st.columns(2)
    with c1:
        st.write("**👨 Lionel**")
        lionel = st.number_input("Montant €", value=float(rev_data.get("lionel", 0)) if rev_data else 0.0, step=100.0, key="rev_l", label_visibility="collapsed")
    with c2:
        st.write("**👩 Ophélie**")
        ophelie = st.number_input("Montant €", value=float(rev_data.get("ophelie", 0)) if rev_data else 0.0, step=100.0, key="rev_o", label_visibility="collapsed")
    
    st.info(f"**Total: {fmt(lionel + ophelie)}**")
    
    if st.button("✅ Enregistrer les revenus", type="primary", key="save_rev"):
        save_revenu(mois_rev, ANNEE, lionel, ophelie, rev_data.get("id") if rev_data else None)
        st.success("Revenus enregistrés !")
        refresh()

# === TAB 3: CHARGES ===
with tabs[2]:
    st.subheader("💸 Charges mensuelles")
    
    # Header
    ch1, ch2 = st.columns([3, 1])
    with ch1:
        mois_ch = st.selectbox("Mois", range(1,13), format_func=lambda x: MOIS[x-1], index=mois_actuel-1, key="ch_mois")
    with ch2:
        if st.button("➕ Ajouter une charge", type="primary", use_container_width=True):
            st.session_state.show_add_charge = True
    
    # === FORMULAIRE AJOUT ===
    if st.session_state.show_add_charge:
        st.divider()
        st.subheader("➕ Nouvelle charge")
        
        c1, c2 = st.columns(2)
        with c1:
            cat_opts = st.session_state.categories + ["➕ Créer nouvelle catégorie"]
            sel_cat = st.selectbox("Catégorie", cat_opts, key="add_cat")
            
            if sel_cat == "➕ Créer nouvelle catégorie":
                new_cat = st.text_input("Nom de la nouvelle catégorie", key="new_cat")
                final_cat = new_cat.upper() if new_cat else ""
            else:
                final_cat = sel_cat
            
            new_desc = st.text_input("Description de la charge", key="add_desc")
            new_compte = st.selectbox("Compte", ["Commun", "Perso"], key="add_compte")
        
        with c2:
            sel_mois = st.multiselect("Mois concernés", range(1,13), format_func=lambda x: MOIS[x-1], default=[mois_ch], key="add_mois")
            all_months = st.checkbox("✅ Appliquer à tous les mois de l'année", key="add_all")
            if all_months:
                sel_mois = list(range(1, 13))
            
            add_l = st.number_input("Montant Lionel €", min_value=0.0, step=10.0, key="add_l")
            add_o = st.number_input("Montant Ophélie €", min_value=0.0, step=10.0, key="add_o")
        
        b1, b2, _ = st.columns([1, 1, 2])
        with b1:
            if st.button("✅ Ajouter", type="primary", key="confirm_add"):
                if new_desc and final_cat and sel_mois:
                    save_new_charge(final_cat, new_desc, new_compte, sel_mois, ANNEE, add_l, add_o)
                    st.success(f"Charge '{new_desc}' ajoutée pour {len(sel_mois)} mois !")
                    st.session_state.show_add_charge = False
                    refresh()
                else:
                    st.warning("Veuillez remplir tous les champs")
        with b2:
            if st.button("❌ Annuler", key="cancel_add"):
                st.session_state.show_add_charge = False
                st.rerun()
        
        st.divider()
    
    # === FORMULAIRE SUPPRESSION ===
    if st.session_state.delete_info:
        ch = st.session_state.delete_info["charge"]
        
        st.divider()
        st.subheader(f"🗑️ Supprimer : {ch.get('description')}")
        
        del_opt = st.radio(
            "Que voulez-vous supprimer ?",
            [
                f"Uniquement pour {MOIS[mois_ch-1]} {ANNEE}",
                f"Pour tous les mois de {ANNEE}",
                "Supprimer complètement la charge"
            ],
            key="del_opt"
        )
        
        if check_last_in_category(ch.get("categorie"), data["charges"], ch.get("id")):
            st.warning(f"⚠️ C'est la dernière charge de la catégorie '{ch.get('categorie')}'. Elle sera vide après suppression.")
        
        d1, d2, _ = st.columns([1, 1, 2])
        with d1:
            if st.button("🗑️ Confirmer la suppression", type="primary", key="confirm_del"):
                if "Uniquement" in del_opt:
                    delete_charge_for_months(ch.get("id"), [mois_ch], ANNEE)
                    st.success(f"Supprimé pour {MOIS[mois_ch-1]}")
                elif "tous les mois" in del_opt:
                    delete_charge_for_months(ch.get("id"), list(range(1,13)), ANNEE)
                    st.success("Supprimé pour tous les mois")
                else:
                    delete_charge_for_months(ch.get("id"), [], ANNEE, True)
                    st.success("Charge supprimée définitivement")
                st.session_state.delete_info = None
                refresh()
        with d2:
            if st.button("❌ Annuler", key="cancel_del"):
                st.session_state.delete_info = None
                st.rerun()
        
        st.divider()
    
    # === LISTE DES CHARGES ===
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
            # Header
            hc1, hc2, hc3, hc4, hc5 = st.columns([3, 1.5, 1.5, 1, 1])
            hc1.write("**Charge**")
            hc2.write("**Lionel €**")
            hc3.write("**Ophélie €**")
            hc4.write("**Total**")
            hc5.write("**Actions**")
            
            for ch in charges_cat:
                m = next((x for x in data["charges_m"] if x.get("charge_id") == ch.get("id") and x.get("mois") == mois_ch), {"lionel": 0, "ophelie": 0, "id": None})
                
                c1, c2, c3, c4, c5 = st.columns([3, 1.5, 1.5, 1, 1])
                c1.write(ch.get('description', ''))
                nl = c2.number_input("L", value=float(m.get("lionel", 0)), step=10.0, key=f"l_{ch.get('id')}", label_visibility="collapsed")
                no = c3.number_input("O", value=float(m.get("ophelie", 0)), step=10.0, key=f"o_{ch.get('id')}", label_visibility="collapsed")
                c4.write(f"**{fmt(nl + no)}**")
                
                with c5:
                    sc, dc = st.columns(2)
                    if sc.button("💾", key=f"s_{ch.get('id')}", help="Sauvegarder"):
                        save_charge_montant(ch.get("id"), mois_ch, ANNEE, nl, no, m.get("id"))
                        st.toast("Sauvegardé ✅")
                        refresh()
                    if dc.button("🗑️", key=f"d_{ch.get('id')}", help="Supprimer"):
                        st.session_state.delete_info = {"charge": ch}
                        st.rerun()
    
    st.divider()
    st.subheader(f"Total charges : {fmt(total_gen)}")

# === TAB 4: ÉPARGNE ===
with tabs[3]:
    st.subheader("🏦 Épargne mensuelle")
    
    mois_ep = st.selectbox("Mois", range(1,13), format_func=lambda x: MOIS[x-1], index=mois_actuel-1, key="ep_mois")
    
    with st.expander("➕ Ajouter un nouveau type d'épargne"):
        e1, e2, e3 = st.columns(3)
        nt = e1.text_input("Type (ex: PEA, LDD)")
        nb = e2.text_input("Bénéficiaire")
        no_obj = e3.number_input("Objectif annuel €", min_value=0.0, step=100.0)
        
        if st.button("✅ Ajouter", type="primary", key="add_ep"):
            if nt and nb:
                eid = save_new_epargne(nt, nb)
                if eid and no_obj > 0:
                    save_objectif(f"{nt} {nb}", no_obj)
                st.success("Type d'épargne ajouté !")
                refresh()
            else:
                st.warning("Remplir type et bénéficiaire")
    
    st.divider()
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.write("**💰 Montants mensuels**")
        total_ep_mois = 0
        
        for ep in data["epargne"]:
            m = next((x for x in data["epargne_m"] if x.get("epargne_id") == ep.get("id") and x.get("mois") == mois_ep), {"montant": 0, "id": None})
            total_ep_mois += m.get("montant", 0)
            
            c1, c2, c3, c4 = st.columns([3, 1.5, 0.5, 0.5])
            c1.write(f"{ep.get('type')} — {ep.get('beneficiaire')}")
            val = c2.number_input("€", value=float(m.get("montant", 0)), step=50.0, key=f"ep_{ep.get('id')}", label_visibility="collapsed")
            if c3.button("💾", key=f"sep_{ep.get('id')}"):
                save_epargne_montant(ep.get("id"), mois_ep, ANNEE, val, m.get("id"))
                st.toast("Sauvegardé ✅")
                refresh()
            if c4.button("🗑️", key=f"dep_{ep.get('id')}"):
                delete_epargne(ep.get("id"))
                st.toast("Supprimé")
                refresh()
        
        st.info(f"**Total: {fmt(total_ep_mois)}**")
    
    with col2:
        st.write("**🎯 Objectifs annuels**")
        
        for ep in data["epargne"]:
            key = f"{ep.get('type')} {ep.get('beneficiaire')}"
            obj = data["objectifs"].get(key, {})
            obj_val = obj.get("objectif", 0) if isinstance(obj, dict) else 0
            obj_id = obj.get("id") if isinstance(obj, dict) else None
            
            c1, c2, c3 = st.columns([3, 1.5, 0.5])
            c1.write(key)
            nobj = c2.number_input("Obj €", value=float(obj_val), step=100.0, key=f"obj_{ep.get('id')}", label_visibility="collapsed")
            if c3.button("💾", key=f"sobj_{ep.get('id')}"):
                save_objectif(key, nobj, obj_id)
                st.toast("Objectif sauvegardé ✅")
                refresh()

# === TAB 5: PARAMÈTRES ===
with tabs[4]:
    st.subheader("⚙️ Paramètres")
    
    c1, c2 = st.columns(2)
    
    with c1:
        st.write("**👥 Utilisateurs autorisés**")
        users = data["config"].get("authorized_users", "")
        new_users = st.text_area("Emails (séparés par des virgules)", value=users, height=100)
        
        if st.button("✅ Sauvegarder", type="primary"):
            save_config("authorized_users", new_users, data["config"].get("_record_ids", {}).get("authorized_users"))
            st.success("Sauvegardé !")
            refresh()
    
    with c2:
        st.write("**ℹ️ Informations**")
        st.write(f"**Email:** {user.get('email', '') if user else 'N/A'}")
        st.write(f"**Année:** {ANNEE}")
        st.write(f"**Mois actuel:** {MOIS[mois_actuel-1]}")
        st.write(f"**Catégories:** {len(st.session_state.categories)}")
        st.write(f"**Charges:** {len(data['charges'])}")
        st.write(f"**Types d'épargne:** {len(data['epargne'])}")

# Footer
st.divider()
st.caption("💰 Budget Famille TCHAMFONG • Streamlit + Airtable")
