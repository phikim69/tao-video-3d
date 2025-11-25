
import React, { useState, useEffect } from 'react';
import { X, Save, Copy, RefreshCw, Check } from 'lucide-react';
import { Button } from './Button';

interface MotionPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt: string;
  initialName: string;
  onSave: (name: string, prompt: string) => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

export const MotionPromptModal: React.FC<MotionPromptModalProps> = ({
  isOpen,
  onClose,
  initialPrompt,
  initialName,
  onSave,
  onRegenerate,
  isRegenerating
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [name, setName] = useState(initialName);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPrompt(initialPrompt);
      setName(initialName);
    }
  }, [isOpen, initialPrompt, initialName]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSave(name, prompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950 rounded-t-xl">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            🎬 Chỉnh Sửa Motion Prompt
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-grow space-y-6">
          
          {/* Name Input */}
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
              Tên ngắn (Tiếng Việt)
            </label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-brand-lightGreen font-medium focus:border-brand-green focus:outline-none"
              placeholder="Ví dụ: Camera zoom in vào nhân vật..."
            />
          </div>

          {/* Prompt Textarea */}
          <div className="flex-grow flex flex-col">
            <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider">
                Nội dung Prompt (English - Cinematic)
                </label>
                <button 
                    onClick={handleCopy}
                    className="text-xs flex items-center gap-1 text-zinc-400 hover:text-white bg-zinc-800 px-2 py-1 rounded border border-zinc-700"
                >
                    {copied ? <Check size={12} className="text-brand-lightGreen"/> : <Copy size={12} />}
                    {copied ? "Copied" : "Copy Full"}
                </button>
            </div>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-64 bg-black border border-zinc-700 rounded-lg p-4 text-sm text-zinc-300 leading-relaxed focus:border-brand-green focus:outline-none resize-none custom-scrollbar"
              placeholder="Detailed cinematic motion description..."
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 rounded-b-xl flex justify-between items-center">
          <Button 
            variant="secondary" 
            onClick={onRegenerate} 
            disabled={isRegenerating}
            className="text-zinc-400 hover:text-white"
          >
            <RefreshCw size={16} className={`mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
            {isRegenerating ? 'Đang tạo lại...' : 'Tạo Lại Prompt'}
          </Button>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>
              Hủy
            </Button>
            <Button variant="primary" onClick={handleSave}>
              <Save size={16} className="mr-2" /> Lưu Thay Đổi
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};
