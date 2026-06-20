import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import SupabaseProvider from "@/components/providers/supabase-provider";
import ErrorBoundary from "@/components/error-boundary";

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vorian Logistics',
  description: 'Sistema Operativo de Transporte',
  icons: {
    icon: '/favicon.ico?v=1',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Preload logo so browser fetches it at HTML parse time, not after JS boots */}
        <link rel="preload" href="/vorian.svg" as="image" type="image/svg+xml" />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorBoundary>
            <SupabaseProvider>{children}</SupabaseProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
