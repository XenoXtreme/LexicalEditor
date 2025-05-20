// src/ai/flows/ai-autocomplete.ts
'use server';

/**
 * @fileOverview AI-powered autocompletion flow.
 *
 * This file defines a Genkit flow that uses a generative AI model to provide sentence and phrase completions
 * based on the current text in the editor. The flow takes the current editor content as input and returns
 * a suggested autocompletion.
 *
 * @module ai/flows/ai-autocomplete
 *
 * @interface AutocompleteInput - The input type for the aiAutocomplete function.
 * @interface AutocompleteOutput - The output type for the aiAutocomplete function.
 * @function aiAutocomplete - A function that handles the autocompletion process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

/**
 * Input schema for the autocompletion flow.
 */
const AutocompleteInputSchema = z.object({
  text: z.string().describe('The current text in the editor.'),
});
export type AutocompleteInput = z.infer<typeof AutocompleteInputSchema>;

/**
 * Output schema for the autocompletion flow.
 */
const AutocompleteOutputSchema = z.object({
  completion: z.string().describe('The suggested autocompletion.'),
});
export type AutocompleteOutput = z.infer<typeof AutocompleteOutputSchema>;

/**
 * aiAutocomplete: This is a wrapper function that calls the aiAutocompleteFlow.
 */
export async function aiAutocomplete(input: AutocompleteInput): Promise<AutocompleteOutput> {
  return aiAutocompleteFlow(input);
}


const autocompletePrompt = ai.definePrompt({
  name: 'autocompletePrompt',
  input: {schema: AutocompleteInputSchema},
  output: {schema: AutocompleteOutputSchema},
  prompt: `You are an AI assistant that provides intelligent autocompletions for text in an editor.
  Given the current text, suggest a completion that continues the thought or provides a relevant phrase.
  Current text: {{{text}}}
  Completion:`,
});


const aiAutocompleteFlow = ai.defineFlow(
  {
    name: 'aiAutocompleteFlow',
    inputSchema: AutocompleteInputSchema,
    outputSchema: AutocompleteOutputSchema,
  },
  async input => {
    const {output} = await autocompletePrompt(input);
    return output!;
  }
);
