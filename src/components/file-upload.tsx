"use client";

import { useState } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";
import { Button } from "@/components/ui/button";
import { UploadCloud, Loader2, File, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
    onUploadComplete: (url: string) => void;
    bucket?: string;
    folder?: string;
    accept?: string;
    label?: string;
}

export function FileUpload({ onUploadComplete, bucket = "documents", folder = "general", accept = "image/*,.pdf", label = "Subir Documento" }: FileUploadProps) {
    const { supabase } = useSupabase();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);

        try {
            // Generar nombre único para el archivo
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = `${folder}/${fileName}`;

            // Subir archivo a Supabase Storage
            const { error: uploadError, data } = await supabase.storage
                .from(bucket)
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Obtener URL pública
            const { data: publicUrlData } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            setUploadedUrl(publicUrlData.publicUrl);
            onUploadComplete(publicUrlData.publicUrl);
        } catch (err: any) {
            console.error("Error al subir archivo:", err);
            setError(err.message || "Error al subir");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full">
            {uploadedUrl ? (
                <div className="flex items-center justify-between p-3 border border-green-500/30 bg-green-500/5 rounded-md">
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-medium truncate max-w-[200px]">Documento subido</span>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => window.open(uploadedUrl, '_blank')}
                        >
                            Ver
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => {
                                setUploadedUrl(null);
                                onUploadComplete("");
                            }}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="relative border-2 border-dashed rounded-md p-4 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
                    {isUploading ? (
                        <>
                            <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                            <p className="text-xs text-muted-foreground">Subiendo...</p>
                        </>
                    ) : (
                        <>
                            <UploadCloud className="w-6 h-6 text-muted-foreground mb-2" />
                            <p className="text-xs font-medium">{label}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">PDF, JPG, PNG (Max 5MB)</p>
                            
                            {error && (
                                <p className="text-xs text-destructive mt-2">{error}</p>
                            )}
                            
                            <input 
                                type="file" 
                                accept={accept}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileChange}
                                disabled={isUploading}
                            />
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
