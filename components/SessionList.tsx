import React from 'react';
import { ChatSession } from '../types';
import { PlusIcon, XIcon } from './Icons';

interface SessionListProps {
    sessions: ChatSession[];
    activeSessionId: string | null;
    onSelectSession: (id: string) => void;
    onNewSession: () => void;
    onDeleteSession: (id: string) => void;
}

export const SessionList: React.FC<SessionListProps> = ({
    sessions,
    activeSessionId,
    onSelectSession,
    onNewSession,
    onDeleteSession
}) => {
    return (
        <div className="flex flex-col h-full bg-anthracite-900 border-r border-white/10 w-64 flex-shrink-0 shadow-inner relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-anthracite-800/20 to-transparent pointer-events-none" />
            <div className="p-4 border-b border-white/5 relative z-10">
                <button
                    onClick={onNewSession}
                    className="w-full flex items-center justify-center gap-2 bg-anthracite-600/80 backdrop-blur-md hover:bg-anthracite-500 text-ivory-50 font-medium py-2 px-4 rounded-lg transition-all shadow-lg border border-white/10 active:scale-95"
                >
                    <PlusIcon className="w-5 h-5" />
                    Новый чат
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {sessions.map((session) => (
                    <div
                        key={session.id}
                        className={`group relative flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${activeSessionId === session.id
                            ? 'bg-anthracite-700 text-ivory-50 shadow-md'
                            : 'text-anthracite-300 hover:bg-anthracite-800/80 hover:text-ivory-200'
                            }`}
                        onClick={() => onSelectSession(session.id)}
                    >
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{session.title}</p>
                            <p className="text-[10px] opacity-60 uppercase tracking-wider font-semibold">{session.persona}</p>
                        </div>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSession(session.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-anthracite-600 rounded transition-all text-anthracite-400 hover:text-ivory-50"
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="p-4 border-t border-anthracite-700/50">
                <div className="flex items-center gap-2 px-2">
                    <div className="w-2 h-2 bg-ivory-400 rounded-full animate-pulse" />
                    <span className="text-xs text-anthracite-400 font-medium uppercase tracking-widest">AN Mind Online</span>
                </div>
            </div>
        </div>
    );
};
