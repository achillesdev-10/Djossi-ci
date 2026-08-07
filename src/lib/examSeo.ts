/**
 *  TravaillerEnCi — Contenus SEO uniques des pages « portes d'entrée » concours
 *  /concours/categorie/[category] et /concours/diplome/[diplome]
 *
 *  Règle anti-duplication (PARTIE 2 — §2.6) : chaque texte introductif est
 *  rédigé ici à la main, en propre, pour capter des requêtes de type
 *  « concours administratif BEPC Côte d'Ivoire » — jamais un copier-coller de
 *  la source officielle.
 */
import type { ExamCategory } from '@/types/exam';

export interface CategorySeo {
  category: ExamCategory;
  /** H1 de la page d'atterrissage. */
  title: string;
  /** <title> (sans le suffixe « | TravaillerenCi »). */
  metaTitle: string;
  description: string;
  /** Paragraphes introductifs uniques (contenu éditorial propre). */
  intro: string[];
  keywords: string[];
  /** Organisateurs emblématiques de la catégorie (crédibilité + contexte). */
  examples: string[];
}

export const CATEGORY_SEO: Record<ExamCategory, CategorySeo> = {
  administratif: {
    category: 'administratif',
    title: 'Concours administratifs en Côte d’Ivoire',
    metaTitle: 'Concours administratifs en Côte d’Ivoire',
    description:
      'Tous les concours administratifs de la fonction publique ivoirienne : ENA, guichet unique GUCACI, recrutements nouveaux et promotions. Dates, diplômes requis, âge limite et lien officiel.',
    intro: [
      'Les concours administratifs sont organisés chaque année par le Ministère de la Fonction Publique et de la Modernisation de l’Administration, principalement via le guichet unique GUCACI. Ils donnent accès aux emplois de l’administration centrale et déconcentrée, du grade A4 aux grades supérieurs.',
      'Sur cette page, vous trouverez les avis officiels en cours : recrutements nouveaux et concours de promotion, avec les périodes d’inscription, les conditions d’âge, la liste des diplômes acceptés et les frais de dossier. Chaque fiche renvoie vers le communiqué officiel pour candidater en toute sécurité.',
    ],
    keywords: [
      'concours administratifs',
      'fonction publique ivoirienne',
      'GUCACI',
      'ENA',
      'concours ENA',
      'recrutement fonction publique CI',
    ],
    examples: ['Ministère de la Fonction Publique', 'ENA', 'GUCACI'],
  },
  sante: {
    category: 'sante',
    title: 'Concours de la santé en Côte d’Ivoire',
    metaTitle: 'Concours de la santé en Côte d’Ivoire (INFAS, INSFS…)',
    description:
      'Concours des écoles de santé ivoiriennes : INFAS, INSFS, filières infirmier, sage-femme, laborantin. Préinscriptions en ligne, diplômes requis et dates des épreuves.',
    intro: [
      'Les concours du secteur de la santé sont pilotés par les instituts de formation nationaux : l’INFAS (agents de santé), l’INSFS (formation sociale) et d’autres écoles paramédicales. Ils ouvrent chaque année, généralement en fin d’été, des centaines de places dans les filières infirmier, sage-femme, laborantin ou technicien supérieur de santé.',
      'Retrouvez ici les avis de concours en vigueur avec le calendrier des préinscriptions en ligne, les filières accessibles selon votre diplôme (BEPC, BAC, BTS…) et les conditions d’âge. Les inscriptions se font exclusivement sur les plateformes officielles référencées dans chaque fiche.',
    ],
    keywords: [
      'concours INFAS',
      'concours santé Côte d’Ivoire',
      'infirmier',
      'sage-femme',
      'INSFS',
      'concours paramédical CI',
    ],
    examples: ['INFAS', 'INSFS', 'écoles paramédicales'],
  },
  enseignement: {
    category: 'enseignement',
    title: 'Concours de l’enseignement en Côte d’Ivoire',
    metaTitle: 'Concours de l’enseignement (CAFOP, éducation nationale)',
    description:
      'Concours CAFOP pour instituteurs, recrutements d’enseignants et d’éducateurs : dates d’inscription, diplômes requis (BEPC, BAC…) et résultats par tour.',
    intro: [
      'Le Ministère de l’Éducation Nationale et de l’Alphabétisation recrute chaque année des instituteurs et des enseignants par concours, dont le célèbre concours CAFOP (Centres d’Animation et de Formation Pédagogique). Les inscriptions passent par la plateforme DECO et se font généralement en plusieurs tours.',
      'Cette page rassemble les concours de l’enseignement ouverts en Côte d’Ivoire : instituteurs adjoints, éducateurs, conseillers d’orientation. Vous y trouverez le niveau de diplôme exigé (BEPC, BAC), la tranche d’âge et le calendrier des épreuves et des résultats.',
    ],
    keywords: [
      'concours CAFOP',
      'concours enseignement CI',
      'instituteur',
      'recrutement enseignants Côte d’Ivoire',
      'DECO',
      'éducation nationale',
    ],
    examples: ['CAFOP / DECO', 'Ministère de l’Éducation Nationale', 'MEN'],
  },
  securite: {
    category: 'securite',
    title: 'Concours de la sécurité en Côte d’Ivoire',
    metaTitle: 'Concours de la sécurité (police, douane, eaux et forêts)',
    description:
      'Recrutements de la police, de la douane et des eaux et forêts : dates d’inscription, conditions d’âge et de diplôme, épreuves physiques et écrites.',
    intro: [
      'La police nationale, la douane et les eaux et forêts organisent régulièrement des concours de recrutement pour renforcer leurs effectifs. Ces concours combinent épreuves écrites, épreuves physiques et visites médicales, avec des conditions d’âge et de diplôme strictes.',
      'Suivez sur cette page les avis de recrutement en cours du secteur de la sécurité : gardiens de la paix, agents de la douane, agents des eaux et forêts. Chaque fiche détaille la période d’inscription, le diplôme minimum exigé et le lien officiel pour candidater.',
    ],
    keywords: [
      'concours police CI',
      'concours douane Côte d’Ivoire',
      'gardien de la paix',
      'eaux et forêts',
      'recrutement sécurité ivoirienne',
    ],
    examples: ['Police Nationale', 'Douanes ivoiriennes', 'Eaux et Forêts'],
  },
  militaire: {
    category: 'militaire',
    title: 'Concours militaires en Côte d’Ivoire',
    metaTitle: 'Concours militaires (armée, gendarmerie, AFA Zambakro)',
    description:
      'Recrutements de l’armée ivoirienne et de la gendarmerie : AFA Zambakro, ENSOA, sous-officiers. Dates, conditions d’âge et de diplôme, inscriptions en ligne.',
    intro: [
      'L’armée de terre et la gendarmerie nationale recrutent chaque année des soldats et des sous-officiers par concours. Les inscriptions se font exclusivement en ligne sur les plateformes officielles du Ministère de la Défense, notamment pour l’AFA Zambakro et l’ENSOA.',
      'Consultez ici les concours militaires ouverts : conditions d’âge (généralement entre 18 et 25 ans), diplôme exigé (BEPC, BAC), calendrier des épreuves physiques et écrites. Les modalités détaillées figurent dans le communiqué officiel de chaque fiche.',
    ],
    keywords: [
      'concours militaires CI',
      'gendarmerie ivoirienne',
      'AFA Zambakro',
      'ENSOA',
      'recrutement armée Côte d’Ivoire',
    ],
    examples: ['Ministère de la Défense', 'Gendarmerie Nationale', 'AFA Zambakro'],
  },
  autre: {
    category: 'autre',
    title: 'Autres concours et examens en Côte d’Ivoire',
    metaTitle: 'Autres concours et examens professionnels en Côte d’Ivoire',
    description:
      'Concours d’entrée aux grandes écoles et autres recrutements publics : INJS, concours professionnels, examens d’admission. Dates et conditions sur chaque fiche.',
    intro: [
      'Au-delà des concours administratifs, militaires et de la santé, de nombreux instituts publics organisent des concours d’entrée : l’INJS (jeunesse et sports), les écoles de formation professionnelle, ou encore les concours professionnels d’avancement.',
      'Cette page regroupe les autres concours et examens publiés sur TravaillerEnCi : concours d’entrée aux grandes écoles, concours professionnels, examens d’admission. Retrouvez pour chacun les dates clés, les diplômes acceptés et le lien vers le communiqué officiel.',
    ],
    keywords: [
      'concours INJS',
      'grandes écoles CI',
      'concours professionnels',
      'examens d’admission',
      'concours d’entrée Côte d’Ivoire',
    ],
    examples: ['INJS', 'grandes écoles', 'instituts publics'],
  },
};

export interface DiplomaSeo {
  /** Segment d'URL (ex: « cap-bep »). */
  slug: string;
  /** Valeur exacte utilisée pour le filtrage (ex: « CAP/BEP »). */
  value: string;
  label: string;
  /** Niveau sur l'échelle 1..8 (miroir de DIPLOMA_LEVELS). */
  level: number;
  title: string;
  metaTitle: string;
  description: string;
  intro: string[];
  keywords: string[];
}

export const DIPLOMA_SEO: DiplomaSeo[] = [
  {
    slug: 'cepe',
    value: 'CEPE',
    label: 'CEPE',
    level: 1,
    title: 'Concours accessibles avec le CEPE',
    metaTitle: 'Concours accessibles avec le CEPE en Côte d’Ivoire',
    description:
      'Les concours et recrutements accessibles avec le certificat d’études primaires (CEPE) en Côte d’Ivoire : dates d’inscription, conditions d’âge et diplômes.',
    intro: [
      'Le Certificat d’Études Primaires et Élémentaires (CEPE) est le premier diplôme du cursus scolaire ivoirien. Quelques concours de recrutement de la fonction publique l’acceptent comme condition minimale, principalement dans les corps d’exécution.',
      'Cette page liste les concours ouverts aux titulaires du CEPE. Vérifiez sur chaque fiche les conditions d’âge et les éventuels diplômes complémentaires exigés avant de vous inscrire.',
    ],
    keywords: ['concours CEPE', 'concours niveau CEPE CI', 'recrutement CEPE Côte d’Ivoire'],
  },
  {
    slug: 'bepc',
    value: 'BEPC',
    label: 'BEPC',
    level: 2,
    title: 'Concours accessibles avec le BEPC',
    metaTitle: 'Concours accessibles avec le BEPC en Côte d’Ivoire',
    description:
      'Les concours ouverts aux titulaires du BEPC en Côte d’Ivoire : CAFOP, gendarmerie, sous-officiers, gardiens de la paix. Dates, âge limite et lien officiel.',
    intro: [
      'Le Brevet d’Études du Premier Cycle (BEPC) ouvre la porte à de nombreux concours de la fonction publique ivoirienne : le concours CAFOP pour devenir instituteur, les recrutements de la gendarmerie et des sous-officiers, ou encore les gardiens de la paix.',
      'Tous les avis de concours acceptant le BEPC sont rassemblés sur cette page, avec les périodes d’inscription, les tranches d’âge et les modalités de candidature. Les inscriptions se font toujours sur les plateformes officielles citées dans chaque fiche.',
    ],
    keywords: [
      'concours BEPC',
      'concours niveau BEPC Côte d’Ivoire',
      'concours CAFOP BEPC',
      'gendarmerie BEPC',
    ],
  },
  {
    slug: 'cap-bep',
    value: 'CAP/BEP',
    label: 'CAP / BEP',
    level: 3,
    title: 'Concours accessibles avec un CAP ou un BEP',
    metaTitle: 'Concours accessibles avec un CAP / BEP en Côte d’Ivoire',
    description:
      'Concours et recrutements ouverts aux titulaires d’un certificat d’aptitude professionnelle (CAP) ou d’un brevet d’études professionnelles (BEP) en Côte d’Ivoire.',
    intro: [
      'Les titulaires d’un CAP ou d’un BEP, diplômes de l’enseignement professionnel, peuvent accéder à plusieurs concours techniques de l’administration ivoirienne, notamment dans les corps d’exécution et les filières métiers.',
      'Cette page regroupe les concours acceptant le CAP ou le BEP. Consultez chaque fiche pour connaître les conditions d’âge, les spécialités recherchées et le calendrier des inscriptions.',
    ],
    keywords: ['concours CAP BEP', 'concours professionnel CI', 'CAP BEP fonction publique'],
  },
  {
    slug: 'bac',
    value: 'BAC',
    label: 'BAC',
    level: 4,
    title: 'Concours accessibles avec le BAC',
    metaTitle: 'Concours accessibles avec le BAC en Côte d’Ivoire',
    description:
      'Les concours ouverts aux bacheliers en Côte d’Ivoire : ENA, INFAS, AFA Zambakro, douane, police. Dates d’inscription, diplômes et âge limite.',
    intro: [
      'Le baccalauréat est le diplôme le plus demandé par les concours ivoiriens : l’ENA (cycle moyen), l’INFAS pour les filières de santé, l’AFA Zambakro pour l’armée, ou encore la douane et la police recrutent chaque année des bacheliers.',
      'Retrouvez ici tous les concours accessibles avec le BAC, avec leurs dates d’inscription, les conditions d’âge et les frais de dossier. Chaque fiche pointe vers le communiqué officiel pour candidater dans les règles.',
    ],
    keywords: [
      'concours BAC',
      'concours niveau BAC Côte d’Ivoire',
      'concours ENA BAC',
      'concours INFAS BAC',
    ],
  },
  {
    slug: 'bts-dut',
    value: 'BTS/DUT',
    label: 'BTS / DUT',
    level: 5,
    title: 'Concours accessibles avec un BTS ou un DUT',
    metaTitle: 'Concours accessibles avec un BTS / DUT en Côte d’Ivoire',
    description:
      'Concours et recrutements ouverts aux titulaires d’un BTS ou d’un DUT en Côte d’Ivoire : filières techniques et administratives de la fonction publique.',
    intro: [
      'Le BTS et le DUT sont des diplômes de l’enseignement supérieur court très prisés par l’administration ivoirienne pour les emplois techniques : agents techniques de la santé, techniciens de la fonction publique, corps intermédiaires.',
      'Cette page rassemble les concours acceptant le BTS ou le DUT. Vérifiez dans chaque fiche la spécialité exigée, les conditions d’âge et les dates des épreuves.',
    ],
    keywords: ['concours BTS DUT', 'concours BTS Côte d’Ivoire', 'technicien fonction publique CI'],
  },
  {
    slug: 'licence',
    value: 'LICENCE',
    label: 'Licence',
    level: 6,
    title: 'Concours accessibles avec une Licence',
    metaTitle: 'Concours accessibles avec une Licence en Côte d’Ivoire',
    description:
      'Les concours de la fonction publique ivoirienne ouverts aux titulaires d’une licence (Bac+3) : ENA cycle supérieur, recrutements des cadres A. Dates et conditions.',
    intro: [
      'La licence (Bac+3) donne accès aux concours de catégorie A de la fonction publique ivoirienne, notamment les concours d’entrée à l’ENA pour le cycle supérieur et les recrutements de cadres administratifs et techniques.',
      'Cette page liste les concours accessibles avec une licence : conditions d’âge, spécialités requises et calendrier des inscriptions. Les modalités officielles figurent sur le communiqué de chaque concours.',
    ],
    keywords: ['concours licence', 'concours Bac+3 CI', 'concours ENA licence', 'cadre fonction publique'],
  },
  {
    slug: 'master',
    value: 'MASTER',
    label: 'Master',
    level: 7,
    title: 'Concours accessibles avec un Master',
    metaTitle: 'Concours accessibles avec un Master en Côte d’Ivoire',
    description:
      'Concours des cadres supérieurs ouverts aux titulaires d’un master (Bac+5) : ENA cycle supérieur, recrutements de niveau A+, concours professionnels.',
    intro: [
      'Le master (Bac+5) ouvre les concours les plus sélectifs de l’administration ivoirienne : l’ENA en cycle supérieur, les recrutements de cadres de haut niveau et certains concours professionnels réservés aux agents en poste.',
      'Cette page rassemble les concours accessibles avec un master. Pour chaque fiche, retrouvez les conditions d’âge, les filières demandées et le lien vers l’avis officiel.',
    ],
    keywords: ['concours master', 'concours Bac+5 CI', 'ENA cycle supérieur', 'cadre supérieur CI'],
  },
  {
    slug: 'doctorat',
    value: 'DOCTORAT',
    label: 'Doctorat',
    level: 8,
    title: 'Concours accessibles avec un Doctorat',
    metaTitle: 'Concours accessibles avec un Doctorat en Côte d’Ivoire',
    description:
      'Recrutements et concours ouverts aux titulaires d’un doctorat en Côte d’Ivoire : enseignement supérieur, recherche, fonctions d’expertise.',
    intro: [
      'Le doctorat est le plus haut diplôme du cursus. En Côte d’Ivoire, il donne accès aux carrières de l’enseignement supérieur, de la recherche et aux postes d’expertise de la fonction publique.',
      'Cette page regroupe les opportunités de concours et recrutements accessibles avec un doctorat, avec leurs conditions spécifiques et leurs dates clés.',
    ],
    keywords: ['concours doctorat', 'recrutement enseignement supérieur CI', 'recherche Côte d’Ivoire'],
  },
];

export const DIPLOMA_SEO_BY_SLUG: Record<string, DiplomaSeo> = Object.fromEntries(
  DIPLOMA_SEO.map((d) => [d.slug, d]),
);
