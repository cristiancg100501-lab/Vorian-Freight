import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type AuthResult =
  | { user: { id: string }; role: string }
  | { error: string; status: number };

/**
 * Verifica que la request viene de un usuario autenticado.
 * Lee el token JWT del header Authorization: Bearer <token>
 */
export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // Fallback a cookies de sesión de Supabase si no viene header Bearer
  if (!token) {
    const allCookies = req.cookies.getAll();
    for (const cookie of allCookies) {
      if (cookie.name.includes('-auth-token') || cookie.name.endsWith('-access-token')) {
        try {
          const raw = decodeURIComponent(cookie.value);
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            token = parsed[0];
          } else {
            token = parsed.access_token ?? parsed;
          }
        } catch {
          token = cookie.value;
        }
        if (token && typeof token === 'string' && token.length > 20) break;
      }
    }
  }

  if (!token) {
    return { error: 'No autenticado. Inicie sesión nuevamente.', status: 401 };
  }

  // Crear cliente con el token del usuario (respeta RLS)
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { error: 'Token inválido o expirado', status: 401 };
  }

  // Obtener rol usando el admin client para evitar problemas de RLS en userProfiles
  const supabaseAdmin = createClient(
    SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('userProfiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { error: 'Perfil de usuario no encontrado', status: 403 };
  }

  return { user: { id: user.id }, role: profile.role };
}

/**
 * Verifica que la request viene de un usuario con rol 'admin'.
 */
export async function requireAdmin(req: NextRequest): Promise<AuthResult> {
  const result = await requireAuth(req);
  if ('error' in result) return result;
  if (result.role !== 'admin') {
    return { error: 'Acceso restringido a administradores', status: 403 };
  }
  return result;
}

/**
 * Verifica que la request viene de un usuario con alguno de los roles indicados.
 */
export async function requireRole(req: NextRequest, roles: string[]): Promise<AuthResult> {
  const result = await requireAuth(req);
  if ('error' in result) return result;
  if (!roles.includes(result.role)) {
    return { error: `Acceso restringido a: ${roles.join(', ')}`, status: 403 };
  }
  return result;
}
