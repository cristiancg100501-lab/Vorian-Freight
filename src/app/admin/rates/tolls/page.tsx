"use client";

import { useState, useEffect, createContext, useContext, useCallback, useMemo, useRef } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Trash2, 
  Search,
  ChevronRight,
  Zap,
  Clock3,
  CalendarDays,
  Save,
  FileJson,
  MapPin,
  Settings2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  ArrowLeft,
  Edit3,
  ChevronLeft
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import React from "react";

/** 
 * CONTEXTO DE PESTAÑAS (COMPACTO)
 */
const TabsContext = createContext<any>(null);

const Tabs = ({ defaultValue, children, className }: any) => {
  const [activeTab, setActiveTab] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};
const TabsList = ({ children, className }: any) => <div className={className}>{children}</div>;
const TabsTrigger = ({ value, children, className }: any) => {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isActive = activeTab === value;
  return (
    <button onClick={() => setActiveTab(value)} className={`${className} ${isActive ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:bg-muted/50'}`}>
      {children}
    </button>
  );
};
const TabsContent = ({ value, children, className }: any) => {
  const { activeTab } = useContext(TabsContext);
  if (activeTab !== value) return null;
  return <div className={className}>{children}</div>;
};

// Componentes de Tabla UI Base
const Table = ({ children, className }: any) => <div className="w-full overflow-x-auto border rounded-xl bg-card/50"><table className={`w-full caption-bottom text-sm ${className}`}>{children}</table></div>;
const TableHeader = ({ children, className }: any) => <thead className={`bg-muted/50 border-b ${className}`}>{children}</thead>;
const TableBody = ({ children, className }: any) => <tbody className={`[&_tr:last-child]:border-0 ${className}`}>{children}</tbody>;
const TableRow = ({ children, className }: any) => <tr className={`border-b transition-colors hover:bg-muted/30 ${className}`}>{children}</tr>;
const TableHead = ({ children, className }: any) => <th className={`h-10 px-4 text-left align-middle font-semibold text-muted-foreground text-xs uppercase tracking-wider ${className}`}>{children}</th>;
const TableCell = ({ children, className }: any) => <td className={`p-3 align-middle ${className}`}>{children}</td>;
const Label = ({ children, className }: any) => <label className={`text-xs font-bold uppercase tracking-tight text-muted-foreground/80 ${className}`}>{children}</label>;

const INITIAL_TARIFFS = {
  price_tbfp: 0, price_tbp: 0, price_ts: 0,
  ts_laboral: null, ts_sabado: null, ts_domingo: null, tbp_laboral: null, tbp_sabado: null, tbp_domingo: null
};

/**
 * COMPONENTE DE EDICIÓN FLUIDA (OPTIMIZACIÓN EXTREMA)
 * Acumula el estado al teclear y solo emite al difuminar (Blur). 
 * Previene re- renders del árbol maestro al escribir.
 */
const OptimizedLocalInput = React.memo(({ value, onChange, placeholder, className, type = "text" }: any) => {
    const [localValue, setLocalValue] = useState(value || "");
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { setLocalValue(value || ""); }, [value]);

    const flushState = () => {
        if (localValue !== value) onChange(localValue);
    };

    return (
        <Input 
            ref={inputRef}
            type={type}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={flushState}
            onKeyDown={(e) => {
               if (e.key === 'Enter') {
                  flushState();
                  inputRef.current?.blur();
               }
            }}
            placeholder={placeholder}
            className={className}
        />
    );
});
OptimizedLocalInput.displayName = 'OptimizedLocalInput';

// EDITOR DE MATRIX Y TABLAS DE FRANJAS
const MatrixEditor = React.memo(({ category, tariffs, onTariffChange }: any) => {
    const data = tariffs[category] || { ...INITIAL_TARIFFS };

    const getWindows = (field: string) => {
        const val = data[field];
        if (val === null || val === undefined) return [];
        return val.split("/").map((s: string) => s.trim());
    };

    const updateWindows = (field: string, windows: string[]) => {
        if (windows.length === 0) { onTariffChange(category, field, null); return; }
        onTariffChange(category, field, windows.join(" / "));
    };

    const WindowInput = ({ value, onChange, onRemove, placeholder }: any) => {
        const isHoliday = value?.includes('[H]');
        const displayValue = value?.replace('[H]', '').trim();

        const toggleHoliday = () => {
            if (isHoliday) {
                onChange(displayValue);
            } else {
                onChange(`${displayValue} [H]`);
            }
        };

        return (
            <div className={`flex items-center gap-2 mb-1 group animate-in fade-in duration-200 p-1.5 rounded-lg border transition-all ${isHoliday ? 'bg-orange-500/5 border-orange-500/30' : 'border-transparent'}`}>
                <div className="relative flex-1">
                    <OptimizedLocalInput 
                        value={displayValue} 
                        onChange={(val: any) => onChange(isHoliday ? `${val} [H]` : val)} 
                        placeholder={placeholder} 
                        className={`h-9 text-xs font-mono shadow-none border-none bg-transparent focus-visible:ring-0 ${isHoliday ? 'text-orange-700 font-bold' : ''}`} 
                    />
                    {isHoliday && (
                        <Badge className="absolute -top-3 -left-1 bg-orange-500 text-[8px] h-4 px-1 pointer-events-none shadow-sm">FERIADO</Badge>
                    )}
                </div>
                
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={toggleHoliday} 
                    className={`h-8 w-8 rounded-md shrink-0 transition-colors ${isHoliday ? 'text-orange-500 bg-orange-500/10' : 'text-muted-foreground/30 hover:text-orange-500'}`}
                    title="Activar para Feriados"
                >
                    <CalendarDays className="h-3.5 w-3.5" />
                </Button>

                <Button variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8 text-muted-foreground/30 hover:text-destructive shrink-0"><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
        );
    };

    const ScheduleGroup = ({ title, field, icon: Icon, colorClass, windows, onUpdate }: any) => (
        <TableRow>
            <TableCell className={`font-bold py-4 ${colorClass}`}>
                <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] md:text-sm uppercase tracking-tight">{title}</span>
                </div>
            </TableCell>
            <TableCell>
                <div className="flex flex-col gap-1">
                    {windows.map((w: string, idx: number) => (
                        <WindowInput 
                            key={`${field}-${idx}`}
                            value={w}
                            onChange={(val: string) => { const newWin = [...windows]; newWin[idx] = val; onUpdate(field, newWin); }}
                            onRemove={() => { const filtered = windows.filter((_, i) => i !== idx); onUpdate(field, filtered.length > 0 ? filtered : []); }}
                            placeholder="07:00-08:00"
                        />
                    ))}
                    <Button variant="ghost" size="sm" className="w-full border-dashed border h-7 text-[9px] uppercase font-black text-muted-foreground hover:text-primary mt-1 hover:bg-primary/5" onClick={() => onUpdate(field, [...windows, ""])}>
                        <Plus className="h-3 w-3 mr-2" /> añadir franja
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                    { label: 'BASE (TBFP)', field: 'price_tbfp', color: 'blue' },
                    { label: 'PUNTA (TBP)', field: 'price_tbp', color: 'yellow' },
                    { label: 'SATURACIÓN (TS)', field: 'price_ts', color: 'red' }
                ].map((item: any) => (
                    <div key={`${category}-${item.field}`} className={`p-4 bg-muted/10 rounded-xl border-2 border-transparent hover:border-${item.color}-500/20 transition-all shadow-sm`}>
                        <Label className={`text-[10px] text-${item.color}-600 block text-center mb-2 font-black tracking-widest`}>{item.label}</Label>
                        <OptimizedLocalInput type="number" value={data[item.field]} onChange={(val: any) => onTariffChange(category, item.field, val)} className="font-mono text-2xl text-center font-black border-none bg-background shadow-inner h-10 focus-visible:ring-0 rounded-lg" />
                    </div>
                ))}
            </div>

            <Table>
                <TableHeader>
                    <TableRow><TableHead className="w-[180px]">TARIFA / DÍA</TableHead><TableHead>VENTANAS HORARIAS</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                    <ScheduleGroup title="TS LABORAL" field="ts_laboral" icon={Zap} colorClass="text-red-500" windows={getWindows("ts_laboral")} onUpdate={updateWindows} />
                    <ScheduleGroup title="TS SÁBADO" field="ts_sabado" icon={Zap} colorClass="text-red-500" windows={getWindows("ts_sabado")} onUpdate={updateWindows} />
                    <ScheduleGroup title="TS DOMINGO" field="ts_domingo" icon={Zap} colorClass="text-red-500" windows={getWindows("ts_domingo")} onUpdate={updateWindows} />
                    
                    <TableRow className="bg-muted/30 h-1"><TableCell colSpan={2} className="p-0"></TableCell></TableRow>

                    <ScheduleGroup title="TBP LABORAL" field="tbp_laboral" icon={Clock3} colorClass="text-yellow-600" windows={getWindows("tbp_laboral")} onUpdate={updateWindows} />
                    <ScheduleGroup title="TBP SÁBADO" field="tbp_sabado" icon={CalendarDays} colorClass="text-blue-500" windows={getWindows("tbp_sabado")} onUpdate={updateWindows} />
                    <ScheduleGroup title="TBP DOMINGO" field="tbp_domingo" icon={CalendarDays} colorClass="text-blue-700" windows={getWindows("tbp_domingo")} onUpdate={updateWindows} />
                </TableBody>
            </Table>
        </div>
    );
});
MatrixEditor.displayName = 'MatrixEditor';

export default function TollRatesMatrixPage() {
  const { supabase } = useSupabase();
  
  // App State
  const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
  const [porticos, setPorticos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error' | 'sync'} | null>(null);
  
  // List State
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Edit State
  const [selectedPortico, setSelectedPortico] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [tariffs, setTariffs] = useState<any>({ cat1: { ...INITIAL_TARIFFS }, cat2: { ...INITIAL_TARIFFS }, cat3: { ...INITIAL_TARIFFS } });
  const [generalInfo, setGeneralInfo] = useState({ name: "", reference_code: "", latitude: 0, longitude: 0, is_active: true });

  // Effects
  useEffect(() => {
    if (toast && toast.type !== 'sync') {
        const timer = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => { fetchPorticos(); }, []);

  const fetchPorticos = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from("porticos").select("*").order("reference_code", { ascending: true, nullsFirst: false });
    if (error) {
        showToast("Error de conexión SQL", "error");
    } else {
        setPorticos(data || []);
        
        // Auto-open editor from URL params
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const editId = params.get('id');
            if (editId && data) {
                const porticoToEdit = data.find((p: any) => p.id === editId);
                if (porticoToEdit) {
                    setTimeout(() => openEditor(porticoToEdit), 150);
                }
            }
        }
    }
    setIsLoading(false);
  };

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'sync' = 'success') => setToast({ msg, type }), []);

  // Filtering & Pagination Logic
  const filteredPorticos = useMemo(() => {
      // NOTE: Removed state mutation inside useMemo
      return porticos.filter(p => p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.reference_code?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [porticos, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredPorticos.length / ITEMS_PER_PAGE));
  const currentPageItems = useMemo(() => {
      const start = (currentPage - 1) * ITEMS_PER_PAGE;
      return filteredPorticos.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPorticos, currentPage]);

  // View Navigation
  const openEditor = (portico: any) => {
      setSelectedPortico(portico);
      const data = portico.tariffs_json || {};
      setTariffs({ cat1: data.cat1 || { ...INITIAL_TARIFFS }, cat2: data.cat2 || { ...INITIAL_TARIFFS }, cat3: data.cat3 || { ...INITIAL_TARIFFS }});
      setGeneralInfo({ name: portico.name || "", reference_code: portico.reference_code || "", latitude: portico.latitude || 0, longitude: portico.longitude || 0, is_active: portico.is_active ?? true });
      setViewMode('edit');
  };

  const closeEditor = () => {
      setViewMode('list');
      setSelectedPortico(null);
  };

  const handleTariffChange = useCallback((category: string, field: string, value: any) => {
    setTariffs((prev: any) => ({ ...prev, [category]: { ...prev[category], [field]: value } }));
  }, []);

  const normalizePrice = (val: any) => {
      if (val === null || val === undefined || val === '') return 0;
      // Convert to string and remove all non-numeric except dot/comma
      const str = String(val).replace(/[^0-9.,]/g, '');
      // If has both , and . (like 1.234,56), we assume the last is decimal
      // If it only has one, it depends on context, but let's be robust:
      // Remove all dots/commas except the last one for decimal parsing if needed
      // Actually, for tolls usually we don't have thousands separators in raw input
      // Let's just normalize to dot-decimal
      const parts = str.split(/[.,]/);
      if (parts.length > 1) {
          const decimals = parts.pop();
          const integer = parts.join('');
          return parseFloat(`${integer}.${decimals}`);
      }
      return parseFloat(str) || 0;
  };

  const normalizeTimeFormat = (val: string) => {
      if (!val) return null;
      const isHoliday = val.includes('[H]');
      
      // 1. Replace dots with colon
      let cleaned = val.replace(/\[H\]/g, '').replace(/\./g, ':').trim();
      
      // 2. Handle ranges (HH:MM-HH:MM or HH:MMHH:MM)
      // Attempt to find two time patterns
      const timeRegex = /(\d{1,2})[:](\d{1,2})/g;
      const matches = [...cleaned.matchAll(timeRegex)];
      
      let result = cleaned;
      if (matches.length === 2) {
          const format = (m: any) => {
              const h = m[1].padStart(2, '0');
              const min = m[2].padStart(2, '0');
              return `${h}:${min}`;
          };
          result = `${format(matches[0])} - ${format(matches[1])}`;
      } else {
          // Fallback for single time or malformed (just cleaning spaces)
          result = cleaned.replace(/\s+/g, '');
      }

      return isHoliday ? `${result} [H]` : result;
  };

  const handleSave = async () => {
    if (!selectedPortico) return;
    setIsSaving(true);
    showToast("Sincronizando DB...", "sync");

    const cleanedTariffs = JSON.parse(JSON.stringify(tariffs));
    const timeFields = ['ts_laboral', 'ts_sabado', 'ts_domingo', 'tbp_laboral', 'tbp_sabado', 'tbp_domingo'];
    const priceFields = ['price_tbfp', 'price_tbp', 'price_ts'];

    ['cat1', 'cat2', 'cat3'].forEach(cat => {
        // Normalizar Precios
        priceFields.forEach(f => {
            cleanedTariffs[cat][f] = normalizePrice(cleanedTariffs[cat][f]);
        });

        // Solo normalizamos ventanas horarias en CAT 1 primero (luego se propagan o normalizan en el resto)
        if (cat === 'cat1') {
            timeFields.forEach(f => {
                const val = cleanedTariffs.cat1[f];
                if (val) {
                    const filtered = val.split("/")
                        .map((s: string) => normalizeTimeFormat(s))
                        .filter((s: string | null) => s !== null && s !== "");
                    cleanedTariffs.cat1[f] = filtered.length > 0 ? filtered.join(" / ") : null;
                } else {
                    cleanedTariffs.cat1[f] = null;
                }
            });
        }
    });

    // 2. Aplicar Franjas de CAT 1 a CAT 2 y CAT 3 automáticamente si están vacías
    ['cat2', 'cat3'].forEach(cat => {
        timeFields.forEach(f => {
            const val = cleanedTariffs[cat][f];
            if (!val || String(val).trim() === '') {
                // Heredar de CAT 1 (que ya está normalizada)
                cleanedTariffs[cat][f] = cleanedTariffs.cat1[f];
            } else {
                // Normalizar si se escribió algo a mano en CAT 2/3
                const filtered = val.split("/")
                    .map((s: string) => normalizeTimeFormat(s))
                    .filter((s: string | null) => s !== null && s !== "");
                cleanedTariffs[cat][f] = filtered.length > 0 ? filtered.join(" / ") : null;
            }
        });
    });

    try {
        const { error } = await supabase
          .from("porticos")
          .update({ 
            name: generalInfo.name, reference_code: generalInfo.reference_code,
            latitude: generalInfo.latitude, longitude: generalInfo.longitude,
            is_active: generalInfo.is_active, tariffs_json: cleanedTariffs,
            location: `SRID=4326;POINT(${generalInfo.longitude} ${generalInfo.latitude})`
          }).eq("id", selectedPortico.id);

        if (error) { showToast(`Error SQL: ${error.message}`, "error"); } 
        else { showToast("Sincronizado Correctamente"); await fetchPorticos(); }
    } catch (err) { showToast("Error fatal", "error"); } 
    finally { setIsSaving(false); }
  };


  /* =========================================================
     VISTA 1: TABLA PRINCIPAL (MAESTRO)
  ========================================================= */
  const renderListView = () => (
      <div className="flex flex-col gap-6 animate-in fade-in duration-500">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card p-6 md:p-8 rounded-[2.5rem] border shadow-sm">
            <div>
               <h1 className="text-3xl font-black tracking-tight text-primary">ADMIN DE PEAJES (TAG)</h1>
               <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] mt-1">Gestión Dinámica de Tarifas y Geocercas</p>
            </div>
         </div>

         <Card className="rounded-[2rem] border bg-card shadow-lg flex flex-col overflow-hidden">
             {/* Toolbar & Buscador */}
             <div className="p-6 border-b bg-muted/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div className="relative w-full max-w-lg">
                    <Search className="absolute left-4 top-3.5 h-4 w-4 text-muted-foreground opacity-50" />
                    <Input
                        placeholder="BUSCAR PÓRTICO POR CÓDIGO O NOMBRE..."
                        className="pl-12 h-11 rounded-2xl border bg-background shadow-inner text-xs font-black uppercase tracking-widest placeholder:opacity-30"
                        value={searchTerm}
                        onChange={(e) => {
                             setSearchTerm(e.target.value);
                             setCurrentPage(1);
                        }}
                    />
                 </div>
                 <Badge variant="outline" className="px-4 py-2 text-xs uppercase font-black tracking-widest rounded-xl">
                    {filteredPorticos.length} PÓRTICOS REGISTRADOS
                 </Badge>
             </div>

             {/* Mega Table */}
             <div className="overflow-x-auto min-h-[400px]">
                 <table className="w-full text-left border-collapse">
                     <thead className="bg-muted/30 border-b">
                         <tr>
                             <th className="p-5 font-black text-[10px] uppercase tracking-widest text-muted-foreground/60 w-24">CÓDIGO (ID)</th>
                             <th className="p-5 font-black text-[10px] uppercase tracking-widest text-muted-foreground/60">NOMBRE / UBICACIÓN DEL PÓRTICO</th>
                             <th className="p-5 font-black text-[10px] uppercase tracking-widest text-muted-foreground/60 w-32 text-center">COORDENADAS</th>
                             <th className="p-5 font-black text-[10px] uppercase tracking-widest text-muted-foreground/60 w-32 text-center">ESTADO</th>
                             <th className="p-5 font-black text-[10px] uppercase tracking-widest text-muted-foreground/60 w-40 text-right">MANTENIMIENTO</th>
                         </tr>
                     </thead>
                     {isLoading ? (
                        <tbody><tr><td colSpan={5} className="p-10 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-50" /><p className="text-xs uppercase font-black tracking-widest mt-4 opacity-50">Cargando Infraestructura...</p></td></tr></tbody>
                     ) : (
                         <tbody className="divide-y divide-border">
                             {currentPageItems.length === 0 ? (
                               <tr><td colSpan={5} className="p-10 text-center text-xs font-bold uppercase tracking-widest opacity-40">No se encontraron pórticos.</td></tr>
                             ) : currentPageItems.map(p => (
                                 <tr key={p.id} className="hover:bg-muted/10 transition-colors group">
                                     <td className="p-5">
                                         <Badge variant="outline" className="font-mono bg-primary/5 text-primary border-primary/20">{p.reference_code || "S/N"}</Badge>
                                     </td>
                                     <td className="p-5">
                                         <span className="font-bold text-sm uppercase tracking-tight">{p.name || "Pórtico Desconocido"}</span>
                                     </td>
                                     <td className="p-5 text-center">
                                         {p.latitude && p.longitude ? <Badge variant="outline" className="bg-blue-500/5 text-blue-600 border-none">GPS OK</Badge> : <Badge variant="outline" className="bg-red-500/5 text-red-600 border-none">NO GPS</Badge>}
                                     </td>
                                     <td className="p-5 text-center">
                                         {p.is_active ? <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-none text-[10px]">ACTIVO</Badge> : <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-none text-[10px]">INACTIVO</Badge>}
                                     </td>
                                     <td className="p-5 text-right">
                                         <Button onClick={() => openEditor(p)} className="rounded-xl font-bold uppercase text-[10px] bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 scale-100 group-hover:scale-105 transition-all">
                                             <Edit3 className="h-3.5 w-3.5 mr-2" /> EDITAR
                                         </Button>
                                     </td>
                                 </tr>
                             ))}
                         </tbody>
                     )}
                 </table>
             </div>

             {/* Paginación */}
             <div className="p-4 border-t bg-muted/10 flex justify-between items-center px-8">
                 <span className="text-[10px] font-black uppercase tracking-widest opacity-50">
                     PÁGINA {currentPage} DE {totalPages}
                 </span>
                 <div className="flex gap-2">
                     <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="rounded-xl h-9">ANTERIOR</Button>
                     <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="rounded-xl h-9">SIGUIENTE</Button>
                 </div>
             </div>
         </Card>
      </div>
  );


  /* =========================================================
     VISTA 2: EDITOR DEDICADO A PANTALLA COMPLETA (DETALLE)
  ========================================================= */
  const renderEditView = () => (
      <div className="flex flex-col gap-6 animate-in slide-in-from-right-10 duration-500">
          
        <Card className="rounded-[2rem] border bg-gradient-to-r from-card to-muted/20 p-5 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-6">
                <Button variant="outline" size="icon" onClick={closeEditor} className="h-12 w-12 rounded-full hover:bg-primary hover:text-white transition-colors border-2 shadow-sm"><ChevronLeft className="h-6 w-6" /></Button>
                <div>
                   <h1 className="text-xl font-black tracking-tight uppercase leading-none">EDITAR MATRIZ</h1>
                   <div className="flex items-center gap-2 mt-1.5 font-black uppercase">
                       <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{selectedPortico?.name}</span>
                       <Badge className="bg-primary/20 text-primary border-none text-[8px] h-4 px-2 ml-2">{selectedPortico?.reference_code}</Badge>
                   </div>
                </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
                <Button size="lg" className="rounded-xl text-xs font-black px-10 h-12 shadow-xl shadow-primary/20 uppercase tracking-widest w-full md:w-auto" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    {isSaving ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
                </Button>
            </div>
        </Card>

        {/* Editor Central a Pantalla Completa */}
        <Card className="border rounded-[2rem] overflow-hidden bg-card shadow-2xl">
           <Tabs defaultValue="horarios">
              <CardHeader className="p-4 border-b bg-muted/10 pb-4 flex flex-row items-center justify-center">
                 <TabsList className="bg-background shadow-inner p-1.5 rounded-xl flex gap-1 border">
                    <TabsTrigger value="horarios" className="px-10 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all">💰 MATRIZ DE PRECIOS</TabsTrigger>
                    <TabsTrigger value="detalles" className="px-10 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all">⚙️ CONFIGURACIÓN GPS</TabsTrigger>
                 </TabsList>
              </CardHeader>

              <div className="p-6 md:p-12 w-full max-w-screen-xl mx-auto min-h-[60vh]">
                 <TabsContent value="horarios" className="mt-0">
                    <Tabs defaultValue="cat3">
                       <div className="flex gap-2 mb-8 bg-muted/30 p-1.5 rounded-2xl w-fit border shadow-sm mx-auto">
                           <TabsTrigger value="cat1" className="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">LIGEROS (CAT 1)</TabsTrigger>
                           <TabsTrigger value="cat2" className="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">MEDIANOS (CAT 2)</TabsTrigger>
                           <TabsTrigger value="cat3" className="px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">PESADOS (CAT 3)</TabsTrigger>
                       </div>
                       <TabsContent value="cat1"><MatrixEditor category="cat1" tariffs={tariffs} onTariffChange={handleTariffChange} /></TabsContent>
                       <TabsContent value="cat2"><MatrixEditor category="cat2" tariffs={tariffs} onTariffChange={handleTariffChange} /></TabsContent>
                       <TabsContent value="cat3"><MatrixEditor category="cat3" tariffs={tariffs} onTariffChange={handleTariffChange} /></TabsContent>
                    </Tabs>
                 </TabsContent>

                 <TabsContent value="detalles" className="mt-0 max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                       <div className="space-y-8">
                          <div className="space-y-3">
                             <Label>NOMBRE OFICIAL DEL PÓRTICO</Label>
                             <OptimizedLocalInput defaultValue={generalInfo.name} onChange={(val: string) => setGeneralInfo({...generalInfo, name: val})} className="h-12 text-sm font-black border-2 rounded-xl" />
                          </div>
                          <div className="space-y-3">
                             <Label>CÓDIGO INTERNO (EXCEL / SYNC)</Label>
                             <OptimizedLocalInput defaultValue={generalInfo.reference_code} onChange={(val: string) => setGeneralInfo({...generalInfo, reference_code: val})} className="h-12 text-sm font-black uppercase text-primary bg-primary/5 border-2 border-primary/20 rounded-xl" />
                          </div>
                          <div className="flex items-center justify-between p-6 bg-card rounded-2xl border-2 border-dashed shadow-sm">
                             <div className="flex flex-col gap-1">
                                <span className="text-sm font-black uppercase tracking-tight">ESTADO DEL PÓRTICO</span>
                                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Activar para permitir el cobro dinámico</span>
                             </div>
                             <Switch checked={generalInfo.is_active} onCheckedChange={(val) => setGeneralInfo({...generalInfo, is_active: val})} className="scale-125" />
                          </div>
                       </div>
                       
                       <div className="p-10 bg-primary/5 rounded-[3rem] border-2 border-primary/10 space-y-8 flex flex-col justify-center relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-8 opacity-5"><MapPin className="h-32 w-32" /></div>
                          <h4 className="text-xs font-black uppercase tracking-[0.3em] flex items-center gap-3 text-primary opacity-60"><MapPin className="h-5 w-5" /> COORDENADAS POSTGIS (GEOPUNTOS)</h4>
                          <div className="grid grid-cols-1 gap-8 z-10">
                             <div className="space-y-2">
                                <Label className="text-[10px] opacity-60 ml-2">LATITUD EXACTA</Label>
                                <OptimizedLocalInput type="number" defaultValue={generalInfo.latitude} onChange={(val: any) => setGeneralInfo({...generalInfo, latitude: parseFloat(val)})} className="font-mono text-3xl h-auto border-none bg-transparent shadow-none p-0 focus-visible:ring-0 font-black tracking-tighter" />
                             </div>
                             <div className="h-px bg-primary/20 w-full" />
                             <div className="space-y-2">
                                <Label className="text-[10px] opacity-60 ml-2">LONGITUD EXACTA</Label>
                                <OptimizedLocalInput type="number" defaultValue={generalInfo.longitude} onChange={(val: any) => setGeneralInfo({...generalInfo, longitude: parseFloat(val)})} className="font-mono text-3xl h-auto border-none bg-transparent shadow-none p-0 focus-visible:ring-0 font-black tracking-tighter" />
                             </div>
                          </div>
                       </div>
                    </div>
                 </TabsContent>
              </div>
           </Tabs>
        </Card>
      </div>
  );

  return (
    <div className="relative min-h-[calc(100vh-100px)]">
      {/* Sistema de Alertas Global */}
      {toast && (
          <div className={`fixed bottom-8 right-8 z-[9999] px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 ${
              toast.type === 'success' ? 'bg-green-500 text-white font-black' : 
              toast.type === 'sync' ? 'bg-blue-600 text-white font-black animate-pulse' :
              'bg-destructive text-destructive-foreground font-black'
          }`}>
             {toast.type === 'success' ? <CheckCircle2 className="h-6 w-6" /> : 
              toast.type === 'sync' ? <Loader2 className="h-6 w-6 animate-spin" /> :
              <AlertCircle className="h-6 w-6" />}
             <span className="text-sm uppercase tracking-widest">{toast.msg}</span>
          </div>
      )}

      {/* Renderizado Condicional de la Arquitectura Master-Detail */}
      {viewMode === 'list' ? renderListView() : renderEditView()}
      
    </div>
  );
}
