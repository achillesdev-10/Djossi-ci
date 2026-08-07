import { ExamService } from '@/services/examService';
import ExamsAdminClient from './ExamsAdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminExamsPage() {
  const [result, stats] = await Promise.all([
    ExamService.list({ limit: 200, order_by: 'created_at', order_dir: 'desc' }),
    ExamService.getAdminStats(),
  ]);

  return <ExamsAdminClient initialExams={result.rows} initialStats={stats} />;
}
