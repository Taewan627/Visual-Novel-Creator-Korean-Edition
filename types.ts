
export interface Character {
  id: string;
  name:string;
  imageUrl: string;
}

export interface Choice {
  text: string;
  nextSceneId: string;
}

export interface DialogueLine {
  characterId: string | null;
  text: string;
}

export interface Scene {
  id: string;
  name: string;
  backgroundUrl: string;
  presentCharacterIds: string[];
  dialogue: DialogueLine[];
  choices: Choice[];
  aiPrompt?: string;
}

export interface VisualNovel {
  title: string;
  characters: Character[];
  scenes: Scene[];
  startSceneId: string;
}