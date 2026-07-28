export interface DatabaseConfig {
  provider: 'supabase' | 'sqlite';
}

export function getDatabaseConfig(): DatabaseConfig {
  const provider = (process.env.NEXT_PUBLIC_DB_PROVIDER as 'supabase' | 'sqlite') || 'sqlite';
  return { provider };
}
