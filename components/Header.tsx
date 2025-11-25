
import React, { useEffect, useState } from 'react';
import { Save, FolderOpen, Undo, Redo, Key, Coins } from 'lucide-react';
import { Button } from './Button';
import { UsageStats } from '../types';
import { formatCurrency } from '../utils/cost';

interface HeaderProps {
  onSave: () => void;
  onOpen: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onApiKey: () => void;
  canUndo: boolean;
  canRedo: boolean;
  appName: string;
  usageStats?: UsageStats;
}

export const Header: React.FC<HeaderProps> = ({ 
  onSave, onOpen, onUndo, onRedo, onApiKey, canUndo, canRedo, appName, usageStats
}) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 border-b ${
        isScrolled 
          ? 'bg-black/60 backdrop-blur-md border-zinc-800 py-2' 
          : 'bg-transparent border-transparent py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
            <h1 className={`text-xl font-bold tracking-wider uppercase transition-all ${isScrolled ? 'text-gradient-brand' : 'text-white'}`}>
              {appName}
            </h1>
            
            {/* Usage Stats Display */}
            {usageStats && (
                <div className="hidden md:flex items-center gap-3 px-3 py-1 rounded-full bg-zinc-900/50 border border-zinc-800 text-xs">
                    <div className="flex items-center gap-1 text-zinc-400">
                        <Coins size={12} className="text-brand-green" />
                        <span>Project Cost:</span>
                    </div>
                    <span className="font-bold text-white font-mono">
                        {formatCurrency(usageStats.totalCost)}
                    </span>
                    <div className="w-px h-3 bg-zinc-700 mx-1" />
                    <div className="text-zinc-500 flex gap-2">
                        <span>In: {(usageStats.totalInputTokens / 1000).toFixed(1)}k</span>
                        <span>Out: {(usageStats.totalOutputTokens / 1000).toFixed(1)}k</span>
                    </div>
                </div>
            )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 mr-4 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
            <Button variant="icon" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)" className="w-8 h-8">
              <Undo size={16} />
            </Button>
            <Button variant="icon" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" className="w-8 h-8">
              <Redo size={16} />
            </Button>
          </div>

          <Button variant="secondary" onClick={onOpen} className="px-3 py-1.5 text-sm gap-2">
            <FolderOpen size={16} />
            <span className="hidden sm:inline">Open</span>
          </Button>
          
          <Button variant="primary" onClick={onSave} className="px-3 py-1.5 text-sm gap-2">
            <Save size={16} />
            <span className="hidden sm:inline">Save</span>
          </Button>

          <Button variant="icon" onClick={onApiKey} className="ml-2" title="Manage API Key">
            <Key size={18} />
          </Button>
        </div>
      </div>
    </header>
  );
};
