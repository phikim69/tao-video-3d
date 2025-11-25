import React, { useState, useEffect } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKey: string;
  onSaveKey: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, currentKey, onSaveKey }) => {
  const [keyInput, setKeyInput] = useState('');

  useEffect(() => {
    if (isOpen) setKeyInput(currentKey);
  }, [isOpen, currentKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveKey(keyInput);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Gemini API Key</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-zinc-900/50 p-3 rounded border border-zinc-800 text-sm text-zinc-400 flex gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-brand-lightGreen" />
            <p>
              Enter your Gemini API Key to enable AI features. If left blank, the app will attempt to use the system default key (if configured).
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
              API Key
            </label>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-all"
            />
          </div>

          <div className="pt-2">
            <Button fullWidth onClick={handleSave}>
              Save Configuration
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};