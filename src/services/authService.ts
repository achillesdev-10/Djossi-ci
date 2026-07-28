import type { User, UserRole, Candidate, Company } from '@/types';

export interface AuthState {
  user: User | null;
  profile: Candidate | Company | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCandidateData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface RegisterEmployerData {
  email: string;
  password: string;
  company_name: string;
  phone?: string;
}

export class AuthService {
  private static KEY = 'djossi_auth_state';

  static getInitialState(): AuthState {
    if (typeof window === 'undefined') {
      return { user: null, profile: null, isLoading: false, isAuthenticated: false };
    }
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return { user: null, profile: null, isLoading: false, isAuthenticated: false };
      return JSON.parse(raw) as AuthState;
    } catch {
      return { user: null, profile: null, isLoading: false, isAuthenticated: false };
    }
  }

  private static persist(state: AuthState) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.KEY, JSON.stringify(state));
  }

  static async login(credentials: LoginCredentials, role: UserRole): Promise<AuthState> {
    await new Promise((r) => setTimeout(r, 600));
    if (!credentials.email || !credentials.password) {
      throw new Error('Identifiants invalides');
    }
    const now = new Date().toISOString();
    const user: User = {
      id: `user-${Math.random().toString(36).slice(2, 10)}`,
      email: credentials.email,
      role,
      first_name: role === 'candidate' ? 'Jean' : undefined,
      last_name: role === 'candidate' ? 'Kouassi' : undefined,
      created_at: now,
      updated_at: now,
    };
    const profile: Candidate | Company | null =
      role === 'candidate'
        ? {
            id: `cand-${user.id}`,
            user_id: user.id,
            title: 'Développeur Full Stack',
            location: 'Abidjan',
            skills: ['React', 'Node.js', 'TypeScript'],
            experience_years: 3,
            created_at: now,
            updated_at: now,
          }
        : role === 'employer'
        ? {
            id: `co-${user.id}`,
            name: 'Ma Société',
            size: '11-50',
            verified: false,
            created_at: now,
            updated_at: now,
          }
        : null;

    const state: AuthState = {
      user,
      profile,
      isLoading: false,
      isAuthenticated: true,
    };
    this.persist(state);
    return state;
  }

  static async registerCandidate(data: RegisterCandidateData): Promise<AuthState> {
    await new Promise((r) => setTimeout(r, 800));
    const now = new Date().toISOString();
    const user: User = {
      id: `user-${Math.random().toString(36).slice(2, 10)}`,
      email: data.email,
      role: 'candidate',
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      created_at: now,
      updated_at: now,
    };
    const profile: Candidate = {
      id: `cand-${user.id}`,
      user_id: user.id,
      created_at: now,
      updated_at: now,
    };
    const state: AuthState = {
      user,
      profile,
      isLoading: false,
      isAuthenticated: true,
    };
    this.persist(state);
    return state;
  }

  static async registerEmployer(data: RegisterEmployerData): Promise<AuthState> {
    await new Promise((r) => setTimeout(r, 800));
    const now = new Date().toISOString();
    const user: User = {
      id: `user-${Math.random().toString(36).slice(2, 10)}`,
      email: data.email,
      role: 'employer',
      phone: data.phone,
      created_at: now,
      updated_at: now,
    };
    const profile: Company = {
      id: `co-${user.id}`,
      user_id: user.id,
      name: data.company_name,
      verified: false,
      created_at: now,
      updated_at: now,
    };
    const state: AuthState = {
      user,
      profile,
      isLoading: false,
      isAuthenticated: true,
    };
    this.persist(state);
    return state;
  }

  static async logout(): Promise<void> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.KEY);
  }
}
