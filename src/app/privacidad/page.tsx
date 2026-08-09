import { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, FileText, Lock, Users, Server } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidad | Vorian Global",
  description: "Política de Privacidad y Tratamiento de Datos Personales de Vorian Global SpA.",
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation */}
        <div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-slate-900">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Inicio
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 text-blue-700 rounded-full mb-2">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Política de Privacidad
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
            Protección de Datos Personales y Comerciales en la plataforma B2B Vorian Global SpA.
          </p>
          <p className="text-xs text-slate-400 font-medium">Última actualización: {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</p>
        </div>

        {/* Main Document Content */}
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="p-6 sm:p-10 space-y-8 text-slate-700 text-sm leading-relaxed">
            
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" /> 1. Información General
              </h2>
              <p>
                En <strong>Vorian Global SpA</strong> ("Vorian", "nosotros", "nuestro"), respetamos su privacidad y estamos comprometidos con la protección de sus datos personales. Esta Política de Privacidad explica cómo recopilamos, usamos, divulgamos y protegemos su información de acuerdo a la Ley N° 19.628 sobre Protección de la Vida Privada de Chile.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" /> 2. Información que Recopilamos
              </h2>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Cuentas de Empresa (B2B):</strong> Razón social, RUT, dirección comercial, correos electrónicos corporativos y teléfonos de contacto de administradores.</li>
                <li><strong>Transportistas y Choferes:</strong> Nombre completo, RUT, licencia de conducir, antecedentes del vehículo (patente, revisión técnica) necesarios para operar.</li>
                <li><strong>Telemetría y GPS (Crítico):</strong> Al utilizar la App de choferes, recolectamos datos de ubicación en tiempo real. Esta información es esencial para el rastreo de la carga, la auditoría de rutas y el cálculo de la hora estimada de llegada (ETA).</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-600" /> 3. Uso de la Información
              </h2>
              <p>
                Utilizamos los datos recopilados única y exclusivamente para:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Proveer, operar y mantener la plataforma logística y el motor de <em>Smart Matching</em>.</li>
                <li>Permitir que los Clientes monitoreen sus cargas en tiempo real a través del mapa interactivo.</li>
                <li>Generar un registro de auditoría inmutable de los despachos para proteger a ambas partes en caso de disputas.</li>
                <li>Mejorar la seguridad y prevenir fraudes logísticos.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" /> 4. Privacidad y Terceros
              </h2>
              <p>
                Como plataforma de intermediación B2B, es necesario compartir cierta información entre el Cliente generador de carga y la Empresa Transportista asignada (ej. detalles de la carga, patente del camión y ubicación GPS durante el viaje) para ejecutar el servicio. 
              </p>
              <div className="mt-4 p-4 bg-slate-50 text-slate-800 border border-slate-200 rounded-md">
                <strong>Garantía:</strong> Vorian Global SpA no vende, alquila ni comercializa datos personales o comerciales de las empresas, clientes o choferes con terceros ajenos a la operación logística.
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Lock className="h-5 w-5 text-blue-600" /> 5. Seguridad y Derechos ARCO
              </h2>
              <p>
                Implementamos estándares de la industria (encriptación HTTPS/TLS, bases de datos seguras con RLS en Supabase) para proteger la información en reposo y en tránsito. 
              </p>
              <p>
                Usted tiene derecho a solicitar el Acceso, Rectificación, Cancelación u Oposición (Derechos ARCO) respecto de sus datos personales, enviando un requerimiento formal a nuestro canal oficial.
              </p>
            </section>

            <section className="space-y-3 border-t pt-6">
              <h2 className="text-lg font-bold text-slate-900">6. Contacto Legal</h2>
              <p>
                Para ejercer sus derechos o resolver dudas sobre el tratamiento de datos, contáctenos en: <strong>legal@vorianglobal.com</strong>
              </p>
            </section>

          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Vorian Global SpA. Todos los derechos reservados.
        </div>

      </div>
    </div>
  );
}
