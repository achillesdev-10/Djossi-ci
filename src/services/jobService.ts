import type { JobOffer, JobFilters, PaginatedResponse } from '@/types';
import { paginate } from '@/lib/utils';

const MOCK_JOBS: JobOffer[] = Array.from({ length: 12 }, (_, i) => ({
  id: `job-${i + 1}`,
  company_id: `company-${(i % 5) + 1}`,
  title: [
    'Développeur Full Stack Senior',
    'Chef de Projet Marketing',
    'Comptable Senior',
    'Ingénieur Civil',
    'Responsable RH',
    'Data Analyst',
    'Développeur Mobile',
    'Graphiste Senior',
    'Chef de Produit',
    'Responsable Commercial',
    'Analyste Financier',
    'Développeur Backend',
  ][i],
  description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  requirements: 'Expérience requise dans le domaine.',
  location: ['Abidjan, Plateau', 'Abidjan, Cocody', 'Yamoussoukro', 'Bouaké', 'San-Pédro', 'Daloa'][i % 6],
  type: ['CDI', 'CDD', 'Stage', 'Freelance', 'CDI', 'CDI'][i % 6] as JobOffer['type'],
  level: ['Junior', 'Intermédiaire', 'Senior', 'Expert', 'Manager', 'Senior'][i % 6] as JobOffer['level'],
  sector: [
    'IT / Digital',
    'Banque / Finance',
    'BTP / Immobilier',
    'Industrie',
    'Ressources Humaines',
    'Audit / Conseil',
  ][i % 6],
  salary_min: [400000, 600000, 800000, 1000000, 1500000, 700000][i % 6],
  salary_max: [800000, 1200000, 1500000, 2000000, 2500000, 1400000][i % 6],
  salary_currency: 'FCFA',
  salary_period: 'monthly',
  remote: ['no', 'partial', 'full', 'no', 'partial', 'no'][i % 6] as JobOffer['remote'],
  status: 'active',
  published_at: new Date(Date.now() - i * 86400000).toISOString(),
  views_count: 100 + i * 50,
  applications_count: 5 + i * 3,
  created_at: new Date(Date.now() - i * 86400000 * 2).toISOString(),
  updated_at: new Date(Date.now() - i * 86400000).toISOString(),
}));

export class JobService {
  static async getJobs(filters: JobFilters = {}): Promise<PaginatedResponse<JobOffer>> {
    await new Promise((r) => setTimeout(r, 200));
    let jobs = [...MOCK_JOBS].filter((j) => j.status === 'active');

    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(kw) ||
          j.description.toLowerCase().includes(kw) ||
          (j.sector || '').toLowerCase().includes(kw)
      );
    }
    if (filters.location) {
      jobs = jobs.filter((j) => j.location?.toLowerCase().includes(filters.location!.toLowerCase()));
    }
    if (filters.type) {
      jobs = jobs.filter((j) => j.type === filters.type);
    }
    if (filters.level) {
      jobs = jobs.filter((j) => j.level === filters.level);
    }
    if (filters.min_salary) {
      jobs = jobs.filter((j) => (j.salary_max || 0) >= filters.min_salary!);
    }
    if (filters.sector) {
      jobs = jobs.filter((j) => j.sector === filters.sector);
    }

    return paginate(jobs, filters.page || 1, filters.limit || 10);
  }

  static async getJobById(id: string): Promise<JobOffer | null> {
    await new Promise((r) => setTimeout(r, 150));
    return MOCK_JOBS.find((j) => j.id === id) || null;
  }

  static async createJob(data: Omit<JobOffer, 'id' | 'created_at' | 'updated_at' | 'views_count' | 'applications_count' | 'status'>): Promise<JobOffer> {
    await new Promise((r) => setTimeout(r, 300));
    const now = new Date().toISOString();
    const job: JobOffer = {
      ...data,
      id: `job-${Math.random().toString(36).slice(2, 10)}`,
      status: 'active',
      views_count: 0,
      applications_count: 0,
      created_at: now,
      updated_at: now,
    };
    MOCK_JOBS.unshift(job);
    return job;
  }

  static async getRecentJobs(limit: number = 6): Promise<JobOffer[]> {
    const result = await this.getJobs({ limit });
    return result.data;
  }
}
