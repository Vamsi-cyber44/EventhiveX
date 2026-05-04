import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

async function listModelsRest() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
  try {
    console.log("Calling REST API to list models...");
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.models) {
      console.log("FOUND MODELS:");
      data.models.forEach((m: any) => console.log(`- ${m.name}`));
    } else {
      console.log("NO MODELS IN RESPONSE:", JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error("REST call failed:", err);
  }
}

listModelsRest();
