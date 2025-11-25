

export interface Scene {
  id: string; // Unique ID for React keys
  
  // Column 1: Scene ID / STT
  sceneId: string; 
  
  // Column 2: Script (Kịch bản)
  vietnamese: string; // Used as the main Script column

  // Column 3: Context Description (Mô tả phân cảnh)
  contextPrompt: string;
  
  // Column 4: Selected Character IDs
  selectedCharacterIds: string[]; 

  // Column 5: Image Data
  imageData?: string; 
  imageHistory?: string[];
  isGenerating?: boolean;

  // Column 6: Audio Data
  audioData?: string; // Base64 WAV data
  isGeneratingAudio?: boolean;

  // Column 7: Video Prompt
  videoPrompt?: string;
  isGeneratingVideoPrompt?: boolean;

  // Legacy/Hidden fields kept for compatibility
  lang1?: string;
  promptName?: string;

  // Motion Prompt Data
  motionPrompt?: string; 
  motionPromptName?: string; 
  isGeneratingMotion?: boolean;
}

export interface Character {
  id: string;
  name: string;
  description: string; // Physical traits/costume description
  imageReferences: string[]; // Up to 5 images (Base64)
  isDefault: boolean; // Is this the default character?
}

export interface UsageStats {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
}

export interface ScriptData {
  stylePrompt: string;
  selectedVoice: string; // Name of the selected voice
  videoPromptNote?: string; // Global note for video prompts
  scenes: Scene[];
  characters: Character[];
}

export interface ProjectData {
  name: string;
  lastModified: number;
  content: ScriptData;
  usageStats: UsageStats;
}

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export type ActionType = 'UNDO' | 'REDO' | 'SET' | 'RESET';

export interface ModalState {
  isOpen: boolean;
  type: 'API_KEY' | 'QR_CODE' | 'LIGHTBOX' | 'MOTION_EDIT' | 'SCRIPT_CHAT' | 'COST_ESTIMATE' | null;
  data?: any;
}