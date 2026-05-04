import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface EventInputs {
  eventType: string;
  purpose: string;
  date: string;
  duration: string;
  budget: string;
  guests: string;
  location: string;
  audience: string;
  theme: string;
}

export interface EventPlan {
  overview: string;
  timeline: string[];
  budget: {
    venue: string;
    food_catering: string;
    decoration: string;
    entertainment: string;
    miscellaneous: string;
    hidden_costs: string;
    total_estimated: string;
    per_person_cost: string;
  };
  budget_split_percent: {
    venue: string;
    food: string;
    decoration: string;
    entertainment: string;
    misc: string;
  };
  food: {
    service_type: string;
    catering_name: string;
    veg_nonveg_ratio: string;
    menu: {
      starters: string[];
      main_course: string[];
      desserts: string[];
      drinks: string[];
    };
    food_design_ideas: string;
    quantity_planning: string;
    special_needs: {
      kids: string;
      dietary: string;
    };
  };
  decoration: {
    theme_style: string;
    color_palette: string[];
    lighting_setup: string;
    stage_design: string;
    seating_arrangement: string;
    welcome_area: string;
    photo_booth: string;
    venue_design_inspiration: string;
    hotel_room_decor: string;
    general_items: string[];
  };
  checklist: string[];
  vendors: Array<{
    type: string;
    suggestion: string;
    price_range: string;
    tip: string;
  }>;
  tips: string[];
  image_queries: {
    venue: string;
    food: string;
    decor: string;
    hotel: string;
  };
  recommended_locations: Array<{
    name: string;
    why: string;
    atmosphere: string;
    capacity: string;
    amenities: string[];
    estimated_cost: string;
    venue_type: string;
    rating: number;
    ideal_for: string;
    lat: number;
    lng: number;
    map_url: string;
  }>;
}

export async function generateEventPlan(inputs: EventInputs): Promise<EventPlan> {
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  
  const prompt = `You are a friendly expert event planner specializing in Indian events (weddings, parties, corporate).
  
  CRITICAL: Use ONLY BASIC, SIMPLE ENGLISH. Avoid hard words. Make it very easy to read for everyone.
  
  Event Parameters:
  - Event Type: ${inputs.eventType}
  - Primary Purpose: ${inputs.purpose}
  - Date & Clock Time: ${inputs.date}
  - Duration: ${inputs.duration}
  - Allocated Budget: ${inputs.budget}
  - Guest Count: ${inputs.guests}
  - Target Audience: ${inputs.audience}
  - Location in India (State/District/City): ${inputs.location}
  - Aesthetic Theme: ${inputs.theme}
  
  Instructions:
  - Stay strictly within the ${inputs.budget} budget.
  - Suggest 3 REAL specific luxury or budget-friendly venues/areas in "${inputs.location}".
  - For each location, provide geographic coordinates (lat, lng) and a Google Maps search link.
  - Suggest a realistic name for a catering service that matches the vibe.
  - Provide detailed food design/presentation ideas.
  - Provide venue and hotel room design inspirations.
  - Return ONLY valid JSON.
  
  JSON Format:
  {
    "overview": "Clear simple summary in Markdown format",
    "timeline": ["Simple steps"],
    "budget": {
      "venue": "cost + simple reason",
      "food_catering": "total cost and cost per person",
      "decoration": "cost",
      "entertainment": "cost",
      "miscellaneous": "cost",
      "hidden_costs": "simple list",
      "total_estimated": "final total",
      "per_person_cost": "total / guests"
    },
    "budget_split_percent": {
      "venue": "30",
      "food": "40",
      "decoration": "10",
      "entertainment": "10",
      "misc": "10"
    },
    "food": {
      "service_type": "Buffet / Plated / Snacks",
      "catering_name": "Suggested catering name",
      "veg_nonveg_ratio": "ratio",
      "menu": {
        "starters": ["item 1"],
        "main_course": ["item 1"],
        "desserts": ["item 1"],
        "drinks": ["item 1"]
      },
      "food_design_ideas": "How the food should look/be presented",
      "quantity_planning": "Simple guide",
      "special_needs": { "kids": "Kid-friendly", "dietary": "Notes" }
    },
    "decoration": {
      "theme_style": "Style",
      "color_palette": ["Color 1"],
      "lighting_setup": "Lighting info",
      "stage_design": "Stage info",
      "seating_arrangement": "Seating info",
      "welcome_area": "Entry ideas",
      "photo_booth": "Backdrop ideas",
      "venue_design_inspiration": "Ideas for overall venue look",
      "hotel_room_decor": "Ideas for guest hotel rooms",
      "general_items": ["Decor items"]
    },
    "checklist": ["To-do list"],
    "vendors": [
      { "type": "Type", "suggestion": "description", "price_range": "range", "tip": "tip" }
    ],
    "tips": ["Advice"],
    "image_queries": {
      "venue": "Visual query for venue",
      "food": "Visual query for food presentation",
      "decor": "Visual query for decor",
      "hotel": "Visual query for hotel room decor"
    },
    "recommended_locations": [
      {
        "name": "REAL venue name",
        "why": "Reason",
        "atmosphere": "Vibe",
        "capacity": "Capacity",
        "amenities": ["Amenity"],
        "estimated_cost": "Cost in INR",
        "venue_type": "Type",
        "rating": 4.5,
        "ideal_for": "Occasion",
        "lat": 12.3456,
        "lng": 78.9012,
        "map_url": "Google Maps search URL"
      }
    ]
  }`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    if (!text) throw new Error("No text returned from AI");
    
    const jsonString = text.replace(/```json\n?|```/g, "").trim();
    const parsed = JSON.parse(jsonString);
    
    // Basic validation
    if (!parsed.overview || !parsed.budget || !parsed.timeline) {
      throw new Error("AI_INVALID_STRUCTURE");
    }
    
    return parsed as EventPlan;
  } catch (error: any) {
    console.error("Gemini API Error details:", error);
    
    if (error?.message?.includes("Unexpected token")) {
      throw new Error("AI_PARSE_ERROR: The planner encountered a JSON formatting issue. Please try again.");
    }
    
    if (error?.message?.includes("429")) {
      throw new Error("AI_QUOTA_ERROR: Your API key has reached its free-tier limit. Please try again in a minute or use a different key.");
    }

    throw new Error(error.message || "EXTERNAL_API_ERROR");
  }
}

export async function chatAboutPlan(plan: EventPlan, userInputs: EventInputs, userMessage: string, history: { role: 'user' | 'model', text: string }[]) {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-flash-latest",
    systemInstruction: `You are the EventHivex AI assistant, a professional event planning expert. You are helping a user refine and understand their specific event plan.
  
  CONTEXT:
  Event Type: ${userInputs.eventType}
  Location: ${userInputs.location}
  Theme: ${userInputs.theme}
  Purpose: ${userInputs.purpose}
  Budget: ${userInputs.budget}
  Guests: ${userInputs.guests}
  
  PLAN DATA (JSON):
  ${JSON.stringify(plan)}
  
  YOUR INSTRUCTIONS:
  1. ADAPTIVE ANSWERS: Map requests to the relevant section of the PLAN DATA.
  2. PLAN CONSISTENCY: Stay consistent with the generated plan.
  3. SPECIFICITY: Use the specific names and details from the plan.
  4. FORMATTING: Use Markdown.
  5. MODIFICATIONS: Explain the impact of requested changes.
  
  Keep responses helpful, creative, and professional. Use simple English.`
  });

  const chat = model.startChat({
    history: history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }))
  });

  const result = await chat.sendMessage(userMessage);
  const response = await result.response;
  return response.text() || "I'm sorry, I couldn't generate a response.";
}
