'use server';
/**
 * @fileOverview Un agente de IA para analizar y evaluar solicitudes de envío de carga.
 *
 * - analyzeShipment - Una función que procesa los detalles del envío y devuelve un análisis.
 * - AnalyzeShipmentInput - El tipo de entrada para la función analyzeShipment.
 * - AnalyzeShipmentOutput - El tipo de retorno para la función analyzeShipment.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Definir el esquema de entrada para el flujo.
// Estos son los datos que le pasaremos a la IA.
const AnalyzeShipmentInputSchema = z.object({
  commodity: z.string().describe('Descripción de la mercancía que se transporta.'),
  weight_lbs: z.number().describe('El peso total de la carga en libras.'),
  specialHandling: z.object({
      hazardous: z.boolean().describe('Indica si la carga contiene materiales peligrosos.'),
      requiresPermit: z.boolean().describe('Indica si la carga requiere permisos especiales.'),
      oversize: z.boolean().describe('Indica si la carga es sobredimensionada.'),
  }).describe('Requerimientos de manejo especial.'),
  cargoNotes: z.string().optional().describe('Notas adicionales o instrucciones del cliente sobre la carga.'),
});
export type AnalyzeShipmentInput = z.infer<typeof AnalyzeShipmentInputSchema>;

// Definir el esquema de salida.
// Esta es la estructura de la respuesta que esperamos de la IA.
const AnalyzeShipmentOutputSchema = z.object({
  summary: z.string().describe('Un resumen conciso y profesional de la solicitud de envío, en 1-2 frases.'),
  riskLevel: z.enum(['bajo', 'medio', 'alto']).describe('El nivel de riesgo general estimado para este envío (logístico, de seguridad, etc.).'),
  riskAnalysis: z.string().describe('Un análisis detallado de los posibles riesgos o inconsistencias. Si no hay riesgos, debe indicarlo explícitamente.'),
  suggestions: z.array(z.string()).describe('Una lista de 1 a 3 sugerencias o recomendaciones para el operador logístico (ej: "Verificar documentación para material peligroso", "Confirmar dimensiones de la carga").'),
});
export type AnalyzeShipmentOutput = z.infer<typeof AnalyzeShipmentOutputSchema>;

// Función de envoltura exportada que se llamará desde la UI.
export async function analyzeShipment(input: AnalyzeShipmentInput): Promise<AnalyzeShipmentOutput> {
  return analyzeShipmentFlow(input);
}

// El prompt que define la tarea para el modelo de IA.
const analyzeShipmentPrompt = ai.definePrompt({
  name: 'analyzeShipmentPrompt',
  input: {schema: AnalyzeShipmentInputSchema},
  output: {schema: AnalyzeShipmentOutputSchema},
  prompt: `Eres un experto en logística y análisis de riesgos para una empresa de transporte de carga. Tu tarea es analizar la siguiente solicitud de envío y proporcionar una evaluación clara y concisa.

  Basándote en los datos proporcionados, evalúa la carga y genera un resumen, un análisis de riesgos y sugerencias prácticas.

  **Datos del Envío:**
  - Mercancía: {{{commodity}}}
  - Peso: {{{weight_lbs}}} lbs
  - Notas del cliente: "{{{cargoNotes}}}"
  - ¿Materiales Peligrosos?: {{{specialHandling.hazardous}}}
  - ¿Requiere Permisos?: {{{specialHandling.requiresPermit}}}
  - ¿Sobredimensionado?: {{{specialHandling.oversize}}}

  **Tu Análisis debe incluir:**
  1.  **Resumen**: Describe brevemente el envío.
  2.  **Nivel de Riesgo**: Clasifícalo como 'bajo', 'medio' o 'alto'. Un envío estándar sin notas especiales es 'bajo'. Un envío pesado, con notas sobre fragilidad o con requerimientos especiales (peligroso, permisos) es 'medio' o 'alto'.
  3.  **Análisis de Riesgo**: Explica tu razonamiento. Si el cliente menciona "vidrio" pero no marca "frágil" (no es una opción pero puedes inferirlo de las notas), es un riesgo. Si el peso es muy alto, es un riesgo. Si es peligroso, el riesgo es alto por defecto. Si no ves riesgos, indica "No se detectaron riesgos aparentes".
  4.  **Sugerencias**: Ofrece acciones concretas. Si es peligroso, sugiere "Verificar documentación y certificaciones del conductor". Si es pesado, sugiere "Confirmar capacidad de la grúa en origen y destino". Siempre incluye al menos una sugerencia, incluso si el riesgo es bajo (ej: "Confirmar horarios con el cliente").`,
});


// El flujo de Genkit que orquesta la llamada a la IA.
const analyzeShipmentFlow = ai.defineFlow(
  {
    name: 'analyzeShipmentFlow',
    inputSchema: AnalyzeShipmentInputSchema,
    outputSchema: AnalyzeShipmentOutputSchema,
  },
  async input => {
    const {output} = await analyzeShipmentPrompt(input);
    if (!output) {
      throw new Error("La IA no pudo generar un análisis para este envío.");
    }
    return output;
  }
);
