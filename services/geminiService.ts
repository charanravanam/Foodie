
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile } from "../types";

export const analyzeFoodImage = async (
  base64Image: string,
  userProfile: UserProfile
): Promise<any> => {
  // Access API key from injected environment variable
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    throw new Error("Missing Gemini API Key. Ensure it is defined in Repo Secrets.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemPrompt = `
    You are Dr Foodie, an elite nutrition AI. 
    Analyze the food image and return precise nutritional data.
    
    User Stats:
    - Weight: ${userProfile.weight}kg, Goal: ${userProfile.goal} (${userProfile.targetWeight}kg)
    - Age: ${userProfile.age}, Gender: ${userProfile.gender}
    
    In 'microAnalysis', provide exactly 2 sentences on how this specific meal impacts their journey toward ${userProfile.targetWeight}kg. 
    Be direct and scientific.
    
    If the image is not food, return "Unrecognized" for foodName and 0 for macros.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: "Analyze this meal for Dr Foodie.",
          },
        ],
      },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            foodName: {
              type: Type.STRING,
              description: "Name of the meal.",
            },
            calories: {
              type: Type.NUMBER,
              description: "Total calories.",
            },
            protein: {
              type: Type.NUMBER,
              description: "Protein (g).",
            },
            carbs: {
              type: Type.NUMBER,
              description: "Carbs (g).",
            },
            fat: {
              type: Type.NUMBER,
              description: "Fat (g).",
            },
            healthScore: {
              type: Type.NUMBER,
              description: "Score 1-10.",
            },
            microAnalysis: {
              type: Type.STRING,
              description: "Advice tailored to the user's metrics.",
            },
          },
          required: ["foodName", "calories", "protein", "carbs", "fat", "healthScore", "microAnalysis"],
        },
      },
    });

    // Access the .text property directly as per guidelines
    const text = response.text;
    if (!text) throw new Error("AI returned empty content.");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};
