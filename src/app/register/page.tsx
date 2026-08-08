import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center px-4 py-12 text-gray-900 dark:text-slate-50 transition-colors">
      <RegisterForm />
    </main>
  );
}
