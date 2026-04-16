'use client';

import { Inter } from 'next/font/google';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw } from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es" className={inter.className}>
      <body className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="flex justify-center">
            <div className="p-4 bg-destructive/10 rounded-full">
              <AlertCircle className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Error Crítico</h2>
            <p className="text-muted-foreground">
              Ha ocurrido un error crítico en la aplicación.
            </p>
          </div>
          
          {error.message && (
            <div className="p-4 bg-muted rounded-lg text-left overflow-auto max-h-40">
              <p className="text-xs font-mono break-all">{error.message}</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => reset()} className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" />
              Reintentar
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Volver al inicio
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
