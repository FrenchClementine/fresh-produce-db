import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';
import {
  isBotMessage,
  parseMessage,
  formatHelpResponse,
  formatTaskCreated,
  formatTaskList,
  formatUnknown,
} from '@/lib/bot/parser';

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Initialize Supabase client (server-side with service role for writes)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Send a WhatsApp message via Twilio
 */
async function sendWhatsAppMessage(to: string, body: string) {
  try {
    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: to,
      body: body,
    });
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
  }
}

/**
 * Get display name from WhatsApp number
 */
async function getDisplayName(whatsappNumber: string, profileName?: string): Promise<string> {
  // First check if user exists in bot_users
  const { data: botUser } = await supabase
    .from('bot_users')
    .select('display_name')
    .eq('whatsapp_number', whatsappNumber)
    .single();

  if (botUser) {
    return botUser.display_name;
  }

  // Use profile name from Twilio if available
  if (profileName) {
    // Auto-register user
    await supabase.from('bot_users').insert({
      whatsapp_number: whatsappNumber,
      display_name: profileName,
    });
    return profileName;
  }

  // Fallback to phone number
  return whatsappNumber.replace('whatsapp:', '');
}

/**
 * Handle task creation
 */
async function createTask(assignee: string, taskText: string, createdBy: string) {
  const { error } = await supabase.from('bot_tasks').insert({
    title: taskText,
    assigned_to: assignee,
    created_by: createdBy,
    status: 'pending',
  });

  if (error) {
    console.error('Failed to create task:', error);
    return false;
  }
  return true;
}

/**
 * Get tasks for a user
 */
async function getTasksForUser(displayName: string) {
  const { data: tasks, error } = await supabase
    .from('bot_tasks')
    .select('*')
    .ilike('assigned_to', `%${displayName}%`)
    .in('status', ['pending'])
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Failed to get tasks:', error);
    return [];
  }

  return tasks || [];
}

/**
 * Log incoming message
 */
async function logMessage(
  whatsappNumber: string,
  direction: 'inbound' | 'outbound',
  body: string,
  intent?: string,
  parsedData?: Record<string, unknown>
) {
  await supabase.from('bot_messages').insert({
    whatsapp_number: whatsappNumber,
    direction,
    message_body: body,
    parsed_intent: intent,
    parsed_data: parsedData,
  });
}

export async function POST(request: NextRequest) {
  try {
    // Parse form data from Twilio
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;
    const profileName = formData.get('ProfileName') as string | undefined;

    console.log(`Received message from ${from}: ${body}`);

    // Check if message is for the bot
    if (!isBotMessage(body)) {
      // Ignore messages not directed at bot
      return NextResponse.json({ success: true, ignored: true });
    }

    // Get sender's display name
    const displayName = await getDisplayName(from, profileName || undefined);

    // Parse the message
    const parsed = parseMessage(body);

    // Log the incoming message
    await logMessage(from, 'inbound', body, parsed.intent, {
      assignee: parsed.assignee,
      taskText: parsed.taskText,
    });

    // Handle based on intent
    let responseText = '';

    switch (parsed.intent) {
      case 'help':
        responseText = formatHelpResponse();
        break;

      case 'create_task':
        if (parsed.assignee && parsed.taskText) {
          const success = await createTask(parsed.assignee, parsed.taskText, displayName);
          if (success) {
            responseText = formatTaskCreated(parsed.assignee, parsed.taskText);
          } else {
            responseText = "Sorry, I couldn't create that task. Please try again.";
          }
        } else {
          responseText = "I couldn't understand the task. Try: \"remind [name] to [task]\"";
        }
        break;

      case 'list_tasks':
        const tasks = await getTasksForUser(displayName);
        responseText = formatTaskList(tasks);
        break;

      default:
        responseText = formatUnknown();
    }

    // Send response
    await sendWhatsAppMessage(from, responseText);

    // Log outgoing message
    await logMessage(from, 'outbound', responseText);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Twilio sends GET for webhook validation
export async function GET() {
  return NextResponse.json({ status: 'Bot webhook is running' });
}
