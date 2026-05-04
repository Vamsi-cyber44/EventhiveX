import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

// Try v1 instead of v1beta
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function testV1() {
  try {
    console.log("Testing gemini-1.5-flash on v1...");
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1' });
    const result = await model.generateContent("test");
    console.log("SUCCESS WITH V1!");
  } catch (err: any) {
    console.error("V1 also failed:", err.message);
  }
}

testV1();
