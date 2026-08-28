import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName?: string;
  message?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Chat löschen',
  itemName = 'Diesen Chat',
  message = 'Möchtest du diesen Chat wirklich unwiderruflich löschen? Alle Nachrichten und der bisherige Verlauf gehen dabei verloren.',
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="delete-confirm-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-950/80 text-rose-400 border border-rose-900/50">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
              <p className="text-xs font-medium text-rose-400/90 truncate max-w-[200px]">{itemName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">{message}</p>

        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-zinc-800/80 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:from-rose-500 hover:to-rose-600 transition-all active:scale-95"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Endgültig löschen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
