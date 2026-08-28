import React from 'react';

interface TypingIndicatorProps {
  characterName?: string;
  avatarUrl?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  characterName = 'Charakter',
  avatarUrl,
}) => {
  return (
    <div
      id="chat-typing-indicator"
      className="flex items-center gap-3 px-4 py-2.5 text-xs text-zinc-400"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 font-serif text-xs font-semibold text-zinc-300 shrink-0 overflow-hidden">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={characterName}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          characterName.substring(0, 2).toUpperCase()
        )}
      </div>
      <div className="flex items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/90 px-3.5 py-2">
        <span className="font-serif italic text-zinc-300">{characterName} schreibt …</span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-rose-400 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-rose-400 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-rose-400" />
        </span>
      </div>
    </div>
  );
};

