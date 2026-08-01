"use client";

import { useEffect, useState } from "react";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";

export default function MercadoPagoBrick({
  shipmentId,
  amount,
  onPaymentSuccess
}: {
  shipmentId: string;
  amount: number;
  onPaymentSuccess: () => void;
}) {
  const [isReady, setIsReady] = useState(false);
  const { resolvedTheme } = useTheme(); // Para saber si estamos en dark mode

  useEffect(() => {
    // Inicializar SDK con la Public Key
    initMercadoPago(process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || "");
    setIsReady(true);
  }, []);

  const parsedAmount = parseFloat(amount as any);
  const safeAmount = isNaN(parsedAmount) ? 10 : Math.max(parsedAmount, 10);

  const initialization = {
    amount: safeAmount,
  };

  const customization = {
    visual: {
      style: {
        theme: resolvedTheme === 'dark' ? 'dark' : 'default',
        customVariables: {
          formBackgroundColor: resolvedTheme === 'dark' ? '#0f172a' : '#ffffff', // Slate 900
          baseColor: '#0055FF', // Vorian Blue
          successColor: '#10b981', // Tailwind Emerald 500
          warningColor: '#f59e0b', // Tailwind Amber 500
          dangerColor: '#ef4444', // Tailwind Red 500
          fontFamily: 'inherit',
        }
      },
    },
    // Omitimos paymentMethods para que CardPayment muestre sus opciones por defecto (tarjetas)
  };

  const onSubmit = async (
    formData: any,
  ) => {
    return new Promise<void>((resolve, reject) => {
      fetch("/api/payments/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          transaction_amount: safeAmount,
          shipmentId,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.status === "approved") {
            toast.success("Pago procesado con éxito. ¡Envío publicado!");
            onPaymentSuccess();
            resolve();
          } else if (data.status === "in_process" || data.status === "pending") {
            toast.info("Pago en revisión. Te notificaremos cuando se apruebe.");
            onPaymentSuccess(); // Podríamos dejarlo pasar o mostrar otra UI
            resolve();
          } else {
            toast.error("El pago fue rechazado. Revisa tus fondos o intenta con otra tarjeta.");
            reject();
          }
        })
        .catch((error) => {
          console.error("Error al procesar pago:", error);
          toast.error("Ocurrió un error al procesar el pago. Inténtalo más tarde.");
          reject();
        });
    });
  };

  const onError = async (error: any) => {
    console.error(error);
    toast.error("Hubo un error al cargar el módulo de pagos.");
  };

  const onReady = async () => {
    // Cuando el brick termina de cargar
  };

  if (!isReady) return null;

  return (
    <div className="w-full">
      {/* @ts-ignore */}
      <CardPayment
        initialization={initialization}
        customization={customization as any}
        onSubmit={onSubmit}
        onReady={onReady}
        onError={onError}
      />
    </div>
  );
}
