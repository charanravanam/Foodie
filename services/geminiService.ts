
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile } from "../types";

export const analyzeFoodImage = async (
  base64Image: string,
  userProfile: UserProfile
): Promise<any> => {
  // Fix: Initializing GoogleGenAI instance using the process.env.API_KEY directly as per guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

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
    // Fix: Using ai.models.generateContent with a prompt and configuration in one call
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
            text: "Analyze this meal for me.",
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
              description: "Descriptive name of the food.",
            },
            calories: {
              type: Type.NUMBER,
              description: "Estimated total calories.",
            },
            protein: {
              type: Type.NUMBER,
              description: "Estimated protein in grams.",
            },
            carbs: {
              type: Type.NUMBER,
              description: "Estimated carbohydrates in grams.",
            },
            fat: {
              type: Type.NUMBER,
              description: "Estimated fat in grams.",
            },
            healthScore: {
              type: Type.NUMBER,
              description: "Health rating from 1 to 10.",
            },
            microAnalysis: {
              type: Type.STRING,
              description: "Personalized advice based on the user's specific body metrics and nutrition goals.",
            },
          },
          required: ["foodName", "calories", "protein", "carbs", "fat", "healthScore", "microAnalysis"],
        },
      },
    });

    // Fix: Correctly extracting generated text using the .text property as defined in the response object
    const text = response.text;
    if (!text) throw new Error("Received empty text from AI.");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Analysis Error Detail:", error);
    throw error;
  }
};
