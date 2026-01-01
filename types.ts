export interface KnowledgeItem {
  id: string;
  title: string;
  type: 'book' | 'note' | 'strategy' | 'observation';
  content: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isThinking?: boolean;
}

export type PersonaType = 'general' | 'strategist' | 'marketer' | 'investor' | 'skeptic';

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  persona: PersonaType;
  updatedAt: number;
}

export interface AppState {
  knowledgeBase: KnowledgeItem[];
  sessions: ChatSession[];
  activeSessionId: string | null;
}
