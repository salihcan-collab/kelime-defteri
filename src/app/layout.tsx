import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';

export const metadata: Metadata = {
  title: 'Kelime Defteri — Vocabulary Notebook',
  description: 'A digital-notebook English vocabulary learning app with AI-assisted cards, spaced repetition, and quizzes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen font-body antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
