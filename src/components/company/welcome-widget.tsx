"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Truck, Users, Activity } from "lucide-react";
import confetti from "canvas-confetti";

export function WelcomeWidget() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if the user has already seen the welcome message
    const hasSeenWelcome = localStorage.getItem("vorian_welcome_seen");
    
    if (hasSeenWelcome !== "true") {
      // Small delay for better UX (let the dashboard load first)
      const timer = setTimeout(() => {
        setIsOpen(true);
        // Trigger confetti for that premium feel
        const duration = 3 * 1000;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 5,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#000000', '#ffffff', '#3b82f6'] // Vorian aesthetic colors
          });
          confetti({
            particleCount: 5,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#000000', '#ffffff', '#3b82f6']
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        frame();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("vorian_welcome_seen", "true");
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0">
        <div className="relative h-40 bg-gradient-to-br from-blue-600 via-blue-800 to-black p-6 flex flex-col justify-end text-white">
          <div className="absolute top-4 right-4">
            <CheckCircle2 className="w-12 h-12 text-white/20" />
          </div>
          <DialogTitle className="text-2xl font-bold mb-1">¡Bienvenido a Vorian!</DialogTitle>
          <DialogDescription className="text-blue-100 text-sm">
            Tu cuenta ha sido aprobada oficialmente.
          </DialogDescription>
        </div>
        
        <div className="p-6 space-y-6 bg-background">
          <p className="text-muted-foreground leading-relaxed">
            Es un honor tenerte como *Partner Oficial* en nuestra red logística. A partir de este momento, tienes el control total para escalar tus operaciones usando tecnología de punta.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col items-center text-center p-3 rounded-lg bg-muted/50">
              <div className="bg-primary/10 p-2 rounded-full mb-2">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-semibold text-sm">Gestiona Flotas</h4>
              <p className="text-xs text-muted-foreground mt-1">Añade camiones fácilmente</p>
            </div>
            
            <div className="flex flex-col items-center text-center p-3 rounded-lg bg-muted/50">
              <div className="bg-primary/10 p-2 rounded-full mb-2">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-semibold text-sm">Conductores</h4>
              <p className="text-xs text-muted-foreground mt-1">Invita a tu equipo</p>
            </div>
            
            <div className="flex flex-col items-center text-center p-3 rounded-lg bg-muted/50">
              <div className="bg-primary/10 p-2 rounded-full mb-2">
                <Activity className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-semibold text-sm">Monitoreo 24/7</h4>
              <p className="text-xs text-muted-foreground mt-1">Rutas en tiempo real</p>
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={handleClose} className="w-full text-base py-6 font-semibold" size="lg">
              Empezar mi Primer Viaje
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
