import { GoogleGenAI, Type, Modality } from "@google/genai";
import { VisualNovel, Character, DialogueLine } from '../types';

export async function generateStory(theme: string): Promise<VisualNovel> {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY 환경 변수가 설정되지 않았습니다");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    테마 "${theme}"를 기반으로 완전한 비주얼 노벨 스토리를 만들어 주세요.
    스토리는 시작, 중간, 끝이 명확한 독립적인 미니 게임이어야 합니다.
    최소 2명의 캐릭터와 4개의 장면을 포함해야 합니다.
    장면들은 선택지를 통해 서로 연결되어야 합니다. 모든 장면에 도달할 수 있도록 하세요.
    한 장면에 여러 캐릭터가 등장할 수 있으며, 그들 사이에 대화가 오고 갈 수 있습니다.
    마지막 장면에는 이야기의 끝을 알리기 위해 선택지가 없어야 합니다.
    결과는 이 스키마를 엄격하게 따르는 단일 유효 JSON 객체로 제공해 주세요. \`\`\`json과 같은 마크다운 서식은 포함하지 마세요.
    
    JSON 객체는 다음 구조를 가져야 합니다:
    {
      "title": "테마를 기반으로 한 창의적인 제목",
      "characters": [
        { "id": "char_1", "name": "캐릭터 이름", "imageUrl": "https://picsum.photos/400/600의 플레이스홀더 이미지 URL" }
      ],
      "scenes": [
        {
          "id": "scene_1",
          "name": "장면에 대한 짧고 설명적인 이름 (예: '대결')",
          "backgroundUrl": "https://picsum.photos/1280/720의 플레이스홀더 이미지 URL",
          "presentCharacterIds": ["char_1"],
          "dialogue": [
            { "characterId": "char_1", "text": "캐릭터 1이 말하는 대사." },
            { "characterId": null, "text": "이것은 내레이터 대사입니다. 내레이터의 'characterId' 필드는 null입니다." }
          ],
          "choices": [
            { "text": "선택지 텍스트", "nextSceneId": "scene_2" }
          ]
        }
      ],
      "startSceneId": "첫 번째 장면의 ID (예: 'scene_1')"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            startSceneId: { type: Type.STRING },
            characters: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  imageUrl: { type: Type.STRING },
                },
                required: ['id', 'name', 'imageUrl'],
              },
            },
            scenes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  backgroundUrl: { type: Type.STRING },
                  presentCharacterIds: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  dialogue: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        characterId: { type: Type.STRING, nullable: true },
                        text: { type: Type.STRING },
                      },
                      required: ['text'],
                    }
                  },
                  choices: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        text: { type: Type.STRING },
                        nextSceneId: { type: Type.STRING },
                      },
                      required: ['text', 'nextSceneId'],
                    },
                  },
                },
                required: ['id', 'name', 'backgroundUrl', 'presentCharacterIds', 'dialogue', 'choices'],
              },
            },
          },
          required: ['title', 'startSceneId', 'characters', 'scenes'],
        },
      },
    });

    const jsonString = response.text.trim();
    const generatedData = JSON.parse(jsonString);

    // Basic validation
    if (!generatedData.title || !generatedData.scenes || !generatedData.characters || !generatedData.startSceneId) {
        throw new Error("AI 응답에 필수 필드가 누락되었습니다.");
    }

    // Ensure data conforms to the VisualNovel type
    generatedData.scenes.forEach((scene: any) => {
        if (!Array.isArray(scene.presentCharacterIds)) {
            scene.presentCharacterIds = [];
        }
        if (!Array.isArray(scene.dialogue)) {
            scene.dialogue = [{ text: '...', characterId: null }];
        }
        scene.dialogue.forEach((line: any) => {
            if (typeof line.characterId === 'undefined') {
                line.characterId = null;
            }
        });
    });

    return generatedData as VisualNovel;
  } catch (error) {
    console.error("스토리 생성 오류 (Gemini):", error);
    if (error instanceof Error) {
        if (error.message.includes('JSON.parse')) {
            throw new Error("스토리 생성에 실패했습니다. AI가 잘못된 JSON 구조를 반환했습니다.");
        }
        if (error.message.includes('missing required fields')) {
            throw new Error("스토리 생성에 실패했습니다. AI 응답이 불완전합니다. 다시 시도해 주세요.");
        }
    }
    throw new Error("스토리 생성에 실패했습니다. 자세한 내용은 콘솔을 확인해 주세요.");
  }
}


export async function generateSceneBackground(prompt: string): Promise<string> {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY 환경 변수가 설정되지 않았습니다");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const fullPrompt = `고품질 비주얼 노벨 배경 이미지. 장면 설명: ${prompt}. 스타일: 생생함, 애니메이션, 디지털 아트, 디테일.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: fullPrompt }] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }

        throw new Error("이미지 생성 결과 이미지가 없습니다.");
    } catch (error) {
        console.error("배경 생성 오류 (Gemini):", error);
        throw new Error("배경 이미지 생성에 실패했습니다.");
    }
}

export async function generateSceneDialogue(sceneName: string, scenePrompt: string, presentCharacters: Character[]): Promise<DialogueLine[]> {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY 환경 변수가 설정되지 않았습니다");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const characterDescriptions = presentCharacters.length > 0 
        ? presentCharacters.map(c => `- ${c.name} (id: ${c.id})`).join('\n')
        : '없음. 내레이터만 사용하세요.';

    const prompt = `
        당신은 비주얼 노벨의 대화 작가입니다.
        현재 장면의 이름은 "${sceneName}"입니다.
        장면의 테마는 "${scenePrompt}"입니다.
        등장인물은 다음과 같습니다:
        ${characterDescriptions}

        이 장면에 대한 짧고 흥미로운 대화 시퀀스를 작성해 주세요. 3~5줄 길이여야 합니다.
        설명적인 텍스트에는 "내레이터"를 사용할 수 있습니다. 내레이터 대사의 경우 "characterId"는 null이어야 합니다.
        캐릭터가 말하는 대사에는 제공된 "id"를 사용하세요.
        결과는 이 스키마를 엄격하게 따르는 단일 유효 JSON 객체 배열로 제공해 주세요. \`\`\`json과 같은 마크다운 서식은 포함하지 마세요.
        
        JSON 배열은 다음 구조를 가져야 합니다:
        [
          { "characterId": "the_character_id" | null, "text": "캐릭터 또는 내레이터가 말하는 대화." }
        ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            characterId: { type: Type.STRING, nullable: true },
                            text: { type: Type.STRING },
                        },
                        required: ['text'],
                    }
                }
            }
        });

        const jsonString = response.text.trim();
        const generatedDialogue = JSON.parse(jsonString);

        if (!Array.isArray(generatedDialogue)) {
            throw new Error("AI 응답이 유효한 배열이 아닙니다.");
        }

        return generatedDialogue.map(line => ({
            characterId: line.characterId || null,
            text: line.text
        }));
    } catch (error) {
        console.error("대화 생성 오류 (Gemini):", error);
        throw new Error("대화 생성에 실패했습니다.");
    }
}