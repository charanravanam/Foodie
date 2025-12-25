
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, WorkoutLocation, MuscleGroup, Exercise } from "../types";

const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY = 1000;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const generateWorkoutRoutine = async (
  location: WorkoutLocation,
  muscleGroups: MuscleGroup[],
  userProfile: UserProfile
): Promise<Exercise[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemPrompt = `
    You are an elite fitness coach AI. 
    Generate a personalized workout routine for a user with the following profile:
    Location: ${location}
    Focus Areas: ${muscleGroups.join(', ')}
    Goal: ${userProfile.goal}
    Current Weight: ${userProfile.weight}kg
    Age: ${userProfile.age}

    Requirements:
    1. Provide 4-6 exercises.
    2. Exercises must be appropriate for the location (${location}).
    3. Include: name, sets (number), reps (string), and a concise description.
    4. Provide a 'muscleGroups' array for each exercise.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Coach, generate my routine based on the system instructions.",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              sets: { type: Type.NUMBER },
              reps: { type: Type.STRING },
              description: { type: Type.STRING },
              imageUrl: { type: Type.STRING },
              location: { type: Type.STRING },
              muscleGroups: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["name", "sets", "reps", "description"]
          }
        }
      }
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Empty AI response");
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Routine Generation Error:", error);
    throw error;
  }
};

export const analyzeFoodImage = async (
  base64Image: string,
  userProfile: UserProfile,
  additionalInfo?: string,
  mimeType: string = "image/jpeg"
): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemPrompt = `
    You are Dr Foodie, an elite medical-grade nutrition AI. 
    Analyze the food image for user goal: ${userProfile.goal}.
    
    CRITICAL:
    If blurry or ambiguous, set "needsClarification" to true + provide "clarificationQuestion".
    Otherwise, set to false and provide metabolic data.

    JSON Output:
    1. foodName, calories, protein, carbs, fat, healthScore (1-10).
    2. mealType: 'Breakfast', 'Lunch', 'Dinner', 'Snack'.
    3. microAnalysis: One clinical sentence.
    4. alternatives: Exactly 3 healthier options.
  `;

  let lastError: any;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Image } },
            { text: additionalInfo || "Dr Foodie, analyze this meal fast." },
          ],
        },
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          // Latency optimization: disable thinking tokens for faster visual identification
          thinkingConfig: { thinkingBudget: 0 },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              needsClarification: { type: Type.BOOLEAN },
              clarificationQuestion: { type: Type.STRING },
              foodName: { type: Type.STRING },
              calories: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              fat: { type: Type.NUMBER },
              healthScore: { type: Type.NUMBER },
              microAnalysis: { type: Type.STRING },
              mealType: { type: Type.STRING },
              alternatives: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["needsClarification"],
          },
        },
      });

      const text = response.text?.trim();
      if (!text) throw new Error("Empty AI response");
      return JSON.parse(text);
    } catch (error: any) {
      lastError = error;
      // Retry on transient server errors or rate limiting
      if ((error?.status === 429 || error?.status === 500) && attempt < MAX_RETRIES - 1) {
        await sleep(INITIAL_RETRY_DELAY);
        continue;
      }
      break;
    }
  }
  throw new Error(lastError?.message || "AI Metabolic Node over capacity.");
};
