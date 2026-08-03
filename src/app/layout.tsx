import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import AppShell from '@/components/layout/AppShell';
import AnalyticsTracker from '@/components/analytics/AnalyticsTracker';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'TravaillerenCi - Offres d\'emploi en Côte d\'Ivoire',
    template: '%s | TravaillerenCi',
  },
  description: 'Trouvez votre emploi de rêve en Côte d\'Ivoire. Découvrez des milliers d\'offres d\'emploi, des stages et des opportunités professionnelles.',
  keywords: ['emploi', 'côte d\'ivoire', 'jobs', 'offres d\'emploi', 'travail', 'abidjan', 'carrière', 'recrutement'],
  authors: [{ name: 'TravaillerenCi Team' }],
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_CI',
    url: 'https://travaillerenci.ci',
    siteName: 'TravaillerenCi',
    title: 'TravaillerenCi - Offres d\'emploi en Côte d\'Ivoire',
    description: 'Trouvez votre emploi de rêve en Côte d\'Ivoire.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TravaillerenCi - Offres d\'emploi en Côte d\'Ivoire',
    description: 'Trouvez votre emploi de rêve en Côte d\'Ivoire.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('travaillerenci_theme');
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (stored === 'dark' || (!stored && prefersDark)) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-background dark:bg-slate-950 dark:text-gray-100 transition-colors">
        <AnalyticsTracker />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
