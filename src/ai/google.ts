import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "dotenv";

config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set in environment variables.");
}

const googleAI = new GoogleGenerativeAI(apiKey);

export const ai = googleAI.getGenerativeModel({
  model: "gemini-pro"
});
