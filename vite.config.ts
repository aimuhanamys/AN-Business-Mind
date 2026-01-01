import react from '@vitejs/plugin-react';
import { GoogleGenAI } from '@google/genai';
import { IncomingMessage, ServerResponse } from 'http';
import { defineConfig, loadEnv } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {},
    },
    plugins: [
      react(),
      {
        name: 'gemini-proxy',
        configureServer(server) {
          server.middlewares.use(async (req: IncomingMessage, res: ServerResponse, next) => {
            if (req.url === '/api/chat' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', async () => {
                try {
                  const { message, contents, systemInstruction } = JSON.parse(body);
                  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || env.API_KEY || env.GEMINI_API_KEY;

                  if (!apiKey) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: 'API_KEY not found in server environment' }));
                    return;
                  }

                  const genAI = new GoogleGenAI({ apiKey });
                  const result = await genAI.models.generateContent({
                    model: "gemini-3-flash-preview",
                    config: {
                      systemInstruction: systemInstruction,
                      temperature: 0.7
                    },
                    contents: contents
                  });

                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ text: result.text }));
                } catch (err: any) {
                  console.error('Proxy Error:', err);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
                }
              });
              return;
            }
            next();
          });
        }
      }
    ],
    define: {
      'process.env.API_KEY': JSON.stringify('PROXY_MODE'),
      'process.env.GEMINI_API_KEY': JSON.stringify('PROXY_MODE')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
