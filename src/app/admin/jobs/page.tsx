import { JobOfferSchemaService } from '@/services/jobOfferSchemaService';
import AdminJobsClient from './AdminJobsClient';

export const dynamic = 'force-dynamic';

export default async function AdminJobsPage() {
  const result = await JobOfferSchemaService.list({ limit: 200, order_by: 'created_at', order_dir: 'desc' });

  return <AdminJobsClient initialJobs={result.rows} />;
}
