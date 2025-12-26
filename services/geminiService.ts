
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
  
  // Remove potential markdown wrappers
  let cleanText = text.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  cleanText = cleanText.trim();

  try {
    // Attempt 1: Direct parse
    return JSON.parse(cleanText);
  } catch (e) {
    // Attempt 2: Regex extraction for objects
    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {}
    }
    // Attempt 3: Regex extraction for arrays
    const arrayMatch = cleanText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch (e3) {}
    }
    throw new Error("Metabolic data corruption: Invalid JSON structure.");
  }
}

export const generateWorkoutRoutine = async (
  location: WorkoutLocation,
  muscleGroups: MuscleGroup[],
  userProfile: UserProfile
): Promise<Exercise[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Metabolic API Key missing.");

  const ai = new GoogleGenAI({ apiKey });

  const systemPrompt = `
    You are Dr Foodie's Clinical Fitness Module. Generate a personalized workout routine.
    
    USER CONTEXT:
    - Goal: ${userProfile.goal}
    - Location: ${location}
    - Focus Areas: ${muscleGroups.join(', ')}
    - Body Weight: ${userProfile.weight}kg
    
    OUTPUT REQUIREMENTS:
    - Return a JSON array of 4-6 exercises.
    - Each object must contain: name, sets (int), reps (string), description (string), and muscleGroups (array).
    - Use Home-based bodyweight exercises if location is Home.
    - Use Gym equipment if location is Gym.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a ${location} workout for ${muscleGroups.join(' and ')}. Output valid JSON array only.`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              sets: { type: Type.NUMBER },
              reps: { type: Type.STRING },
              description: { type: Type.STRING },
              muscleGroups: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["name", "sets", "reps", "description"]
          }
        }
      }
    });

    const text = response.text || "[]";
    const routine = extractJSON(text);
    
    if (!Array.isArray(routine)) return [];

    return routine.map((ex: any, idx: number) => ({
      id: `ex-${Date.now()}-${idx}`,
      name: ex.name || "Compound Movement",
      sets: Number(ex.sets) || 3,
      reps: String(ex.reps) || "10-12",
      description: ex.description || "Execute with clinical precision and controlled tempo.",
      location: location,
      imageUrl: `https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=300&h=300&fit=crop`,
      muscleGroups: Array.isArray(ex.muscleGroups) ? ex.muscleGroups : muscleGroups
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
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("Metabolic API Key missing.");

  const ai = new GoogleGenAI({ apiKey });

  const systemPrompt = `
    You are Dr Foodie, a clinical nutrition AI. 
    Analyze the meal image for a user with goal: ${userProfile.goal}.
    
    INSTRUCTIONS:
    - If food is not identifiable, set "needsClarification": true.
    - Provide nutrients as integers.
    - Provide "microAnalysis" as one clinical sentence.
    - Provide exactly 3 healthier "alternatives".
  `;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { text: additionalInfo || "Perform metabolic scan. Response: JSON only." },
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

      return extractJSON(response.text || "{}");
    } catch (error: any) {
      console.warn(`Food analysis attempt ${attempt + 1} fail:`, error);
      if (attempt < MAX_RETRIES - 1) {
        await sleep(INITIAL_RETRY_DELAY * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
};
