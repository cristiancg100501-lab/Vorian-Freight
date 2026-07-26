import { NextRequest, NextResponse } from 'next/server';

// Memoria local en servidor (Sliding Window simple por IP)
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

// Limpiar IPs antiguas cada 5 minutos para evitar fuga de memoria
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequestCounts.entries()) {
    if (now > record.resetTime) {
      ipRequestCounts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

interface RateLimitConfig {
  limit?: number;      // Cantidad máxima de peticiones
  windowMs?: number;   // Ventana de tiempo en milisegundos
}

/**
 * Valida la tasa de peticiones por dirección IP.
 * @returns Response 429 si supera el límite, o null si todo está bien.
 */
export function checkRateLimit(
  req: NextRequest,
  config: RateLimitConfig = {}
): NextResponse | null {
  const limit = config.limit ?? 20; // 20 peticiones por defecto
  const windowMs = config.windowMs ?? 60 * 1000; // 1 minuto por defecto

  // Obtener IP del cliente
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';

  const now = Date.now();
  const record = ipRequestCounts.get(ip);

  if (!record || now > record.resetTime) {
    ipRequestCounts.set(ip, {
      count: 1,
      resetTime: now + windowMs,
    });
    return null;
  }

  if (record.count >= limit) {
    const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
    return NextResponse.json(
      {
        error: 'Demasiadas solicitudes. Por favor, intenta de nuevo más tarde.',
        retryAfterSeconds: retryAfterSec,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
        },
      }
    );
  }

  record.count += 1;
  return null;
}
