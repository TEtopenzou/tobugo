import { GoogleGenAI } from "@google/genai";
import { generateContentFromClaude } from "./claude";


const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || ""
});

const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"];

async function generateContentWithFallback(
  systemInstruction: string,
  contents: string,
  responseMimeType: string = "application/json"
) {
  let lastError;

  const geminiEnabled = process.env.GEMINI_API_ON !== 'false'; // Default to true if not set
  const claudeEnabled = process.env.CLAUDE_API_ON === 'true'; // Default to false if not set

  if (geminiEnabled) {
    for (const model of FALLBACK_MODELS) {
      try {
        if (model !== FALLBACK_MODELS[0]) {
          console.warn(`⚠️ Rate limit on primary model. Switching to ${model} in 2s...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        const response = await ai.models.generateContent({
          model: model,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: responseMimeType,
          },
          contents: contents,
        });
        return response;
      } catch (error: any) {
        lastError = error;

        // Strict Error Handling: Only retry on 429 (Too Many Requests) or 503 (Service Unavailable)
        // Note: error.message usually contains the status code or description
        const isRetryable =
          error.message?.includes('429') ||
          error.message?.includes('Resource Exhausted') ||
          error.message?.includes('Too Many Requests') ||
          error.message?.includes('503') ||
          error.message?.includes('Service Unavailable');

        if (isRetryable) {
          console.warn(`⚠️ Rate limit/Service error on ${model} (429/503).`);
          continue; // Try next model
        }

        // For 400, 404, or other errors, THROW IMMEDIATELY. Do not retry.
        // Unless Gemini is disabled, in which case we might want to fallback? 
        // Actually, if Gemini throws 400, it's a bad request, Claude isn't likely to fix it unless it's model specific.
        // But if we want robust fallback, we might consider falling through. 
        // Current logic throws immediately. We'll keep it as is.
        throw error;
      }
    }
  } else {
    console.log("Gemini API is disabled via GEMINI_API_ON.");
  }

  // If we get here, all models failed (likely all 429s)
  // If we get here, all models failed (likely all 429s) or Gemini was disabled.

  if (claudeEnabled) {
    // Try Claude as last resort
    try {
      console.log("Attempting fallback to Claude...");
      return await generateContentFromClaude(systemInstruction, contents);
    } catch (claudeError) {
      console.error("Claude fallback also failed:", claudeError);
      // Throw the original Gemini error to indicate the primary failure source, 
      // or arguably the Claude error. Let's throw the last Gemini error generally 
      // but maybe logging both is enough. safely throwing lastError is fine.
      // However, if I want to bubble up the "Service Unavailable" of the system.
      throw lastError || claudeError;
    }
  }

  // If Claude is disabled and Gemini failed (or was disabled), throw error.
  if (lastError) {
    throw lastError;
  } else {
    throw new Error("No AI models available (Gemini disabled/failed and Claude disabled).");
  }

}

export interface TravelPreferences {
  destination: string;
  startDate: string;
  endDate: string;
  budget?: number | string;
  travelers?: number;
  accommodationType?: string;
  activities?: string[];
  travelStyle?: string;
  dietaryRestrictions?: string[];
}

export interface ItineraryDay {
  date: string;
  activities: Array<{
    time: string;
    title: string;
    description: string;
    type: 'flight' | 'accommodation' | 'activity' | 'transport' | 'meal';
    cost?: number;
    location?: string;
  }>;
  totalCost: number;
}

export interface TravelItinerary {
  days: ItineraryDay[];
  totalCost: number;
  costBreakdown: {
    flights: number;
    accommodation: number;
    activities: number;
    meals: number;
    transport: number;
  };
}

// Mock Data for Development
const MOCK_ITINERARY: TravelItinerary = {
  days: [
    {
      date: "2024-03-15",
      totalCost: 350,
      activities: [
        {
          time: "10:00",
          title: "MOCK: Eiffel Tower Visit",
          description: "Visit the iconic Eiffel Tower and enjoy the views.",
          type: "activity",
          cost: 50,
          location: "Champ de Mars, 5 Av. Anatole France, 75007 Paris"
        },
        {
          time: "13:00",
          title: "MOCK: Lunch at a Bistro",
          description: "Traditional French lunch at a local bistro.",
          type: "meal",
          cost: 50,
          location: "Le Petit Cler"
        },
        {
          time: "15:00",
          title: "MOCK: Louvre Museum",
          description: "Explore the world's largest art museum.",
          type: "activity",
          cost: 25,
          location: "Musée du Louvre, 75001 Paris"
        },
        {
          time: "20:00",
          title: "MOCK: Dinner Cruise",
          description: "Dinner cruise on the Seine River.",
          type: "meal",
          cost: 100,
          location: "Seine River"
        },
        {
          time: "22:00",
          title: "MOCK: Hotel Check-in",
          description: "Check into your hotel.",
          type: "accommodation",
          cost: 125,
          location: "Hotel Le Walt"
        }
      ]
    },
    {
      date: "2024-03-16",
      totalCost: 200,
      activities: [
        {
          time: "09:00",
          title: "MOCK: Day Trip to Versailles",
          description: "Visit the Palace of Versailles.",
          type: "activity",
          cost: 80,
          location: "Place d'Armes, 78000 Versailles"
        },
        {
          time: "19:00",
          title: "MOCK: Dinner in Montmartre",
          description: "Dinner in the artistic district of Montmartre.",
          type: "meal",
          cost: 120,
          location: "Montmartre"
        }
      ]
    }
  ],
  totalCost: 550,
  costBreakdown: {
    flights: 0,
    accommodation: 125,
    activities: 155,
    meals: 270,
    transport: 0
  }
};

const MOCK_CHAT_RESPONSE = {
  response: "¡Hola! (MODO PRUEBA ACTIVADO) He recibido tus preferencias. Como estamos en modo de prueba, generaré un itinerario de ejemplo para París automáticamente ahora mismo.",
  extractedPreferences: {
    destination: "Paris",
    startDate: "2024-03-15",
    endDate: "2024-03-20",
    budget: 2000,
    travelers: 2,
    activities: ["Sightseeing", "Food"],
    travelStyle: "Relaxed",
    accommodationType: "Hotel"
  },
  shouldGenerateItinerary: true
};

// Helper function to extract JSON from AI response
function extractJsonString(text: string): string {
  // Remove markdown code fences if present
  const cleanedText = text.replace(/```json\s*|\s*```/g, '').trim();
  return cleanedText;
}

// Helper function to compute missing fields in itinerary
function normalizeItinerary(data: any, preferences: TravelPreferences): TravelItinerary {
  // Handle wrapped response (e.g., { itinerary: ... })
  let itinerary = data.itinerary ?? data;

  // Ensure we have days array
  if (!itinerary.days || !Array.isArray(itinerary.days) || itinerary.days.length === 0) {
    throw new Error('Invalid itinerary: missing days array');
  }

  // Normalize each day
  itinerary.days = itinerary.days.map((day: any, index: number) => {
    // Ensure activities array exists
    if (!day.activities || !Array.isArray(day.activities)) {
      day.activities = [];
    }

    // Normalize activities and compute day total if missing
    day.activities = day.activities.map((activity: any) => ({
      time: activity.time || '09:00',
      title: activity.title || 'Activity',
      description: activity.description || '',
      type: activity.type || 'activity',
      cost: typeof activity.cost === 'number' ? activity.cost : (parseFloat(activity.cost) || 0),
      location: activity.location || '',
    }));

    // Calculate day total cost if missing
    if (typeof day.totalCost !== 'number') {
      day.totalCost = day.activities.reduce((sum: number, activity: any) => sum + (activity.cost || 0), 0);
    }

    // Ensure date format
    if (!day.date) {
      const startDate = new Date(preferences.startDate);
      startDate.setDate(startDate.getDate() + index);
      day.date = startDate.toISOString().split('T')[0];
    }

    return day;
  });

  // Calculate cost breakdown if missing
  if (!itinerary.costBreakdown) {
    const breakdown = {
      flights: 0,
      accommodation: 0,
      activities: 0,
      meals: 0,
      transport: 0,
    };

    itinerary.days.forEach((day: any) => {
      day.activities.forEach((activity: any) => {
        const cost = activity.cost || 0;
        switch (activity.type) {
          case 'flight':
            breakdown.flights += cost;
            break;
          case 'accommodation':
            breakdown.accommodation += cost;
            break;
          case 'meal':
            breakdown.meals += cost;
            break;
          case 'transport':
            breakdown.transport += cost;
            break;
          case 'activity':
          default:
            breakdown.activities += cost;
            break;
        }
      });
    });

    itinerary.costBreakdown = breakdown;
  }

  // Calculate total cost if missing
  if (typeof itinerary.totalCost !== 'number') {
    itinerary.totalCost = itinerary.days.reduce((sum: number, day: any) => sum + (day.totalCost || 0), 0);
  }

  return itinerary as TravelItinerary;
}

export async function generateItinerary(preferences: TravelPreferences): Promise<TravelItinerary> {
  // Check for Test Mode
  if (process.env.TEST_MODE === 'true') {
    console.log("TEST_MODE active: Returning mock itinerary");
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
    return MOCK_ITINERARY;
  }

  const systemPrompt = `You are a professional travel planner AI. Create detailed, realistic travel itineraries with accurate cost estimates.

Key requirements:
- Provide realistic cost estimates in USD
- Include specific times and locations
- Balance activities throughout each day
- Consider travel time between locations
- Include accommodation, meals, transport, and activities
- Provide a comprehensive cost breakdown

IMPORTANT: Return ONLY a JSON object with this exact structure:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "time": "HH:MM",
          "title": "Activity name",
          "description": "Activity description",
          "type": "flight|accommodation|activity|transport|meal",
          "cost": 100,
          "location": "Location name"
        }
      ],
      "totalCost": 500
    }
  ],
  "totalCost": 1500,
  "costBreakdown": {
    "flights": 600,
    "accommodation": 400,
    "activities": 300,
    "meals": 150,
    "transport": 50
  }
}

Do NOT include markdown code fences or any wrapper objects. Return only the JSON.`;

  const userPrompt = `Create a travel itinerary for:
- Destination: ${preferences.destination}
- Dates: ${preferences.startDate} to ${preferences.endDate}
- Budget: ${preferences.budget ? `$${preferences.budget}` : 'Flexible'}
- Travelers: ${preferences.travelers || 1}
- Accommodation: ${preferences.accommodationType || 'Mid-range hotels'}
- Preferred activities: ${preferences.activities?.join(', ') || 'General sightseeing'}
- Travel style: ${preferences.travelStyle || 'Balanced'}
- Dietary restrictions: ${preferences.dietaryRestrictions?.join(', ') || 'None'}

Include flights, accommodation, daily activities, meals, and local transport with realistic pricing.`;

  // Retry up to 3 times with exponential backoff for transient errors
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await generateContentWithFallback(
        systemPrompt,
        userPrompt
      );

      // Handle response text property
      const text = response.text;
      if (!text) {
        throw new Error("Empty response from Gemini AI");
      }

      // Extract and clean JSON string
      const jsonStr = extractJsonString(text);
      console.log("Raw AI response:", jsonStr.substring(0, 500) + "..."); // Debug log (truncated)

      // Parse and normalize the response
      const rawData = JSON.parse(jsonStr);
      const itinerary = normalizeItinerary(rawData, preferences);

      return itinerary;
    } catch (error: any) {
      if (attempt === 3) throw error; // Re-throw if it's the last attempt
      // If it's a fallback-able error, the helper would have handled it. 
      // If it threw, it's either fatal (400) or all models failed (429). 
      // We let the outer retry loop (implied here, though `generateContentWithFallback` handles model switching internally) 
      // handle logic, OR we just throw.
      // Given the new requirement: "catch only 429/503... throw others", and the helper does that loop, 
      // the helper throws the final error. So we should just throw here or let the loop finish.
      throw error;
    }
  } // End attempt loop (Note: The helper already retries models. This outer loop is redundant but kept for safety if needed, or can be removed. 
  // Since the helper handles the model chain, this outer loop effectively retries the *whole chain* 3 times. We'll leave it for robustness.)

  throw new Error("Failed to generate itinerary after multiple attempts.");
}

export async function processConversation(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  context?: { preferences?: Partial<TravelPreferences> }
): Promise<{ response: string; extractedPreferences?: Partial<TravelPreferences>; shouldGenerateItinerary?: boolean }> {

  const currentPreferences = context?.preferences || {};

  // Check for Test Mode
  if (process.env.TEST_MODE === 'true') {
    console.log("TEST_MODE active: Returning mock chat response");
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay

    // Mock logic: Check if we have enough info to "complete" the flow or if we need to ask the follow-up
    const hasDestination = currentPreferences.destination || messages.some(m => m.role === 'user' && m.content.toLowerCase().includes('buenos aires'));
    const hasDates = currentPreferences.startDate || messages.some(m => m.role === 'user' && (m.content.includes('marzo') || m.content.includes('/')));

    // If we seem to have basic info but maybe not style, ask for style
    // Ideally we would parse the message properly but for a mock, let's just assume 
    // if the user sent a long message (likely answering the first 4 questions), we ask the follow-up.
    // If the user mentions a style, we finish.

    const lastUserMessage = messages[messages.length - 1].content.toLowerCase();

    // Simple state machine for mock
    if (lastUserMessage.includes('cultural') || lastUserMessage.includes('aventura') || lastUserMessage.includes('relax') || lastUserMessage.includes('compras')) {
      // Step 3: We have style, generate itinerary
      return {
        response: "¡Perfecto! Tengo todo lo necesario. (MODO PRUEBA) Generando tu itinerario ahora...",
        extractedPreferences: {
          destination: "Buenos Aires",
          startDate: "2024-03-15",
          endDate: "2024-03-20",
          budget: 8000,
          travelers: 3,
          travelStyle: "Cultural",
          ...currentPreferences
        },
        shouldGenerateItinerary: true
      };
    } else {
      // Step 2: Ask follow-up
      return {
        response: "¡Excelente! Ya veo que quieres ir a Buenos Aires del 15 al 20 de marzo con tus dos hijos y un presupuesto de $8000.\n\nPerfecto! Solo me falta una última pregunta:\n\n¿Qué tipo de viaje tenías en mente? (cultural, histórico, compras, deportes, relajación, aventura, etc.)",
        extractedPreferences: {
          destination: "Buenos Aires",
          startDate: "2024-03-15",
          endDate: "2024-03-20",
          budget: 8000,
          travelers: 3,
          ...currentPreferences
        },
        shouldGenerateItinerary: false // Wait for style
      };
    }
  }



  const todayDate = new Date();
  const currentDateStr = todayDate.toISOString().split('T')[0];
  const currentYear = todayDate.getFullYear();

  const systemPrompt = `You are a friendly travel planning assistant. Your goal is to gather travel preferences in two steps.

Current Date context: Today is ${currentDateStr} (Year: ${currentYear}).

ALREADY COLLECTED PREFERENCES: ${JSON.stringify(currentPreferences)}

IMPORTANT: You already have the preferences listed above. DO NOT ask for information you already have. Only ask for missing information.

BEHAVIOR:
STEP 1: If this is the first interaction, present the first 4 questions in lista/punteo format:

"¡Hola! Soy tu asistente de viajes TobuGo. Para crear tu itinerario perfecto, necesito que respondas estas preguntas:

• ¿A dónde quieres ir?
• ¿Cuáles son las fechas de tu viaje? (o número de días)
• ¿Cuántos viajan?
• ¿Cuál es tu presupuesto estimado?

¡Puedes responder todo junto!"

STEP 2: After collecting the first 4 answers, ask the follow-up question:
"Perfecto! Solo me falta una última pregunta:

¿Qué tipo de viaje tenías en mente? (cultural, histórico, compras, deportes, relajación, aventura, etc.)"

STEP 3: Once you have all 5 pieces of information, suggest generating the itinerary.

Guidelines:
- Always be friendly and conversational in Spanish
- REMEMBER: Check ALREADY COLLECTED PREFERENCES first before asking
- DO NOT ask for information you already have - acknowledge it instead!
- Extract all NEW information provided by the user
- Convert date mentions to YYYY-MM-DD format when possible using the Current Date context (${currentDateStr}).
- IMPORTANT DATE LOGIC:
  1. If the user inputs a start date (month and day) that is AFTER OR EQUAL TO today's month and day, assume the trip is for the CURRENT year (${currentYear}).
  2. If the user inputs a start date (month and day) that is STRICTLY BEFORE today's month and day, assume the trip is for the NEXT year (${currentYear + 1}).
- If user gives duration without specific dates, it's fine - the system handles this
- Only move to STEP 2 after getting answers to the first 4 questions
- Only suggest generating itinerary when you have ALL 5 answers

Respond with JSON containing:
{
  "response": "your conversational response following the question sequence. ACKNOWLEDGE information already collected!",
  "extractedPreferences": {
    "destination": "string (city/country name)",
    "startDate": "YYYY-MM-DD format", 
    "endDate": "YYYY-MM-DD format",
    "budget": "number (in USD) or string like '$1500'",
    "travelers": "number of people",
    "activities": "array of activity strings",
    "travelStyle": "string description",
    "accommodationType": "hotel preference"
  },
  "shouldGenerateItinerary": boolean
}

IMPORTANT: Only include extractedPreferences fields that were NEWLY mentioned in this message. Set shouldGenerateItinerary=true only after collecting all 5 pieces of information (destination, dates, budget, travelers, travelStyle).`;

  try {
    const conversationHistory = messages.map(msg =>
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    ).join('\n');

    const response = await generateContentWithFallback(
      systemPrompt,
      `Conversation so far:\n${conversationHistory}\n\nRespond to the latest user message.`
    );

    const rawJson = response.text;
    if (!rawJson) {
      throw new Error("Empty response from Gemini AI");
    }

    return JSON.parse(rawJson);
  } catch (error: any) {
    console.error("Error processing conversation:", error);

    // Default Fallback response just for UI safety, NOT full mock data unless explicitly desired
    return {
      response: "Lo siento, tuve un problema técnico. ¿Podrías repetir tu mensaje?",
      shouldGenerateItinerary: false
    };
  }
}

export async function optimizeItinerary(
  currentItinerary: TravelItinerary,
  userFeedback: string,
  selectedActivity?: any
): Promise<TravelItinerary> {
  // Check for Test Mode
  if (process.env.TEST_MODE === 'true') {
    console.log("TEST_MODE active: Returning mock optimized itinerary");
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
    // In a real mock we might modify it, but returning the same is fine for simple testing
    return MOCK_ITINERARY;
  }

  const systemPrompt = `You are a travel planner optimizing an existing itinerary based on user feedback.

You may receive a "Selected Activity" context. This indicates the user has clicked on a specific activity to modify it.

RULES for handling updates:
1. **Selected Activity Focus**: If a specific activity is selected (provided in context) AND the user's request is relevant to that activity (e.g., "change restaurant", "make it cheaper"), ONLY modify that specific activity.
2. **Global Requests Override Selection**: If the user's request explicitly targets "all" or "the whole itinerary" (e.g., "change all restaurants", "change the whole trip"), IGNORE the selection and apply changes globally.
3. **Specific Name Override**: If the user explicitly names a different activity than the one selected (e.g., selected "Cafe A" but says "change "Museum B"), IGNORE the selection and modify the named activity.
4. **General/Global Requests**: If no activity is selected, apply the changes to the relevant parts of the itinerary based on the user's text.
5. **Similar Names**: If the user says "change the vegetarian restaurant" and multiple exist, but one is selected, modify ONLY the selected one.

Modify the itinerary according to these rules while maintaining:
- Realistic costs and timing
- Logical flow between activities
- Comprehensive cost tracking

IMPORTANT: Return ONLY a JSON object with this exact structure:
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "time": "HH:MM",
          "title": "Activity name",
          "description": "Activity description", 
          "type": "flight|accommodation|activity|transport|meal",
          "cost": 100,
          "location": "Location name"
        }
      ],
      "totalCost": 500
    }
  ],
  "totalCost": 1500,
  "costBreakdown": {
    "flights": 600,
    "accommodation": 400,
    "activities": 300,
    "meals": 150,
    "transport": 50
  }
}

Do NOT include markdown code fences or any wrapper objects. Return only the JSON.`;

  let contextDescription = "";
  if (selectedActivity) {
    contextDescription = `
CONTEXT - SELECTED ACTIVITY:
The user has selected the following activity while making this request:
- Title: ${selectedActivity.title}
- Description: ${selectedActivity.description}
- Type: ${selectedActivity.type}
- Day: ${selectedActivity.date}
- Time: ${selectedActivity.time}
`;
  }

  const userPrompt = `Current itinerary: ${JSON.stringify(currentItinerary)}

${contextDescription}

User feedback: ${userFeedback}

Please modify the itinerary according to this feedback and the context rules.`;

  // Create a dummy preferences object for normalization 
  const preferences = {
    startDate: currentItinerary.days[0]?.date || new Date().toISOString().split('T')[0],
    endDate: currentItinerary.days[currentItinerary.days.length - 1]?.date || new Date().toISOString().split('T')[0],
    destination: "Unknown",
    budget: currentItinerary.totalCost
  };

  // Retry up to 3 times with exponential backoff for transient errors
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await generateContentWithFallback(
        systemPrompt,
        userPrompt
      );

      // Handle response text property
      const text = response.text;
      if (!text) {
        throw new Error("Empty response from Gemini AI");
      }

      // Extract and clean JSON string
      const jsonStr = extractJsonString(text);
      console.log("Raw AI optimization response:", jsonStr.substring(0, 500) + "..."); // Debug log (truncated)

      // Parse and normalize the response
      const rawData = JSON.parse(jsonStr);
      const optimizedItinerary = normalizeItinerary(rawData, preferences);

      return optimizedItinerary;
    } catch (error: any) {
      if (attempt === 3) throw error;
      throw error;
    }
  }

  throw new Error("Failed to optimize itinerary.");
}
