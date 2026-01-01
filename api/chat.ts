import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req: Request) {
    if (req.method !== 'POST') {
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

        // Comprehensive list of models to try in sequence
        const modelsToTry = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "gemini-2.0-flash-exp",
            "gemini-1.5-flash-8b",
            "gemini-1.5-pro",
            "gemini-pro"
        ];

        let lastErrorMessage = "";

        for (const modelId of modelsToTry) {
            try {
                // Try with v1beta as it supports systemInstruction natively
                const model = genAI.getGenerativeModel({
                    model: modelId,
                    systemInstruction: systemInstruction,
                }, { apiVersion: 'v1beta' });

                const result = await model.generateContent({
                    contents: contents,
                });

                const response = await result.response;
                const text = response.text();

                if (text) {
                    return new Response(JSON.stringify({ text }), {
                        headers: { 'Content-Type': 'application/json' },
                    });
                }
            } catch (err: any) {
                console.error(`Model ${modelId} failed:`, err.message);
                lastErrorMessage = err.message;
                // If it's a quota error (429), we stop and report it
                if (err.message.includes('429')) break;
                // Otherwise try the next model
                continue;
            }
        }

        // Final fallback: try WITHOUT systemInstruction on v1 if all else fails
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1' });
            const result = await model.generateContent({ contents });
            const response = await result.response;
            const text = response.text();
            if (text) {
                return new Response(JSON.stringify({ text }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        } catch (e: any) {
            lastErrorMessage = e.message;
        }

        return new Response(JSON.stringify({
            error: 'AI Connection Failed',
            details: lastErrorMessage,
            suggestion: 'Please verify your API Key in Google AI Studio and ensure "Generative Language API" is enabled.'
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
