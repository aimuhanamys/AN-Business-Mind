import React, { ReactNode, useState } from 'react';
import { BrainIcon, ChatIcon, BookIcon, LockIcon, MenuIcon, XIcon } from './Icons';

interface LayoutProps {
  children: ReactNode;
  activeTab: 'chat' | 'knowledge';
  onTabChange: (tab: 'chat' | 'knowledge') => void;
  sessionList?: ReactNode;
  isSyncing?: boolean;
  userId?: string;
  onSecurityClick?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, sessionList, isSyncing, userId, onSecurityClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleTabSelect = (tab: 'chat' | 'knowledge') => {
    onTabChange(tab);
    setIsMenuOpen(false);
  };

  const handleSecurityClick = () => {
    if (onSecurityClick) onSecurityClick();
    setIsMenuOpen(false);
  };

  return (
    <div className="h-screen flex bg-ivory-200 text-anthracite-900 font-sans selection:bg-anthracite-200 overflow-hidden">
      {/* Mobile Backdrop */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-anthracite-950/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative h-full z-50 md:z-10
        w-72 md:w-64 flex flex-col flex-shrink-0 
        bg-anthracite-800/95 backdrop-blur-2xl text-ivory-100 
        transition-all duration-300 ease-in-out shadow-2xl
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-ivory-300/20 backdrop-blur-md rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg border border-white/10">
              <BrainIcon className="text-ivory-100 w-5 h-5" />
            </div>
            <span className="font-bold text-lg text-white/90">
              AN Mind
            </span>
          </div>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="md:hidden p-2 text-anthracite-400 hover:text-white transition-colors"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <button
            onClick={() => handleTabSelect('chat')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'chat'
              ? 'bg-anthracite-700 text-ivory-50 shadow-md transform scale-[1.02]'
              : 'text-anthracite-200 hover:text-ivory-100 hover:bg-anthracite-700/50'
              }`}
          >
            <ChatIcon className="w-5 h-5" />
            <span className="font-medium">Чат с ИИ</span>
          </button>

          <button
            onClick={() => handleTabSelect('knowledge')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'knowledge'
              ? 'bg-anthracite-700 text-ivory-50 shadow-md transform scale-[1.02]'
              : 'text-anthracite-200 hover:text-ivory-100 hover:bg-anthracite-700/50'
              }`}
          >
            <BookIcon className="w-5 h-5" />
            <span className="font-medium">Второй Мозг</span>
          </button>

          <button
            onClick={handleSecurityClick}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-anthracite-200 hover:text-ivory-100 hover:bg-anthracite-700/50 mt-4 border border-white/5"
          >
            <LockIcon className="w-5 h-5" />
            <span className="font-medium">Доступ</span>
          </button>

          {/* Session List (Mobile Visible in Sidebar) */}
          {activeTab === 'chat' && sessionList && (
            <div className="mt-6 pt-6 border-t border-white/10 lg:hidden text-left">
              <p className="text-[10px] text-anthracite-400 font-bold uppercase tracking-widest px-4 mb-2">Чаты</p>
              {sessionList}
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-anthracite-700/50 space-y-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] text-anthracite-400 font-bold uppercase tracking-widest">Brain ID:</span>
            <span className="text-[10px] text-ivory-300 font-mono font-bold bg-anthracite-700 px-1.5 py-0.5 rounded truncate max-w-[120px]">{userId || 'Loading...'}</span>
          </div>
          <div className="flex items-center gap-2 px-2">
            <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-emerald-400 animate-pulse' : 'bg-anthracite-500'}`} />
            <span className="text-[10px] text-anthracite-400 font-bold uppercase tracking-widest">
              {isSyncing ? 'Syncing...' : 'Cloud Synced'}
            </span>
          </div>
        </div>

        <div className="p-4 border-t border-anthracite-700/50 text-[10px] text-anthracite-300 text-center uppercase tracking-tighter font-black">
          AN Business Mind 0.1.0
        </div>
      </aside>

      {/* Session List (Desktop Desktop only, shown next to sidebar) */}
      {activeTab === 'chat' && sessionList && (
        <div className="hidden lg:block w-72 flex-shrink-0 border-r border-white/10 overflow-hidden bg-ivory-100/30">
          {sessionList}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 h-full overflow-hidden relative bg-ivory-300/30 flex flex-col">
        {/* Mobile Header with Menu Toggle */}
        <div className="md:hidden p-4 flex items-center gap-3 border-b border-black/5 bg-ivory-50/80 backdrop-blur-lg sticky top-0 z-30">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 -ml-2 text-anthracite-800 active:scale-95 transition-transform"
          >
            <MenuIcon className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-anthracite-800 rounded flex items-center justify-center">
              <BrainIcon className="text-white w-4 h-4" />
            </div>
            <span className="font-black text-sm uppercase tracking-tighter">AN Mind</span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
};
