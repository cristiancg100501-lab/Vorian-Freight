import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Rutas completamente públicas (sin auth requerida)
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/register',
  '/api/contact',
  '/api/webhooks',
  '/api/pricing',  // pricing es llamado por el cliente anon
  '/_next',
  '/favicon.ico',
];

// Mapa de prefijo de ruta → roles permitidos
const ROLE_MAP: Array<{ prefix: string; roles: string[] }> = [
  { prefix: '/admin',    roles: ['admin'] },
  { prefix: '/client',   roles: ['client', 'admin'] },
  { prefix: '/customer', roles: ['customer', 'client', 'admin'] },
  { prefix: '/company',  roles: ['company', 'admin'] },
  { prefix: '/driver',   roles: ['driver', 'admin'] },
];

// Dashboard por defecto de cada rol
const ROLE_DASHBOARD: Record<string, string> = {
  admin:    '/admin',
  client:   '/client',
  customer: '/customer',
  company:  '/company',
  driver:   '/driver',
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Dejar pasar rutas públicas y assets estáticos
  if (PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Intentar extraer el token JWT de las cookies de Supabase
  // Las cookies de Supabase siguen el patrón: sb-<project-ref>-auth-token
  let accessToken: string | null = null;
  const allCookies = request.cookies.getAll();
  for (const cookie of allCookies) {
    if (cookie.name.includes('-auth-token')) {
      try {
        const parsed = JSON.parse(decodeURIComponent(cookie.value));
        accessToken = parsed.access_token ?? null;
      } catch {
        accessToken = cookie.value;
      }
      if (accessToken) break;
    }
  }

  // También aceptar header Authorization para llamadas desde la app móvil
  if (!accessToken) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      accessToken = authHeader.slice(7);
    }
  }

  if (!accessToken) {
    // No autenticado → redirigir a login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Validar token y obtener rol usando el service role (bypass RLS para leer perfil)
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Obtener rol del perfil
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile } = await adminClient
    .from('userProfiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role as string | undefined;

  // Verificar acceso por rol
  for (const { prefix, roles } of ROLE_MAP) {
    if (pathname.startsWith(prefix)) {
      if (!role || !roles.includes(role)) {
        const redirect = role ? (ROLE_DASHBOARD[role] ?? '/') : '/login';
        return NextResponse.redirect(new URL(redirect, request.url));
      }
      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
