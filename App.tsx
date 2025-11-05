import React, { useState, useEffect, ChangeEvent } from 'react';
import GamePlayer from './components/GamePlayer';
import SceneTree from './components/SceneTree';
import { VisualNovel, Character, Scene, Choice, DialogueLine } from './types';
import { generateStory, generateSceneBackground, generateSceneDialogue } from './services/geminiService';
import { EditIcon, PlayIcon, PlusIcon, TrashIcon, SparklesIcon, SaveIcon, ResetIcon } from './components/icons';

const DEMO_VN: VisualNovel = {
  title: "어느 용의 퀘스트",
  startSceneId: "scene_1",
  characters: [
    { id: "char_hero", name: "용감한 기사", imageUrl: "https://picsum.photos/seed/vn-hero/400/600" },
    { id: "char_dragon", name: "용 스파키", imageUrl: "https://picsum.photos/seed/vn-dragon/400/600" },
  ],
  scenes: [
    {
      id: "scene_1",
      name: "동굴 입구",
      backgroundUrl: "https://picsum.photos/seed/vn-cave/1280/720",
      presentCharacterIds: [],
      dialogue: [{ characterId: null, text: "당신은 어둡고 불길한 동굴 앞에 서 있습니다. 낡은 표지판에는 '용 출몰 지역!'이라고 쓰여 있습니다. 다음 행동은?" }],
      choices: [
        { text: "용감하게 동굴로 들어간다.", nextSceneId: "scene_2" },
        { text: "이건 좋지 않은 생각이라고 판단하고 집으로 돌아간다.", nextSceneId: "scene_4" },
      ],
      aiPrompt: "영웅이 용의 동굴의 어둡고 불길한 입구 앞에 서 있다. 근처에는 낡은 경고 표지판이 붙어 있다.",
    },
    {
      id: "scene_2",
      name: "동굴 안",
      backgroundUrl: "https://picsum.photos/seed/vn-inside-cave/1280/720",
      presentCharacterIds: ["char_hero", "char_dragon"],
      dialogue: [
        { characterId: "char_dragon", text: "작고 반짝이는 용이 당신을 쳐다봅니다. '안녕! 난 스파키야! 놀러 온 거야?'라고 삑삑거립니다." },
        { characterId: "char_hero", text: "용...? 나는 용감한 기사다. 내 힘을... 시험하러 왔다!" },
        { characterId: "char_dragon", text: "오, 게임! 무슨 게임 할 건데?" },
      ],
      choices: [
        { text: "결투를 신청한다!", nextSceneId: "scene_3a" },
        { text: "보드게임이 있는지 물어본다.", nextSceneId: "scene_3b" },
      ],
      aiPrompt: "보물이 가득한 동굴 안, 용감한 기사가 작고 친근하며 반짝이는 용 스파키와 마주한다.",
    },
    {
      id: "scene_3a",
      name: "'결투'",
      backgroundUrl: "https://picsum.photos/seed/vn-inside-cave/1280/720",
      presentCharacterIds: ["char_dragon"],
      dialogue: [{ characterId: "char_dragon", text: "스파키가 킥킥거리며 당신에게 무해한 비눗방울 하나를 뿜습니다. '네가 이겼어!'라고 지저귑니다. 당신은 약간 바보가 된 기분입니다." }],
      choices: [],
      aiPrompt: "작은 용이 동굴 안에서 기사에게 장난스럽게 무해한 비눗방울 하나를 뿜는다.",
    },
    {
      id: "scene_3b",
      name: "게임의 밤",
      backgroundUrl: "https://picsum.photos/seed/vn-games/1280/720",
      presentCharacterIds: ["char_hero", "char_dragon"],
      dialogue: [
        { characterId: null, text: "당신은 스파키와 함께 '성과 투석기' 게임을 하며 오후를 보냅니다." },
        { characterId: "char_hero", text: "올해 들어 가장 재미있는 시간이었어." },
      ],
      choices: [],
       aiPrompt: "기사와 작은 용이 보물에 둘러싸여 함께 즐겁게 보드게임을 하고 있다.",
    },
     {
      id: "scene_4",
      name: "안전한 귀갓길",
      backgroundUrl: "https://picsum.photos/seed/vn-home/1280/720",
      presentCharacterIds: [],
      dialogue: [{ characterId: null, text: "당신은 무사히 집으로 돌아옵니다. 세상은 아직 모험하지 않은 채로 남아있지만, 적어도 용의 먹이는 되지 않았습니다." }],
      choices: [],
       aiPrompt: "해질녘 집으로 이어지는 아늑하고 평화로운 마을 길.",
    },
  ],
};

const LOCAL_STORAGE_KEY = 'visual-novel-creator-data';

const App: React.FC = () => {
  const [vn, setVn] = useState<VisualNovel>(DEMO_VN);
  const [mode, setMode] = useState<'edit' | 'play'>('edit');
  const [currentSceneId, setCurrentSceneId] = useState<string>(vn.startSceneId);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(vn.startSceneId);
  const [aiTheme, setAiTheme] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  const [isGeneratingDialogue, setIsGeneratingDialogue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        setVn(parsedData);
        setSelectedSceneId(parsedData.startSceneId);
      } else {
        setVn(DEMO_VN);
        setSelectedSceneId(DEMO_VN.startSceneId);
      }
    } catch (e) {
      console.error("로컬 스토리지에서 데이터를 불러오는 데 실패했습니다", e);
      setVn(DEMO_VN);
      setSelectedSceneId(DEMO_VN.startSceneId);
    }
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(vn));
      alert('프로젝트가 성공적으로 저장되었습니다!');
    } catch (e) {
      console.error("데이터 저장에 실패했습니다", e);
      alert('오류: 프로젝트를 저장할 수 없습니다.');
    }
  };

  const handleReset = () => {
    if (window.confirm('모든 데이터를 데모 버전으로 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      setVn(DEMO_VN);
      setSelectedSceneId(DEMO_VN.startSceneId);
      setMode('edit');
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const updateVn = (updater: (draft: VisualNovel) => VisualNovel) => {
    setVn(prevVn => updater(JSON.parse(JSON.stringify(prevVn))));
  };
  
  const handleGenerateStory = async () => {
    if (!aiTheme.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const newVn = await generateStory(aiTheme);
      setVn(newVn);
      setSelectedSceneId(newVn.startSceneId);
      setAiTheme('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateDemoStory = async () => {
    const demoTheme = "네온 불빛이 가득한 미래 도시에서 길을 잃은 호기심 많은 로봇과 냉소적인 길고양이 사이의 예상치 못한 우정에 대한 짧고 플레이 가능한 5분 분량의 따뜻한 이야기. 이야기는 명확한 시작, 작은 갈등(로봇이 집을 찾지 못하는 등), 그리고 고양이가 로봇을 도와주는 만족스러운 결말을 가져야 합니다. 최소 4개 이상의 서로 연결된 장면과 이야기 결과에 의미 있는 선택지를 포함해야 합니다.";
    setIsGenerating(true);
    setError(null);
    try {
      const newVn = await generateStory(demoTheme);
      setVn(newVn);
      setSelectedSceneId(newVn.startSceneId);
      setAiTheme(''); // 테마 입력도 지웁니다
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  }

  const handleAddCharacter = () => {
    const newId = `char_${Date.now()}`;
    const newCharacter: Character = { id: newId, name: '새 캐릭터', imageUrl: '' };
    updateVn(draft => ({ ...draft, characters: [...draft.characters, newCharacter] }));
  };

  const handleCharacterChange = (id: string, field: keyof Omit<Character, 'id'>, value: string) => {
    updateVn(draft => ({
      ...draft,
      characters: draft.characters.map(c => c.id === id ? { ...c, [field]: value } : c),
    }));
  };
  
  const handleCharacterImageUpload = async (e: ChangeEvent<HTMLInputElement>, id: string) => {
    if (e.target.files && e.target.files[0]) {
      const base64 = await fileToBase64(e.target.files[0]);
      handleCharacterChange(id, 'imageUrl', base64);
    }
  };

  const handleDeleteCharacter = (id: string) => {
    if (window.confirm('이 캐릭터를 정말로 삭제하시겠습니까?')) {
      updateVn(draft => {
        draft.characters = draft.characters.filter(c => c.id !== id);
        draft.scenes.forEach(s => {
          s.presentCharacterIds = s.presentCharacterIds.filter(cid => cid !== id);
          s.dialogue.forEach(d => {
            if (d.characterId === id) d.characterId = null;
          });
        });
        return draft;
      });
    }
  };

  const handleAddScene = () => {
    const newId = `scene_${Date.now()}`;
    const newScene: Scene = { id: newId, name: '새 장면', backgroundUrl: '', presentCharacterIds: [], dialogue: [{ characterId: null, text: '새 대사...' }], choices: [], aiPrompt: '' };
    updateVn(draft => ({ ...draft, scenes: [...draft.scenes, newScene] }));
    setSelectedSceneId(newId);
  };

  const handleDeleteScene = (id: string) => {
     if (id === vn.startSceneId) {
      alert("시작 장면은 삭제할 수 없습니다.");
      return;
    }
    if (window.confirm('이 장면을 정말로 삭제하시겠습니까?')) {
      updateVn(draft => {
        draft.scenes = draft.scenes.filter(s => s.id !== id);
        draft.scenes.forEach(s => {
          s.choices = s.choices.filter(c => c.nextSceneId !== id);
        });
        if (selectedSceneId === id) {
          setSelectedSceneId(draft.startSceneId);
        }
        return draft;
      });
    }
  };

  const handleSceneChange = (id: string, field: 'name' | 'backgroundUrl' | 'aiPrompt', value: string) => {
    updateVn(draft => ({
      ...draft,
      scenes: draft.scenes.map(s => s.id === id ? { ...s, [field]: value } : s),
    }));
  };
  
  const handleSceneBgUpload = async (e: ChangeEvent<HTMLInputElement>, id: string) => {
    if (e.target.files && e.target.files[0]) {
      const base64 = await fileToBase64(e.target.files[0]);
      handleSceneChange(id, 'backgroundUrl', base64);
    }
  };

  const handlePresentCharacterToggle = (sceneId: string, characterId: string, isPresent: boolean) => {
    updateVn(draft => {
        const scene = draft.scenes.find(s => s.id === sceneId);
        if (scene) {
            if (isPresent) {
                scene.presentCharacterIds.push(characterId);
            } else {
                scene.presentCharacterIds = scene.presentCharacterIds.filter(id => id !== characterId);
                // 더 이상 장면에 없는 캐릭터의 대사도 업데이트
                scene.dialogue.forEach(line => {
                    if (line.characterId === characterId) {
                        line.characterId = null; // 내레이터로 되돌리기
                    }
                });
            }
        }
        return draft;
    });
  };
  
  const handleAddDialogueLine = (sceneId: string) => {
    updateVn(draft => {
      const scene = draft.scenes.find(s => s.id === sceneId);
      if (scene) {
        scene.dialogue.push({ characterId: null, text: '' });
      }
      return draft;
    });
  };

  const handleDialogueLineChange = (sceneId: string, lineIndex: number, field: keyof DialogueLine, value: string | null) => {
    updateVn(draft => {
        const scene = draft.scenes.find(s => s.id === sceneId);
        if (scene) {
            (scene.dialogue[lineIndex] as any)[field] = value;
        }
        return draft;
    });
  };
  
  const handleDeleteDialogueLine = (sceneId: string, lineIndex: number) => {
     updateVn(draft => {
        const scene = draft.scenes.find(s => s.id === sceneId);
        if (scene) {
            if (scene.dialogue.length > 1) {
              scene.dialogue.splice(lineIndex, 1);
            } else {
              alert("장면에는 최소 한 줄의 대사가 있어야 합니다.");
            }
        }
        return draft;
    });
  };
  
  const handleAddChoice = (sceneId: string) => {
    const firstOtherScene = vn.scenes.find(s => s.id !== sceneId);
    if (!firstOtherScene) {
      alert("선택지를 연결하려면 먼저 다른 장면을 만드세요!");
      return;
    }
    const newChoice: Choice = { text: '새 선택지', nextSceneId: firstOtherScene.id };
    updateVn(draft => ({
      ...draft,
      scenes: draft.scenes.map(s => s.id === sceneId ? { ...s, choices: [...s.choices, newChoice] } : s),
    }));
  };

  const handleChoiceChange = (sceneId: string, choiceIndex: number, field: keyof Choice, value: string) => {
    updateVn(draft => ({
      ...draft,
      scenes: draft.scenes.map(s => {
        if (s.id === sceneId) {
          s.choices[choiceIndex] = { ...s.choices[choiceIndex], [field]: value };
        }
        return s;
      }),
    }));
  };

  const handleDeleteChoice = (sceneId: string, choiceIndex: number) => {
    updateVn(draft => ({
      ...draft,
      scenes: draft.scenes.map(s => {
        if (s.id === sceneId) {
          s.choices.splice(choiceIndex, 1);
        }
        return s;
      }),
    }));
  };
  
  const selectedScene = vn.scenes.find(s => s.id === selectedSceneId);
  const handlePlayerChoice = (nextSceneId: string) => setCurrentSceneId(nextSceneId);

    const handleGenerateBg = async () => {
        if (!selectedScene || !selectedScene.aiPrompt?.trim()) return;
        setIsGeneratingBg(true);
        setError(null);
        try {
            const newImageUrl = await generateSceneBackground(selectedScene.aiPrompt);
            handleSceneChange(selectedScene.id, 'backgroundUrl', newImageUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : '배경 생성에 실패했습니다.');
        } finally {
            setIsGeneratingBg(false);
        }
    };

    const handleGenerateDialogue = async () => {
        if (!selectedScene || !selectedScene.aiPrompt?.trim()) return;

        const presentCharacters = vn.characters.filter(c => selectedScene.presentCharacterIds.includes(c.id));

        setIsGeneratingDialogue(true);
        setError(null);
        try {
            const newDialogue = await generateSceneDialogue(selectedScene.name, selectedScene.aiPrompt, presentCharacters);
            updateVn(draft => {
                const scene = draft.scenes.find(s => s.id === selectedScene.id);
                if (scene) {
                    scene.dialogue = newDialogue;
                }
                return draft;
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : '대화 생성에 실패했습니다.');
        } finally {
            setIsGeneratingDialogue(false);
        }
    };

  if (mode === 'play') {
    return (
      <div className="w-screen h-screen bg-black">
        <GamePlayer vn={vn} currentSceneId={currentSceneId} onChoice={handlePlayerChoice} />
        <button
          onClick={() => setMode('edit')}
          className="absolute top-4 right-4 z-50 flex items-center p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"
          title="에디터로 돌아가기"
        >
          <EditIcon className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-gray-800 text-white flex flex-col font-sans overflow-hidden">
      <header className="flex-shrink-0 bg-gray-900 p-2 flex items-center justify-between shadow-md z-10">
        <h1 className="text-xl font-bold">비주얼 노벨 크리에이터</h1>
        <div className="flex items-center gap-2">
            <button onClick={handleSave} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded"><SaveIcon className="w-5 h-5" /> 저장</button>
            <button onClick={handleReset} className="flex items-center gap-2 px-3 py-2 bg-red-700 hover:bg-red-600 rounded"><ResetIcon className="w-5 h-5" /> 초기화</button>
            <button onClick={() => { setCurrentSceneId(vn.startSceneId); setMode('play'); }} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded"><PlayIcon className="w-5 h-5" /> 플레이</button>
        </div>
      </header>

      <div className="flex flex-grow overflow-hidden">
        {/* Left Panel: Editor */}
        <aside className="w-1/3 bg-gray-700 p-4 overflow-y-auto flex flex-col gap-4">
          {/* AI Generation */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="font-bold mb-2 text-lg flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-yellow-400" /> AI 스토리 생성기</h2>
            <p className="text-sm text-gray-400 mb-3">나만의 테마로 이야기를 만들거나, 즉시 완전한 데모 프로젝트를 생성하세요.</p>
            
            <label className="text-sm font-medium text-gray-300">당신의 테마</label>
            <input 
              type="text" 
              value={aiTheme} 
              onChange={e => setAiTheme(e.target.value)} 
              placeholder="예: '유령의 집 미스터리'" 
              className="w-full p-2 bg-gray-900 rounded border border-gray-600 mt-1" 
              disabled={isGenerating}
            />
            <button 
              onClick={handleGenerateStory} 
              disabled={isGenerating || !aiTheme.trim()} 
              className="w-full mt-2 p-2 bg-indigo-600 hover:bg-indigo-500 rounded disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              테마로 생성하기
            </button>

            <div className="relative flex py-3 items-center">
                <div className="flex-grow border-t border-gray-600"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-xs">또는</span>
                <div className="flex-grow border-t border-gray-600"></div>
            </div>

            <button 
              onClick={handleGenerateDemoStory} 
              disabled={isGenerating} 
              className="w-full p-2 bg-teal-600 hover:bg-teal-500 rounded disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors font-semibold"
            >
              ✨ 데모 스토리 생성
            </button>
            
            {isGenerating && <p className="text-center text-yellow-400 text-sm mt-3 animate-pulse">스토리를 생성 중입니다... 잠시만 기다려 주세요.</p>}
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>


          {/* Game Settings */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <h2 className="font-bold mb-2">게임 설정</h2>
            <label>제목</label>
            <input type="text" value={vn.title} onChange={e => updateVn(d => ({...d, title: e.target.value}))} className="w-full p-2 bg-gray-900 rounded border border-gray-600" />
            <label className="mt-2 block">시작 장면</label>
            <select value={vn.startSceneId} onChange={e => updateVn(d => ({...d, startSceneId: e.target.value}))} className="w-full p-2 bg-gray-900 rounded border border-gray-600">
                {vn.scenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Characters */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-bold text-lg">캐릭터</h2>
              <button onClick={handleAddCharacter} className="p-1 bg-green-600 hover:bg-green-500 rounded"><PlusIcon className="w-5 h-5"/></button>
            </div>
            <div className="space-y-2">
              {vn.characters.map(char => (
                <div key={char.id} className="bg-gray-700 p-2 rounded flex items-start gap-2">
                  <div className="w-16 h-24 bg-gray-900 rounded-sm flex-shrink-0">
                    {char.imageUrl && <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover rounded-sm"/>}
                  </div>
                  <div className="flex-grow">
                    <input type="text" value={char.name} onChange={e => handleCharacterChange(char.id, 'name', e.target.value)} className="w-full p-1 bg-gray-600 rounded" />
                    <input type="text" placeholder="이미지 URL" value={char.imageUrl} onChange={e => handleCharacterChange(char.id, 'imageUrl', e.target.value)} className="w-full p-1 mt-1 bg-gray-600 rounded" />
                     <input type="file" accept="image/*" onChange={(e) => handleCharacterImageUpload(e, char.id)} className="w-full text-xs mt-1" />
                  </div>
                  <button onClick={() => handleDeleteCharacter(char.id)} className="p-1 text-red-400 hover:text-red-300"><TrashIcon className="w-5 h-5"/></button>
                </div>
              ))}
            </div>
          </div>
          
          {/* Scenes List */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-bold text-lg">장면 구조</h2>
              <button onClick={handleAddScene} className="p-1 bg-green-600 hover:bg-green-500 rounded" title="새 장면 추가"><PlusIcon className="w-5 h-5"/></button>
            </div>
             <SceneTree vn={vn} selectedSceneId={selectedSceneId} onSelectScene={setSelectedSceneId} />
          </div>
        </aside>

        {/* Right Panel: Scene Editor */}
        <main className="w-2/3 bg-gray-900 p-4 overflow-y-auto">
          {selectedScene ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">장면 편집: {selectedScene.name}</h2>
                 <button onClick={() => handleDeleteScene(selectedScene.id)} className="p-2 text-red-400 hover:text-red-300 flex items-center gap-1"><TrashIcon className="w-5 h-5"/> 장면 삭제</button>
              </div>

              <div>
                <label>장면 이름</label>
                <input type="text" value={selectedScene.name} onChange={e => handleSceneChange(selectedScene.id, 'name', e.target.value)} className="w-full p-2 bg-gray-800 rounded border border-gray-600" />
              </div>

              <div className="bg-gray-800 p-4 rounded-lg border border-indigo-500/30">
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-yellow-400" /> AI 장면 어시스턴트</h3>
                  <p className="text-sm text-gray-400 mb-3">이 장면에 대한 프롬프트를 제공하여 배경과 대화를 자동으로 생성하세요.</p>
                  
                  <div>
                      <label htmlFor="ai-scene-prompt" className="block text-sm font-medium text-gray-300 mb-1">장면 프롬프트</label>
                      <textarea
                          id="ai-scene-prompt"
                          rows={3}
                          value={selectedScene.aiPrompt || ''}
                          onChange={e => handleSceneChange(selectedScene.id, 'aiPrompt', e.target.value)}
                          placeholder="예: 미래적인 네온 불빛 바에서의 긴장감 넘치는 협상."
                          className="w-full p-2 bg-gray-700 rounded border border-gray-600"
                          disabled={isGeneratingBg || isGeneratingDialogue}
                      />
                  </div>

                  <div className="flex items-center gap-4 mt-3">
                      <button
                          onClick={handleGenerateBg}
                          disabled={!selectedScene.aiPrompt?.trim() || isGeneratingBg || isGeneratingDialogue}
                          className="flex-1 p-2 bg-indigo-600 hover:bg-indigo-500 rounded disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                      >
                          <SparklesIcon className="w-5 h-5" />
                          {isGeneratingBg ? '생성 중...' : '배경 생성하기'}
                      </button>
                      <button
                          onClick={handleGenerateDialogue}
                          disabled={!selectedScene.aiPrompt?.trim() || isGeneratingBg || isGeneratingDialogue}
                          className="flex-1 p-2 bg-teal-600 hover:bg-teal-500 rounded disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                          title={selectedScene.presentCharacterIds.length === 0 ? "장면에 먼저 캐릭터를 추가하세요" : ""}
                      >
                          <SparklesIcon className="w-5 h-5" />
                          {isGeneratingDialogue ? '생성 중...' : '대화 생성하기'}
                      </button>
                  </div>
              </div>
              
              <div>
                <label>배경 이미지</label>
                <div className="flex items-start gap-4">
                    <div className="w-48 h-27 bg-gray-800 rounded flex-shrink-0">
                        {selectedScene.backgroundUrl && <img src={selectedScene.backgroundUrl} alt="background" className="w-full h-full object-cover rounded"/>}
                    </div>
                    <div className="flex-grow">
                        <input type="text" placeholder="배경 이미지 URL" value={selectedScene.backgroundUrl} onChange={e => handleSceneChange(selectedScene.id, 'backgroundUrl', e.target.value)} className="w-full p-2 bg-gray-800 rounded border border-gray-600" />
                         <input type="file" accept="image/*" onChange={(e) => handleSceneBgUpload(e, selectedScene.id)} className="w-full text-sm mt-2" />
                    </div>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-medium">등장 캐릭터</label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 p-2 bg-gray-800 rounded border border-gray-600">
                    {vn.characters.length > 0 ? vn.characters.map(char => (
                    <label key={char.id} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                        type="checkbox"
                        checked={selectedScene.presentCharacterIds.includes(char.id)}
                        onChange={e => handlePresentCharacterToggle(selectedScene.id, char.id, e.target.checked)}
                        className="h-4 w-4 accent-indigo-500 bg-gray-700 border-gray-500 rounded focus:ring-indigo-500"
                        />
                        {char.name}
                    </label>
                    )) : <p className="text-gray-500 text-sm">아직 생성된 캐릭터가 없습니다.</p>}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg">대화</h3>
                    <button onClick={() => handleAddDialogueLine(selectedScene.id)} className="p-1 bg-green-600 hover:bg-green-500 rounded" title="대화 줄 추가"><PlusIcon className="w-5 h-5"/></button>
                </div>
                <div className="space-y-2">
                  {selectedScene.dialogue.map((line, index) => (
                    <div key={index} className="flex items-start gap-2 bg-gray-800 p-2 rounded">
                        <select value={line.characterId || ''} onChange={e => handleDialogueLineChange(selectedScene.id, index, 'characterId', e.target.value || null)} className="p-1 bg-gray-700 rounded w-40 flex-shrink-0">
                            <option value="">내레이터</option>
                            {vn.characters
                                .filter(c => selectedScene.presentCharacterIds.includes(c.id))
                                .map(char => <option key={char.id} value={char.id}>{char.name}</option>)
                            }
                        </select>
                        <textarea value={line.text} onChange={e => handleDialogueLineChange(selectedScene.id, index, 'text', e.target.value)} rows={2} className="flex-grow p-1 bg-gray-700 rounded" placeholder="대화 텍스트..."/>
                        <button onClick={() => handleDeleteDialogueLine(selectedScene.id, index)} className="p-1 text-red-400 hover:text-red-300 flex-shrink-0"><TrashIcon className="w-5 h-5"/></button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg">선택지</h3>
                    <button onClick={() => handleAddChoice(selectedScene.id)} className="p-1 bg-green-600 hover:bg-green-500 rounded"><PlusIcon className="w-5 h-5"/></button>
                </div>
                <div className="space-y-2">
                  {selectedScene.choices.map((choice, index) => (
                    <div key={index} className="flex items-center gap-2 bg-gray-800 p-2 rounded">
                      <input type="text" value={choice.text} onChange={e => handleChoiceChange(selectedScene.id, index, 'text', e.target.value)} className="flex-grow p-1 bg-gray-700 rounded" placeholder="선택지 텍스트" />
                      <span className="text-gray-400">→</span>
                      <select value={choice.nextSceneId} onChange={e => handleChoiceChange(selectedScene.id, index, 'nextSceneId', e.target.value)} className="p-1 bg-gray-700 rounded">
                        {vn.scenes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <button onClick={() => handleDeleteChoice(selectedScene.id, index)} className="p-1 text-red-400 hover:text-red-300"><TrashIcon className="w-5 h-5"/></button>
                    </div>
                  ))}
                  {selectedScene.choices.length === 0 && <p className="text-gray-500 text-center py-2">이것이 엔딩 장면입니다.</p>}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">왼쪽 패널에서 편집할 장면을 선택하세요.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;