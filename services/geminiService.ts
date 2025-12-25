
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, WorkoutLocation, MuscleGroup, Exercise } from "../types";

const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY = 1000;

const EXERCISE_LIBRARY: Record<string, string> = {
  // Gym
  "Barbell bench press": "https://media.tenor.com/kpJH4zjuPF8AAAAM/supino.gif",
  "Incline dumbbell press": "https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Dumbbell-Press.gif",
  "Cable fly or pec deck": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTqHR4Rp067mLyhBdXRDNGhZYfpHPcrb9woew&s",
  "Lat pulldown or assisted pull-up": "https://media.tenor.com/PVR9ra9tAwcAAAAM/pulley-pegada-aberta.gif",
  "Seated cable row": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRD4zX-meoI7ZdS_TLLgCXaG7TsIhCgOgENsg&s",
  "Dumbbell row (each side)": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4O8w73oTa-EEXMUhqBihTwI4w_l5ViEnWRw&s",
  "Seated dumbbell overhead press": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSQmArbrJhpFq9Tc_Zq-8UC97wPjMsPOxOFfA&s",
  "Dumbbell lateral raises": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5Q2DuhQ9UFlgWyCYh_7QtvstQxkNlWO2J4g&s",
  "Face pulls (cable)": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTMUzR39Hnm_k7JKGaW3IulWc8WJNy-r_EFLw&s",
  "Barbell or dumbbell biceps curls": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTWmZslF4Ib1XesFnOhgs5zPOjKMtQiAM9y3g&s",
  "Triceps cable pushdown": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcShja2vkxN7Ccm-psz4mfx5mdEqXVRSomD8gw&s",
  "Dumbbell hammer curls": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT9SJnU1ZPYceH3af7X89jeI-8UAmjk4FIfSA&s",
  "Barbell back squat or leg press": "https://media.tenor.com/Re3T3B66V9UAAAAM/barbellsquats-gymexercisesmen.gif",
  "Romanian deadlift": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQAlctzv4hzx5d4DJ3c8vCBp4hV_wsWRNeHzg&s",
  "Leg extension + leg curl superset": "https://media.tenor.com/L-taJvA94kQAAAAM/leg-extension.gif",
  "Barbell hip thrust": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQE416GjWKssSs1W9ql8ItntyYp6R7Z6YlaBQ&s",
  "Walking lunges (with dumbbells)": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTYM4VYtzPsKKzqgXZbpAWEhPJ5xrdiSff19A&s",
  "Cable kickbacks": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR8a53tylmiLj7ZKXKv4tCeYypc-3kM48F7fg&s",
  "Hanging knee raises": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRywqJobho7c8L2B_r1KlhNwh4GAl6BVq11rg&s",
  "Cable crunches": "https://i.pinimg.com/originals/d8/48/4c/d8484c779529e7c469c75b4713a6c7a8.gif",
  "Plank (Gym version)": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_Y_AoAJNUYVzMxChgify3fzxdRxl4w-yyHQ&s",
  // Home
  "Push-ups": "https://c.tenor.com/EEJO0ylQ8tAAAAAC/tenor.gif",
  "Incline push-ups on table/bed": "https://media.tenor.com/e45GckrMBLEAAAAM/flex%C3%A3o-inclinada-no-banco.gif",
  "Wide push-ups": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRMOhVJnB-6QN3fBB7trIvEe-_hagieSJ2iMw&s",
  "Doorway or table rows": "https://gymvisual.com/img/p/1/5/0/8/9/15089.gif",
  "Superman": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSaHh3AsAmU4Ap7Y11UiNu7MDJx_5nXXltSfw&s",
  "Backpack bent-over row": "https://www.mitrecsports.com/assets/Travel-Workout-_-Gif-5.gif",
  "Pike push-ups": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSrWYJAy64YbMYiamw23cu5hv7DjQkFauQbaQ&s",
  "Wall lateral raises with water bottles": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQvkH4OXL5-KoE9A366F8UNByP8CpmwDl_UMg&s",
  "Arm circles": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ7FMV8Gpa6T3b7EkXvy8qg5wjoa4z-33rYRA&s",
  "Close-grip push-ups (for triceps)": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRMy-xoA8TPAz-ThT4EjDDtjkicFOWk0BwGrQ&s",
  "Chair dips": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQiODwgjJ_3NjiD075RSeNDc4FMBrcmV5hEKw&s",
  "Backpack curls": "https://www.mitrecsports.com/assets/Travel-Workout-_-Gif-6.gif",
  "Bodyweight squats": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRZkQmT16Wt_57gNMSsOrUAJLFJQgOpkQGLzQ&s",
  "Reverse lunges": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTcLNVxVTSDvZ17Inr4T-405NghN9HSTwzD0Q&s",
  "Glute bridge": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRH3LWcz6_u2u1Z-M5xsKcWWLhyxrajfOBOIw&s",
  "Single-leg glute bridge": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRIeysQXMDwfd7874CnqrXRsBtqoYqIGx9clw&s",
  "Step-ups on chair/stair": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRMmvOjyjlsSxk87OrMqiV9TqyS5no3C0dWeA&s",
  "Squat pulses": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTi7rM3bT2bW1ehzX2Kch-4ZfmQLeqfkgo56A&s",
  "Crunches": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSB5prIgl1NCbppKVzyZqiE4Dm4Kz8FvT5aQA&s",
  "Bicycle crunch": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQn92VKYeMZpA8w5xTP5DmpeRjbAZAQCQs_NA&s",
  "Forearm plank": "https://fitnessprogramer.com/wp-content/uploads/2021/04/Weighted-Front-Plank.gif"
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function extractJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        throw new Error("Found JSON block but it was malformed");
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

  const availableExercises = Object.keys(EXERCISE_LIBRARY);

  const systemPrompt = `
    You are an elite fitness coach AI. 
    Generate a personalized workout routine.
    Location: ${location}
    Focus Areas: ${muscleGroups.join(', ')}
    Goal: ${userProfile.goal}
    Weight: ${userProfile.weight}kg, Age: ${userProfile.age}

    IMPORTANT: Only use exercises from this clinical list:
    ${availableExercises.join(', ')}

    Requirements:
    - 4-6 exercises.
    - Specific to ${location}.
    - Format as JSON array of objects.
    - Include the exact name and the corresponding imageUrl from the metadata provided if you know it, otherwise leave empty.
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

    const parsed: any[] = extractJSON(response.text || "");
    return parsed.map(ex => ({
      ...ex,
      id: Math.random().toString(36).substr(2, 9),
      location,
      imageUrl: EXERCISE_LIBRARY[ex.name] || ""
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
    You are Dr Foodie, an elite medical-grade nutrition AI. 
    Analyze this meal for a user with goal: ${userProfile.goal}.
    
    If image quality is insufficient for clinical data, set "needsClarification": true and provide "clarificationQuestion".
    Otherwise, set to false and provide metabolic data.

    Required JSON structure:
    - foodName, calories (number), protein (number), carbs (number), fat (number), healthScore (1-10)
    - mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack'
    - microAnalysis: Single clinical sentence summarizing metabolic impact.
    - alternatives: Array of exactly 3 healthier clinical options.
  `;

  let lastError: any;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Image } },
            { text: additionalInfo || "Analyze this meal for Dr Foodie system. Output clinical JSON only." },
          ],
        },
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          maxOutputTokens: 1500,
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
      lastError = error;
      console.error(`Attempt ${attempt + 1} failed:`, error);
      if ((error?.status === 429 || error?.status === 500 || error?.status === 503) && attempt < MAX_RETRIES - 1) {
        await sleep(INITIAL_RETRY_DELAY * (attempt + 1));
        continue;
      }
      break;
    }
  }
  throw new Error(lastError?.message || "AI Metabolic Node over capacity.");
};
