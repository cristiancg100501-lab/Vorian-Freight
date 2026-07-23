import Link from "next/link";
import Image from "next/image";
import VorianLogo from "@/assets/vorian_logo.png";
import { ArrowRight } from "lucide-react";

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect width="4" height="12" x="2" y="9" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export function Footer() {
  return (
    <footer className="bg-muted/60 border-t border-border pt-20 pb-10">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8 mb-16">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block mb-6">
              <div className="relative w-[140px] h-[45px]">
                <Image
                  src={VorianLogo}
                  alt="Vorian Global Logo"
                  fill
                  className="object-contain dark:invert-0 invert"
                />
              </div>
            </Link>
            <p className="text-muted-foreground mb-8 max-w-sm">
              Revolucionando la logística terrestre B2B. Conectamos generadores de carga con una red certificada de transportistas mediante inteligencia artificial.
            </p>
            <div className="flex gap-4">
              <Link href="#" className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <LinkedinIcon className="w-5 h-5" />
              </Link>
              <Link href="#" className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <TwitterIcon className="w-5 h-5" />
              </Link>
              <Link href="#" className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <InstagramIcon className="w-5 h-5" />
              </Link>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="text-foreground font-bold mb-6">Plataforma</h4>
            <ul className="space-y-4">
              <li><Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">Rastreo en vivo</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">Match Inteligente</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">Pagos Automatizados</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">Red Certificada</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-foreground font-bold mb-6">Empresa</h4>
            <ul className="space-y-4">
              <li><Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">Sobre Nosotros</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">Blog</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">Casos de Éxito</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">Contacto</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-foreground font-bold mb-6">Únete</h4>
            <ul className="space-y-4 mb-6">
              <li><Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">Para Transportistas</Link></li>
              <li><Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">Para Generadores</Link></li>
            </ul>
            <Link href="/login" className="inline-flex items-center gap-2 text-foreground font-semibold hover:text-zinc-300 transition-colors group">
              Regístrate ahora
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Vorian Global. Todos los derechos reservados.
          </p>
          <div className="flex gap-6 text-sm">
            <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">Términos de Servicio</Link>
            <Link href="#" className="text-muted-foreground hover:text-foreground transition-colors">Política de Privacidad</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
