import React from 'react';

export const TypingIndicator: React.FC = () => {
  return (
    <div
      id="dean-typing-indicator"
      className="flex items-center gap-3 px-4 py-2.5 text-xs text-zinc-400"
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 font-serif text-xs font-semibold text-zinc-300">
        DS
      </div>
      <div className="flex items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/90 px-3.5 py-2">
        <span className="font-serif italic text-zinc-300">Dean schreibt</span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
        </span>
      </div>
    </div>
  );
};
