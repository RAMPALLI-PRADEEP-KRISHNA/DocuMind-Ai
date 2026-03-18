import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { askQuestion, exportChatPdf } from '../../services/api';
import { Send, User, Bot, Loader2, Link2, Download, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export const Chat = () => {
  const { messages, addMessage, isGenerating, setIsGenerating, setActivePdf } = useAppStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const userMsg = input.trim();
    setInput('');

    const msgId = Math.random().toString(36).substring(7);
    addMessage({ id: msgId, role: 'user', content: userMsg });
    setIsGenerating(true);

    try {
      const response = await askQuestion(userMsg);
      // Map new backend response to message format
      const citations = response.sources?.map((src: { file: string; page: number }, idx: number) => ({
        source: src.file,
        page: src.page,
        text_chunk: idx === 0 ? (response.chunk_preview || '') : '',
      })) || [];

      addMessage({
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        content: response.answer,
        citations,
        confidence_score: response.confidence,
        sources: response.sources,
        chunk_preview: response.chunk_preview,
      });
    } catch (error: any) {
      addMessage({
        id: Math.random().toString(36).substring(7),
        role: 'assistant',
        content: error.response?.data?.detail || "An error occurred while generating the answer. Please check if documents are indexed and Ollama is running.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCitationClick = (source: string, page: number, textChunk: string) => {
    // Open the PDF viewer at the specific page with the chunk text highlighted
    setActivePdf(source, page, textChunk || null);
  };

  const handleExport = async () => {
    // Find last Q&A pair
    const assistantMsgs = messages.filter(m => m.role === 'assistant');
    const userMsgs = messages.filter(m => m.role === 'user');
    if (assistantMsgs.length === 0 || userMsgs.length === 0) return;

    const lastAssistant = assistantMsgs[assistantMsgs.length - 1];
    const lastUser = userMsgs[userMsgs.length - 1];

    try {
      await exportChatPdf({
        question: lastUser.content,
        answer: lastAssistant.content,
        confidence: lastAssistant.confidence_score ?? 0,
        sources: lastAssistant.sources ?? [],
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-900/50 relative">
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">How can I help you today?</h2>
            <p className="text-gray-400 text-sm">
              Upload your PDF documents on the left and ask me anything about them. I use Hybrid RAG to find the exact answers and cite my sources.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id}
              className={cn(
                "flex gap-4 max-w-4xl",
                msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
              )}
            >
              {/* Avatar */}
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 shadow-lg",
                msg.role === 'user' ? "bg-gradient-to-br from-indigo-500 to-purple-600" : "bg-dark-800 border border-white/10"
              )}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-primary-400" />}
              </div>

              {/* Message Bubble */}
              <div className={cn(
                "flex flex-col gap-2",
                msg.role === 'user' ? "items-end" : "items-start w-full"
              )}>
                <div className={cn(
                  "p-4 rounded-2xl text-sm leading-relaxed",
                  msg.role === 'user'
                    ? "bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-tr-sm shadow-lg shadow-primary-500/20"
                    : "glass-card text-gray-200 rounded-tl-sm w-full"
                )}>
                  {msg.content}
                </div>

                {/* Citations & Metadata (Only for AI) */}
                {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && (
                  <div className="glass-panel w-full p-4 rounded-xl mt-2 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        <Link2 className="w-3 h-3" /> Evidence & Citations
                      </h4>
                      {msg.confidence_score !== undefined && (
                        <div className={cn(
                          "px-2 py-1 rounded-md text-[10px] font-bold tracking-wide border",
                          msg.confidence_score >= 80 ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          msg.confidence_score >= 50 ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                          "bg-red-500/10 text-red-400 border-red-500/20"
                        )}>
                          CONFIDENCE: {msg.confidence_score.toFixed(0)}%
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {msg.citations.map((cite, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleCitationClick(cite.source, cite.page, cite.text_chunk)}
                          className="bg-dark-900/50 border border-white/5 rounded-lg p-3 hover:border-primary-500/30 transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-3.5 h-3.5 text-primary-400" />
                            <span className="text-xs font-medium text-gray-300 truncate">{cite.source}</span>
                            <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-400 ml-auto">Pg {cite.page || '?'}</span>
                          </div>
                          {cite.text_chunk && (
                            <p className="text-xs text-gray-500 line-clamp-3 group-hover:text-gray-400 transition-colors italic">
                              "{cite.text_chunk.slice(0, 300)}"
                            </p>
                          )}
                          <p className="text-[10px] text-primary-400/60 mt-2 group-hover:text-primary-400 transition-colors">
                            Click to view in PDF →
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}

        {isGenerating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
            <div className="w-8 h-8 rounded-lg bg-dark-800 border border-white/10 flex items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
            </div>
            <div className="glass-card px-4 py-3 rounded-2xl rounded-tl-sm text-sm text-gray-400 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
              </span>
              Retrieving context & generating answer...
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-dark-900/80 backdrop-blur-md border-t border-white/5">
        <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your documents..."
            className="flex-1 bg-dark-800/80 border border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:outline-none focus:border-primary-500/50 focus:ring-1 focus:ring-primary-500/50 transition-all placeholder:text-gray-500"
            disabled={isGenerating}
          />
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="absolute right-2 p-2.5 bg-primary-600 hover:bg-primary-500 disabled:bg-white/5 text-white disabled:text-gray-500 rounded-lg transition-colors flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="max-w-4xl mx-auto mt-2 flex justify-between items-center text-[10px] text-gray-500 px-2">
          <p>DocuMind-AI uses LangChain and local Ollama models. Responses may vary.</p>
          <button
            onClick={handleExport}
            className="flex items-center gap-1 hover:text-gray-300 transition-colors"
          >
            <Download className="w-3 h-3" /> Export Chat PDF
          </button>
        </div>
      </div>
    </div>
  );
};
