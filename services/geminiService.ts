
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, WorkoutLocation, MuscleGroup, Exercise } from "../types";

const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY = 1000;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extracts JSON block from a string, handling potential markdown markers
 */
function extractJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        throw new Error("Malformed JSON in AI response");
      }
    }
    throw new Error("No valid JSON found in AI response");
  }
}

export const generateWorkoutRoutine = async (
  location: WorkoutLocation,
  muscleGroups: MuscleGroup[],
  userProfile: UserProfile
): Promise<Exercise[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemPrompt = `
    You are an elite fitness coach AI. 
    Generate a personalized workout routine.
    Location: ${location}
    Focus Areas: ${muscleGroups.join(', ')}
    Goal: ${userProfile.goal}
    Weight: ${userProfile.weight}kg, Age: ${userProfile.age}

    Requirements:
    - 4-6 exercises.
    - Format as JSON array of objects.
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

    return extractJSON(response.text || "[]");
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
    You are Dr Foodie, an elite clinical nutrition AI. 
    Analyze this meal for a user with goal: ${userProfile.goal}.
    
    If you cannot clearly see the food, set "needsClarification": true.
    Otherwise, provide strict clinical metabolic data.

    Required JSON:
    - foodName, calories (number), protein (number), carbs (number), fat (number), healthScore (1-10)
    - mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
    - microAnalysis: One metabolic clinical sentence.
    - alternatives: Array of exactly 3 healthier options.
  `;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Image } },
            { text: additionalInfo || "Analyze metabolic data for this meal. Output clinical JSON only." },
          ],
        },
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
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
      return extractJSON(text);
    } catch (error: any) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      if (attempt < MAX_RETRIES - 1) {
        await sleep(INITIAL_RETRY_DELAY * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
};
