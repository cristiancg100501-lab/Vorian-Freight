"use client";

import { useSupabaseCollection } from "@/hooks/supabase-hooks";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, FileText, Download } from "lucide-react";
import { useState, useMemo } from "react";

export default function AdminVerificationsPage() {
  const { supabase } = useSupabase();
  const { data: companies, isLoading, refetch } = useSupabaseCollection("companyProfiles");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filter only companies that have documents and are not yet approved
  const pendingCompanies = useMemo(() => {
    if (!companies) return [];
    return companies.filter(c => c.status === 'pending' || c.status === 'rejected');
  }, [companies]);

  const handleUpdateStatus = async (companyId: string, newStatus: 'approved' | 'rejected') => {
    setProcessingId(companyId);
    try {
      const response = await fetch('/api/admin/update-company-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyId, status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }
      
      // Refresh local cache
      refetch();
      alert(`Empresa ${newStatus === 'approved' ? 'aprobada' : 'rechazada'} exitosamente.`);
    } catch (err) {
      console.error("Error updating company status:", err);
      alert("Hubo un error al actualizar el estado.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleViewDocument = async (path: string) => {
    try {
      let actualPath = path;
      
      // If the path is a full public URL from old uploads, extract the relative file path
      if (path.includes('/object/public/company_documents/')) {
        actualPath = path.split('/object/public/company_documents/')[1];
      } else if (path.startsWith('http')) {
        // If it's some other external URL, just open it
        window.open(path, '_blank');
        return;
      }
      
      const { data, error } = await supabase.storage
        .from('company_documents')
        .createSignedUrl(actualPath, 60); // 60 seconds validity
        
      if (error) throw error;
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error("Error viewing document:", error);
      alert("No se pudo abrir el documento. Es posible que haya sido eliminado.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Centro de Verificación (KYC)</h1>
        <p className="text-muted-foreground">Revisa los documentos legales de las nuevas Empresas de Transporte.</p>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : pendingCompanies.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 bg-muted/20 border-dashed">
          <CheckCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <CardTitle>Todo al día</CardTitle>
          <CardDescription>No hay empresas pendientes de verificación en este momento.</CardDescription>
        </Card>
      ) : (
        <div className="grid gap-6">
          {pendingCompanies.map((company) => (
            <Card key={company.id} className="overflow-hidden border-l-4 border-l-amber-500">
              <div className="flex flex-col md:flex-row">
                {/* Info de la Empresa */}
                <div className="p-6 flex-1 border-b md:border-b-0 md:border-r">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{company.companyName || 'Empresa sin nombre'}</h3>
                      <p className="text-sm text-muted-foreground">RUT: {company.rut || 'No especificado'}</p>
                    </div>
                    <Badge variant={company.status === 'rejected' ? 'destructive' : 'outline'} className="bg-amber-100 text-amber-800 border-amber-200 uppercase">
                      {company.status === 'rejected' ? 'Rechazado' : 'En Revisión'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-3 mt-6">
                    <h4 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Documentos Subidos</h4>
                    
                    {(!company.documents || Object.keys(company.documents).length === 0) ? (
                      <p className="text-sm italic text-muted-foreground">La empresa aún no ha subido documentos.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2">
                        {company.documents.estatutoLegal && (
                          <div className="flex items-center justify-between p-2 rounded bg-muted/50 border text-sm">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary" />
                              <span>Estatuto Legal</span>
                            </div>
                            <button 
                              onClick={() => handleViewDocument(company.documents.estatutoLegal)}
                              className="text-primary hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer"
                            >
                              <Download className="w-3 h-3" /> Ver Documento
                            </button>
                          </div>
                        )}
                        {company.documents.f29 && (
                          <div className="flex items-center justify-between p-2 rounded bg-muted/50 border text-sm">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary" />
                              <span>Últimos 3 F29</span>
                            </div>
                            <button 
                              onClick={() => handleViewDocument(company.documents.f29)}
                              className="text-primary hover:underline flex items-center gap-1 bg-transparent border-none cursor-pointer"
                            >
                              <Download className="w-3 h-3" /> Ver Documento
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="p-6 w-full md:w-64 bg-muted/10 flex flex-col justify-center gap-3">
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white" 
                    onClick={() => handleUpdateStatus(company.id, 'approved')}
                    disabled={processingId === company.id || !company.documents?.estatutoLegal}
                  >
                    {processingId === company.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                    Aprobar Empresa
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    onClick={() => handleUpdateStatus(company.id, 'rejected')}
                    disabled={processingId === company.id}
                  >
                    {processingId === company.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                    Rechazar
                  </Button>
                  {(!company.documents?.estatutoLegal) && (
                     <p className="text-xs text-center text-muted-foreground mt-2">
                       Esperando a que la empresa suba sus archivos.
                     </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
