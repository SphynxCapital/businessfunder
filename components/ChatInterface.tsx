import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Message, GroundingChunkWeb, FundingAnalysis } from '../types';
import { geminiService } from '../services/geminiService';
import { IconUser, IconSparkles, IconPaperAirplane, IconLoader, IconAlertTriangle, IconLink, IconTrash } from './Icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.sender === 'user';
  const bgColor = isUser ? 'bg-gradient-to-br from-purple-600 to-indigo-600' : 'bg-slate-600';
  const textColor = isUser ? 'text-white' : 'text-gray-200';
  const align = isUser ? 'items-end' : 'items-start';
  const bubbleRadius = isUser ? 'rounded-l-xl rounded-tr-xl' : 'rounded-r-xl rounded-tl-xl';

  return (
    <div className={`flex flex-col mb-5 animate-fadeIn ${align}`}>
      <div className={`flex items-start ${isUser ? 'flex-row-reverse' : 'flex-row'} max-w-xl lg:max-w-3xl`}>
        <div className={`p-2.5 rounded-full shadow-md ${isUser ? 'ml-2.5 bg-purple-500' : 'mr-2.5 bg-slate-700'} flex-shrink-0`}>
          {isUser ? <IconUser className="w-5 h-5 text-white" /> : <IconSparkles className="w-5 h-5 text-purple-300" />}
        </div>
        <div className={`${bgColor} ${textColor} p-4 ${bubbleRadius} shadow-lg w-full`}>
          {message.isLoading && !message.text ? (
            <div className="flex items-center">
              <IconLoader className="animate-spin h-5 w-5 mr-2" />
              <span>Analyzing...</span>
            </div>
          ) : message.error ? (
            <div className="flex items-start text-red-300">
              <IconAlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <span className="break-words">Error: {message.error}</span>
            </div>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none remark-gfm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text + (message.isStreaming ? '▍' : '')}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
      {!isUser && message.groundingChunksWeb && message.groundingChunksWeb.length > 0 && (
        <div className={`mt-2.5 text-xs text-gray-400 max-w-xl lg:max-w-3xl ml-12 self-start bg-slate-700/50 p-2.5 rounded-md`}>
          <div>
            <span className="font-semibold text-gray-300">Retrieved from the web:</span>
            <ul className="list-none ml-0 space-y-1 mt-1">
              {message.groundingChunksWeb.map((item: GroundingChunkWeb, index: number) => (
                <li key={index}>
                  <a href={item.uri} target="_blank" rel="noopener noreferrer" className="flex items-center text-sky-400 hover:text-sky-300 hover:underline group">
                    <IconLink className="w-3 h-3 mr-1.5 flex-shrink-0 group-hover:text-sky-200" />
                    <span className="truncate" title={item.title || item.uri}>{item.title || item.uri}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

interface ChatInterfaceProps {
  fullText: string;
  analysis: FundingAnalysis;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ fullText, analysis }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);
  
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 120)}px`;
    }
  }, [userInput]);

  const handleClearChat = () => {
    setMessages([
      {
        id: 'intro-chat-cleared',
        text: "Chat cleared. Ask a new question about the business plan.",
        sender: 'ai',
      }
    ]);
  };

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!userInput.trim() || isSending) return;

    const userMessage: Message = { id: Date.now().toString(), text: userInput, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = userInput;
    setUserInput('');
    setIsSending(true);

    const aiMessageId = (Date.now() + 1).toString();
    const aiPlaceholderMessage: Message = { 
        id: aiMessageId, 
        text: '', 
        sender: 'ai', 
        isLoading: true, 
        isStreaming: true,
        groundingChunksWeb: [] 
    };
    setMessages(prev => [...prev, aiPlaceholderMessage]);

    try {
      let accumulatedText = "";
      const accumulatedGroundingChunksWeb: GroundingChunkWeb[] = [];

      const stream = geminiService.generateAnswerStream(currentInput, fullText, analysis);

      for await (const chunkResponse of stream) {
        if (chunkResponse.text) {
          accumulatedText += chunkResponse.text;
        }
        
        if (chunkResponse.candidates && chunkResponse.candidates[0]?.groundingMetadata?.groundingChunks) {
            chunkResponse.candidates[0].groundingMetadata.groundingChunks.forEach(gc => {
                if (gc.web && gc.web.uri) { // Ensure URI is present
                    if (!accumulatedGroundingChunksWeb.find(existing => existing.uri === gc.web.uri)) {
                        accumulatedGroundingChunksWeb.push({
                            uri: gc.web.uri,
                            title: gc.web.title || gc.web.uri, // Fallback for optional title
                        });
                    }
                }
            });
        }

        setMessages(prev => prev.map(msg => 
          msg.id === aiMessageId 
          ? { 
              ...msg, 
              text: accumulatedText, 
              isLoading: false,
              isStreaming: true,
              groundingChunksWeb: [...accumulatedGroundingChunksWeb]
            } 
          : msg
        ));
      }
      
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
        ? { 
            ...msg, 
            text: accumulatedText, 
            isStreaming: false,
            groundingChunksWeb: [...accumulatedGroundingChunksWeb]
          } 
        : msg
      ));

    } catch (error: any) {
      console.error("Error generating AI response:", error);
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
        ? { 
            ...msg, 
            isLoading: false, 
            isStreaming: false,
            error: error.message || "Failed to get response" 
          } 
        : msg
      ));
    } finally {
      setIsSending(false);
       if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }
  }, [userInput, isSending, fullText, analysis]);

  useEffect(() => {
    setMessages([{
        id: 'intro',
        text: "I've analyzed the business plan. Ask me any questions about its funding potential, strengths, or risks.",
        sender: 'ai',
        isLoading: false,
    }]);
  }, [analysis]);

  return (
    <section id="chat-interface" className="mt-8 flex flex-col h-[70vh] bg-slate-800/80 rounded-xl shadow-inner border border-slate-700/50">
       <div className="flex items-center justify-between p-4 border-b border-slate-700">
         <h2 className="text-xl font-semibold text-gray-200 flex items-center">
           <IconSparkles className="h-7 w-7 mr-2.5 text-purple-400"/>
           3. Chat with the Analyst
         </h2>
         <button 
            onClick={handleClearChat}
            title="Clear chat history"
            className="p-2 text-gray-400 hover:text-purple-400 transition-colors rounded-md hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800"
            aria-label="Clear chat history"
            disabled={isSending || messages.length <= 1}
          >
           <IconTrash className="w-5 h-5"/>
         </button>
       </div>
      <div className="flex-grow p-4 md:p-6 space-y-2 overflow-y-auto custom-scrollbar">
        {messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 md:p-5 border-t border-slate-700">
        <div className="flex items-end bg-slate-700 rounded-xl p-1.5 shadow-md focus-within:ring-2 focus-within:ring-purple-500 transition-shadow">
          <textarea
            ref={textareaRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="e.g., 'What are the biggest financial risks?'"
            className="flex-grow bg-transparent text-gray-200 placeholder-gray-400 focus:outline-none px-3 py-2.5 resize-none custom-scrollbar text-sm"
            disabled={isSending}
            rows={1}
            aria-label="Chat input"
          />
          <button
            type="submit"
            disabled={isSending || !userInput.trim()}
            className="ml-2 bg-gradient-to-br from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 ease-in-out self-end"
            aria-label="Send message"
          >
            {isSending ? <IconLoader className="animate-spin h-5 w-5" /> : <IconPaperAirplane className="h-5 w-5" />}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 ml-1">Shift+Enter for new line. The AI may use web search for broader market questions.</p>
      </form>
    </section>
  );
};

export default ChatInterface;