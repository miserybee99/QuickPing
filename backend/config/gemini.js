import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// Check if Gemini is configured
export function isGeminiConfigured() {
  return !!process.env.GEMINI_API_KEY;
}

// Get Gemini model
// Using gemini-2.5-flash for best quality
export function getGeminiModel(modelName = 'gemini-2.5-flash') {
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }
  return genAI.getGenerativeModel({ model: modelName });
}

export default genAI;

