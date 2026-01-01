import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
    runtime: 'edge', // Using Edge runtime for speed
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const body = await req.json();
        const { contents, systemInstruction } = body;

        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'API_KEY is missing in Vercel environment' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!contents || !Array.isArray(contents)) {
            return new Response(JSON.stringify({ error: 'Invalid contents format' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
        }, { apiVersion: 'v1' });

        // Add system instruction as part of history preamble for 100% compatibility
        const messages = [];
        if (systemInstruction) {
            messages.push({
                role: 'user',
                parts: [{ text: `ИНСТРУКЦИЯ И КОНТЕКСТ: ${systemInstruction}\n\nПожалуйста, подтверди, что ты готов работать в этом режиме.` }]
            });
            messages.push({
                role: 'model',
                parts: [{ text: "Принято. Я готов работать в качестве вашего 'Второго Мозга' и использовать предоставленные знания для глубоких бизнес-ответов. Чем я могу помочь?" }]
            });
        }

        // Append actual conversation contents
        messages.push(...contents);

        const result = await model.generateContent({
            contents: messages,
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
