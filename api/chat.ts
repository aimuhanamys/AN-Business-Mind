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
        const groqApiKey = process.env.GROQ_API_KEY;

        // Models to try in order of preference (Gemini 2.x)
        const modelsToTry = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.0-flash-exp"];
        let lastError: any = null;

        // PRIORITY 1: Try Groq (High limits, reliable)
        if (groqApiKey) {
            try {
                // Convert Gemini content format to OpenAI format for Groq
                const messages: any[] = [];
                if (systemInstruction) {
                    messages.push({ role: 'system', content: systemInstruction });
                }
                for (const content of contents) {
                    messages.push({
                        role: content.role === 'model' ? 'assistant' : content.role,
                        content: content.parts.map((p: any) => p.text).join('')
                    });
                }

                const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${groqApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        messages: messages,
                        max_tokens: 4096,
                        temperature: 0.7
                    })
                });

                if (!groqResponse.ok) {
                    const errData = await groqResponse.json().catch(() => ({}));
                    console.error('Groq API Error:', errData);
                    throw new Error(errData.error?.message || `Groq responded with ${groqResponse.status}`);
                }

                const groqData = await groqResponse.json();
                const text = groqData.choices?.[0]?.message?.content || '';

                return new Response(JSON.stringify({ text, usedModel: 'llama-3.3-70b-versatile', provider: 'groq' }), {
                    headers: { 'Content-Type': 'application/json' },
                    status: 200
                });

            } catch (groqErr: any) {
                console.error('Groq failed, switching to Gemini:', groqErr.message);
                lastError = groqErr;
            }
        }

        // PRIORITY 2: Gemini Fallback
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

                return new Response(JSON.stringify({ text, usedModel: modelName, provider: 'gemini' }), {
                    headers: { 'Content-Type': 'application/json' },
                    status: 200
                });
            } catch (modelErr: any) {
                console.error(`Gemini ${modelName} failed:`, modelErr.message);
                lastError = modelErr;
            }
        }

        // All providers failed
        throw lastError || new Error('All AI providers failed');

    } catch (err: any) {
        console.error('Edge Proxy Logic Error:', err);
        return new Response(JSON.stringify({
            error: 'AI Connection Error',
            details: err.message,
            tip: 'All AI providers (Gemini + Groq) failed. Check your API keys and quotas.'
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500
        });
    }
}
