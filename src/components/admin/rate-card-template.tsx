import React, { forwardRef } from "react";
import type { RateRow, RateCondition } from "./rate-card-generator";
import { Phone, Mail, Globe, MapPin, Info } from "lucide-react";
import vorianLogo from "@/assets/vorian_logo.png";

interface RateCardTemplateProps {
  title: string;
  rates: RateRow[];
  conditions: RateCondition[];
  clientName: string;
  attentionTo: string;
  date: string;
  validity: string;
  reference: string;
}

export const RateCardTemplate = forwardRef<HTMLDivElement, RateCardTemplateProps>(
  ({ title, rates, conditions, clientName, attentionTo, date, validity, reference }, ref) => {
    
    // A4 dimensions in pixels at 96 DPI: 794 x 1123
    return (
      <div 
        ref={ref} 
        className="w-[794px] h-[1123px] bg-white text-zinc-900 flex flex-col relative overflow-hidden"
        style={{ fontFamily: "'Arial', sans-serif" }}
      >
        {/* Top Edge Accent */}
        <div className="absolute top-0 left-0 w-full h-3 bg-zinc-900"></div>

        <div className="p-12 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start mb-10 mt-2">
            <div className="w-1/2">
              <img 
                src={vorianLogo.src} 
                alt="Vorian Global" 
                className="w-56 h-auto object-contain" 
                style={{ filter: "invert(80%)" }} // Escala inversa de colores (blanco a carbón claro)
              />
              <p className="mt-4 text-[10px] text-zinc-500 leading-tight">
                <strong>Vorian Global SpA</strong><br/>
                Av. Providencia 1208, Of 207<br/>
                Providencia, Santiago, Chile<br/>
                RUT: 77.345.123-K
              </p>
            </div>
            
            <div className="w-2/3 text-right flex flex-col items-end">
              <h1 className="text-3xl font-black text-zinc-900 uppercase tracking-widest mb-1">Cotización</h1>
              <div className="text-xs font-semibold text-zinc-400 tracking-widest uppercase mb-4">Servicios Logísticos</div>
              
              <table className="text-xs text-left border-collapse w-64">
                <tbody>
                  <tr className="border-b border-zinc-200">
                    <td className="py-1.5 font-bold text-zinc-600">Fecha Emisión</td>
                    <td className="py-1.5 text-right">{date}</td>
                  </tr>
                  <tr className="border-b border-zinc-200">
                    <td className="py-1.5 font-bold text-zinc-600">Válido Hasta</td>
                    <td className="py-1.5 text-right">{validity}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 font-bold text-zinc-600">Nº Referencia</td>
                    <td className="py-1.5 text-right font-mono">{reference}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Customer Info Box */}
          <div className="flex gap-6 mb-10">
            <div className="flex-1 bg-zinc-50 border border-zinc-200 p-4 rounded-sm">
              <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Preparado Para</h3>
              <p className="text-sm font-bold text-zinc-900 uppercase">{clientName}</p>
              <p className="text-xs text-zinc-600 mt-1"><strong>Atención:</strong> {attentionTo}</p>
            </div>
            <div className="flex-1 bg-zinc-50 border border-zinc-200 p-4 rounded-sm flex flex-col justify-center">
               <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Asunto</h3>
               <p className="text-sm font-bold text-zinc-900">{title}</p>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col">
            
            {/* Rates Table */}
            <div className="mb-8">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr>
                    <th className="bg-zinc-900 text-white py-3 px-4 text-xs font-bold uppercase tracking-wider w-12 text-center">Ítem</th>
                    <th className="bg-zinc-900 text-white py-3 px-4 text-xs font-bold uppercase tracking-wider">Descripción / Rango</th>
                    <th className="bg-zinc-900 text-white py-3 px-4 text-xs font-bold uppercase tracking-wider text-right">Tarifa (CLP)</th>
                  </tr>
                </thead>
                <tbody>
                  {rates.map((rate, idx) => (
                    <tr key={idx} className={`border-b border-zinc-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50'}`}>
                      <td className="py-2.5 px-4 text-xs font-mono text-zinc-500 text-center">{(idx + 1).toString().padStart(2, '0')}</td>
                      <td className="py-2.5 px-4 text-sm font-medium">{rate.range}</td>
                      <td className="py-2.5 px-4 text-sm font-bold text-right whitespace-nowrap">{rate.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Terms and Conditions */}
            <div className="mt-auto">
              <div className="flex items-center gap-2 border-b-2 border-zinc-900 pb-2 mb-4">
                <Info className="w-4 h-4 text-zinc-900" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-900">Términos y Condiciones del Servicio</h3>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                {conditions.map((cond, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-zinc-400 font-bold text-[10px] mt-0.5">•</span>
                    <p className="text-[10px] text-zinc-600 leading-snug text-justify">{cond}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Acceptance Signature Area */}
            <div className="mt-12 flex justify-between border border-zinc-200 bg-zinc-50 p-6 rounded-sm">
              <div className="w-1/2 pr-8">
                <p className="text-[9px] text-zinc-500 text-justify mb-6">
                  Para proceder con el servicio, por favor firme y devuelva este documento o responda con un correo de aceptación haciendo referencia a este número de cotización.
                </p>
                <div className="border-t border-zinc-400 pt-1 mt-10">
                  <p className="text-[10px] font-bold text-zinc-800 text-center">Firma de Aceptación Cliente</p>
                </div>
              </div>
              <div className="w-1/2 border-l border-zinc-200 pl-8 flex flex-col justify-end">
                <div className="border-t border-zinc-400 pt-1 mt-10">
                  <p className="text-[10px] font-bold text-zinc-800 text-center">Representante Vorian Global</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-zinc-900 text-zinc-400 p-6 mt-auto">
          <div className="flex justify-between items-center text-[10px] uppercase tracking-wider mb-2">
            <div className="flex items-center gap-2">
              <Globe className="w-3 h-3 text-white" />
              <span className="text-white font-medium">www.vorianglobal.com</span>
            </div>
            <div className="flex gap-6">
              <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> +56 9 1234 5678</span>
              <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> operaciones@vorianglobal.com</span>
            </div>
          </div>
          <p className="text-[8px] text-zinc-500 text-center mt-4 uppercase tracking-widest border-t border-zinc-800 pt-4">
            Documento generado electrónicamente. Este tarifario es confidencial.
          </p>
        </div>
      </div>
    );
  }
);

RateCardTemplate.displayName = "RateCardTemplate";
