# 📜 Guía Maestra de Precios: Vorian Logistics (Modo Rampla)

Esta guía explica cómo Vorian calcula automáticamente cada flete y cómo puedes ajustar las variables de negocio en el futuro sin tocar una sola línea de código.

---

## 📐 1. La Fórmula Maestra
El cálculo se realiza en tiempo real por el servidor de Supabase mediante la función `get_vorian_price`. La lógica es la siguiente:

**`Precio Final = [Costo Base + FAF (Recargo Combustible)] + Comisión Vorian (10%)`**

### Desglose del Costo Base:
1.  **Tarifa Fija ($65,000)**: Cubre administración, carga/descarga y acceso a puerto.
2.  **Costo Diésel (Variable)**: `(Distancia / Eficacia) * Precio Diésel del Día`.
3.  **Costo Desgaste ($180/km)**: Neumáticos, aceite y mantenimiento.
4.  **Costo Tiempo ($200/min)**: Cubre el sueldo del conductor y el valor hora del camión.
5.  **Multiplicadores de Inteligencia**:
    -   **Urgencia**: +20% si el flete es para hoy mismo.
    -   **Zonificación**: +15% para zonas complejas (ej: Sur de Chile).
    -   **Demanda**: Ajuste dinámico según la distancia para optimizar la oferta.

---

## 🛠️ 2. ¿Cómo modificar los valores? (Panel Supabase)

No necesitas programar. Solo debes entrar a tu **Dashboard de Supabase > Table Editor** y editar las siguientes tablas:

### A. Tabla `vehicleRates` (Tarifas de Camiones)
Aquí controlas la "personalidad" de tus ramplas:
-   **`baseFare`**: Cambia el precio de salida.
-   **`fuelEfficiency`**: Ajusta si los camiones consumen más o menos (km/L).
-   **`costPerKm`**: Ajusta el valor por desgaste.

### B. Tabla `fuel_surcharge_rules` (Reglas del FAF)
Aquí defines cuándo aplicar el recargo por combustible:
-   **`low_bound` / `high_bound`**: El rango de precio del diésel (ej: entre 1100 y 1200).
-   **`surcharge_percent`**: El % que se suma al flete (ej: 5.0 para un 5% extra).

### C. Tabla `settings` (Parámetros de Inteligencia)
Controla la agresividad de Vorian:
-   **`urgencyMultiplier`**: Sube o baja el recargo por envíos inmediatos (ej: 1.25 para un 25%).
-   **`demandSensitivity`**: Ajusta qué tanto fluctúa el precio según la distancia.

---

## 🤖 3. Automatización del Diésel
El precio del combustible se actualiza **automáticamente** todos los días gracias a la función `sync-diesel-price` que conecta Vorian con la API de la CNE (Comisión Nacional de Energía). 

> [!TIP]
> Si en algún momento la API del gobierno falla o quieres forzar un precio, puedes editar manualmente la columna `dieselCostPerLiter` en la tabla `settings` y el sitio web usará ese valor de inmediato.

---

## 🧠 4. Cambiar la "Fórmula" (Nivel Avanzado)
Si decides cambiar la lógica matemática (ej: dejar de cobrar por minuto), debes editar la función **`get_vorian_price`** en el **SQL Editor** de Supabase. Es el "cerebro" de Vorian.

---
*Vorian Logistics: Potencia Total, Control Absoluto.*
