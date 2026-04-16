"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, QrCode } from "lucide-react";

interface ScannerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedText: string) => void;
}

export function ScannerDialog({ isOpen, onClose, onScan }: ScannerDialogProps) {
  const [scanResult, setScanResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => {
          setScanResult(decodedText);
          onScan(decodedText);
          scanner.clear();
        },
        (error) => {
          // console.warn(error);
        }
      );

      return () => {
        scanner.clear().catch(error => console.error("Failed to clear scanner", error));
      };
    }
  }, [isOpen, onScan]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Escanear Paquete
          </DialogTitle>
          <DialogDescription>
            Coloque el código QR o de barras frente a la cámara para escanearlo.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4">
          {!scanResult ? (
            <div id="reader" className="w-full max-w-sm overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/25" />
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <div className="text-center">
                <p className="font-bold text-lg">¡Escaneo Exitoso!</p>
                <p className="text-sm text-muted-foreground font-mono mt-1">{scanResult}</p>
              </div>
              <Button variant="outline" onClick={() => setScanResult(null)}>
                Escanear de nuevo
              </Button>
            </div>
          )}
        </div>
        <DialogFooter className="sm:justify-start">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
