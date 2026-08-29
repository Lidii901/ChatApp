import React from 'react';
import { Character } from '../types';
import { Edit3, MessageCircle, Plus, Trash2 } from 'lucide-react';

interface CharacterListViewProps {
  characters: Character[];
  onSelectCharacterToChat: (characterId: string) => void;
  onEditCharacter: (character: Character) => void;
  onCreateNewCharacter: () => void;
  onDeleteCharacter: (characterId: string) => void;
}

const fallbackAvatar = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80';

function previewText(character: Character): string {
  const description = character.description !== undefined ? character.description : character.appearance;
  return description || character.personality || 'Noch keine Charakterbeschreibung.';
}

export const CharacterListView: React.FC<CharacterListViewProps> = ({
  characters,
  onSelectCharacterToChat,
  onEditCharacter,
  onCreateNewCharacter,
  onDeleteCharacter,
}) => {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#09090b] text-zinc-100">
      <div className="flex items-end justify-between gap-4 px-5 pb-4 pt-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-400/80">Deine Figuren</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white">Charaktere</h1>
        </div>
        <button
          onClick={onCreateNewCharacter}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg active:scale-95"
          aria-label="Neuer Charakter"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {characters.map(character => (
            <article
              key={character.id}
              className="group relative aspect-[3/4.35] overflow-hidden rounded-[26px] bg-zinc-900 shadow-xl ring-1 ring-zinc-900"
            >
              <button
                onClick={() => onSelectCharacterToChat(character.id)}
                className="absolute inset-0 z-0 h-full w-full text-left"
              >
                <img
                  src={character.avatarUrl || fallbackAvatar}
                  alt={character.name}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3.5">
                  <h2 className="truncate text-lg font-black text-white">{character.name}</h2>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-300">{previewText(character)}</p>
                  <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-rose-300">
                    <MessageCircle className="h-3.5 w-3.5" /> Chat öffnen
                  </div>
                </div>
              </button>

              <div className="absolute right-2.5 top-2.5 z-10 flex gap-1.5">
                <button
                  onClick={() => onEditCharacter(character)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-colors hover:bg-black/80"
                  aria-label={`${character.name} bearbeiten`}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Möchtest du den Charakter „${character.name}“ wirklich löschen?`)) {
                      onDeleteCharacter(character.id);
                    }
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-zinc-300 backdrop-blur-md transition-colors hover:bg-rose-950/80 hover:text-rose-300"
                  aria-label={`${character.name} löschen`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          ))}

          <button
            onClick={onCreateNewCharacter}
            className="flex aspect-[3/4.35] flex-col items-center justify-center rounded-[26px] border border-dashed border-zinc-800 bg-zinc-950/40 px-4 text-center text-zinc-500 transition-colors hover:border-rose-500/50 hover:text-zinc-300"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900"><Plus className="h-5 w-5" /></span>
            <span className="mt-3 text-sm font-bold">Neuer Charakter</span>
            <span className="mt-1 text-[10px] leading-relaxed">Character Card V2 anlegen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
