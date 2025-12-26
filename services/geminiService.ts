
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
    // Attempt 3: Try to find an array if object parse failed
    const arrayMatch = cleanText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch (e3) {
        console.error("Array recovery failed:", e3);
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
    You are an elite clinical fitness coach AI. Your task is to generate a personalized workout routine.
    
    Context:
    - User Goal: ${userProfile.goal}
    - Location: ${location}
    - Focus Areas: ${muscleGroups.join(', ')}
    - User Stats: ${userProfile.weight}kg, ${userProfile.age} years old.
    
    Instructions:
    - Provide 4-6 exercises.
    - If location is "Home", focus on bodyweight or minimal equipment.
    - If location is "Gym", include machine and free weight exercises.
    - Each exercise MUST have a unique ID, clear instructions, and realistic sets/reps for the goal.
    - imageUrl should be a descriptive placeholder URL or null.
    - muscleGroups must be a subset of the enum values provided.
    - Response MUST be a JSON array of Exercise objects.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: `Coach, generate my ${location}-based routine focusing on ${muscleGroups.join(' and ')}. Output valid JSON array only.` }] }],
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "A unique slug for the exercise" },
              name: { type: Type.STRING },
              sets: { type: Type.NUMBER },
              reps: { type: Type.STRING },
              description: { type: Type.STRING },
              imageUrl: { type: Type.STRING },
              location: { type: Type.STRING, enum: Object.values(WorkoutLocation) },
              muscleGroups: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING, enum: Object.values(MuscleGroup) } 
              }
            },
            required: ["id", "name", "sets", "reps", "description", "location", "muscleGroups"]
          }
        }
      }
    });

    const text = response.text || "[]";
    const routine = extractJSON(text);
    
    // Safety mapping to ensure types are correct
    return routine.map((ex: any) => ({
      ...ex,
      id: ex.id || Math.random().toString(36).substr(2, 9),
      location: ex.location || location,
      imageUrl: ex.imageUrl || `https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200&h=200&fit=crop`
    }));
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
        contents: [
          {
            parts: [
              { text: additionalInfo || "Perform metabolic scan on this meal. Response: JSON only." },
              { inlineData: { mimeType, data: base64Image } }
            ],
          },
        ],
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

      const text = response.text || "";
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
