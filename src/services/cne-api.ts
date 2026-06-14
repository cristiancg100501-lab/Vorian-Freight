'use server';

import { getCneToken } from '@/services/server-token';

/**
 * Realiza la consulta de precios de combustible a la CNE.
 * @param token El token de autorización Bearer.
 */
async function getCnePrices(token: string) {
  console.log("--- Iniciando getCnePrices en el servidor ---");
  const myHeaders = new Headers();
  myHeaders.append("User-Agent", "Apidog/1.0.0 (https://apidog.com)");
  myHeaders.append("Authorization", `Bearer ${token}`);
  myHeaders.append("Accept", "*/*");
  myHeaders.append("Host", "api.cne.cl");
  myHeaders.append("Connection", "keep-alive");

  const requestOptions: RequestInit = {
    method: 'GET',
    headers: myHeaders,
    redirect: 'follow',
    cache: 'no-store'
  };

  try {
    const response = await fetch("https://api.cne.cl/api/ea/precio/combustibleliquido", requestOptions);
    
    if (!response.ok) {
      const errorDetail = await response.text();
      console.error("Respuesta de error de la API de CNE:", errorDetail);
      throw new Error(`Error en la API de precios de CNE: ${response.status} - ${errorDetail}`);
    }

    const result = await response.json();
    return result;
    
  } catch (error: any) {
    console.error("Error al consultar precios en CNE:", error.message);
    throw error;
  }
}


/**
 * Orquesta la obtención del token y la consulta del precio del diésel.
 * @returns El precio promedio del Petróleo Diesel en la Región Metropolitana.
 */
export async function getDieselPrice(): Promise<number> {
  console.log("--- Iniciando getDieselPrice en el servidor ---");
  try {
    const tokenResult = await getCneToken();
    if (!tokenResult.success || !tokenResult.token) {
      console.error("Fallo en getCneToken, no se puede continuar con getDieselPrice.");
      throw new Error(tokenResult.error || "No se pudo obtener el token de autenticación de CNE.");
    }

    console.log("Token obtenido, procediendo a buscar precios...");
    const pricesData = await getCnePrices(tokenResult.token);
    console.log("Respuesta completa de la API de CNE:", JSON.stringify(pricesData, null, 2));
    
    if (!pricesData.success || !pricesData.data) {
        throw new Error("La respuesta de la API de precios de CNE no fue exitosa o no contiene datos.");
    }

    const validPrices = pricesData.data
      .filter((d: any) => 
        d.tipo_combustible === "petroleo_diesel" && 
        d.region_cod === 13 &&
        !isNaN(parseFloat(d.precio_por_litro.replace(',', '.')))
      )
      .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    if (validPrices.length === 0) {
      throw new Error("No se encontraron precios válidos para 'petroleo_diesel' en la RM.");
    }

    const mostRecent = validPrices[0];
    const currentPrice = parseFloat(mostRecent.precio_por_litro.replace(',', '.'));
    
    console.log("Precio más reciente encontrado:", currentPrice, "de la fecha:", mostRecent.fecha);

    return Math.round(currentPrice);
    
  } catch (error: any) {
    console.error("Error en el proceso getDieselPrice:", error.message);
    // Re-lanza el error para que sea manejado por el que llama a la función (el componente de la UI)
    throw error;
  }
}
