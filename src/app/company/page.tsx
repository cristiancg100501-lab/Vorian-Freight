"use client";

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
  } from "@/components/ui/card";
  
  export default function CompanyDashboardPage() {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dashboard de Empresa</CardTitle>
          <CardDescription>
            Bienvenido al panel de su empresa. Aquí podrá ver un resumen de la
            actividad de su flota.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-20 text-muted-foreground">
            <p>El dashboard de empresa está en construcción.</p>
          </div>
        </CardContent>
      </Card>
    );
  }
