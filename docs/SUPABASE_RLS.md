# Configuration de la Sécurité & RLS (Row Level Security) sur Supabase

Ce document détaille les requêtes SQL à exécuter dans l'éditeur SQL de votre tableau de bord Supabase pour sécuriser la table `job_offers` de Djossi.ci.

## 1. Activation de la RLS (Row Level Security)

Exécutez la commande suivante pour activer la sécurité au niveau des lignes sur la table `job_offers` :

```sql
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
```

## 2. Politique de Lecture Publique (`SELECT`)

Tout le monde (visiteurs non authentifiés et authentifiés) doit pouvoir lire et rechercher les offres d'emploi :

```sql
CREATE POLICY "Lecture publique des offres d'emploi"
ON job_offers
FOR SELECT
USING (true);
```

## 3. Politique d'Écriture Protégée (INSERT / UPDATE / DELETE)

L'insertion, la modification et la suppression d'offres d'emploi sont strictement réservées au rôle service (utilisé par le scraper Python via `SUPABASE_SERVICE_ROLE_KEY` et les routes API admin sécurisées) :

```sql
CREATE POLICY "Écriture réservée au service role"
ON job_offers
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
```

---

## Vérification de la Sécurité des Clés

- **`SUPABASE_URL`** et **`SUPABASE_ANON_KEY`** : Peuvent être exposées publiquement (côté client).
- **`SUPABASE_SERVICE_ROLE_KEY`** : Possède les privilèges administrateur complets (contourne la RLS). Elle ne doit **JAMAIS** être importée ou utilisée dans un composant client Next.js (`"use client"`). Utilisez-la uniquement dans les scripts Python d'automatisation (GitHub Actions) ou dans des API Routes serveur sécurisées.
