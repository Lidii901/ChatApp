import React, { useState } from 'react';
import { X, BookOpen, Plus, Trash2, RefreshCw } from 'lucide-react';
import { StoryContext, MemoryItem } from '../types';

interface StoryContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: StoryContext;
  onUpdateContext: (updated: StoryContext) => void;
  onTriggerSummarize: () => void;
  isSummarizing: boolean;
  characterName: string;
}

export const StoryContextModal: React.FC<StoryContextModalProps> = ({
  isOpen,
  onClose,
  context,
  onUpdateContext,
  onTriggerSummarize,
  isSummarizing,
  characterName,
}) => {
  const [currentScene, setCurrentScene] = useState(context.currentScene || '');
  const [sceneSummary, setSceneSummary] = useState(context.sceneSummary || '');
  const [newMemory, setNewMemory] = useState('');
  const [newCategory, setNewCategory] = useState<'plot' | 'detail' | 'trait' | 'relationship'>('detail');

  if (!isOpen) return null;

  const memories = context.memories || [];

  const handleSaveSceneAndSummary = () => {
    onUpdateContext({
      ...context,
      currentScene,
      sceneSummary,
    });
  };

  const handleAddMemory = () => {
    if (!newMemory.trim()) return;
    const newItem: MemoryItem = {
      id: `mem-${Date.now()}`,
      category: newCategory,
      content: newMemory.trim(),
      createdAt: Date.now(),
    };
    onUpdateContext({
      ...context,
      memories: [...memories, newItem],
    });
    setNewMemory('');
  };

  const handleDeleteMemory = (id: string) => {
    onUpdateContext({
      ...context,
      memories: memories.filter((m) => m.id !== id),
    });
  };

  return (
    <div
      id="story-context-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-rose-400" />
            <h2 className="text-base font-semibold text-zinc-100">
              Story-Kontext ({characterName})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
            title="Schliessen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs leading-relaxed text-zinc-300">
          {/* Current Scene Location */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-semibold text-zinc-200">Aktueller Szenen-Ort & Zustand</span>
            </div>
            <textarea
              value={currentScene}
              onChange={(e) => setCurrentScene(e.target.value)}
              onBlur={handleSaveSceneAndSummary}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-rose-500 focus:outline-none"
              rows={3}
            />
          </div>

          {/* Running Scene Summary */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="font-semibold text-zinc-200">Laufende Szenen-Zusammenfassung</span>
              <button
                onClick={onTriggerSummarize}
                disabled={isSummarizing}
                className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-1 text-[11px] text-rose-300 hover:bg-zinc-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${isSummarizing ? 'animate-spin' : ''}`} />
                <span>KI-Aktualisieren</span>
              </button>
            </div>
            <textarea
              value={sceneSummary}
              onChange={(e) => setSceneSummary(e.target.value)}
              onBlur={handleSaveSceneAndSummary}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 focus:border-rose-500 focus:outline-none"
              rows={3}
            />
          </div>

          {/* Key Canon Events */}
          {context.keyEvents && context.keyEvents.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
              <div className="mb-2 font-semibold text-zinc-200">
                Wichtige Story-Ereignisse dieses Chats
              </div>
              <ul className="space-y-1.5 pl-1 text-[11px] text-zinc-400">
                {context.keyEvents.map((evt, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-mono">{idx + 1}.</span>
                    <span>{evt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Chat-specific memories */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="mb-2 font-semibold text-zinc-200">Szenen-Details & Notizen</div>

            {/* List */}
            <div className="mb-3 space-y-1.5 max-h-36 overflow-y-auto">
              {memories.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800/80 bg-zinc-950/80 px-2.5 py-1.5 text-[11px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-zinc-800 px-1 py-0.5 text-[9px] uppercase tracking-wider text-zinc-400">
                      {m.category}
                    </span>
                    <span className="text-zinc-300">{m.content}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteMemory(m.id)}
                    className="text-zinc-500 hover:text-rose-400"
                    title="Löschen"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add memory form */}
            <div className="flex flex-col gap-2 border-t border-zinc-800/60 pt-2.5">
              <div className="flex gap-2">
                <select
                  value={newCategory}
                  onChange={(e: any) => setNewCategory(e.target.value)}
                  className="rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-300"
                >
                  <option value="detail">Detail</option>
                  <option value="plot">Handlung</option>
                  <option value="trait">Eigenschaft</option>
                  <option value="relationship">Beziehung</option>
                </select>
                <input
                  type="text"
                  value={newMemory}
                  onChange={(e) => setNewMemory(e.target.value)}
                  placeholder="Neues Detail ergänzen..."
                  className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none"
                />
                <button
                  onClick={handleAddMemory}
                  disabled={!newMemory.trim()}
                  className="flex items-center gap-1 rounded-lg bg-zinc-800 px-3 py-1 text-xs text-zinc-200 hover:bg-zinc-700 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Hinzufügen</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-3">
          <span className="text-[11px] text-zinc-400">
            Wird bei jeder Anfrage präzise injiziert.
          </span>
          <button
            onClick={() => {
              handleSaveSceneAndSummary();
              onClose();
            }}
            className="rounded-lg bg-zinc-800 px-4 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
          >
            Übernehmen & Schliessen
          </button>
        </div>
      </div>
    </div>
  );
};
