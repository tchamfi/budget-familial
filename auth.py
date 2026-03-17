"""
auth.py — Authentification Google SSO
Version minimaliste
"""

import streamlit as st

def get_authorized_users() -> list:
    try:
        users = st.secrets.get("AUTHORIZED_USERS", "")
        if users:
            return [u.strip().lower() for u in users.split(",")]
    except:
        pass
    return ["tchamfong@gmail.com", "ophelie.linde@gmail.com"]

def login_page():
    """Page de connexion minimaliste"""
    
    st.markdown("""
    <style>
    #MainMenu, footer, header { visibility: hidden; }
    .block-container { padding-top: 8rem !important; max-width: 500px !important; }
    </style>
    """, unsafe_allow_html=True)
    
    st.title("Budget Famille TCHAMFONG")
    st.write("Gestion financière")
    
    st.divider()
    
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
            redirect_uri=REDIRECT_URI,
            scope="openid email profile",
            key="google_oauth",
            extras_params={"prompt": "consent", "access_type": "offline"},
            pkce="S256",
            use_container_width=True,
        )
        
        if result and "token" in result:
            import requests
            access_token = result["token"]["access_token"]
            
            user_info_response = requests.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if user_info_response.status_code == 200:
                user_info = user_info_response.json()
                email = user_info.get("email", "").lower()
                
                if email in get_authorized_users():
                    st.session_state.user_info = {
                        "email": email,
                        "name": user_info.get("name", email.split("@")[0]),
                        "picture": user_info.get("picture")
                    }
                    st.session_state.authenticated = True
                    st.rerun()
                else:
                    st.error(f"Accès non autorisé pour {email}")
                    
    except ImportError:
        st.error("Module streamlit-oauth non installé")
    except Exception as e:
        st.error(f"Erreur: {e}")

def logout():
    st.session_state.user_info = None
    st.session_state.authenticated = False
    st.rerun()

def get_current_user():
    return st.session_state.get("user_info")

def is_authenticated() -> bool:
    return st.session_state.get("authenticated", False)
