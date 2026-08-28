import React, { useRef, useEffect, useState } from 'react';
import { Send, Sparkles, Paperclip, X, Image as ImageIcon } from 'lucide-react';
import { Character, ChatLanguage } from '../types';

interface ChatInputProps {
  input: string;
  setInput: (val: string) => void;
  attachedImage: string | null;
  setAttachedImage: (val: string | null) => void;
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
  attachedImage,
  setAttachedImage,
  onSend,
  onImitateMe,
  isGenerating,
  isImitating,
  character,
  language,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      if ((input.trim() || attachedImage) && !isGenerating) {
        onSend();
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setAttachedImage(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      id="chat-input-container"
      className="sticky bottom-0 z-20 border-t border-zinc-800/80 bg-zinc-950/95 p-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] backdrop-blur-lg"
    >
      {/* Attached image preview banner */}
      {attachedImage && (
        <div className="mb-2 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/90 p-2 text-xs text-zinc-300">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-zinc-700">
            <img
              src={attachedImage}
              alt="Attached preview"
              className="h-full w-full object-cover"
            />
            <button
              onClick={() => setAttachedImage(null)}
              className="absolute right-0.5 top-0.5 rounded-full bg-black/80 p-0.5 text-zinc-300 hover:text-white"
              title="Bild entfernen"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="flex-1 truncate">
            <span className="font-semibold text-rose-300">Foto angehängt</span>
            <p className="text-[11px] text-zinc-400 truncate">Wird mit dem nächsten Spielzug gesendet</p>
          </div>
        </div>
      )}

      {/* Quick action bar / discreet imitate status */}
      <div className="mb-1.5 flex items-center justify-between px-1">
        <button
          id="imitate-me-quick-btn"
          onClick={onImitateMe}
          disabled={isGenerating || isImitating}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all active:scale-95 disabled:opacity-40 ${
            isImitating
              ? 'border-amber-500/60 bg-amber-950/50 text-amber-200'
              : 'border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:border-amber-500/40 hover:text-amber-300 hover:bg-zinc-800'
          }`}
          title="KI-Entwurf aus deiner Perspektive formulieren"
        >
          <Sparkles className={`h-3 w-3 ${isImitating ? 'animate-spin text-amber-400' : 'text-zinc-400'}`} />
          <span>{isImitating ? 'Formuliere Entwurf …' : 'Imitate Me'}</span>
        </button>

        {isImitating && (
          <span className="text-[11px] text-amber-400/80 animate-pulse font-normal">
            Entwurf wird erstellt …
          </span>
        )}
      </div>

      {/* Input box with attachment button and send */}
      <div className="relative flex items-end gap-1.5 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-1.5 shadow-inner focus-within:border-zinc-700">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
          title="Bild oder Foto anhängen"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <textarea
          id="chat-user-textarea"
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isGerman ? 'Schreibe eine Nachricht …' : 'Write a message …'}
          rows={1}
          disabled={isGenerating}
          className="max-h-40 min-h-[40px] w-full resize-none bg-transparent px-2.5 py-2 text-sm leading-relaxed text-zinc-100 placeholder-zinc-500 focus:outline-none disabled:opacity-50"
        />

        <button
          id="send-message-btn"
          onClick={onSend}
          disabled={(!input.trim() && !attachedImage) || isGenerating}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-600 text-white shadow-lg shadow-rose-950/60 transition-all hover:bg-rose-500 active:scale-95 disabled:opacity-30 disabled:hover:bg-rose-600"
          title="Nachricht senden"
          aria-label="Senden"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
