import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Términos y Condiciones | Vorian",
  description: "Términos y Condiciones de uso de la plataforma Vorian.",
};

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Términos y Condiciones</h1>
        <p className="text-muted-foreground mb-12 border-b border-border pb-8">
          Última actualización: {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
        </p>

        <div className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground">
          <h2>1. Aceptación de los Términos</h2>
          <p>
            Al acceder y utilizar la plataforma logística, aplicación móvil y servicios asociados proporcionados por Vorian Global ("Vorian", "nosotros", "la Plataforma"), usted acepta estar sujeto a estos Términos y Condiciones ("Términos"). Si no está de acuerdo con alguna parte de los términos, no podrá acceder a los Servicios. Estos términos constituyen un acuerdo legal vinculante entre usted (ya sea como persona natural o en representación de una empresa B2B) y Vorian.
          </p>

          <h2>2. Descripción del Servicio</h2>
          <p>
            Vorian es una plataforma tecnológica (Software as a Service - SaaS) diseñada para coordinar, gestionar y auditar el transporte de carga terrestre. Proporcionamos herramientas para el rastreo en tiempo real, validación de entregas mediante códigos PIN, telemetría y asignación de despachos entre generadores de carga y operadores de transporte certificados.
          </p>
          <p>
            <strong>Importante:</strong> Vorian actúa exclusivamente como un proveedor de tecnología y un intermediario logístico. No somos propietarios de los vehículos de transporte ni operamos flotas directamente, a menos que se especifique lo contrario mediante un contrato de servicio dedicado.
          </p>

          <h2>3. Cuentas de Usuario y Seguridad</h2>
          <ul>
            <li>Usted es responsable de salvaguardar la contraseña que utiliza para acceder al Servicio y de cualquier actividad o acción bajo su contraseña.</li>
            <li>Las empresas (B2B) son responsables de los actos y omisiones de sus empleados, despachadores y choferes que utilicen la Plataforma bajo la cuenta corporativa.</li>
            <li>Usted acepta no revelar su contraseña a ningún tercero. Debe notificarnos inmediatamente tras tener conocimiento de cualquier violación de seguridad o uso no autorizado de su cuenta.</li>
          </ul>

          <h2>4. Uso Aceptable de la Plataforma</h2>
          <p>
            Usted se compromete a no utilizar los Servicios para:
          </p>
          <ul>
            <li>Falsificar información de carga, identidades de choferes o patentes de vehículos.</li>
            <li>Interferir o intentar eludir los sistemas de auditoría, telemetría GPS o firmas digitales de la plataforma.</li>
            <li>Transportar mercancías ilegales, peligrosas no declaradas o que violen las leyes locales de transporte terrestre.</li>
            <li>Revender el software o utilizarlo como servicio para terceros fuera del alcance del acuerdo comercial original.</li>
          </ul>

          <h2>5. Precisión de Telemetría y Rastreo</h2>
          <p>
            Vorian se esfuerza por proporcionar un rastreo en tiempo real preciso y un historial de auditoría inmutable. Sin embargo, los servicios basados en GPS y conectividad móvil dependen de redes de terceros y de los dispositivos físicos utilizados por los choferes (smartphones). Vorian no garantiza que la señal será ininterrumpida o 100% precisa en zonas de baja cobertura, como ciertos sectores de puertos, túneles o rutas remotas.
          </p>

          <h2>6. Limitación de Responsabilidad</h2>
          <p>
            En la máxima medida permitida por la ley aplicable, en ningún caso Vorian, ni sus directores, empleados, socios, agentes o afiliados, serán responsables por daños indirectos, incidentales, especiales, consecuenciales o punitivos, incluyendo sin limitación, pérdida de beneficios, datos, uso, buena voluntad u otras pérdidas intangibles, resultantes de:
          </p>
          <ul>
            <li>Su acceso, uso o incapacidad de acceder o usar los Servicios.</li>
            <li>Daños, pérdida o robo de la carga física transportada por los transportistas gestionados a través de la plataforma (las reclamaciones de seguros de carga operan de forma independiente a la licencia de software).</li>
            <li>Demoras en el puerto, aduanas o centros de distribución.</li>
          </ul>

          <h2>7. Modificaciones a los Términos</h2>
          <p>
            Nos reservamos el derecho, a nuestra sola discreción, de modificar o reemplazar estos Términos en cualquier momento. Si una revisión es importante, intentaremos proporcionar un aviso con al menos 30 días de anticipación antes de que los nuevos términos entren en vigencia.
          </p>

          <h2>8. Contacto</h2>
          <p>
            Para consultas relacionadas con contratos comerciales, acuerdos de nivel de servicio (SLA) o estos términos, contáctenos en: <strong>legal@vorianglobal.com</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
