"""
auth.py — Authentification Google SSO pour Budget Familial
Utilise streamlit-google-auth pour OAuth2
"""

import streamlit as st
from typing import Optional, Dict
import os

# Configuration des utilisateurs autorisés (emails Google)
AUTHORIZED_USERS = [
    "tchamfong@gmail.com",      # Lionel
    "ophelie.email@gmail.com",  # Ophélie (à remplacer par le vrai email)
    # Ajouter d'autres emails si nécessaire
]

def get_authorized_users() -> list:
    """Récupère la liste des utilisateurs autorisés depuis les secrets ou config"""
    try:
        users = st.secrets.get("AUTHORIZED_USERS", "")
        if users:
            return [u.strip().lower() for u in users.split(",")]
    except:
        pass
    return [u.lower() for u in AUTHORIZED_USERS]

def init_google_auth():
    """
    Initialise l'authentification Google OAuth2.
    Nécessite les secrets:
    - GOOGLE_CLIENT_ID
    - GOOGLE_CLIENT_SECRET
    """
    try:
        from streamlit_google_auth import Authenticate
        
        authenticator = Authenticate(
            secret_credentials_path='client_secret.json',
            cookie_name='budget_familial_auth',
            cookie_key=st.secrets.get("COOKIE_KEY", "budget_secret_key_2026"),
            redirect_uri=st.secrets.get("REDIRECT_URI", "http://localhost:8501"),
        )
        return authenticator
    except ImportError:
        st.error("❌ Module streamlit-google-auth non installé")
        return None
    except Exception as e:
        st.error(f"❌ Erreur d'initialisation OAuth: {e}")
        return None

def check_authentication() -> Optional[Dict]:
    """
    Vérifie l'authentification et retourne les infos utilisateur.
    Retourne None si non authentifié.
    """
    
    # Mode développement (bypass auth)
    if os.getenv("DEV_MODE") == "true" or st.secrets.get("DEV_MODE") == "true":
        return {
            "email": "tchamfong@gmail.com",
            "name": "Lionel (Dev Mode)",
            "picture": None
        }
    
    # Vérifier si déjà authentifié en session
    if "user_info" in st.session_state and st.session_state.user_info:
        return st.session_state.user_info
    
    return None

def login_page():
    """Affiche la page de connexion"""
    
    st.markdown("""
    <style>
        .login-container {
            max-width: 400px;
            margin: 100px auto;
            padding: 40px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            text-align: center;
        }
        .login-title {
            font-size: 2rem;
            font-weight: 700;
            color: #1a1a2e;
            margin-bottom: 10px;
        }
        .login-subtitle {
            color: #666;
            margin-bottom: 30px;
        }
        .google-btn {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            background: white;
            border: 2px solid #e0e0e0;
            padding: 14px 28px;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            color: #333;
            cursor: pointer;
            transition: all 0.2s;
            text-decoration: none;
        }
        .google-btn:hover {
            border-color: #4285f4;
            box-shadow: 0 4px 12px rgba(66,133,244,0.2);
        }
        .google-icon {
            width: 24px;
            height: 24px;
        }
    </style>
    """, unsafe_allow_html=True)
    
    st.markdown("""
    <div class="login-container">
        <div class="login-title">💰 Budget Familial</div>
        <div class="login-subtitle">Connectez-vous avec votre compte Google</div>
    </div>
    """, unsafe_allow_html=True)
    
    # Bouton de connexion Google
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        try:
            from streamlit_google_auth import Authenticate
            
            authenticator = Authenticate(
                secret_credentials_path='client_secret.json',
                cookie_name='budget_familial_auth',
                cookie_key=st.secrets.get("COOKIE_KEY", "budget_secret_key_2026"),
                redirect_uri=st.secrets.get("REDIRECT_URI", "http://localhost:8501"),
            )
            
            authenticator.check_authentification()
            
            if st.session_state.get('connected'):
                user_info = st.session_state.get('user_info', {})
                email = user_info.get('email', '').lower()
                
                # Vérifier si l'utilisateur est autorisé
                if email in get_authorized_users():
                    st.session_state.user_info = user_info
                    st.session_state.authenticated = True
                    st.rerun()
                else:
                    st.error(f"⛔ Accès refusé pour {email}")
                    st.info("Seuls les comptes autorisés peuvent accéder à cette application.")
                    authenticator.logout()
            else:
                authenticator.login()
                
        except ImportError:
            st.warning("🔧 Mode développement - Auth Google non configurée")
            
            # Mode dev avec sélection manuelle
            dev_email = st.selectbox(
                "Simuler connexion (dev)",
                ["tchamfong@gmail.com", "ophelie@gmail.com"]
            )
            if st.button("🔓 Connexion Dev", type="primary", use_container_width=True):
                st.session_state.user_info = {
                    "email": dev_email,
                    "name": "Lionel" if "tchamfong" in dev_email else "Ophélie",
                    "picture": None
                }
                st.session_state.authenticated = True
                st.rerun()

def logout():
    """Déconnexion"""
    st.session_state.user_info = None
    st.session_state.authenticated = False
    
    try:
        from streamlit_google_auth import Authenticate
        authenticator = Authenticate(
            secret_credentials_path='client_secret.json',
            cookie_name='budget_familial_auth',
            cookie_key=st.secrets.get("COOKIE_KEY", "budget_secret_key_2026"),
            redirect_uri=st.secrets.get("REDIRECT_URI", "http://localhost:8501"),
        )
        authenticator.logout()
    except:
        pass
    
    st.rerun()

def require_auth(func):
    """Décorateur pour protéger une fonction"""
    def wrapper(*args, **kwargs):
        if not st.session_state.get("authenticated"):
            login_page()
            st.stop()
        return func(*args, **kwargs)
    return wrapper

def get_current_user() -> Optional[Dict]:
    """Retourne l'utilisateur courant"""
    return st.session_state.get("user_info")

def is_authenticated() -> bool:
    """Vérifie si l'utilisateur est authentifié"""
    return st.session_state.get("authenticated", False)
