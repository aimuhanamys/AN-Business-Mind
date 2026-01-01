import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
        const url = new URL(req.url);
        // GET request to /api/chat as a diagnostic
        if (req.method === 'GET' && url.searchParams.get('diag') === '1') {
            const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
            if (!apiKey) return new Response("Missing API Key", { status: 500 });
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
                const data = await response.json();
                return new Response(JSON.stringify(data, null, 2), { headers: { 'Content-Type': 'application/json' } });
            } catch (e: any) {
                return new Response(e.message, { status: 500 });
            }
        }
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    try {
        const body = await req.json();
        const { contents, systemInstruction } = body;
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'API_KEY is missing' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // List of models to try
        const modelsToTry = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-2.0-flash-exp",
            "gemini-1.5-pro",
            "gemini-pro"
        ];

        // Sequence: 
        // 1. Try each model on v1beta with systemInstruction
        // 2. Try each model on v1 by prepending instruction to history

        let lastErrorMessage = "";

        // Phase 1: v1beta (Native System Instruction)
        for (const modelId of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelId,
                    systemInstruction: systemInstruction,
                }, { apiVersion: 'v1beta' });

                const result = await model.generateContent({ contents });
                const response = await result.response;
                const text = response.text();

                if (text) return new Response(JSON.stringify({ text }), { headers: { 'Content-Type': 'application/json' } });
            } catch (err: any) {
                console.error(`Phase 1 (${modelId}):`, err.message);
                lastErrorMessage = err.message;
                if (err.message.includes('429')) break;
            }
        }

        // Phase 2: v1 (Stable, Preamble Instruction)
        for (const modelId of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({ model: modelId }, { apiVersion: 'v1' });
                const messages = [...contents];
                if (systemInstruction) {
                    messages.unshift({
                        role: 'user',
                        parts: [{ text: `System Instruction: ${systemInstruction}\nAcknowledge and continue.` }]
                    });
                }
                const result = await model.generateContent({ contents: messages });
                const response = await result.response;
                const text = response.text();
                if (text) return new Response(JSON.stringify({ text }), { headers: { 'Content-Type': 'application/json' } });
            } catch (err: any) {
                console.error(`Phase 2 (${modelId}):`, err.message);
                lastErrorMessage = err.message;
            }
        }

        return new Response(JSON.stringify({
            error: 'AI Connection Failed',
            details: lastErrorMessage,
            diagnostic_url: '/api/chat?diag=1'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: 'Fatal Proxy Error', details: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
