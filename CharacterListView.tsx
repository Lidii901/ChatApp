import React, { useState } from 'react';
import { Character } from '../types';
import {
  Users,
  Plus,
  Edit3,
  MessageSquare,
  Trash2,
  Sparkles,
  Shield,
  Heart,
  Flame,
  Brain,
  Camera,
  Layers,
  Smile
} from 'lucide-react';

interface CharacterListViewProps {
  characters: Character[];
  onSelectCharacterToChat: (characterId: string) => void;
  onEditCharacter: (character: Character) => void;
  onCreateNewCharacter: () => void;
  onDeleteCharacter: (characterId: string) => void;
}

export const CharacterListView: React.FC<CharacterListViewProps> = ({
  characters,
  onSelectCharacterToChat,
  onEditCharacter,
  onCreateNewCharacter,
  onDeleteCharacter,
}) => {
  const [selectedPreviewChar, setSelectedPreviewChar] = useState<Character | null>(characters[0] || null);

  return (
    <div className="flex h-full flex-col bg-zinc-950 text-zinc-100 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/85 px-4 py-3.5 backdrop-blur-md">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-zinc-100 flex items-center gap-2">
            <span className="bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">Meine Charaktere</span>
          </h1>
          <p className="text-[11px] text-zinc-400">
            {characters.length} {characters.length === 1 ? 'dauerhaftes Profil' : 'dauerhafte Profile'}
          </p>
        </div>

        <button
          onClick={onCreateNewCharacter}
          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-3.5 py-2 text-xs font-semibold text-white shadow-md transition-all hover:from-rose-500 hover:to-rose-600 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Neuer Charakter</span>
        </button>
      </div>

      {/* Grid of Character Cards */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {characters.map((char) => {
          const isDean = char.id === 'char-dean';

          return (
            <div
              key={char.id}
              className="flex flex-col justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/60 shadow-lg relative overflow-hidden"
            >
              {/* Top Row: Avatar & Core Info */}
              <div>
                <div className="flex items-start gap-3.5">
                  <div className="relative shrink-0">
                    <img
                      src={char.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'}
                      alt={char.name}
                      referrerPolicy="no-referrer"
                      className="h-16 w-16 rounded-2xl object-cover ring-2 ring-zinc-700/80 shadow-md"
                    />
                    {isDean && (
                      <span className="absolute -top-1.5 -right-1.5 rounded-full bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                        Haupt
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-zinc-100 truncate">{char.name}</h2>
                      {char.age && (
                        <span className="text-xs text-zinc-400 font-medium">{char.age} Jahre</span>
                      )}
                    </div>

                    {/* Trait Chips */}
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <span className="rounded-md bg-zinc-800/90 px-2 py-0.5 text-[10px] font-medium text-rose-300 border border-zinc-700/60">
                        {char.dominanceLevel || 'dominant'}
                      </span>
                      <span className="rounded-md bg-zinc-800/90 px-2 py-0.5 text-[10px] font-medium text-zinc-300 border border-zinc-700/60">
                        Flirt: {char.flirtBehavior || 'intense'}
                      </span>
                      <span className="rounded-md bg-zinc-800/90 px-2 py-0.5 text-[10px] font-medium text-zinc-300 border border-zinc-700/60">
                        Initiative: {char.initiativeLevel || 'high'}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {char.personality || char.appearance || 'Keine Beschreibung hinterlegt.'}
                    </p>
                  </div>
                </div>

                {/* Additional Quick Details */}
                <div className="mt-3.5 grid grid-cols-2 gap-2 text-[11px] rounded-xl bg-zinc-950/60 p-2.5 border border-zinc-900">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Anrede</span>
                    <span className="text-zinc-200 font-medium truncate block">{char.playerAddressName || 'Lidii'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Erinnerungen</span>
                    <span className="text-zinc-200 font-medium">{char.memories?.length || 0} Einträge</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Gedanken</span>
                    <span className="text-zinc-200 font-medium">{char.thoughtsEnabled !== false ? 'Aktiviert (*kursiv*)' : 'Aus'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Foto-Frequenz</span>
                    <span className="text-zinc-200 font-medium">{char.imageFrequency || 'Gelegentlich'}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Row Actions */}
              <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onEditCharacter(char)}
                    className="flex items-center gap-1.5 rounded-xl border border-zinc-700/80 bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-zinc-400" />
                    <span>Profil bearbeiten</span>
                  </button>

                  {!isDean && (
                    <button
                      onClick={() => {
                        if (confirm(`Möchtest du den Charakter "${char.name}" unwiderruflich löschen?`)) {
                          onDeleteCharacter(char.id);
                        }
                      }}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-1.5 text-zinc-500 hover:bg-rose-950 hover:text-rose-400 transition-all"
                      title="Löschen"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => onSelectCharacterToChat(char.id)}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-4 py-1.5 text-xs font-semibold text-white shadow-md hover:from-rose-500 transition-all active:scale-95"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Chat starten</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
