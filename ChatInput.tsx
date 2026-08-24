import React, { useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { Character, ChatLanguage } from '../types';

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  onSend: () => void;
  onImitateMe: () => void;
  isGenerating: boolean;
  isImitating: boolean;
  character: Character;
  language: ChatLanguage;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  onImitateMe,
  isGenerating,
  isImitating,
  character,
  language,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const playerName = character.playerAddressName || 'Lidii';
  const isGerman = language === 'de';

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isGenerating) {
        onSend();
      }
    }
  };

  return (
    <div
      id="chat-input-container"
      className="sticky bottom-0 z-20 border-t border-zinc-800/80 bg-zinc-950/95 p-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] backdrop-blur-lg"
    >
      {/* Quick action bar */}
      <div className="mb-1.5 flex items-center justify-between px-1">
        <button
          id="imitate-me-quick-btn"
          onClick={onImitateMe}
          disabled={isGenerating || isImitating}
          className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/30 px-3 py-1 text-[11.5px] font-medium text-amber-300 transition-all hover:border-amber-500/50 hover:bg-amber-900/40 active:scale-95 disabled:opacity-40"
          title={`Schreibstil analysieren und Entwurf für ${playerName} erstellen`}
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>Imitate me</span>
        </button>

        <div className="flex items-center gap-2 text-[10px] text-zinc-400">
          <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[9px] uppercase text-zinc-400 border border-zinc-800">
            {isGerman ? 'Deutsch' : 'English'}
          </span>
          <span>
            Als <span className="font-semibold text-rose-300">{playerName}</span> schreiben
          </span>
        </div>
      </div>

      {/* Input box */}
      <div className="relative flex items-end gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-1.5 shadow-inner focus-within:border-zinc-700">
        <textarea
          id="chat-user-textarea"
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isGerman
              ? `Schreibe deinen nächsten Spielzug als ${playerName} … (Enter zum Senden)`
              : `Write your next turn as ${playerName} … (Enter to send)`
          }
          rows={1}
          disabled={isGenerating}
          className="max-h-40 min-h-[42px] w-full resize-none bg-transparent px-3 py-2 text-sm leading-relaxed text-zinc-100 placeholder-zinc-500 focus:outline-none disabled:opacity-50"
        />

        <button
          id="send-message-btn"
          onClick={onSend}
          disabled={!input.trim() || isGenerating}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900 shadow transition-all hover:bg-white active:scale-95 disabled:opacity-30 disabled:hover:bg-zinc-100"
          title="Nachricht senden"
          aria-label="Senden"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
