"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSupabase, useUser } from "@/components/providers/supabase-provider";
import { useSupabaseCollection } from "@/hooks/supabase-hooks";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Send, User as UserIcon, Package, Navigation, Loader2, Phone, MapPin, Maximize2 } from "lucide-react";
import VorianMap from "@/components/map";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function AdminSoportePage() {
  const { user } = useUser();
  const { supabase } = useSupabase();
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Obtener todos los conductores para el admin
  const { data: allDrivers } = useSupabaseCollection("driverProfiles");
  const driverIds = useMemo(() => allDrivers?.map(d => d.id) || [], [allDrivers]);

  // 2. Obtener nombres
  const { data: allUsers } = useSupabaseCollection("userProfiles");

  // 3. Carga activa de todos los conductores para contexto
  const filterActiveJobs = (q: any) => {
    if (driverIds.length === 0) return q.in("id", []);
    return q.in("driverId", driverIds).in("status", ["ACCEPTED", "EN_ROUTE_TO_PICKUP", "ARRIVED_AT_PICKUP", "IN_TRANSIT", "ARRIVED_AT_DROPOFF"]);
  };
  const { data: activeShipments } = useSupabaseCollection("shipments", filterActiveJobs);

  // Suscripción a mensajes
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
    };

    fetchMessages();

    const channel = supabase
      .channel("support_messages_changes_admin")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedDriverId]);

  // Derivar lista de chats (Conductores que han enviado/recibido mensajes)
  const chatList = useMemo(() => {
    // Agrupar por driver_id para tener el último mensaje
    const lastMessages = new Map<string, any>();
    messages.forEach((msg) => {
      lastMessages.set(msg.driver_id, msg);
    });

    // Mapear con datos de usuario
    const list = Array.from(lastMessages.values()).map((msg) => {
      const userProfile = (allUsers || []).find((u) => u.id === msg.driver_id);
      return {
        driverId: msg.driver_id,
        name: userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : "Conductor Desconocido",
        lastMessage: msg.message,
        timestamp: msg.created_at,
        unread: !msg.is_from_support && !msg.is_read // Assuming you might add is_read later
      };
    });

    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [messages, allUsers]);

  const activeMessages = useMemo(() => {
    return messages.filter((m) => m.driver_id === selectedDriverId);
  }, [messages, selectedDriverId]);

  const selectedDriverProfile = useMemo(() => {
    return (allUsers || []).find(u => u.id === selectedDriverId);
  }, [allUsers, selectedDriverId]);

  // Extraer el shipment_id del último mensaje de la conversación
  const explicitShipmentId = useMemo(() => {
    if (!activeMessages.length) return null;
    for (let i = activeMessages.length - 1; i >= 0; i--) {
      if (activeMessages[i].shipment_id) return activeMessages[i].shipment_id;
    }
    return null;
  }, [activeMessages]);

  const [explicitShipmentData, setExplicitShipmentData] = useState<any[] | null>(null);

  useEffect(() => {
    if (!explicitShipmentId) {
      setExplicitShipmentData(null);
      return;
    }
    const fetchShipment = async () => {
      const { data } = await supabase.from("shipments").select("*").eq("id", explicitShipmentId);
      if (data) setExplicitShipmentData(data);
    };
    fetchShipment();
  }, [explicitShipmentId, supabase]);

  const selectedDriverActiveShipment = useMemo(() => {
    if (explicitShipmentData && explicitShipmentData.length > 0) {
      return explicitShipmentData[0];
    }
    return activeShipments?.find(s => s.driverId === selectedDriverId);
  }, [explicitShipmentData, activeShipments, selectedDriverId]);

  const selectedDriverData = useMemo(() => {
    return (allDrivers || []).find(d => d.id === selectedDriverId || d.userId === selectedDriverId);
  }, [allDrivers, selectedDriverId]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedDriverId) return;

    setIsSending(true);
    const msgText = newMessage.trim();
    setNewMessage("");

    try {
      await supabase.from("support_messages").insert({
        driver_id: selectedDriverId,
        shipment_id: explicitShipmentId || null,
        message: msgText,
        is_from_support: true,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] w-full">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Centro de Soporte (Admin)</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
            Total Mensajes DB: {messages.length}
          </span>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium"
          >
            Recargar Página
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 flex-1 overflow-hidden h-full">
        {/* COLUMNA 1: LISTA DE CHATS */}
        <Card className="md:col-span-3 h-full flex flex-col overflow-hidden">
          <div className="p-4 border-b bg-muted/30">
            <h2 className="font-semibold">Conversaciones Globales</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {chatList.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No hay mensajes recientes
              </div>
            ) : (
              chatList.map((chat) => (
                <div
                  key={chat.driverId}
                  onClick={() => setSelectedDriverId(chat.driverId)}
                  className={cn(
                    "p-4 border-b cursor-pointer transition-colors hover:bg-muted/50",
                    selectedDriverId === chat.driverId ? "bg-muted" : ""
                  )}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm line-clamp-1">{chat.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(chat.timestamp), "HH:mm")}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-1">
                    {chat.lastMessage}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* COLUMNA 2: EL CHAT */}
        <Card className="md:col-span-6 h-full flex flex-col overflow-hidden">
          {!selectedDriverId ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircleIcon className="w-12 h-12 mb-4 opacity-20" />
              <p>Selecciona una conversación de la lista</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b bg-muted/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">
                    {selectedDriverProfile ? `${selectedDriverProfile.firstName} ${selectedDriverProfile.lastName}` : "Cargando..."}
                  </h3>
                  <p className="text-xs text-muted-foreground">Conductor de la Red</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeMessages.map((msg) => {
                  const isSupport = msg.is_from_support;
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex w-full",
                        isSupport ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[75%] rounded-2xl px-4 py-2",
                          isSupport
                            ? "bg-primary text-primary-foreground rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        )}
                      >
                        <p className="text-sm">{msg.message}</p>
                        <span className="text-[10px] opacity-70 mt-1 block text-right">
                          {format(new Date(msg.created_at), "HH:mm")}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="p-4 border-t bg-background">
                <div className="flex gap-2">
                  <Input
                    placeholder="Responde como administrador..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1"
                  />
                  <button
                    type="submit"
                    disabled={isSending || !newMessage.trim()}
                    className="bg-primary text-primary-foreground p-2 rounded-lg disabled:opacity-50 flex items-center justify-center w-12"
                  >
                    {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </form>
            </>
          )}
        </Card>

        {/* COLUMNA 3: CONTEXTO DEL ENVÍO */}
        <Card className="md:col-span-3 h-full flex flex-col overflow-hidden bg-muted/10">
          <CardHeader className="pb-2 border-b">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Contexto del Envío
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            {!selectedDriverId ? (
              <p className="text-sm text-muted-foreground text-center mt-10">
                Selecciona un conductor para ver si tiene cargas activas
              </p>
            ) : !selectedDriverActiveShipment ? (
              <div className="text-center mt-10 space-y-3">
                <div className="w-12 h-12 bg-muted rounded-full mx-auto flex items-center justify-center">
                  <Package className="w-6 h-6 text-muted-foreground opacity-50" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Cargando envío o no hay cargas activas...
                </p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* MAPA MINIATURA */}
                {selectedDriverActiveShipment.details?.route && (
                  <div className="h-48 w-full shrink-0 border-b relative group">
                    <VorianMap
                      origin={selectedDriverActiveShipment.details.route?.coordinates?.[0] || null}
                      destination={selectedDriverActiveShipment.details.route?.coordinates?.[selectedDriverActiveShipment.details.route.coordinates.length - 1] || null}
                      vehicleType={selectedDriverActiveShipment.details?.equipment || 'camion'}
                      drivers={[
                        {
                          id: selectedDriverActiveShipment.driverId,
                          currentLatitude: selectedDriverData?.currentLatitude,
                          currentLongitude: selectedDriverData?.currentLongitude,
                        }
                      ]}
                      selectedDriver={{ id: selectedDriverActiveShipment.driverId }}
                    />
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="absolute top-2 right-2 bg-background/90 hover:bg-background p-2 rounded-md shadow-md border opacity-80 hover:opacity-100 transition-all z-10 text-foreground">
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-5xl w-[90vw] h-[85vh] p-0 overflow-hidden">
                        <DialogTitle className="sr-only">Mapa del envío en pantalla completa</DialogTitle>
                        <VorianMap
                          origin={selectedDriverActiveShipment.details.route?.coordinates?.[0] || null}
                          destination={selectedDriverActiveShipment.details.route?.coordinates?.[selectedDriverActiveShipment.details.route.coordinates.length - 1] || null}
                          vehicleType={selectedDriverActiveShipment.details?.equipment || 'camion'}
                          drivers={[
                            {
                              id: selectedDriverActiveShipment.driverId,
                              currentLatitude: selectedDriverData?.currentLatitude,
                              currentLongitude: selectedDriverData?.currentLongitude,
                            }
                          ]}
                          selectedDriver={{ id: selectedDriverActiveShipment.driverId }}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
                
                <div className="p-4 space-y-6">
                  {/* ESTADO */}
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Estado del Envío: {selectedDriverActiveShipment.id?.split('-').slice(-2).join('-')}
                    </h4>
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      {selectedDriverActiveShipment.status}
                    </div>
                  </div>

                  {/* CONDUCTOR Y CLIENTE */}
                  <div className="grid grid-cols-2 gap-4 bg-background p-3 rounded-lg border">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Conductor</p>
                      <p className="text-sm font-medium line-clamp-1">{selectedDriverProfile?.firstName} {selectedDriverProfile?.lastName}</p>
                      {selectedDriverProfile?.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <Phone className="w-3 h-3" /> {selectedDriverProfile.phone}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Cliente</p>
                      <p className="text-sm font-medium line-clamp-1">
                        {(() => {
                          const customer = (allUsers || []).find(u => u.id === selectedDriverActiveShipment.customer_id);
                          return customer ? `${customer.firstName} ${customer.lastName}` : "Desconocido";
                        })()}
                      </p>
                    </div>
                  </div>

                  {/* RUTAS */}
                  <div className="relative bg-background p-3 rounded-lg border">
                    <div className="absolute left-[23px] top-7 bottom-7 w-px bg-border"></div>
                    
                    <div className="flex gap-4 mb-4 relative">
                      <div className="w-6 h-6 rounded-full bg-background border-2 border-primary flex items-center justify-center z-10 shrink-0 mt-1">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Origen</p>
                        <p className="text-sm font-medium mt-0.5">{selectedDriverActiveShipment.originAddress || "Dirección no especificada"}</p>
                      </div>
                    </div>

                    <div className="flex gap-4 relative">
                      <div className="w-6 h-6 rounded-full bg-background border-2 border-primary flex items-center justify-center z-10 shrink-0 mt-1">
                        <Navigation className="w-3 h-3 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase">Destino</p>
                        <p className="text-sm font-medium mt-0.5">{selectedDriverActiveShipment.destinationAddress || "Dirección no especificada"}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* DETALLES DE LA CARGA */}
                  <div className="bg-background p-3 rounded-lg border space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Detalles de la Carga</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Peso:</span>
                      <span className="font-medium">{selectedDriverActiveShipment.details?.weightLbs || 0} lbs</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tipo:</span>
                      <span className="font-medium">{selectedDriverActiveShipment.details?.commodity || "General"}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Equipamiento:</span>
                      <span className="font-medium">{selectedDriverActiveShipment.details?.equipment || "N/A"}</span>
                    </div>
                  </div>



                  {/* UBICACIÓN EN VIVO (TEXTO) */}
                  {(selectedDriverData?.currentLatitude && selectedDriverData?.currentLongitude) && (
                     <div className="bg-background p-3 rounded-lg border">
                       <p className="text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                         <MapPin className="w-3 h-3" /> Ubicación GPS actual
                       </p>
                       <p className="text-xs font-mono text-muted-foreground">
                         Lat: {selectedDriverData.currentLatitude.toFixed(6)}<br/>
                         Lng: {selectedDriverData.currentLongitude.toFixed(6)}
                       </p>
                     </div>
                  )}

                  {/* ACCIONES DE SOPORTE */}
                  <div className="bg-background p-3 rounded-lg border space-y-3 mt-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                      Acciones Rápidas
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => alert("Reasignando carga...")}
                        className="bg-primary/10 text-primary hover:bg-primary/20 text-xs py-2 rounded-md font-medium transition-colors"
                      >
                        Reasignar Carga
                      </button>
                      <button 
                        onClick={() => alert("Marcando como retrasado...")}
                        className="bg-amber-500/10 text-amber-600 dark:text-amber-500 hover:bg-amber-500/20 text-xs py-2 rounded-md font-medium transition-colors"
                      >
                        Marcar Retraso
                      </button>
                      <button 
                        onClick={() => alert("Forzando completado de la carga...")}
                        className="bg-green-500/10 text-green-600 dark:text-green-500 hover:bg-green-500/20 text-xs py-2 rounded-md font-medium transition-colors"
                      >
                        Forzar Completado
                      </button>
                      <button 
                        onClick={() => alert("Cancelando carga por emergencia...")}
                        className="bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-500/20 text-xs py-2 rounded-md font-medium transition-colors"
                      >
                        Cancelar Emergencia
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Simple internal icon for empty state
function MessageCircleIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
    </svg>
  );
}
