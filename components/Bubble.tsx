import React, { useState } from 'react';
import { Heart, X } from 'lucide-react';

interface BubbleProps {
  onClick: () => void;
}

export const CoffeeBubble: React.FC<BubbleProps> = ({ onClick }) => {
  return (
    <div className="fixed bottom-8 right-8 z-50 group">
      <button
        onClick={onClick}
        className="relative flex items-center justify-center w-14 h-14 rounded-full bg-black border border-zinc-700 shadow-[0_0_15px_rgba(22,163,74,0.3)] hover:shadow-[0_0_25px_rgba(22,163,74,0.6)] transition-all duration-300 overflow-hidden group-hover:scale-110"
      >
        <div className="absolute inset-0 bg-gradient-brand opacity-20 group-hover:opacity-40 transition-opacity" />
        <Heart className="text-brand-lightGreen fill-brand-green" size={24} />
      </button>
      <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-zinc-900/90 backdrop-blur text-xs text-white rounded border border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Support Developer
      </div>
    </div>
  );
};

export const QRModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-sm w-full relative shadow-[0_0_50px_rgba(22,163,74,0.15)]">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center space-y-6">
          <h3 className="text-2xl font-bold text-gradient-brand">Mời PhiKim một ly cà phê</h3>
          
          <div className="bg-white p-2 rounded-xl mx-auto w-48 h-48 flex items-center justify-center">
             {/* Placeholder for QR Code - using a generic placeholder image */}
             <img 
               src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://phongthuy69.com" 
               alt="QR Code" 
               className="w-full h-full object-contain"
             />
          </div>

          <div className="space-y-2">
            <p className="text-zinc-300 text-sm">
              Nếu bạn thấy những chia sẻ của mình hữu ích, hãy ủng hộ để mình có thêm động lực nhé!
            </p>
            <a 
              href="https://phongthuy69.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-brand-lightGreen hover:underline text-sm font-medium mt-2"
            >
              https://phongthuy69.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};