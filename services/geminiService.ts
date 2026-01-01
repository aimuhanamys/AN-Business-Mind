/// <reference types="vite/client" />
import { GoogleGenAI, Content, Part } from "@google/genai";
import { KnowledgeItem, ChatMessage, PersonaType } from "../types";

const getSystemInstruction = (knowledgeBase: KnowledgeItem[], persona: PersonaType): string => {
  const knowledgeText = knowledgeBase.map(item => {
    return `---
[Type: ${item.type}]
[Title: ${item.title}]
[Content]:
${item.content}
---`;
  }).join('\n');

  let personaInstruction = "";
  switch (persona) {
    case 'strategist':
      personaInstruction = "Вы — Стратег. Думайте долгосрочно, ищите рычаги роста, анализируйте конкурентные преимущества и риски. Используйте ментальные модели.";
      break;
    case 'marketer':
      personaInstruction = "Вы — Маркетолог. Фокусируйтесь на клиенте, позиционировании, воронках продаж, копирайтинге и психологии потребления.";
      break;
    case 'investor':
      personaInstruction = "Вы — Инвестор. Будьте прагматичны. Оценивайте ROI, масштабируемость, unit-экономику и Exit-стратегии.";
      break;
    case 'skeptic':
      personaInstruction = "Вы — Критик. Ищите слабые места, задавайте неудобные вопросы, проводите 'Red Teaming' идей пользователя.";
      break;
    default:
      personaInstruction = "Вы — AN Business Mind, универсальный бизнес-ассистент.";
      break;
  }

  return `
Ты — AN Business Mind. Твоя миссия: Усилить мышление предпринимателя через интеграцию знаний.
У тебя есть доступ к "Второму мозгу" (Knowledge Base) пользователя.
Твоя задача — отвечать на вопросы, ОБЯЗАТЕЛЬНО используя информацию из предоставленной базы знаний, если она релевантна.
Если в базе знаний есть релевантные книги или заметки, явно ссылайся на них (например: "Как указано в твоей заметке по книге 'Lean Startup'...").

БАЗА ЗНАНИЙ ПОЛЬЗОВАТЕЛЯ:
${knowledgeText.length > 0 ? knowledgeText : "База знаний пока пуста."}

РЕЖИМ ЛИЧНОСТИ:
${personaInstruction}

Формат ответа: Markdown. Будь кратким, четким и структурированным.
`;
};

export const sendMessageToGemini = async (
  message: string,
  history: ChatMessage[],
  knowledgeBase: KnowledgeItem[],
  persona: PersonaType
): Promise<string> => {
  try {
    const contents: Content[] = history
      .filter(h => !h.isThinking)
      .map(h => ({
        role: h.role,
        parts: [{ text: h.text } as Part]
      }));

    contents.push({
      role: 'user',
      parts: [{ text: message } as Part]
    });

    const systemInstruction = getSystemInstruction(knowledgeBase, persona);

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        contents,
        systemInstruction
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Server responded with ' + response.status);
    }

    const data = await response.json();
    return data.text || "Извините, я не смог сформировать ответ.";
  } catch (error: any) {
    console.error("Gemini Proxy Error:", error);
    return `Ошибка: AI временно недоступен. (${error.message || 'Проверьте соединение'})`;
  }
};
