"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Flame, Rocket, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface PriorityBoostModalProps {
  shipmentId: string;
  basePrice: number;
  currentBoost: number;
  onBoostApplied: () => void;
}

export function PriorityBoostModal({ shipmentId, basePrice, currentBoost, onBoostApplied }: PriorityBoostModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calcula los tiers (mínimo $5.000)
  const tier1 = Math.max(5000, Math.round(basePrice * 0.05));
  const tier2 = Math.max(10000, Math.round(basePrice * 0.10));
  const tier3 = Math.max(20000, Math.round(basePrice * 0.20));

  const handleBoost = async (amount: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/shipments/boost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId, boostAmount: amount })
      });
      
      if (!res.ok) throw new Error("Error al procesar el bono");
      
      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(false);
        onBoostApplied();
      }, 2000);
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error al aplicar el bono. Inténtalo de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 hover:text-orange-700">
          <Zap className="h-4 w-4 mr-1 fill-orange-500" />
          Acelerar Búsqueda
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Zap className="h-5 w-5 text-orange-500 fill-orange-500" />
            Acelerar Búsqueda de Conductor
          </DialogTitle>
          <DialogDescription>
            Si tu carga lleva mucho tiempo esperando, puedes agregar un bono voluntario. 
            El 100% de este dinero irá directo al conductor, lo que incentivará a que acepten tu viaje casi de inmediato.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="font-bold text-lg">¡Bono Activado!</h3>
            <p className="text-sm text-muted-foreground">Hemos enviado una alerta a todos los conductores cercanos.</p>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <Button 
              disabled={isLoading}
              onClick={() => handleBoost(tier1)}
              variant="outline" 
              className="h-auto py-4 px-6 flex justify-between items-center border-orange-200 hover:bg-orange-50"
            >
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-full"><Zap className="h-5 w-5 text-orange-600" /></div>
                <div className="text-left">
                  <div className="font-bold">Prioridad Rápida</div>
                  <div className="text-xs text-muted-foreground">Bono sugerido</div>
                </div>
              </div>
              <div className="text-lg font-black text-orange-600">+${tier1.toLocaleString('es-CL')}</div>
            </Button>

            <Button 
              disabled={isLoading}
              onClick={() => handleBoost(tier2)}
              variant="outline" 
              className="h-auto py-4 px-6 flex justify-between items-center border-red-200 hover:bg-red-50"
            >
              <div className="flex items-center gap-3">
                <div className="bg-red-100 p-2 rounded-full"><Flame className="h-5 w-5 text-red-600" /></div>
                <div className="text-left">
                  <div className="font-bold">Prioridad Urgente</div>
                  <div className="text-xs text-muted-foreground">Alta visibilidad</div>
                </div>
              </div>
              <div className="text-lg font-black text-red-600">+${tier2.toLocaleString('es-CL')}</div>
            </Button>

            <Button 
              disabled={isLoading}
              onClick={() => handleBoost(tier3)}
              variant="outline" 
              className="h-auto py-4 px-6 flex justify-between items-center border-blue-200 hover:bg-blue-50"
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-full"><Rocket className="h-5 w-5 text-blue-600" /></div>
                <div className="text-left">
                  <div className="font-bold">Prioridad Emergencia</div>
                  <div className="text-xs text-muted-foreground">La carga número 1 del sistema</div>
                </div>
              </div>
              <div className="text-lg font-black text-blue-600">+${tier3.toLocaleString('es-CL')}</div>
            </Button>
            
            {isLoading && (
              <div className="flex items-center justify-center text-sm text-muted-foreground mt-2">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando pago...
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-1">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button disabled={isLoading} variant="ghost" onClick={() => setIsOpen(false)} className="mt-2">
              Seguir buscando normal (Sin costo extra)
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
