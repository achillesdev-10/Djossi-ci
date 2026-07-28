import type { Company } from '@/types';
import { paginate } from '@/lib/utils';
import type { PaginationParams, PaginatedResponse } from '@/types';

const MOCK_COMPANIES: Company[] = Array.from({ length: 8 }, (_, i) => ({
  id: `company-${i + 1}`,
  name: [
    'MTN Côte d\'Ivoire',
    'Société Générale CI',
    'PwC Côte d\'Ivoire',
    'Bouygues Bâtiment',
    'CFAO Motors',
    'Ecobank Côte d\'Ivoire',
    'Orange Côte d\'Ivoire',
    'Nestlé Côte d\'Ivoire',
  ][i],
  description: 'Entreprise leader dans son secteur d\'activité en Côte d\'Ivoire.',
  industry: [
    'Télécoms / IT',
    'Banque / Finance',
    'Audit / Conseil',
    'BTP / Immobilier',
    'Automobile',
    'Banque / Finance',
    'Télécoms / IT',
    'Agroalimentaire',
  ][i],
  size: ['501-1000', '501-1000', '201-500', '1000+', '51-200', '1000+', '1000+', '1000+'][i] as Company['size'],
  location: ['Abidjan, Plateau', 'Abidjan, Cocody', 'Abidjan, Plateau', 'Abidjan, Port-Bouët', 'Yamoussoukro', 'Abidjan, Cocody', 'Abidjan, Cocody', 'Abidjan, Vridi'][i],
  website_url: `https://example${i + 1}.ci`,
  verified: true,
  founded_year: [1996, 1999, 2001, 1985, 2005, 1990, 2002, 1991][i],
  email: `contact@company${i + 1}.ci`,
  phone: `+225 20 ${String(20 + i).padStart(2, '0')} 00 00`,
  created_at: new Date(Date.now() - i * 86400000 * 30).toISOString(),
  updated_at: new Date(Date.now() - i * 86400000 * 10).toISOString(),
}));

export class CompanyService {
  static async getCompanies(params: PaginationParams = {}): Promise<PaginatedResponse<Company>> {
    await new Promise((r) => setTimeout(r, 150));
    return paginate(MOCK_COMPANIES, params.page || 1, params.limit || 12);
  }

  static async getCompanyById(id: string): Promise<Company | null> {
    await new Promise((r) => setTimeout(r, 100));
    return MOCK_COMPANIES.find((c) => c.id === id) || null;
  }

  static async getTopCompanies(limit: number = 6): Promise<Company[]> {
    await new Promise((r) => setTimeout(r, 100));
    return MOCK_COMPANIES.slice(0, limit);
  }
}
