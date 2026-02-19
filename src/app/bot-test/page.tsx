'use client';

import { useState } from 'react';

interface Message {
  role: 'user' | 'bot';
  content: string;
  parsed?: {
    intent: string;
    confidence: number;
    entities: Record<string, string>;
  };
}

export default function BotTestPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [userName, setUserName] = useState('Oliver');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch('/api/bot/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, user: userName }),
      });

      const data = await response.json();

      // Add bot response
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          content: data.response || data.error || 'No response',
          parsed: data.parsed,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: 'Error: Failed to get response' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-green-600 text-white p-4">
            <h1 className="text-xl font-bold">PSE Trade Buddy - Test Mode</h1>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm">Testing as:</span>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="px-2 py-1 rounded text-black text-sm w-32"
              />
            </div>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-gray-400 text-center py-8">
                <p>Try sending a message:</p>
                <p className="text-sm mt-2">"help"</p>
                <p className="text-sm">"remind Jan to call Ponti"</p>
                <p className="text-sm">"what are my tasks"</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.parsed && (
                    <div className="mt-2 pt-2 border-t border-gray-300 text-xs opacity-75">
                      <p>Intent: {msg.parsed.intent} ({Math.round(msg.parsed.confidence * 100)}%)</p>
                      {Object.keys(msg.parsed.entities).length > 0 && (
                        <p>Entities: {JSON.stringify(msg.parsed.entities)}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 px-4 py-2 rounded-lg">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setInput('help')}
            className="px-3 py-1 bg-white rounded-full text-sm shadow hover:shadow-md"
          >
            help
          </button>
          <button
            onClick={() => setInput('remind Jan to check the order')}
            className="px-3 py-1 bg-white rounded-full text-sm shadow hover:shadow-md"
          >
            remind Jan to check the order
          </button>
          <button
            onClick={() => setInput('what are my tasks')}
            className="px-3 py-1 bg-white rounded-full text-sm shadow hover:shadow-md"
          >
            what are my tasks
          </button>
          <button
            onClick={() => setInput('show me rocket growers')}
            className="px-3 py-1 bg-white rounded-full text-sm shadow hover:shadow-md"
          >
            show me rocket growers
          </button>
          <button
            onClick={() => setInput('transport from Venlo to Milan')}
            className="px-3 py-1 bg-white rounded-full text-sm shadow hover:shadow-md"
          >
            transport from Venlo to Milan
          </button>
        </div>
      </div>
    </div>
  );
}
