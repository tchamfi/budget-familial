"""
auth.py — Authentification Google SSO
Utilise st.components.v1.html() pour un vrai rendu HTML
"""

import streamlit as st
import streamlit.components.v1 as components

def get_authorized_users() -> list:
    try:
        users = st.secrets.get("AUTHORIZED_USERS", "")
        if users:
            return [u.strip().lower() for u in users.split(",")]
    except:
        pass
    return ["tchamfong@gmail.com", "ophelie.linde@gmail.com"]

def login_page():
    """Page de connexion avec HTML rendu via components"""
    
    # CSS de base pour Streamlit
    st.markdown("""
    <style>
    .stApp {
        background: #F8F9FB !important;
    }
    .main .block-container {
        padding: 0 !important;
        max-width: 100% !important;
    }
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    /* Style du bouton OAuth */
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
    
    # Header HTML avec st.components.v1.html()
    header_html = """
    <!DOCTYPE html>
    <html>
    <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: 'Inter', sans-serif;
                background: transparent;
            }
            .hero {
                background: linear-gradient(135deg, #1a1f35 0%, #2d1f47 50%, #1a2540 100%);
                padding: 3rem 2rem;
                text-align: center;
                border-radius: 0 0 30px 30px;
            }
            .hero-icon {
                font-size: 3rem;
                margin-bottom: 1rem;
            }
            .hero-title {
                font-size: 2.2rem;
                font-weight: 700;
                background: linear-gradient(135deg, #22C55E 0%, #4ADE80 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 0.5rem;
            }
            .hero-subtitle {
                color: #94A3B8;
                font-size: 1rem;
                margin-bottom: 1.5rem;
            }
            .badges {
                display: flex;
                justify-content: center;
                gap: 0.75rem;
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
        </style>
    </head>
    <body>
        <div class="hero">
            <div class="hero-icon">💰</div>
            <h1 class="hero-title">Budget Famille TCHAMFONG</h1>
            <p class="hero-subtitle">Gestion financière intelligente</p>
            <div class="badges">
                <span class="badge highlight">🔒 Sécurisé</span>
                <span class="badge">📊 Tableaux de bord</span>
                <span class="badge">🎯 Objectifs</span>
                <span class="badge">☁️ Cloud</span>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Afficher le header avec components.html
    components.html(header_html, height=280, scrolling=False)
    
    # Carte de connexion
    st.write("")
    
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        # Card blanche
        with st.container():
            st.markdown("""
            <div style="
                background: white;
                border-radius: 16px;
                padding: 2rem;
                box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                border: 1px solid #E5E7EB;
                text-align: center;
                margin-top: -20px;
            ">
                <h3 style="font-family: Inter, sans-serif; font-weight: 600; color: #1F2937; margin-bottom: 0.5rem;">
                    Bienvenue 👋
                </h3>
                <p style="font-family: Inter, sans-serif; color: #6B7280; font-size: 0.9rem;">
                    Connectez-vous pour accéder à votre espace
                </p>
            </div>
            """, unsafe_allow_html=True)
            
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
            st.caption("💰 Budget Famille TCHAMFONG • Streamlit + Airtable")

def logout():
    st.session_state.user_info = None
    st.session_state.authenticated = False
    st.rerun()

def get_current_user():
    return st.session_state.get("user_info")

def is_authenticated() -> bool:
    return st.session_state.get("authenticated", False)
