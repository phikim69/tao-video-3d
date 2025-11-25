
import React, { useState, useRef } from 'react';
import { HelpCircle, Copy, Check, Download, FileJson, Mic, Play, Square } from 'lucide-react';
import { Button } from './Button';
import { generateSpeech } from '../utils/gemini';

interface StylePromptSectionProps {
  stylePrompt: string;
  onStylePromptChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDownloadAll: () => void;
  onExportJSON: () => void;
  selectedVoice: string;
  onVoiceChange: (voice: string) => void;
  apiKey?: string;
  onReqApiKey?: () => void;
  onDownloadAllAudio: () => void;
}

const MALE_VOICES = [
    'Achird', 'Algenib', 'Algieba', 'Alnilam', 'Charon', 'Enceladus', 'Fenrir', 'Iapetus', 
    'Orus', 'Puck', 'Rasalgethi', 'Sadachbia', 'Sadaltager', 'Schedar', 'Umbriel', 'Zubenelgenubi'
];
const FEMALE_VOICES = [
    'Achernar', 'Aoede', 'Autonoe', 'Callirrhoe', 'Despina', 'Erinome', 'Gacrux', 'Kore', 
    'Laomedeia', 'Leda', 'Pulcherrima', 'Sulafat', 'Vindemiatrix', 'Zephyr'
];

export const StylePromptSection: React.FC<StylePromptSectionProps> = ({
  stylePrompt,
  onStylePromptChange,
  onDownloadAll,
  onExportJSON,
  selectedVoice,
  onVoiceChange,
  apiKey,
  onReqApiKey,
  onDownloadAllAudio
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const competitorPrompt = `Nếu tôi gửi kịch bản thì dựa trên kịch bản hãy viết 1 prompt mô tả phong cách vẽ ảnh phù hợp với nội dung
Nếu tôi gửi 1 ảnh thì đấy là ảnh tôi muốn sao chép phong cách, hãy phân tích ảnh và viết prompt mô tả phong cách vẽ ảnh đấy
Để đảm bải prompt mô tả phong cách viết ra đủ chi tiết, bắt buộc tuân theo cú pháp sau:
(lưu ý những phần đề trong dấu * là phần bất biến, bắt buộc giữ lại chính xác 100% nguyên văn). Phần trong [] là hướng dẫn fill thông tin vào 

"*YÊU CẦU QUAN TRỌNG: Chỉ sử dụng hình ảnh tôi cung cấp để lấy thông tin về ngoại hình và trang phục của nhân vật. Toàn bộ bối cảnh, môi trường và hành động phải được tạo ra hoàn toàn dựa trên văn bản prompt sau đây. Không được sao chép hay tái sử dụng bối cảnh từ hình ảnh gốc*" bắt buộc có trong mọi prompt

Hãy vẽ lại nhân vật tôi gửi, với chính xác ngoại hình, trang phục nhưng customize theo phong cách: [3D hay 2D, vẽ đơn giản, tả siêu thực hay phương thức nào khác, màu sắc sử dụng, cách phân bổ ánh sáng, các kỹ thuật điện ảnh thường áp dụng, mood của ảnh, ảnh dành cho đối tượng nào, mang lại cảm giác gì, nét vẽ  (trong trường hợp ảnh vẽ) cần được mô tả chi tiết]

*Chi tiết nhân vật: [CHARACTER_STYLE]*
*+ Màu da/màu lông (đối với động vật):* [cách vẽ làn da chi tiết đến mức nào, màu sắc, mang lại cảm giác gì, màu da thể hiện điều gì]
*+ Phong cách trang phục:* [Cách vẽ trang phục, mức độ chi tiết của trang phục, gam màu, tông màu]. *Nếu có yêu cầu khác ở phân cảnh thì phải check lại scene trước xem những scene nào cùng khung cảnh phải đồng nhất trang phục với các scene đó. Ví dụ cũng buổi chiều tại trường học, chỉ đổi góc độ quay nhân vật thì vẫn là trang phục đấy, một cảnh khác nhân vật đã đi nơi khác vào thời điểm khác thì cần phải check lại kịch bản để lựa chọn trang phục phù hợp.*
*+ Phong cách vẽ mặt nhân vật:* [Phong cách vẽ, phong thái biểu cảm, mức độ biểu cảm, mức độ chi tiết các bộ phận trên mặt, phụ kiện đi kèm để nhận diện (ví dụ mắt kính, cài tóc,...), cách vẽ các chi tiết trên mặt đặc biệt là mắt mũi miệng]
*+ Các nhân vật khác nếu có sẽ với phong cách:* [Mô tả phong cách các nhân vật phụ nếu có].
*+ Tỉ lệ kích thước cơ thể (Tất cả nhân vật):* [Ví dụ thường dùng nhất là tỷ lệ hợp lý, không quá tập trung vào phần đầu mà làm cho đầu to mình nhỏ]
*+ Phong cách vẽ bối cảnh:* [Phong cách vẽ chung, chi tiết các công trình, nhà cửa vẽ thế nào, xe cộ vẽ thế nào, cây cối vẽ thế nào, màu sắc của bối cảnh, cách đánh sáng và các kỹ thuật điện ảnh thường dùng trong minh hoạ bối cảnh]

*Bối cảnh của phân cảnh là [A]

HƯỚNG DẪN ĐẦU RA: Không viết bất kỳ văn bản, tiêu đề hay mô tả nào. Toàn bộ phản hồi của bạn phải chỉ là hình ảnh được tạo ra.*`;

  const handleCopy = () => {
    navigator.clipboard.writeText(competitorPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePreviewVoice = async (voiceName: string) => {
    if (previewPlaying === voiceName) {
        audioRef.current?.pause();
        setPreviewPlaying(null);
        return;
    }

    if (!apiKey) {
        onReqApiKey?.();
        return;
    }

    try {
        setPreviewPlaying(voiceName); // Show loading/playing state
        const text = "Xin chào bạn, hy vọng giọng tôi sẽ phù hợp với bạn";
        // Fix: generateSpeech returns a GenResponse object, extract data property for the audio string
        const response = await generateSpeech(apiKey, text, voiceName);
        const audioData = response.data;
        
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = audioData;
            audioRef.current.play();
            audioRef.current.onended = () => setPreviewPlaying(null);
        }
    } catch (error) {
        console.error("Preview error:", error);
        setPreviewPlaying(null);
        alert("Lỗi tạo giọng nói mẫu. Kiểm tra API Key.");
    }
  };

  return (
    <div className="mb-8 border border-zinc-800 rounded-xl bg-zinc-900/40 backdrop-blur-sm p-6">
      {/* Header Row */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 gap-4">
        <div className="flex items-center gap-2">
            <h3 className="text-white font-bold uppercase tracking-wider text-sm">Phong Cách & Âm Thanh</h3>
            <button 
                onClick={() => setShowHelp(true)}
                className="text-zinc-500 hover:text-brand-green transition-colors"
                title="Help"
            >
                <HelpCircle size={16} />
            </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onExportJSON} className="text-xs gap-2">
              <FileJson size={14} /> Xuất JSON
          </Button>
          <Button variant="secondary" onClick={onDownloadAllAudio} className="text-xs gap-2">
              <Mic size={14} /> Tải Audio (Zip)
          </Button>
          <Button variant="secondary" onClick={onDownloadAll} className="text-xs gap-2">
              <Download size={14} /> Tải Ảnh (ZIP)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Style Prompt Input */}
          <div className="lg:col-span-2 relative">
            <label className="block text-[10px] uppercase text-zinc-500 font-bold mb-1">Style Prompt (Mô tả phong cách)</label>
            <input
              type="text"
              value={stylePrompt}
              onChange={onStylePromptChange}
              placeholder="Mô tả phong cách ảnh (Ví dụ: 3D Pixar style, cute, bright lighting...)"
              className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green transition-all"
            />
          </div>

          {/* Voice Selector */}
          <div className="lg:col-span-1">
             <label className="block text-[10px] uppercase text-zinc-500 font-bold mb-1">Giọng Đọc (TTS)</label>
             <div className="relative">
                 <select 
                    value={selectedVoice}
                    onChange={(e) => onVoiceChange(e.target.value)}
                    className="w-full bg-black border border-zinc-700 rounded-lg pl-4 pr-10 py-3 text-white appearance-none focus:outline-none focus:border-brand-green cursor-pointer custom-scrollbar"
                 >
                    <optgroup label="Giọng Nam (Male)">
                        {MALE_VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                    </optgroup>
                    <optgroup label="Giọng Nữ (Female)">
                        {FEMALE_VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                    </optgroup>
                 </select>
                 
                 {/* Preview Button Overlay */}
                 <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-zinc-900/80 rounded p-1">
                     <button 
                        onClick={() => handlePreviewVoice(selectedVoice)}
                        className={`p-1.5 rounded hover:bg-zinc-700 transition-colors ${previewPlaying === selectedVoice ? 'text-brand-green' : 'text-zinc-400'}`}
                        title="Nghe thử giọng này"
                     >
                         {previewPlaying === selectedVoice ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                     </button>
                 </div>
                 
                 {/* Hidden Audio Element for Preview */}
                 <audio ref={audioRef} className="hidden" />
             </div>
          </div>
      </div>
      
      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-2xl w-full relative shadow-2xl max-h-[80vh] overflow-y-auto custom-scrollbar">
             <button 
                onClick={() => setShowHelp(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
             >
                 Close
             </button>
             
             <h3 className="text-xl font-bold text-white mb-4">Hướng Dẫn Tạo Style Prompt</h3>
             
             <div className="space-y-4 text-zinc-300 text-sm">
                 <p>
                     <strong>Style Prompt</strong> là mô tả phong cách sẽ được áp dụng cho toàn bộ các ảnh được tạo ra trong dự án này.
                 </p>
                 
                 <div className="bg-zinc-950 p-4 rounded border border-zinc-800">
                     <p className="font-bold text-white mb-2">Tạo Style Prompt chuẩn Format:</p>
                     <p className="mb-3 text-xs text-zinc-400">
                         Gửi đoạn prompt dưới đây cho Gemini/ChatGPT kèm theo ảnh mẫu hoặc kịch bản. AI sẽ viết lại Style Prompt chuẩn cho bạn.
                         Sau đó, hãy copy kết quả dán vào ô "Style Prompt" ở trên.
                     </p>
                     
                     <div className="relative">
                         <div className="bg-black/50 p-3 rounded text-xs text-zinc-400 font-mono border border-zinc-800 h-48 overflow-y-auto whitespace-pre-wrap">
                             {competitorPrompt}
                         </div>
                         <button 
                             onClick={handleCopy}
                             className="absolute top-2 right-2 p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded border border-zinc-600 transition-colors flex items-center gap-2 text-xs"
                         >
                             {copied ? <Check size={14} className="text-brand-lightGreen" /> : <Copy size={14} />}
                             {copied ? 'Copied!' : 'Copy'}
                         </button>
                     </div>
                 </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
