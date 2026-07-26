import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck, FileText, Scale } from "lucide-react";

export const metadata = {
  title: "Términos y Condiciones — Vorian Freight",
  description: "Términos y Condiciones de Uso y Política de Privacidad de Vorian Freight SpA.",
};

export default function TermsPage() {
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
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Términos y Condiciones de Uso
          </h1>
          <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
            Vorian Freight SpA — Política Operativa, Responsabilidades y Protección de Datos.
          </p>
          <p className="text-xs text-slate-400 font-medium">Última actualización: 26 de julio de 2026</p>
        </div>

        {/* Main Document Content */}
        <Card className="shadow-sm border-slate-200 bg-white">
          <CardContent className="p-6 sm:p-10 space-y-8 text-slate-700 text-sm leading-relaxed">
            
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" /> 1. Aspectos Generales y Aceptación
              </h2>
              <p>
                El presente documento regula los términos y condiciones de uso aplicables al acceso y uso de la plataforma digital, sitio web y aplicaciones móviles de <strong>VORIAN FREIGHT SPA</strong> (en adelante, <strong>"Vorian"</strong> o la <strong>"Plataforma"</strong>).
              </p>
              <p>
                Al registrarse, acceder o utilizar la Plataforma en cualquier calidad (ya sea como Mandante/Cliente B2B, Empresa Transportista o Conductor independiente), el Usuario declara haber leído, entendido y aceptado expresamente el contenido de este documento en su totalidad.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-600" /> 2. Naturaleza del Servicio
              </h2>
              <p>
                Vorian es una plataforma tecnológica y broker de intermediación logística B2B que conecta a empresas que requieren transporte de carga (los <strong>"Mandantes"</strong>) con empresas y conductores de transporte debidamente verificados (los <strong>"Transportistas"</strong>).
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Cotización y tarificación de servicios de transporte terrestre.</li>
                <li>Asignación y gestión de rutas.</li>
                <li>Trazabilidad y seguimiento geolocalizado en tiempo real.</li>
                <li>Validación de entregas mediante códigos PIN de seguridad y firma digital.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" /> 3. Registro y Cuentas de Usuario
              </h2>
              <p>
                El Usuario debe proporcionar información exacta y veraz. Las empresas mandantes deben acreditar su RUT y razón social, mientras que los conductores y empresas transportistas deben mantener al día sus licencias de conducir profesionales, permisos de circulación y documentos del vehículo requeridos por la legislación de Chile.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" /> 4. Protocolo de Seguridad (Códigos PIN y GPS)
              </h2>
              <p>
                Para garantizar la cadena de custodia de la carga:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>PIN de Recogida (Pickup):</strong> Entregado por el mandante al conductor al iniciar el retiro.</li>
                <li><strong>PIN de Entrega (Delivery):</strong> Entregado por el receptor en destino tras la llegada del vehículo.</li>
                <li><strong>Tracking GPS:</strong> El transportista consiente expresamente el envío de datos de ubicación GPS durante la ejecución de los envíos para efectos de seguridad y notificaciones de llegada en un radio de 40 metros.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-600" /> 5. Responsabilidades y Cargas Prohibidas
              </h2>
              <p>
                El Transportista es el custodio legal y responsable directo de las mercancías durante el trayecto conforme al Código de Comercio de Chile. El Mandante se compromete a no transportar sustancias ilícitas o materiales peligrosos (HazMat) no declarados formalmente.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" /> 6. Política de Privacidad (Ley 19.628)
              </h2>
              <p>
                Vorian tratará los datos personales de acuerdo con la Ley N° 19.628 de Protección de la Vida Privada de Chile. Los datos recolectados se utilizarán exclusivamente para la operación, facturación y seguridad del servicio. El usuario puede ejercer sus derechos ARCO escribiendo a <code>contacto@vorianfreight.cl</code>.
              </p>
            </section>

            <section className="space-y-3 border-t pt-6">
              <h2 className="text-lg font-bold text-slate-900">7. Jurisdicción y Ley Aplicable</h2>
              <p>
                Estos Términos y Condiciones se rigen e interpretan por las leyes de la República de Chile. Cualquier controversia se someterá a los Tribunales Ordinarios de Justicia de Santiago de Chile.
              </p>
            </section>

          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Vorian Freight SpA. Todos los derechos reservados.
        </div>

      </div>
    </div>
  );
}
