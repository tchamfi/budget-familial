"""
styles.py — Styles CSS pour Budget Familial
Design moderne, user-friendly, responsive
"""

def get_css():
    return """
<style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    
    /* === GLOBAL === */
    .stApp {
        background: linear-gradient(180deg, #f0f4f8 0%, #e2e8f0 100%);
        font-family: 'Inter', sans-serif;
    }
    
    #MainMenu, footer, header {visibility: hidden;}
    .stDeployButton {display: none;}
    
    .block-container {
        max-width: 1400px;
        padding: 1rem 2rem 2rem;
    }
    
    /* === TYPOGRAPHY === */
    h1, h2, h3, h4 {
        font-family: 'Inter', sans-serif !important;
        color: #1a1a2e !important;
    }
    
    /* === HEADER === */
    .main-header {
        background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #3d7ab5 100%);
        padding: 1.5rem 2rem;
        border-radius: 16px;
        margin-bottom: 1.5rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 4px 20px rgba(30, 58, 95, 0.3);
    }
    
    .header-left {
        display: flex;
        align-items: center;
        gap: 15px;
    }
    
    .header-title {
        font-size: 1.8rem;
        font-weight: 700;
        color: white;
        margin: 0;
    }
    
    .header-subtitle {
        font-size: 0.9rem;
        color: rgba(255,255,255,0.7);
        margin: 0;
    }
    
    .header-right {
        display: flex;
        align-items: center;
        gap: 20px;
    }
    
    .user-badge {
        display: flex;
        align-items: center;
        gap: 10px;
        background: rgba(255,255,255,0.15);
        padding: 8px 16px;
        border-radius: 30px;
        color: white;
        font-size: 0.9rem;
    }
    
    /* === CARDS KPI === */
    .kpi-container {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-bottom: 1.5rem;
    }
    
    .kpi-card {
        background: white;
        padding: 20px;
        border-radius: 16px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .kpi-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.1);
    }
    
    .kpi-label {
        font-size: 0.85rem;
        color: #666;
        margin-bottom: 8px;
        font-weight: 500;
    }
    
    .kpi-value {
        font-size: 1.8rem;
        font-weight: 700;
        color: #1a1a2e;
    }
    
    .kpi-value.positive { color: #059669; }
    .kpi-value.negative { color: #dc2626; }
    .kpi-value.warning { color: #d97706; }
    .kpi-value.info { color: #2563eb; }
    
    .kpi-trend {
        font-size: 0.8rem;
        margin-top: 8px;
        display: flex;
        align-items: center;
        gap: 4px;
    }
    
    .kpi-trend.up { color: #059669; }
    .kpi-trend.down { color: #dc2626; }
    
    /* === TABS === */
    .stTabs [data-baseweb="tab-list"] {
        background: white;
        border-radius: 12px;
        padding: 6px;
        gap: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    
    .stTabs [data-baseweb="tab"] {
        font-family: 'Inter', sans-serif;
        font-weight: 600;
        font-size: 0.95rem;
        color: #64748b;
        border-radius: 8px;
        padding: 10px 20px;
        background: transparent;
    }
    
    .stTabs [data-baseweb="tab"]:hover {
        background: #f1f5f9;
        color: #334155;
    }
    
    .stTabs [aria-selected="true"] {
        background: linear-gradient(135deg, #2563eb, #3b82f6) !important;
        color: white !important;
    }
    
    /* === TABLES === */
    .data-table {
        width: 100%;
        background: white;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }
    
    .data-table th {
        background: #f8fafc;
        padding: 14px 16px;
        text-align: left;
        font-weight: 600;
        color: #475569;
        font-size: 0.85rem;
        border-bottom: 2px solid #e2e8f0;
    }
    
    .data-table td {
        padding: 14px 16px;
        border-bottom: 1px solid #f1f5f9;
        font-size: 0.9rem;
    }
    
    .data-table tr:hover {
        background: #f8fafc;
    }
    
    .data-table .amount {
        text-align: right;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 500;
    }
    
    .data-table .amount.positive { color: #059669; }
    .data-table .amount.negative { color: #dc2626; }
    
    /* === FORMS === */
    .form-section {
        background: white;
        padding: 24px;
        border-radius: 16px;
        margin-bottom: 16px;
        box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }
    
    .form-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 2px solid #f1f5f9;
    }
    
    /* Style Streamlit inputs */
    .stTextInput > div > div > input,
    .stNumberInput > div > div > input,
    .stSelectbox > div > div > div {
        border-radius: 10px !important;
        border: 2px solid #e2e8f0 !important;
        font-family: 'Inter', sans-serif !important;
    }
    
    .stTextInput > div > div > input:focus,
    .stNumberInput > div > div > input:focus {
        border-color: #3b82f6 !important;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
    }
    
    /* === BUTTONS === */
    .stButton > button {
        font-family: 'Inter', sans-serif !important;
        font-weight: 600;
        border-radius: 10px;
        padding: 10px 24px;
        transition: all 0.2s;
    }
    
    .stButton > button[kind="primary"] {
        background: linear-gradient(135deg, #2563eb, #3b82f6);
        border: none;
    }
    
    .stButton > button[kind="primary"]:hover {
        background: linear-gradient(135deg, #1d4ed8, #2563eb);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
    }
    
    /* === MONTH SELECTOR === */
    .month-selector {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 20px;
    }
    
    .month-btn {
        padding: 8px 16px;
        background: white;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .month-btn:hover {
        border-color: #3b82f6;
        background: #f0f7ff;
    }
    
    .month-btn.active {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
    }
    
    /* === PROGRESS BARS === */
    .progress-container {
        background: white;
        padding: 16px;
        border-radius: 12px;
        margin-bottom: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    
    .progress-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 0.9rem;
    }
    
    .progress-label {
        font-weight: 600;
        color: #334155;
    }
    
    .progress-value {
        color: #64748b;
    }
    
    .progress-bar {
        height: 10px;
        background: #e2e8f0;
        border-radius: 5px;
        overflow: hidden;
    }
    
    .progress-fill {
        height: 100%;
        border-radius: 5px;
        transition: width 0.5s ease;
    }
    
    .progress-fill.green { background: linear-gradient(90deg, #10b981, #34d399); }
    .progress-fill.blue { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
    .progress-fill.yellow { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
    .progress-fill.red { background: linear-gradient(90deg, #ef4444, #f87171); }
    
    /* === CATEGORY BADGES === */
    .category-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    
    .cat-logement { background: #dbeafe; color: #1e40af; }
    .cat-maison { background: #dcfce7; color: #166534; }
    .cat-transport { background: #fef3c7; color: #92400e; }
    .cat-abonnements { background: #f3e8ff; color: #7c3aed; }
    .cat-sport { background: #fce7f3; color: #be185d; }
    .cat-enfants { background: #cffafe; color: #0e7490; }
    .cat-alimentaire { background: #ffedd5; color: #c2410c; }
    .cat-loisirs { background: #e0e7ff; color: #4338ca; }
    
    /* === COMPTE BADGES === */
    .compte-badge {
        display: inline-block;
        padding: 3px 10px;
        border-radius: 6px;
        font-size: 0.7rem;
        font-weight: 600;
    }
    
    .compte-commun { background: #dbeafe; color: #1e40af; }
    .compte-perso { background: #fef3c7; color: #92400e; }
    
    /* === ALERTS === */
    .alert {
        padding: 16px 20px;
        border-radius: 12px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 12px;
    }
    
    .alert-success {
        background: #dcfce7;
        border-left: 4px solid #22c55e;
        color: #166534;
    }
    
    .alert-warning {
        background: #fef3c7;
        border-left: 4px solid #f59e0b;
        color: #92400e;
    }
    
    .alert-error {
        background: #fee2e2;
        border-left: 4px solid #ef4444;
        color: #991b1b;
    }
    
    .alert-info {
        background: #dbeafe;
        border-left: 4px solid #3b82f6;
        color: #1e40af;
    }
    
    /* === SIDEBAR === */
    section[data-testid="stSidebar"] {
        background: linear-gradient(180deg, #1e293b, #0f172a);
    }
    
    section[data-testid="stSidebar"] .stMarkdown {
        color: white;
    }
    
    /* === RESPONSIVE === */
    @media (max-width: 768px) {
        .main-header {
            flex-direction: column;
            text-align: center;
            gap: 15px;
        }
        
        .kpi-container {
            grid-template-columns: repeat(2, 1fr);
        }
        
        .header-title {
            font-size: 1.4rem;
        }
    }
    
    /* === ANIMATIONS === */
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .animate-in {
        animation: fadeIn 0.3s ease-out;
    }
</style>
"""

def format_money(amount: float) -> str:
    """Formate un montant en euros"""
    if amount >= 0:
        return f"{amount:,.0f} €".replace(",", " ")
    else:
        return f"-{abs(amount):,.0f} €".replace(",", " ")

def get_category_class(category: str) -> str:
    """Retourne la classe CSS pour une catégorie"""
    cat_map = {
        "LOGEMENT": "cat-logement",
        "MAISON": "cat-maison",
        "VOITURE & TRANSPORT": "cat-transport",
        "ABONNEMENTS": "cat-abonnements",
        "SPORT & SANTÉ": "cat-sport",
        "ENFANTS": "cat-enfants",
        "ALIMENTAIRE": "cat-alimentaire",
        "LOISIRS": "cat-loisirs",
    }
    return cat_map.get(category.upper(), "cat-logement")

def get_compte_class(compte: str) -> str:
    """Retourne la classe CSS pour un type de compte"""
    return "compte-commun" if compte.lower() == "commun" else "compte-perso"
