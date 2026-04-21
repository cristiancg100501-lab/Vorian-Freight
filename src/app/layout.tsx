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
        <link
          href="https://api.mapbox.com/mapbox-gl-js/v3.2.0/mapbox-gl.css"
          rel="stylesheet"
        />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
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
