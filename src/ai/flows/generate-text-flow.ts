"use server";

import { ai } from "@/ai/google";
import { type EnhancedGenerateContentResponse } from "@google/generative-ai";

/**
 * @fileOverview AI-powered text generation flow.
 * This file defines a function that uses a generative AI model to generate text
 * based on a user-provided prompt.
 *
 * @module ai/flows/generate-text
 * @interface GenerateTextInput - The input type for the generateText function.
 * @interface GenerateTextOutput - The output type for the generateText function.
 * @function generateText - A function that handles the text generation process.
 */

export interface GenerateTextInput {
  prompt: string;
}

/**
 * Replace this function with your actual AI model call.
 */
async function callAiModel(
  prompt: string
): Promise<EnhancedGenerateContentResponse> {
  const result = await ai.generateContent(prompt);
  const response = result.response;
  return response;
}

/**
 * generateText: Calls the AI model to generate text based on the input prompt.
 */
export async function generateText(
  input: GenerateTextInput
): Promise<EnhancedGenerateContentResponse> {
  const generatedResult = await callAiModel(input.prompt);
  return generatedResult;
}
