export type ContentCategory = 'job' | 'internship' | 'scholarship' | 'exam';

export type ContentStatus = 'pending' | 'published' | 'rejected' | 'archived';

export type ExamType = 'concours_entree' | 'concours_fonction_publique' | 'recrutement';

export interface BaseContent {
  id: string;
  title: string;
  description: string;
  category: ContentCategory;
  source_url: string | null;
  source_website: string | null;
  apply_link: string | null;
  apply_email: string | null;
  deadline: string | null;
  location: string | null;
  eligibility: string | null;
  requirements?: string[];
  benefits?: string[];
  status: ContentStatus;
  is_verified: boolean;
  is_archived: boolean;
  is_expired: boolean;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  slug: string | null;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
}

export interface JobOffer extends BaseContent {
  category: 'job';
  company: string;
  contract_type: string | null;
  experience: string | null;
  salary: string | null;
  currency: string | null;
  education: string | null;
  is_remote: boolean;
}

export interface InternshipOffer extends BaseContent {
  category: 'internship';
  company: string;
  contract_type: string | null;
  experience: string | null;
  start_date: string | null;
  duration_weeks: number | null;
  is_paid: boolean;
}

export interface Scholarship extends BaseContent {
  category: 'scholarship';
  funding_body: string;
  program_level: string | null;
  field_of_study: string | null;
  country_host: string | null;
  funding_value: string | null;
  application_url: string | null;
}

export interface AdministrativeExam extends BaseContent {
  category: 'exam';
  organizing_body: string;
  exam_type: ExamType;
  positions_count: number | null;
  exam_date: string | null;
  registration_fee: string | null;
  exam_centers: string[];
}

export interface PaginatedRows<T> {
  rows: T[];
  total: number;
}

export type AnyContent = JobOffer | InternshipOffer | Scholarship | AdministrativeExam;
