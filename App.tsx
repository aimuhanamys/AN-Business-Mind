import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Layout } from './components/Layout';
import { KnowledgeCard } from './components/KnowledgeCard';
import { PlusIcon, SendIcon, SettingsIcon, XIcon, PencilIcon, LockIcon, EyeIcon, EyeOffIcon } from './components/Icons';
import { SessionList } from './components/SessionList';
import { KnowledgeItem, ChatMessage, PersonaType, ChatSession } from './types';
import { sendMessageToGemini } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import { createRoot } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';

// Mock initial data
const INITIAL_KNOWLEDGE: KnowledgeItem[] = [
  {
    id: '1',
    title: 'The Lean Startup',
    type: 'book',
    content: 'Основная идея — быстро тестировать гипотезы. Цикл Build-Measure-Learn. MVP вместо идеального продукта.',
    createdAt: Date.now() - 1000000
  },
  {
    id: '2',
    title: 'Стратегия найма 2024',
    type: 'strategy',
    content: 'Нанимать медленно, увольнять быстро. Искать людей с growth mindset. Тестовые задания обязательны.',
    createdAt: Date.now()
  }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge'>('chat');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authId, setAuthId] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);

  const [userId, setUserId] = useState<string>(() => {
    return localStorage.getItem('an_mind_user_id') || '';
  });
  const [password, setPassword] = useState<string>(() => {
    return localStorage.getItem('an_mind_password') || '';
  });
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>(() => {
    // Keys 'an_mind_knowledge' and others must remain stable for persistence across version updates.
    const saved = localStorage.getItem('an_mind_knowledge');
    return saved ? JSON.parse(saved) : INITIAL_KNOWLEDGE;
  });

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('an_mind_sessions');
    if (saved) return JSON.parse(saved);

    // Default initial session
    return [{
      id: 'default',
      title: 'Новый чат',
      messages: [{
        id: 'init',
        role: 'model',
        text: 'Привет. Я — AN Business Mind, твой второй мозг. Я готов помочь с бизнес-задачами, используя информацию, которую ты мне дал.',
        timestamp: Date.now()
      }],
      persona: 'general',
      updatedAt: Date.now()
    }];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const saved = localStorage.getItem('an_mind_active_session_id');
    if (saved && sessions.some(s => s.id === saved)) return saved;
    return sessions[0]?.id || 'default';
  });

  const currentSession = useMemo(() =>
    sessions.find(s => s.id === activeSessionId) || sessions[0],
    [sessions, activeSessionId]);

  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // New Knowledge Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<KnowledgeItem['type']>('note');
  const [newContent, setNewContent] = useState('');

  // Selected Item for View/Edit
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [insightText, setInsightText] = useState('');
  const [isFullEditMode, setIsFullEditMode] = useState(false);
  const [fullEditContent, setFullEditContent] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('an_mind_knowledge', JSON.stringify(knowledgeBase));
  }, [knowledgeBase]);

  useEffect(() => {
    localStorage.setItem('an_mind_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('an_mind_active_session_id', activeSessionId);
  }, [activeSessionId]);

  const handleLogin = async () => {
    if (!authId || !authPassword) {
      alert("Пожалуйста, введите ID и Пароль");
      return;
    }

    setIsSyncing(true);
    try {
      // 1. Check if brain exists
      const { data, error } = await supabase.from('brains').select('*').eq('id', authId).single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 means not found

      if (data) {
        // 2. Exists -> Check password
        if (data.password === authPassword) {
          setUserId(authId);
          setPassword(authPassword);
          setIsAuthorized(true);
          setShowAuthModal(false);
          localStorage.setItem('an_mind_user_id', authId);
          localStorage.setItem('an_mind_password', authPassword);
          alert("Авторизация успешна!");
        } else {
          alert("Неверный пароль для этого Brain ID");
        }
      } else {
        // 3. Doesn't exist -> Create new
        const { error: insertError } = await supabase.from('brains').insert([{ id: authId, password: authPassword }]);
        if (insertError) throw insertError;

        setUserId(authId);
        setPassword(authPassword);
        setIsAuthorized(true);
        setShowAuthModal(false);
        localStorage.setItem('an_mind_user_id', authId);
        localStorage.setItem('an_mind_password', authPassword);
        alert("Создан новый зашифрованный Brain ID!");
      }
    } catch (e: any) {
      alert("Ошибка доступа: " + e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Mobile Keyboard Handling
  useEffect(() => {
    if (!window.visualViewport) return;

    const handleResize = () => {
      const vh = window.visualViewport?.height || window.innerHeight;
      const offset = window.innerHeight - vh;
      document.documentElement.style.setProperty('--keyboard-offset', `${offset}px`);
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  // Check auth on mount if credentials exist
  useEffect(() => {
    if (userId && password) {
      const verify = async () => {
        const { data } = await supabase.from('brains').select('password').eq('id', userId).single();
        if (data && data.password === password) {
          setIsAuthorized(true);
        } else {
          setShowAuthModal(true);
        }
      };
      verify();
    } else {
      setShowAuthModal(true);
    }
  }, []);

  // Sync logic (only if authorized)
  useEffect(() => {
    if (!isAuthorized || !supabase) return;
    const fetchData = async () => {
      setIsSyncing(true);
      try {
        const { data: kData } = await supabase.from('knowledge').select('*').eq('user_id', userId);
        if (kData && kData.length > 0) setKnowledgeBase(kData);

        const { data: sData } = await supabase.from('sessions').select('*').eq('user_id', userId);
        if (sData && sData.length > 0) setSessions(sData);
      } catch (e) { }
      setIsSyncing(false);
    };
    fetchData();
  }, [isAuthorized, userId]);

  useEffect(() => {
    if (!isAuthorized || !userId) return;
    const sync = async () => {
      try {
        await supabase.from('knowledge').upsert(
          knowledgeBase.map(item => ({ ...item, user_id: userId }))
        );
      } catch (e) { }
    };
    sync();
  }, [knowledgeBase, userId, isAuthorized]);

  useEffect(() => {
    if (!isAuthorized || !userId) return;
    const sync = async () => {
      try {
        await supabase.from('sessions').upsert(
          sessions.map(s => ({ ...s, user_id: userId }))
        );
      } catch (e) { }
    };
    sync();
  }, [sessions, userId, isAuthorized]);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentSession?.messages, activeTab]);

  const handleNewSession = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'Новый чат',
      messages: [{
        id: 'init-' + Date.now(),
        role: 'model',
        text: 'Привет. Я начал новый чат. Чем могу помочь?',
        timestamp: Date.now()
      }],
      persona: 'general',
      updatedAt: Date.now()
    };
    setSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
  };

  const handleDeleteSession = (id: string) => {
    const updatedSessions = sessions.filter(s => s.id !== id);
    if (updatedSessions.length === 0) {
      // Create a fresh session and set it directly
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: 'Новый чат',
        messages: [{
          id: 'init-' + Date.now(),
          role: 'model',
          text: 'Привет. Я начал новый чат. Чем могу помочь?',
          timestamp: Date.now()
        }],
        persona: 'general',
        updatedAt: Date.now()
      };
      setSessions([newSession]);
      setActiveSessionId(newSession.id);
    } else {
      setSessions(updatedSessions);
      if (activeSessionId === id) {
        setActiveSessionId(updatedSessions[0].id);
      }
    }
  };

  const updateSessionMessages = (sessionId: string, messages: ChatMessage[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id === sessionId) {
        // Simple heuristic for title if it's still default
        let title = s.title;
        if (title === 'Новый чат' && messages.length > 1) {
          const firstUserMsg = messages.find(m => m.role === 'user');
          if (firstUserMsg) {
            title = firstUserMsg.text.slice(0, 30) + (firstUserMsg.text.length > 30 ? '...' : '');
          }
        }
        return { ...s, messages, title, updatedAt: Date.now() };
      }
      return s;
    }));
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing || !currentSession) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputMessage,
      timestamp: Date.now()
    };

    const updatedMessages = [...currentSession.messages, userMsg];
    updateSessionMessages(currentSession.id, updatedMessages);

    setInputMessage('');
    setIsProcessing(true);

    const botResponseText = await sendMessageToGemini(
      userMsg.text,
      currentSession.messages,
      knowledgeBase,
      currentSession.persona
    );

    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: botResponseText,
      timestamp: Date.now()
    };

    updateSessionMessages(currentSession.id, [...updatedMessages, botMsg]);
    setIsProcessing(false);
  };

  const handleUpdatePersona = (persona: PersonaType) => {
    if (!currentSession) return;
    setSessions(prev => prev.map(s =>
      s.id === currentSession.id ? { ...s, persona, updatedAt: Date.now() } : s
    ));
  };

  const handleAddKnowledge = () => {
    if (!newTitle || !newContent) return;
    const newItem: KnowledgeItem = {
      id: Date.now().toString(),
      title: newTitle,
      type: newType,
      content: newContent,
      createdAt: Date.now()
    };
    setKnowledgeBase([newItem, ...knowledgeBase]);
    setShowAddModal(false);
    setNewTitle('');
    setNewContent('');
    setNewType('note');
  };

  const handleExportKnowledge = () => {
    let markdown = `# AN Business Mind - Knowledge Base Export\nGenerated: ${new Date().toLocaleString()}\n\n`;

    knowledgeBase.forEach(item => {
      markdown += `### [${item.type}] ${item.title}\n`;
      markdown += `ID: ${item.id}\n`;
      markdown += `Created: ${new Date(item.createdAt).toISOString()}\n\n`;
      markdown += `#### Content:\n${item.content}\n\n`;
      markdown += `---\n\n`;
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `an-mind-knowledge-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportKnowledge = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        // Split by delimiter, handling various newline formats
        const blocks = text.split(/\n---\n/).filter(block => block.trim().length > 0 && block.includes('ID:'));

        let updatedCount = 0;
        let addedCount = 0;

        const importedItems: KnowledgeItem[] = blocks.map(block => {
          const typeTitleMatch = block.match(/### \[(.*?)\] (.*)/);
          const idMatch = block.match(/ID: (.*)/);
          const createdMatch = block.match(/Created: (.*)/);
          const contentSplit = block.split(/#### Content:\n|#### Content:\r\n/);

          return {
            id: idMatch?.[1]?.trim() || Date.now().toString() + Math.random().toString(36).substr(2, 5),
            type: (typeTitleMatch?.[1]?.trim() as any) || 'note',
            title: typeTitleMatch?.[2]?.trim() || 'Untitled',
            content: contentSplit[1]?.trim() || '',
            createdAt: createdMatch ? new Date(createdMatch[1].trim()).getTime() : Date.now()
          };
        });

        if (importedItems.length > 0) {
          setKnowledgeBase(prev => {
            const newKnowledge = [...prev];
            importedItems.forEach(imported => {
              const existingIndex = newKnowledge.findIndex(k => k.id === imported.id);
              if (existingIndex !== -1) {
                newKnowledge[existingIndex] = imported;
                updatedCount++;
              } else {
                newKnowledge.unshift(imported);
                addedCount++;
              }
            });
            return newKnowledge;
          });
          alert(`Импорт завершен!\nДобавлено новых: ${addedCount}\nОбновлено существующих: ${updatedCount}`);
        }
      } catch (err) {
        console.error("Import error:", err);
        alert("Ошибка при чтении Markdown. Убедитесь, что формат файла соответствует экспортированному.");
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be imported again if needed
    event.target.value = '';
  };

  const handleDeleteKnowledge = (id: string) => {
    setKnowledgeBase(knowledgeBase.filter(k => k.id !== id));
    if (selectedItem?.id === id) setSelectedItem(null);
  };

  const openItemDetails = (item: KnowledgeItem) => {
    setSelectedItem(item);
    setInsightText('');
    setIsFullEditMode(false);
    setFullEditContent(item.content);
  };

  const handleAppendInsight = () => {
    if (!selectedItem || !insightText.trim()) return;

    const dateStr = new Date().toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
    });

    const appendString = `\n\n### 📝 Инсайт (${dateStr})\n${insightText}`;
    const updatedContent = selectedItem.content + appendString;

    const updatedItem = { ...selectedItem, content: updatedContent };

    setKnowledgeBase(knowledgeBase.map(k => k.id === updatedItem.id ? updatedItem : k));
    setSelectedItem(updatedItem);
    setFullEditContent(updatedContent);
    setInsightText('');
  };

  const handleSaveFullEdit = () => {
    if (!selectedItem) return;
    const updatedItem = { ...selectedItem, content: fullEditContent };
    setKnowledgeBase(knowledgeBase.map(k => k.id === updatedItem.id ? updatedItem : k));
    setSelectedItem(updatedItem);
    setIsFullEditMode(false);
  };

  const sessionList = (
    <SessionList
      sessions={sessions}
      activeSessionId={activeSessionId}
      onSelectSession={setActiveSessionId}
      onNewSession={handleNewSession}
      onDeleteSession={handleDeleteSession}
    />
  );

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      sessionList={sessionList}
      isSyncing={isSyncing}
      userId={userId}
      onSecurityClick={() => {
        setAuthId(userId);
        setShowAuthModal(true);
      }}
    >

      {/* --- CHAT TAB --- */}
      {activeTab === 'chat' && currentSession && (
        <div className="flex flex-col h-full bg-ivory-200/30">

          {/* Header */}
          <div className="p-4 border-b border-white/20 bg-ivory-50/60 backdrop-blur-xl flex justify-between items-center z-10 sticky top-0 shadow-lg shadow-anthracite-900/5">
            <div>
              <h2 className="text-lg font-bold text-anthracite-900">{currentSession.title}</h2>
              <p className="text-[10px] text-anthracite-500 font-bold uppercase tracking-wider">Знаний в памяти: {knowledgeBase.length}</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-anthracite-700 hidden sm:block uppercase tracking-widest">Персона:</span>
              <select
                value={currentSession.persona}
                onChange={(e) => handleUpdatePersona(e.target.value as PersonaType)}
                className="bg-ivory-50/50 backdrop-blur-md border border-white/40 text-anthracite-800 text-xs font-bold rounded-lg p-2 focus:ring-2 focus:ring-anthracite-500 outline-none transition-all shadow-sm"
              >
                <option value="general">Обычный</option>
                <option value="strategist">Стратег</option>
                <option value="marketer">Маркетолог</option>
                <option value="investor">Инвестор</option>
                <option value="skeptic">Критик</option>
              </select>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            {currentSession.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-sm ${msg.role === 'user'
                    ? 'bg-anthracite-800 text-ivory-50 rounded-tr-none shadow-anthracite-900/10'
                    : 'bg-ivory-50 text-anthracite-900 rounded-tl-none border border-anthracite-800/5'
                    }`}
                >
                  <div className="prose prose-sm max-w-none prose-anthracite">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                  <div className={`text-[10px] mt-2 font-bold uppercase tracking-tighter opacity-60 ${msg.role === 'user' ? 'text-ivory-300' : 'text-anthracite-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-ivory-50 text-anthracite-400 rounded-2xl rounded-tl-none p-4 text-sm animate-pulse flex items-center gap-2 border border-anthracite-800/5">
                  <div className="w-2 h-2 bg-anthracite-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-anthracite-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-anthracite-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div
            className="p-4 bg-transparent border-t border-white/20 relative pb-[env(safe-area-inset-bottom)]"
            style={{ marginBottom: 'var(--keyboard-offset, 0px)' }}
          >
            <div className="max-w-4xl mx-auto relative flex items-end gap-2 bg-ivory-50/40 backdrop-blur-2xl p-2 rounded-2xl border border-white/50 focus-within:ring-2 focus-within:ring-anthracite-500/20 focus-within:border-anthracite-500/40 transition-all shadow-2xl">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Спроси о бизнесе..."
                className="w-full bg-transparent text-anthracite-900 placeholder-anthracite-300 resize-none outline-none p-2 min-h-[44px] max-h-32 text-sm font-medium caret-anthracite-400"
                rows={1}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isProcessing}
                className="p-3 bg-anthracite-800 hover:bg-anthracite-700 disabled:bg-anthracite-200 disabled:text-anthracite-400 text-ivory-50 rounded-lg transition-all flex-shrink-0 shadow-md active:scale-95"
              >
                <SendIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="text-center text-[10px] text-anthracite-400 font-bold uppercase tracking-widest mt-2">
              AN Mind Intelligence • Powered by Gemini
            </p>
          </div>
        </div>
      )}

      {/* --- KNOWLEDGE TAB --- */}
      {activeTab === 'knowledge' && (
        <div className="flex flex-col h-full bg-ivory-300/30 overflow-y-auto custom-scrollbar">
          <div className="p-4 sm:p-8 max-w-6xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 border-b border-white/30 pb-6 relative gap-4">
              <div className="absolute -bottom-px left-0 w-32 h-0.5 bg-anthracite-600 rounded-full" />
              <div>
                <h2 className="text-3xl sm:text-4xl font-black text-anthracite-900 tracking-tighter uppercase italic">Второй Мозг</h2>
                <p className="text-anthracite-500 font-bold text-[10px] sm:text-sm mt-1 uppercase tracking-widest">Интеграция твоих смыслов • 0.1.0</p>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
                <input
                  type="file"
                  id="import-knowledge"
                  className="hidden"
                  accept=".md"
                  onChange={handleImportKnowledge}
                />
                <button
                  onClick={() => document.getElementById('import-knowledge')?.click()}
                  className="flex-1 sm:flex-none justify-center bg-ivory-50 text-anthracite-800 px-4 sm:px-6 py-3 rounded-xl font-bold hover:bg-ivory-100 transition-all shadow-md flex items-center gap-2 border border-anthracite-800/10 active:scale-95 text-xs sm:text-sm"
                  title="Загрузить знания из файла"
                >
                  <SendIcon className="w-4 h-4 -rotate-90" />
                  <span className="whitespace-nowrap">Импорт</span>
                </button>
                <button
                  onClick={handleExportKnowledge}
                  className="flex-1 sm:flex-none justify-center bg-ivory-50 text-anthracite-800 px-4 sm:px-6 py-3 rounded-xl font-bold hover:bg-ivory-100 transition-all shadow-md flex items-center gap-2 border border-anthracite-800/10 active:scale-95 text-xs sm:text-sm"
                  title="Скачать все знания"
                >
                  <SendIcon className="w-4 h-4 rotate-90" />
                  <span className="whitespace-nowrap">Экспорт</span>
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full sm:w-auto justify-center bg-anthracite-800 text-ivory-50 px-6 sm:px-8 py-3 rounded-xl font-black hover:bg-anthracite-700 transition-all shadow-xl shadow-anthracite-900/20 flex items-center gap-2 active:scale-95 border border-white/10 text-xs sm:text-sm"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span className="whitespace-nowrap">Добавить знание</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {knowledgeBase.length === 0 ? (
                <div className="col-span-full py-20 text-center border-2 border-dashed border-anthracite-200 rounded-3xl bg-ivory-100/50">
                  <p className="text-anthracite-400 font-bold uppercase tracking-widest mb-4">База знаний пуста</p>
                  <button onClick={() => setShowAddModal(true)} className="text-anthracite-800 hover:text-anthracite-600 font-bold underline decoration-2 underline-offset-4">
                    Добавьте первую книгу или заметку
                  </button>
                </div>
              ) : (
                knowledgeBase.map(item => (
                  <KnowledgeCard
                    key={item.id}
                    item={item}
                    onDelete={handleDeleteKnowledge}
                    onClick={openItemDetails}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- ADD KNOWLEDGE MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-anthracite-950/40 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-ivory-50/70 backdrop-blur-2xl border border-white/40 rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-anthracite-900 uppercase tracking-tighter italic">Новое знание</h2>
              <button onClick={() => setShowAddModal(false)} className="text-anthracite-300 hover:text-anthracite-800 transition-colors p-1"><XIcon className="w-7 h-7" /></button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black text-anthracite-400 uppercase tracking-widest mb-2">Заголовок</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Например: 'The Lean Startup'"
                  className="w-full bg-ivory-100 border border-anthracite-100 rounded-xl p-4 text-anthracite-900 placeholder-anthracite-200 focus:ring-2 focus:ring-anthracite-800/20 focus:border-anthracite-800 outline-none transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-anthracite-400 uppercase tracking-widest mb-2">Тип контента</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['book', 'note', 'strategy', 'observation'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setNewType(t)}
                      className={`p-3 rounded-xl text-xs font-bold border capitalize transition-all ${newType === t
                        ? 'bg-anthracite-800 border-anthracite-800 text-ivory-50 shadow-md'
                        : 'bg-ivory-100 border-anthracite-50 text-anthracite-400 hover:bg-anthracite-100 hover:text-anthracite-600'
                        }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-anthracite-400 uppercase tracking-widest mb-2">Содержание / Главные мысли</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Вставьте сюда конспект или ключевые идеи..."
                  className="w-full bg-ivory-100 border border-anthracite-100 rounded-xl p-4 text-anthracite-900 placeholder-anthracite-200 h-40 resize-none focus:ring-2 focus:ring-anthracite-800/20 focus:border-anthracite-800 outline-none transition-all font-medium leading-relaxed"
                />
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 rounded-xl border border-anthracite-100 text-anthracite-400 font-bold hover:bg-anthracite-50 transition-colors uppercase tracking-widest text-xs"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddKnowledge}
                  disabled={!newTitle || !newContent}
                  className="flex-1 py-4 rounded-xl bg-anthracite-800 text-ivory-50 font-black hover:bg-anthracite-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-anthracite-900/20 uppercase tracking-widest text-xs active:scale-95"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- VIEW / EDIT KNOWLEDGE MODAL --- */}
      {selectedItem && (
        <div className="fixed inset-0 bg-anthracite-950/40 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-ivory-50/70 backdrop-blur-2xl border border-white/40 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300 overflow-hidden text-anthracite-900">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/20 flex justify-between items-start flex-shrink-0 bg-white/10 rounded-t-3xl backdrop-blur-md">
              <div>
                <div className="flex gap-2 mb-2">
                  <span className="bg-anthracite-800/10 text-anthracite-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-anthracite-800/20 uppercase tracking-widest">{selectedItem.type}</span>
                  <span className="text-[10px] text-anthracite-400 font-bold uppercase tracking-widest flex items-center gap-1">
                    Создано: {new Date(selectedItem.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-3xl font-black text-anthracite-900 tracking-tight">{selectedItem.title}</h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-anthracite-300 hover:text-anthracite-800 p-2 hover:bg-anthracite-50 rounded-xl transition-all"
              >
                <XIcon className="w-7 h-7" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-8 min-h-0 bg-ivory-100/30 custom-scrollbar">
              {isFullEditMode ? (
                <textarea
                  value={fullEditContent}
                  onChange={(e) => setFullEditContent(e.target.value)}
                  className="w-full h-full min-h-[400px] bg-ivory-50 border border-anthracite-100 rounded-2xl p-6 text-anthracite-900 focus:ring-2 focus:ring-anthracite-800/20 focus:border-anthracite-800 outline-none resize-none font-medium leading-relaxed text-sm shadow-inner"
                />
              ) : (
                <div className="prose prose-anthracite prose-sm max-w-none text-anthracite-800/90 whitespace-pre-wrap leading-relaxed font-medium">
                  <ReactMarkdown>{selectedItem.content}</ReactMarkdown>
                </div>
              )}
            </div>

            {/* Modal Footer - Actions */}
            <div className="p-6 border-t border-anthracite-800/10 bg-ivory-50 rounded-b-3xl flex-shrink-0">
              {isFullEditMode ? (
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setIsFullEditMode(false)}
                    className="px-6 py-3 text-anthracite-400 font-bold uppercase tracking-widest text-xs hover:text-anthracite-600 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSaveFullEdit}
                    className="px-8 py-3 bg-anthracite-800 text-ivory-50 rounded-xl hover:bg-anthracite-700 font-black uppercase tracking-widest text-xs shadow-lg shadow-anthracite-900/20 active:scale-95"
                  >
                    Сохранить изменения
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="relative group">
                    <textarea
                      value={insightText}
                      onChange={(e) => setInsightText(e.target.value)}
                      placeholder="Добавить новый инсайт..."
                      className="w-full bg-ivory-100/80 border border-anthracite-100 rounded-2xl p-4 pr-16 text-anthracite-900 placeholder-anthracite-200 focus:ring-2 focus:ring-anthracite-800/20 focus:border-anthracite-800 outline-none resize-none h-24 text-sm font-medium transition-all shadow-inner"
                    />
                    <button
                      onClick={handleAppendInsight}
                      disabled={!insightText.trim()}
                      className="absolute right-3 bottom-3 p-3 bg-anthracite-800 hover:bg-anthracite-700 disabled:bg-anthracite-100 disabled:text-anthracite-200 text-ivory-50 rounded-xl transition-all shadow-md active:scale-95"
                      title="Добавить"
                    >
                      <SendIcon className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex justify-between items-center px-2">
                    <button
                      onClick={() => {
                        setIsFullEditMode(true);
                        setFullEditContent(selectedItem.content);
                      }}
                      className="text-[10px] text-anthracite-400 font-black uppercase tracking-widest hover:text-anthracite-800 flex items-center gap-2 transition-all group"
                    >
                      <PencilIcon className="w-3 h-3 transition-transform group-hover:rotate-12" />
                      Редактировать весь текст
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Access Security Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-anthracite-950/80 backdrop-blur-md">
          <div className="bg-ivory-100 rounded-3xl w-full max-w-md p-8 shadow-2xl border border-white/20 transform animate-in zoom-in-95 duration-300 relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-6 right-6 p-2 text-anthracite-300 hover:text-anthracite-600 transition-colors active:scale-95"
            >
              <XIcon className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-anthracite-800 rounded-2xl flex items-center justify-center shadow-lg">
                <LockIcon className="text-white w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-anthracite-900 uppercase tracking-tighter">Доступ к Мозгу</h3>
                <p className="text-anthracite-500 font-bold text-xs uppercase tracking-widest">Безопасная синхронизация</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-anthracite-400 uppercase tracking-widest mb-1.5 ml-1">Brain ID (Ваш логин)</label>
                <input
                  type="text"
                  value={authId}
                  onChange={(e) => setAuthId(e.target.value)}
                  placeholder="Введите уникальный ID"
                  className="w-full bg-white border-2 border-anthracite-100 rounded-2xl px-5 py-4 focus:outline-none focus:border-anthracite-600 transition-all font-bold text-anthracite-900 shadow-inner caret-anthracite-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-anthracite-400 uppercase tracking-widest mb-1.5 ml-1">Пароль</label>
                <div className="relative">
                  <input
                    type={showAuthPassword ? "text" : "password"}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Придумайте пароль"
                    className="w-full bg-white border-2 border-anthracite-100 rounded-2xl px-5 py-4 pr-12 focus:outline-none focus:border-anthracite-600 transition-all font-bold text-anthracite-900 shadow-inner caret-anthracite-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAuthPassword(!showAuthPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-anthracite-400 hover:text-anthracite-600 transition-colors"
                  >
                    {showAuthPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="bg-anthracite-50 p-4 rounded-2xl border border-anthracite-100">
                <p className="text-[11px] text-anthracite-600 font-medium leading-relaxed italic">
                  * Если ID новый — создастся новый аккаунт. <br />
                  * Если ID существует — потребуется пароль.
                </p>
              </div>

              <button
                onClick={handleLogin}
                disabled={isSyncing}
                className="w-full bg-anthracite-800 text-white rounded-2xl py-4 font-black uppercase tracking-widest hover:bg-anthracite-900 transition-all shadow-xl hover:shadow-anthracite-200/50 disabled:opacity-50 mt-4"
              >
                {isSyncing ? 'Проверка...' : 'Войти в систему'}
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
};

export default App;