
import React, { useState, useEffect } from 'react';
import { Scene, Character } from '../types';
import { X, ChevronLeft, ChevronRight, Download, RefreshCw, AlertTriangle, User, Palette, Camera, Scaling, Brain, ShieldAlert, CheckCircle, Clock, Film, FileText } from 'lucide-react';
import { Button } from './Button';

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  initialIndex: number;
  scenes: Scene[];
  stylePrompt: string;
  characters: Character[];
  onRegenerate: (index: number, promptOverride?: string, useCurrentAsBase?: boolean) => Promise<void>;
  onSetVersion?: (index: number, imageVersion: string) => void;
  onDownload: (scene: Scene) => void;
  onOpenMotionModal?: (index: number) => void;
  onGenerateMotion?: (index: number) => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({
  isOpen,
  onClose,
  initialIndex,
  scenes,
  stylePrompt,
  characters,
  onRegenerate,
  onSetVersion,
  onDownload,
  onOpenMotionModal,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, isOpen]);

  useEffect(() => {
      const scene = scenes[currentIndex];
      if (scene?.imageData) {
          setViewingImage(scene.imageData);
      } else {
          setViewingImage(null);
      }
  }, [currentIndex, scenes]);

  if (!isOpen) return null;

  const currentScene = scenes[currentIndex];
  const displayedImage = viewingImage || currentScene?.imageData;
  const hasImage = !!displayedImage;
  const history = currentScene?.imageHistory || (currentScene?.imageData ? [currentScene.imageData] : []);
  const isViewingActiveVersion = viewingImage === currentScene?.imageData;

  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : scenes.length - 1));
    setRefinementPrompt('');
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev < scenes.length - 1 ? prev + 1 : 0));
    setRefinementPrompt('');
  };

  const handleRegenerate = async (useRefinement = false) => {
    if (!currentScene) return;
    setIsProcessing(true);
    try {
        if (useRefinement && refinementPrompt) {
            // Logic: Regenerate THIS image with instructions
            await onRegenerate(currentIndex, refinementPrompt, true);
        } else {
            // Regenerate from scratch using prompt in table
            await onRegenerate(currentIndex);
        }
    } finally {
        setIsProcessing(false);
        setRefinementPrompt('');
    }
  };
  
  const handleDownloadCurrentView = () => {
      if (!displayedImage) return;
      const link = document.createElement('a');
      link.href = displayedImage;
      link.download = `${currentScene.sceneId}_ver_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleQuickFix = (type: 'CHARACTER' | 'STYLE' | 'ANGLE' | 'RATIO' | 'LOGIC' | 'POLICY') => {
      let prompt = "";
      switch (type) {
          case 'CHARACTER':
              prompt = "Ngoại hình nhân vật chưa đúng với ảnh tham khảo (Reference). Hãy giữ nguyên bố cục nhưng sửa lại khuôn mặt, trang phục cho giống hệt nhân vật đã chọn.";
              break;
          case 'STYLE':
              prompt = `Ảnh chưa đúng phong cách chủ đạo. Style yêu cầu: "${stylePrompt}". Hãy áp dụng style này mạnh mẽ hơn.`;
              break;
          case 'ANGLE':
              prompt = "Đổi góc máy khác. Góc hiện tại bị trùng lặp hoặc nhàm chán.";
              break;
          case 'RATIO':
              prompt = "Điều chỉnh lại tỉ lệ cơ thể nhân vật cho cân đối.";
              break;
          case 'LOGIC':
              prompt = `Hình ảnh chưa khớp với kịch bản: "${currentScene.vietnamese}". Hãy sửa lại chi tiết hành động cho đúng logic.`;
              break;
          case 'POLICY':
              prompt = "Lách lỗi policy: tập trung vào biểu cảm và không khí thay vì các yếu tố bạo lực/nhạy cảm trực tiếp.";
              break;
      }
      setRefinementPrompt(prompt);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
        <div className="text-zinc-400 font-mono text-sm">
          <span className="text-brand-lightGreen font-bold">Scene {currentScene?.sceneId}</span> ({currentIndex + 1} / {scenes.length})
        </div>
        <div className="flex items-center gap-4">
             {hasImage && (
                <Button variant="secondary" onClick={handleDownloadCurrentView} className="text-sm gap-2">
                    <Download size={16} /> Download This Version
                </Button>
             )}
            <button onClick={onClose} className="text-zinc-400 hover:text-white p-2 hover:bg-zinc-800 rounded-full transition-colors">
                <X size={24} />
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow flex items-stretch overflow-hidden">
        {/* Navigation Left */}
        <button onClick={handlePrev} className="p-4 text-zinc-600 hover:text-white hover:bg-white/5 transition-colors z-10 flex-shrink-0">
            <ChevronLeft size={48} />
        </button>

        {/* Image Display */}
        <div className="flex-grow flex flex-col items-center justify-center p-4 relative bg-zinc-950 group/canvas">
             <div className="flex-grow flex items-center justify-center w-full h-full relative">
                {displayedImage ? (
                    <div className="relative max-h-full max-w-full">
                        <img 
                            src={displayedImage} 
                            alt={`Scene ${currentScene.sceneId}`}
                            className="max-h-[80vh] max-w-full object-contain shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-sm"
                        />
                        
                        {/* Overlay Motion Button */}
                        {currentScene.motionPrompt && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-0 group-hover/canvas:opacity-100 transition-all duration-300 transform translate-y-2 group-hover/canvas:translate-y-0">
                                <button 
                                    onClick={() => onOpenMotionModal && onOpenMotionModal(currentIndex)}
                                    className="bg-black/80 backdrop-blur border border-brand-green/50 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:bg-brand-green hover:text-black transition-colors"
                                >
                                    <Film size={16} />
                                    <span className="text-xs font-bold uppercase tracking-wide">
                                        {currentScene.motionPromptName || "View Motion"}
                                    </span>
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-zinc-500 flex flex-col items-center">
                        <p>Chưa có ảnh cho phân cảnh này.</p>
                    </div>
                )}
                
                {isProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
                        <div className="flex flex-col items-center gap-4">
                            <RefreshCw className="animate-spin text-brand-green" size={48} />
                            <span className="text-brand-lightGreen font-medium animate-pulse">Generating...</span>
                        </div>
                    </div>
                )}
             </div>

             {/* Version Status Bar */}
             <div className="h-14 w-full flex items-center justify-center mt-2 border-t border-zinc-900 pt-2 gap-4">
                 {!isViewingActiveVersion && displayedImage && (
                     <Button 
                        variant="primary" 
                        className="text-xs bg-brand-green text-black hover:bg-brand-lightGreen border-none"
                        onClick={() => onSetVersion && viewingImage && onSetVersion(currentIndex, viewingImage)}
                     >
                        <CheckCircle size={14} className="mr-2" /> Set as Main Version
                     </Button>
                 )}
             </div>
        </div>

        {/* Navigation Right */}
        <button onClick={handleNext} className="p-4 text-zinc-600 hover:text-white hover:bg-white/5 transition-colors z-10 flex-shrink-0">
            <ChevronRight size={48} />
        </button>

        {/* Sidebar Info */}
        <div className="w-96 bg-zinc-900 border-l border-zinc-800 p-6 overflow-y-auto flex-shrink-0 custom-scrollbar flex flex-col gap-4">
            
            {/* Context Section */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                    <FileText size={14} /> Nội Dung Kịch Bản
                </h3>
                <div className="space-y-3">
                    <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">Kịch bản:</span>
                        <p className="text-zinc-300 text-sm leading-relaxed">{currentScene.vietnamese || "(Trống)"}</p>
                    </div>
                     <div>
                        <span className="text-[10px] text-zinc-500 uppercase font-bold">Mô tả phân cảnh (Prompt):</span>
                        <p className="text-zinc-400 text-xs italic">{currentScene.contextPrompt || "(Trống)"}</p>
                    </div>
                </div>
            </div>

            {/* Quick Fixes */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <AlertTriangle size={14} className="text-yellow-500" /> Sửa Nhanh (Quick Fix)
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => handleQuickFix('CHARACTER')} className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-xs text-left text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
                        <User size={12} /> Sai Nhân Vật
                    </button>
                    <button onClick={() => handleQuickFix('STYLE')} className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-xs text-left text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
                        <Palette size={12} /> Sai Style
                    </button>
                    <button onClick={() => handleQuickFix('ANGLE')} className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-xs text-left text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
                        <Camera size={12} /> Đổi Góc Độ
                    </button>
                     <button onClick={() => handleQuickFix('RATIO')} className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-xs text-left text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
                        <Scaling size={12} /> Sai Tỉ Lệ
                    </button>
                     <button onClick={() => handleQuickFix('LOGIC')} className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-xs text-left text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
                        <Brain size={12} /> Sai Logic
                    </button>
                     <button onClick={() => handleQuickFix('POLICY')} className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-xs text-left text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
                        <ShieldAlert size={12} /> Policy Fix
                    </button>
                </div>
            </div>

            {/* Prompt Edit Area */}
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex-grow flex flex-col min-h-[150px]">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Sửa Ảnh Này (Edit Generated Image)</h3>
                <textarea 
                    value={refinementPrompt}
                    onChange={(e) => setRefinementPrompt(e.target.value)}
                    placeholder="Nhập yêu cầu sửa ảnh (VD: Thêm ánh sáng, bỏ cái ghế đi...) và ấn nút dưới."
                    className="flex-grow w-full bg-black/50 border border-zinc-800 rounded p-3 text-xs text-zinc-300 focus:outline-none focus:border-brand-green resize-none mb-3 custom-scrollbar"
                />
                <Button 
                    fullWidth 
                    onClick={() => handleRegenerate(true)}
                    disabled={isProcessing || !refinementPrompt}
                >
                    {isProcessing ? <RefreshCw size={16} className="animate-spin" /> : "Áp Dụng Sửa (Apply)"}
                </Button>
            </div>

             {/* History */}
             {history.length > 0 && (
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                         <Clock size={14} /> Lịch sử ({history.length})
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                        {history.map((img, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => setViewingImage(img)}
                                className={`aspect-square rounded overflow-hidden cursor-pointer border-2 transition-all ${viewingImage === img ? 'border-brand-green' : 'border-transparent opacity-60 hover:opacity-100'}`}
                            >
                                <img src={img} className="w-full h-full object-cover" alt={`ver-${idx}`} />
                            </div>
                        ))}
                    </div>
                </div>
             )}
        </div>
      </div>
    </div>
  );
};
