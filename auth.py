"""
auth.py — Authentification Google SSO
Version Premium : Design luxe pour Budget Famille TCHAMFONG
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
    """Page de connexion premium"""
    
    # CSS Premium pour la page de login
    st.markdown("""
    <style>
    /* Import Google Fonts */
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
    
    /* Variables */
    :root {
        --primary-emerald: #10B981;
        --primary-dark: #059669;
        --bg-dark: #0F172A;
        --bg-card: #1E293B;
        --text-primary: #F8FAFC;
        --text-secondary: #94A3B8;
        --gradient-primary: linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%);
        --gradient-dark: linear-gradient(180deg, #0F172A 0%, #1E293B 100%);
        --shadow-glow: 0 0 60px rgba(16, 185, 129, 0.2);
    }
    
    /* Global */
    .stApp {
        background: var(--gradient-dark) !important;
    }
    
    .main .block-container {
        padding-top: 5rem !important;
        max-width: 600px !important;
    }
    
    /* Hide Streamlit elements */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    /* Login container */
    .login-container {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.04) 100%);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 24px;
        padding: 3rem;
        text-align: center;
        backdrop-filter: blur(10px);
        box-shadow: var(--shadow-glow);
        animation: fadeInUp 0.6s ease-out;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    /* Logo/Icon */
    .login-icon {
        font-size: 4rem;
        margin-bottom: 1.5rem;
        animation: pulse 2s ease-in-out infinite;
    }
    
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
    
    /* Title */
    .login-title {
        font-family: 'Playfair Display', serif;
        font-size: 2.5rem;
        font-weight: 600;
        background: linear-gradient(135deg, #10B981 0%, #34D399 50%, #10B981 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0 0 0.5rem 0;
        letter-spacing: -0.02em;
    }
    
    .login-subtitle {
        font-family: 'DM Sans', sans-serif;
        color: var(--text-secondary);
        font-size: 1.1rem;
        margin-bottom: 2rem;
        letter-spacing: 0.5px;
    }
    
    /* Divider */
    .login-divider {
        display: flex;
        align-items: center;
        margin: 2rem 0;
    }
    
    .login-divider::before,
    .login-divider::after {
        content: '';
        flex: 1;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
    }
    
    .login-divider-text {
        font-family: 'DM Sans', sans-serif;
        color: var(--text-muted);
        padding: 0 1rem;
        font-size: 0.9rem;
    }
    
    /* Info box */
    .login-info {
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.2);
        border-radius: 12px;
        padding: 1rem 1.5rem;
        margin-top: 2rem;
        font-family: 'DM Sans', sans-serif;
        color: var(--text-secondary);
        font-size: 0.9rem;
    }
    
    .login-info strong {
        color: #10B981;
    }
    
    /* Features list */
    .features-list {
        display: flex;
        justify-content: center;
        gap: 2rem;
        margin-top: 1.5rem;
        flex-wrap: wrap;
    }
    
    .feature-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-family: 'DM Sans', sans-serif;
        color: var(--text-secondary);
        font-size: 0.85rem;
    }
    
    .feature-icon {
        color: #10B981;
        font-size: 1.1rem;
    }
    
    /* Button styling */
    .stButton > button {
        font-family: 'DM Sans', sans-serif !important;
        font-weight: 600 !important;
        font-size: 1rem !important;
        border-radius: 12px !important;
        padding: 0.875rem 2rem !important;
        background: var(--gradient-primary) !important;
        border: none !important;
        color: white !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3) !important;
    }
    
    .stButton > button:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4) !important;
    }
    
    /* Footer */
    .login-footer {
        margin-top: 3rem;
        text-align: center;
        color: var(--text-muted);
        font-family: 'DM Sans', sans-serif;
        font-size: 0.8rem;
    }
    
    .login-footer a {
        color: #10B981;
        text-decoration: none;
    }
    </style>
    """, unsafe_allow_html=True)
    
    # Login container
    st.markdown("""
    <div class="login-container">
        <div class="login-icon">💎</div>
        <h1 class="login-title">Budget Famille TCHAMFONG</h1>
        <p class="login-subtitle">Gestion financière intelligente</p>
        
        <div class="features-list">
            <div class="feature-item">
                <span class="feature-icon">📊</span>
                <span>Tableaux de bord</span>
            </div>
            <div class="feature-item">
                <span class="feature-icon">🎯</span>
                <span>Objectifs épargne</span>
            </div>
            <div class="feature-item">
                <span class="feature-icon">🔒</span>
                <span>Données sécurisées</span>
            </div>
        </div>
        
        <div class="login-divider">
            <span class="login-divider-text">Connexion sécurisée</span>
        </div>
    </div>
    """, unsafe_allow_html=True)
    
    # Google OAuth button
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
        
        # Center the button
        col1, col2, col3 = st.columns([1, 2, 1])
        with col2:
            result = oauth2.authorize_button(
                name="🔐 Connexion avec Google",
                redirect_uri=REDIRECT_URI,
                scope="openid email profile",
                key="google_oauth",
                extras_params={"prompt": "consent", "access_type": "offline"},
                pkce="S256",
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
                    st.markdown("""
                    <div class="login-info">
                        <strong>Accès restreint</strong><br>
                        Cette application est réservée aux membres de la famille TCHAMFONG.
                    </div>
                    """, unsafe_allow_html=True)
                    
    except ImportError:
        st.error("Module streamlit-oauth non installé")
    except Exception as e:
        st.error(f"Erreur de connexion: {e}")
    
    # Footer
    st.markdown("""
    <div class="login-footer">
        💎 Budget Famille TCHAMFONG • Streamlit + Airtable<br>
        <span style="opacity: 0.6;">Données synchronisées en temps réel</span>
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
