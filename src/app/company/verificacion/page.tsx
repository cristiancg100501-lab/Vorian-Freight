"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CompanyVerificationPage() {
  const { supabase, user } = useSupabase();
  const [status, setStatus] = useState<string>("pending");
  const [documents, setDocuments] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const [estatutoFile, setEstatutoFile] = useState<File | null>(null);
  const [f29File, setF29File] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const fetchCompanyData = async () => {
      try {
        const { data, error } = await supabase
          .from("companyProfiles")
          .select("status, documents")
          .eq("id", user.id)
          .single();
          
        if (error) throw error;
        if (data) {
          setStatus(data.status || "pending");
          setDocuments(data.documents || {});
        }
      } catch (error) {
        console.error("Error fetching company verification data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCompanyData();
  }, [user, supabase]);

  const handleUpload = async () => {
    if (!user) return;
    if (!estatutoFile && !f29File) return;

    setIsUploading(true);
    
    try {
      const newDocs = { ...documents };
      
      // Upload Estatuto
      if (estatutoFile) {
        const fileExt = estatutoFile.name.split('.').pop();
        const filePath = `${user.id}/estatuto_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('company_documents')
          .upload(filePath, estatutoFile, { upsert: true });
        if (uploadError) throw uploadError;
          
        newDocs.estatutoLegal = filePath;
      }
      
      // Upload F29
      if (f29File) {
        const fileExt = f29File.name.split('.').pop();
        const filePath = `${user.id}/f29_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('company_documents')
          .upload(filePath, f29File, { upsert: true });
        if (uploadError) throw uploadError;
          
        newDocs.f29 = filePath;
      }
      
      // Update Company Profile
      const { error: updateError } = await supabase
        .from("companyProfiles")
        .update({ 
          documents: newDocs,
          status: 'pending' // Re-trigger review if they upload new docs
        })
        .eq("id", user.id);
        
      if (updateError) throw updateError;
      
      setDocuments(newDocs);
      setStatus('pending');
      setEstatutoFile(null);
      setF29File(null);
      
      alert("Documentos subidos con éxito. Vorian revisará tu cuenta pronto.");
      
    } catch (error) {
      console.error("Error uploading documents:", error);
      alert("Hubo un error al subir los documentos. Inténtalo nuevamente.");
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verificación de Empresa (KYC)</h1>
        <p className="text-muted-foreground">
          Sube tus documentos legales para que Vorian apruebe tu cuenta y puedas operar.
        </p>
      </div>

      {status === 'approved' && (
        <Alert className="bg-green-500/10 text-green-500 border-green-500/20">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>¡Cuenta Aprobada!</AlertTitle>
          <AlertDescription>
            Tus documentos han sido verificados. Ahora tienes acceso completo a la plataforma.
          </AlertDescription>
        </Alert>
      )}

      {status === 'rejected' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Verificación Rechazada</AlertTitle>
          <AlertDescription>
            Hubo un problema con tus documentos. Por favor, revisa que sean legibles y vuelve a subirlos.
          </AlertDescription>
        </Alert>
      )}

      {status === 'pending' && (
        <Alert className="bg-amber-500/10 text-amber-500 border-amber-500/20">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>En Revisión</AlertTitle>
          <AlertDescription>
            Estamos revisando tus documentos. Recibirás una notificación cuando tu cuenta sea aprobada.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cargar Documentos</CardTitle>
          <CardDescription>
            Sube los siguientes documentos en formato PDF o Imagen (JPG/PNG).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Estatuto Legal */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-base font-medium">Estatuto Legal de la Empresa</Label>
              {documents.estatutoLegal && (
                <span className="text-xs flex items-center gap-1 text-green-500">
                  <CheckCircle className="w-3 h-3" /> Subido
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Documento de constitución de sociedad o escritura pública.</p>
            <div className="flex items-center gap-4">
              <Input 
                type="file" 
                accept=".pdf,image/*" 
                className="flex-1"
                onChange={(e) => setEstatutoFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <div className="w-full h-px bg-border my-4"></div>

          {/* F29 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-base font-medium">Últimos 3 F29 (SII)</Label>
              {documents.f29 && (
                <span className="text-xs flex items-center gap-1 text-green-500">
                  <CheckCircle className="w-3 h-3" /> Subido
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Comprobantes de declaración mensual de impuestos (consolidado en un solo PDF o imagen).</p>
            <div className="flex items-center gap-4">
              <Input 
                type="file" 
                accept=".pdf,image/*" 
                className="flex-1"
                onChange={(e) => setF29File(e.target.files?.[0] || null)}
              />
            </div>
          </div>

        </CardContent>
        <CardFooter className="bg-muted/50 px-6 py-4">
          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleUpload}
            disabled={isUploading || (!estatutoFile && !f29File)}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subiendo Documentos...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Guardar y Enviar a Revisión
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
