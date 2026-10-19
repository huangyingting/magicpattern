import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Magic Patterns — AI Design, Prototyping & MagicOS Platform',
  description:
    'Design, prototype, and ship production-ready UI components, Slide Decks, Design Systems, and MagicOS infinite canvases.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
