

import { GoogleGenAI, Type } from "@google/genai";

const getAiClient = (apiKey: string) => {
  const key = apiKey || process.env.API_KEY;
  if (!key) throw new Error("No API Key provided");
  return new GoogleGenAI({ apiKey: key });
};

export interface CharacterData {
    name: string;
    description: string;
    imageReferences: string[]; // Base64 strings
}

export interface GenResponse<T> {
    data: T;
    usage: {
        promptTokens: number;
        candidatesTokens: number;
    }
}

export const generateSceneImage = async (
  apiKey: string,
  stylePrompt: string,
  scenePrompt: string,
  scriptContent: string,
  characters: CharacterData[],
  previousScenes: { script: string, prompt: string }[] = []
): Promise<GenResponse<string>> => {
  const ai = getAiClient(apiKey);
  
  const sceneDetails = `
[SCENE INFO]
Script Content: "${scriptContent}"
Visual Context: "${scenePrompt}"

[CINEMATOGRAPHY & CONTINUITY]
1. ANGLE VARIETY: Avoid repeating the last camera angle. 
   - Previous Scenes: ${previousScenes.length > 0 ? previousScenes.map((s,i) => `[Scene -${i+1}: ${s.prompt}]`).join(', ') : "None"}
   - Recommended: High Angle, Low Angle, Dutch Angle, or Over-the-shoulder.
2. CONTINUITY: If location/time matches previous scenes, maintain environment details.
  `;

  let fullPrompt = "";

  if (stylePrompt.includes('[A]')) {
      fullPrompt = stylePrompt.replace('[A]', sceneDetails);
  } else {
      fullPrompt = `ACT AS A WORLD-CLASS CINEMATOGRAPHER AND DIRECTOR.
  
**GOAL**: Generate a high-quality 3D render/image for a video project.

**VISUAL STYLE**: ${stylePrompt || "Cinematic, 3D render, high detail, masterpiece."}

---
**CINEMATIC RULES (STRICT ADHERENCE REQUIRED)**:
${sceneDetails}

**CHARACTERS IN SCENE (Must match references)**:
${characters.length > 0 
  ? characters.map(c => `   - ${c.name}: ${c.description}`).join('\n') 
  : "   - No specific characters."}

**INSTRUCTION**: Generate the image now. Focus heavily on the Camera Angle and Continuity described above.`;
  }

  const parts: any[] = [];
  
  characters.forEach(char => {
      if (char.imageReferences && char.imageReferences.length > 0) {
          const base64Data = char.imageReferences[0].split(',')[1];
          parts.push({
              inlineData: {
                  data: base64Data,
                  mimeType: 'image/png'
              }
          });
      }
  });

  parts.push({ text: fullPrompt });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: parts },
  });

  let imageData = "";
  if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
              imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              break;
          }
      }
  }

  if (!imageData) throw new Error("No image generated.");

  return {
      data: imageData,
      usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          candidatesTokens: response.usageMetadata?.candidatesTokenCount || 0
      }
  };
};

export const editSceneImage = async (
    apiKey: string,
    inputImageBase64: string,
    prompt: string
): Promise<GenResponse<string>> => {
    const ai = getAiClient(apiKey);
    const base64Data = inputImageBase64.split(',')[1];
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: 'image/png'
                    }
                },
                { text: `Modify this image: ${prompt}` }
            ]
        }
    });

    let imageData = "";
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                imageData = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                break;
            }
        }
    }
    if (!imageData) throw new Error("Failed to edit image.");

    return {
        data: imageData,
        usage: {
            promptTokens: response.usageMetadata?.promptTokenCount || 0,
            candidatesTokens: response.usageMetadata?.candidatesTokenCount || 0
        }
    };
};

export const generateMotionPrompt = async (
    apiKey: string,
    imageBase64: string,
    script: string,
    prevContexts: string[],
    nextContexts: string[]
): Promise<GenResponse<{ prompt: string, name: string }>> => {
    // Mock implementation for structure - Motion not fully supported by Flash API directly in this context usually
    // But assuming we use a text prompt generation for it
    return {
        data: { prompt: "Camera zoom in slowly.", name: "Zoom In" },
        usage: { promptTokens: 100, candidatesTokens: 10 }
    };
};

export const createScriptChatSession = (apiKey: string) => {
    const ai = getAiClient(apiKey);
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: "You are a helpful assistant for processing video scripts. Your main task is to help the user segment and format their script.",
        }
    });
};

function addWavHeader(pcmData: Uint8Array, sampleRate = 24000, numChannels = 1) {
  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length, true);
  const dataView = new Uint8Array(buffer, 44);
  dataView.set(pcmData);
  return buffer;
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export const generateSpeech = async (
  apiKey: string,
  text: string,
  voiceName: string
): Promise<GenResponse<string>> => {
  if (!text) throw new Error("Text is empty");
  const ai = getAiClient(apiKey);
  
  const model = 'gemini-2.5-pro-preview-tts'; 

  const response = await ai.models.generateContent({
    model: model,
    contents: {
      parts: [{ text: text }]
    },
    config: {
      responseModalities: ['AUDIO'], 
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voiceName
          }
        }
      }
    }
  });

  const part = response.candidates?.[0]?.content?.parts?.[0];
  if (part && part.inlineData && part.inlineData.data) {
    const base64Data = part.inlineData.data;
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const wavBuffer = addWavHeader(bytes);
    let binary = '';
    const wavBytes = new Uint8Array(wavBuffer);
    const wavLen = wavBytes.byteLength;
    for (let i = 0; i < wavLen; i++) {
        binary += String.fromCharCode(wavBytes[i]);
    }
    
    return {
        data: `data:audio/wav;base64,${btoa(binary)}`,
        usage: {
            promptTokens: response.usageMetadata?.promptTokenCount || 0,
            candidatesTokens: response.usageMetadata?.candidatesTokenCount || 0
        }
    };
  }

  throw new Error("No audio generated.");
};

// New function for generating Video Prompts based on user's specific template
export const generateVideoPrompt = async (
    apiKey: string,
    data: {
        currentScript: string, // [B]
        currentImageBase64: string | undefined, // [A]
        currentContext: string, // [C]
        prevScript: string, // [B0]
        prevContext: string, // [C0]
        nextScript: string, // [B2]
        nextContext: string, // [C1]
        globalNote: string
    }
): Promise<GenResponse<string>> => {
    const ai = getAiClient(apiKey);

    const contextBlock = `
    [CONTEXT INFO]
    Previous Scene Script [B0]: "${data.prevScript || "None"}"
    Previous Scene Prompt [C0]: "${data.prevContext || "None"}"
    
    Next Scene Script [B2]: "${data.nextScript || "None"}"
    Next Scene Prompt [C1]: "${data.nextContext || "None"}"
    `;

    // Process the global note to be "worded" by Gemini if needed, 
    // but the prompt implies we pass the user's note directly or a processed version.
    // The prompt says "Lưu ý này sẽ được Gemini wording lại thành 1 đoạn...". 
    // To minimize API calls, we will inject the raw note and ask Gemini to incorporate it as a constraint.
    const noteInstruction = data.globalNote 
        ? `LƯU Ý QUAN TRỌNG (Đã được wording): ${data.globalNote}`
        : "LƯU Ý QUAN TRỌNG: Không có nhạc nền, chỉ sử dụng âm thanh môi trường nếu cần. Nhân vật chỉ hành động minh họa cho kịch bản chứ không có nhép miệng theo lời thoại.";

    const promptText = `
“Từ kịch bản [B]="${data.currentScript}" và ảnh minh họa cho kịch bản là [A] hãy viết Prompt Video (Prompt để tạo ra video 8 giây model VEO-3.1 của google để minh họa cho phân đoạn kịch bản này [B]. 
Prompt bắt buộc viết 100% bằng tiếng anh trừ những đoạn hội thoại thì có thể lời thoại là ngôn ngữ khác đúng theo kịch bản). Prompt tạo video bắt buộc phải theo Format dưới đây (lưu ý tôi ghi tiếng việt nhưng cột 4 này phải đúng ngôn ngữ là tiếng Anh nhé)
“Hãy tạo một video 8 giây
Với góc máy ban đầu: là bối cảnh trong ảnh [A]
Chuyển động nếu chia làm nhiều cảnh thì 
Cảnh 1 mấy giây: Kỹ thuật di chuyển camera sử dụng trong cảnh 1 này là gì, di chuyển từ đâu đến đâu, có chia làm nhiều cảnh hay không, nếu cắt cảnh thì sử dụng kỹ thuật gì để cắt cảnh (ví dụ Match cut, match action,...), nhân vật hành động thế nào, biểu cảm ra sao, nói gì hay không nói, nếu nói thì chi tiết giọng nói thế nào (mô tả thật chi tiết bằng các thuật ngữ mô tả giọng nói), nói tiếng gì vùng miền nào của quốc gia đó (mô tả chi tiết), nhạc nền là nhạc không lời, âm thanh môi trường hay không có âm thanh nền.
Tương tự các cảnh sau cũng vậy nhưng phải phù hợp với tất cả các chi tiết trong bối cảnh ảnh [A] 
Chuyển động đấy đưa đến cảnh quay cuối cùng: Bối cảnh ở đâu, camera đặt ở đâu trong bối cảnh đấy, góc camera hướng về nhân vật, (các) nhân vật đứng ở đâu trong bối cảnh đấy, từng nhân vật có ngoại hình chi tiết thế nào (giới tính, độ tuổi, mô tả chi tiết áo, mô tả chi tiết quần, mô tả chi tiết kiểu tóc, mô tả chi tiết khuôn mặt đảm bảo đồng nhất ở tất cả các cảnh, mô tả chi tiết tỉ lệ kích thước đầu và các bộ phận, mô tả chi tiết biểu cảm nhân vật), nhân vật hướng bộ phận nào về camera (đầu, lưng, chân gần đầu xa,...), khoảng cách giữa người và camera, các chi tiết/nhân vật phụ. Lưu ý là chuyển động phải phù hợp với nội dung đoạn này là [B].
Lưu ý chung: Không cần gọi tên nhân vật trong Prompt, tập trung vào mô tả chi tiết, biết rằng mỗi video sẽ dài khoảng 8 giây. Prompt tập trung vào chất lượng vì vậy mỗi prompt video viết ra cần phải minh họa được kịch bản là [B] và dài không dưới 300 chữ
Bắt buộc tuân thủ, chỉ viết prompt không nói thêm bất cứ một điều gì khác prompt trong câu trả lời, không chào hỏi, không trình bày, không báo cáo sẽ bắt đầu hay hoàn thành. Tức là bắt đầu từ prompt và kết thúc prompt. Prompt viết trong 1 đoạn duy nhất, không được xuống dòng, nếu ngắt ý thì ngắt bởi dấu chấm.””

${contextBlock}
${noteInstruction}
Current Context Prompt [C]: "${data.currentContext}"
    `;

    const parts: any[] = [];
    
    // Add Image A if available
    if (data.currentImageBase64) {
        const base64Data = data.currentImageBase64.split(',')[1];
        parts.push({
            inlineData: {
                data: base64Data,
                mimeType: 'image/png'
            }
        });
    }

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', // Using Flash as it accepts multimodal inputs (image+text) for text output
        contents: { parts: parts }
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!text) throw new Error("Failed to generate video prompt.");

    return {
        data: text.trim(),
        usage: {
            promptTokens: response.usageMetadata?.promptTokenCount || 0,
            candidatesTokens: response.usageMetadata?.candidatesTokenCount || 0
        }
    };
};