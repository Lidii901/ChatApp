import React from 'react';
import { MessageSquare, Users, Settings } from 'lucide-react';

export type MainTab = 'chats' | 'characters' | 'settings';

interface NavigationProps {
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  chatsCount?: number;
  charactersCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
}) => {
  return (
    <nav
      id="main-navigation-bar"
      className="sticky bottom-0 z-40 border-t border-zinc-800/80 bg-zinc-950/95 px-4 py-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {/* Chats Tab */}
        <button
          id="nav-tab-chats"
          onClick={() => onSelectTab('chats')}
          className={`flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 transition-all ${
            activeTab === 'chats'
              ? 'text-rose-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <MessageSquare className="h-5 w-5" />
          <span className="text-[11px]">Chats</span>
        </button>

        {/* Characters Tab */}
        <button
          id="nav-tab-characters"
          onClick={() => onSelectTab('characters')}
          className={`flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 transition-all ${
            activeTab === 'characters'
              ? 'text-rose-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="h-5 w-5" />
          <span className="text-[11px]">Charaktere</span>
        </button>

        {/* Settings Tab */}
        <button
          id="nav-tab-settings"
          onClick={() => onSelectTab('settings')}
          className={`flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 transition-all ${
            activeTab === 'settings'
              ? 'text-rose-400 font-semibold'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Settings className="h-5 w-5" />
          <span className="text-[11px]">Einstellungen</span>
        </button>
      </div>
    </nav>
  );
};
