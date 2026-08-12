"use client";

import React, { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, Check, Mail, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function SignatureGeneratorPage() {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnEwaGNxcGZyaHcxaTV4aGZ6Z3QxcnhpNWxnaTVxN2gxc29lajNlYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7aD2saalBwwftBIY/giphy.gif"); // Placeholder GIF
  const [logoBase64, setLogoBase64] = useState("");
  const [logoSize, setLogoSize] = useState(120);
  
  const [copied, setCopied] = useState(false);
  const signatureRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Por favor, sube un archivo de imagen o GIF válido.");
        return;
      }
      
      // Mostrar advertencia si el archivo es muy grande (más de 1MB)
      if (file.size > 1024 * 1024) {
        toast.warning("El archivo es grande. Esto podría causar que algunos correos reboten la firma.", {
            description: "Es recomendable usar GIFs/PNGs de menos de 1 MB."
        });
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogoBase64(event.target.result as string);
          setLogoUrl(""); // Clear the external URL so Base64 takes precedence
          toast.success("Imagen cargada exitosamente");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const copyToClipboard = async () => {
    if (!signatureRef.current) return;
    
    try {
      const html = signatureRef.current.innerHTML;
      
      // We need to copy as text/html so email clients parse the table and styles
      const clipboardItem = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([signatureRef.current.innerText], { type: "text/plain" })
      });
      
      await navigator.clipboard.write([clipboardItem]);
      setCopied(true);
      toast.success("Firma copiada al portapapeles", {
        description: "Ahora puedes pegarla en la configuración de Gmail o Outlook."
      });
      
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Error al copiar la firma");
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Generador de Firma de Correo</h1>
        <p className="text-muted-foreground mt-2">
          Crea firmas estandarizadas para el equipo Vorian, optimizadas para Gmail y Outlook.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Formulario */}
        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Datos Personales</CardTitle>
              <CardDescription>Completa la información que aparecerá en la firma.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nombre Completo</Label>
                <Input 
                  placeholder="Ej. Juan Pérez" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <Label>Cargo / Título</Label>
                <Input 
                  placeholder="Ej. Operations Manager" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input 
                    placeholder="+56 9 1234 5678" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Correo</Label>
                  <Input 
                    placeholder="correo@vorianglobal.com" 
                    type="email"
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Dirección</Label>
                <Input 
                  placeholder="Ej. Av. Apoquindo 4499, Piso 13, Las Condes, Santiago." 
                  value={address} 
                  onChange={e => setAddress(e.target.value)} 
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logo de la Firma</CardTitle>
              <CardDescription>Carga tu propio logo animado o estático.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Opcion de subir archivo */}
                <div className="space-y-2">
                  <Label>Cargar desde el equipo</Label>
                  <Input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="cursor-pointer" 
                  />
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    Si cargas un archivo desde tu equipo, se incrustará directamente en la firma (Base64). Recomendamos archivos ligeros (&lt; 500kb).
                  </p>
                </div>
                
                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-muted"></div>
                  <span className="flex-shrink-0 mx-4 text-muted-foreground text-xs font-medium uppercase tracking-wider">O usar un enlace</span>
                  <div className="flex-grow border-t border-muted"></div>
                </div>

                {/* Opcion de URL */}
                <div className="space-y-2">
                  <Label>Enlace de internet (URL)</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="https://..." 
                      value={logoUrl} 
                      onChange={e => {
                        let val = e.target.value;
                        // Corrección automática de enlaces de Google Drive a formato de imagen directa
                        if (val.includes("drive.google.com/file/d/")) {
                          const match = val.match(/\/d\/([a-zA-Z0-9_-]+)/);
                          if (match && match[1]) {
                            val = `https://drive.google.com/uc?export=view&id=${match[1]}`;
                          }
                        }
                        setLogoUrl(val);
                        if (val) setLogoBase64(""); // Clear base64 if typing URL
                      }} 
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Pegar un enlace asegura que el correo pese muy poco y nunca sea marcado como spam.
                  </p>
                </div>

                {/* Control de tamaño */}
                <div className="space-y-3 pt-2">
                  <Label>Tamaño del Logo (Ancho)</Label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="40" 
                      max="300" 
                      value={logoSize} 
                      onChange={e => setLogoSize(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <span className="text-sm font-medium w-12 text-right">{logoSize}px</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vista Previa */}
        <div className="lg:col-span-7">
          <Card className="sticky top-6">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  Vista Previa
                </CardTitle>
                <CardDescription>Así se verá tu firma en el correo.</CardDescription>
              </div>
              <Button 
                onClick={copyToClipboard} 
                className={`hidden sm:flex transition-all ${copied ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                variant="default"
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "¡Copiado!" : "Copiar Firma HTML"}
              </Button>
            </CardHeader>
            
            <CardContent className="pt-8 overflow-x-auto bg-white dark:bg-zinc-50 flex items-center justify-center min-h-[300px]">
              {/* Contenedor de la firma real que se va a copiar */}
              <div 
                ref={signatureRef} 
                className="bg-white p-6 border border-dashed border-gray-300 w-full max-w-[600px]"
              >
                {/* 
                  ESTRUCTURA DE TABLA HTML SEGURA PARA CORREOS 
                  No usar flexbox, grid, margin-auto u otros estilos modernos que Outlook bloquea.
                */}
                <table cellPadding="0" cellSpacing="0" border={0} style={{ fontFamily: "Arial, sans-serif", fontSize: "13px", color: "#333333", lineHeight: "1.4", width: "100%", maxWidth: "600px" }}>
                  <tbody>
                    <tr>
                      <td style={{ paddingBottom: "16px" }}>
                        Saludos / Best regards,
                      </td>
                    </tr>
                    <tr>
                      <td style={{ paddingBottom: "12px" }}>
                        <div style={{ fontSize: "14px", fontWeight: "bold", color: "#111111", margin: "0 0 2px 0" }}>
                          {name || "Andrés Kuppermann"}
                        </div>
                        <div style={{ color: "#555555", margin: "0" }}>
                          {title || "Business Development Executive"}
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ paddingBottom: "12px" }}>
                        {(logoBase64 || logoUrl) ? (
                          <img 
                            src={logoBase64 || logoUrl} 
                            alt="Logo" 
                            width={logoSize}
                            style={{ display: "block", width: `${logoSize}px`, height: "auto" }} 
                          />
                        ) : (
                          <div style={{ width: `${logoSize}px`, height: "50px", backgroundColor: "#f3f4f6", display: "inline-block" }}></div>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: "#333333" }}>
                        <div style={{ margin: "0 0 2px 0" }}>
                          <strong style={{ color: "#111111" }}>Email:</strong>{" "}
                          <a href={`mailto:${email || "correo@vorianglobal.com"}`} style={{ color: "#0563C1", textDecoration: "none" }}>
                            {email || "andres.kuppermann@vorianglobal.com"}
                          </a>
                        </div>
                        <div style={{ margin: "0 0 2px 0" }}>
                          <strong style={{ color: "#111111" }}>Tel:</strong>{" "}
                          {phone || "+569 9887 4251"}
                        </div>
                        <div style={{ margin: "0 0 2px 0" }}>
                          <strong style={{ color: "#111111" }}>Dirección:</strong>{" "}
                          {address || "Av. Apoquindo 4499, Piso 13, Las Condes, Santiago."}
                        </div>
                        <div style={{ margin: "4px 0 0 0" }}>
                          <a href="https://vorianglobal.com" style={{ color: "#0563C1", textDecoration: "none" }}>
                            vorianglobal.com
                          </a>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
                
                {/* Banner Legal (Opcional, muy corporativo) */}
                <table cellPadding="0" cellSpacing="0" border={0} style={{ fontFamily: "Arial, sans-serif", fontSize: "10px", color: "#999999", lineHeight: "1.3", width: "100%", marginTop: "24px", borderTop: "1px solid #eeeeee", paddingTop: "12px" }}>
                  <tbody>
                    <tr>
                      <td>
                        Este correo electrónico y cualquier archivo adjunto son confidenciales y están destinados exclusivamente para el uso del individuo o entidad a quien van dirigidos. Si usted no es el destinatario previsto, se le notifica que cualquier divulgación, copia o distribución está estrictamente prohibida.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
            
            <CardFooter className="bg-muted/50 py-4 flex justify-between sm:hidden">
              <Button 
                onClick={copyToClipboard} 
                className={`w-full transition-all ${copied ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                variant="default"
              >
                {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? "¡Copiado!" : "Copiar Firma"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
