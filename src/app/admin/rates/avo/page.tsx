"use client";

import { useState, useEffect, useMemo } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Save, 
  MapPin, 
  Loader2, 
  ArrowLeft, 
  Edit3, 
  Plus, 
  Copy, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function AvoRatesManager() {
    const { supabase } = useSupabase();
    const [matrices, setMatrices] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

    // Estado para edición
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ tbp_price: "", tbfp_price: "" });

    useEffect(() => {
        fetchMatrices();
    }, []);

    async function fetchMatrices() {
        setIsLoading(true);
        const { data, error } = await supabase
            .from("concession_matrices")
            .select("*")
            .eq("concession_name", "AVO")
            .order("entry_portico_ref", { ascending: true });
        
        if (data) setMatrices(data);
        setIsLoading(false);
    }

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleEdit = (item: any) => {
        setEditingId(item.id);
        setEditForm({ 
            tbp_price: item.tbp_price?.toString() || "0", 
            tbfp_price: item.tbfp_price?.toString() || "0" 
        });
    };

    const handleSave = async (id: string) => {
        setIsSaving(true);
        const { error } = await supabase
            .from("concession_matrices")
            .update({
                tbp_price: parseInt(editForm.tbp_price.replace(/\D/g, "")) || 0,
                tbfp_price: parseInt(editForm.tbfp_price.replace(/\D/g, "")) || 0
            })
            .eq("id", id);

        if (!error) {
            showToast("Tarifa actualizada correctamente");
            setEditingId(null);
            fetchMatrices();
        } else {
            showToast("Error al guardar", "error");
        }
        setIsSaving(false);
    };

    // Función mágica para duplicar categorías
    const handleDuplicateCategories = async () => {
        if (!confirm("Esto creará automáticamente filas para CAT 1 y CAT 2 basadas en los datos de CAT 3. ¿Continuar?")) return;
        
        setIsSaving(true);
        try {
            // 1. Obtener los de categoría 3
            const { data: cat3Data } = await supabase.from("concession_matrices").select("*").eq("category", 3).eq("concession_name", "AVO");
            
            if (!cat3Data) return;

            const newRows: any[] = [];
            cat3Data.forEach(row => {
                // Agregar Cat 2 (70%)
                newRows.push({
                    concession_name: row.concession_name,
                    entry_portico_ref: row.entry_portico_ref,
                    exit_portico_ref: row.exit_portico_ref,
                    category: 2,
                    tbp_price: Math.round(row.tbp_price * 0.7),
                    tbfp_price: Math.round(row.tbfp_price * 0.7),
                    distance_km: row.distance_km,
                    peak_windows: row.peak_windows,
                    peak_days: row.peak_days
                });
                // Agregar Cat 1 (40%)
                newRows.push({
                    concession_name: row.concession_name,
                    entry_portico_ref: row.entry_portico_ref,
                    exit_portico_ref: row.exit_portico_ref,
                    category: 1,
                    tbp_price: Math.round(row.tbp_price * 0.4),
                    tbfp_price: Math.round(row.tbfp_price * 0.4),
                    distance_km: row.distance_km,
                    peak_windows: row.peak_windows,
                    peak_days: row.peak_days
                });
            });

            const { error } = await supabase.from("concession_matrices").insert(newRows);
            if (error) throw error;

            showToast("Categorías 1 y 2 generadas con éxito");
            fetchMatrices();
        } catch (err) {
            showToast("Error al duplicar categorías", "error");
        }
        setIsSaving(false);
    };

    const filteredMatrices = matrices.filter(m => 
        m.entry_portico_ref.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.exit_portico_ref.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-[2rem] border shadow-sm">
                <div className="flex items-center gap-4">
                    <Link href="/admin/rates">
                        <Button variant="outline" size="icon" className="rounded-full"><ArrowLeft className="h-4 w-4" /></Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">GESTIÓN DE TARIFAS AVO</h1>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Matriz de Concesión Américo Vespucio Oriente</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button 
                        onClick={handleDuplicateCategories} 
                        variant="outline" 
                        className="rounded-xl font-bold text-[10px] uppercase tracking-widest border-primary/20 text-primary hover:bg-primary/5"
                    >
                        <Copy className="h-3.5 w-3.5 mr-2" /> Auto-Generar CAT 1/2
                    </Button>
                </div>
            </div>

            {/* Buscador */}
            <Card className="rounded-[1.5rem] border shadow-md">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar por pórtico de entrada o salida..." 
                            className="pl-10 h-11 bg-muted/30 border-none rounded-xl text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Badge variant="secondary" className="h-11 px-4 rounded-xl font-black">{filteredMatrices.length} Tramos</Badge>
                </CardContent>
            </Card>

            {/* Tabla de Tramos */}
            <div className="grid grid-cols-1 gap-4">
                {isLoading ? (
                    <div className="p-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto opacity-20" /></div>
                ) : filteredMatrices.map((item) => (
                    <Card key={item.id} className="rounded-2xl border hover:border-primary/30 transition-all overflow-hidden group">
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr,auto] items-center">
                            <div className="p-6">
                                <div className="flex flex-wrap items-center gap-3 mb-4">
                                    <Badge className={`${item.category === 3 ? 'bg-red-500' : item.category === 2 ? 'bg-blue-500' : 'bg-green-500'} text-white font-bold`}>
                                        CAT {item.category}
                                    </Badge>
                                    <div className="flex items-center gap-2 text-sm font-bold">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        <span>{item.entry_portico_ref}</span>
                                        <span className="text-muted-foreground mx-1">→</span>
                                        <span>{item.exit_portico_ref}</span>
                                    </div>
                                    <Badge variant="outline" className="font-mono text-[10px]">{item.distance_km} KM</Badge>
                                </div>

                                {editingId === item.id ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in zoom-in-95">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-muted-foreground">Tarifa Punta (TBP)</label>
                                            <div className="relative">
                                                <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                                                <Input 
                                                    type="text" 
                                                    value={editForm.tbp_price} 
                                                    onChange={e => setEditForm({...editForm, tbp_price: e.target.value})}
                                                    className="pl-10 h-12 font-bold text-lg"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-muted-foreground">Tarifa Base (TBFP)</label>
                                            <div className="relative">
                                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                                                <Input 
                                                    type="text" 
                                                    value={editForm.tbfp_price} 
                                                    onChange={e => setEditForm({...editForm, tbfp_price: e.target.value})}
                                                    className="pl-10 h-12 font-bold text-lg"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Tarifa Punta</p>
                                            <p className="text-2xl font-black text-red-600">${item.tbp_price.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Tarifa Base</p>
                                            <p className="text-2xl font-black text-blue-600">${item.tbfp_price.toLocaleString()}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-muted/30 lg:h-full p-6 flex lg:flex-col justify-center gap-2 border-t lg:border-t-0 lg:border-l">
                                {editingId === item.id ? (
                                    <>
                                        <Button 
                                            onClick={() => handleSave(item.id)} 
                                            className="bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold w-full"
                                            disabled={isSaving}
                                        >
                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                                            Guardar
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            onClick={() => setEditingId(null)}
                                            className="rounded-xl font-bold w-full"
                                        >
                                            Cancelar
                                        </Button>
                                    </>
                                ) : (
                                    <Button 
                                        onClick={() => handleEdit(item)} 
                                        variant="secondary" 
                                        className="rounded-xl font-bold px-8 h-12 group-hover:bg-primary group-hover:text-white transition-all"
                                    >
                                        <Edit3 className="h-4 w-4 mr-2" /> Editar Tramo
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Toasts */}
            {toast && (
                <div className={`fixed bottom-8 right-8 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    <span className="font-bold text-sm uppercase tracking-widest">{toast.msg}</span>
                </div>
            )}
        </div>
    );
}
