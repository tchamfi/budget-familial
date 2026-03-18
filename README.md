# Budget Familial 2026 — Tchamfong

Application de suivi budgétaire familial connectée à Airtable.

## Stack

- **Frontend** : Next.js 14 + React 18 + Recharts
- **Backend** : Airtable (API REST)
- **Hébergement** : Vercel

## Déploiement

### Prérequis

- Node.js 18+
- Compte GitHub
- Compte Vercel (gratuit)

### Lancer en local

```bash
npm install
npm run dev
# → http://localhost:3000
```

### Variables d'environnement

| Variable | Valeur |
|----------|--------|
| `NEXT_PUBLIC_AIRTABLE_TOKEN` | Ton Personal Access Token Airtable |
| `NEXT_PUBLIC_AIRTABLE_BASE_ID` | `appRdg7WeaRxPBxsj` |
