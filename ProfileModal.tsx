import React from 'react';
import { X, Heart, ShieldAlert, User, BookHeart, Sparkles, Edit3, Camera, Brain, Layers } from 'lucide-react';
import { Character } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: Character;
  onOpenEdit?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, character, onOpenEdit }) => {
  if (!isOpen) return null;

  return (
    <div
      id="profile-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            {character.avatarUrl ? (
              <img
                src={character.avatarUrl}
                alt={character.name}
                referrerPolicy="no-referrer"
                className="h-11 w-11 rounded-2xl object-cover ring-2 ring-rose-500/30 shadow"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-800 font-bold text-zinc-100 ring-2 ring-zinc-700">
                {character.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                {character.name}
                {character.id === 'char-dean' && (
                  <span className="rounded bg-rose-600 px-1.5 py-0.2 text-[9px] font-bold text-white">Dean</span>
                )}
              </h2>
              <p className="text-[11px] text-zinc-400">
                {character.age ? `${character.age} Jahre • ` : ''}Anrede: <span className="text-zinc-200 font-medium">{character.playerAddressName || 'Lidii'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
            title="Schliessen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs leading-relaxed text-zinc-300">
          {/* Quick Badges */}
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-[11px] font-medium text-rose-300">
              Dominanz: {character.dominanceLevel || 'dominant'}
            </span>
            <span className="rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
              Flirt: {character.flirtBehavior || 'intense'}
            </span>
            <span className="rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
              Initiative: {character.initiativeLevel || 'high'}
            </span>
          </div>

          {/* Aussehen */}
          {character.appearance && (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-zinc-200">
                <User className="h-3.5 w-3.5 text-zinc-400" />
                <span>Aussehen & Statur</span>
              </div>
              <p className="text-zinc-300 leading-normal">{character.appearance}</p>
            </div>
          )}

          {/* Persönlichkeit */}
          {character.personality && (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-zinc-200">
                <Sparkles className="h-3.5 w-3.5 text-rose-400" />
                <span>Persönlichkeit & Wesenszüge</span>
              </div>
              <p className="text-zinc-300 leading-normal">{character.personality}</p>
            </div>
          )}

          {/* Beziehung zum Spieler */}
          {character.relationshipToPlayer && (
            <div className="rounded-xl border border-rose-900/40 bg-gradient-to-br from-zinc-900 via-zinc-900 to-rose-950/30 p-3">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-rose-300">
                <BookHeart className="h-3.5 w-3.5" />
                <span>Beziehung zu {character.playerAddressName || 'Lidii'}</span>
              </div>
              <p className="text-zinc-300 leading-normal">{character.relationshipToPlayer}</p>
            </div>
          )}

          {/* Schreibstil & Tonfall */}
          {(character.writingStyle || character.toneOfVoice) && (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3">
              <div className="mb-1 font-semibold text-zinc-200">Schreibstil & Tonfall</div>
              <p className="text-zinc-400 leading-normal">
                {character.writingStyle} {character.toneOfVoice ? `• ${character.toneOfVoice}` : ''}
              </p>
            </div>
          )}

          {/* Foto-Stil */}
          {character.imageStyleDescription && (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-zinc-200">
                <Camera className="h-3.5 w-3.5 text-rose-400" />
                <span>Visuelle Bildsprache / Foto-Stil</span>
              </div>
              <p className="text-zinc-400 leading-normal">{character.imageStyleDescription}</p>
            </div>
          )}

          {/* Dauerhafte Erinnerungen */}
          {character.memories && character.memories.length > 0 && (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3">
              <div className="mb-1.5 flex items-center justify-between font-semibold text-zinc-200">
                <span className="flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5 text-rose-400" />
                  Dauerhafte Erinnerungen
                </span>
                <span className="text-[10px] text-zinc-500">{character.memories.length} hinterlegt</span>
              </div>
              <div className="space-y-1.5">
                {character.memories.map((mem) => (
                  <div key={mem.id} className="rounded-lg bg-zinc-950/60 p-2 text-[11px] text-zinc-300 border border-zinc-900">
                    <span className="text-[9px] font-semibold text-rose-400 uppercase mr-1.5">[{mem.category}]</span>
                    {mem.content}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hintergrund */}
          {character.background && (
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3">
              <div className="mb-1 font-semibold text-zinc-200">Hintergrundgeschichte</div>
              <p className="text-zinc-400 leading-normal">{character.background}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-950 px-4 py-3">
          {onOpenEdit ? (
            <button
              onClick={() => {
                onClose();
                onOpenEdit();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 hover:text-white"
            >
              <Edit3 className="h-3.5 w-3.5 text-rose-400" />
              <span>Profil bearbeiten</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="rounded-xl bg-zinc-800 px-4 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700"
          >
            Schliessen
          </button>
        </div>
      </div>
    </div>
  );
};
