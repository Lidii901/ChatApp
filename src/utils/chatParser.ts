import { Message, Role } from '../types';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseChatText(
  rawText: string,
  characterName: string = 'Dean',
  playerAddressName: string = 'Lidii'
): Message[] {
  const lines = rawText.split('\n');
  const messages: Message[] = [];
  let currentRole: Role | null = null;
  let currentSpeaker: string = '';
  let currentBuffer: string[] = [];

  const flush = () => {
    if (currentRole && currentBuffer.length > 0) {
      const content = currentBuffer.join('\n').trim();
      if (content) {
        messages.push({
          id: `imported-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          role: currentRole,
          speakerName: currentSpeaker || (currentRole === 'lidii' ? playerAddressName : characterName),
          content,
          timestamp: Date.now() - (1000 * 60 * (100 - messages.length)),
        });
      }
      currentBuffer = [];
    }
  };

  const isDean = characterName.trim().toLowerCase() === 'dean';
  const charRole: Role = isDean ? 'dean' : 'character';

  const charNamePattern = escapeRegex(characterName.trim());
  const playerNamePattern = escapeRegex(playerAddressName.trim());

  const rolePatterns = [
    {
      role: charRole,
      speaker: characterName,
      regex: new RegExp(`^(?:${charNamePattern}|\\*\\*${charNamePattern}\\*\\*|\\[${charNamePattern}\\]|${charNamePattern}:|\\*\\*${charNamePattern}:\\*\\*)\\s*[:–-]?\\s*(.*)$`, 'i'),
    },
    {
      role: 'lidii' as Role,
      speaker: playerAddressName,
      regex: new RegExp(`^(?:${playerNamePattern}|Lidii|Lidi|Satanence|Sata|\\*\\*${playerNamePattern}\\*\\*|\\[${playerNamePattern}\\]|${playerNamePattern}:|\\*\\*${playerNamePattern}:\\*\\*|\\*\\*Lidii\\*\\*|\\[Lidii\\]|Lidii:|\\*\\*Lidii:\\*\\*|\\*\\*Satanence\\*\\*|\\[Satanence\\]|Satanence:|\\*\\*Satanence:\\*\\*)\\s*[:–-]?\\s*(.*)$`, 'i'),
    },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let matchedRole: Role | null = null;
    let matchedSpeaker: string = '';
    let remainder = '';

    for (const pattern of rolePatterns) {
      const match = line.match(pattern.regex);
      if (match) {
        matchedRole = pattern.role;
        matchedSpeaker = pattern.speaker;
        remainder = match[1] || '';
        break;
      }
    }

    if (matchedRole) {
      flush();
      currentRole = matchedRole;
      currentSpeaker = matchedSpeaker;
      if (remainder.trim()) {
        currentBuffer.push(remainder.trim());
      }
    } else {
      if (currentRole) {
        currentBuffer.push(line);
      } else if (line.trim()) {
        currentRole = 'lidii';
        currentSpeaker = playerAddressName;
        currentBuffer.push(line);
      }
    }
  }

  flush();
  return messages;
}

