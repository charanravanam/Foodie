import { GoogleGenAI, Type, Schema } from "@google/genai";
import { UserProfile } from "../types";

// Schema for the structured output we want from Gemini
const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    foodName: {
      type: Type.STRING,
      description: "A short, descriptive name of the identified food.",
    },
    calories: {
      type: Type.NUMBER,
      description: "Estimated total calories in the image.",
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
      description: "A score from 1 to 10 rating the healthiness of this meal.",
    },
    microAnalysis: {
      type: Type.STRING,
      description: "A personalized micro-analysis and advice paragraph based on the user's specific gender, weight goals, and timeframe.",
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
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemPrompt = `
    You are Dr Foodie, a world-class nutritionist AI. 
    Your task is to analyze food images and provide nutritional data.
    
    CRITICAL: You must tailor the 'microAnalysis' specifically to the user's profile:
    - Gender: ${userProfile.gender}
    - Age: ${userProfile.age}
    - Current Weight: ${userProfile.weight}kg
    - Target Weight: ${userProfile.targetWeight}kg
    - Goal: ${userProfile.goal}
    - Timeline: ${userProfile.durationWeeks} weeks
    
    Provide specific advice on how this meal fits into their plan to reach ${userProfile.targetWeight}kg in ${userProfile.durationWeeks} weeks.
    
    If the image is not food, return 0 for values and "Not Food" for foodName.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: "Analyze this meal.",
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
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};