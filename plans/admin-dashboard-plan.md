# Plan d'implémentation du Tableau de Bord Administrateur Sécurisé

Ce document décrit l'architecture et les étapes pour la création du tableau de bord administrateur sous `/app/admin` pour **Djossi.ci**.

## 1. Structure des dossiers et fichiers

- `/app/admin/layout.tsx` : Layout général incluant le composant [`AdminSidebar.tsx`](src/components/admin/AdminSidebar.tsx), la barre supérieure avec profil et déconnexion, et la vérification d'authentification et du rôle `admin`.
- `/app/admin/page.tsx` : Page d'accueil / Vue d'ensemble avec cartes statistiques (Nombre total d'offres, Offres vérifiées, Offres du jour) et graphique d'activité (tendances par jour/semaine).
- `/app/admin/jobs/page.tsx` : Gestion des offres d'emploi (tableau interactif, filtres par statut / recherche, bascule `is_verified` en un clic, suppression et édition).
- `/app/admin/scraper/page.tsx` : Page de pilotage et configuration du scraper.
- `/app/admin/settings/page.tsx` : Page des paramètres de la plateforme.
- `/app/admin/login/page.tsx` : Page de connexion administrateur sécurisée (si non déjà présente ou renforcée).

## 2. Sécurité et Middleware

- Utilisation du middleware existant (`middleware.ts`) et de [`src/lib/adminSession.ts`](src/lib/adminSession.ts) pour vérifier que la session active possède le rôle `admin`.
- Protection des routes API sous `/api/admin/*` pour s'assurer qu'aucune action (modification, suppression, bascule de statut) n'est réalisable sans rôle administrateur authentifié.

## 3. Composants et UI

- Design cohérent utilisant **Tailwind CSS** et des composants modernes (Shadcn/UI-like avec cartes, badges, boutons interactifs et icônes SVG).
- Graphique d'activité sous forme de composant interactif SVG ou barres stylisées CSS pour visualiser l'activité des offres sur les 7 derniers jours.
- Tableau interactif avec pagination, tri et filtres de recherche instantanée.

## 4. Étapes de réalisation

1. Rédiger ce plan.
2. Élaborer les fichiers de layout et de pages admin sous `src/app/admin/`.
3. Valider la logique de session et les routes API correspondantes.
