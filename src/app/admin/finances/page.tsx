"use client";

import { useState, useMemo } from "react";
import { useSupabaseCollection } from "@/hooks/supabase-hooks";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DollarSign, Truck, TrendingUp, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminFinancesPage() {
  const { data: shipments, isLoading, refresh } = useSupabaseCollection("shipments");
  const [selectedShipment, setSelectedShipment] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Modal state
  const [carrierPaid, setCarrierPaid] = useState(false);
  const [clientCharged, setClientCharged] = useState(false);
  const [carrierInvoice, setCarrierInvoice] = useState("");
  const [clientInvoice, setClientInvoice] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const openFinanceModal = (shipment: any) => {
    setSelectedShipment(shipment);
    setCarrierPaid(shipment.carrier_paid || false);
    setClientCharged(shipment.client_charged || false);
    setCarrierInvoice(shipment.carrier_invoice_number || "");
    setClientInvoice(shipment.client_invoice_number || "");
    setIssueDate(shipment.invoice_issue_date ? new Date(shipment.invoice_issue_date).toISOString().split('T')[0] : "");
    setDueDate(shipment.invoice_due_date ? new Date(shipment.invoice_due_date).toISOString().split('T')[0] : "");
  };

  const handleSaveFinances = async () => {
    if (!selectedShipment) return;
    setIsUpdating(true);
    
    try {
      const { error } = await supabase
        .from('shipments')
        .update({
          carrier_paid: carrierPaid,
          client_charged: clientCharged,
          carrier_invoice_number: carrierInvoice,
          client_invoice_number: clientInvoice,
          invoice_issue_date: issueDate ? new Date(issueDate).toISOString() : null,
          invoice_due_date: dueDate ? new Date(dueDate).toISOString() : null,
        })
        .eq('id', selectedShipment.id);

      if (error) throw error;
      
      setSelectedShipment(null);
      refresh();
    } catch (e) {
      console.error("Error updating finances:", e);
      alert("Error al actualizar finanzas.");
    } finally {
      setIsUpdating(false);
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    if (!shipments) return { revenue: 0, payouts: 0, margin: 0 };
    
    let totalRevenue = 0;
    let totalPayouts = 0;
    
    shipments.forEach((s: any) => {
      if (s.status !== 'CANCELLED') {
        totalRevenue += Number(s.estimatedPrice || 0);
        totalPayouts += Number(s.carrier_payment || 0);
      }
    });
    
    return {
      revenue: totalRevenue,
      payouts: totalPayouts,
      margin: totalRevenue - totalPayouts
    };
  }, [shipments]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Finanzas</h1>
        <p className="text-muted-foreground">
          Control de pagos, facturación y márgenes operativos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ingresos Totales (Cobros)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${kpis.revenue.toLocaleString('es-CL')}</div>
            <p className="text-xs text-muted-foreground">
              Total cobrado a clientes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pagos a Transportistas
            </CardTitle>
            <Truck className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${kpis.payouts.toLocaleString('es-CL')}</div>
            <p className="text-xs text-muted-foreground">
              Total pagado a choferes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ganancia Bruta (Margen)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${kpis.margin.toLocaleString('es-CL')}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.revenue > 0 ? ((kpis.margin / kpis.revenue) * 100).toFixed(1) : 0}% margen operativo
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Viajes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-t-lg">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">ID Viaje</th>
                  <th className="px-4 py-3">Precio Cliente</th>
                  <th className="px-4 py-3">Pago Chofer</th>
                  <th className="px-4 py-3">Margen Vorian</th>
                  <th className="px-4 py-3">Est. Cliente</th>
                  <th className="px-4 py-3">Est. Chofer</th>
                  <th className="px-4 py-3 rounded-tr-lg">Acción</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      Cargando finanzas...
                    </td>
                  </tr>
                )}
                {!isLoading && shipments?.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay viajes registrados.
                    </td>
                  </tr>
                )}
                {shipments?.map((s: any) => {
                  const clientPrice = Number(s.estimatedPrice || 0);
                  const carrierPay = Number(s.carrier_payment || 0);
                  const margin = clientPrice - carrierPay;
                  return (
                    <tr key={s.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        {s.id}
                        <br />
                        <span className="text-xs text-muted-foreground">{s.status}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">
                        ${clientPrice.toLocaleString('es-CL')}
                      </td>
                      <td className="px-4 py-3 font-bold text-amber-600 dark:text-amber-400">
                        ${carrierPay.toLocaleString('es-CL')}
                      </td>
                      <td className="px-4 py-3 font-bold">
                        ${margin.toLocaleString('es-CL')}
                      </td>
                      <td className="px-4 py-3">
                        {s.client_charged ? (
                          <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white"><CheckCircle className="h-3 w-3 mr-1"/> Cobrado</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground"><Clock className="h-3 w-3 mr-1"/> Pendiente</Badge>
                        )}
                        {s.client_invoice_number && <div className="text-[10px] text-muted-foreground mt-1">Fact: {s.client_invoice_number}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {s.carrier_paid ? (
                          <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-white"><CheckCircle className="h-3 w-3 mr-1"/> Pagado</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground"><Clock className="h-3 w-3 mr-1"/> Pendiente</Badge>
                        )}
                        {s.carrier_invoice_number && <div className="text-[10px] text-muted-foreground mt-1">Fact: {s.carrier_invoice_number}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="outline" size="sm" onClick={() => openFinanceModal(s)}>
                          Gestionar
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedShipment} onOpenChange={(open) => !open && setSelectedShipment(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Gestionar Finanzas</DialogTitle>
            <DialogDescription>
              Actualiza facturación para: {selectedShipment?.id}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4 border-b pb-6">
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="client-charged" className="font-bold">Cliente Cobrado</Label>
                  <Switch id="client-charged" checked={clientCharged} onCheckedChange={setClientCharged} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client-invoice" className="text-xs">Nº Factura a Cliente</Label>
                  <Input id="client-invoice" value={clientInvoice} onChange={(e) => setClientInvoice(e.target.value)} placeholder="Ej. F-1002" />
                </div>
              </div>

              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="carrier-paid" className="font-bold">Chofer Pagado</Label>
                  <Switch id="carrier-paid" checked={carrierPaid} onCheckedChange={setCarrierPaid} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carrier-invoice" className="text-xs">Nº Factura de Chofer</Label>
                  <Input id="carrier-invoice" value={carrierInvoice} onChange={(e) => setCarrierInvoice(e.target.value)} placeholder="Ej. F-9870" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issue-date" className="text-xs">Fecha Emisión</Label>
                <Input id="issue-date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due-date" className="text-xs">Fecha Vencimiento</Label>
                <Input id="due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedShipment(null)}>Cancelar</Button>
            <Button onClick={handleSaveFinances} disabled={isUpdating}>
              {isUpdating ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
