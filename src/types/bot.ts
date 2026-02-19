// Bot Types

export interface BotUser {
  id: string;
  whatsapp_number: string;
  display_name: string;
  user_id?: string;
  preferences: Record<string, unknown>;
  created_at: string;
}

export interface BotTask {
  id: string;
  title: string;
  assigned_to: string; // display name
  assigned_to_user_id?: string;
  created_by: string;
  created_by_user_id?: string;
  status: 'pending' | 'completed' | 'cancelled';
  raw_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface BotMessage {
  id: string;
  whatsapp_number: string;
  direction: 'inbound' | 'outbound';
  message_body: string;
  parsed_intent?: string;
  parsed_data?: Record<string, unknown>;
  created_at: string;
}

export interface ParsedMessage {
  intent: 'create_task' | 'list_tasks' | 'help' | 'unknown';
  rawText: string;
  assignee?: string;
  taskText?: string;
}

export interface TwilioIncomingMessage {
  From: string;
  To: string;
  Body: string;
  MessageSid: string;
  AccountSid: string;
  NumMedia?: string;
  ProfileName?: string;
}
