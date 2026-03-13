import {onRequest} from "firebase-functions/v2/https";
import axios from "axios";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const obtenerPrecioCombustible = onRequest(async (req, res) => {
  try {
    // LOGIN API CNE
    const loginResponse = await axios.post(
      "https://api.cne.cl/api/login",
      new URLSearchParams({
        email: "info@vorianglobal.com",
        password: "Da10vi9d.",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const token = loginResponse.data.token;

    // CONSULTAR PRECIOS
    const apiResponse = await axios.get(
      "https://api.cne.cl/api/ea/precio/combustibleliquido",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const datos = apiResponse.data.data;

    // FILTRAR DESDE 2024
    const datosDesde2024 = datos.filter((item: any) => {
      return item.anio >= 2024;
    });

    let guardados = 0;

    for (const item of datosDesde2024) {
      const id =
        `${item.anio}_${item.mes}_` +
        `${item.region_cod}_` +
        `${item.tipo_combustible}`;

      await db.collection("combustibles")
        .doc(id)
        .set({
          anio: item.anio,
          mes: item.mes,
          region_nombre: item.region_nombre,
          region_cod: item.region_cod,
          tipo_combustible: item.tipo_combustible,
          precio_por_litro: item.precio_por_litro,
        });

      guardados++;
    }

    res.json({
      registros_guardados: guardados,
    });
  } catch (error: any) {
    console.error("ERROR:", error.response?.data || error);

    res.status(500).json({
      error: error.response?.data || error.message,
    });
  }
});
