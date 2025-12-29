import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || "" 
});

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

  let lastError;
  
  // Retry up to 3 times with exponential backoff for transient errors
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
        },
        contents: userPrompt,
      });

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
      lastError = error;
      console.error(`Error generating itinerary (attempt ${attempt}):`, error);
      
      // Check if it's a retryable error (503, 429, network issues)
      if (attempt < 3 && (
        error.message?.includes('503') || 
        error.message?.includes('overloaded') || 
        error.message?.includes('429') ||
        error.message?.includes('UNAVAILABLE')
      )) {
        // Wait with exponential backoff (2^attempt seconds)
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For non-retryable errors, throw immediately
      break;
    }
  }
  
  // If we get here, all retries failed
  if (lastError?.message?.includes('503') || lastError?.message?.includes('overloaded')) {
    throw new Error('The AI service is temporarily overloaded. Please try again in a few moments.');
  } else if (lastError?.message?.includes('429')) {
    throw new Error('Too many requests. Please wait a moment and try again.');
  } else {
    throw new Error(`Failed to generate itinerary: ${lastError?.message || lastError}`);
  }
}

export async function processConversation(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  context?: { preferences?: Partial<TravelPreferences> }
): Promise<{ response: string; extractedPreferences?: Partial<TravelPreferences>; shouldGenerateItinerary?: boolean }> {
  
  const currentPreferences = context?.preferences || {};
  
  const systemPrompt = `You are a friendly travel planning assistant. Your goal is to gather travel preferences in two steps.

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
- Convert date mentions to YYYY-MM-DD format when possible
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

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
      contents: `Conversation so far:\n${conversationHistory}\n\nRespond to the latest user message.`,
    });

    const rawJson = response.text;
    if (!rawJson) {
      throw new Error("Empty response from Gemini AI");
    }

    return JSON.parse(rawJson);
  } catch (error) {
    console.error("Error processing conversation:", error);
    // Fallback response
    return {
      response: "Lo siento, tuve un problema técnico. ¿Podrías repetir tu mensaje?",
      shouldGenerateItinerary: false
    };
  }
}

export async function optimizeItinerary(
  currentItinerary: TravelItinerary,
  userFeedback: string
): Promise<TravelItinerary> {
  const systemPrompt = `You are a travel planner optimizing an existing itinerary based on user feedback.

Modify the itinerary according to the user's requests while maintaining:
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

  const userPrompt = `Current itinerary: ${JSON.stringify(currentItinerary)}

User feedback: ${userFeedback}

Please modify the itinerary according to this feedback.`;

  // Create a dummy preferences object for normalization 
  const preferences = {
    startDate: currentItinerary.days[0]?.date || new Date().toISOString().split('T')[0],
    endDate: currentItinerary.days[currentItinerary.days.length - 1]?.date || new Date().toISOString().split('T')[0],
    destination: "Unknown",
    budget: currentItinerary.totalCost
  };

  let lastError;
  
  // Retry up to 3 times with exponential backoff for transient errors
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
        },
        contents: userPrompt,
      });

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
      lastError = error;
      console.error(`Error optimizing itinerary (attempt ${attempt}):`, error);
      
      // Check if it's a retryable error (503, 429, network issues)
      if (attempt < 3 && (
        error.message?.includes('503') || 
        error.message?.includes('overloaded') || 
        error.message?.includes('429') ||
        error.message?.includes('UNAVAILABLE')
      )) {
        // Wait with exponential backoff (2^attempt seconds)
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For non-retryable errors, throw immediately
      break;
    }
  }
  
  // If we get here, all retries failed
  if (lastError?.message?.includes('503') || lastError?.message?.includes('overloaded')) {
    throw new Error('The AI service is temporarily overloaded. Please try again in a few moments.');
  } else if (lastError?.message?.includes('429')) {
    throw new Error('Too many requests. Please wait a moment and try again.');
  } else {
    throw new Error(`Failed to optimize itinerary: ${lastError?.message || lastError}`);
  }
}
