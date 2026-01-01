import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

    // --- ENHANCED DIAGNOSTIC MODE ---
    if (req.method === 'GET') {
        const url = new URL(req.url);
        if (url.searchParams.get('diag') === '1') {
            if (!apiKey) return new Response("API Key Missing in Environment", { status: 500 });

            const results: any[] = [];
            const testModels = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-2.0-flash-exp", "gemini-pro"];

            for (const m of testModels) {
                try {
                    const genAI = new GoogleGenerativeAI(apiKey);
                    const model = genAI.getGenerativeModel({ model: m }, { apiVersion: 'v1beta' });
                    const res = await model.generateContent("echo hi");
                    results.push({ model: m, status: "SUCCESS", response: res.response.text().substring(0, 20) });
                } catch (e: any) {
                    results.push({ model: m, status: "FAILED", error: e.message });
                }
            }

            return new Response(JSON.stringify({
                diagnostic: "Model Probe Results",
                apiKeyPrefix: apiKey.substring(0, 5) + "...",
                timestamp: new Date().toISOString(),
                results
            }, null, 2), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
    }

    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'API_KEY is not configured' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }

    try {
        const body = await req.json();
        const { contents, systemInstruction } = body;

        const genAI = new GoogleGenerativeAI(apiKey);

        // Models to try in order of preference (Gemini 2.x)
        const modelsToTry = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.0-flash-exp"];
        let lastError: any = null;

        for (const modelName of modelsToTry) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    systemInstruction: systemInstruction,
                }, { apiVersion: 'v1beta' });

                const result = await model.generateContent({
                    contents: contents,
                });

                const response = await result.response;
                const text = response.text();

                return new Response(JSON.stringify({ text, usedModel: modelName }), {
                    headers: { 'Content-Type': 'application/json' },
                    status: 200
                });
            } catch (modelErr: any) {
                console.error(`Model ${modelName} failed:`, modelErr.message);
                lastError = modelErr;
                // Continue to next model
            }
        }

        // All models failed
        throw lastError || new Error('All models failed');

    } catch (err: any) {
        console.error('Edge Proxy Logic Error:', err);
        return new Response(JSON.stringify({
            error: 'AI Connection Error',
            details: err.message,
            tip: 'If this persists, go to /api/chat?diag=1 to see which models are active for your key.'
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
}
