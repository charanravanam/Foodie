
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile } from "../types";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Analyzes a food image using Gemini AI to provide nutritional information.
 * Categorizes the meal type based on common eating patterns and visual context.
 */
export const analyzeFoodImage = async (
  base64Image: string,
  userProfile: UserProfile,
  mimeType: string = "image/jpeg"
): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemPrompt = `
    You are Dr Foodie, an elite nutrition AI. 
    Analyze the food image and return precise nutritional data based on the portion sizes visible.
    
    User Stats:
    - Weight: ${userProfile.weight}kg, Goal: ${userProfile.goal} (${userProfile.targetWeight}kg)
    - Age: ${userProfile.age}, Gender: ${userProfile.gender}
    
    In 'microAnalysis', provide exactly 2 sentences on how this specific meal impacts their journey toward ${userProfile.targetWeight}kg. 
    Be direct, clinical, and scientific.
    
    Categorize 'mealType' as one of: 'Breakfast', 'Lunch', 'Dinner', 'Snack'.
    
    If the image does not contain food, return "Unrecognized" for foodName and 0 for all macros.
  `;

  let lastError: any;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image,
              },
            },
            {
              text: "Analyze this meal for Dr Foodie. Provide the macro breakdown, meal type, and clinical advice.",
            },
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
              mealType: { 
                type: Type.STRING, 
                description: "Must be Breakfast, Lunch, Dinner, or Snack." 
              },
            },
            required: ["foodName", "calories", "protein", "carbs", "fat", "healthScore", "microAnalysis", "mealType"],
          },
        },
      });

      const text = response.text?.trim();
      if (!text) throw new Error("AI returned empty content.");
      
      return JSON.parse(text);
    } catch (error: any) {
      lastError = error;
      const status = error?.status;
      const message = error?.message?.toLowerCase() || "";
      const isTransient = status === 429 || status === 503 || status === 504 || 
                          message.includes('overloaded') || message.includes('busy');
      
      if (isTransient && attempt < MAX_RETRIES - 1) {
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        await sleep(delay);
        continue;
      }
      break;
    }
  }

  throw lastError;
};
