"""
auth.py — Authentification Google SSO
Style Portfolio : Header sombre dégradé + corps clair + accent violet
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
    """Page de connexion style Portfolio"""
    
    # CSS Style Portfolio
    st.markdown("""
    <style>
    /* Import Google Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    /* Reset et base */
    .stApp {
        background: #F8F9FB !important;
        font-family: 'Inter', sans-serif !important;
    }
    
    .main .block-container {
        padding: 0 !important;
        max-width: 100% !important;
    }
    
    /* Hide Streamlit elements */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    /* Header hero sombre */
    .hero-section {
        background: linear-gradient(135deg, #1a1f35 0%, #2d1f47 50%, #1a2540 100%);
        padding: 4rem 2rem;
        text-align: center;
        border-radius: 0 0 30px 30px;
        margin-bottom: 2rem;
    }
    
    .hero-icon {
        font-size: 3.5rem;
        margin-bottom: 1rem;
    }
    
    .hero-title {
        font-family: 'Inter', sans-serif;
        font-size: 2.5rem;
        font-weight: 700;
        background: linear-gradient(135deg, #22C55E 0%, #4ADE80 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0 0 0.5rem 0;
    }
    
    .hero-subtitle {
        color: #94A3B8;
        font-size: 1.1rem;
        font-weight: 400;
    }
    
    /* Badges */
    .badges-container {
        display: flex;
        justify-content: center;
        gap: 0.75rem;
        margin-top: 1.5rem;
        flex-wrap: wrap;
    }
    
    .badge {
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 20px;
        padding: 0.4rem 1rem;
        color: #E2E8F0;
        font-size: 0.85rem;
        font-weight: 500;
    }
    
    .badge.highlight {
        background: rgba(34, 197, 94, 0.2);
        border-color: rgba(34, 197, 94, 0.3);
        color: #4ADE80;
    }
    
    /* Login card */
    .login-card {
        background: white;
        border-radius: 16px;
        padding: 2rem;
        max-width: 400px;
        margin: 0 auto;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        border: 1px solid #E5E7EB;
    }
    
    .login-card-title {
        font-size: 1.2rem;
        font-weight: 600;
        color: #1F2937;
        text-align: center;
        margin-bottom: 0.5rem;
    }
    
    .login-card-subtitle {
        font-size: 0.9rem;
        color: #6B7280;
        text-align: center;
        margin-bottom: 1.5rem;
    }
    
    /* Divider */
    .divider {
        display: flex;
        align-items: center;
        margin: 1.5rem 0;
        color: #9CA3AF;
        font-size: 0.85rem;
    }
    
    .divider::before,
    .divider::after {
        content: '';
        flex: 1;
        height: 1px;
        background: #E5E7EB;
    }
    
    .divider span {
        padding: 0 1rem;
    }
    
    /* Button styling - Violet comme le portfolio */
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
        transition: all 0.3s ease !important;
        box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3) !important;
    }
    
    .stButton > button:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4) !important;
    }
    
    /* Footer */
    .login-footer {
        text-align: center;
        color: #9CA3AF;
        font-size: 0.8rem;
        margin-top: 2rem;
        padding-bottom: 2rem;
    }
    
    /* Info boxes */
    .stAlert {
        border-radius: 12px !important;
    }
    </style>
    """, unsafe_allow_html=True)
    
    # Hero Section (header sombre)
    st.markdown("""
    <div class="hero-section">
        <div class="hero-icon">💰</div>
        <h1 class="hero-title">Budget Famille TCHAMFONG</h1>
        <p class="hero-subtitle">Gestion financière intelligente</p>
        
        <div class="badges-container">
            <span class="badge highlight">🔒 Sécurisé</span>
            <span class="badge">📊 Tableaux de bord</span>
            <span class="badge">🎯 Objectifs</span>
            <span class="badge">☁️ Cloud</span>
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    # Login Card (fond blanc)
    st.markdown("""
    <div class="login-card">
        <div class="login-card-title">Bienvenue 👋</div>
        <div class="login-card-subtitle">Connectez-vous pour accéder à votre espace famille</div>
    </div>
    """, unsafe_allow_html=True)
    
    # Centrer le bouton OAuth
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown('<div class="divider"><span>Connexion sécurisée</span></div>', unsafe_allow_html=True)
        
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
            st.error(f"❌ Erreur de connexion: {e}")
    
    # Footer
    st.markdown("""
    <div class="login-footer">
        💰 Budget Famille TCHAMFONG • Streamlit + Airtable<br>
        <span>Données synchronisées en temps réel</span>
    </div>
    """, unsafe_allow_html=True)

def logout():
    st.session_state.user_info = None
    st.session_state.authenticated = False
    st.rerun()

def get_current_user():
    return st.session_state.get("user_info")

def is_authenticated() -> bool:
    return st.session_state.get("authenticated", False)
