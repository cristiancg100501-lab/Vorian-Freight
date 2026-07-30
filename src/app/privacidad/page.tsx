import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidad | Vorian",
  description: "Política de Privacidad y Tratamiento de Datos Personales de Vorian.",
};

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-20">
      <div className="container mx-auto px-4 max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
        
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Política de Privacidad</h1>
        <p className="text-muted-foreground mb-12 border-b border-border pb-8">
          Última actualización: {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
        </p>

        <div className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground">
          <h2>1. Información General</h2>
          <p>
            En Vorian Global ("Vorian", "nosotros", "nuestro"), respetamos su privacidad y estamos comprometidos con la protección de sus datos personales. Esta Política de Privacidad explica cómo recopilamos, usamos, divulgamos y protegemos su información cuando utiliza nuestra plataforma logística B2B, nuestro sitio web y nuestra aplicación móvil (colectivamente, los "Servicios").
          </p>

          <h2>2. Información que Recopilamos</h2>
          <p>
            Recopilamos varios tipos de información para proporcionar y mejorar nuestros Servicios:
          </p>
          <ul>
            <li><strong>Información de la Cuenta:</strong> Nombre de la empresa, RUT, dirección, nombre del representante legal, correo electrónico y número de teléfono.</li>
            <li><strong>Información de Operadores y Choferes:</strong> Nombres, licencias de conducir, patentes de vehículos y certificaciones necesarias para el transporte de carga.</li>
            <li><strong>Datos de Localización (Telemetría):</strong> Cuando utiliza nuestra aplicación móvil para choferes, recopilamos datos de ubicación GPS en tiempo real para habilitar el rastreo de carga, la auditoría de rutas y el cálculo de la hora estimada de llegada (ETA).</li>
            <li><strong>Datos de Uso:</strong> Información sobre cómo interactúa con nuestra plataforma, direcciones IP, tipo de navegador y registros de acceso.</li>
          </ul>

          <h2>3. Uso de la Información</h2>
          <p>
            Utilizamos la información recopilada para los siguientes propósitos:
          </p>
          <ul>
            <li>Proveer, operar y mantener nuestros Servicios de logística.</li>
            <li>Rastrear envíos en tiempo real y proporcionar pruebas inmutables de entrega (POD).</li>
            <li>Comunicarnos con usted sobre actualizaciones operativas, soporte técnico y avisos administrativos.</li>
            <li>Mejorar la seguridad de la plataforma, prevenir fraudes y desvíos de carga.</li>
            <li>Cumplir con nuestras obligaciones legales y contractuales.</li>
          </ul>

          <h2>4. Compartir Información</h2>
          <p>
            Vorian es una plataforma B2B. Para que la logística funcione, compartimos información de manera estrictamente necesaria:
          </p>
          <ul>
            <li><strong>Entre Clientes y Transportistas:</strong> Compartimos detalles de la carga, ubicación en tiempo real del vehículo y datos de contacto del chofer con el cliente generador de la carga para permitir la transparencia del servicio.</li>
            <li><strong>Proveedores de Servicios:</strong> Podemos emplear empresas de terceros y personas para facilitar nuestros Servicios (ej. proveedores de alojamiento en la nube como AWS/GCP, servicios de mapas).</li>
            <li><strong>Cumplimiento de la Ley:</strong> Podemos divulgar sus datos si así lo requiere la ley o en respuesta a solicitudes válidas de autoridades públicas.</li>
          </ul>

          <h2>5. Seguridad de los Datos</h2>
          <p>
            La seguridad de sus datos es fundamental para nosotros. Implementamos medidas de seguridad técnicas y organizativas estándar de la industria (incluyendo encriptación en tránsito y en reposo) para proteger su información contra el acceso no autorizado, alteración, divulgación o destrucción. 
          </p>
          <p>
            Los registros de auditoría de rutas y validaciones por PIN están diseñados para ser inmutables y proteger la integridad de la operación comercial.
          </p>

          <h2>6. Sus Derechos</h2>
          <p>
            De acuerdo con la legislación vigente de protección de datos (Ley N° 19.628 sobre Protección de la Vida Privada en Chile), usted tiene derecho a solicitar el acceso, rectificación, cancelación u oposición (derechos ARCO) respecto de sus datos personales. Para ejercer estos derechos, puede contactarnos a través de los canales oficiales.
          </p>

          <h2>7. Contacto</h2>
          <p>
            Si tiene alguna pregunta sobre esta Política de Privacidad, por favor contáctenos a: <strong>contacto@vorianglobal.com</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
