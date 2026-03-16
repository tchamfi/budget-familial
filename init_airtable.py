"""
init_airtable.py — Initialisation des données Budget Familial 2026
Données extraites du fichier Excel
"""

import requests
import os
import time

# === CONFIG ===
TOKEN = os.getenv("AIRTABLE_TOKEN", "pat0G9VzS4A0sUUV8.df04918e3a910359e0aaee183f927da447cf29e31deb2ee2cedd6814c9746cd9")
BASE_ID = os.getenv("AIRTABLE_BASE_ID", "appRdg7WeaRxPBxsj")
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}
BASE_URL = f"https://api.airtable.com/v0/{BASE_ID}"

def create_records(table: str, records: list) -> bool:
    """Crée des enregistrements par lots de 10"""
    url = f"{BASE_URL}/{table}"
    
    for i in range(0, len(records), 10):
        batch = records[i:i+10]
        data = {"records": [{"fields": r} for r in batch]}
        
        try:
            resp = requests.post(url, headers=HEADERS, json=data)
            if resp.status_code == 200:
                print(f"  ✅ Créé {len(batch)} enregistrements dans {table}")
            else:
                print(f"  ❌ Erreur: {resp.status_code} - {resp.text[:100]}")
                return False
            time.sleep(0.2)
        except Exception as e:
            print(f"  ❌ Exception: {e}")
            return False
    
    return True

print("=" * 60)
print("INITIALISATION AIRTABLE - BUDGET FAMILIAL 2026")
print("=" * 60)

# === 1. CONFIG ===
print("\n📋 1. Config...")
config_records = [
    {"cle": "authorized_users", "valeur": "tchamfong@gmail.com,ophelie.linde@gmail.com"},
    {"cle": "annee_defaut", "valeur": "2026"}
]
create_records("Config", config_records)

# === 2. REVENUS 2026 ===
print("\n💵 2. Revenus 2026...")
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

# === 3. CHARGES ===
print("\n💸 3. Charges...")
charges_data = [
    # LOGEMENT
    {"description": "Assurance Habitation", "categorie": "LOGEMENT", "compte": "Commun", "ordre": 1},
    {"description": "Mensualité Prêt", "categorie": "LOGEMENT", "compte": "Commun", "ordre": 2},
    {"description": "Assurance Prêt", "categorie": "LOGEMENT", "compte": "Commun", "ordre": 3},
    {"description": "Taxe foncière", "categorie": "LOGEMENT", "compte": "Commun", "ordre": 4},
    # MAISON
    {"description": "Box Internet", "categorie": "MAISON", "compte": "Commun", "ordre": 5},
    {"description": "Eau", "categorie": "MAISON", "compte": "Commun", "ordre": 6},
    {"description": "Gaz", "categorie": "MAISON", "compte": "Commun", "ordre": 7},
    {"description": "Ménage", "categorie": "MAISON", "compte": "Commun", "ordre": 8},
    {"description": "Sécurité Verisure", "categorie": "MAISON", "compte": "Commun", "ordre": 9},
    {"description": "Électricité", "categorie": "MAISON", "compte": "Commun", "ordre": 10},
    # VOITURE & TRANSPORT
    {"description": "Assurance voiture", "categorie": "VOITURE & TRANSPORT", "compte": "Commun", "ordre": 11},
    {"description": "Essence", "categorie": "VOITURE & TRANSPORT", "compte": "Perso", "ordre": 12},
    {"description": "Transport", "categorie": "VOITURE & TRANSPORT", "compte": "Perso", "ordre": 13},
    # ABONNEMENTS
    {"description": "ChatGPT", "categorie": "ABONNEMENTS", "compte": "Commun", "ordre": 14},
    {"description": "Claude", "categorie": "ABONNEMENTS", "compte": "Commun", "ordre": 15},
    {"description": "Canal+ (Netflix, Bein, HBO, Paramount)", "categorie": "ABONNEMENTS", "compte": "Commun", "ordre": 16},
    {"description": "Spotify", "categorie": "ABONNEMENTS", "compte": "Commun", "ordre": 17},
    {"description": "Youtube Premium", "categorie": "ABONNEMENTS", "compte": "Commun", "ordre": 18},
    {"description": "Stockage Google One", "categorie": "ABONNEMENTS", "compte": "Commun", "ordre": 19},
    {"description": "Mobile Lionel", "categorie": "ABONNEMENTS", "compte": "Commun", "ordre": 20},
    {"description": "Mobile Ophélie", "categorie": "ABONNEMENTS", "compte": "Commun", "ordre": 21},
    # SPORT & SANTÉ
    {"description": "CrossFit Ophélie", "categorie": "SPORT & SANTÉ", "compte": "Commun", "ordre": 22},
    {"description": "Boxe Lionel", "categorie": "SPORT & SANTÉ", "compte": "Commun", "ordre": 23},
    # ENFANTS
    {"description": "École Enfants", "categorie": "ENFANTS", "compte": "Commun", "ordre": 24},
    {"description": "Ski Noémie", "categorie": "ENFANTS", "compte": "Perso", "ordre": 25},
    {"description": "Judo Noémie", "categorie": "ENFANTS", "compte": "Perso", "ordre": 26},
    # DEPENSES EXCEPTIONNELLES
    {"description": "Course & Kdo Noel", "categorie": "DEPENSES EXCEPTIONNELLES", "compte": "Perso", "ordre": 27},
    # LOISIRS
    {"description": "Soins", "categorie": "LOISIRS", "compte": "Perso", "ordre": 28},
    {"description": "Resto/Sorties", "categorie": "LOISIRS", "compte": "Perso", "ordre": 29},
    {"description": "Divers", "categorie": "LOISIRS", "compte": "Perso", "ordre": 30},
    # ALIMENTAIRE
    {"description": "Courses", "categorie": "ALIMENTAIRE", "compte": "Perso", "ordre": 31},
    {"description": "Repas midi", "categorie": "ALIMENTAIRE", "compte": "Perso", "ordre": 32},
]
create_records("Charges", charges_data)

# === 4. CHARGES_MONTANTS ===
print("\n💸 4. Charges_Montants (cela peut prendre quelques minutes)...")

# D'abord récupérer les IDs des charges créées
time.sleep(1)
resp = requests.get(f"{BASE_URL}/Charges", headers=HEADERS)
charges_map = {}
if resp.status_code == 200:
    for rec in resp.json().get("records", []):
        desc = rec["fields"].get("description", "")
        charges_map[desc] = rec["id"]
    print(f"  📋 {len(charges_map)} charges trouvées")

# Données mensuelles par charge (Lionel, Ophélie) pour chaque mois
charges_montants_data = {
    "Assurance Habitation": [(49, 0)] * 12,
    "Mensualité Prêt": [(846, 846)] * 12,
    "Assurance Prêt": [(0, 55), (0, 55), (146, 55), (49, 55), (49, 55), (49, 55), (49, 55), (49, 55), (49, 55), (49, 55), (49, 55), (49, 0)],
    "Taxe foncière": [(172, 0)] * 12,
    "Box Internet": [(52, 0)] * 12,
    "Eau": [(0, 55)] * 12,
    "Gaz": [(0, 120)] * 12,
    "Ménage": [(124, 124)] * 12,
    "Sécurité Verisure": [(0, 50)] * 12,
    "Électricité": [(0, 130)] * 12,
    "Assurance voiture": [(0, 91)] * 12,
    "Essence": [(80, 0)] * 12,
    "Transport": [(91, 91)] * 12,
    "ChatGPT": [(22, 0)] * 12,
    "Claude": [(22, 0)] * 12,
    "Canal+ (Netflix, Bein, HBO, Paramount)": [(47, 0)] * 12,
    "Spotify": [(17, 0)] * 12,
    "Youtube Premium": [(13, 0)] * 12,
    "Stockage Google One": [(0, 0), (0, 0), (20, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0)],
    "Mobile Lionel": [(16, 0)] * 12,
    "Mobile Ophélie": [(9, 0)] * 12,
    "CrossFit Ophélie": [(0, 126)] * 12,
    "Boxe Lionel": [(109, 0)] * 12,
    "École Enfants": [(200, 214), (225, 225), (200, 214), (200, 214), (200, 214), (200, 214), (200, 214), (200, 214), (200, 214), (200, 214), (200, 214), (200, 214)],
    "Ski Noémie": [(100, 100), (100, 100), (100, 100), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0)],
    "Judo Noémie": [(85, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0)],
    "Course & Kdo Noel": [(0, 400), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0), (0, 0)],
    "Soins": [(0, 0), (30, 175), (30, 100), (30, 100), (30, 100), (30, 100), (30, 100), (30, 100), (30, 100), (30, 100), (30, 100), (30, 100)],
    "Resto/Sorties": [(0, 0), (50, 100), (50, 50), (50, 50), (50, 50), (50, 50), (50, 50), (50, 50), (50, 50), (50, 50), (50, 50), (50, 50)],
    "Divers": [(0, 0), (50, 50), (50, 50), (50, 50), (50, 50), (50, 50), (50, 50), (50, 50), (50, 50), (50, 50), (50, 50), (50, 50)],
    "Courses": [(100, 600)] * 12,
    "Repas midi": [(150, 0), (75, 0), (150, 0), (150, 0), (150, 0), (150, 0), (150, 0), (150, 0), (150, 0), (150, 0), (150, 0), (150, 0)],
}

montants_records = []
for desc, montants in charges_montants_data.items():
    charge_id = charges_map.get(desc)
    if charge_id:
        for mois, (lionel, ophelie) in enumerate(montants, 1):
            if lionel > 0 or ophelie > 0:
                montants_records.append({
                    "charge_id": [charge_id],
                    "mois": mois,
                    "annee": 2026,
                    "lionel": lionel,
                    "ophelie": ophelie
                })

create_records("Charges_Montants", montants_records)

# === 5. EPARGNE ===
print("\n🏦 5. Epargne...")
epargne_data = [
    {"type": "LDD", "beneficiaire": "Commun", "ordre": 1},
    {"type": "PEA", "beneficiaire": "Lionel", "ordre": 2},
    {"type": "PEA", "beneficiaire": "Ophélie", "ordre": 3},
    {"type": "Assurance Vie", "beneficiaire": "Noémie", "ordre": 4},
    {"type": "Assurance Vie", "beneficiaire": "Alizée", "ordre": 5},
    {"type": "Livret A", "beneficiaire": "Noémie", "ordre": 6},
    {"type": "Livret A", "beneficiaire": "Alizée", "ordre": 7},
]
create_records("Epargne", epargne_data)

# === 6. EPARGNE_MONTANTS ===
print("\n🏦 6. Epargne_Montants...")
time.sleep(1)
resp = requests.get(f"{BASE_URL}/Epargne", headers=HEADERS)
epargne_map = {}
if resp.status_code == 200:
    for rec in resp.json().get("records", []):
        key = f"{rec['fields'].get('type', '')} {rec['fields'].get('beneficiaire', '')}"
        epargne_map[key] = rec["id"]
    print(f"  📋 {len(epargne_map)} types d'épargne trouvés")

# Épargne mensuelle (données du fichier Excel - réalisé)
epargne_montants_data = {
    "LDD Commun": [100, 100, 100, 100, 100, 100, 100, 100, 0, 0, 0, 0],  # 800€ réalisé sur 8000€
    "PEA Lionel": [25, 25, 25, 25, 25, 25, 25, 25, 0, 0, 0, 0],  # 200€ réalisé
    "PEA Ophélie": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    "Assurance Vie Noémie": [6, 6, 6, 6, 6, 6, 6, 8, 0, 0, 0, 0],  # ~50€
    "Assurance Vie Alizée": [6, 6, 6, 6, 6, 6, 6, 8, 0, 0, 0, 0],  # ~50€
    "Livret A Noémie": [12, 12, 12, 12, 13, 13, 13, 13, 0, 0, 0, 0],  # ~100€
    "Livret A Alizée": [12, 12, 12, 12, 13, 13, 13, 13, 0, 0, 0, 0],  # ~100€
}

ep_montants_records = []
for key, montants in epargne_montants_data.items():
    ep_id = epargne_map.get(key)
    if ep_id:
        for mois, montant in enumerate(montants, 1):
            if montant > 0:
                ep_montants_records.append({
                    "epargne_id": [ep_id],
                    "mois": mois,
                    "annee": 2026,
                    "montant": montant
                })

create_records("Epargne_Montants", ep_montants_records)

# === 7. OBJECTIFS ===
print("\n🎯 7. Objectifs...")
objectifs_data = [
    {"type": "LDD Commun", "objectif_annuel": 8000},
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
print("\nDonnées chargées depuis le fichier Excel Budget_Familial_2026")
print("- Revenus : 12 mois")
print("- Charges : 32 postes")
print("- Épargne : 7 types")
print("- Objectifs : 7 types")
