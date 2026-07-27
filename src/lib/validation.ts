/**
  Validadores livianos para sanear y verificar parámetros en las API routes.
*/

export const sanitize = {
  /**
   * Sanitiza strings eliminando caracteres de control e inyecciones de script básicas.
   */
  string(input: unknown, maxLength = 255): string | null {
    if (typeof input !== 'string') return null;
    const sanitized = input.trim().replace(/<[^>]*>?/gm, ''); // Remover HTML
    if (sanitized.length === 0 || sanitized.length > maxLength) return null;
    return sanitized;
  },

  /**
   * Valida emails con regex estándar.
   */
  email(input: unknown): string | null {
    if (typeof input !== 'string') return null;
    const cleaned = input.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleaned) || cleaned.length > 255) return null;
    return cleaned;
  },

  /**
   * Valida que el número esté dentro de un rango seguro.
   */
  number(input: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number | null {
    const num = Number(input);
    if (isNaN(num) || num < min || num > max) return null;
    return num;
  },

  /**
   * Valida UUIDs v4 o strings de IDs.
   */
  id(input: unknown): string | null {
    if (typeof input !== 'string') return null;
    const cleaned = input.trim();
    if (cleaned.length === 0 || cleaned.length > 128) return null;
    return cleaned;
  },

  /**
   * Formatea y limpia RUT eliminando puntos y dejando formato XXXXXXXX-X.
   */
  rut(input: unknown): string | null {
    if (typeof input !== 'string') return null;
    const cleaned = input.replace(/[^0-9kK-]/g, '').toUpperCase();
    if (!cleaned.includes('-') && cleaned.length > 1) {
      return `${cleaned.slice(0, -1)}-${cleaned.slice(-1)}`;
    }
    return cleaned || null;
  }
};
