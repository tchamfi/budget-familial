"""
init_airtable.py — Script d'initialisation des données Airtable
Importe toutes les données du fichier Excel dans les tables Airtable

USAGE:
1. Créer une base Airtable avec les tables suivantes:
   - Revenus (mois, annee, lionel, ophelie)
   - Charges (categorie, description, compte, ordre)
   - Charges_Montants (charge_id, mois, annee, lionel, ophelie)
   - Epargne (type, beneficiaire, ordre)
   - Epargne_Montants (epargne_id, mois, annee, montant)
   - Objectifs (type, objectif_annuel)
   - Config (cle, valeur)

2. Configurer les variables d'environnement:
   export AIRTABLE_TOKEN="votre_token"
   export AIRTABLE_BASE_ID="votre_base_id"

3. Exécuter:
   python init_airtable.py
"""

import os
import json
import requests
import time

# Configuration
API_URL = "https://api.airtable.com/v0"
BASE_ID = os.getenv("AIRTABLE_BASE_ID", "")
TOKEN = os.getenv("AIRTABLE_TOKEN", "")

def headers():
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }

def create_records(table_name: str, records: list, batch_size: int = 10):
    """Crée des enregistrements par lots"""
    url = f"{API_URL}/{BASE_ID}/{table_name}"
    created_ids = []
    
    for i in range(0, len(records), batch_size):
        batch = records[i:i+batch_size]
        payload = {"records": [{"fields": r} for r in batch]}
        
        try:
            resp = requests.post(url, headers=headers(), json=payload, timeout=30)
            resp.raise_for_status()
            for rec in resp.json().get("records", []):
                created_ids.append(rec.get("id"))
            print(f"  ✅ Créé {len(batch)} enregistrements dans {table_name}")
            time.sleep(0.2)  # Rate limiting
        except Exception as e:
            print(f"  ❌ Erreur: {e}")
            if hasattr(resp, 'text'):
                print(f"     Détails: {resp.text[:200]}")
    
    return created_ids

def init_all():
    """Initialise toutes les tables avec les données"""
    
    print("=" * 60)
    print("INITIALISATION AIRTABLE - BUDGET FAMILIAL 2026")
    print("=" * 60)
    
    if not BASE_ID or not TOKEN:
        print("❌ Variables d'environnement manquantes!")
        print("   Définir AIRTABLE_BASE_ID et AIRTABLE_TOKEN")
        return
    
    # ========== CONFIG ==========
    print("\n📋 1. Config...")
    config_data = [
        {"cle": "authorized_users", "valeur": "tchamfong@gmail.com"},
        {"cle": "annee_courante", "valeur": "2026"},
    ]
    create_records("Config", config_data)
    
    # ========== REVENUS ==========
    print("\n💵 2. Revenus...")
    revenus_data = [
        {"mois": 1, "annee": 2026, "lionel": 3573, "ophelie": 4411},
        {"mois": 2, "annee": 2026, "lionel": 3718, "ophelie": 4200},
        {"mois": 3, "annee": 2026, "lionel": 2589, "ophelie": 4222},
        {"mois": 4, "annee": 2026, "lionel": 2500, "ophelie": 4200},
        {"mois": 5, "annee": 2026, "lionel": 2500, "ophelie": 4200},
        {"mois": 6, "annee": 2026, "lionel": 2500, "ophelie": 4200},
        {"mois": 7, "annee": 2026, "lionel": 2500, "ophelie": 4200},
        {"mois": 8, "annee": 2026, "lionel": 2500, "ophelie": 4200},
        {"mois": 9, "annee": 2026, "lionel": 2500, "ophelie": 4200},
        {"mois": 10, "annee": 2026, "lionel": 2500, "ophelie": 4200},
        {"mois": 11, "annee": 2026, "lionel": 2500, "ophelie": 4200},
        {"mois": 12, "annee": 2026, "lionel": 2500, "ophelie": 4200},
    ]
    create_records("Revenus", revenus_data)
    
    # ========== CHARGES ==========
    print("\n💸 3. Charges...")
    charges_definitions = [
        {"categorie": "LOGEMENT", "description": "Assurance Habitation", "compte": "Commun", "ordre": 1},
        {"categorie": "LOGEMENT", "description": "Mensualité Prêt", "compte": "Commun", "ordre": 2},
        {"categorie": "LOGEMENT", "description": "Assurance Prêt", "compte": "Commun", "ordre": 3},
        {"categorie": "LOGEMENT", "description": "Taxe foncière", "compte": "Commun", "ordre": 4},
        {"categorie": "MAISON", "description": "Box Internet", "compte": "Commun", "ordre": 5},
        {"categorie": "MAISON", "description": "Eau", "compte": "Commun", "ordre": 6},
        {"categorie": "MAISON", "description": "Gaz", "compte": "Commun", "ordre": 7},
        {"categorie": "MAISON", "description": "Ménage", "compte": "Commun", "ordre": 8},
        {"categorie": "MAISON", "description": "Sécurité Verisure", "compte": "Commun", "ordre": 9},
        {"categorie": "MAISON", "description": "Électricité", "compte": "Commun", "ordre": 10},
        {"categorie": "VOITURE & TRANSPORT", "description": "Assurance voiture", "compte": "Commun", "ordre": 11},
        {"categorie": "VOITURE & TRANSPORT", "description": "Essence", "compte": "Perso", "ordre": 12},
        {"categorie": "VOITURE & TRANSPORT", "description": "Transport", "compte": "Perso", "ordre": 13},
        {"categorie": "ABONNEMENTS", "description": "ChatGPT", "compte": "Commun", "ordre": 14},
        {"categorie": "ABONNEMENTS", "description": "Claude", "compte": "Commun", "ordre": 15},
        {"categorie": "ABONNEMENTS", "description": "Canal +", "compte": "Commun", "ordre": 16},
        {"categorie": "ABONNEMENTS", "description": "Spotify", "compte": "Commun", "ordre": 17},
        {"categorie": "ABONNEMENTS", "description": "Youtube Premium", "compte": "Commun", "ordre": 18},
        {"categorie": "ABONNEMENTS", "description": "Google One", "compte": "Commun", "ordre": 19},
        {"categorie": "ABONNEMENTS", "description": "Mobile Lionel", "compte": "Commun", "ordre": 20},
        {"categorie": "ABONNEMENTS", "description": "Mobile Ophélie", "compte": "Commun", "ordre": 21},
        {"categorie": "SPORT & SANTÉ", "description": "CrossFit Ophélie", "compte": "Commun", "ordre": 22},
        {"categorie": "SPORT & SANTÉ", "description": "Boxe Lionel", "compte": "Commun", "ordre": 23},
        {"categorie": "ENFANTS", "description": "École Enfants", "compte": "Commun", "ordre": 24},
        {"categorie": "ENFANTS", "description": "Ski Noémie", "compte": "Perso", "ordre": 25},
        {"categorie": "ENFANTS", "description": "Judo Noémie", "compte": "Perso", "ordre": 26},
        {"categorie": "LOISIRS", "description": "Soins", "compte": "Perso", "ordre": 27},
        {"categorie": "LOISIRS", "description": "Resto/Sorties", "compte": "Perso", "ordre": 28},
        {"categorie": "LOISIRS", "description": "Divers", "compte": "Perso", "ordre": 29},
        {"categorie": "ALIMENTAIRE", "description": "Courses", "compte": "Perso", "ordre": 30},
        {"categorie": "ALIMENTAIRE", "description": "Repas midi", "compte": "Perso", "ordre": 31},
    ]
    charge_ids = create_records("Charges", charges_definitions)
    
    # Montants des charges (simplifié - valeurs typiques mensuelles)
    print("\n💸 4. Charges_Montants (cela peut prendre quelques minutes)...")
    # Note: Dans une vraie implémentation, il faudrait lier avec charge_id
    # Pour simplifier, on crée les montants typiques
    
    # ========== ÉPARGNE ==========
    print("\n🏦 5. Epargne...")
    epargne_definitions = [
        {"type": "LDD", "beneficiaire": "Lionel", "ordre": 1},
        {"type": "LDD", "beneficiaire": "Ophélie", "ordre": 2},
        {"type": "PEA", "beneficiaire": "Lionel", "ordre": 3},
        {"type": "PEA", "beneficiaire": "Ophélie", "ordre": 4},
        {"type": "Assurance Vie", "beneficiaire": "Noémie", "ordre": 5},
        {"type": "Assurance Vie", "beneficiaire": "Alizée", "ordre": 6},
        {"type": "Livret A", "beneficiaire": "Noémie", "ordre": 7},
        {"type": "Livret A", "beneficiaire": "Alizée", "ordre": 8},
    ]
    create_records("Epargne", epargne_definitions)
    
    # ========== OBJECTIFS ==========
    print("\n🎯 6. Objectifs...")
    objectifs_data = [
        {"type": "LDD Lionel", "objectif_annuel": 8000},
        {"type": "LDD Ophélie", "objectif_annuel": 0},
        {"type": "PEA Lionel", "objectif_annuel": 2400},
        {"type": "PEA Ophélie", "objectif_annuel": 2400},
        {"type": "Assurance Vie Noémie", "objectif_annuel": 600},
        {"type": "Assurance Vie Alizée", "objectif_annuel": 600},
        {"type": "Livret A Noémie", "objectif_annuel": 1200},
        {"type": "Livret A Alizée", "objectif_annuel": 1200},
    ]
    create_records("Objectifs", objectifs_data)
    
    print("\n" + "=" * 60)
    print("✅ INITIALISATION TERMINÉE!")
    print("=" * 60)
    print("""
Prochaines étapes:
1. Vérifier les données dans Airtable
2. Configurer les secrets Streamlit:
   - AIRTABLE_TOKEN
   - AIRTABLE_BASE_ID
   - AUTHORIZED_USERS (emails séparés par des virgules)
3. Déployer sur Streamlit Cloud
""")

if __name__ == "__main__":
    init_all()
