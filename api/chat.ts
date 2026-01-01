import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

    // 1. Simple GET Diagnostic
    if (req.method === 'GET') {
        const url = new URL(req.url);
        if (url.searchParams.get('diag') === '1') {
            return new Response(JSON.stringify({
                status: "Diagnostic Active",
                apiKeyConfigured: !!apiKey,
                runtime: "edge",
                timestamp: new Date().toISOString()
            }), {
                headers: { 'Content-Type': 'application/json' },
                status: 200
            });
        }
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'API_KEY is not configured in Vercel environment' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }

    try {
        const body = await req.json();
        const { contents, systemInstruction } = body;

        const genAI = new GoogleGenerativeAI(apiKey);

        // We use gemini-1.5-flash which is the most widely available.
        // We use v1beta as it supports the native systemInstruction field.
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: systemInstruction,
        }, { apiVersion: 'v1beta' });

        const result = await model.generateContent({
            contents: contents,
        });

        const response = await result.response;
        const text = response.text();

        return new Response(JSON.stringify({ text }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
        });

    } catch (err: any) {
        console.error('Edge Proxy Error:', err);
        return new Response(JSON.stringify({
            error: 'AI Connection Error',
            details: err.message,
            tip: 'Check your API key and Ensure "Generative Language API" is enabled in Google Cloud Console.'
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
}
