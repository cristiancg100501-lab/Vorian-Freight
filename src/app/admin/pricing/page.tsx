"use client";

import { useState } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { useSupabaseCollection } from "@/hooks/supabase-hooks";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DollarSign, 
  Plus, 
  Trash2,
  MapPin,
  Package
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

export default function PricingEnginePage() {
  const { supabase } = useSupabase();
  const { data: pricingRules, isLoading, refetch } = useSupabaseCollection("pricing_rules");

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [cargoType, setCargoType] = useState("");
  const [price, setPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleAddPricing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin || !destination || !cargoType || !price) {
      setError("Todos los campos son obligatorios.");
      return;
    }
    
    setError("");
    setIsSubmitting(true);

    try {
      const { error: insertError } = await supabase
        .from('pricing_rules')
        .insert({
          origin_id: origin,
          destination_id: destination,
          cargo_type: cargoType,
          price: parseFloat(price)
        });

      if (insertError) {
        if (insertError.code === '23505') { // unique violation
          throw new Error("Ya existe una tarifa configurada para esta ruta y tipo de carga.");
        }
        throw insertError;
      }

      setOrigin("");
      setDestination("");
      setCargoType("");
      setPrice("");
      refetch();
    } catch (err: any) {
      setError(err.message || "Error al guardar la tarifa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta tarifa?")) return;
    
    try {
      await supabase.from('pricing_rules').delete().eq('id', id);
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-primary" />
          Motor de Precios
        </h1>
        <p className="text-muted-foreground mt-2">
          Configura las tarifas dinámicas que verán tus clientes en el Cotizador Rápido del Landing Page.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Creación */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Nueva Tarifa</CardTitle>
              <CardDescription>Añade una regla de precio exacta.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPricing} className="flex flex-col gap-4">
                
                {/* Origen */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Origen</label>
                  <select 
                    value={origin} 
                    onChange={e => setOrigin(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="" disabled>Selecciona origen...</option>
                    <option value="san_antonio">Puerto San Antonio</option>
                    <option value="valparaiso">Puerto Valparaíso</option>
                    <option value="iquique">Puerto Iquique</option>
                    <option value="san_vicente">Puerto San Vicente / Coronel</option>
                    <option value="scl">Aeropuerto SCL</option>
                    <option value="bodega_cliente">Bodega / Centro de Distribución</option>
                  </select>
                </div>

                {/* Destino */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Destino</label>
                  <select 
                    value={destination} 
                    onChange={e => setDestination(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="" disabled>Selecciona destino...</option>
                    <option value="rm_santiago">Región Metropolitana</option>
                    <option value="norte">Zona Norte</option>
                    <option value="sur">Zona Sur</option>
                    <option value="san_antonio">Puerto San Antonio</option>
                    <option value="valparaiso">Puerto Valparaíso</option>
                    <option value="scl">Aeropuerto SCL</option>
                  </select>
                </div>

                {/* Tipo de Carga */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Carga</label>
                  <select 
                    value={cargoType} 
                    onChange={e => setCargoType(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="" disabled>Selecciona tipo...</option>
                    <option value="fcl_20">Contenedor 20'</option>
                    <option value="fcl_40">Contenedor 40' / 40' HC</option>
                    <option value="fcl_reefer">Contenedor Reefer</option>
                    <option value="lcl">Carga Suelta (LCL)</option>
                    <option value="air">Carga Aérea</option>
                    <option value="peligrosa">Carga Peligrosa</option>
                    <option value="sobredimensionada">Sobredimensionada</option>
                  </select>
                </div>

                {/* Precio */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Precio (CLP)</label>
                  <Input 
                    type="number" 
                    placeholder="Ej. 250000" 
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                  />
                </div>

                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

                <Button type="submit" disabled={isSubmitting} className="w-full mt-2">
                  <Plus className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Guardando..." : "Guardar Tarifa"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Tarifas */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Tarifas Configuradas</CardTitle>
              <CardDescription>Rutas activas en el cotizador público.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center p-8 text-muted-foreground">Cargando tarifas...</div>
              ) : !pricingRules || pricingRules.length === 0 ? (
                <div className="text-center p-12 border border-dashed rounded-xl bg-muted/20">
                  <p className="text-muted-foreground">No hay tarifas configuradas aún.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  <AnimatePresence>
                    {pricingRules.map((rule: any) => (
                      <motion.div
                        key={rule.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <MapPin className="w-4 h-4 text-blue-500" />
                            {rule.origin_id}
                            <span className="text-muted-foreground mx-1">→</span>
                            {rule.destination_id}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Package className="w-3 h-3" />
                            {rule.cargo_type}
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Tarifa</p>
                            <p className="text-lg font-bold text-green-500">
                              ${rule.price.toLocaleString("es-CL")}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => handleDelete(rule.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
