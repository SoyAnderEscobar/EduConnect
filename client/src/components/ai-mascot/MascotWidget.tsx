import { useState, useRef, useEffect } from 'react';
import { GraduationCap, X, Send, Sparkles, Loader2, Trash2, Plus, History } from 'lucide-react';
import api from '@/services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
}

const SUGGESTIONS = [
  '¿Que tengo pendiente?',
  'Explicame un tema',
  'Tips de estudio',
  'Ayuda con mi proyecto',
];

const WELCOME_MSG: Message = {
  id: '0',
  role: 'assistant',
  content: '¡Hola! Soy EduBot, tu asistente educativo con IA. Puedo ayudarte con tus materias, explicar temas, darte tips de estudio y mucho mas. ¿En que te ayudo hoy?',
};

export default function MascotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const { data } = await api.get('/ai/conversations');
      setConversations(data.data || []);
    } catch {}
  };

  const loadConversation = async (convId: string) => {
    try {
      const { data } = await api.get(`/ai/conversations/${convId}/messages`);
      setMessages(data.data || []);
      setConversationId(convId);
      setShowHistory(false);
    } catch {}
  };

  const startNewChat = () => {
    setMessages([WELCOME_MSG]);
    setConversationId(null);
    setShowHistory(false);
  };

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/ai/conversations/${convId}`);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (conversationId === convId) startNewChat();
    } catch {}
  };

  const handleSend = async (text?: string) => {
    const content = text || input.trim();
    if (!content || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const url = conversationId ? `/ai/chat/${conversationId}` : '/ai/chat';
      const { data } = await api.post(url, { message: content });

      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
      }

      const botMsg: Message = {
        id: data.message.id,
        role: 'assistant',
        content: data.message.content,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Lo siento, hubo un error. Intenta de nuevo.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleHistory = () => {
    if (!showHistory) loadConversations();
    setShowHistory(!showHistory);
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col z-50"
          style={{ height: '500px', animation: 'slideUp 0.3s ease-out' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-accent-600 to-primary-600 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">EduBot</p>
                <p className="text-white/70 text-xs flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Asistente con IA
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={toggleHistory}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Historial"
              >
                <History className="w-4 h-4" />
              </button>
              <button
                onClick={startNewChat}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Nueva conversacion"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* History Panel */}
          {showHistory ? (
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Conversaciones anteriores</p>
              </div>
              {conversations.length === 0 ? (
                <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">No hay conversaciones</p>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-50 dark:border-gray-700/50 ${
                      conversationId === conv.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-accent-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">{conv.title}</span>
                    <button
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 bg-accent-100 dark:bg-accent-900 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                        <GraduationCap className="w-4 h-4 text-accent-600 dark:text-accent-400" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-primary-600 text-white rounded-br-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-md'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="w-7 h-7 bg-accent-100 dark:bg-accent-900 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                      <GraduationCap className="w-4 h-4 text-accent-600 dark:text-accent-400" />
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 rounded-2xl rounded-bl-md">
                      <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions */}
              {messages.length <= 1 && (
                <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="text-xs px-3 py-1.5 bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 rounded-full hover:bg-accent-100 dark:hover:bg-accent-900/50 transition-colors border border-accent-200 dark:border-accent-700"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                <input
                  className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder={loading ? 'EduBot esta pensando...' : 'Escribe tu pregunta...'}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  disabled={loading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="w-9 h-9 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-50 transition-all duration-300 ${
          isOpen
            ? 'bg-gray-500 hover:bg-gray-600 rotate-0'
            : 'bg-gradient-to-br from-accent-500 to-primary-600 hover:from-accent-600 hover:to-primary-700 animate-bounce-slow'
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <div className="relative">
            <GraduationCap className="w-7 h-7 text-white" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
          </div>
        )}
      </button>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-bounce-slow {
          animation: bounceSlow 3s ease-in-out infinite;
        }
        @keyframes bounceSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
}
