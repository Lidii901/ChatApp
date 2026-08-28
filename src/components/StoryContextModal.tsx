import React, { useEffect, useState } from 'react';
import { BookOpen, RefreshCw, Save, X } from 'lucide-react';
import { StoryContext } from '../types';

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
  const [currentScene, setCurrentScene] = useState('');
  const [sceneSummary, setSceneSummary] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setCurrentScene(context.currentScene || '');
    setSceneSummary(context.sceneSummary || '');
  }, [isOpen, context]);

  if (!isOpen) return null;

  const save = () => {
    onUpdateContext({ ...context, currentScene: currentScene.trim(), sceneSummary: sceneSummary.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-[30px] border border-zinc-800 bg-[#0b0b0d] shadow-2xl sm:max-w-lg sm:rounded-[28px]" onClick={event => event.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-zinc-900 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-950/30 text-rose-400"><BookOpen className="h-5 w-5" /></span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-400">Chat Memory</p>
              <h2 className="text-base font-black text-white">{characterName}</h2>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full bg-zinc-900 p-2 text-zinc-400"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <div className="rounded-2xl border border-rose-900/25 bg-rose-950/10 p-4 text-xs leading-relaxed text-zinc-400">
            Die Zusammenfassung ist der eigentliche Chat-Memory-Kontext. Sie wird zusätzlich zum aktuellen Chatverlauf an das Modell gesendet. So bleibt Entwicklung erhalten, ohne Charaktereigenschaften künstlich über versteckte Regler zu verändern.
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-black text-zinc-300">Aktuelle Szene</span>
            <textarea rows={3} value={currentScene} onChange={e => setCurrentScene(e.target.value)} className="memory-input" placeholder="Ort / momentaner Zustand der Szene" />
            <span className="block text-[10px] leading-relaxed text-zinc-600">Dient der App zur Orientierung und Szenenanzeige. Dauerhafte relevante Entwicklung gehört in die Chat-Memory-Zusammenfassung.</span>
          </label>

          <label className="block space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-black text-zinc-300">Chat-Memory-Zusammenfassung</span>
              <button onClick={onTriggerSummarize} disabled={isSummarizing} className="flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-2 text-[10px] font-bold text-rose-300 disabled:opacity-50">
                <RefreshCw className={`h-3.5 w-3.5 ${isSummarizing ? 'animate-spin' : ''}`} />
                {isSummarizing ? 'Aktualisiert …' : 'KI aktualisieren'}
              </button>
            </div>
            <textarea rows={10} value={sceneSummary} onChange={e => setSceneSummary(e.target.value)} className="memory-input" placeholder="Was aus dem bisherigen Chat für die Fortsetzung wichtig bleibt …" />
          </label>

          {(context.memories?.length || context.keyEvents?.length) ? (
            <details className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 text-xs text-zinc-500">
              <summary className="cursor-pointer font-bold text-zinc-400">Bestehende Legacy-Notizen anzeigen</summary>
              <p className="mt-2 text-[10px] leading-relaxed text-zinc-600">Diese alten App-Notizen bleiben gespeichert, werden aber nicht mehr als eigenes verstecktes Prompt-System behandelt. Relevante Punkte sollten in die Chat-Memory-Zusammenfassung übernommen werden.</p>
              <div className="mt-3 space-y-2">
                {(context.keyEvents || []).map((item, index) => <div key={`event-${index}`} className="rounded-xl bg-zinc-900/70 p-2.5">{item}</div>)}
                {(context.memories || []).map(item => <div key={item.id} className="rounded-xl bg-zinc-900/70 p-2.5">{item.content}</div>)}
              </div>
            </details>
          ) : null}
        </div>

        <footer className="flex justify-end border-t border-zinc-900 px-5 py-4">
          <button onClick={() => { save(); onClose(); }} className="flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-black text-white"><Save className="h-4 w-4" /> Übernehmen</button>
        </footer>

        <style>{`
          .memory-input { width:100%; border:1px solid rgb(39 39 42); border-radius:.9rem; background:rgb(24 24 27 / .78); padding:.8rem .9rem; color:rgb(244 244 245); outline:none; }
          .memory-input:focus { border-color:rgb(244 63 94 / .65); }
        `}</style>
      </div>
    </div>
  );
};
