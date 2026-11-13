import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../api/client';
import {
  Sparkles,
  Send,
  Plus,
  Bot,
  User,
  AlertTriangle,
  Clock,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react';
import type { AiChatMessage, AiConversation, AiProviderStatus } from '../../types/ai';

interface AiChatSectionProps {
  providerStatus: AiProviderStatus | null;
  currency: string;
}

export default function AiChatSection({ providerStatus, currency }: AiChatSectionProps) {
  const { activeBusiness } = useAuth();
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingMessages, setFetchingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active membership role
  const userRole = activeBusiness?.role || 'CASHIER';
  const isCashierOrClerk = userRole === 'CASHIER' || userRole === 'STOCK_CLERK';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load conversations
  useEffect(() => {
    if (!activeBusiness) return;

    async function loadConversations() {
      try {
        const json = await apiFetch<{ success: boolean; data: AiConversation[] }>(
          `/api/v1/businesses/${activeBusiness?.id}/ai/conversations`
        );
        if (json.success && json.data) {
          setConversations(json.data);
          if (json.data.length > 0 && !activeConversationId) {
            setActiveConversationId(json.data[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load conversations', err);
      }
    }

    loadConversations();
  }, [activeBusiness]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeBusiness || !activeConversationId) {
      setMessages([]);
      return;
    }

    async function loadMessages() {
      setFetchingMessages(true);
      try {
        const json = await apiFetch<{
          success: boolean;
          data: { conversationId: string; title: string; messages: AiChatMessage[] };
        }>(`/api/v1/businesses/${activeBusiness?.id}/ai/conversations/${activeConversationId}`);
        if (json.success && json.data?.messages) {
          setMessages(json.data.messages);
        }
      } catch (err) {
        console.error('Failed to load messages', err);
      } finally {
        setFetchingMessages(false);
      }
    }

    loadMessages();
  }, [activeBusiness, activeConversationId]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || !activeBusiness || loading) return;

    setInputMessage('');
    setError(null);

    // Optimistic user message
    const tempUserMsg: AiChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const json = await apiFetch<{
        success: boolean;
        data: {
          conversationId: string;
          messageId: string;
          role: 'assistant';
          content: string;
          metadata: any;
          createdAt: string;
        };
      }>(`/api/v1/businesses/${activeBusiness.id}/ai/chat`, {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          conversationId: activeConversationId || undefined,
        }),
      });

      const assistantReply: AiChatMessage = {
        id: json.data.messageId,
        role: 'assistant',
        content: json.data.content,
        metadata: json.data.metadata,
        createdAt: json.data.createdAt,
      };

      setMessages((prev) => [...prev, assistantReply]);

      // If new conversation was created on server
      if (!activeConversationId && json.data.conversationId) {
        setActiveConversationId(json.data.conversationId);
        setConversations((prev) => [
          {
            id: json.data.conversationId,
            title: text.slice(0, 35) + (text.length > 35 ? '...' : ''),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get answer from AI Assistant');
    } finally {
      setLoading(false);
    }
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[600px] h-[calc(100vh-280px)]">
      {/* Sidebar: Conversations & Tips */}
      <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              Chat History
            </h3>
            <button
              onClick={handleNewConversation}
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              New
            </button>
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[300px] pr-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No past chats yet</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveConversationId(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition truncate block ${
                    activeConversationId === c.id
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  {c.title}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Security & Role Redaction Guidance */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
            <div className="flex items-center gap-2 mb-1.5">
              <Bot className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-800">Grounding Guarantee</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Every answer is grounded strictly in verified database transactions for{' '}
              <strong className="text-slate-700">{activeBusiness?.name}</strong>.
            </p>
          </div>

          {isCashierOrClerk && (
            <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-200 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Role <strong>{userRole}</strong>: Shop net profits and overheads are redacted.
                Inventory levels and operational restocking remain accessible.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl flex flex-col h-full shadow-sm">
        {/* Chat Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">TillPro AI Advisor</h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  {providerStatus?.configured
                    ? `AI Powered (${providerStatus.provider.toUpperCase()})`
                    : 'Deterministic Engine Active'}
                </span>
                <span>• Strict Tenant Isolation</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 hidden sm:block">
            Currency: <span className="font-semibold text-slate-700">{currency}</span>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && !fetchingMessages && (
            <div className="py-8 text-center max-w-lg mx-auto space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  How can I help your shop today?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Ask questions about fast movers, upcoming stockouts, working capital tied in dead stock, or replenishment recommendations.
                </p>
              </div>

              {/* Quick Questions Pills */}
              <div className="space-y-2 pt-2">
                <p className="text-xs font-semibold text-slate-700 text-left">Suggested Questions:</p>
                <div className="flex flex-col gap-2">
                  {(providerStatus?.suggestedQuestions || []).map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q)}
                      className="text-left text-xs bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-slate-200 text-slate-700 px-3.5 py-2.5 rounded-lg transition flex items-center justify-between group"
                    >
                      <span>{q}</span>
                      <TrendingUp className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {fetchingMessages && (
            <div className="py-12 flex justify-center items-center gap-2 text-slate-400 text-xs">
              <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              Loading messages...
            </div>
          )}

          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl p-4 shadow-sm text-xs leading-relaxed ${
                    isUser
                      ? 'bg-emerald-600 text-white rounded-tr-none'
                      : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>

                  {!isUser && m.metadata?.factsVsEstimatesNotice && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 text-[10px] text-slate-500 flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{m.metadata.factsVsEstimatesNotice}</span>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-none p-3.5 text-xs text-slate-500 flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                Analyzing real store transactions and computing forecast...
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200 bg-white rounded-b-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about sales trends, restocking, dead stock, or fast movers..."
              disabled={loading}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask</span>
            </button>
          </form>
          <div className="mt-1.5 text-[10px] text-slate-400 text-center">
            AI advice is advisory. No financial purchases or stock adjustments are executed automatically.
          </div>
        </div>
      </div>
    </div>
  );
}
