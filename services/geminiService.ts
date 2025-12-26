
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, WorkoutLocation, MuscleGroup, Exercise } from "../types";

const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY = 1000;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Robust JSON extraction from model response
 */
function extractJSON(text: string): any {
  if (!text) throw new Error("Empty response from metabolic node.");
  
  const cleanText = text.trim();
  try {
    // Attempt 1: Standard parse
    return JSON.parse(cleanText);
  } catch (e) {
    // Attempt 2: Extract from markdown blocks or generic brackets
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {
        console.error("JSON recovery failed:", e2);
      }
    }
    throw new Error("Metabolic data corruption: Invalid JSON structure.");
  }
}

export const generateWorkoutRoutine = async (
  location: WorkoutLocation,
  muscleGroups: MuscleGroup[],
  userProfile: UserProfile
): Promise<Exercise[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemPrompt = `
    You are an elite fitness coach. Create a workout routine.
    Location: ${location}
    Focus: ${muscleGroups.join(', ')}
    Goal: ${userProfile.goal}
    Stats: ${userProfile.weight}kg, ${userProfile.age}y.
    Return a JSON array of exercises.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts: [{ text: "Coach, provide the exercise list now." }] },
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
              muscleGroups: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["name", "sets", "reps", "description", "muscleGroups"]
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
    You are Dr Foodie, a clinical nutrition AI. 
    Analyze the meal image for a user with goal: ${userProfile.goal}.
    
    INSTRUCTIONS:
    - If food is not identifiable, set "needsClarification": true.
    - Otherwise, provide: foodName, calories (int), protein (int), carbs (int), fat (int).
    - Provide "healthScore" (1-10).
    - "microAnalysis": one clinical sentence on metabolic impact.
    - "alternatives": exactly 3 healthier options.
    - Response MUST be valid JSON.
  `;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { text: additionalInfo || "Perform metabolic scan on this meal. Response: JSON only." },
            { inlineData: { mimeType, data: base64Image } }
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

      const text = response.text;
      return extractJSON(text);
    } catch (error: any) {
      console.warn(`Metabolic node attempt ${attempt + 1} fail:`, error);
      if (attempt < MAX_RETRIES - 1) {
        await sleep(INITIAL_RETRY_DELAY * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
};
