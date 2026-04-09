import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Send, Paperclip, Users, MessageCircle } from 'lucide-react';
import { timeAgo } from '@/lib/utils';
import api from '@/services/api';

export default function ChatPage() {
  const { userId: selectedUserId } = useParams();
  const { user } = useAuthStore();
  const [conversations, setConversations] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeChat, setActiveChat] = useState<string | null>(selectedUserId || null);
  const [showContacts, setShowContacts] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations and contacts
  useEffect(() => {
    api.get('/chat/conversations').then(({ data }) => setConversations(data.data || [])).catch(() => {});
    // Load contacts from all subjects
    api.get('/subjects').then(async ({ data }) => {
      const subjects = data.data || [];
      const allContacts: any[] = [];
      for (const s of subjects) {
        try {
          const { data: resp } = await api.get(`/subjects/${s.id}/members`);
          const members = resp.data || [];
          for (const m of members) {
            if (m.id !== user?.id && !allContacts.find((c: any) => c.id === m.id)) {
              allContacts.push({ ...m, subjectName: s.name });
            }
          }
        } catch {}
      }
      setContacts(allContacts);
    }).catch(() => {});
  }, [user?.id]);

  // Load messages when activeChat changes + poll every 5s
  useEffect(() => {
    if (!activeChat) return;
    const fetchMessages = () => {
      api.get(`/chat/${activeChat}/messages`).then(({ data }) => {
        setMessages(data.data || []);
        api.put(`/chat/${activeChat}/read`).catch(() => {});
      }).catch(() => {});
    };
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChat) return;
    try {
      const { data } = await api.post(`/chat/${activeChat}/messages`, { content: newMessage });
      setMessages([...messages, data]);
      setNewMessage('');
      // Refresh conversations list
      api.get('/chat/conversations').then(({ data }) => setConversations(data.data || [])).catch(() => {});
    } catch {}
  };

  const startChat = (contactId: string) => {
    setActiveChat(contactId);
    setShowContacts(false);
  };

  const activeChatUser = conversations.find((c) => c.user.id === activeChat)?.user
    || contacts.find((c: any) => c.id === activeChat);

  return (
    <div className="flex h-[calc(100vh-7rem)] bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Sidebar: Conversations + Contacts */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          <button
            onClick={() => setShowContacts(false)}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
              !showContacts ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <MessageCircle className="w-4 h-4" /> Chats
          </button>
          <button
            onClick={() => setShowContacts(true)}
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
              showContacts ? 'text-primary-600 border-b-2 border-primary-600' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Users className="w-4 h-4" /> Contactos
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!showContacts ? (
            // Conversations
            conversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <MessageCircle className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">Sin conversaciones</p>
                <button onClick={() => setShowContacts(true)} className="text-sm text-primary-600 hover:text-primary-700 mt-2">
                  Iniciar nueva conversacion
                </button>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.user.id}
                  onClick={() => setActiveChat(conv.user.id)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left ${
                    activeChat === conv.user.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                  }`}
                >
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary-700 dark:text-primary-400">
                      {conv.user.firstName.charAt(0)}{conv.user.lastName.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {conv.user.firstName} {conv.user.lastName}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="w-5 h-5 bg-primary-600 rounded-full text-white text-[10px] flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{conv.lastMessage?.content}</p>
                  </div>
                </button>
              ))
            )
          ) : (
            // Contacts
            contacts.length === 0 ? (
              <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">No hay contactos</p>
            ) : (
              contacts.map((contact: any) => (
                <button
                  key={contact.id}
                  onClick={() => startChat(contact.id)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-accent-100 dark:bg-accent-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-accent-700 dark:text-accent-400">
                      {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {contact.firstName} {contact.lastName}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {contact.role === 'TEACHER' ? 'Profesor' : 'Estudiante'}
                      {contact.subjectName ? ` - ${contact.subjectName}` : ''}
                    </p>
                  </div>
                </button>
              ))
            )
          )}
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col">
        {activeChat && activeChatUser ? (
          <>
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-primary-700 dark:text-primary-400">
                  {activeChatUser.firstName.charAt(0)}{activeChatUser.lastName.charAt(0)}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">{activeChatUser.firstName} {activeChatUser.lastName}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{activeChatUser.role === 'TEACHER' ? 'Profesor' : 'Estudiante'}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-center text-gray-400 dark:text-gray-500 py-8 text-sm">
                  Inicia la conversacion con {activeChatUser.firstName}
                </p>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                    msg.senderId === user?.id
                      ? 'bg-primary-600 text-white rounded-br-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-md'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                    {msg.fileUrl && (
                      <a href={msg.fileUrl} target="_blank" className="text-xs underline mt-1 block">
                        {msg.fileName || 'Archivo adjunto'}
                      </a>
                    )}
                    <p className={`text-[10px] mt-1 ${msg.senderId === user?.id ? 'text-primary-200' : 'text-gray-400 dark:text-gray-500'}`}>
                      {timeAgo(msg.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-4 border-t border-gray-100 dark:border-gray-700 flex gap-2">
              <input
                className="input flex-1"
                placeholder="Escribe un mensaje..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button type="submit" className="btn-primary px-3">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
            <MessageCircle className="w-16 h-16 mb-4 text-gray-200 dark:text-gray-600" />
            <p className="text-lg font-medium">Selecciona una conversacion</p>
            <p className="text-sm mt-1">O ve a Contactos para iniciar una nueva</p>
          </div>
        )}
      </div>
    </div>
  );
}
