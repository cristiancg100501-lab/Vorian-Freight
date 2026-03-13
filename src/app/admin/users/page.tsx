"use client";

import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

const roleDisplay: { [key: string]: string } = {
  admin: "Administrador",
  client: "Cliente",
  driver: "Conductor",
  company: "Empresa",
};

export default function AdminUsersPage() {
  const firestore = useFirestore();

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, "userProfiles"), orderBy("createdAt", "desc"));
  }, [firestore]);

  const { data: allUsers, isLoading } = useCollection(usersQuery);

  return (
    <Card className="bg-card border text-card-foreground">
      <CardHeader>
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <CardTitle>Gestión de Usuarios</CardTitle>
            <CardDescription className="mt-1">
              Vea, cree y gestione todos los usuarios de la plataforma.
            </CardDescription>
          </div>
          <Link href="/admin/users/new">
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Crear Nuevo Usuario
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase border-b">
              <tr>
                <th scope="col" className="px-6 py-3">Nombre</th>
                <th scope="col" className="px-6 py-3">Email</th>
                <th scope="col" className="px-6 py-3">Rol</th>
                <th scope="col" className="px-6 py-3">Fecha de Creación</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                    Cargando usuarios...
                  </td>
                </tr>
              )}
              {!isLoading && (!allUsers || allUsers.length === 0) ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                    No hay usuarios en el sistema.
                  </td>
                </tr>
              ) : (
                allUsers?.map((user: any) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="px-6 py-4 font-medium text-foreground">{user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()}</td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs bg-secondary text-secondary-foreground">
                        {roleDisplay[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
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
