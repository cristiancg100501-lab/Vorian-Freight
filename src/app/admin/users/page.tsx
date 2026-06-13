"use client";

import { useSupabaseCollection } from "@/hooks/supabase-hooks";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Search, User as UserIcon } from "lucide-react";
import { useState, useMemo } from "react";

const roleDisplay: { [key: string]: string } = {
  admin: "Administrador",
  client: "Cliente",
  driver: "Conductor",
  company: "Empresa",
  customer: "Mandante (Customer)",
};

export default function AdminUsersPage() {
  const { data: allUsers, isLoading } = useSupabaseCollection("userProfiles");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    
    // Sort by newest first
    const sorted = [...allUsers].sort((a, b) => 
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    if (!searchTerm) return sorted;

    const lowerSearch = searchTerm.toLowerCase();
    return sorted.filter(user => {
      const fullName = (user.name || `${user.firstName || ''} ${user.lastName || ''}`).toLowerCase();
      const email = (user.email || '').toLowerCase();
      const role = (roleDisplay[user.role] || user.role).toLowerCase();
      return fullName.includes(lowerSearch) || email.includes(lowerSearch) || role.includes(lowerSearch);
    });
  }, [allUsers, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">Vea, cree y gestione todos los usuarios de la plataforma.</p>
        </div>
        <Link href="/admin/users/new">
          <Button size="lg" className="shadow-lg shadow-primary/20">
            <PlusCircle className="h-5 w-5 mr-2" />
            Crear Nuevo Usuario
          </Button>
        </Link>
      </div>

      <Card className="bg-card border text-card-foreground overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Buscar por nombre, email o rol..." 
                    className="pl-10 bg-background"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="text-sm text-muted-foreground font-medium">
                Mostrando {filteredUsers.length} usuarios
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b">
                <tr>
                  <th scope="col" className="px-6 py-4">Usuario</th>
                  <th scope="col" className="px-6 py-4">Email</th>
                  <th scope="col" className="px-6 py-4">Rol</th>
                  <th scope="col" className="px-6 py-4">Fecha de Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y border-b">
                {isLoading && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                        <p className="text-muted-foreground font-medium">Cargando usuarios...</p>
                      </div>
                    </td>
                  </tr>
                )}
                {!isLoading && filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2 opacity-50">
                        <UserIcon className="h-12 w-12" />
                        <p>No se encontraron usuarios.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user: any) => (
                    <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">
                          <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold uppercase">
                                  {(user.firstName?.[0] || user.name?.[0] || 'U')}
                              </div>
                              {user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()}
                          </div>
                      </td>
                      <td className="px-6 py-4">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                          {roleDisplay[user.role] || user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString('es-CL', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
