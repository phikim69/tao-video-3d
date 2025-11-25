

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useHistory } from './hooks/useHistory';
import { slugify, saveProjectToFile } from './utils/helpers';
import { ProjectData, ModalState, Scene, Character, UsageStats } from './types';
import { Header } from './components/Header';
import { CoffeeBubble, QRModal } from './components/Bubble';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ScriptTable } from './components/ScriptTable';
import { CharacterManager } from './components/CharacterManager'; 
import { ImageLightbox } from './components/ImageLightbox';
import { generateSceneImage, editSceneImage, generateMotionPrompt, CharacterData, generateSpeech, GenResponse, generateVideoPrompt } from './utils/gemini';
import { Download } from 'lucide-react';
import { Button } from './components/Button';
import JSZip from 'jszip';
import { StylePromptSection } from './components/StylePromptSection';
import { MotionPromptModal } from './components/MotionPromptModal';
import { ScriptChatModal } from './components/ScriptChatModal';
import { CostEstimationModal, CostResultToast } from './components/CostNotification';
import { estimateTokens, calculateCost, CostEstimate, ActualUsage } from './utils/cost';

// Initial empty project state
const initialProject: ProjectData = {
  name: '',
  lastModified: Date.now(),
  content: {
    stylePrompt: '',
    selectedVoice: 'Sadachbia', // Default Voice
    videoPromptNote: '',
    scenes: [
      { id: '1', sceneId: '1', lang1: '', vietnamese: '', promptName: '', contextPrompt: '', selectedCharacterIds: [], imageHistory: [] },
      { id: '2', sceneId: '2', lang1: '', vietnamese: '', promptName: '', contextPrompt: '', selectedCharacterIds: [], imageHistory: [] },
      { id: '3', sceneId: '3', lang1: '', vietnamese: '', promptName: '', contextPrompt: '', selectedCharacterIds: [], imageHistory: [] }
    ],
    characters: []
  },
  usageStats: {
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCost: 0
  }
};

const App: React.FC = () => {
  // State Management
  const { state: project, set: setProject, undo, redo, canUndo, canRedo } = useHistory<ProjectData>(initialProject);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [modal, setModal] = useState<ModalState>({ isOpen: false, type: null });
  const [apiKey, setApiKey] = useState<string>('');
  const [loadingScenes, setLoadingScenes] = useState<Record<string, boolean>>({});
  
  // Cost Tracking State
  const [pendingCostAction, setPendingCostAction] = useState<{
      actionName: string;
      modelName: string;
      estimate: CostEstimate;
      onConfirm: () => void;
  } | null>(null);
  
  const [costToast, setCostToast] = useState<{
      visible: boolean;
      actual: ActualUsage;
      estimatedCost: number;
  } | null>(null);

  // Refs for handling external events
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  // --- Helper Methods ---

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setProject({ ...project, name: newName, lastModified: Date.now() });
  };
  
  const handleStylePromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProject({
        ...project,
        content: { ...project.content, stylePrompt: e.target.value }
    });
  };
  
  const handleVoiceChange = (voice: string) => {
      setProject({
          ...project,
          content: { ...project.content, selectedVoice: voice }
      });
  };

  const handleVideoPromptNoteChange = (note: string) => {
      setProject({
          ...project,
          content: { ...project.content, videoPromptNote: note }
      });
  };

  const handleScenesChange = (newScenes: Scene[]) => {
    setProject({
      ...project,
      content: { ...project.content, scenes: newScenes }
    });
  };

  const handleCharactersChange = (newCharacters: Character[]) => {
    setProject({
      ...project,
      content: { ...project.content, characters: newCharacters }
    });
  };

  const updateUsageStats = (input: number, output: number) => {
      const cost = calculateCost(input, output);
      const newStats = {
          totalInputTokens: (project.usageStats?.totalInputTokens || 0) + input,
          totalOutputTokens: (project.usageStats?.totalOutputTokens || 0) + output,
          totalCost: (project.usageStats?.totalCost || 0) + cost
      };
      
      // Don't trigger full project history for this update to avoid undo spam for cost updates? 
      // Actually, cost is part of state, so it should be in history.
      setProject({ ...project, usageStats: newStats });
      return newStats;
  };

  const handleSave = () => {
    const filename = slugify(project.name || 'untitled-project');
    saveProjectToFile(project, filename);
  };

  const handleOpenClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        
        // --- Migration Logic ---
        if (!data.content.scenes) data.content.scenes = [];
        
        data.content.scenes = data.content.scenes.map((s: any) => ({
             ...s,
             selectedCharacterIds: s.selectedCharacterIds || (s.selectedCharacterId && s.selectedCharacterId !== 'none' ? [s.selectedCharacterId] : []),
             imageHistory: s.imageHistory || (s.imageData ? [s.imageData] : []),
             audioData: s.audioData || undefined,
             isGeneratingAudio: false,
             videoPrompt: s.videoPrompt || "",
             isGeneratingVideoPrompt: false
        }));

        if (!data.content.characters) data.content.characters = [];
        data.content.characters = data.content.characters.map((c: any) => ({
             ...c,
             imageReferences: c.imageReferences || (c.imageReference ? [c.imageReference] : [])
        }));
        
        if (!data.content.selectedVoice) data.content.selectedVoice = 'Sadachbia';
        if (!data.content.videoPromptNote) data.content.videoPromptNote = '';
        
        if (!data.usageStats) {
            data.usageStats = { totalInputTokens: 0, totalOutputTokens: 0, totalCost: 0 };
        }

        setProject(data);
      } catch (err) {
        alert('Failed to parse project file');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // --- Cost Tracking Wrapper ---
  const runWithCostTracking = async (
      actionName: string, 
      modelName: string, 
      inputText: string, 
      estimatedOutputTokens: number,
      apiCall: () => Promise<{ promptTokens: number, candidatesTokens: number }>
  ) => {
      if (!apiKey) {
         setModal({ isOpen: true, type: 'API_KEY' });
         return;
      }

      const inputTokens = estimateTokens(inputText);
      const estimatedCost = calculateCost(inputTokens, estimatedOutputTokens);

      const confirmAction = async () => {
          setPendingCostAction(null); // Close modal
          setModal({ isOpen: false, type: null }); // Close any other modal if needed? No, keep lightbox open.

          try {
              const usage = await apiCall();
              
              const actualCost = calculateCost(usage.promptTokens, usage.candidatesTokens);
              updateUsageStats(usage.promptTokens, usage.candidatesTokens);
              
              setCostToast({
                  visible: true,
                  actual: {
                      inputTokens: usage.promptTokens,
                      outputTokens: usage.candidatesTokens,
                      totalCost: actualCost
                  },
                  estimatedCost: estimatedCost
              });
              
              setTimeout(() => setCostToast(null), 5000);

          } catch (error) {
              console.error("Execution Error:", error);
              alert("Action failed: " + (error as any).message);
          }
      };

      setPendingCostAction({
          actionName,
          modelName,
          estimate: { inputTokens, outputTokens: estimatedOutputTokens, totalCost: estimatedCost },
          onConfirm: confirmAction
      });
  };

  // --- Image Logic ---

  const handleGenerateImage = async (index: number, promptOverride?: string, useCurrentAsBase = false) => {
    const scene = project.content.scenes[index];
    if (!scene) return;
    
    const style = project.content.stylePrompt;
    const contextPrompt = promptOverride || scene.contextPrompt;
    const scriptContent = scene.vietnamese;
    
    // Estimate input roughly
    const inputText = `${style} ${contextPrompt} ${scriptContent} ${JSON.stringify(project.content.characters)}`;
    
    // Use wrapper
    runWithCostTracking(
        useCurrentAsBase ? "Edit Image" : "Generate Image",
        "gemini-2.5-flash-image",
        inputText,
        258, // Estimate output tokens for image (often fixed/standard per image generation)
        async () => {
            setLoadingScenes(prev => ({ ...prev, [scene.id]: true }));
            try {
                let result: GenResponse<string>;
                const keyToUse = apiKey;

                if (useCurrentAsBase && scene.imageData && promptOverride) {
                    result = await editSceneImage(keyToUse, scene.imageData, promptOverride);
                } else {
                    if (!contextPrompt && !style && !scriptContent) {
                        throw new Error("Vui lòng nhập mô tả phân cảnh hoặc style/kịch bản.");
                    }

                    const selectedChars = project.content.characters.filter(c => scene.selectedCharacterIds?.includes(c.id));
                    const charData: CharacterData[] = selectedChars.map(c => ({
                        name: c.name,
                        description: c.description,
                        imageReferences: c.imageReferences
                    }));

                    const prevScenes = [];
                    if (index > 0) prevScenes.push(project.content.scenes[index - 1]);
                    if (index > 1) prevScenes.push(project.content.scenes[index - 2]);
                    const prevContextData = prevScenes.reverse().map(s => ({
                        script: s.vietnamese || "",
                        prompt: s.contextPrompt || ""
                    }));
                    
                    result = await generateSceneImage(keyToUse, style, contextPrompt, scriptContent, charData, prevContextData);
                }

                // Update scene
                const newScenes = [...project.content.scenes];
                const currentHistory = newScenes[index].imageHistory ? [...newScenes[index].imageHistory!] : [];
                
                if (newScenes[index].imageData && !currentHistory.includes(newScenes[index].imageData)) {
                    currentHistory.push(newScenes[index].imageData);
                }
                currentHistory.push(result.data);

                newScenes[index] = { 
                    ...newScenes[index], 
                    imageData: result.data,
                    imageHistory: currentHistory
                };
                handleScenesChange(newScenes);
                
                return result.usage;
            } finally {
                setLoadingScenes(prev => ({ ...prev, [scene.id]: false }));
            }
        }
    );
  };

  const handleGenerateAllImages = async () => {
      if (!apiKey) {
          setModal({ isOpen: true, type: 'API_KEY' });
          return;
      }
      if(!confirm("Bắt đầu tạo hàng loạt ảnh? App sẽ yêu cầu xác nhận chi phí cho TỪNG ảnh.")) return;
      alert("Bulk generation with Cost Control is experimental. Please generate one by one for accurate cost tracking.");
  };

  const handleSetSceneImageVersion = (index: number, imageVersion: string) => {
      const newScenes = [...project.content.scenes];
      newScenes[index] = {
          ...newScenes[index],
          imageData: imageVersion
      };
      handleScenesChange(newScenes);
  };

  const downloadImage = (scene: Scene) => {
      if (!scene.imageData) return;
      const link = document.createElement('a');
      link.href = scene.imageData;
      link.download = `${scene.sceneId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const downloadAllImages = async () => {
    const zip = new JSZip();
    let count = 0;
    project.content.scenes.forEach(scene => {
        if (scene.imageData) {
            const data = scene.imageData.split(',')[1];
            zip.file(`${scene.sceneId}.png`, data, { base64: true });
            count++;
        }
    });
    if (count === 0) { alert("Chưa có ảnh nào."); return; }
    const content = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${slugify(project.name)}-images.zip`;
    document.body.appendChild(link);
    link.click();
  };

  // --- Audio/Voice Logic ---

  const handleGenerateAudio = async (index: number) => {
      const scene = project.content.scenes[index];
      if (!scene.vietnamese) {
          alert("Chưa có nội dung kịch bản.");
          return;
      }

      runWithCostTracking(
          "Generate TTS Audio",
          "gemini-2.5-pro-preview-tts",
          scene.vietnamese,
          100, // Estimate output tokens (metadata for audio output tokens is sometimes vague, but usage metadata returns it)
          async () => {
              const newScenes = [...project.content.scenes];
              newScenes[index] = { ...newScenes[index], isGeneratingAudio: true };
              handleScenesChange(newScenes);

              try {
                  const result = await generateSpeech(apiKey, scene.vietnamese, project.content.selectedVoice);
                  
                  const updatedScenes = [...project.content.scenes];
                  updatedScenes[index] = { 
                      ...updatedScenes[index], 
                      audioData: result.data,
                      isGeneratingAudio: false 
                  };
                  handleScenesChange(updatedScenes);
                  return result.usage;
              } catch (error: any) {
                  const errorScenes = [...project.content.scenes];
                  errorScenes[index] = { ...errorScenes[index], isGeneratingAudio: false };
                  handleScenesChange(errorScenes);
                  throw error;
              }
          }
      );
  };

  const handleGenerateAllAudio = async () => {
     alert("Bulk generation with Cost Control is experimental. Please generate one by one.");
  };

  const downloadAllAudio = async () => {
      const zip = new JSZip();
      let count = 0;
      project.content.scenes.forEach(scene => {
          if (scene.audioData) {
              const data = scene.audioData.split(',')[1];
              zip.file(`${scene.sceneId}.wav`, data, { base64: true });
              count++;
          }
      });
      if (count === 0) { alert("Chưa có file âm thanh."); return; }
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slugify(project.name)}-voice.zip`;
      document.body.appendChild(link);
      link.click();
  };
  
  const handleExportJSON = () => {
     handleSave(); // Reuse save function
  };

  // --- Motion Prompt Logic ---

  const handleGenerateMotion = async (index: number) => {
    // Existing logic...
    alert("Motion prompt feature is currently being refactored. Please use 'Prompt Video' column for better results.");
  };

  const handleGenerateAllMotion = async () => {
     alert("Bulk generation not supported with Cost Confirmation enabled.");
  };

  const handleSaveMotionPrompt = (name: string, prompt: string) => {
      if (modal.type === 'MOTION_EDIT' && modal.data && typeof modal.data.index === 'number') {
          const index = modal.data.index;
          const newScenes = [...project.content.scenes];
          newScenes[index] = { ...newScenes[index], motionPrompt: prompt, motionPromptName: name };
          handleScenesChange(newScenes);
      }
  };

  // --- Video Prompt Logic ---

  const handleGenerateVideoPrompt = async (index: number) => {
      const scenes = project.content.scenes;
      const scene = scenes[index];
      
      if (!scene.vietnamese || !scene.imageData) {
          alert("Cần có Kịch Bản và Hình Ảnh để tạo Video Prompt.");
          return;
      }

      // Collect context
      const prevScene = index > 0 ? scenes[index - 1] : null;
      const nextScene = index < scenes.length - 1 ? scenes[index + 1] : null;

      const inputData = {
          currentScript: scene.vietnamese,
          currentImageBase64: scene.imageData,
          currentContext: scene.contextPrompt,
          prevScript: prevScene?.vietnamese || "",
          prevContext: prevScene?.contextPrompt || "",
          nextScript: nextScene?.vietnamese || "",
          nextContext: nextScene?.contextPrompt || "",
          globalNote: project.content.videoPromptNote || ""
      };

      // Estimate tokens: 
      // Image (~258) + Scripts (~200 chars) + Note (~100 chars) + Template (~500 chars)
      const inputStringForEst = JSON.stringify(inputData);
      
      runWithCostTracking(
          "Generate Video Prompt",
          "gemini-2.5-flash",
          inputStringForEst,
          500, // Estimate 300-500 words
          async () => {
              const newScenes = [...scenes];
              newScenes[index] = { ...newScenes[index], isGeneratingVideoPrompt: true };
              handleScenesChange(newScenes);

              try {
                  const result = await generateVideoPrompt(apiKey, inputData);
                  
                  const updatedScenes = [...scenes];
                  updatedScenes[index] = { 
                      ...updatedScenes[index], 
                      videoPrompt: result.data,
                      isGeneratingVideoPrompt: false 
                  };
                  handleScenesChange(updatedScenes);
                  return result.usage;
              } catch (error: any) {
                  const errorScenes = [...scenes];
                  errorScenes[index] = { ...errorScenes[index], isGeneratingVideoPrompt: false };
                  handleScenesChange(errorScenes);
                  throw error;
              }
          }
      );
  };

  const handleGenerateAllVideoPrompts = async () => {
      alert("Bulk generation is experimental with Cost Control. Please use single generation for now.");
  };

  // --- Script Application Logic (From Chat) ---
  const handleApplyScriptFromChat = (lines: string[], targetColumn: 'vietnamese' | 'contextPrompt') => {
      const currentScenes = [...project.content.scenes];
      const defaultChar = project.content.characters.find(c => c.isDefault);
      const neededRows = lines.length;
      const currentRows = currentScenes.length;
      if (neededRows > currentRows) {
          for (let i = currentRows; i < neededRows; i++) {
              currentScenes.push({
                  id: crypto.randomUUID(),
                  sceneId: `${i + 1}`,
                  vietnamese: '',
                  contextPrompt: '',
                  selectedCharacterIds: defaultChar ? [defaultChar.id] : [],
                  imageHistory: []
              });
          }
      }
      lines.forEach((line, index) => {
          if (currentScenes[index]) {
              currentScenes[index] = { ...currentScenes[index], [targetColumn]: line };
          }
      });
      handleScenesChange(currentScenes);
      alert("Đã cập nhật kịch bản thành công!");
  };

  // --- Zoom Logic ---
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      setZoomLevel(prev => {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        return parseFloat(Math.min(Math.max(prev + delta, 0.5), 3).toFixed(2));
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const resetZoom = () => setZoomLevel(1);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') { e.preventDefault(); handleOpenClick(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); if (canUndo) undo(); }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') { e.preventDefault(); if (canRedo) redo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project, canUndo, canRedo, undo, redo]);

  return (
    <>
      <input type="file" ref={fileInputRef} onChange={handleFileLoad} accept=".json" className="hidden" />

      <div 
        ref={mainContainerRef}
        style={{ 
          transform: `scale(${zoomLevel})`, 
          transformOrigin: 'top center',
          width: '100%',
          minHeight: '100vh'
        }}
        className="relative bg-black text-white flex flex-col transition-transform duration-100 ease-out"
      >
        <Header 
          appName="Tao Video 3D"
          onSave={handleSave}
          onOpen={handleOpenClick}
          onUndo={undo}
          onRedo={redo}
          onApiKey={() => setModal({ isOpen: true, type: 'API_KEY' })}
          canUndo={canUndo}
          canRedo={canRedo}
          usageStats={project.usageStats}
        />

        <main className="flex-grow pt-24 px-4 sm:px-6 lg:px-8 max-w-[98%] mx-auto w-full flex flex-col">
          
          <div className="mb-8 text-center">
            <div className="relative inline-block max-w-4xl w-full">
              <input
                type="text"
                value={project.name}
                onChange={handleNameChange}
                placeholder="NHẬP TÊN DỰ ÁN"
                className={`w-full bg-transparent text-center text-4xl md:text-5xl font-black tracking-tighter uppercase outline-none border-b-2 border-transparent focus:border-brand-green/50 transition-all pb-2 placeholder:text-zinc-800 ${project.name ? 'text-gradient-brand' : 'text-white'}`}
              />
            </div>
          </div>
          
          <StylePromptSection 
             stylePrompt={project.content.stylePrompt}
             onStylePromptChange={handleStylePromptChange}
             onDownloadAll={downloadAllImages}
             onExportJSON={handleExportJSON}
             selectedVoice={project.content.selectedVoice || 'Sadachbia'}
             onVoiceChange={handleVoiceChange}
             apiKey={apiKey}
             onReqApiKey={() => setModal({ isOpen: true, type: 'API_KEY' })}
             onDownloadAllAudio={downloadAllAudio}
          />

          <CharacterManager 
            characters={project.content.characters}
            onCharactersChange={handleCharactersChange}
            videoPromptNote={project.content.videoPromptNote}
            onVideoPromptNoteChange={handleVideoPromptNoteChange}
          />

          <ScriptTable 
             scenes={project.content.scenes}
             characters={project.content.characters}
             onScenesChange={handleScenesChange}
             onGenerateImage={(idx) => handleGenerateImage(idx)}
             onViewImage={(idx) => setModal({ isOpen: true, type: 'LIGHTBOX', data: { index: idx } })}
             isGenerating={(idx) => !!loadingScenes[project.content.scenes[idx].id]}
             apiKey={apiKey}
             onGenerateMotion={(idx) => handleGenerateMotion(idx)}
             onViewMotion={(idx) => setModal({ isOpen: true, type: 'MOTION_EDIT', data: { index: idx } })}
             onGenerateAllMotion={handleGenerateAllMotion}
             onGenerateAllImages={handleGenerateAllImages}
             onOpenScriptChat={() => setModal({ isOpen: true, type: 'SCRIPT_CHAT' })}
             onGenerateAudio={handleGenerateAudio}
             onGenerateAllAudio={handleGenerateAllAudio}
             onGenerateVideoPrompt={handleGenerateVideoPrompt}
             onGenerateAllVideoPrompts={handleGenerateAllVideoPrompts}
          />

          <div className="h-24"></div>
        </main>

        <footer className="py-8 text-center border-t border-zinc-900 mt-auto">
          <p className="text-zinc-500 text-sm">
            Prompting by <span className="text-white font-medium">PhiKim</span> • 
            <a href="https://phongthuy69.com" className="ml-1 text-brand-green hover:text-brand-lightGreen transition-colors">
              PhongThuy69.com
            </a>
          </p>
        </footer>
      </div>

      {zoomLevel !== 1 && (
        <div className="fixed top-24 right-8 z-50 animate-in fade-in slide-in-from-right duration-300">
          <button 
            onClick={resetZoom}
            className="flex items-center gap-2 bg-zinc-900/90 backdrop-blur border border-brand-green text-brand-lightGreen px-4 py-2 rounded-full shadow-lg hover:bg-zinc-800 transition-all"
          >
            <span className="text-sm font-mono font-bold">{Math.round(zoomLevel * 100)}%</span>
            <span className="w-px h-4 bg-zinc-700 mx-1"></span>
            <span className="text-xs uppercase tracking-wide">Reset</span>
          </button>
        </div>
      )}

      <CoffeeBubble onClick={() => setModal({ isOpen: true, type: 'QR_CODE' })} />

      <ApiKeyModal 
        isOpen={modal.isOpen && modal.type === 'API_KEY'} 
        onClose={() => setModal({ ...modal, isOpen: false })}
        currentKey={apiKey}
        onSaveKey={setApiKey}
      />
      
      <QRModal 
        isOpen={modal.isOpen && modal.type === 'QR_CODE'} 
        onClose={() => setModal({ ...modal, isOpen: false })}
      />
      
      <ImageLightbox 
         isOpen={modal.isOpen && modal.type === 'LIGHTBOX'}
         onClose={() => setModal({ ...modal, isOpen: false })}
         initialIndex={modal.data?.index || 0}
         scenes={project.content.scenes}
         stylePrompt={project.content.stylePrompt}
         characters={project.content.characters}
         onRegenerate={handleGenerateImage}
         onSetVersion={handleSetSceneImageVersion}
         onDownload={downloadImage}
         onOpenMotionModal={(idx) => setModal({ isOpen: true, type: 'MOTION_EDIT', data: { index: idx } })}
         onGenerateMotion={(idx) => handleGenerateMotion(idx)}
      />

      <MotionPromptModal 
        isOpen={modal.isOpen && modal.type === 'MOTION_EDIT'}
        onClose={() => setModal({ ...modal, isOpen: false })}
        initialPrompt={modal.data?.index !== undefined ? project.content.scenes[modal.data.index].motionPrompt || '' : ''}
        initialName={modal.data?.index !== undefined ? project.content.scenes[modal.data.index].motionPromptName || '' : ''}
        isRegenerating={modal.data?.index !== undefined ? !!project.content.scenes[modal.data.index].isGeneratingMotion : false}
        onSave={handleSaveMotionPrompt}
        onRegenerate={() => {
            if (modal.data?.index !== undefined) handleGenerateMotion(modal.data.index);
        }}
      />
      
      <ScriptChatModal 
        isOpen={modal.isOpen && modal.type === 'SCRIPT_CHAT'}
        onClose={() => setModal({ ...modal, isOpen: false })}
        apiKey={apiKey}
        onApplyScript={handleApplyScriptFromChat}
        onRequestApiKey={() => setModal({ isOpen: true, type: 'API_KEY' })}
        onUsageUpdate={updateUsageStats}
      />

      {pendingCostAction && (
          <CostEstimationModal
              isOpen={!!pendingCostAction}
              onClose={() => setPendingCostAction(null)}
              onConfirm={pendingCostAction.onConfirm}
              estimate={pendingCostAction.estimate}
              modelName={pendingCostAction.modelName}
              actionName={pendingCostAction.actionName}
          />
      )}

      {costToast && costToast.visible && (
          <CostResultToast
              actual={costToast.actual}
              estimatedCost={costToast.estimatedCost}
              onClose={() => setCostToast(null)}
          />
      )}
    </>
  );
};

export default App;