"""
auth.py — Authentification Google SSO
Version simplifiée - Streamlit natif uniquement
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
    """Page de connexion simple et propre"""
    
    # CSS minimal
    st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    .stApp {
        background: linear-gradient(180deg, #1a1f35 0%, #1a1f35 35%, #F8F9FB 35%) !important;
    }
    
    .main .block-container {
        padding-top: 3rem !important;
        max-width: 500px !important;
    }
    
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    h1 {
        font-family: 'Inter', sans-serif !important;
        font-weight: 700 !important;
        color: #22C55E !important;
        text-align: center !important;
    }
    
    .stButton > button {
        font-family: 'Inter', sans-serif !important;
        font-weight: 600 !important;
        font-size: 1rem !important;
        border-radius: 25px !important;
        padding: 0.875rem 2rem !important;
        background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%) !important;
        border: none !important;
        color: white !important;
        width: 100% !important;
        box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3) !important;
    }
    
    .stButton > button:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4) !important;
    }
    </style>
    """, unsafe_allow_html=True)
    
    # Contenu simple avec Streamlit natif
    st.write("")
    st.write("")
    
    # Centrer le contenu
    col1, col2, col3 = st.columns([1, 2, 1])
    
    with col2:
        st.markdown("<h1 style='font-size: 3rem; margin-bottom: 0;'>💰</h1>", unsafe_allow_html=True)
        st.markdown("<h1 style='margin-top: 0;'>Budget Famille TCHAMFONG</h1>", unsafe_allow_html=True)
        st.markdown("<p style='text-align: center; color: #94A3B8; margin-bottom: 2rem;'>Gestion financière intelligente</p>", unsafe_allow_html=True)
        
        st.write("")
        st.write("")
        
        # Badges simples avec colonnes Streamlit
        b1, b2, b3, b4 = st.columns(4)
        b1.caption("🔒 Sécurisé")
        b2.caption("📊 Dashboard")
        b3.caption("🎯 Objectifs")
        b4.caption("☁️ Cloud")
        
        st.write("")
        st.divider()
        st.write("")
        
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
                        st.error(f"⛔ Accès non autorisé pour {email}")
                        st.info("Cette application est réservée aux membres de la famille TCHAMFONG.")
                        
        except ImportError:
            st.error("❌ Module streamlit-oauth non installé")
        except Exception as e:
            st.error(f"❌ Erreur: {e}")
        
        st.write("")
        st.write("")
        st.caption("💰 Budget Famille TCHAMFONG • Streamlit + Airtable")

def logout():
    st.session_state.user_info = None
    st.session_state.authenticated = False
    st.rerun()

def get_current_user():
    return st.session_state.get("user_info")

def is_authenticated() -> bool:
    return st.session_state.get("authenticated", False)
