import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';
import AppShell from '@/components/layout/AppShell';

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
    default: 'Djossi.ci - Offres d\'emploi en Côte d\'Ivoire',
    template: '%s | Djossi.ci',
  },
  description: 'Trouvez votre emploi de rêve en Côte d\'Ivoire. Découvrez des milliers d\'offres d\'emploi, des stages et des opportunités professionnelles.',
  keywords: ['emploi', 'côte d\'ivoire', 'jobs', 'offres d\'emploi', 'travail', 'abidjan', 'carrière', 'recrutement'],
  authors: [{ name: 'Djossi.ci Team' }],
  openGraph: {
    type: 'website',
    locale: 'fr_CI',
    url: 'https://djossi.ci',
    siteName: 'Djossi.ci',
    title: 'Djossi.ci - Offres d\'emploi en Côte d\'Ivoire',
    description: 'Trouvez votre emploi de rêve en Côte d\'Ivoire.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Djossi.ci - Offres d\'emploi en Côte d\'Ivoire',
    description: 'Trouvez votre emploi de rêve en Côte d\'Ivoire.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${poppins.variable}`}>
      <body className="min-h-screen flex flex-col bg-background">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
