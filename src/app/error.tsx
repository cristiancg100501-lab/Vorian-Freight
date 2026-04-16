'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex justify-center">
          <div className="p-4 bg-destructive/10 rounded-full">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">¡Ups! Algo salió mal</h2>
          <p className="text-muted-foreground">
            Ha ocurrido un error inesperado. Por favor, intenta recargar la página.
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
    </div>
  );
}
