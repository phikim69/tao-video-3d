
import React from 'react';
import { DollarSign, Activity, ArrowRight } from 'lucide-react';
import { Button } from './Button';
import { CostEstimate, ActualUsage, formatCurrency, calculateDiffPercentage } from '../utils/cost';

interface CostEstimationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  estimate: CostEstimate;
  modelName: string;
  actionName: string;
}

export const CostEstimationModal: React.FC<CostEstimationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  estimate,
  modelName,
  actionName
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl max-w-md w-full p-6 relative">
        <div className="text-center mb-6">
            <div className="w-12 h-12 bg-brand-green/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-green/50">
                <DollarSign className="text-brand-green" size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">Xác nhận Chi Phí</h3>
            <p className="text-zinc-400 text-sm">Bạn sắp thực hiện hành động tính phí</p>
        </div>

        <div className="bg-zinc-900/50 rounded-lg p-4 space-y-3 border border-zinc-800 mb-6">
            <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Hành động:</span>
                <span className="text-white font-medium">{actionName}</span>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Model:</span>
                <span className="text-brand-lightGreen font-mono text-xs border border-brand-green/30 px-2 py-0.5 rounded bg-brand-green/10">
                    {modelName}
                </span>
            </div>
            <div className="h-px bg-zinc-800 my-2" />
            <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Input (Tokens):</span>
                <span className="text-zinc-300">{estimate.inputTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Est. Output (Tokens):</span>
                <span className="text-zinc-300">~{estimate.outputTokens.toLocaleString()}</span>
            </div>
            <div className="h-px bg-zinc-800 my-2" />
            <div className="flex justify-between items-center">
                <span className="text-zinc-400 font-bold">Tổng chi phí dự kiến:</span>
                <span className="text-xl font-bold text-white">{formatCurrency(estimate.totalCost)}</span>
            </div>
        </div>

        <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={onClose}>
                Hủy bỏ
            </Button>
            <Button variant="primary" fullWidth onClick={onConfirm}>
                Xác nhận & Chạy
            </Button>
        </div>
      </div>
    </div>
  );
};

interface CostResultToastProps {
  actual: ActualUsage;
  estimatedCost: number;
  onClose: () => void;
}

export const CostResultToast: React.FC<CostResultToastProps> = ({
  actual,
  estimatedCost,
  onClose
}) => {
  const diff = calculateDiffPercentage(estimatedCost, actual.totalCost);
  const isHigher = actual.totalCost > estimatedCost;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[90] bg-zinc-950 border border-brand-green/50 rounded-xl shadow-[0_0_30px_rgba(22,163,74,0.2)] p-4 flex items-center gap-6 animate-in slide-in-from-bottom-4 duration-300 min-w-[320px]">
       <div className="flex items-center gap-3">
           <div className="bg-brand-green text-black p-2 rounded-lg">
               <Activity size={20} />
           </div>
           <div>
               <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Thực tế thanh toán</h4>
               <div className="flex items-baseline gap-2">
                   <span className="text-xl font-bold text-white">{formatCurrency(actual.totalCost)}</span>
                   <span className={`text-xs font-medium ${isHigher ? 'text-red-400' : 'text-brand-lightGreen'}`}>
                       ({diff})
                   </span>
               </div>
           </div>
       </div>
       
       <div className="h-8 w-px bg-zinc-800" />
       
       <div className="text-xs space-y-1 text-zinc-400">
           <div>In: <span className="text-zinc-300">{actual.inputTokens.toLocaleString()}</span> toks</div>
           <div>Out: <span className="text-zinc-300">{actual.outputTokens.toLocaleString()}</span> toks</div>
       </div>

       <button onClick={onClose} className="absolute -top-2 -right-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-full p-1 border border-zinc-700">
           <ArrowRight size={12} />
       </button>
    </div>
  );
};
