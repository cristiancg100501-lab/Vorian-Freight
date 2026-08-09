import { LandingClient } from "@/components/landing-client";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vorian Logistics | Logística de Puertos y Aeropuertos en Chile",
  description: "Tu socio logístico para transporte terrestre desde Puertos y Aeropuertos hacia todo Chile. Rastreo en tiempo real, cargas FCL, LCL y seguridad garantizada.",
  openGraph: {
    title: "Vorian Logistics | Trazabilidad en Tiempo Real",
    description: "Sistema Operativo de Transporte B2B. Controla y audita tu flota con GPS en vivo.",
    url: "https://vorian.cl",
    siteName: "Vorian Logistics",
    images: [
      {
        url: "https://vorian.cl/og-image.png", // Reemplazar con URL real cuando esté en producción
        width: 1200,
        height: 630,
        alt: "Vorian Logistics Dashboard Preview",
      }
    ],
    locale: "es_CL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vorian Logistics | Trazabilidad en Tiempo Real",
    description: "Sistema Operativo de Transporte B2B. Controla y audita tu flota con GPS en vivo.",
    images: ["https://vorian.cl/og-image.png"], // Reemplazar con URL real
  }
};

export default function LandingPage() {
  return <LandingClient />;
}
