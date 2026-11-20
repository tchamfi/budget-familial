# Budget Familial 2026 — Tchamfong

Application de suivi budgétaire familial connectée à Airtable et alimentée par Finary.

## Stack

- **Frontend** : Next.js 14 + React 18 + Recharts
- **Backend** : routes API Next.js (session, lecture des tables Finary, assistant IA, DVF)
- **Données** : Airtable (tables `Finary_*` recopiées chaque semaine depuis Finary), DVF via l'API tabulaire de data.gouv.fr
- **Hébergement** : Vercel

## Sécurité

- Le jeton Airtable et la clé Anthropic restent côté serveur. Le navigateur ne les voit jamais.
- Connexion Google vérifiée côté serveur (`/api/auth/login`), puis cookie de session httpOnly signé (14 jours).
- Toutes les routes `/api/*` exigent une session valide.
- Le site ne fait que lire Airtable, côté serveur, via `/api/finary`. Il n'a plus d'accès en écriture depuis le navigateur.
- L'ancien budget prévisionnel (tables Revenus, Charges, Épargne, Objectifs) n'est plus utilisé par le site.

## Onglets Finary

- **Patrimoine** : patrimoine net, répartition, évolution (un relevé par semaine), patrimoine de chacun avec ou sans la maison, objectifs Finary, prêt.
- **Budget réel** : la semaine écoulée (dimanche au samedi) comparée à la semaine d'avant et à la moyenne des 12 dernières semaines, les commerçants suivis, les plafonds Finary du mois, puis revenus et dépenses réels par mois et par catégorie.
- **Comptes** : tous les comptes par type et par personne, et les lignes détenues (comptes de Lionel).

Les tables `Finary_*` de la base Airtable sont mises à jour chaque dimanche à 6 h par une tâche planifiée Claude. Ne pas les modifier à la main, sauf `Finary_Marchands_Suivis` : c'est la liste des commerçants suivis (nom affiché, texte recherché dans le libellé des opérations, groupe, case « actif »). Elle est prise en compte au passage suivant.

## Lancer en local

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Variables d'environnement (Vercel)

| Variable | Valeur |
|----------|--------|
| `AIRTABLE_TOKEN` | Personal Access Token Airtable (serveur uniquement, jamais `NEXT_PUBLIC_`) |
| `AIRTABLE_BASE_ID` | `appRdg7WeaRxPBxsj` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | ID client OAuth Google (public par nature) |
| `AUTHORIZED_EMAILS` | Adresses autorisées, séparées par des virgules |
| `SESSION_SECRET` | Chaîne aléatoire d'au moins 32 caractères (`openssl rand -hex 32`) |
| `ANTHROPIC_API_KEY` | Clé API Anthropic pour l'assistant |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Facultatives. Ancienne base DVF, utilisée seulement par le mode `stats` de `/api/dvf`, qu'aucun écran n'appelle |

`NEXT_PUBLIC_AIRTABLE_TOKEN` et `NEXT_PUBLIC_AIRTABLE_BASE_ID` ne servent plus : supprime-les de Vercel.
