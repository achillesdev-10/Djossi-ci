-- ============================================================================
--  TravaillerEnCi — SEED : 3 fausses offres d'emploi (Côte d'Ivoire)
--  Fichier : supabase/seed/001_seed_job_offers.sql
--
--  Usage :
--    • Supabase Dashboard > SQL Editor : copier / coller ce fichier
--    • OU via Supabase CLI : `supabase db reset` (ce script auto s'exécute)
-- ============================================================================

-- On ajoute aucune des offres si elles existent déjà (idempotent via titre+company)
INSERT INTO public.job_offers
    (title, company, location, contract_type, description, apply_link, apply_email, source_url, is_verified, created_at)
VALUES
(
    'Développeur Full Stack Senior (React / Node.js)',
    'MTN Côte d''Ivoire',
    'Abidjan - Plateau',
    'CDI',
    $DESC$
**À propos du poste**

Rejoignez l'équipe Digital & Tech de MTN Côte d'Ivoire pour participer à la transformation numérique du leader des télécoms en Côte d'Ivoire. Vous concevrez des applications à fort trafic utilisées par des millions d'abonnés sur le territoire ivoirien (Mobile Money, eShop, support client…).

**Missions principales**
- Concevoir et maintenir des applications web modernes en Next.js / React et Node.js
- Collaborer avec les équipes Produit, Design et Infra pour livrer des features en mode Agile
- Faire de la revue de code, garantir la qualité et les performances
- Participer à l'architecture technique (microservices, APIs GraphQL, Kafka…)

**Profil recherché**
- 4+ années d'expérience en développement Full Stack
- Maîtrise de **React, Next.js, TypeScript, Node.js (Express / Fastify)**
- Expérience avec une base de données relationnelle (PostgreSQL de préférence)
- Connaissance de Docker, CI/CD, cloud AWS / GCP un plus
- Français courant (lu, écrit, parlé). Anglais technique apprécié.

**Avantages**
- Salaire attractif : **2 200 000 à 3 200 000 FCFA / mois** selon profil
- Mutuelle familiale + prévoyance
- Prime de rendement annuelle
- Tickets restaurant + allocation transport
- Possibilité de **télétravail hybride** (3 jours / semaine au siège Plateau)
    $DESC$,
    'https://mtn.ci/recrutement/developpeur-fullstack',
    'recrutement.tech@mtn.ci',
    'https://mtn.ci/recrutement',
    TRUE,
    NOW() - INTERVAL '2 days'
),

(
    'Chef de Projet Marketing Digital',
    'Société Générale Côte d''Ivoire',
    'Abidjan - Cocody Riviera',
    'CDI',
    $DESC$
**Contexte**

La Direction Marketing et Communication de Société Générale Côte d'Ivoire recherche un(e) Chef(fe) de Projet Marketing Digital pour piloter la stratégie digitale de la banque, développer sa présence sur les réseaux sociaux et optimiser le parcours client Omni-Canal.

**Missions**
- Piloter le plan média digital (Meta, Google Ads, TikTok, LinkedIn)
- Optimiser la conversion sur le site institutionnel et les applications mobiles SG
- Animer la communauté SG CI sur les réseaux sociaux (+ contenu sponsorisé)
- Analyser les performances (GA4, HubSpot) et proposer des A/B tests
- Coordonner les partenaires agences externes

**Profil**
- BAC+5 Marketing / École de commerce (ESSEC, ESCAE, INPHB, Groupe LOKO…)
- 3 à 6 ans d'expérience en marketing digital idéalement dans un groupe bancaire ou retail
- Maîtrise de : Facebook Business Manager, Google Ads, GA4, CRM (HubSpot, Salesforce)
- Excellent relationnel, gestion de projets multi-acteurs
- Très bonne aisance rédactionnelle en français

**Rémunération** : **900 000 à 1 400 000 FCFA / mois** + avantages bancaires employés (prêts préférentiels, etc.)
    $DESC$,
    'https://sg.ci/fr/carrieres/offre/chef-projet-marketing-digital',
    NULL,
    'https://www.linkedin.com/jobs/view/sg-ci-chef-projet-marketing',
    TRUE,
    NOW() - INTERVAL '5 days'
),

(
    'Stagiaire Data Analyst (Fin de cycle - Bac+4/5)',
    'Ecobank Côte d''Ivoire',
    'Abidjan - Plateau',
    'Stage',
    $DESC$
**Offre de stage 6 mois — Paiement : 250 000 FCFA / mois + tickets restaurant**

Ecobank Côte d'Ivoire propose un stage de fin d'études au sein de la **Business Intelligence & Data Team**, au siège du Plateau. Vous participerez concrètement à des projets Data au cœur des activités bancaires.

**Rôle du/de la stagiaire**
- Extraire, nettoyer et analyser les données transactionnelles des clients
- Créer des tableaux de bord interactifs (Power BI / Tableau) pour les directions métiers
- Automatiser des rapports réglementaires via SQL et Python
- Contribuer à un projet de scoring crédit

**Profil idéal**
- Étudiant(e) en **Bac+4/5** (Master 2, Cycle ingénieur, École de commerce)
- Spécialisation : Informatique, Statistique, Data Science, Mathématiques appliquées
- Bon niveau en **SQL** (PostgreSQL / Oracle) et **Python** (Pandas, NumPy)
- Première expérience avec Power BI ou Tableau (projets école / perso)
- Anglais technique lu. Français impeccable.

**Modalités**
- Début souhaité : **Septembre 2026** (démarrage flexible de août à octobre)
- Présence 5j/7 au siège Plateau (Abidjan)
- Possibilité d'embauche en CDI à l'issue du stage pour les meilleurs éléments
    $DESC$,
    NULL,
    'stages.data@ecobank.ci',
    'https://career.ecobank.com/cotedivoire',
    FALSE,
    NOW() - INTERVAL '1 day'
)
ON CONFLICT DO NOTHING;

-- Résultat à attendre : 3 offres insérées.
-- Vérification rapide :
-- SELECT id, title, company, location, contract_type, is_verified, created_at
-- FROM public.job_offers
-- ORDER BY created_at DESC;
