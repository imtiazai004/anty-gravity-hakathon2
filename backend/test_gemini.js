import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModel() {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      tools: [{ googleSearch: {} }]
    });
    const result = await model.generateContent("What is the weather in Tokyo?");
    console.log("Success with googleSearch:", result.response.text());
  } catch (e) {
    console.error("Error with googleSearch:", e.message);
  }

  try {
    const model2 = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });
    const result2 = await model2.generateContent("What is 2+2?");
    console.log("Success without tools:", result2.response.text());
  } catch (e) {
    console.error("Error without tools:", e.message);
  }
}

testModel();
