"use client";

import { useSupabaseCollection } from "@/hooks/supabase-hooks";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Mail, 
  Phone, 
  Briefcase, 
  Trash2, 
  CheckCircle2, 
  ExternalLink,
  MessageSquare,
  Building,
  BarChart,
  Calendar
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminContactosPage() {
  const { data: contacts, isLoading, refetch } = useSupabaseCollection("contact_requests");
  const { supabase } = useSupabase();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];

    // Sort by newest first
    const sorted = [...contacts].sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );

    return sorted.filter(contact => {
      const matchesSearch = 
        contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (contact.message || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || contact.status === statusFilter;
      const matchesRole = roleFilter === "all" || contact.role.includes(roleFilter) || contact.role === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [contacts, searchTerm, statusFilter, roleFilter]);

  // Update Status
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from("contact_requests")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      
      toast.success(`Estado actualizado a: ${newStatus}`);
      if (selectedContact && selectedContact.id === id) {
        setSelectedContact({ ...selectedContact, status: newStatus });
      }
      refetch();
    } catch (err: any) {
      console.error(err);
      toast.error(`Error al actualizar estado: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Delete Contact Lead
  const handleDeleteContact = async (id: string) => {
    if (!confirm("¿Está seguro de que desea eliminar este lead? Esta acción no se puede deshacer.")) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from("contact_requests")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast.success("Lead eliminado correctamente");
      setSelectedContact(null);
      refetch();
    } catch (err: any) {
      console.error(err);
      toast.error(`Error al eliminar lead: ${err.message}`);
    }
  };

  // Status Styling classes
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Nuevo":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20";
      case "En Proceso":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20";
      case "Contactado":
        return "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leads y Contactos de Ventas</h1>
        <p className="text-muted-foreground">
          Gestione las solicitudes de demostración y contacto recibidas desde la landing page.
        </p>
      </div>

      {/* Grid of quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Leads Totales</CardDescription>
            <CardTitle className="text-3xl font-bold">{contacts ? contacts.length : 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Nuevos (Sin Gestionar)</CardDescription>
            <CardTitle className="text-3xl font-bold text-blue-500">
              {contacts ? contacts.filter(c => c.status === "Nuevo" || !c.status).length : 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">Tasa de Gestión</CardDescription>
            <CardTitle className="text-3xl font-bold text-green-500 font-mono">
              {contacts && contacts.length > 0 
                ? `${Math.round((contacts.filter(c => c.status === "Contactado").length / contacts.length) * 100)}%` 
                : "0%"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filter and Table Container */}
      <Card className="bg-card border overflow-hidden shadow-sm">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por empresa, nombre..." 
                className="pl-10 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">Todos los Estados</option>
                <option value="Nuevo">Nuevo</option>
                <option value="En Proceso">En Proceso</option>
                <option value="Contactado">Contactado</option>
              </select>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">Todos los Roles</option>
                <option value="Cliente">Cliente (Carga)</option>
                <option value="Transportista">Transportista (Flota)</option>
                <option value="Otro">Otro</option>
              </select>
              <div className="text-xs text-muted-foreground font-semibold md:ml-2">
                Mostrando {filteredContacts.length} solicitudes
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/10 border-b">
                <tr>
                  <th scope="col" className="px-6 py-4">Empresa / Nombre</th>
                  <th scope="col" className="px-6 py-4">Contacto</th>
                  <th scope="col" className="px-6 py-4">Rol / Volumen</th>
                  <th scope="col" className="px-6 py-4">Estado</th>
                  <th scope="col" className="px-6 py-4">Fecha</th>
                  <th scope="col" className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                        <p className="text-muted-foreground font-medium">Cargando solicitudes...</p>
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && filteredContacts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2 opacity-50">
                        <Mail className="h-10 w-10" />
                        <p className="font-semibold">No se encontraron solicitudes.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-foreground">{contact.company}</div>
                      <div className="text-xs text-muted-foreground">{contact.name}</div>
                    </td>
                    <td className="px-6 py-4 space-y-0.5">
                      <div className="text-xs flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <a href={`mailto:${contact.email}`} className="hover:underline text-foreground">{contact.email}</a>
                      </div>
                      <div className="text-xs flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <a href={`tel:${contact.phone}`} className="hover:underline text-foreground">{contact.phone}</a>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        {contact.role}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">
                        {contact.volume}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={contact.status}
                        onChange={(e) => handleUpdateStatus(contact.id, e.target.value)}
                        disabled={updatingId === contact.id}
                        className={`text-xs font-bold rounded-full px-3 py-1 border focus:outline-none transition-all ${getStatusBadgeClass(contact.status)}`}
                      >
                        <option value="Nuevo">Nuevo</option>
                        <option value="En Proceso">En Proceso</option>
                        <option value="Contactado">Contactado</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">
                      {new Date(contact.created_at).toLocaleDateString()} <br/>
                      {new Date(contact.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setSelectedContact(contact)}
                        title="Ver detalles"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteContact(contact.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={selectedContact !== null} onOpenChange={(open) => { if (!open) setSelectedContact(null); }}>
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              {selectedContact?.company}
            </DialogTitle>
            <DialogDescription>
              Detalles de la solicitud de contacto de ventas
            </DialogDescription>
          </DialogHeader>

          {selectedContact && (
            <div className="space-y-6 mt-4">
              {/* Profile details */}
              <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border">
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Contacto</div>
                  <div className="text-sm font-semibold text-foreground">{selectedContact.name}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Fecha</div>
                  <div className="text-sm font-semibold text-foreground">
                    {new Date(selectedContact.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Email corporativo</div>
                  <a href={`mailto:${selectedContact.email}`} className="text-sm text-primary hover:underline font-medium block">
                    {selectedContact.email}
                  </a>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Teléfono</div>
                  <a href={`tel:${selectedContact.phone}`} className="text-sm text-primary hover:underline font-medium block">
                    {selectedContact.phone}
                  </a>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Cargo / Rol</div>
                  <div className="text-sm font-semibold text-foreground flex items-center gap-1">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    {selectedContact.role}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Volumen mensual</div>
                  <div className="text-sm font-semibold text-foreground flex items-center gap-1">
                    <BarChart className="h-4 w-4 text-muted-foreground" />
                    {selectedContact.volume}
                  </div>
                </div>
              </div>

              {/* Message / Comments */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-4 w-4" />
                  Mensaje / Comentarios
                </div>
                <div className="p-4 rounded-xl bg-background border border-border text-sm text-foreground min-h-[100px] whitespace-pre-line leading-relaxed">
                  {selectedContact.message || (
                    <span className="text-muted-foreground italic">No se agregaron comentarios adicionales.</span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-border">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-semibold">Estado del lead:</span>
                  <select
                    value={selectedContact.status}
                    onChange={(e) => handleUpdateStatus(selectedContact.id, e.target.value)}
                    className={`text-xs font-bold rounded-full px-3 py-1.5 border focus:outline-none transition-all ${getStatusBadgeClass(selectedContact.status)}`}
                  >
                    <option value="Nuevo">Nuevo</option>
                    <option value="En Proceso">En Proceso</option>
                    <option value="Contactado">Contactado</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedContact(null)}
                  >
                    Cerrar
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDeleteContact(selectedContact.id)}
                    className="flex items-center gap-1.5"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar Lead
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
