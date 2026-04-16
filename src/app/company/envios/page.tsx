"use client";

import { useMemo, useCallback } from "react";
import { useUser } from "@/components/providers/supabase-provider";
import { useSupabaseCollection } from "@/hooks/supabase-hooks";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, User, Truck, Calendar, DollarSign, PlusCircle, Pencil, Info } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

const statusStyles: { [key: string]: string } = {
  "In transit": "bg-muted text-muted-foreground",
  "Delivered": "bg-foreground text-background",
  "Pending": "bg-secondary text-secondary-foreground",
  "Booked": "bg-accent text-accent-foreground",
  "Cancelled": "bg-destructive text-destructive-foreground",
};

export default function CompanyMyShipmentsPage() {
    const { user } = useUser();

    // 1. Get all shipments booked by this company
    const filterCompanyShipments = useCallback((q: any) => {
        if (!user) return q;
        return q.eq("carrierId", user.id).order("createdAt", { ascending: false });
    }, [user]);
    const { data: companyShipments, isLoading: isLoadingShipments } = useSupabaseCollection("shipments", filterCompanyShipments);

    // 2. Get all unique driver IDs from those shipments
    const driverIds = useMemo(() => {
        if (!companyShipments) return [];
        const ids = companyShipments
            .map((s: any) => s.driverId)
            .filter((id): id is string => !!id);
        return [...new Set(ids)].slice(0, 30);
    }, [companyShipments]);
    
    // 3. Get user profiles for only those drivers
    const filterDrivers = useCallback((q: any) => {
        if (driverIds.length === 0) return q.none();
        return q.in("id", driverIds);
    }, [driverIds]);
    const { data: drivers, isLoading: isLoadingDrivers } = useSupabaseCollection("userProfiles", filterDrivers);

    // 4. Create a map of driver IDs to names for easy lookup
    const driverNameMap = useMemo(() => {
        if (!drivers) return new Map();
        return new Map(drivers.map((d: any) => [d.id, `${d.firstName} ${d.lastName}`]));
    }, [drivers]);

    const isLoading = isLoadingShipments || (driverIds.length > 0 && isLoadingDrivers);

    return (
        <Card className="bg-card border text-card-foreground">
            <CardHeader>
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <CardTitle>Mis Envíos</CardTitle>
                        <CardDescription className="mt-1">
                            Gestione los envíos que su empresa ha reservado.
                        </CardDescription>
                    </div>
                    <Link href="/company/shipments">
                        <Button>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Buscar Nuevas Cargas
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase border-b">
                        <tr>
                            <th scope="col" className="px-6 py-3">Ruta</th>
                            <th scope="col" className="px-6 py-3">Fecha Recogida</th>
                            <th scope="col" className="px-6 py-3">Estado</th>
                            <th scope="col" className="px-6 py-3">Conductor</th>
                            <th scope="col" className="px-6 py-3">Precio</th>
                            <th scope="col" className="px-6 py-3">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading && (
                            <tr><td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">Cargando envíos...</td></tr>
                        )}
                        {!isLoading && (!companyShipments || companyShipments.length === 0) ? (
                            <tr><td colSpan={6} className="px-6 py-10 text-center text-muted-foreground">No ha reservado ningún envío.</td></tr>
                        ) : (
                            companyShipments?.map((shipment: any) => (
                                <tr key={shipment.id} className="border-b hover:bg-muted/50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 font-medium">
                                            <Truck className="h-4 w-4 text-muted-foreground" />
                                            <span>{shipment.id}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">{(shipment.pickup_address || '').split(',')[0]} a {(shipment.delivery_address || '').split(',')[0]}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <span>{format(new Date(shipment.pickup_date), "dd MMM, yyyy")}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[shipment.status] || "bg-muted text-muted-foreground"}`}>
                                            {shipment.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <span>{shipment.driverId ? (driverNameMap.get(shipment.driverId) || 'Asignando...') : 'No asignado'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 font-semibold">
                                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                                            <span>${shipment.estimated_price.toLocaleString('es-CL')}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Link href={`/company/envios/${shipment.id}`}>
                                                <Button variant="outline" size="sm">
                                                    <Info className="h-3 w-3 mr-2" />
                                                    Detalles
                                                </Button>
                                            </Link>
                                            <Button variant="outline" size="sm" disabled={shipment.status !== 'Booked'}>
                                                <Pencil className="h-3 w-3 mr-2"/>
                                                Asignar
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                </div>
            </CardContent>
        </Card>
    );
}
