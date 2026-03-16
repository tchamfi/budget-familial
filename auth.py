"""
auth.py — Authentification Google SSO pour Budget Familial
"""

import streamlit as st

def get_authorized_users() -> list:
    """Récupère la liste des utilisateurs autorisés depuis les secrets"""
    try:
        users = st.secrets.get("AUTHORIZED_USERS", "")
        if users:
            return [u.strip().lower() for u in users.split(",")]
    except:
        pass
    return ["tchamfong@gmail.com", "ophelie.linde@gmail.com"]

def login_page():
    """Affiche la page de connexion Google SSO"""
    
    st.markdown("""
    <style>
        .login-container {
            max-width: 450px;
            margin: 80px auto;
            padding: 40px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            text-align: center;
        }
        .login-title {
            font-size: 2.2rem;
            font-weight: 700;
            color: #1a1a2e;
            margin-bottom: 10px;
        }
        .login-subtitle {
            color: #666;
            margin-bottom: 30px;
            font-size: 1rem;
        }
        .login-emoji {
            font-size: 4rem;
            margin-bottom: 20px;
        }
    </style>
    
    <div class="login-container">
        <div class="login-emoji">💰</div>
        <div class="login-title">Budget Familial</div>
        <div class="login-subtitle">Connectez-vous avec votre compte Google</div>
    </div>
    """, unsafe_allow_html=True)
    
    # Google OAuth
    try:
        from streamlit_oauth import OAuth2Component
        
        CLIENT_ID = st.secrets.get("GOOGLE_CLIENT_ID", "")
        CLIENT_SECRET = st.secrets.get("GOOGLE_CLIENT_SECRET", "")
        REDIRECT_URI = st.secrets.get("REDIRECT_URI", "https://budget-familial-tchamfong.streamlit.app/")
        
        oauth2 = OAuth2Component(
            client_id=CLIENT_ID,
            client_secret=CLIENT_SECRET,
            authorize_endpoint="https://accounts.google.com/o/oauth2/v2/auth",
            token_endpoint="https://oauth2.googleapis.com/token",
        )
        
        result = oauth2.authorize_button(
            name="Se connecter avec Google",
            icon="https://www.google.com/favicon.ico",
            redirect_uri=REDIRECT_URI,
            scope="openid email profile",
            key="google_oauth",
            extras_params={"prompt": "consent", "access_type": "offline"},
            use_container_width=True,
            pkce="S256",
        )
        
        if result and "token" in result:
            # Récupérer les infos utilisateur
            import requests
            access_token = result["token"]["access_token"]
            
            user_info_response = requests.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if user_info_response.status_code == 200:
                user_info = user_info_response.json()
                email = user_info.get("email", "").lower()
                
                # Vérifier si autorisé
                if email in get_authorized_users():
                    st.session_state.user_info = {
                        "email": email,
                        "name": user_info.get("name", email.split("@")[0]),
                        "picture": user_info.get("picture")
                    }
                    st.session_state.authenticated = True
                    st.rerun()
                else:
                    st.error(f"⛔ Accès refusé pour {email}")
                    st.info("Seuls les comptes autorisés peuvent accéder à cette application.")
            else:
                st.error("Erreur lors de la récupération des informations utilisateur")
                
    except ImportError:
        st.error("❌ Module streamlit-oauth non installé")
        st.code("pip install streamlit-oauth")
    except Exception as e:
        st.error(f"❌ Erreur OAuth: {e}")

def logout():
    """Déconnexion"""
    st.session_state.user_info = None
    st.session_state.authenticated = False
    st.rerun()

def get_current_user():
    """Retourne l'utilisateur courant"""
    return st.session_state.get("user_info")

def is_authenticated() -> bool:
    """Vérifie si l'utilisateur est authentifié"""
    return st.session_state.get("authenticated", False)
