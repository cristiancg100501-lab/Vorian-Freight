"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { 
    CheckCircle2, 
    Truck, 
    Package, 
    MapPin, 
    AlertCircle, 
    DollarSign,
    User,
    Clock
} from "lucide-react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Badge } from "@/components/ui/badge";

interface AuditLog {
    id: string;
    shipment_id: string;
    event_type: string;
    old_value: any;
    new_value: any;
    actor_id: string | null;
    created_at: string;
    actor_email?: string;
    actor_role?: string;
}

interface ShipmentAuditTimelineProps {
    shipmentId: string;
}

export function ShipmentAuditTimeline({ shipmentId }: ShipmentAuditTimelineProps) {
    const { supabase } = useSupabase();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchLogs() {
            setLoading(true);
            // In a real app we might join with auth.users or userProfiles via RPC.
            // For now, we fetch logs and do a secondary query for user details if needed.
            const { data, error } = await supabase
                .from("shipment_audit_logs")
                .select("*")
                .eq("shipment_id", shipmentId)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Error fetching audit logs:", error);
            } else if (data) {
                // Fetch actor details
                const actorIds = [...new Set(data.map(l => l.actor_id).filter(Boolean))];
                if (actorIds.length > 0) {
                    const { data: users } = await supabase
                        .from("userProfiles")
                        .select("id, email, role")
                        .in("id", actorIds);
                        
                    if (users) {
                        const userMap = new Map(users.map(u => [u.id, u]));
                        const enrichedLogs = data.map(log => ({
                            ...log,
                            actor_email: log.actor_id && userMap.has(log.actor_id) ? userMap.get(log.actor_id)?.email : 'Sistema',
                            actor_role: log.actor_id && userMap.has(log.actor_id) ? userMap.get(log.actor_id)?.role : 'SYSTEM',
                        }));
                        setLogs(enrichedLogs);
                    } else {
                        setLogs(data);
                    }
                } else {
                    setLogs(data);
                }
            }
            setLoading(false);
        }

        if (shipmentId) {
            fetchLogs();
        }
    }, [shipmentId, supabase]);

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="text-center p-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                <AlertCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>No hay registros de auditoría para este envío.</p>
                <p className="text-sm mt-1">Los cambios futuros quedarán registrados aquí de forma inmutable.</p>
            </div>
        );
    }

    const getEventIcon = (eventType: string, newValue: any) => {
        if (eventType === 'PRICE_CHANGE') return <DollarSign className="h-4 w-4 text-emerald-500" />;
        
        if (eventType === 'STATUS_CHANGE' || eventType === 'CREATED') {
            const status = newValue?.status;
            switch(status) {
                case 'PENDING': return <Clock className="h-4 w-4 text-amber-500" />;
                case 'ASSIGNED': return <User className="h-4 w-4 text-blue-500" />;
                case 'IN_TRANSIT': return <Truck className="h-4 w-4 text-indigo-500" />;
                case 'DELIVERED': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
                default: return <Package className="h-4 w-4 text-gray-500" />;
            }
        }
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    };

    const getEventDescription = (log: AuditLog) => {
        if (log.event_type === 'CREATED') {
            return <span>Envío creado con estado inicial <Badge variant="outline">{log.new_value?.status}</Badge></span>;
        }
        if (log.event_type === 'STATUS_CHANGE') {
            return (
                <span>
                    Estado cambiado de <Badge variant="secondary" className="line-through opacity-70">{log.old_value?.status || 'N/A'}</Badge> a <Badge variant="default">{log.new_value?.status}</Badge>
                </span>
            );
        }
        if (log.event_type === 'PRICE_CHANGE') {
            return (
                <span>
                    Precio ajustado de <span className="text-muted-foreground line-through">${log.old_value?.price}</span> a <span className="font-semibold text-emerald-600 dark:text-emerald-400">${log.new_value?.price}</span>
                </span>
            );
        }
        return <span>Se detectó un cambio de tipo {log.event_type}</span>;
    };

    return (
        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {logs.map((log) => (
                <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    {/* Marker */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-muted shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        {getEventIcon(log.event_type, log.new_value)}
                    </div>
                    
                    {/* Content Box */}
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-lg border bg-card shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold uppercase text-primary tracking-wider">
                                {log.event_type.replace('_', ' ')}
                            </span>
                            <time className="text-xs text-muted-foreground font-mono">
                                {format(parseISO(log.created_at), "dd MMM, HH:mm", { locale: es })}
                            </time>
                        </div>
                        <div className="text-sm mb-3">
                            {getEventDescription(log)}
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2 mt-2">
                            <div className="flex items-center gap-1.5 truncate">
                                <User className="h-3 w-3 shrink-0" />
                                <span className="truncate" title={log.actor_email || 'Sistema'}>
                                    {log.actor_email || 'Sistema Automático'}
                                </span>
                            </div>
                            {log.actor_role && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                    {log.actor_role}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
