import { Message, Role } from '../types';

export function parseChatText(rawText: string): Message[] {
  const lines = rawText.split('\n');
  const messages: Message[] = [];
  let currentRole: Role | null = null;
  let currentBuffer: string[] = [];

  const flush = () => {
    if (currentRole && currentBuffer.length > 0) {
      const content = currentBuffer.join('\n').trim();
      if (content) {
        messages.push({
          id: `imported-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          role: currentRole,
          content,
          timestamp: Date.now() - (1000 * 60 * (100 - messages.length)),
        });
      }
      currentBuffer = [];
    }
  };

  const rolePatterns = [
    { role: 'dean' as Role, regex: /^(?:Dean|Dean Sanchez|\*\*Dean\*\*|\[Dean\]|Dean:|\*\*Dean:\*\*)\s*[:–-]?\s*(.*)$/i },
    { role: 'lidii' as Role, regex: /^(?:Lidii|Lidi|Satanence|Sata|\*\*Lidii\*\*|\[Lidii\]|Lidii:|\*\*Lidii:\*\*|\*\*Satanence\*\*|\[Satanence\]|Satanence:|\*\*Satanence:\*\*)\s*[:–-]?\s*(.*)$/i },
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let matchedRole: Role | null = null;
    let remainder = '';

    for (const pattern of rolePatterns) {
      const match = line.match(pattern.regex);
      if (match) {
        matchedRole = pattern.role;
        remainder = match[1] || '';
        break;
      }
    }

    if (matchedRole) {
      flush();
      currentRole = matchedRole;
      if (remainder.trim()) {
        currentBuffer.push(remainder.trim());
      }
    } else {
      if (currentRole) {
        currentBuffer.push(line);
      } else if (line.trim()) {
        // Default first unassigned block to Lidii if starting out
        currentRole = 'lidii';
        currentBuffer.push(line);
      }
    }
  }

  flush();
  return messages;
}
