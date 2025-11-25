
import React, { useState, useRef, useEffect } from 'react';
import { X, Send, FileText, Upload, Play } from 'lucide-react';
import { Button } from './Button';
import { createScriptChatSession } from '../utils/gemini';
import { GenerateContentResponse } from '@google/genai';

interface ScriptChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onApplyScript: (lines: string[], targetColumn: 'vietnamese' | 'contextPrompt') => void;
  onRequestApiKey: () => void;
  onUsageUpdate?: (inputTokens: number, outputTokens: number) => void;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

export const ScriptChatModal: React.FC<ScriptChatModalProps> = ({
  isOpen,
  onClose,
  apiKey,
  onApplyScript,
  onRequestApiKey,
  onUsageUpdate
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatSession, setChatSession] = useState<any>(null);
  const [showColumnSelection, setShowColumnSelection] = useState(false);
  
  const currentResponseRef = useRef<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const content = ev.target?.result as string;
      const initialMsgs: Message[] = [
        { role: 'user', text: `NỘI DUNG FILE KỊCH BẢN:\n\n${content}` },
        { role: 'model', text: 'Bạn cần hỗ trợ gì với kịch bản này?' }
      ];
      setMessages(initialMsgs);
      
      if (apiKey) {
        try {
          const session = createScriptChatSession(apiKey);
          // Note: In a real implementation we might want to track cost for this initial context loading too,
          // but for UI simplicity we'll track explicit user interactions
          await session.sendMessage({ message: `Đây là nội dung kịch bản của tôi:\n${content}\n\nHãy xác nhận đã nhận được.` });
          setChatSession(session);
        } catch (err) {
          console.error(err);
        }
      } else {
        onRequestApiKey();
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    if (!apiKey) {
      onRequestApiKey();
      return;
    }
    if (!chatSession) {
      alert("Vui lòng upload kịch bản trước hoặc kiểm tra API Key.");
      return;
    }

    const newMessages = [...messages, { role: 'user', text } as Message];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);
    currentResponseRef.current = '';

    try {
      const result = await chatSession.sendMessageStream({ message: text });
      
      const modelMsgIndex = newMessages.length;
      const msgsWithPlaceholder = [...newMessages, { role: 'model', text: '' } as Message];
      setMessages(msgsWithPlaceholder);

      let finalUsage = { promptTokens: 0, candidatesTokens: 0 };

      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        const textChunk = c.text;
        if (textChunk) {
            currentResponseRef.current += textChunk;
            setMessages(prev => {
                const updated = [...prev];
                updated[modelMsgIndex] = { role: 'model', text: currentResponseRef.current };
                return updated;
            });
        }
        if (c.usageMetadata) {
            finalUsage.promptTokens = c.usageMetadata.promptTokenCount || 0;
            finalUsage.candidatesTokens = c.usageMetadata.candidatesTokenCount || 0;
        }
      }
      
      // Report usage up to parent
      if (onUsageUpdate) {
          onUsageUpdate(finalUsage.promptTokens, finalUsage.candidatesTokens);
      }

    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${error.message}` }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSegmentPrompt = () => {
    const prompt = `Chia nhỏ kịch bản trên ra thành các dòng ngắn 7-15 chữ (lưu ý không cắt ngang nội dung đang nói cho phù hợp với số chữ, câu nào phải hết ý câu đó, lưu ý chỉ cắt ngắn không thêm không bớt bất kỳ chữ nào vào kịch bản mỗi đoạn viết ở một dòng, xuống hàng rồi đến phân đoạn tiếp theo, Chỉ viết kịch bản, không thông báo, không trình bày, không chào hỏi, không nói gì thêm khác, chỉ chia nhỏ kịch bản, bắt đầu bằng phân đoạn đầu được chia nhỏ kết thúc là phân đoạn cuối. Ví dụ câu trả lời mẫu là:
Ngày hôm nay chúng ta cùng nhau chào đón một vị khách mời
Người này vô cùng đặc biệt.
Có thể bạn đã thấy anh ta qua tivi, bởi vì anh ta nổi tiếng.
Mỗi phân đoạn chia ngắn như vậy về sau nhằm mục đích tạo giọng nói và tạo ảnh minh họa vì vậy không được chia quá ngắn và không được cắt ngang ý đang triển khai`;
    
    sendMessage(prompt);
  };

  const handleProcessScript = (column: 'vietnamese' | 'contextPrompt') => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'model') return;

    const lines = lastMsg.text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    onApplyScript(lines, column);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] flex overflow-hidden">
        
        {/* Left: Chat Area */}
        <div className="flex-grow flex flex-col border-r border-zinc-800">
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
             <div className="flex flex-col">
                 <h3 className="text-white font-bold flex items-center gap-2">
                   <FileText className="text-brand-green" size={20} />
                   Trợ Lý Kịch Bản AI
                 </h3>
                 <span className="text-[10px] text-brand-lightGreen ml-7">Model: gemini-2.5-flash</span>
             </div>
             <button onClick={onClose} className="text-zinc-500 hover:text-white"><X size={24} /></button>
          </div>
          
          {/* Messages */}
          <div className="flex-grow overflow-y-auto p-6 space-y-6 custom-scrollbar bg-black/50">
             {messages.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4">
                     <FileText size={48} className="opacity-20" />
                     <p>Hãy upload file kịch bản (.txt) để bắt đầu</p>
                     <Button onClick={() => fileInputRef.current?.click()}>
                        <Upload size={16} className="mr-2" /> Upload Script
                     </Button>
                     <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload} 
                        accept=".txt" 
                        className="hidden" 
                     />
                 </div>
             ) : (
                 messages.map((msg, idx) => (
                     <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                         <div className={`max-w-[80%] p-4 rounded-xl ${
                             msg.role === 'user' 
                             ? 'bg-zinc-800 text-white rounded-br-none' 
                             : 'bg-zinc-900/80 border border-zinc-800 text-zinc-300 rounded-bl-none'
                         }`}>
                             <p className="whitespace-pre-wrap text-sm leading-relaxed font-mono">{msg.text}</p>
                         </div>
                     </div>
                 ))
             )}
             {isTyping && (
                 <div className="flex justify-start">
                     <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-xl rounded-bl-none flex gap-2 items-center">
                         <div className="w-2 h-2 bg-brand-green rounded-full animate-bounce" />
                         <div className="w-2 h-2 bg-brand-green rounded-full animate-bounce delay-100" />
                         <div className="w-2 h-2 bg-brand-green rounded-full animate-bounce delay-200" />
                     </div>
                 </div>
             )}
             
             {!isTyping && messages.length > 2 && messages[messages.length - 1].role === 'model' && (
                 <div className="flex justify-center mt-4">
                     <Button 
                        variant="primary" 
                        className="bg-brand-green text-black hover:bg-white border-none shadow-[0_0_15px_rgba(22,163,74,0.3)] animate-pulse"
                        onClick={() => setShowColumnSelection(true)}
                     >
                         Trình bày kịch bản
                     </Button>
                 </div>
             )}

             <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900">
             <div className="relative">
                 <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                    placeholder="Nhập yêu cầu của bạn..."
                    className="w-full bg-black border border-zinc-700 rounded-lg pl-4 pr-12 py-3 text-white focus:outline-none focus:border-brand-green"
                    disabled={isTyping || messages.length === 0}
                 />
                 <button 
                    onClick={() => sendMessage(input)}
                    disabled={isTyping || !input.trim() || messages.length === 0}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-brand-green hover:text-white disabled:opacity-50"
                 >
                     <Send size={20} />
                 </button>
             </div>
          </div>
        </div>

        {/* Right: Control Panel */}
        <div className="w-80 bg-zinc-900 border-l border-zinc-800 p-6 flex flex-col gap-6">
            <div>
                <h4 className="text-white font-bold uppercase text-xs tracking-wider mb-4 border-b border-zinc-800 pb-2">
                    Prompt Mẫu
                </h4>
                <div className="space-y-3">
                    <button 
                        onClick={handleSegmentPrompt}
                        disabled={messages.length === 0 || isTyping}
                        className="w-full text-left p-3 rounded bg-zinc-800 hover:bg-zinc-700 hover:border-brand-green border border-transparent transition-all group"
                    >
                        <div className="flex items-center gap-2 mb-1">
                             <Play size={14} className="text-brand-green" />
                             <span className="text-sm font-bold text-white">Phân Đoạn Kịch Bản</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 line-clamp-2">
                            Chia nhỏ kịch bản thành các dòng ngắn 7-15 chữ để làm video...
                        </p>
                    </button>
                </div>
            </div>

            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 mt-auto">
                <h4 className="text-zinc-500 uppercase text-[10px] font-bold tracking-wider mb-2">
                    Thông tin
                </h4>
                <p className="text-xs text-zinc-400">
                    Sử dụng Gemini AI để xử lý kịch bản thô. Sau khi có kết quả ưng ý, ấn "Trình bày kịch bản" để đưa vào bảng dự án.
                </p>
            </div>
        </div>
      </div>

      {showColumnSelection && (
          <div className="absolute inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-zinc-900 border border-brand-green rounded-xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                  <h3 className="text-xl font-bold text-white mb-4 text-center">Kịch bản này ngôn ngữ gì?</h3>
                  <p className="text-zinc-400 text-sm mb-6 text-center">
                      Hệ thống sẽ sắp xếp nội dung vào đúng cột tương ứng.
                  </p>
                  
                  <div className="grid grid-cols-1 gap-3">
                      <button 
                        onClick={() => handleProcessScript('contextPrompt')}
                        className="p-4 rounded-lg bg-zinc-800 hover:bg-brand-green hover:text-black border border-zinc-700 transition-all text-left group"
                      >
                          <span className="block font-bold mb-1">Tiếng Việt</span>
                          <span className="text-xs opacity-60 group-hover:opacity-80">Điền vào cột Mô Tả Phân Cảnh (Cột 3)</span>
                      </button>

                      <button 
                        onClick={() => handleProcessScript('vietnamese')}
                        className="p-4 rounded-lg bg-zinc-800 hover:bg-brand-green hover:text-black border border-zinc-700 transition-all text-left group"
                      >
                          <span className="block font-bold mb-1">Ngôn ngữ khác</span>
                          <span className="text-xs opacity-60 group-hover:opacity-80">Điền vào cột Kịch Bản (Cột 2)</span>
                      </button>
                  </div>

                  <button 
                    onClick={() => setShowColumnSelection(false)}
                    className="mt-4 w-full text-center text-xs text-zinc-500 hover:text-white py-2"
                  >
                      Hủy bỏ
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
