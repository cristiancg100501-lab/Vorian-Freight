"use client";

import { useState } from "react";
import { useAuth } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24"
    {...props}
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
    <path d="M1 1h22v22H1z" fill="none" />
  </svg>
);

const AppleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24"
    fill="currentColor"
    {...props}
  >
    <path d="M19.33 12.08c0 1.54-.73 2.92-1.89 3.86-.03.02-.06.05-.08.08-.18.15-.36.29-.55.43-1.12.82-2.43 1.4-3.83 1.4s-2.71-.58-3.83-1.4c-.19-.14-.37-.28-.55-.43a.29.29 0 0 0-.08-.08c-1.16-.94-1.89-2.32-1.89-3.86 0-2.48 2.3-4.34 4.58-4.34.83 0 1.58.23 2.22.61.03.02.05.03.08.05.59.34 1.19.56 1.83.56.64 0 1.24-.22 1.83-.56.03-.02.05-.03.08-.05.64-.38 1.39-.61 2.22-.61 2.28 0 4.58 1.86 4.58 4.34zM16.89 5.23c.64-.78 1.05-1.87.99-2.99-.8.06-1.86.53-2.5 1.31-.61.74-1.1 1.83-1.04 2.93.83-.04 1.82-.47 2.55-1.25z" />
  </svg>
);

export function LogInForm() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!auth) {
      setError("El servicio de autenticación no está disponible.");
      setIsLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // If login is successful, the onAuthStateChanged listener in the main app
      // will handle the user state change and trigger any necessary redirects.
      // This form's job is done.
    } catch (error: any) {
      // This will catch auth errors like wrong password, user not found, etc.
      setError("Error al iniciar sesión. Por favor, verifica tus credenciales.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-8">
      <div className="space-y-3">
        <Button
          variant="outline"
          className="w-full h-12"
          disabled
        >
          <GoogleIcon className="mr-2" />
          Iniciar sesión con Google
        </Button>
        <Button
          variant="outline"
          className="w-full h-12"
          disabled
        >
          <AppleIcon className="mr-2" />
          Iniciar sesión con Apple
        </Button>
      </div>

      <div className="my-6 flex items-center">
        <div className="flex-grow border-t"></div>
        <span className="mx-4 text-xs text-muted-foreground">O</span>
        <div className="flex-grow border-t"></div>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <Label htmlFor="email" className="text-muted-foreground font-medium">
            Correo Electrónico
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Tu dirección de correo electrónico"
            required
            className="mt-2 h-12"
          />
        </div>
        <div>
          <div className="flex justify-between items-center">
            <Label htmlFor="password" className="text-muted-foreground font-medium">
              Contraseña
            </Label>
            <a href="#" className="text-sm text-primary hover:underline">
              ¿Olvidaste tu contraseña?
            </a>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            required
            className="mt-2 h-12"
          />
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button
          type="submit"
          className="w-full h-12 font-semibold"
          disabled={isLoading}
        >
          {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿No tienes una cuenta?{" "}
        <a
          href="/signup"
          className="font-semibold text-primary hover:underline"
        >
          Regístrate
        </a>
      </p>
    </div>
  );
}
