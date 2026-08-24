import React from 'react';
import { Character } from '../types';
import { Users, Plus, Edit2, MessageSquare, Trash2, Check, Sparkles } from 'lucide-react';

interface CharacterListModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters: Character[];
  activeCharacterId: string;
  onSelectCharacter: (charId: string) => void;
  onCreateNewCharacter: () => void;
  onEditCharacter: (char: Character) => void;
  onDeleteCharacter: (charId: string) => void;
  chatCounts: Record<string, number>;
}

export const CharacterListModal: React.FC<CharacterListModalProps> = ({
  isOpen,
  onClose,
  characters,
  activeCharacterId,
  onSelectCharacter,
  onCreateNewCharacter,
  onEditCharacter,
  onDeleteCharacter,
  chatCounts,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="character-list-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-rose-400" />
            <h2 className="text-base font-semibold text-zinc-100">Meine Charaktere</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          >
            ✕
          </button>
        </div>

        <p className="mt-2 text-xs text-zinc-400">
          Wähle einen Charakter aus oder erstelle eine neue Figur. Jeder Charakter besitzt vollständig getrennte Einstellungen, Chats, Start-Prompts und Erinnerungen.
        </p>

        {/* Character List */}
        <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
          {characters.map((char) => {
            const isSelected = char.id === activeCharacterId;
            const numChats = chatCounts[char.id] || 0;

            return (
              <div
                key={char.id}
                className={`group relative flex flex-col gap-3 rounded-xl border p-4 transition-all ${
                  isSelected
                    ? 'border-rose-500/50 bg-gradient-to-r from-zinc-900 via-zinc-900 to-rose-950/20 ring-1 ring-rose-500/30'
                    : 'border-zinc-800/80 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-start justify-between">
                  {/* Left: Avatar & Info */}
                  <div
                    onClick={() => {
                      onSelectCharacter(char.id);
                      onClose();
                    }}
                    className="flex flex-1 cursor-pointer items-center gap-3.5"
                  >
                    {char.avatarUrl ? (
                      <img
                        src={char.avatarUrl}
                        alt={char.name}
                        referrerPolicy="no-referrer"
                        className="h-12 w-12 rounded-full object-cover ring-2 ring-zinc-700 shadow-md"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-base font-bold text-zinc-200 ring-2 ring-zinc-700">
                        {char.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-100">{char.name}</span>
                        {isSelected && (
                          <span className="flex items-center gap-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-medium text-rose-300 ring-1 ring-rose-500/30">
                            <Check className="h-3 w-3" /> Aktiv
                          </span>
                        )}
                      </div>
                      <p className="line-clamp-1 text-xs text-zinc-400 mt-0.5">
                        {char.personality}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-500">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" /> {numChats} {numChats === 1 ? 'Chat' : 'Chats'}
                        </span>
                        <span>•</span>
                        <span>Dominanz: {char.dominanceLevel}</span>
                        <span>•</span>
                        <span>Anrede: {char.playerAddressName || 'Lidii'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 pl-2">
                    <button
                      onClick={() => onEditCharacter(char)}
                      className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                      title="Charakter bearbeiten"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {characters.length > 1 && (
                      <button
                        onClick={() => onDeleteCharacter(char.id)}
                        className="rounded-lg p-2 text-zinc-500 hover:bg-rose-950 hover:text-rose-400"
                        title="Charakter löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex items-center justify-between border-t border-zinc-800 pt-3">
          <button
            onClick={onCreateNewCharacter}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:from-rose-500 hover:to-rose-600"
          >
            <Plus className="h-4 w-4" />
            <span>Neuen Charakter erstellen</span>
          </button>
          <button
            onClick={onClose}
            className="rounded-xl bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
          >
            Schliessen
          </button>
        </div>
      </div>
    </div>
  );
};
