'use server';

/**
 * Función para obtener el Token de la CNE basado en tu script de PowerShell.
 */
export async function getCneToken() {
  const loginUrl = "https://api.cne.cl/api/login";

  // Definimos los encabezados exactos que funcionan en tu script
  const headers = {
    'User-Agent': 'Apidog/1.0.0 (https://apidog.com)',
    'Accept': '*/*',
    'Host': 'api.cne.cl',
    'Connection': 'keep-alive',
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  // Preparamos el cuerpo URL-Encoded
  const body = new URLSearchParams();
  body.append('email', 'info@vorianglobal.com');
  body.append('password', 'Da10vi9d.');

  try {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: headers,
      body: body.toString(),
      cache: 'no-store' // Evita que el navegador guarde tokens viejos
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Error en el Login CNE: ${response.status} - ${errorData}`);
    }

    // Según el comando de PowerShell, la respuesta es un objeto JSON
    const data = await response.json();

    // Verificamos si el token viene en la propiedad 'token'
    if (data && data.token) {
      return { success: true, token: data.token };
    } else {
      throw new Error("La API no devolvió un token en la respuesta.");
    }

  } catch (error: any) {
    console.error("Fallo al autenticar con CNE:", error.message);
    return { success: false, error: error.message };
  }
}