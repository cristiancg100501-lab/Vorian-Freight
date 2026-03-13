'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// This assumes the GEMINI_API_KEY environment variable is set.
export const ai = genkit({
  plugins: [googleAI()],
});
