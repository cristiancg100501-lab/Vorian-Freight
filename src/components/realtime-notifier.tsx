"use client";

import { useEffect } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { toast } from "sonner";
import { Truck, CheckCircle, Package } from "lucide-react";
import { useRouter } from "next/navigation";

export function RealtimeNotifier({ clientId }: { clientId: string }) {
  const { supabase } = useSupabase();
  const router = useRouter();

  useEffect(() => {
    if (!clientId) return;

    // Suscribirse a los envíos del cliente
    const channel = supabase
      .channel(`client-notifications-${clientId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "shipments",
          filter: `clientId=eq.${clientId}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          const oldStatus = payload.old.status;
          const shipmentId = payload.new.id;

          if (newStatus !== oldStatus) {
            // Reproducir sonido suave (opcional, si hay un archivo de audio)
            // const audio = new Audio('/notification.mp3');
            // audio.play().catch(() => {}); // catch por si el navegador lo bloquea

            let title = "Actualización de Envío";
            let icon = <Package className="h-5 w-5 text-blue-500" />;
            let colorClass = "bg-blue-50 border-blue-200";

            if (newStatus === "EN_ROUTE_TO_PICKUP" || newStatus === "IN_TRANSIT") {
              title = "Camión en movimiento 🚚";
              icon = <Truck className="h-5 w-5 text-amber-500" />;
              colorClass = "bg-amber-50 border-amber-200";
            } else if (newStatus === "ARRIVED_AT_DROPOFF" || newStatus === "DELIVERED") {
              title = "¡Envío Entregado! ✅";
              icon = <CheckCircle className="h-5 w-5 text-green-500" />;
              colorClass = "bg-green-50 border-green-200";
            }

            toast(title, {
              description: `El envío #${shipmentId.slice(0, 8)} cambió a: ${newStatus}`,
              icon: icon,
              duration: 8000,
              className: `border-2 shadow-lg ${colorClass}`,
              action: {
                label: "Ver",
                onClick: () => router.push(`/client/shipments/${shipmentId}`),
              },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, supabase, router]);

  return null; // Este componente no renderiza nada en el DOM
}
