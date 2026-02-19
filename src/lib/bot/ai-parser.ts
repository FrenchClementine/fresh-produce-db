import OpenAI from 'openai';

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export interface ParsedIntent {
  intent: 'create_task' | 'list_tasks' | 'complete_task' | 'query_supplier' | 'query_transport' | 'help' | 'unknown';
  confidence: number;
  entities: {
    assignee?: string;
    taskText?: string;
    taskId?: string;
    productName?: string;
    supplierName?: string;
    location?: string;
    origin?: string;
    destination?: string;
  };
  response?: string;
}

export interface MessageContext {
  role: 'user' | 'bot';
  content: string;
}

const SYSTEM_PROMPT = `You are a parser for a trade team's WhatsApp bot called PSE Trade Buddy. Extract the intent and entities from user messages.

You will receive the current message AND the last few messages for context. Use the context to understand references like "yes", "that one", "do it", etc.

Available intents:
- create_task: User wants to assign a task to someone (e.g., "remind Oliver to call Ponti", "tell Jan to check the order")
- list_tasks: User wants to see their tasks (e.g., "what are my tasks", "show my tasks")
- complete_task: User wants to mark a task as done (e.g., "done with calling Ponti", "completed the order check")
- query_supplier: User wants to find suppliers/growers for a product (e.g., "show me rocket growers", "who has tomatoes", "find suppliers for iceberg")
- query_transport: User wants to find transport options between locations (e.g., "transport from Naples to Thessaloniki", "how to ship from Spain to UK", "find transport Venlo to Milan")
- help: User wants help or info about the bot
- unknown: Can't determine the intent

For create_task, extract:
- assignee: The person's name the task is for
- taskText: The actual task description

For query_supplier, extract:
- productName: The product they're asking about (e.g., "rocket", "tomatoes", "iceberg lettuce")
- location: The country/location filter if specified (e.g., "UK", "United Kingdom", "Spain", "Netherlands")

For query_transport, extract:
- origin: The starting location (e.g., "Naples", "Venlo", "Spain")
- destination: The destination location (e.g., "Thessaloniki", "Milan", "UK")

Respond ONLY with valid JSON in this exact format:
{
  "intent": "create_task",
  "confidence": 0.95,
  "entities": {
    "assignee": "Oliver",
    "taskText": "call Ponti about the iceberg delivery"
  }
}

Keep taskText natural and complete. Don't truncate or modify it unnecessarily.`;

export async function parseWithAI(
  message: string,
  conversationContext?: MessageContext[]
): Promise<ParsedIntent> {
  try {
    // Build context string from recent messages
    let contextString = '';
    if (conversationContext && conversationContext.length > 0) {
      contextString = '\n\nRecent conversation:\n' +
        conversationContext.map(m => `${m.role === 'user' ? 'User' : 'Bot'}: ${m.content}`).join('\n');
    }

    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Current message: ${message}${contextString}` },
      ],
      temperature: 0.1,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content || '';

    // Parse the JSON response - handle markdown code blocks if present
    const jsonContent = content.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(jsonContent);

    return {
      intent: parsed.intent || 'unknown',
      confidence: parsed.confidence || 0,
      entities: parsed.entities || {},
    };
  } catch (error) {
    console.error('AI parsing error:', error);
    // Fallback to unknown
    return {
      intent: 'unknown',
      confidence: 0,
      entities: {},
    };
  }
}

/**
 * Generate a natural response using AI
 */
export async function generateResponse(
  intent: string,
  entities: Record<string, unknown>,
  context?: string
): Promise<string> {
  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are PSE Trade Buddy, a helpful assistant for a produce trading team.
Keep responses SHORT and friendly (max 2-3 lines).
Use simple formatting suitable for WhatsApp.
Don't use markdown headers. Use * for bold if needed.`,
        },
        {
          role: 'user',
          content: `Generate a response for:
Intent: ${intent}
Data: ${JSON.stringify(entities)}
${context ? `Context: ${context}` : ''}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return response.choices[0]?.message?.content || "I'm here to help!";
  } catch (error) {
    console.error('AI response error:', error);
    return "Sorry, I'm having trouble responding right now.";
  }
}
