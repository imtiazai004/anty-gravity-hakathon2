import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testModel() {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      tools: [{ googleSearch: {} }]
    });
    const result = await model.generateContent("What is the weather in Tokyo?");
    console.log("Success with googleSearch:", result.response.text());
  } catch (e) {
    console.error("Error with googleSearch:", e.message);
  }

  try {
    const model2 = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      tools: [{ googleSearchRetrieval: { dynamicRetrievalConfig: { mode: "MODE_DYNAMIC", dynamicThreshold: 0.3 } } }]
    });
    const result2 = await model2.generateContent("What is 2+2?");
    console.log("Success with googleSearchRetrieval:", result2.response.text());
  } catch (e) {
    console.error("Error with googleSearchRetrieval:", e.message);
  }
}

testModel();
