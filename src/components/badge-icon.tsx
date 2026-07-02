import React from "react";
import { cn } from "@/lib/utils";

interface BadgeIconProps {
  type: "BRONZE" | "SILVER" | "GOLD" | "BLACK_DIAMOND" | string;
  className?: string;
}

export function BadgeIcon({ type, className }: BadgeIconProps) {
  // Generar un ID único para evitar colisiones de gradientes SVG si hay varios en pantalla
  const idSuffix = React.useId().replace(/:/g, "");

  const renderSvg = () => {
    switch (type) {
      case "BRONZE":
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
            <defs>
              <radialGradient id={`bg-grad-bronze-${idSuffix}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="60%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#b45309" />
              </radialGradient>
              <filter id={`soft-shadow-bronze-${idSuffix}`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity="0.25" />
              </filter>
            </defs>
            <circle cx="100" cy="100" r="75" fill={`url(#bg-grad-bronze-${idSuffix})`} />
            
            {/* Chasis */}
            <g className="bronze-chassis" filter={`url(#soft-shadow-bronze-${idSuffix})`}>
              <rect x="45" y="125" width="110" height="12" rx="6" fill="#451a03" />
              <circle cx="65" cy="138" r="10" fill="#1e0b02" />
              <circle cx="65" cy="138" r="4" fill="#d97706" />
              <circle cx="125" cy="138" r="10" fill="#1e0b02" />
              <circle cx="125" cy="138" r="4" fill="#d97706" />
              <circle cx="143" cy="138" r="10" fill="#1e0b02" />
              <circle cx="143" cy="138" r="4" fill="#d97706" />
            </g>

            {/* Remolque */}
            <g className="bronze-trailer" filter={`url(#soft-shadow-bronze-${idSuffix})`}>
              <rect x="45" y="70" width="68" height="52" rx="8" fill="#fef3c7" />
              <rect x="55" y="76" width="6" height="40" rx="3" fill="#f59e0b" opacity="0.4" />
              <rect x="67" y="76" width="6" height="40" rx="3" fill="#f59e0b" opacity="0.4" />
              <rect x="79" y="76" width="6" height="40" rx="3" fill="#f59e0b" opacity="0.4" />
              <rect x="91" y="76" width="6" height="40" rx="3" fill="#f59e0b" opacity="0.4" />
            </g>

            {/* Cabina */}
            <g className="bronze-cabin" filter={`url(#soft-shadow-bronze-${idSuffix})`}>
              <path d="M 115 122 L 115 88 A 6 6 0 0 1 121 82 L 140 82 A 12 12 0 0 1 152 94 L 152 122 Z" fill="#ffedd5" />
              <path d="M 132 86 L 144 86 A 4 4 0 0 1 148 90 L 148 102 L 132 102 Z" fill="#78350f" opacity="0.8" />
              <rect x="142" y="116" width="13" height="6" rx="3" fill="#d97706" />
            </g>
          </svg>
        );

      case "SILVER":
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
            <defs>
              <radialGradient id={`bg-grad-plata-${idSuffix}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f8fafc" />
                <stop offset="60%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#64748b" />
              </radialGradient>
              <filter id={`soft-shadow-plata-${idSuffix}`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity="0.25" />
              </filter>
            </defs>
            <circle cx="100" cy="100" r="75" fill={`url(#bg-grad-plata-${idSuffix})`} />
            
            {/* Cuerpo */}
            <g className="silver-forklift-body" filter={`url(#soft-shadow-plata-${idSuffix})`}>
              <path d="M 45 125 L 45 95 A 15 15 0 0 1 60 80 L 105 80 L 115 125 Z" fill="#334155" />
              <path d="M 68 80 L 68 55 L 100 55 L 105 80 Z" fill="none" stroke="#1e293b" strokeWidth="4" strokeLinejoin="round" />
              <rect x="75" y="60" width="20" height="15" fill="#f1f5f9" opacity="0.7" />
              <circle cx="58" cy="132" r="12" fill="#0f172a" />
              <circle cx="58" cy="132" r="5" fill="#94a3b8" />
              <circle cx="102" cy="132" r="12" fill="#0f172a" />
              <circle cx="102" cy="132" r="5" fill="#94a3b8" />
            </g>

            {/* Mástil */}
            <g className="silver-forklift-mast" filter={`url(#soft-shadow-plata-${idSuffix})`}>
              <rect x="118" y="45" width="6" height="84" rx="2" fill="#1e293b" />
              <rect x="124" y="45" width="6" height="84" rx="2" fill="#1e293b" />
            </g>

            {/* Horquillas y Carga */}
            <g className="silver-forks-pallet" filter={`url(#soft-shadow-plata-${idSuffix})`}>
              <path d="M 112 115 L 132 115 L 132 80" fill="none" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="132" y="105" width="30" height="8" rx="2" fill="#92400e" />
              <rect x="134" y="77" width="26" height="28" rx="4" fill="#e2e8f0" />
              <line x1="147" y1="77" x2="147" y2="105" stroke="#cbd5e1" strokeWidth="2" />
            </g>
          </svg>
        );

      case "GOLD":
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
            <defs>
              <radialGradient id={`bg-grad-oro-${idSuffix}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="60%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#ca8a04" />
              </radialGradient>
              <filter id={`soft-shadow-oro-${idSuffix}`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity="0.25" />
              </filter>
            </defs>
            <circle cx="100" cy="100" r="75" fill={`url(#bg-grad-oro-${idSuffix})`} />
            
            {/* Pórtico Izquierdo */}
            <g className="gold-crane-left" filter={`url(#soft-shadow-oro-${idSuffix})`}>
              <path d="M 45 135 L 70 55 L 82 55 L 62 135 Z" fill="#713f12" />
              <line x1="50" y1="115" x2="70" y2="115" stroke="#a16207" strokeWidth="2" />
              <line x1="58" y1="85" x2="75" y2="85" stroke="#a16207" strokeWidth="2" />
            </g>

            {/* Pórtico Derecho */}
            <g className="gold-crane-right" filter={`url(#soft-shadow-oro-${idSuffix})`}>
              <path d="M 155 135 L 130 55 L 118 55 L 138 135 Z" fill="#713f12" />
              <line x1="150" y1="115" x2="130" y2="115" stroke="#a16207" strokeWidth="2" />
              <line x1="142" y1="85" x2="125" y2="85" stroke="#a16207" strokeWidth="2" />
            </g>

            {/* Viga Superior */}
            <g className="gold-crane-beam" filter={`url(#soft-shadow-oro-${idSuffix})`}>
              <rect x="35" y="47" width="130" height="10" rx="3" fill="#854d0e" />
              <rect x="85" y="54" width="30" height="8" rx="2" fill="#ca8a04" />
            </g>

            {/* Contenedor */}
            <g className="gold-container" filter={`url(#soft-shadow-oro-${idSuffix})`}>
              <line x1="92" y1="62" x2="92" y2="85" stroke="#451a03" strokeWidth="1.5" />
              <line x1="108" y1="62" x2="108" y2="85" stroke="#451a03" strokeWidth="1.5" />
              <rect x="80" y="85" width="40" height="25" rx="4" fill="#fef08a" />
              <line x1="88" y1="89" x2="88" y2="106" stroke="#ca8a04" strokeWidth="2" />
              <line x1="95" y1="89" x2="95" y2="106" stroke="#ca8a04" strokeWidth="2" />
              <line x1="102" y1="89" x2="102" y2="106" stroke="#ca8a04" strokeWidth="2" />
              <line x1="109" y1="89" x2="109" y2="106" stroke="#ca8a04" strokeWidth="2" />
            </g>
          </svg>
        );

      case "BLACK_DIAMOND":
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
            <defs>
              <radialGradient id={`bg-grad-diamante-${idSuffix}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#312e81" />
                <stop offset="50%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#020617" />
              </radialGradient>
              <filter id={`soft-shadow-diamante-${idSuffix}`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity="0.25" />
              </filter>
            </defs>
            <circle cx="100" cy="100" r="75" fill={`url(#bg-grad-diamante-${idSuffix})`} stroke="#6366f1" strokeWidth="1.5" />
            
            <g className="diamond-sea-waves">
              <path d="M 35 130 Q 55 125 75 130 T 115 130 T 155 130 T 175 130" fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" opacity="0.3" />
            </g>

            {/* Casco */}
            <g className="diamond-ship-hull" filter={`url(#soft-shadow-diamante-${idSuffix})`}>
              <path d="M 40 115 L 140 115 L 155 98 L 160 98 L 150 125 L 50 125 Z" fill="#1e1e24" />
              <path d="M 47 122 L 149 122 L 150 125 L 50 125 Z" fill="#4f46e5" />
            </g>

            {/* Cabina */}
            <g className="diamond-ship-bridge" filter={`url(#soft-shadow-diamante-${idSuffix})`}>
              <rect x="42" y="80" width="22" height="35" fill="#f8fafc" />
              <rect x="36" y="92" width="10" height="23" fill="#cbd5e1" />
              <rect x="46" y="84" width="14" height="4" fill="#312e81" />
              <rect x="48" y="70" width="6" height="10" fill="#e11d48" />
            </g>

            {/* Contenedores */}
            <g className="diamond-ship-cargo" filter={`url(#soft-shadow-diamante-${idSuffix})`}>
              <rect x="68" y="95" width="22" height="20" rx="3" fill="#818cf8" />
              <rect x="92" y="95" width="22" height="20" rx="3" fill="#4f46e5" />
              <rect x="116" y="95" width="22" height="20" rx="3" fill="#312e81" />
              <rect x="74" y="77" width="22" height="18" rx="3" fill="#4338ca" />
              <rect x="98" y="77" width="22" height="18" rx="3" fill="#6366f1" />
              <line x1="73" y1="100" x2="73" y2="110" stroke="#1e1b4b" strokeWidth="1.5" />
              <line x1="85" y1="100" x2="85" y2="110" stroke="#1e1b4b" strokeWidth="1.5" />
              <line x1="102" y1="100" x2="102" y2="110" stroke="#1e1b4b" strokeWidth="1.5" />
              <line x1="121" y1="100" x2="121" y2="110" stroke="#1e1b4b" strokeWidth="1.5" />
            </g>
          </svg>
        );

      default:
        return null;
    }
  };

  return (
    <div className={cn("relative flex items-center justify-center select-none overflow-visible", className)}>
      {/* Estilos inline de animaciones CSS fluidas basadas en fases físicas (easeInOutCubic + snap elástico) */}
      <style>{`
        svg * {
          transform-origin: center;
          transition: transform 0.1s ease-out;
        }

        /* 1. BRONZE ANIMATIONS */
        .bronze-trailer {
          animation: bronze-trailer-anim 8s infinite ease-in-out;
        }
        .bronze-cabin {
          animation: bronze-cabin-anim 8s infinite ease-in-out;
        }
        .bronze-chassis {
          animation: bronze-chassis-anim 8s infinite ease-in-out;
        }

        @keyframes bronze-trailer-anim {
          0%, 25%, 100% { transform: translateX(0px); }
          50%, 70% { transform: translateX(-30px); }
          75% { transform: translateX(5px); }
          80% { transform: translateX(-2px); }
          85% { transform: translateX(1px); }
          90% { transform: translateX(0px); }
        }
        @keyframes bronze-cabin-anim {
          0%, 25%, 100% { transform: translateX(0px); }
          50%, 70% { transform: translateX(30px); }
          75% { transform: translateX(-5px); }
          80% { transform: translateX(2px); }
          85% { transform: translateX(-1px); }
          90% { transform: translateX(0px); }
        }
        @keyframes bronze-chassis-anim {
          0%, 25%, 100% { transform: scaleY(1); }
          50%, 70% { transform: scaleY(0.95); }
        }

        /* 2. SILVER ANIMATIONS */
        .silver-forklift-body {
          animation: silver-forklift-body-anim 8s infinite ease-in-out;
        }
        .silver-forks-pallet {
          animation: silver-forks-pallet-anim 8s infinite ease-in-out;
        }

        @keyframes silver-forklift-body-anim {
          0%, 25%, 100% { transform: translateX(0px); }
          50%, 70% { transform: translateX(-20px); }
          75% { transform: translateX(3px); }
          80% { transform: translateX(-1px); }
          90% { transform: translateX(0px); }
        }
        @keyframes silver-forks-pallet-anim {
          0%, 25%, 100% { transform: translateY(0px); }
          50%, 70% { transform: translateY(-35px); }
          75% { transform: translateY(5px); }
          80% { transform: translateY(-2px); }
          90% { transform: translateY(0px); }
        }

        /* 3. GOLD ANIMATIONS */
        .gold-crane-left {
          animation: gold-crane-left-anim 8s infinite ease-in-out;
        }
        .gold-crane-right {
          animation: gold-crane-right-anim 8s infinite ease-in-out;
        }
        .gold-container {
          animation: gold-container-anim 8s infinite ease-in-out;
        }

        @keyframes gold-crane-left-anim {
          0%, 25%, 100% { transform: translateX(0px); }
          50%, 70% { transform: translateX(-18px); }
          75% { transform: translateX(3px); }
          80% { transform: translateX(-1px); }
          90% { transform: translateX(0px); }
        }
        @keyframes gold-crane-right-anim {
          0%, 25%, 100% { transform: translateX(0px); }
          50%, 70% { transform: translateX(18px); }
          75% { transform: translateX(-3px); }
          80% { transform: translateX(1px); }
          90% { transform: translateX(0px); }
        }
        @keyframes gold-container-anim {
          0%, 25%, 100% { transform: translateY(0px); }
          50%, 70% { transform: translateY(-30px); }
          75% { transform: translateY(5px); }
          80% { transform: translateY(-2px); }
          90% { transform: translateY(0px); }
        }

        /* 4. DIAMOND ANIMATIONS */
        .diamond-ship-bridge {
          animation: diamond-ship-bridge-anim 8s infinite ease-in-out;
        }
        .diamond-ship-cargo {
          animation: diamond-ship-cargo-anim 8s infinite ease-in-out;
        }
        .diamond-ship-hull {
          animation: diamond-ship-hull-anim 8s infinite ease-in-out;
        }

        @keyframes diamond-ship-bridge-anim {
          0%, 25%, 100% { transform: translateX(0px); }
          50%, 70% { transform: translateX(-25px); }
          75% { transform: translateX(4px); }
          80% { transform: translateX(-2px); }
          90% { transform: translateX(0px); }
        }
        @keyframes diamond-ship-cargo-anim {
          0%, 25%, 100% { transform: translate(0px, 0px); }
          50%, 70% { transform: translate(25px, -15px); }
          75% { transform: translate(-4px, 2px); }
          80% { transform: translate(2px, -1px); }
          90% { transform: translate(0px, 0px); }
        }
        @keyframes diamond-ship-hull-anim {
          0%, 25%, 100% { transform: translateY(0px); }
          50%, 70% { transform: translateY(3px); }
          75% { transform: translateY(-0.5px); }
          90% { transform: translateY(0px); }
        }
      `}</style>
      {renderSvg()}
    </div>
  );
}
