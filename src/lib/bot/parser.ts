import { ParsedMessage } from '@/types/bot';

const BOT_TRIGGER = '@bot';

/**
 * Check if message is directed at the bot
 */
export function isBotMessage(text: string): boolean {
  return text.toLowerCase().includes(BOT_TRIGGER.toLowerCase());
}

/**
 * Parse incoming message and extract intent + entities
 */
export function parseMessage(text: string): ParsedMessage {
  const cleanText = text.replace(new RegExp(BOT_TRIGGER, 'gi'), '').trim();
  const lowerText = cleanText.toLowerCase();

  // Help intent
  if (lowerText.includes('help') || lowerText === '?' || lowerText.includes('what can you do')) {
    return {
      intent: 'help',
      rawText: cleanText,
    };
  }

  // List tasks intent
  if (
    lowerText.includes('my tasks') ||
    lowerText.includes('what are my tasks') ||
    lowerText.includes('show tasks') ||
    lowerText.includes('list tasks')
  ) {
    return {
      intent: 'list_tasks',
      rawText: cleanText,
    };
  }

  // Create task intent - patterns like:
  // "remind Jan to call Ponti"
  // "task for Jan: call Ponti"
  // "Jan needs to call Ponti"
  // "tell Oliver to check the order"
  const taskPatterns = [
    /remind\s+(\w+)\s+to\s+(.+)/i,
    /task\s+for\s+(\w+)[:\s]+(.+)/i,
    /tell\s+(\w+)\s+to\s+(.+)/i,
    /(\w+)\s+needs?\s+to\s+(.+)/i,
    /assign\s+(\w+)[:\s]+(.+)/i,
  ];

  for (const pattern of taskPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      return {
        intent: 'create_task',
        rawText: cleanText,
        assignee: match[1],
        taskText: match[2].trim(),
      };
    }
  }

  // Unknown intent
  return {
    intent: 'unknown',
    rawText: cleanText,
  };
}

/**
 * Format response for WhatsApp
 */
export function formatHelpResponse(): string {
  return `Hi! I'm the PSE Trade Buddy. Here's what I can do:

*Tasks*
- "remind [name] to [task]"
- "what are my tasks"

More features coming soon!`;
}

export function formatTaskCreated(assignee: string, task: string): string {
  return `Got it! Task created for ${assignee}:
"${task}"`;
}

export function formatTaskList(tasks: { title: string; status: string }[]): string {
  if (tasks.length === 0) {
    return "You have no pending tasks.";
  }

  const taskLines = tasks.map((t, i) => {
    const icon = t.status === 'completed' ? '✓' : '□';
    return `${icon} ${t.title}`;
  });

  return `Your tasks:\n${taskLines.join('\n')}`;
}

export function formatUnknown(): string {
  return `I didn't understand that. Try "@bot help" to see what I can do.`;
}
