

import React, { useRef, useState, useEffect } from 'react';
import { Scene, Character } from '../types';
import { Button } from './Button';
import { Image as ImageIcon, Loader2, Trash2, Plus, FileSpreadsheet, Eye, ChevronDown, FileText, Mic, Play, Pause, RefreshCw, Download, Video } from 'lucide-react';
import { parseExcelFile } from '../utils/helpers';

interface ScriptTableProps {
  scenes: Scene[];
  characters: Character[];
  onScenesChange: (scenes: Scene[]) => void;
  onGenerateImage: (index: number) => void;
  onViewImage: (index: number) => void;
  isGenerating: (index: number) => boolean;
  apiKey?: string;
  onGenerateMotion: (index: number) => void;
  onViewMotion: (index: number) => void;
  onGenerateAllMotion: () => void;
  onGenerateAllImages: () => void;
  onOpenScriptChat?: () => void;
  onGenerateAudio: (index: number) => void;
  onGenerateAllAudio: () => void;
  // New props for Video Prompt
  onGenerateVideoPrompt: (index: number) => void;
  onGenerateAllVideoPrompts: () => void;
}

export const ScriptTable: React.FC<ScriptTableProps> = ({
  scenes,
  characters,
  onScenesChange,
  onGenerateImage,
  onViewImage,
  isGenerating,
  onGenerateAllImages,
  onOpenScriptChat,
  onGenerateAudio,
  onGenerateAllAudio,
  onGenerateVideoPrompt,
  onGenerateAllVideoPrompts
}) => {
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [openCharDropdown, setOpenCharDropdown] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  
  // Refs for audio elements
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const hasData = scenes.length > 3 || (scenes.length > 0 && scenes[0].vietnamese !== '');

  // Handle audio ending
  useEffect(() => {
      const handleEnded = (id: string) => {
          if (playingAudioId === id) setPlayingAudioId(null);
      };
      
      // Attach listeners if needed, but mostly we set onended directly when playing
      return () => {
          // Cleanup
          Object.values(audioRefs.current).forEach(audio => {
              audio.pause();
          });
      };
  }, [playingAudioId]);

  const handlePlayAudio = (sceneId: string, audioData: string) => {
      const audio = audioRefs.current[sceneId] || new Audio(audioData);
      audioRefs.current[sceneId] = audio;

      if (playingAudioId === sceneId) {
          // Pause
          audio.pause();
          setPlayingAudioId(null);
      } else {
          // Stop others
          if (playingAudioId && audioRefs.current[playingAudioId]) {
              audioRefs.current[playingAudioId].pause();
          }
          
          // Play this one
          audio.src = audioData; // Ensure src is set
          audio.play();
          setPlayingAudioId(sceneId);
          audio.onended = () => setPlayingAudioId(null);
      }
  };
  
  const handleDownloadAudio = (scene: Scene) => {
      if (!scene.audioData) return;
      const link = document.createElement('a');
      link.href = scene.audioData;
      // Naming: "1.mp3" or "C3.mp3" (technically wav but mp3 ext is usually fine for user perception, or just .wav)
      // User requested "file âm thanh từng phân cảnh sẽ được đặt tên giống với cột Scene"
      link.download = `${scene.sceneId}.wav`; 
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedScenes = await parseExcelFile(file);
      const defaultChar = characters.find(c => c.isDefault);
      const processedScenes = importedScenes.map(scene => ({ 
          ...scene, 
          selectedCharacterIds: defaultChar ? [defaultChar.id] : [], 
          imageHistory: [] 
      }));
      onScenesChange(processedScenes);
    } catch (err) {
      alert("Failed to parse Excel file.");
    }
    e.target.value = ''; 
  };

  const updateScene = (index: number, field: keyof Scene, value: any) => {
    const newScenes = [...scenes];
    newScenes[index] = { ...newScenes[index], [field]: value };
    onScenesChange(newScenes);
  };

  const addRow = () => {
    const defaultChar = characters.find(c => c.isDefault);
    onScenesChange([
      ...scenes,
      {
        id: crypto.randomUUID(),
        sceneId: `${scenes.length + 1}`,
        vietnamese: '', 
        contextPrompt: '', 
        selectedCharacterIds: defaultChar ? [defaultChar.id] : [],
        imageHistory: [],
      },
    ]);
  };

  const removeRow = (index: number) => {
    if(!confirm("Xóa hàng này?")) return;
    const newScenes = scenes.filter((_, i) => i !== index);
    onScenesChange(newScenes);
  };

  const toggleCharacterSelection = (sceneIndex: number, charId: string) => {
      const scene = scenes[sceneIndex];
      const currentIds = scene.selectedCharacterIds || [];
      let newIds;
      if (currentIds.includes(charId)) {
          newIds = currentIds.filter(id => id !== charId);
      } else {
          newIds = [...currentIds, charId];
      }
      updateScene(sceneIndex, 'selectedCharacterIds', newIds);
  };

  return (
    <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm shadow-xl">
      <input type="file" ref={excelInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleExcelImport} />
      
      {/* Toolbar */}
      <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
         <div className="flex items-center gap-4">
            <h3 className="text-white font-bold uppercase tracking-wider text-sm">Phân đoạn Kịch Bản</h3>
            <button 
                onClick={addRow}
                className="flex items-center gap-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded border border-zinc-700"
            >
                <Plus size={14} /> Thêm Phân Đoạn
            </button>
         </div>
         <div className="flex gap-2">
            {!hasData && onOpenScriptChat && (
                 <Button variant="primary" onClick={onOpenScriptChat} className="text-xs bg-blue-600 hover:bg-blue-500 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]">
                    <FileText size={16} className="mr-2" /> Upload Script (Txt)
                </Button>
            )}
            <Button variant="secondary" onClick={() => excelInputRef.current?.click()} className="text-xs">
                <FileSpreadsheet size={16} className="mr-2" /> Import Excel
            </Button>
         </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-400 border-collapse">
          <thead className="bg-zinc-950 text-zinc-200 uppercase tracking-wider font-medium text-xs">
            <tr>
              {/* 1. Scene ID */}
              <th className="px-4 py-3 w-16 text-center border-r border-zinc-800">Scene</th>
              
              {/* 2. Kịch bản */}
              <th className="px-4 py-3 w-64 border-r border-zinc-800 text-center">Kịch bản</th>
              
              {/* 3. Mô tả phân cảnh */}
              <th className="px-4 py-3 w-64 border-r border-zinc-800 text-center">Mô Tả Phân Cảnh</th>
              
              {/* 4. Chọn nhân vật */}
              <th className="px-4 py-3 w-40 border-r border-zinc-800 text-center">Chọn Nhân Vật</th>
              
              {/* 5. Tạo ảnh */}
              <th className="px-4 py-3 w-32 text-center border-r border-zinc-800">
                  <div className="flex flex-col items-center gap-1">
                      <span>Hình Ảnh</span>
                      <Button variant="primary" onClick={onGenerateAllImages} className="text-[10px] h-6 px-2 py-0 bg-brand-green text-black border-none hover:bg-white w-full">
                          Tạo Tất Cả
                      </Button>
                  </div>
              </th>

              {/* 6. Voice/Audio */}
              <th className="px-4 py-3 w-32 text-center border-r border-zinc-800">
                  <div className="flex flex-col items-center gap-1">
                      <span>Thoại / Voice</span>
                      <Button variant="primary" onClick={onGenerateAllAudio} className="text-[10px] h-6 px-2 py-0 bg-zinc-100 text-black border-none hover:bg-brand-green w-full">
                          Tạo Tất Cả
                      </Button>
                  </div>
              </th>

              {/* 7. Prompt Video (New Column) */}
              <th className="px-4 py-3 min-w-[300px] text-center border-r border-zinc-800">
                  <div className="flex flex-col items-center gap-1">
                      <span>Prompt Video</span>
                      <Button variant="primary" onClick={onGenerateAllVideoPrompts} className="text-[10px] h-6 px-2 py-0 bg-purple-600 text-white border-none hover:bg-purple-500 w-full shadow-[0_0_10px_rgba(147,51,234,0.3)]">
                          Tạo Tất Cả (Veo)
                      </Button>
                  </div>
              </th>
              
              <th className="px-2 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {scenes.map((scene, idx) => (
              <tr key={scene.id} className="hover:bg-zinc-800/20 transition-colors group h-48">
                
                {/* 1. Scene ID */}
                <td className="px-2 py-4 text-center font-mono text-zinc-300 font-bold border-r border-zinc-800/50 align-top pt-8">
                  <input 
                    value={scene.sceneId} 
                    onChange={(e) => updateScene(idx, 'sceneId', e.target.value)}
                    className="bg-transparent w-full text-center focus:outline-none focus:text-brand-green"
                  />
                </td>

                {/* 2. Script */}
                <td className="px-2 py-4 border-r border-zinc-800/50 align-top">
                  <textarea 
                    value={scene.vietnamese} 
                    onChange={(e) => updateScene(idx, 'vietnamese', e.target.value)} 
                    className="w-full bg-transparent resize-none focus:outline-none focus:text-white h-full min-h-[140px] text-xs custom-scrollbar leading-relaxed p-2 rounded hover:bg-zinc-900/50 transition-colors"
                    placeholder="Nội dung kịch bản..."
                  />
                </td>
                
                {/* 3. Prompt/Description */}
                <td className="px-2 py-4 border-r border-zinc-800/50 align-top">
                  <textarea 
                    value={scene.contextPrompt} 
                    onChange={(e) => updateScene(idx, 'contextPrompt', e.target.value)} 
                    className="w-full bg-transparent resize-none focus:outline-none focus:text-white h-full min-h-[140px] text-xs custom-scrollbar leading-relaxed p-2 rounded hover:bg-zinc-900/50 transition-colors"
                    placeholder="Mô tả hình ảnh..."
                  />
                </td>

                {/* 4. Character Selection */}
                <td className="px-2 py-4 border-r border-zinc-800/50 align-top text-center relative pt-8">
                   <div className="relative inline-block w-full">
                       <button 
                         onClick={() => setOpenCharDropdown(openCharDropdown === scene.id ? null : scene.id)}
                         className="w-full bg-transparent border border-zinc-700 rounded px-3 py-2 text-xs text-left flex justify-between items-center hover:border-brand-green transition-colors min-h-[36px] bg-zinc-900/30"
                       >
                           <span className="truncate text-zinc-300">
                               {scene.selectedCharacterIds && scene.selectedCharacterIds.length > 0 
                                 ? characters.filter(c => scene.selectedCharacterIds.includes(c.id)).map(c => c.name).join(', ')
                                 : "Chọn nhân vật..."}
                           </span>
                           <ChevronDown size={12} />
                       </button>

                       {/* Dropdown Menu */}
                       {openCharDropdown === scene.id && (
                           <div className="absolute top-full left-0 w-full z-50 bg-zinc-900 border border-zinc-700 rounded shadow-xl mt-1 p-1 max-h-48 overflow-y-auto custom-scrollbar backdrop-blur-md">
                               {characters.length > 0 ? characters.map(char => (
                                   <div 
                                     key={char.id} 
                                     onClick={() => toggleCharacterSelection(idx, char.id)}
                                     className="flex items-center gap-2 px-2 py-2 hover:bg-zinc-800 cursor-pointer rounded text-xs"
                                   >
                                       <div className={`w-3 h-3 rounded-sm border flex items-center justify-center ${scene.selectedCharacterIds?.includes(char.id) ? 'bg-brand-green border-brand-green' : 'border-zinc-600'}`}>
                                            {scene.selectedCharacterIds?.includes(char.id) && <div className="w-1.5 h-1.5 bg-black rounded-sm" />}
                                       </div>
                                       <span className="text-zinc-300 truncate">{char.name}</span>
                                   </div>
                               )) : (
                                   <div className="p-2 text-zinc-500 text-xs text-center">Chưa có nhân vật</div>
                               )}
                               <div className="border-t border-zinc-800 mt-1 pt-1">
                                    <button 
                                        onClick={() => setOpenCharDropdown(null)}
                                        className="w-full text-center text-[10px] text-zinc-500 hover:text-white py-1"
                                    >
                                        Đóng
                                    </button>
                               </div>
                           </div>
                       )}
                   </div>
                </td>

                {/* 5. Image & Generate */}
                <td className="px-2 py-4 text-center align-top border-r border-zinc-800/50 pt-8">
                  <div className="flex flex-col items-center justify-center gap-2">
                    {scene.imageData ? (
                      <div className="relative group/img w-24 h-24 bg-black rounded-lg border border-zinc-700 overflow-hidden cursor-pointer shadow-lg hover:shadow-brand-green/20 transition-all" onClick={() => onViewImage(idx)}>
                        <img src={scene.imageData} alt={`Scene ${scene.sceneId}`} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 flex flex-col items-center justify-center transition-opacity gap-2">
                            <Eye size={20} className="text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-24 h-24 border border-dashed border-zinc-800 rounded-lg flex items-center justify-center bg-zinc-950/30">
                          <ImageIcon size={20} className="text-zinc-700" />
                      </div>
                    )}
                    
                    <div className="flex gap-2 w-full justify-center">
                         <Button 
                            variant={scene.imageData ? "secondary" : "primary"}
                            onClick={() => onGenerateImage(idx)} 
                            disabled={isGenerating(idx)} 
                            className={`text-[10px] px-2 py-1 h-7 w-24`}
                         >
                            {isGenerating(idx) ? <Loader2 size={12} className="animate-spin" /> : (scene.imageData ? "Tạo Lại" : "Tạo Ảnh")}
                        </Button>
                    </div>
                  </div>
                </td>

                {/* 6. Voice / Audio */}
                <td className="px-2 py-4 text-center align-top border-r border-zinc-800/50 pt-8">
                    <div className="flex flex-col items-center justify-center gap-2 h-full">
                        {scene.audioData ? (
                            <div className="flex flex-col gap-2 w-full items-center">
                                <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-700">
                                    <button 
                                        onClick={() => handlePlayAudio(scene.id, scene.audioData!)}
                                        className={`p-2 rounded transition-colors ${playingAudioId === scene.id ? 'bg-brand-green text-black' : 'bg-zinc-800 text-white hover:bg-zinc-700'}`}
                                        title={playingAudioId === scene.id ? "Pause" : "Play"}
                                    >
                                        {playingAudioId === scene.id ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
                                    </button>
                                    <button 
                                        onClick={() => handleDownloadAudio(scene)}
                                        className="p-2 bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 rounded transition-colors"
                                        title="Download Audio"
                                    >
                                        <Download size={14} />
                                    </button>
                                </div>
                                
                                <button 
                                    onClick={() => onGenerateAudio(idx)}
                                    disabled={scene.isGeneratingAudio}
                                    className="text-[10px] flex items-center gap-1 text-zinc-500 hover:text-white transition-colors"
                                >
                                    <RefreshCw size={10} className={scene.isGeneratingAudio ? "animate-spin" : ""} /> Tạo lại
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 h-24 w-24 border border-dashed border-zinc-800 rounded-lg bg-zinc-950/30">
                                <Mic size={20} className="text-zinc-700" />
                                <Button 
                                    variant="secondary"
                                    onClick={() => onGenerateAudio(idx)}
                                    disabled={scene.isGeneratingAudio}
                                    className="text-[10px] h-6 px-2"
                                >
                                    {scene.isGeneratingAudio ? <Loader2 size={12} className="animate-spin" /> : "Tạo Voice"}
                                </Button>
                            </div>
                        )}
                    </div>
                </td>
                
                {/* 7. Prompt Video (New Column) */}
                <td className="px-2 py-4 border-r border-zinc-800/50 align-top">
                    <div className="flex flex-col h-full gap-2">
                        <textarea
                            value={scene.videoPrompt || ""}
                            onChange={(e) => updateScene(idx, 'videoPrompt', e.target.value)}
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded p-2 text-xs text-zinc-300 focus:outline-none focus:border-purple-500/50 h-full min-h-[100px] resize-none custom-scrollbar font-mono"
                            placeholder="Prompt Veo sẽ hiện ở đây..."
                        />
                        <Button 
                            variant="secondary" 
                            onClick={() => onGenerateVideoPrompt(idx)}
                            disabled={scene.isGeneratingVideoPrompt}
                            className={`text-[10px] h-7 w-full ${scene.videoPrompt ? 'text-zinc-400' : 'text-purple-400 hover:text-white'}`}
                        >
                            {scene.isGeneratingVideoPrompt ? (
                                <><Loader2 size={12} className="animate-spin mr-1" /> Generating...</>
                            ) : (
                                <><Video size={12} className="mr-1" /> {scene.videoPrompt ? "Tạo Lại Prompt" : "Tạo Prompt"}</>
                            )}
                        </Button>
                    </div>
                </td>

                {/* Delete Row */}
                <td className="px-2 py-4 text-center align-middle">
                  <button onClick={() => removeRow(idx)} className="text-zinc-700 hover:text-red-500 transition-colors opacity-20 group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Footer: Add Row */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/20">
            <button onClick={addRow} className="w-full py-3 flex items-center justify-center gap-2 text-brand-green hover:text-white hover:bg-brand-green/20 rounded-lg transition-all border border-dashed border-brand-green/30 hover:border-brand-green/60 font-medium text-sm">
                <Plus size={18} /> Thêm Phân Đoạn Mới
            </button>
        </div>
      </div>

      {/* Overlay to close dropdown if clicking outside */}
      {openCharDropdown && (
          <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setOpenCharDropdown(null)}></div>
      )}
    </div>
  );
};