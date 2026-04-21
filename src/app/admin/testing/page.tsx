"use client";

import { useSupabaseCollection } from "@/hooks/supabase-hooks";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Send, CheckCircle2, AlertCircle, Loader2, Truck } from "lucide-react";

export default function TestingMailsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isManualLoading, setIsManualLoading] = useState(false);
    const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null);

    // Manual Form State
    const [manualEmail, setManualEmail] = useState("");
    const [manualName, setManualName] = useState("");
    const [manualId, setManualId] = useState("");
    const [manualAddress, setManualAddress] = useState("");
    const [manualDriverName, setManualDriverName] = useState("");
    const [manualVehiclePlate, setManualVehiclePlate] = useState("");

    // Obtener cargas para hacer pruebas con datos reales
    const { data: shipments, isLoading: isLoadingShipments } = useSupabaseCollection("shipments");
    
    // Filtrar solo las que tienen Carrier asignado para poder simular el GPS de ese Carrier
    const activeShipments = shipments?.filter((s: any) => s.carrierId && s.status !== 'Delivered') || [];

    const handleSimulateWebhook = async (driverId: string, destLat: number, destLng: number) => {
        setIsLoading(true);
        setResult(null);

        try {
            // Simulamos que el chofer está a 200 metros del destino para forzar el envío del correo de 300m.
            // Para fines de prueba, tomamos la latitud destino y le sumamos 0.001 (~110 metros)
            const fakeDriverLat = destLat + 0.001; 
            const fakeDriverLng = destLng + 0.001;

            const payload = {
                type: "UPDATE",
                table: "driverProfiles",
                record: {
                    id: driverId,
                    currentLatitude: fakeDriverLat,
                    currentLongitude: fakeDriverLng
                }
            };

            const response = await fetch('/api/webhooks/check-geofence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setResult({ success: true, message: data.message || "¡Correo simulado y enviado correctamente mediante Resend!" });
            } else {
                setResult({ success: false, message: data.error || data.message || "La simulación respondió pero no envió el correo." });
            }

        } catch (error: any) {
            setResult({ success: false, message: error.message || "Error al conectar con la API local." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleManualTest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsManualLoading(true);
        setResult(null);

        try {
            const response = await fetch('/api/testing/send-mail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: manualEmail,
                    clientName: manualName,
                    shipmentId: manualId,
                    destinationAddress: manualAddress,
                    driverName: manualDriverName,
                    vehiclePlate: manualVehiclePlate
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setResult({ success: true, message: data.message || "¡Correo de prueba enviado correctamente!" });
                setManualEmail(""); setManualName(""); setManualId(""); setManualAddress("");
                setManualDriverName(""); setManualVehiclePlate("");
            } else {
                setResult({ success: false, message: data.error || "Error al enviar el correo manual." });
            }
        } catch (error: any) {
            setResult({ success: false, message: error.message || "Error al conectar con la API de prueba." });
        } finally {
            setIsManualLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                    <Mail className="h-8 w-8" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Mail Simulator & Webhooks</h1>
                    <p className="text-muted-foreground mt-1">Prueba la integración con Resend simulando actualizaciones de GPS de los camiones.</p>
                </div>
            </div>

            {result && (
                <div className={`p-4 rounded-xl flex gap-3 border ${result.success ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'}`}>
                    {result.success ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
                    <div>
                        <p className="font-bold text-sm">Resultado de la prueba</p>
                        <p className="opacity-90 mt-1 font-mono text-xs">{result.message}</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                <Card className="shadow-lg border-primary/10">
                    <CardHeader className="bg-primary/5 border-b pb-4">
                        <CardTitle className="text-lg">Simular Geocerca (Arribo &lt; 300m)</CardTitle>
                        <CardDescription>
                            Selecciona una carga activa y presiona "Simular Llegada". El sistema engañará internamente al GPS para posicionar al chofer a ~150 metros del destino y forzará el envío del correo electrónico vía Resend.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {isLoadingShipments ? (
                            <div className="py-8 flex flex-col items-center justify-center opacity-50">
                                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                                <p>Cargando viajes activos...</p>
                            </div>
                        ) : activeShipments.length === 0 ? (
                            <div className="py-12 flex flex-col items-center justify-center text-center opacity-60 bg-muted/30 rounded-xl border border-dashed">
                                <AlertCircle className="h-10 w-10 mb-4" />
                                <p className="font-bold">No hay cargas asignadas (Booked / In Transit) con coordenadas válidas.</p>
                                <p className="text-sm mt-1">Crea una carga en el módulo de envíos y asígnala a un chofer para poder hacer pruebas reales.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {activeShipments.map((shipment: any) => {
                                    
                                    const destCoords = shipment.details?.destinationCoords;
                                    const canSimulate = Boolean(destCoords?.lat && destCoords?.lng);
                                    const alreadySent = shipment.details?.arrival_email_sent;

                                    return (
                                        <div key={shipment.id} className="flex flex-col md:flex-row items-center justify-between p-4 bg-muted/30 border rounded-xl hover:bg-muted/50 transition-colors gap-4">
                                            <div className="flex items-center gap-4 w-full md:w-auto">
                                                <div className="p-2 bg-background border shadow-sm rounded-lg">
                                                    <Truck className="h-5 w-5 text-blue-500" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">Carga #{shipment.id.substring(0,8)} <span className="ml-2 text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">{shipment.status}</span></p>
                                                    <p className="text-xs text-muted-foreground mt-1 max-w-[300px] truncate">{shipment.destinationAddress}</p>
                                                    
                                                    {alreadySent && (
                                                        <p className="text-[10px] text-orange-500 font-bold mt-2">⚠️ El correo para esta carga ya fue enviado previamente.</p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <Button 
                                                onClick={() => handleSimulateWebhook(shipment.carrierId, destCoords.lat, destCoords.lng)} 
                                                disabled={isLoading || !canSimulate}
                                                className="w-full md:w-auto font-bold shadow-md"
                                                variant={alreadySent ? "secondary" : "default"}
                                            >
                                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                                Simular Llegada
                                            </Button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-lg border-primary/10">
                    <CardHeader className="bg-primary/5 border-b pb-4">
                        <CardTitle className="text-lg">Envío Manual de Prueba</CardTitle>
                        <CardDescription>
                            Envía un correo a tu cuenta personal para ver exactamente cómo lo leerá el cliente, introduciendo los datos a mano.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <form onSubmit={handleManualTest} className="space-y-4 max-w-xl">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Correo de Destino <span className="text-red-500">*</span></label>
                                <Input 
                                    type="email" 
                                    required 
                                    placeholder="info@vorianglobal.com" 
                                    value={manualEmail}
                                    onChange={(e) => setManualEmail(e.target.value)}
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Nombre del Cliente</label>
                                    <Input 
                                        type="text" 
                                        placeholder="Ej: Juan Pérez" 
                                        value={manualName}
                                        onChange={(e) => setManualName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">ID o Patente (Opcional)</label>
                                    <Input 
                                        type="text" 
                                        placeholder="Ej: PTR540" 
                                        value={manualId}
                                        onChange={(e) => setManualId(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Nombre del Chofer</label>
                                    <Input 
                                        type="text" 
                                        placeholder="Ej: Rodrigo Martínez" 
                                        value={manualDriverName}
                                        onChange={(e) => setManualDriverName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Patente del Camión</label>
                                    <Input 
                                        type="text" 
                                        placeholder="Ej: AB-CD-12" 
                                        value={manualVehiclePlate}
                                        onChange={(e) => setManualVehiclePlate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Dirección de Destino</label>
                                <Input 
                                    type="text" 
                                    placeholder="Ej: Bodega 4, Ruta 78" 
                                    value={manualAddress}
                                    onChange={(e) => setManualAddress(e.target.value)}
                                />
                            </div>

                            <Button 
                                type="submit" 
                                disabled={isManualLoading || !manualEmail} 
                                className="w-full mt-2 font-bold shadow-md shadow-primary/20"
                            >
                                {isManualLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                Enviar Correo de Prueba
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
