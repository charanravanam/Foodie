
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile } from "../types";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const analyzeFoodImage = async (
  base64Image: string,
  userProfile: UserProfile,
  mimeType: string = "image/jpeg"
): Promise<any> => {
  // Always initialize GoogleGenAI with a named parameter
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemPrompt = `
    You are Dr Foodie, an elite nutrition AI. 
    Analyze the food image and return precise nutritional data.
    
    User Goal: ${userProfile.goal} (${userProfile.weight}kg -> ${userProfile.targetWeight}kg)
    
    Categorize 'mealType' as one of: 'Breakfast', 'Lunch', 'Dinner', 'Snack'.
    In 'microAnalysis', provide 2 clinical sentences on how this meal affects their specific metabolic journey.
    
    Return a Health Score from 1-10.
  `;

  let lastError: any;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Use gemini-3-pro-preview for complex reasoning and clinical metabolic analysis
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Image } },
            { text: "Analyze this meal for Dr Foodie. Provide macros, meal type, and clinical advice." },
          ],
        },
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              foodName: { type: Type.STRING },
              calories: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              fat: { type: Type.NUMBER },
              healthScore: { type: Type.NUMBER },
              microAnalysis: { type: Type.STRING },
              mealType: { type: Type.STRING },
            },
            required: ["foodName", "calories", "protein", "carbs", "fat", "healthScore", "microAnalysis", "mealType"],
          },
        },
      });

      // Directly access .text property from response
      const text = response.text?.trim();
      if (!text) throw new Error("Empty AI response");
      return JSON.parse(text);
    } catch (error: any) {
      lastError = error;
      // Implement robust handling for API errors and unexpected responses
      if ((error?.status === 429 || error?.status === 503) && attempt < MAX_RETRIES - 1) {
        await sleep(INITIAL_RETRY_DELAY * Math.pow(2, attempt));
        continue;
      }
      break;
    }
  }
  throw lastError;
};
