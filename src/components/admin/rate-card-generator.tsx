"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RateCardTemplate } from "./rate-card-template";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Download, Loader2 } from "lucide-react";

export type RateCondition = string;

export type RateRow = {
  range: string;
  price: string;
};

const DEFAULT_RATES: RateRow[] = [
  { range: "0 - 1000 kg", price: "155.000" },
  { range: "1001 - 2000 kg", price: "165.000" },
  { range: "2001 - 3000 kg", price: "185.000" },
  { range: "3001 - 4000 kg", price: "195.000" },
  { range: "4001 - 5000 kg", price: "215.000" },
  { range: "5001 - 6000 kg", price: "225.000" },
  { range: "6001 - 7000 kg", price: "235.000" },
  { range: "7001 - 8000 kg", price: "250.000" },
  { range: "8001 - 9000 kg", price: "280.000" },
  { range: "9001 kg en adelante", price: "Caso a Caso" },
];

const DEFAULT_CONDITIONS: RateCondition[] = [
  "Servicio consolidado 1-2 días tiempo de tránsito.",
  "No incluye carga ni descarga.",
  "Tarifa por cada despacho aduanero.",
  "Falso flete: 50% de la tarifa.",
  "Carga IMO: Caso a caso.",
  "Peonetas: Caso a caso.",
  "Servicio Inmediato en base a disponibilidad.",
  "Tarifas afectas a IVA.",
  "Tarifas válidas para comunas de la Provincia de Santiago."
];

export function RateCardGenerator() {
  const [title, setTitle] = useState("Servicios Logísticos - Carga General");
  const [rates, setRates] = useState<RateRow[]>(DEFAULT_RATES);
  const [conditions, setConditions] = useState<RateCondition[]>(DEFAULT_CONDITIONS);
  const [isExporting, setIsExporting] = useState(false);
  
  // New State variables for the professional format
  const [clientName, setClientName] = useState("Vercel, Inc.");
  const [attentionTo, setAttentionTo] = useState("Guillermo Rauch");
  const [date, setDate] = useState(new Date().toLocaleDateString('es-CL'));
  const [validity, setValidity] = useState("30 Días");
  const [reference, setReference] = useState("COT-VG-2026-0811");
  
  // Reference the visible container
  const pdfRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!pdfRef.current) return;
    setIsExporting(true);
    
    try {
      // 1. Create a deep clone of the element to avoid any CSS interference from parents (overflow, scale, etc)
      const clone = pdfRef.current.cloneNode(true) as HTMLDivElement;
      
      // 2. Attach it directly to the body, hidden behind everything
      clone.style.position = "fixed";
      clone.style.top = "0px";
      clone.style.left = "0px";
      clone.style.zIndex = "-9999";
      clone.style.transform = "none";
      clone.style.margin = "0";
      
      // 3. Fix the logo color by applying a canvas filter to the image inside the clone
      // html2canvas ignores CSS filters, so we must manually invert the pixels of the image
      const images = clone.getElementsByTagName('img');
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img.src.includes('vorian_logo.png')) {
          // Wait for image to load to ensure canvas can draw it
          await new Promise((resolve) => {
            if (img.complete) resolve(null);
            else { img.onload = resolve; img.onerror = resolve; }
          });
          
          const canvas = document.createElement('canvas');
          canvas.width = img.width || 224;
          canvas.height = img.height || 64;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Draw original image
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Invert colors using pixel manipulation
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let j = 0; j < data.length; j += 4) {
              // Invert RGB channels to 80% (light carbon)
              data[j] = 255 - data[j] + 51;     // R
              data[j+1] = 255 - data[j+1] + 51; // G
              data[j+2] = 255 - data[j+2] + 51; // B
              // Leave alpha (data[j+3]) alone
            }
            ctx.putImageData(imageData, 0, 0);
            
            // Replace the image source with the inverted canvas data
            img.src = canvas.toDataURL('image/png');
            img.style.filter = "none"; // Remove the CSS filter so html2canvas doesn't get confused
          }
        }
      }

      document.body.appendChild(clone);

      // 4. Run html2canvas on the perfect, unscaled, un-clipped clone
      const canvas = await html2canvas(clone, { 
        scale: 2,
        useCORS: true,
        logging: true,
        allowTaint: true
      });
      
      // Clean up the clone
      document.body.removeChild(clone);
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // A4 size: 210 x 297 mm
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("Tarifario_VorianGlobal.pdf");
    } catch (error) {
      console.error("Error al exportar PDF:", error);
      alert("Hubo un error al generar el PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleRateChange = (index: number, field: keyof RateRow, value: string) => {
    const newRates = [...rates];
    newRates[index][field] = value;
    setRates(newRates);
  };

  const handleConditionChange = (index: number, value: string) => {
    const newConds = [...conditions];
    newConds[index] = value;
    setConditions(newConds);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Editor Panel */}
      <div className="w-full lg:w-1/3 flex flex-col gap-6">
        <div className="bg-card border border-border p-5 rounded-xl shadow-sm">
          <h3 className="font-bold mb-4">Configuración del Documento</h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Asunto</label>
              <Input 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                className="font-medium text-xs"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Cliente</label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} className="text-xs" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Atención A</label>
                <Input value={attentionTo} onChange={(e) => setAttentionTo(e.target.value)} className="text-xs" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Fecha</label>
                <Input value={date} onChange={(e) => setDate(e.target.value)} className="text-xs" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Válido</label>
                <Input value={validity} onChange={(e) => setValidity(e.target.value)} className="text-xs" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Nº Referencia</label>
                <Input value={reference} onChange={(e) => setReference(e.target.value)} className="text-xs" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl shadow-sm max-h-[400px] overflow-y-auto">
          <h3 className="font-bold mb-4">Tabla de Tarifas</h3>
          <div className="space-y-3">
            {rates.map((rate, i) => (
              <div key={i} className="flex gap-2">
                <Input 
                  value={rate.range} 
                  onChange={(e) => handleRateChange(i, "range", e.target.value)}
                  placeholder="Rango Kg/Vol"
                  className="text-xs"
                />
                <Input 
                  value={rate.price} 
                  onChange={(e) => handleRateChange(i, "price", e.target.value)}
                  placeholder="Precio o 'Caso a Caso'"
                  className="text-xs w-28"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-xl shadow-sm max-h-[300px] overflow-y-auto">
          <h3 className="font-bold mb-4">Condiciones Comerciales</h3>
          <div className="space-y-3">
            {conditions.map((cond, i) => (
              <Input 
                key={i}
                value={cond} 
                onChange={(e) => handleConditionChange(i, e.target.value)}
                className="text-xs"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="w-full lg:w-2/3 flex flex-col items-center">
        <div className="w-full flex justify-end mb-4">
          <Button onClick={handleExportPDF} disabled={isExporting} className="gap-2 shadow-md">
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? "Generando..." : "Descargar Tarifario PDF"}
          </Button>
        </div>
        
        {/* A4 Container (Wrapper for proper scaling in browser while maintaining A4 aspect ratio) */}
        <div className="w-full max-w-[794px] overflow-x-auto shadow-2xl rounded border border-border/50 bg-muted/50 p-4 flex justify-center">
          <div 
            ref={pdfRef}
            className="origin-top transition-transform pb-20 xl:pb-0" 
            style={{ transform: "scale(var(--scale, 0.75))" }}
          >
            <RateCardTemplate 
              title={title}
              rates={rates}
              conditions={conditions}
              clientName={clientName}
              attentionTo={attentionTo}
              date={date}
              validity={validity}
              reference={reference}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
