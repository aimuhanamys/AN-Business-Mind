import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
    runtime: 'edge', // Using Edge runtime for speed
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const { contents, systemInstruction } = await req.json();
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'API_KEY not found' }), { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash", // Using stable flash for production
            systemInstruction: systemInstruction,
        });

        const result = await model.generateContent({
            contents: contents,
        });

        const response = await result.response;
        const text = response.text();

        return new Response(JSON.stringify({ text }), {
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err: any) {
        console.error('Serverless Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
