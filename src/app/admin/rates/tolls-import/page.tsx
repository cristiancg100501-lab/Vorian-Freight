'use client'

import React, { useState, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UploadCloud, CheckCircle2, AlertTriangle, FileUp, Loader2 } from 'lucide-react'
import { useSupabase } from '@/components/providers/supabase-provider'

export default function TollsImportPage() {
  const { supabase } = useSupabase()
  const [file, setFile] = useState<File | null>(null)
  const [toastMsg, setToastMsg] = useState<{msg: string, type: 'success' | 'error'} | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [results, setResults] = useState<{
    totalFile: number;
    deduplicatedFile: number;
    existingDb: number;
    inserted: number;
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0])
    }
  }

  const handleFileSelected = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.geojson') && !selectedFile.name.endsWith('.json')) {
      setToastMsg({ msg: 'Por favor sube un archivo con formato .geojson o .json', type: 'error' })
      return;
    }
    setFile(selectedFile)
    setResults(null)
  }

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  const parseCoordinates = (feature: any): [number, number] => {
    if (feature.geometry.type === 'Point') {
      return feature.geometry.coordinates;
    } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
      // Simplistic centroid fallback for polygons if needed
      try {
        let coords = feature.geometry.coordinates;
        while (Array.isArray(coords) && typeof coords[0] !== 'number' && typeof coords[0][0] !== 'number') {
            coords = coords[0];
        }
        let sumLng = 0, sumLat = 0, count = 0;
        for (const point of coords) {
            if (Array.isArray(point) && typeof point[0] === 'number') {
                sumLng += point[0]; sumLat += point[1]; count++;
            }
        }
        if (count === 0) return [0, 0];
        return [sumLng / count, sumLat / count];
      } catch (e) {
        return [0, 0]
      }
    }
    return [0,0];
  }

  const processFile = async () => {
    if (!file) return;
    setIsProcessing(true);
    setResults(null);

    try {
      // 1. Read File
      const fileContent = await file.text();
      const geojson = JSON.parse(fileContent);
      const features = geojson.features || [];

      if (!features.length) {
        setToastMsg({ msg: "El archivo GeoJSON no contiene features válidos.", type: 'error' });
        setIsProcessing(false);
        return;
      }

      // 2. Fetch existing from DB with coordinates
      const { data: existingPorticos, error: fetchErr } = await supabase.from('porticos').select('id, name, reference_code, latitude, longitude');
      if (fetchErr) throw fetchErr;

      // 3. Process Geojson WITHOUT deduplication
      const parsedFeatures = features.map((feature: any) => {
        let name = feature.properties.name || feature.properties.official_name || "Sin Nombre";
        let ref = feature.properties.ref || null;
        let coords = parseCoordinates(feature);
        return {
          id: feature.properties?.['@id'] || feature.id || Math.random().toString(),
          name,
          ref,
          lat: coords[1],
          lng: coords[0],
          matched: false,
        };
      }).filter((f: any) => f.lat !== 0 || f.lng !== 0);

      // 4. Identify the existing DB porticos and mark their EXACT MATCHES in GeoJSON
      let ignoredCount = 0;

      if (existingPorticos && existingPorticos.length > 0) {
         for (const dbPortico of existingPorticos) {
            // Find candidates in GeoJSON
            let candidates = parsedFeatures.filter((f: any) => !f.matched && ((dbPortico.reference_code && f.ref === dbPortico.reference_code) || f.name === dbPortico.name));
            
            if (candidates.length === 0) continue;

            let closest = null;
            let minDistance = Infinity;

            for (const c of candidates) {
                const dist = getDistance(dbPortico.latitude, dbPortico.longitude, c.lat, c.lng);
                if (dist < minDistance) {
                    minDistance = dist;
                    closest = c;
                }
            }

            // Mark the closest as ignored if it's within a reasonable radius (e.g. 2000 meters)
            if (closest && minDistance < 2000) {
                closest.matched = true;
                ignoredCount++;
            }
         }
      }

      // 5. Bulk Insert the unmatched ones
      const toInsert = parsedFeatures.filter((f: any) => !f.matched).map((val: any) => ({
          name: val.name,
          reference_code: val.ref,
          latitude: val.lat,
          longitude: val.lng,
          location: `SRID=4326;POINT(${val.lng} ${val.lat})`,
          is_active: false
      }));

      // 5. Bulk Insert
      let insertedCount = 0;
      const batchSize = 100;
      for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);
        const { error: insErr } = await supabase.from('porticos').insert(batch);
        if (insErr) {
           console.error("Batch insert error:", insErr);
           setToastMsg({ msg: `Error insertando lote ${i/batchSize + 1}`, type: 'error' });
        } else {
           insertedCount += batch.length;
        }
      }

      setResults({
        totalFile: features.length,
        deduplicatedFile: parsedFeatures.length,
        existingDb: ignoredCount,
        inserted: insertedCount
      });
      
      setToastMsg({ msg: `Importación finalizada. ${insertedCount} pórticos nuevos agregados.`, type: 'success' });

    } catch (e: any) {
       console.error("Error procesando:", e);
       setToastMsg({ msg: e.message || "Error desconocido procesando el archivo", type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 pt-1 lg:p-6 lg:pt-4">
      {toastMsg && (
        <div className={`p-4 rounded-md mb-4 text-white font-medium flex items-center gap-2 ${toastMsg.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toastMsg.type === 'error' ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          {toastMsg.msg}
          <button className="ml-auto opacity-70 hover:opacity-100" onClick={() => setToastMsg(null)}>×</button>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Importador de Pórticos</h1>
        <p className="text-muted-foreground">
          Sube un archivo GeoJSON para agregar pórticos faltantes a la base de datos de manera exhaustiva.
          Se conservarán TODOS los pórticos del archivo (incluyendo direcciones contrarias), exluyendo ÚNICAMENTE aquellos que ya existen y coinciden geográficamente con tu base de datos configurada.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5" /> Subir Archivo
            </CardTitle>
            <CardDescription>
              Arrastra tu archivo export.geojson aquí
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className={`p-10 border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-4 transition-colors ${file ? 'border-primary/50 bg-primary/5' : 'border-border'}`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <UploadCloud className="w-12 h-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-lg font-medium">{file ? file.name : "Selecciona o arrastra el archivo"}</p>
                <p className="text-sm text-muted-foreground">Formato Requerido: JSON, GeoJSON</p>
              </div>
              <input 
                 type="file" 
                 ref={fileInputRef} 
                 className="hidden" 
                 accept=".json,.geojson" 
                 onChange={handleFileChange} 
              />
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                Explorar Archivos
              </Button>
            </div>

            {file && (
              <Button 
                 onClick={processFile} 
                 disabled={isProcessing} 
                 className="w-full mt-6"
                 size="lg"
              >
                {isProcessing ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Procesando e Insertando...</>
                ) : (
                  <><CheckCircle2 className="mr-2 h-4 w-4" /> Ejecutar Importación Segura</>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {results && (
          <Card className="h-full bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="w-5 h-5" /> Resultados del Proceso
              </CardTitle>
              <CardDescription>
                Resumen de la sincronización de datos con Supabase
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                 <li className="flex justify-between items-center bg-background p-3 rounded-md border">
                    <span className="text-muted-foreground">Total features archivo (bruto)</span>
                    <span className="font-semibold">{results.totalFile}</span>
                 </li>
                 <li className="flex justify-between items-center bg-background p-3 rounded-md border">
                    <span className="text-muted-foreground">Total features archivo válidos</span>
                    <span className="font-semibold">{results.deduplicatedFile}</span>
                 </li>
                 <li className="flex justify-between items-center bg-background p-3 rounded-md border">
                    <span className="text-muted-foreground">Ignorados (Ya existían en Base de Datos)</span>
                    <span className="font-semibold text-amber-600">{results.existingDb}</span>
                 </li>
                 <li className="flex justify-between items-center bg-primary p-4 rounded-md shadow-sm">
                    <span className="text-primary-foreground font-semibold">Nuevos Insertados Exitosamente</span>
                    <span className="font-bold text-xl text-primary-foreground">{results.inserted}</span>
                 </li>
              </ul>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}
