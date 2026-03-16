# 💰 Budget Familial 2026

Application web de gestion de budget familial avec authentification Google SSO.

## 🚀 Fonctionnalités

- **Tableau de bord** : Vue synthétique des revenus, charges et épargne
- **Gestion des revenus** : Saisie mensuelle par personne (Lionel / Ophélie)
- **Gestion des charges** : Catégorisées, éditables, avec historique mensuel
- **Suivi de l'épargne** : LDD, PEA, Assurance Vie, Livret A avec objectifs
- **Authentification SSO** : Connexion Google sécurisée (comptes autorisés uniquement)
- **Persistance Airtable** : Données stockées dans le cloud via API REST

## 📋 Architecture

```
budget-app/
├── app.py              # Application principale Streamlit
├── auth.py             # Authentification Google SSO
├── airtable_store.py   # Module CRUD Airtable
├── styles.py           # CSS et helpers de formatage
├── init_airtable.py    # Script d'initialisation des données
├── requirements.txt    # Dépendances Python
└── README.md
```

## 🛠️ Installation

### 1. Prérequis

- Python 3.10+
- Compte Airtable (gratuit)
- Projet Google Cloud (pour OAuth)

### 2. Créer la base Airtable

Créer une nouvelle base avec les tables suivantes :

| Table | Champs |
|-------|--------|
| **Revenus** | mois (Number), annee (Number), lionel (Number), ophelie (Number) |
| **Charges** | categorie (Text), description (Text), compte (Single Select: Commun/Perso), ordre (Number) |
| **Charges_Montants** | charge_id (Link to Charges), mois (Number), annee (Number), lionel (Number), ophelie (Number) |
| **Epargne** | type (Text), beneficiaire (Text), ordre (Number) |
| **Epargne_Montants** | epargne_id (Link to Epargne), mois (Number), annee (Number), montant (Number) |
| **Objectifs** | type (Text), objectif_annuel (Number) |
| **Config** | cle (Text), valeur (Long Text) |

### 3. Configurer Google OAuth

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créer un projet ou en sélectionner un existant
3. Activer l'API "Google+ API" et "Google People API"
4. Créer des identifiants OAuth 2.0 :
   - Type : Application Web
   - URI de redirection : `http://localhost:8501` (dev) et `https://votre-app.streamlit.app` (prod)
5. Télécharger le fichier `client_secret.json`

### 4. Installation locale

```bash
# Cloner le repo
git clone https://github.com/tchamfi/budget-familial.git
cd budget-familial

# Créer l'environnement virtuel
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou: venv\Scripts\activate  # Windows

# Installer les dépendances
pip install -r requirements.txt

# Configurer les variables d'environnement
export AIRTABLE_TOKEN="votre_token_airtable"
export AIRTABLE_BASE_ID="votre_base_id"

# Initialiser les données (une seule fois)
python init_airtable.py

# Lancer l'application
streamlit run app.py
```

### 5. Déploiement Streamlit Cloud

1. Push le code sur GitHub
2. Aller sur [share.streamlit.io](https://share.streamlit.io)
3. Connecter le repo GitHub
4. Configurer les **Secrets** :

```toml
AIRTABLE_TOKEN = "pat..."
AIRTABLE_BASE_ID = "app..."
AUTHORIZED_USERS = "email1@gmail.com,email2@gmail.com"
COOKIE_KEY = "votre_cle_secrete_random"
REDIRECT_URI = "https://votre-app.streamlit.app"
DEV_MODE = "false"
```

5. Ajouter le fichier `client_secret.json` dans les secrets ou le repo

## 🔐 Sécurité

- **Authentification** : Google OAuth 2.0
- **Autorisation** : Liste blanche d'emails
- **Données** : Stockées dans Airtable (chiffrement en transit)
- **Sessions** : Cookies sécurisés avec expiration

## 📊 Structure des données

### Revenus
```
Lionel: 2500€/mois (chômage depuis mars 2026)
Ophélie: 4200€/mois
```

### Catégories de charges
- LOGEMENT (prêt, assurances, taxes)
- MAISON (énergie, internet, ménage)
- VOITURE & TRANSPORT (assurance, essence, Navigo)
- ABONNEMENTS (streaming, téléphones)
- SPORT & SANTÉ (CrossFit, Boxe)
- ENFANTS (école, activités)
- ALIMENTAIRE (courses, repas)
- LOISIRS (sorties, soins)

### Épargne
- LDD (Lionel & Ophélie) - Sécurité
- PEA (Lionel & Ophélie) - Investissement
- Assurance Vie (Noémie & Alizée) - Enfants
- Livret A (Noémie & Alizée) - Enfants

## 🧑‍💻 Développement

### Mode développement

Pour bypasser l'authentification Google en local :

```bash
export DEV_MODE=true
streamlit run app.py
```

### Ajouter une fonctionnalité

1. Créer une branche : `git checkout -b feature/ma-feature`
2. Développer et tester
3. Commit : `git commit -am "Add ma feature"`
4. Push : `git push origin feature/ma-feature`
5. Pull Request sur GitHub

## 📝 Changelog

### v1.0.0 (Mars 2026)
- 🎉 Version initiale
- ✅ Tableau de bord avec KPIs
- ✅ Gestion revenus/charges/épargne
- ✅ Authentification Google SSO
- ✅ Persistance Airtable

## 📄 Licence

MIT License - Lionel TCHAMFONG © 2026
