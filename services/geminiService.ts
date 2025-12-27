
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Category, AiPersona } from "../types";

// ใช้กุญแจจากระบบโดยตรง ไม่ต้องผ่าน Dialog ให้ยุ่งยาก
// @google/genai fix: Initializing GoogleGenAI client with named parameter apiKey from process.env.API_KEY directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

let audioCtx: AudioContext | null = null;

const cleanJsonResponse = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

// ฟังก์ชันถอดรหัส Base64 เป็น Bytes ตามตัวอย่างมาตรฐาน
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// ฟังก์ชันถอดรหัสเสียง Raw PCM ตามที่ API กำหนด (ห้ามใช้ decodeAudioData ปกติ)
async function decodePcmAudio(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const processReceiptImage = async (base64Image: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: "คุณคือผู้เชี่ยวชาญการอ่านบิลสินค้าในไทย สกัดข้อมูลจากรูปภาพบิลส่งของอย่างละเอียดและแม่นยำที่สุด",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING, enum: ["ICE", "BEVERAGE", "OTHERS"] },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unitPrice: { type: Type.NUMBER },
                  totalPrice: { type: Type.NUMBER }
                },
                required: ["name", "quantity", "unitPrice", "totalPrice"]
              }
            },
            iceMetrics: {
              type: Type.OBJECT,
              properties: {
                delivered: { type: Type.NUMBER },
                returned: { type: Type.NUMBER }
              }
            },
            notes: { type: Type.STRING }
          },
          required: ["category", "items"]
        }
      },
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "อ่านบิลนี้และสกัดข้อมูลสินค้า" }
        ],
      },
    });
    
    // @google/genai fix: The .text property is a getter that returns the generated string directly.
    const text = response.text || "{}";
    return JSON.parse(cleanJsonResponse(text));
  } catch (e) {
    console.error("Process Receipt Error:", e);
    throw new Error("ยายจ๋า อ่านบิลไม่สำเร็จจ้ะ ตรวจสอบการเชื่อมต่ออินเทอร์เน็ตนะ");
  }
};

export const recognizeProduct = async (base64Image: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: "ระบุชื่อแบรนด์และขนาดบรรจุสินค้า",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { name: { type: Type.STRING } },
          required: ["name"]
        }
      },
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
          { text: "นี่คือสินค้าอะไร?" }
        ],
      },
    });
    
    // @google/genai fix: The .text property is a getter that returns the generated string directly.
    return JSON.parse(cleanJsonResponse(response.text || "{}"));
  } catch (e) {
    console.error("Recognize Product Error:", e);
    throw new Error("จำสินค้าไม่ได้จ้ะยาย");
  }
};

export const generateMascot = async () => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: "A friendly Thai grandmother mascot, Pixar style, 3D" }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("ไม่มีรูปส่งกลับมาจ้ะ");
  } catch (e) {
    console.error("Generate Mascot Error:", e);
    throw new Error("ยายจ๋า วาดรูปไม่สำเร็จจ้ะ");
  }
};

export const speakText = async (text: string, persona: AiPersona = 'GRANDMA') => {
  if (!text.trim()) return;

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }

  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  try {
    const voiceMap = { 'GRANDMA': 'Kore', 'GIRLFRIEND': 'Puck', 'BOYFRIEND': 'Charon', 'PROFESSIONAL': 'Zephyr' };
    const voiceName = voiceMap[persona] || 'Kore';
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say in Thai naturally: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    });

    const candidates = response.candidates;
    // @google/genai fix: Correctly accessing raw audio bytes from candidates parts.
    const base64Audio = candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (base64Audio) {
      const bytes = decode(base64Audio);
      const audioBuffer = await decodePcmAudio(bytes, audioCtx, 24000, 1);
      
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.start();
    }
  } catch (e) {
    console.error("TTS Error:", e);
  }
};
