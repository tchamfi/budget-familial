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
- L'ancien budget prévisionnel a été archivé en CSV puis retiré d'Airtable (novembre 2026).
- L'assistant IA peut consulter les données publiques de data.gouv.fr (ventes DVF) via le serveur MCP officiel, en lecture seule. Si ce serveur ne répond pas, l'assistant répond sans lui.

## Onglets Finary

- **Patrimoine** : patrimoine net, répartition, évolution (un relevé par semaine), patrimoine de chacun avec ou sans la maison, objectifs Finary, prêt.
- **Budget réel** : la semaine écoulée (dimanche au samedi) comparée à la semaine d'avant et à la moyenne des 12 dernières semaines, les commerçants suivis, les plafonds Finary du mois, puis revenus et dépenses réels par mois et par catégorie.
- **Opérations** : les 4 dernières semaines (dimanche au samedi), semaine par semaine ou ensemble. Filtres par personne, par compte et par libellé. Quotidien, charges, mis de côté et entrées en cartes, puis qui dépense, les postes (catégorie et sous-catégorie Finary), les mouvements entre comptes (qui verse à qui, une ligne par fille) et toutes les opérations.
- **Comptes** : patrimoine net et sa courbe sur 3, 6 ou 12 mois, actifs, dettes, épargne, comptes dont la synchro bancaire est en erreur, patrimoine par personne, répartition, établissements, prêt, épargne des filles, puis tous les comptes avec leur dernière mise à jour.

### Mouvements entre comptes

`lib/flux.js` relie le départ et l'arrivée d'un même virement entre deux comptes de la famille : même montant, arrivée entre 1 jour avant et 4 jours après le départ. Quand plusieurs paires sont possibles, il retient la plus probable (prénom d'une fille dans le libellé, livret au nom de « MME » ou « MLLE », émetteur cité, même titulaire). Un virement relié n'est affiché qu'une fois.

- Un virement d'un compte courant vers un livret, un placement ou un compte d'une fille compte dans « Mis de côté », au moment où l'argent quitte le compte courant. Un achat dans un placement déjà alimenté reste un mouvement interne.
- Un retrait d'un livret vers un compte courant est signalé « retrait d'épargne ».
- Un virement sans arrivée dans la famille dont le libellé nomme une fille (CTO saisi à la main) compte aussi dans « Mis de côté ».
- Un virement à une autre personne compte dans les charges.
- Deux lignes identiques sur un même livret (doublon Finary) ne comptent qu'une fois. Le site le signale sous la liste des opérations.

`lib/postes.js` donne le nom français de chaque poste et son icône.

### Design

Les composants partagés (cartes, pilules, sphères des personnes, jauges, anneaux, bandeau) sont dans `app/ui.js`, les styles globaux dans `GlobalStyles` de `app/BudgetApp.js`. Polices Manrope et JetBrains Mono. Couleurs des personnes : Lionel bleu, Ophélie turquoise, Communs ambre, les filles violet.

Le site relit Airtable une fois par semaine, à la première visite après le dimanche 7 h (heure de Paris), puis garde le résultat dans le cache de données de Next, commun à toutes les instances Vercel. Le bouton « Recharger » vide ce cache. Il ne lit que les 6 derniers mois de `Finary_Semaine` et les 5 dernières semaines de `Finary_Marchands` et de `Finary_Transactions`. L'historique complet reste dans Airtable. `Finary_Historique` est facultative : sans elle, la courbe de l'onglet Comptes part des relevés de `Finary_Patrimoine`.

Les tables `Finary_*` de la base Airtable sont mises à jour chaque dimanche à 6 h par une tâche planifiée Claude. Ne pas les modifier à la main, sauf `Finary_Marchands_Suivis` : c'est la liste des commerçants suivis (nom affiché, texte recherché dans le libellé des opérations, groupe, case « actif »). Elle est prise en compte au passage suivant.

`Finary_Comptes` reçoit aussi l'état de synchro bancaire de chaque compte (`etat_synchro` : `ok`, `manuel` ou la raison de l'erreur, et `synchro_ok` : la dernière synchro réussie). `Finary_Historique` garde la courbe du patrimoine net du foyer sur 12 mois, un point tous les 10 à 15 jours.

`Finary_Transactions` reçoit les opérations une à une : la synchro relit les 4 dernières semaines chaque dimanche et garde 12 mois. Le classement vient de Finary. Pour le changer, crée une règle dans Finary (avec Claude ou dans l'app) : elle reclasse le passé, et le site l'affiche après la synchro suivante. La synchro ne fait que lire Finary.

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
| `DATAGOUV_MCP_URL` | Facultative. Serveur MCP de data.gouv.fr utilisé par l'assistant (par défaut `https://mcp.data.gouv.fr/mcp`). Mettre `off` pour le couper |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Facultatives. Ancienne base DVF, utilisée seulement par le mode `stats` de `/api/dvf`, qu'aucun écran n'appelle |

`NEXT_PUBLIC_AIRTABLE_TOKEN` et `NEXT_PUBLIC_AIRTABLE_BASE_ID` ne servent plus : supprime-les de Vercel.
