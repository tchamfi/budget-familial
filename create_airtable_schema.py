"""
create_airtable_schema.py — Crée automatiquement la structure de la base Airtable

PRÉREQUIS:
1. Créer une base Airtable VIDE manuellement (juste le nom)
2. Récupérer le Base ID (dans l'URL: airtable.com/appXXXXXXXX)
3. Créer un Personal Access Token avec les scopes:
   - data.records:read
   - data.records:write
   - schema.bases:read
   - schema.bases:write  <-- Important pour créer des tables!

USAGE:
export AIRTABLE_TOKEN="pat..."
export AIRTABLE_BASE_ID="app..."
python create_airtable_schema.py
"""

import os
import requests
import time
import json

# Configuration
API_URL = "https://api.airtable.com/v0"
META_URL = "https://api.airtable.com/v0/meta/bases"
BASE_ID = os.getenv("AIRTABLE_BASE_ID", "")
TOKEN = os.getenv("AIRTABLE_TOKEN", "")

def headers():
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }

def create_table(name: str, fields: list, description: str = "") -> dict:
    """
    Crée une table avec ses champs via l'API Metadata
    
    Docs: https://airtable.com/developers/web/api/create-table
    """
    url = f"{META_URL}/{BASE_ID}/tables"
    
    payload = {
        "name": name,
        "description": description,
        "fields": fields
    }
    
    try:
        resp = requests.post(url, headers=headers(), json=payload, timeout=30)
        
        if resp.status_code == 200:
            data = resp.json()
            print(f"  ✅ Table '{name}' créée avec succès!")
            return data
        elif resp.status_code == 422:
            print(f"  ⚠️  Table '{name}' existe peut-être déjà")
            print(f"      Détails: {resp.json().get('error', {}).get('message', '')}")
            return None
        else:
            print(f"  ❌ Erreur {resp.status_code} pour '{name}'")
            print(f"      Détails: {resp.text[:300]}")
            return None
            
    except Exception as e:
        print(f"  ❌ Exception: {e}")
        return None

def create_all_tables():
    """Crée toutes les tables du schéma Budget Familial"""
    
    print("=" * 70)
    print("CRÉATION DU SCHÉMA AIRTABLE - BUDGET FAMILIAL 2026")
    print("=" * 70)
    
    if not BASE_ID or not TOKEN:
        print("""
❌ Variables d'environnement manquantes!

Configurer:
  export AIRTABLE_TOKEN="pat..."
  export AIRTABLE_BASE_ID="app..."

Pour obtenir le token:
1. Va sur https://airtable.com/create/tokens
2. Crée un token avec les scopes:
   - data.records:read
   - data.records:write
   - schema.bases:read
   - schema.bases:write  ← OBLIGATOIRE pour créer des tables
3. Sélectionne ta base dans "Access"
""")
        return
    
    print(f"\n📦 Base ID: {BASE_ID}")
    print(f"🔑 Token: {TOKEN[:20]}...")
    
    tables_created = {}
    
    # ========== TABLE: Config ==========
    print("\n📋 1/7 Création table Config...")
    config_result = create_table(
        name="Config",
        description="Configuration de l'application",
        fields=[
            {
                "name": "cle",
                "type": "singleLineText",
                "description": "Clé de configuration"
            },
            {
                "name": "valeur",
                "type": "multilineText",
                "description": "Valeur de la configuration"
            }
        ]
    )
    if config_result:
        tables_created["Config"] = config_result.get("id")
    time.sleep(0.5)
    
    # ========== TABLE: Revenus ==========
    print("\n💵 2/7 Création table Revenus...")
    revenus_result = create_table(
        name="Revenus",
        description="Revenus mensuels du foyer",
        fields=[
            {
                "name": "mois",
                "type": "number",
                "options": {"precision": 0},
                "description": "Mois (1-12)"
            },
            {
                "name": "annee",
                "type": "number",
                "options": {"precision": 0},
                "description": "Année"
            },
            {
                "name": "lionel",
                "type": "currency",
                "options": {"precision": 2, "symbol": "€"},
                "description": "Revenus Lionel"
            },
            {
                "name": "ophelie",
                "type": "currency",
                "options": {"precision": 2, "symbol": "€"},
                "description": "Revenus Ophélie"
            }
        ]
    )
    if revenus_result:
        tables_created["Revenus"] = revenus_result.get("id")
    time.sleep(0.5)
    
    # ========== TABLE: Charges ==========
    print("\n💸 3/7 Création table Charges...")
    charges_result = create_table(
        name="Charges",
        description="Définition des postes de charges",
        fields=[
            {
                "name": "categorie",
                "type": "singleSelect",
                "options": {
                    "choices": [
                        {"name": "LOGEMENT", "color": "blueLight2"},
                        {"name": "MAISON", "color": "greenLight2"},
                        {"name": "VOITURE & TRANSPORT", "color": "yellowLight2"},
                        {"name": "ABONNEMENTS", "color": "purpleLight2"},
                        {"name": "SPORT & SANTÉ", "color": "pinkLight2"},
                        {"name": "ENFANTS", "color": "cyanLight2"},
                        {"name": "ALIMENTAIRE", "color": "orangeLight2"},
                        {"name": "LOISIRS", "color": "grayLight2"},
                        {"name": "DEPENSES EXCEPTIONNELLES", "color": "redLight2"}
                    ]
                },
                "description": "Catégorie de la charge"
            },
            {
                "name": "description",
                "type": "singleLineText",
                "description": "Description de la charge"
            },
            {
                "name": "compte",
                "type": "singleSelect",
                "options": {
                    "choices": [
                        {"name": "Commun", "color": "blueLight2"},
                        {"name": "Perso", "color": "yellowLight2"}
                    ]
                },
                "description": "Type de compte"
            },
            {
                "name": "ordre",
                "type": "number",
                "options": {"precision": 0},
                "description": "Ordre d'affichage"
            }
        ]
    )
    if charges_result:
        tables_created["Charges"] = charges_result.get("id")
    time.sleep(0.5)
    
    # ========== TABLE: Charges_Montants ==========
    print("\n💸 4/7 Création table Charges_Montants...")
    
    # Pour le lien, on a besoin de l'ID de la table Charges
    charges_montants_fields = [
        {
            "name": "mois",
            "type": "number",
            "options": {"precision": 0},
            "description": "Mois (1-12)"
        },
        {
            "name": "annee",
            "type": "number",
            "options": {"precision": 0},
            "description": "Année"
        },
        {
            "name": "lionel",
            "type": "currency",
            "options": {"precision": 2, "symbol": "€"},
            "description": "Montant Lionel"
        },
        {
            "name": "ophelie",
            "type": "currency",
            "options": {"precision": 2, "symbol": "€"},
            "description": "Montant Ophélie"
        }
    ]
    
    # Ajouter le lien si la table Charges existe
    if tables_created.get("Charges"):
        charges_montants_fields.insert(0, {
            "name": "charge_id",
            "type": "multipleRecordLinks",
            "options": {
                "linkedTableId": tables_created["Charges"]
            },
            "description": "Lien vers la charge"
        })
    
    charges_montants_result = create_table(
        name="Charges_Montants",
        description="Montants mensuels des charges",
        fields=charges_montants_fields
    )
    if charges_montants_result:
        tables_created["Charges_Montants"] = charges_montants_result.get("id")
    time.sleep(0.5)
    
    # ========== TABLE: Epargne ==========
    print("\n🏦 5/7 Création table Epargne...")
    epargne_result = create_table(
        name="Epargne",
        description="Types d'épargne",
        fields=[
            {
                "name": "type",
                "type": "singleSelect",
                "options": {
                    "choices": [
                        {"name": "LDD", "color": "blueLight2"},
                        {"name": "PEA", "color": "greenLight2"},
                        {"name": "Assurance Vie", "color": "purpleLight2"},
                        {"name": "Livret A", "color": "cyanLight2"}
                    ]
                },
                "description": "Type d'épargne"
            },
            {
                "name": "beneficiaire",
                "type": "singleSelect",
                "options": {
                    "choices": [
                        {"name": "Lionel", "color": "blueLight2"},
                        {"name": "Ophélie", "color": "pinkLight2"},
                        {"name": "Noémie", "color": "cyanLight2"},
                        {"name": "Alizée", "color": "purpleLight2"}
                    ]
                },
                "description": "Bénéficiaire"
            },
            {
                "name": "ordre",
                "type": "number",
                "options": {"precision": 0},
                "description": "Ordre d'affichage"
            }
        ]
    )
    if epargne_result:
        tables_created["Epargne"] = epargne_result.get("id")
    time.sleep(0.5)
    
    # ========== TABLE: Epargne_Montants ==========
    print("\n🏦 6/7 Création table Epargne_Montants...")
    
    epargne_montants_fields = [
        {
            "name": "mois",
            "type": "number",
            "options": {"precision": 0},
            "description": "Mois (1-12)"
        },
        {
            "name": "annee",
            "type": "number",
            "options": {"precision": 0},
            "description": "Année"
        },
        {
            "name": "montant",
            "type": "currency",
            "options": {"precision": 2, "symbol": "€"},
            "description": "Montant épargné"
        }
    ]
    
    if tables_created.get("Epargne"):
        epargne_montants_fields.insert(0, {
            "name": "epargne_id",
            "type": "multipleRecordLinks",
            "options": {
                "linkedTableId": tables_created["Epargne"]
            },
            "description": "Lien vers le type d'épargne"
        })
    
    epargne_montants_result = create_table(
        name="Epargne_Montants",
        description="Montants mensuels d'épargne",
        fields=epargne_montants_fields
    )
    if epargne_montants_result:
        tables_created["Epargne_Montants"] = epargne_montants_result.get("id")
    time.sleep(0.5)
    
    # ========== TABLE: Objectifs ==========
    print("\n🎯 7/7 Création table Objectifs...")
    objectifs_result = create_table(
        name="Objectifs",
        description="Objectifs d'épargne annuels",
        fields=[
            {
                "name": "type",
                "type": "singleLineText",
                "description": "Type d'épargne + bénéficiaire"
            },
            {
                "name": "objectif_annuel",
                "type": "currency",
                "options": {"precision": 2, "symbol": "€"},
                "description": "Objectif annuel"
            }
        ]
    )
    if objectifs_result:
        tables_created["Objectifs"] = objectifs_result.get("id")
    
    # ========== RÉSUMÉ ==========
    print("\n" + "=" * 70)
    print("📊 RÉSUMÉ DE LA CRÉATION")
    print("=" * 70)
    
    success_count = sum(1 for v in tables_created.values() if v)
    total = 7
    
    print(f"\n✅ Tables créées: {success_count}/{total}")
    
    for table_name, table_id in tables_created.items():
        status = "✅" if table_id else "❌"
        print(f"   {status} {table_name}: {table_id or 'Non créée'}")
    
    if success_count == total:
        print("""
🎉 TOUTES LES TABLES ONT ÉTÉ CRÉÉES!

Prochaine étape:
  python init_airtable.py

Cela va remplir les tables avec les données de ton fichier Excel.
""")
    else:
        print("""
⚠️  Certaines tables n'ont pas été créées.

Causes possibles:
1. Le token n'a pas le scope 'schema.bases:write'
2. Les tables existent déjà
3. Erreur de quota API

Solution: Vérifier/recréer le token sur https://airtable.com/create/tokens
""")

if __name__ == "__main__":
    create_all_tables()
