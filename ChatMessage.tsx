import React, { useState } from 'react';
import { Message, Character } from '../types';
import { Copy, Check, Edit2, Trash2, Sparkles, Image as ImageIcon, Maximize2, X } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  character: Character;
  onEditMessage?: (id: string, newContent: string) => void;
  onDeleteMessage?: (id: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  character,
  onEditMessage,
  onDeleteMessage,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);

  const isUser = message.role === 'lidii';
  const speakerName = isUser
    ? (character.playerAddressName || 'Lidii')
    : (message.speakerName || character.name || 'Dean');

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (onEditMessage && editContent.trim()) {
      onEditMessage(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Convert text with *italics* and bold markdown cleanly, removing asterisks
  const renderFormattedLine = (line: string) => {
    const parts = [];
    let keyIdx = 0;

    // Match bold (**text**) or italic (*text*)
    const tokenRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
    let match;
    let lastIndex = 0;

    while ((match = tokenRegex.exec(line)) !== null) {
      // Text before match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`txt-${keyIdx++}`}>{line.substring(lastIndex, match.index)}</span>
        );
      }

      if (match[2]) {
        // Bold
        parts.push(
          <strong key={`b-${keyIdx++}`} className="font-semibold text-zinc-100">
            {match[2]}
          </strong>
        );
      } else if (match[3]) {
        // Italic thought (no asterisks shown!)
        parts.push(
          <em key={`em-${keyIdx++}`} className="italic text-zinc-300 font-serif text-[15px] opacity-95">
            {match[3]}
          </em>
        );
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < line.length) {
      parts.push(
        <span key={`txt-${keyIdx++}`}>{line.substring(lastIndex)}</span>
      );
    }

    return parts.length > 0 ? parts : line;
  };

  // Render text with balanced paragraphs and comfortable line spacing
  const renderParagraphs = (text: string) => {
    const paragraphs = text.split(/\n\s*\n/);
    return paragraphs.map((paragraph, index) => {
      const trimmed = paragraph.trim();
      if (!trimmed) return null;

      const lines = trimmed.split('\n');
      return (
        <p key={index} className="mb-3 text-[14.5px] leading-relaxed last:mb-0">
          {lines.map((line, lIdx) => (
            <React.Fragment key={lIdx}>
              {renderFormattedLine(line)}
              {lIdx < lines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      );
    });
  };

  return (
    <div
      id={`message-${message.id}`}
      className={`group relative flex w-full gap-2.5 px-3 py-2 ${
        isUser ? 'flex-row-reverse items-start' : 'flex-row items-start'
      }`}
    >
      {/* Avatar icon */}
      <div className="flex-shrink-0 pt-1">
        {isUser ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-rose-900 to-rose-700 text-xs font-bold text-rose-100 ring-1 ring-rose-500/30">
            {speakerName.charAt(0).toUpperCase()}
          </div>
        ) : character.avatarUrl ? (
          <img
            src={character.avatarUrl}
            alt={speakerName}
            referrerPolicy="no-referrer"
            className="h-8 w-8 rounded-full object-cover ring-1 ring-zinc-700 shadow"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-300 ring-1 ring-zinc-700">
            {speakerName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className={`flex flex-col max-w-[88%] sm:max-w-[82%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Sender Tag & Timestamp */}
        <div
          className={`mb-1 flex items-center gap-1.5 text-[11px] font-medium tracking-wide ${
            isUser ? 'text-rose-300/90' : 'text-zinc-400'
          }`}
        >
          <span className="font-semibold">{speakerName}</span>
          {message.metadata?.isImitated && (
            <span className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300 ring-1 ring-amber-500/30">
              <Sparkles className="h-2.5 w-2.5" /> Imitate Me
            </span>
          )}
          <span className="text-[10px] text-zinc-500">{formatTime(message.timestamp)}</span>
        </div>

        {/* Message Bubble Container */}
        <div
          className={`relative rounded-2xl p-4 shadow-md transition-all ${
            isUser
              ? 'rounded-tr-sm border border-rose-900/40 bg-gradient-to-br from-zinc-900 via-zinc-900 to-rose-950/40 text-zinc-100'
              : 'rounded-tl-sm border border-zinc-800/90 bg-zinc-900 text-zinc-100'
          }`}
        >
          {/* Photo preview if present */}
          {message.image && (
            <div className="mb-3 overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-950/80 shadow-md">
              <div
                className="relative cursor-pointer group/img max-h-72 overflow-hidden"
                onClick={() => setIsImageLightboxOpen(true)}
              >
                <img
                  src={message.image.url}
                  alt={message.image.caption || 'Foto'}
                  referrerPolicy="no-referrer"
                  className="w-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end p-2 justify-between">
                  <span className="text-[11px] text-zinc-200">{message.image.caption || 'Foto ansehen'}</span>
                  <Maximize2 className="h-4 w-4 text-white" />
                </div>
              </div>
              {message.image.caption && (
                <div className="p-2 text-[11px] text-zinc-400 border-t border-zinc-800/80 flex items-center justify-between">
                  <span>{message.image.caption}</span>
                  <span className="text-[9px] text-rose-400 font-semibold uppercase">Foto</span>
                </div>
              )}
            </div>
          )}

          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[120px] w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2.5 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
                rows={4}
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded px-2.5 py-1 text-zinc-400 hover:bg-zinc-800"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="rounded bg-zinc-700 px-3 py-1 font-medium text-zinc-100 hover:bg-zinc-600"
                >
                  Speichern
                </button>
              </div>
            </div>
          ) : (
            <div className="whitespace-pre-wrap font-sans text-zinc-200">
              {renderParagraphs(message.content)}
            </div>
          )}

          {/* Action icons */}
          {!isEditing && (
            <div
              className={`mt-2.5 flex items-center gap-1 border-t border-zinc-800/50 pt-1.5 text-zinc-500 opacity-60 transition-opacity group-hover:opacity-100 ${
                isUser ? 'justify-end' : 'justify-start'
              }`}
            >
              <button
                onClick={handleCopy}
                className="rounded p-1 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                title="Kopieren"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              {onEditMessage && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="rounded p-1 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                  title="Bearbeiten"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              )}
              {onDeleteMessage && (
                <button
                  onClick={() => onDeleteMessage(message.id)}
                  className="rounded p-1 transition-colors hover:bg-rose-950 hover:text-rose-400"
                  title="Löschen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Lightbox Modal for Photo */}
      {isImageLightboxOpen && message.image && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in"
          onClick={() => setIsImageLightboxOpen(false)}
        >
          <div className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsImageLightboxOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/70 p-2 text-white hover:bg-black/90"
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={message.image.url}
              alt={message.image.caption || 'Foto Vollbild'}
              referrerPolicy="no-referrer"
              className="max-h-[75vh] w-full object-contain"
            />
            {message.image.caption && (
              <div className="p-3 text-center text-xs text-zinc-300 bg-zinc-900 border-t border-zinc-800">
                {message.image.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
