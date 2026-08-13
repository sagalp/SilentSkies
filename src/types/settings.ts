export interface AppSettings {
  // Globe & Visuals
  autoRotateSpeed: number; // 0.3, 1, 2.5, 5
  showAtmosphere: boolean;
  showStarfield: boolean;
  pointLimit: number; // 100, 250, 400
  showRoutes: boolean;
  
  // AI Engine
  aiModel: string; // 'openai/gpt-oss-120b' | 'meta/llama-3.1-70b-instruct' | 'nvidia/neva-22b'
  showReasoningStream: boolean;
  temperature: number; // 0.2 to 0.9
  customApiKey: string;
  
  // Audio & Soundscape
  ambientAudio: boolean;
  ambientVolume: number; // 0 to 1
  uiSounds: boolean;
  uiVolume: number; // 0 to 1
  
  // Display & Units
  coordinateFormat: 'decimal' | 'dms';
  hudStyle: 'full' | 'compact';
  accentTheme: 'emerald' | 'amber' | 'cyan' | 'coral';
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoRotateSpeed: 1,
  showAtmosphere: true,
  showStarfield: true,
  pointLimit: 400,
  showRoutes: true,
  
  aiModel: 'openai/gpt-oss-120b',
  showReasoningStream: true,
  temperature: 0.6,
  customApiKey: '',
  
  ambientAudio: false,
  ambientVolume: 0.35,
  uiSounds: true,
  uiVolume: 0.35,
  
  coordinateFormat: 'decimal',
  hudStyle: 'full',
  accentTheme: 'emerald',
};
