import React, { ReactNode } from 'react';
import { BrainIcon, ChatIcon, BookIcon, LockIcon } from './Icons';

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
  return (
    <div className="min-h-screen flex bg-ivory-200 text-anthracite-900 font-sans selection:bg-anthracite-200">
      {/* Sidebar */}
      <aside className="w-20 md:w-64 border-r border-white/10 flex flex-col flex-shrink-0 bg-anthracite-800/90 backdrop-blur-xl text-ivory-100 flex-shrink-0 fixed md:relative h-full z-10 transition-colors shadow-2xl">
        <div className="p-6 flex items-center gap-3 border-b border-white/5">
          <div className="w-8 h-8 bg-ivory-300/20 backdrop-blur-md rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg border border-white/10">
            <BrainIcon className="text-ivory-100 w-5 h-5" />
          </div>
          <span className="font-bold text-lg hidden md:block text-white/90">
            AN Mind
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => onTabChange('chat')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'chat'
              ? 'bg-anthracite-700 text-ivory-50 shadow-md transform scale-[1.02]'
              : 'text-anthracite-200 hover:text-ivory-100 hover:bg-anthracite-700/50'
              }`}
          >
            <ChatIcon className="w-5 h-5" />
            <span className="hidden md:block font-medium">Чат с ИИ</span>
          </button>

          <button
            onClick={() => onTabChange('knowledge')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'knowledge'
              ? 'bg-anthracite-700 text-ivory-50 shadow-md transform scale-[1.02]'
              : 'text-anthracite-200 hover:text-ivory-100 hover:bg-anthracite-700/50'
              }`}
          >
            <BookIcon className="w-5 h-5" />
            <span className="hidden md:block font-medium">Второй Мозг</span>
          </button>

          <button
            onClick={onSecurityClick}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-anthracite-200 hover:text-ivory-100 hover:bg-anthracite-700/50 mt-4 border border-white/5"
          >
            <LockIcon className="w-5 h-5" />
            <span className="hidden md:block font-medium">Доступ</span>
          </button>
        </nav>

        <div className="p-4 border-t border-anthracite-700/50 space-y-2 hidden md:block">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] text-anthracite-400 font-bold uppercase tracking-widest">Brain ID:</span>
            <span className="text-[10px] text-ivory-300 font-mono font-bold bg-anthracite-700 px-1.5 py-0.5 rounded">{userId || 'Loading...'}</span>
          </div>
          <div className="flex items-center gap-2 px-2">
            <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-emerald-400 animate-pulse' : 'bg-anthracite-500'}`} />
            <span className="text-[10px] text-anthracite-400 font-bold uppercase tracking-widest">
              {isSyncing ? 'Syncing...' : 'Cloud Synced'}
            </span>
          </div>
        </div>

        <div className="p-4 border-t border-anthracite-700/50 text-[10px] text-anthracite-300 hidden md:block text-center uppercase tracking-tighter font-black">
          AN Business Mind 0.0.1
        </div>
      </aside>

      {/* Session List (Mobile Hidden / Tablet+ Show) */}
      {activeTab === 'chat' && sessionList && (
        <div className="hidden lg:block">
          {sessionList}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-hidden relative ml-20 md:ml-0 bg-ivory-300/30">
        {children}
      </main>
    </div>
  );
};
