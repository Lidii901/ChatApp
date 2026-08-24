import React from 'react';
import { Sparkles, Send, Trash2, Edit3 } from 'lucide-react';
import { Character } from '../types';

interface ImitateDraftBoxProps {
  draft: string;
  isLoading: boolean;
  character: Character;
  onDraftChange: (text: string) => void;
  onSendDraft: () => void;
  onDiscard: () => void;
  onRegenerate: () => void;
}

export const ImitateDraftBox: React.FC<ImitateDraftBoxProps> = ({
  draft,
  isLoading,
  character,
  onDraftChange,
  onSendDraft,
  onDiscard,
  onRegenerate,
}) => {
  const playerName = character.playerAddressName || 'Lidii';

  // If loading: show only a small, discreet, unobtrusive loading indicator (no technical blocks!)
  if (isLoading) {
    return (
      <div
        id="imitate-loading-indicator"
        className="mx-3 mb-2 flex items-center justify-between rounded-xl border border-amber-500/20 bg-zinc-900/80 px-3.5 py-2 shadow-sm backdrop-blur-sm transition-all"
      >
        <div className="flex items-center gap-2.5 text-xs text-amber-300/90 font-medium">
          <Sparkles className="h-4 w-4 animate-spin text-amber-400" />
          <span>{playerName} Entwurf wird formuliert …</span>
        </div>
        <button
          onClick={onDiscard}
          className="rounded p-1 text-xs text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          title="Abbrechen"
        >
          ✕
        </button>
      </div>
    );
  }

  if (!draft) return null;

  return (
    <div
      id="imitate-draft-box"
      className="mx-3 mb-2 flex flex-col gap-2 rounded-2xl border border-amber-500/30 bg-zinc-900/95 p-3.5 shadow-xl backdrop-blur-md transition-all"
    >
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-amber-300">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>Imitate Me – Entwurf für {playerName}</span>
        </div>
        <button
          onClick={onDiscard}
          className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          title="Verwerfen"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <textarea
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        className="min-h-[100px] w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950/90 p-3 text-sm text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
        rows={4}
        placeholder={`Entwurf für ${playerName} bearbeiten …`}
      />

      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onRegenerate}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <Edit3 className="h-3 w-3" />
          <span>Neu formulieren</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onDiscard}
            className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            Verwerfen
          </button>
          <button
            onClick={onSendDraft}
            disabled={!draft.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md transition-all hover:from-amber-500 hover:to-amber-600 disabled:opacity-50"
          >
            <Send className="h-3 w-3" />
            <span>Als {playerName} senden</span>
          </button>
        </div>
      </div>
    </div>
  );
};
