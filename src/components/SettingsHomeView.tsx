import React from 'react';
import { Activity, ChevronRight, Database, Sparkles } from 'lucide-react';

interface SettingsHomeViewProps {
  onOpenGeneration: () => void;
  onOpenData: () => void;
  onOpenDiagnostics: () => void;
}

export const SettingsHomeView: React.FC<SettingsHomeViewProps> = ({
  onOpenGeneration,
  onOpenData,
  onOpenDiagnostics,
}) => {
  return (
    <div className="h-full overflow-y-auto bg-[#090a0d] px-5 pb-8 pt-8">
      <div className="mb-8">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-rose-400">Deine App</p>
        <h1 className="mt-2 text-[34px] font-black leading-none text-white">Einstellungen</h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-500">
          Passe dein Chat-Erlebnis an und verwalte deine Daten.
        </p>
      </div>

      <SettingsGroup title="Chat & KI">
        <SettingsRow
          icon={<Sparkles className="h-5 w-5" />}
          title="KI & Antworten"
          subtitle="Kreativität, Antwortlänge und erweiterte Prompt-Optionen"
          onClick={onOpenGeneration}
        />
      </SettingsGroup>

      <SettingsGroup title="Deine Daten">
        <SettingsRow
          icon={<Database className="h-5 w-5" />}
          title="Backup & Import"
          subtitle="Chats und Charaktere sichern, exportieren oder importieren"
          onClick={onOpenData}
        />
      </SettingsGroup>

      <SettingsGroup title="Hilfe & Diagnose">
        <SettingsRow
          icon={<Activity className="h-5 w-5" />}
          title="Verbindung & Diagnose"
          subtitle="Serverstatus und Fehlerprotokoll ansehen"
          onClick={onOpenDiagnostics}
        />
      </SettingsGroup>
    </div>
  );
};

const SettingsGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-7">
    <h2 className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.16em] text-zinc-600">{title}</h2>
    <div className="overflow-hidden rounded-[22px] border border-zinc-800/80 bg-zinc-950/70">{children}</div>
  </section>
);

const SettingsRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}> = ({ icon, title, subtitle, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors active:bg-zinc-900"
  >
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-950/30 text-rose-400">
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block text-[15px] font-black text-zinc-100">{title}</span>
      <span className="mt-0.5 block text-[11px] leading-relaxed text-zinc-500">{subtitle}</span>
    </span>
    <ChevronRight className="h-5 w-5 shrink-0 text-zinc-700" />
  </button>
);
