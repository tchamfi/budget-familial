"""
auth.py — Authentification Google SSO
Composants Streamlit natifs uniquement
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
    """Page de connexion avec composants Streamlit natifs"""
    
    # Configuration de la page
    st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { font-family: 'Inter', sans-serif !important; }
    
    .stApp { background: #F8F9FB !important; }
    
    #MainMenu, footer, header { visibility: hidden; }
    
    .main .block-container {
        padding-top: 0 !important;
        max-width: 100% !important;
    }
    
    /* Header sombre */
    [data-testid="stVerticalBlock"] > div:first-child {
        background: linear-gradient(135deg, #1a1f35 0%, #2d1f47 50%, #1a2540 100%);
        padding: 3rem 2rem;
        border-radius: 0 0 30px 30px;
        margin: -1rem -1rem 2rem -1rem;
    }
    
    /* Bouton violet */
    .stButton > button {
        font-weight: 600 !important;
        border-radius: 25px !important;
        padding: 0.75rem 2rem !important;
        background: linear-gradient(135deg, #8B5CF6 0%, #A855F7 100%) !important;
        border: none !important;
        color: white !important;
        box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3) !important;
    }
    
    .stButton > button:hover {
        box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4) !important;
    }
    </style>
    """, unsafe_allow_html=True)
    
    # ===== HEADER SOMBRE =====
    header_container = st.container()
    with header_container:
        st.markdown("""
        <div style="
            background: linear-gradient(135deg, #1a1f35 0%, #2d1f47 50%, #1a2540 100%);
            padding: 3rem 2rem;
            border-radius: 0 0 30px 30px;
            text-align: center;
            margin: -6rem -4rem 2rem -4rem;
        ">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">💰</div>
            <h1 style="
                font-size: 2.2rem;
                font-weight: 700;
                color: #22C55E;
                margin: 0 0 0.5rem 0;
            ">Budget Famille TCHAMFONG</h1>
            <p style="color: #94A3B8; margin-bottom: 1.5rem;">Gestion financière intelligente</p>
            <div style="display: flex; justify-content: center; gap: 0.75rem; flex-wrap: wrap;">
                <span style="
                    background: rgba(34, 197, 94, 0.2);
                    border: 1px solid rgba(34, 197, 94, 0.3);
                    border-radius: 20px;
                    padding: 0.4rem 1rem;
                    color: #4ADE80;
                    font-size: 0.85rem;
                ">🔒 Sécurisé</span>
                <span style="
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 20px;
                    padding: 0.4rem 1rem;
                    color: #E2E8F0;
                    font-size: 0.85rem;
                ">📊 Dashboard</span>
                <span style="
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.15);
                    border-radius: 20px;
                    padding: 0.4rem 1rem;
                    color: #E2E8F0;
                    font-size: 0.85rem;
                ">🎯 Objectifs</span>
            </div>
        </div>
        """, unsafe_allow_html=True)
    
    # ===== SECTION CONNEXION =====
    st.write("")
    
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        # Carte blanche
        st.markdown("""
        <div style="
            background: white;
            border-radius: 16px;
            padding: 2rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            border: 1px solid #E5E7EB;
            text-align: center;
        ">
            <h3 style="font-weight: 600; color: #1F2937; margin: 0 0 0.5rem 0;">Bienvenue 👋</h3>
            <p style="color: #6B7280; font-size: 0.9rem; margin: 0;">Connectez-vous pour accéder à votre espace</p>
        </div>
        """, unsafe_allow_html=True)
        
        st.write("")
        st.write("")
        
        # OAuth Google
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
                        
        except ImportError:
            st.error("❌ Module streamlit-oauth non installé")
        except Exception as e:
            st.error(f"❌ Erreur: {e}")
        
        st.write("")
        st.write("")
        st.markdown("<p style='text-align: center; color: #9CA3AF; font-size: 0.8rem;'>💰 Budget Famille TCHAMFONG</p>", unsafe_allow_html=True)

def logout():
    st.session_state.user_info = None
    st.session_state.authenticated = False
    st.rerun()

def get_current_user():
    return st.session_state.get("user_info")

def is_authenticated() -> bool:
    return st.session_state.get("authenticated", False)
