import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModel() {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash"
    });
    const result = await model.generateContent("Say hello world");
    console.log("Success with gemini-2.0-flash:", result.response.text());
  } catch (e) {
    console.error("Error with gemini-2.0-flash:", e.message);
  }
}

testModel();
