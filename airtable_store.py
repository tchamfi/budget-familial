"""
airtable_store.py — Gestion de la persistance Airtable pour Budget Familial
Tables: Revenus, Charges, Epargne, Objectifs, Config
"""

import os
import json
import requests
import streamlit as st
from typing import Dict, List, Optional, Any

# Configuration Airtable
API_URL = "https://api.airtable.com/v0"

def get_base_id():
    """Récupère le Base ID depuis les secrets ou variables d'environnement"""
    try:
        return st.secrets["AIRTABLE_BASE_ID"]
    except:
        return os.getenv("AIRTABLE_BASE_ID", "")

def get_token():
    """Récupère le token Airtable"""
    try:
        return st.secrets["AIRTABLE_TOKEN"]
    except:
        return os.getenv("AIRTABLE_TOKEN", "")

def headers():
    """Headers pour les requêtes API"""
    return {
        "Authorization": f"Bearer {get_token()}",
        "Content-Type": "application/json"
    }

# ================================================================
# GENERIC CRUD OPERATIONS
# ================================================================

def _fetch_all(table_name: str) -> List[Dict]:
    """Récupère tous les enregistrements d'une table"""
    base_id = get_base_id()
    url = f"{API_URL}/{base_id}/{table_name}"
    all_records = []
    offset = None
    
    try:
        while True:
            params = {"pageSize": 100}
            if offset:
                params["offset"] = offset
            
            resp = requests.get(url, headers=headers(), params=params, timeout=10)
            resp.raise_for_status()
            data = resp.json()
            
            all_records.extend(data.get("records", []))
            offset = data.get("offset")
            
            if not offset:
                break
        
        return all_records
    except Exception as e:
        print(f"[airtable] _fetch_all error for {table_name}: {e}")
        return []

def _create_record(table_name: str, fields: Dict) -> Optional[str]:
    """Crée un enregistrement et retourne son ID"""
    base_id = get_base_id()
    url = f"{API_URL}/{base_id}/{table_name}"
    
    try:
        resp = requests.post(
            url, 
            headers=headers(), 
            json={"fields": fields},
            timeout=10
        )
        resp.raise_for_status()
        return resp.json().get("id")
    except Exception as e:
        print(f"[airtable] _create_record error: {e}")
        return None

def _update_record(table_name: str, record_id: str, fields: Dict) -> bool:
    """Met à jour un enregistrement"""
    base_id = get_base_id()
    url = f"{API_URL}/{base_id}/{table_name}/{record_id}"
    
    try:
        resp = requests.patch(
            url,
            headers=headers(),
            json={"fields": fields},
            timeout=10
        )
        resp.raise_for_status()
        return True
    except Exception as e:
        print(f"[airtable] _update_record error: {e}")
        return False

def _delete_record(table_name: str, record_id: str) -> bool:
    """Supprime un enregistrement"""
    base_id = get_base_id()
    url = f"{API_URL}/{base_id}/{table_name}/{record_id}"
    
    try:
        resp = requests.delete(url, headers=headers(), timeout=10)
        resp.raise_for_status()
        return True
    except Exception as e:
        print(f"[airtable] _delete_record error: {e}")
        return False

def _batch_create(table_name: str, records: List[Dict]) -> List[str]:
    """Crée plusieurs enregistrements (max 10 par requête)"""
    base_id = get_base_id()
    url = f"{API_URL}/{base_id}/{table_name}"
    created_ids = []
    
    # Airtable limite à 10 records par requête
    for i in range(0, len(records), 10):
        batch = records[i:i+10]
        payload = {"records": [{"fields": r} for r in batch]}
        
        try:
            resp = requests.post(url, headers=headers(), json=payload, timeout=30)
            resp.raise_for_status()
            for rec in resp.json().get("records", []):
                created_ids.append(rec.get("id"))
        except Exception as e:
            print(f"[airtable] _batch_create error: {e}")
    
    return created_ids

# ================================================================
# REVENUS
# ================================================================

def load_revenus(annee: int = 2026) -> List[Dict]:
    """Charge les revenus pour une année"""
    records = _fetch_all("Revenus")
    revenus = []
    for rec in records:
        f = rec.get("fields", {})
        if f.get("annee") == annee:
            revenus.append({
                "id": rec["id"],
                "mois": f.get("mois"),
                "annee": f.get("annee"),
                "lionel": f.get("lionel", 0),
                "ophelie": f.get("ophelie", 0)
            })
    return sorted(revenus, key=lambda x: x.get("mois", 0))

def save_revenu(mois: int, annee: int, lionel: float, ophelie: float, record_id: str = None) -> bool:
    """Sauvegarde ou met à jour un revenu"""
    fields = {
        "mois": mois,
        "annee": annee,
        "lionel": lionel,
        "ophelie": ophelie
    }
    
    if record_id:
        return _update_record("Revenus", record_id, fields)
    else:
        return _create_record("Revenus", fields) is not None

# ================================================================
# CHARGES
# ================================================================

def load_charges() -> List[Dict]:
    """Charge toutes les charges (définitions)"""
    records = _fetch_all("Charges")
    charges = []
    for rec in records:
        f = rec.get("fields", {})
        charges.append({
            "id": rec["id"],
            "categorie": f.get("categorie", ""),
            "description": f.get("description", ""),
            "compte": f.get("compte", "Commun"),
            "ordre": f.get("ordre", 999)
        })
    return sorted(charges, key=lambda x: (x.get("ordre", 999), x.get("categorie", "")))

def load_charges_montants(annee: int = 2026) -> List[Dict]:
    """Charge les montants des charges pour une année"""
    records = _fetch_all("Charges_Montants")
    montants = []
    for rec in records:
        f = rec.get("fields", {})
        if f.get("annee") == annee:
            montants.append({
                "id": rec["id"],
                "charge_id": f.get("charge_id", [""])[0] if isinstance(f.get("charge_id"), list) else f.get("charge_id"),
                "mois": f.get("mois"),
                "annee": f.get("annee"),
                "lionel": f.get("lionel", 0),
                "ophelie": f.get("ophelie", 0)
            })
    return montants

def save_charge(categorie: str, description: str, compte: str, ordre: int = 999, record_id: str = None) -> Optional[str]:
    """Crée ou met à jour une charge"""
    fields = {
        "categorie": categorie,
        "description": description,
        "compte": compte,
        "ordre": ordre
    }
    
    if record_id:
        return record_id if _update_record("Charges", record_id, fields) else None
    else:
        return _create_record("Charges", fields)

def save_charge_montant(charge_id: str, mois: int, annee: int, lionel: float, ophelie: float, record_id: str = None) -> bool:
    """Sauvegarde un montant de charge"""
    fields = {
        "charge_id": [charge_id],
        "mois": mois,
        "annee": annee,
        "lionel": lionel,
        "ophelie": ophelie
    }
    
    if record_id:
        return _update_record("Charges_Montants", record_id, fields)
    else:
        return _create_record("Charges_Montants", fields) is not None

def delete_charge(charge_id: str) -> bool:
    """Supprime une charge et ses montants associés"""
    # D'abord supprimer les montants
    montants = load_charges_montants()
    for m in montants:
        if m.get("charge_id") == charge_id:
            _delete_record("Charges_Montants", m["id"])
    
    # Puis supprimer la charge
    return _delete_record("Charges", charge_id)

# ================================================================
# ÉPARGNE
# ================================================================

def load_epargne() -> List[Dict]:
    """Charge les types d'épargne"""
    records = _fetch_all("Epargne")
    epargne = []
    for rec in records:
        f = rec.get("fields", {})
        epargne.append({
            "id": rec["id"],
            "type": f.get("type", ""),
            "beneficiaire": f.get("beneficiaire", ""),
            "ordre": f.get("ordre", 999)
        })
    return sorted(epargne, key=lambda x: x.get("ordre", 999))

def load_epargne_montants(annee: int = 2026) -> List[Dict]:
    """Charge les montants d'épargne pour une année"""
    records = _fetch_all("Epargne_Montants")
    montants = []
    for rec in records:
        f = rec.get("fields", {})
        if f.get("annee") == annee:
            montants.append({
                "id": rec["id"],
                "epargne_id": f.get("epargne_id", [""])[0] if isinstance(f.get("epargne_id"), list) else f.get("epargne_id"),
                "mois": f.get("mois"),
                "annee": f.get("annee"),
                "montant": f.get("montant", 0)
            })
    return montants

def save_epargne_montant(epargne_id: str, mois: int, annee: int, montant: float, record_id: str = None) -> bool:
    """Sauvegarde un montant d'épargne"""
    fields = {
        "epargne_id": [epargne_id],
        "mois": mois,
        "annee": annee,
        "montant": montant
    }
    
    if record_id:
        return _update_record("Epargne_Montants", record_id, fields)
    else:
        return _create_record("Epargne_Montants", fields) is not None

# ================================================================
# OBJECTIFS
# ================================================================

def load_objectifs() -> Dict[str, float]:
    """Charge les objectifs d'épargne"""
    records = _fetch_all("Objectifs")
    objectifs = {}
    for rec in records:
        f = rec.get("fields", {})
        objectifs[f.get("type", "")] = {
            "id": rec["id"],
            "objectif": f.get("objectif_annuel", 0)
        }
    return objectifs

def save_objectif(type_epargne: str, objectif: float, record_id: str = None) -> bool:
    """Sauvegarde un objectif"""
    fields = {
        "type": type_epargne,
        "objectif_annuel": objectif
    }
    
    if record_id:
        return _update_record("Objectifs", record_id, fields)
    else:
        return _create_record("Objectifs", fields) is not None

# ================================================================
# CONFIG
# ================================================================

def load_config() -> Dict[str, Any]:
    """Charge la configuration"""
    records = _fetch_all("Config")
    config = {}
    config["_record_ids"] = {}
    
    for rec in records:
        f = rec.get("fields", {})
        key = f.get("cle", "")
        val = f.get("valeur", "")
        if key:
            config[key] = val
            config["_record_ids"][key] = rec["id"]
    
    return config

def save_config(key: str, value: str, record_id: str = None) -> bool:
    """Sauvegarde une config"""
    fields = {"cle": key, "valeur": value}
    
    if record_id:
        return _update_record("Config", record_id, fields)
    else:
        return _create_record("Config", fields) is not None

# ================================================================
# UTILISATEURS AUTORISÉS
# ================================================================

def load_authorized_users() -> List[str]:
    """Charge la liste des emails autorisés"""
    config = load_config()
    users_str = config.get("authorized_users", "")
    if users_str:
        return [u.strip().lower() for u in users_str.split(",") if u.strip()]
    return []

def is_user_authorized(email: str) -> bool:
    """Vérifie si un utilisateur est autorisé"""
    authorized = load_authorized_users()
    return email.lower() in authorized
