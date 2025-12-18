import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserProfile } from "../types";

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    foodName: {
      type: Type.STRING,
      description: "Descriptive name of the identified food.",
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
      description: "Personalized advice based on the user's specific body metrics and goals.",
    },
  },
  required: ["foodName", "calories", "protein", "carbs", "fat", "healthScore", "microAnalysis"],
};

export const analyzeFoodImage = async (
  base64Image: string,
  userProfile: UserProfile
): Promise<any> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please ensure process.env.API_KEY is configured.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemPrompt = `
    You are Dr Foodie, an elite nutrition AI. 
    Analyze the food image provided and return nutritional data.
    
    USER PROFILE:
    - Gender: ${userProfile.gender}
    - Age: ${userProfile.age}
    - Weight: ${userProfile.weight}kg
    - Target: ${userProfile.targetWeight}kg
    - Goal: ${userProfile.goal}
    - Timeline: ${userProfile.durationWeeks} weeks
    
    In 'microAnalysis', provide 2-3 sentences of direct advice on how this specific meal helps or hinders their progress towards ${userProfile.targetWeight}kg. 
    Be encouraging but scientific.
    
    If the image contains no food, return "Not Food" for foodName and 0 for all numerical values.
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
            text: "Identify the food and provide nutritional breakdown in JSON format.",
          },
        ],
      },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("AI returned an empty response.");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};