
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, WorkoutLocation, MuscleGroup, Exercise } from "../types";

const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1500;

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
    2. Exercises must be appropriate for the location (${location}). If 'Home', focus on bodyweight or common home items. If 'Gym', use typical gym equipment.
    3. Each exercise must include: name, sets (number), reps (string like '8-10' or '12-15'), and a concise clinical description.
    4. Provide a 'muscleGroups' array for each exercise.
    5. 'imageUrl' should be left as empty string or a generic valid placeholder URL.
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
    4. Provide 'microAnalysis': One high-impact clinical sentence on the metabolic effect.
    5. Health Score: 1-10 based on nutritional density.
    6. Provide exactly 3 'alternatives': These must be healthier food choices within the same food category or meal type that would better serve the user's specific goal of ${userProfile.goal}.

    Output MUST be strictly JSON.
  `;

  let lastError: any;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
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
              alternatives: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Three healthy alternative food choices."
              }
            },
            required: ["foodName", "calories", "protein", "carbs", "fat", "healthScore", "microAnalysis", "mealType", "alternatives"],
          },
        },
      });

      const text = response.text?.trim();
      if (!text) throw new Error("Empty AI response");
      return JSON.parse(text);
    } catch (error: any) {
      lastError = error;
      console.warn(`Analysis attempt ${attempt + 1} failed:`, error.message);
      
      if ((error?.status === 429 || error?.status === 503 || error?.status === 500) && attempt < MAX_RETRIES - 1) {
        await sleep(INITIAL_RETRY_DELAY * Math.pow(2, attempt));
        continue;
      }
      break;
    }
  }
  throw new Error(lastError?.message || "Dr Foodie is currently over-capacity. Please try again in a moment.");
};
