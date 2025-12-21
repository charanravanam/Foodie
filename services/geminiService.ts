
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile } from "../types";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1500;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const analyzeFoodImage = async (
  base64Image: string,
  userProfile: UserProfile,
  mimeType: string = "image/jpeg"
): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemPrompt = `
    You are Dr Foodie, an elite medical-grade nutrition AI. 
    Analyze the provided food image with extreme precision for a user with the following profile:
    Goal: ${userProfile.goal}
    Current Weight: ${userProfile.weight}kg
    Target Weight: ${userProfile.targetWeight}kg
    Age/Gender: ${userProfile.age}y / ${userProfile.gender}

    Requirements:
    1. Identify the food item and estimate portion size.
    2. Provide accurate Macros (Calories, Protein, Carbs, Fat).
    3. Categorize 'mealType': 'Breakfast', 'Lunch', 'Dinner', 'Snack'.
    4. Provide 'microAnalysis': 2-3 clinical sentences on how this specific meal affects the user's metabolic rate, glucose stability, and goal progress.
    5. Health Score: 1-10 based on nutritional density.

    Output MUST be strictly JSON.
  `;

  let lastError: any;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Using gemini-3-flash-preview for high speed, reliability, and better rate limits for multimodal tasks
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Image } },
            { text: "Dr Foodie, analyze this meal and provide the metabolic breakdown in JSON format." },
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

      const text = response.text?.trim();
      if (!text) throw new Error("Empty AI response");
      return JSON.parse(text);
    } catch (error: any) {
      lastError = error;
      console.warn(`Analysis attempt ${attempt + 1} failed:`, error.message);
      
      // Handle rate limits (429) or overloaded service (503) with backoff
      if ((error?.status === 429 || error?.status === 503 || error?.status === 500) && attempt < MAX_RETRIES - 1) {
        await sleep(INITIAL_RETRY_DELAY * Math.pow(2, attempt));
        continue;
      }
      break;
    }
  }
  throw new Error(lastError?.message || "Dr Foodie is currently over-capacity. Please try again in a moment.");
};
