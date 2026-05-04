import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function listModels() {
  try {
    console.log("Checking models using OFFICIAL SDK...");
    // The official SDK doesn't have a direct listModels on the main class in some versions,
    // but we can use the fetch API to check the endpoint directly if needed.
    // Actually, let's try gemini-1.5-flash-8b as a fallback.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("test");
    console.log("Success with gemini-1.5-flash!");
  } catch (err: any) {
    console.error("Error with gemini-1.5-flash:", err.message);
    
    // Try gemini-1.5-pro
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
      await model.generateContent("test");
      console.log("Success with gemini-1.5-pro!");
    } catch (err2: any) {
      console.error("Error with gemini-1.5-pro:", err2.message);
    }

    // Try gemini-2.0-flash-exp
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      await model.generateContent("test");
      console.log("Success with gemini-2.0-flash-exp!");
    } catch (err3: any) {
      console.error("Error with gemini-2.0-flash-exp:", err3.message);
    }
  }
}

listModels();
