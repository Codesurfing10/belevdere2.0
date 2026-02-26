'use client';
import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  onClose: () => void;
  onAction: (action: any) => void;
  bookingId?: string;
}

export default function ChatDrawer({ onClose, onAction, bookingId }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your rental assistant 🏠 I can help you find properties, filter by price or amenities, and add meals or equipment to your stay. Try: 'show cheaper options', 'pet friendly', 'add breakfast for 2', or 'rent 2 bikes'!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, context: { bookingId } })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      if (data.action) onAction(data.action);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickReplies = ['Show cheaper', 'Pet friendly', 'Add breakfast', 'Rent bikes'];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-4 pointer-events-none">
      <div
        className="pointer-events-auto w-96 bg-white rounded-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: '70vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-indigo-600 rounded-t-2xl">
          <div>
            <h3 className="font-bold text-white">🤖 Rental Assistant</h3>
            <p className="text-xs text-indigo-200">AI-powered search &amp; booking helper</p>
          </div>
          <button onClick={onClose} className="text-white hover:text-indigo-200 text-xl leading-none">✕</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-3 py-2 text-sm text-gray-400">Thinking...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick replies */}
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
          {quickReplies.map(q => (
            <button
              key={q}
              onClick={() => setInput(q)}
              className="text-xs bg-indigo-50 text-indigo-600 rounded-full px-3 py-1 whitespace-nowrap hover:bg-indigo-100"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask me anything..."
            className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-indigo-600 text-white rounded-xl px-3 py-2 hover:bg-indigo-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
