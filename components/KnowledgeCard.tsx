import React from 'react';
import { KnowledgeItem } from '../types';
import { TrashIcon, PencilIcon } from './Icons';

interface Props {
  item: KnowledgeItem;
  onDelete: (id: string) => void;
  onClick: (item: KnowledgeItem) => void;
}

export const KnowledgeCard: React.FC<Props> = ({ item, onDelete, onClick }) => {
  const date = new Date(item.createdAt).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const typeColors = {
    book: 'bg-anthracite-50 text-anthracite-700 border-anthracite-200',
    note: 'bg-ivory-500/30 text-anthracite-600 border-ivory-400',
    strategy: 'bg-anthracite-800/10 text-anthracite-800 border-anthracite-300',
    observation: 'bg-ivory-400 text-anthracite-700 border-ivory-500',
  };

  return (
    <div
      onClick={() => onClick(item)}
      className="bg-ivory-100/40 backdrop-blur-lg border border-white/40 p-4 rounded-xl hover:border-anthracite-800/20 transition-all group relative cursor-pointer shadow-sm hover:shadow-xl"
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-wide shadow-sm ${typeColors[item.type]}`}>
          {item.type.toUpperCase()}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-anthracite-400 mr-2 text-xs font-medium hidden md:inline">Открыть</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="text-anthracite-300 hover:text-red-700 p-1 hover:bg-anthracite-50 rounded transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      <h3 className="text-anthracite-900 font-bold text-lg mb-2 group-hover:text-anthracite-600 transition-colors tracking-tight">{item.title}</h3>
      <p className="text-anthracite-800/70 text-sm line-clamp-3 mb-4 leading-relaxed">{item.content}</p>
      <div className="text-anthracite-400 text-[10px] uppercase font-bold tracking-widest flex justify-between items-center">
        <span>{date}</span>
        <PencilIcon className="w-3 h-3 text-anthracite-200 group-hover:text-anthracite-400 transition-colors" />
      </div>
    </div>
  );
};