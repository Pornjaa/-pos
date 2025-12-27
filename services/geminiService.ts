
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Category, AiPersona } from "../types";

const getApiKey = () => {
  return process.env.API_KEY || "";
};

export const isApiKeyReady = () => {
  const key = getApiKey();
  return typeof key === 'string' && key.length > 10;
};

export const hasCustomKey = async () => {
  if (typeof (window as any).aistudio?.hasSelectedApiKey === 'function') {
    return await (window as any).aistudio.hasSelectedApiKey();
  }
  return false;
};

export const openKeySelector = async () => {
  if (typeof (window as any).aistudio?.openSelectKey === 'function') {
    await (window as any).aistudio.openSelectKey();
    return true;
  }
  return false;
};

let audioCtx: AudioContext | null = null;

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodePcmAudio(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const validByteLength = data.byteLength - (data.byteLength % (2 * numChannels));
  const frameCount = validByteLength / (2 * numChannels);
  
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  const view = new DataView(data.buffer, data.byteOffset, validByteLength);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      const byteOffset = (i * numChannels + channel) * 2;
      const sample = view.getInt16(byteOffset, true);
      channelData[i] = sample / 32768.0;
    }
  }
  return buffer;
}

export const initAudio = async () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
  return audioCtx;
};

export const playTestBeep = async () => {
  const ctx = await initAudio();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
};

export const testAiConnection = async () => {
  if (!isApiKeyReady()) return { ok: false, msg: "ไม่พบกุญแจ API ในระบบจ้ะ" };
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "ตอบคำว่า OK",
    });
    return { ok: !!response.text, msg: "เชื่อมต่อ AI สำเร็จแล้วจ้ะ!" };
  } catch (e: any) {
    console.error("Connection Test Error:", e);
    return { ok: false, msg: "กุญแจอาจจะผิดหรือหมดอายุจ้ะ" };
  }
};

export const processReceiptImage = async (base64Image: string) => {
  if (!isApiKeyReady()) throw new Error("MISSING_KEY");
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `คุณคือผู้เชี่ยวชาญการอ่านบิลส่งของร้านชำไทย หน้าที่คือสกัดข้อมูลบิลให้แม่นยำที่สุด
        1. สกัดชื่อสินค้า จำนวน และราคาสุทธิ
        2. หากเป็นบิลน้ำแข็ง ให้สกัดจำนวนที่ส่ง (delivered) และจำนวนที่คืนถุง (returned)
        3. คืนค่าเป็น JSON เท่านั้น`,
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
              properties: { delivered: { type: Type.NUMBER }, returned: { type: Type.NUMBER } }
            }
          },
          required: ["category", "items"]
        }
      },
      contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }, { text: "ช่วยอ่านบิลนี้ให้หน่อยจ้ะ" }] },
    });
    return JSON.parse(response.text || "{}");
  } catch (e: any) {
    if (e.message?.includes("429")) throw new Error("QUOTA_EXCEEDED");
    throw new Error("อ่านบิลไม่สำเร็จจ้ะ");
  }
};

export const recognizeProduct = async (base64Image: string, existingProductNames: string[] = []) => {
  if (!isApiKeyReady()) throw new Error("MISSING_KEY");
  
  const productListContext = existingProductNames.length > 0 
    ? `รายการสินค้าที่จดไว้ในร้านมีดังนี้: [${existingProductNames.join(", ")}] กรุณาเลือกชื่อที่ตรงกับในรูปมากที่สุดจากรายการนี้ หากไม่มีในรายการให้ตั้งชื่อใหม่ตามที่เห็น`
    : "ระบุชื่อแบรนด์และขนาดบรรจุสินค้าให้ชัดเจน";

  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `คุณคือผู้ช่วยร้านค้าไทย หน้าที่คือระบุสินค้าจากรูปภาพ ${productListContext}`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { name: { type: Type.STRING, description: "ชื่อสินค้าที่ตรงกับในระบบหรือชื่อจริงของสินค้า" } },
          required: ["name"]
        }
      },
      contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }, { text: "นี่คือสินค้าอะไรจ๊ะ?" }] },
    });
    return JSON.parse(response.text || "{}");
  } catch (e: any) {
    throw new Error("จำสินค้าไม่ได้จ้ะ");
  }
};

export const speakText = async (text: string, persona: AiPersona = 'GRANDMA'): Promise<{ ok: boolean; error?: string }> => {
  if (!text.trim()) return { ok: true };
  if (!isApiKeyReady()) return { ok: false, error: "MISSING_KEY" };
  
  const ctx = await initAudio();
  try {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    
    // ปรับการเลือกเสียง (Gemini Preview เสียงผู้หญิงค่อนข้างน้อย หลานพยายามเลือกโทนที่เหมาะสมที่สุด)
    const voiceMap: Record<AiPersona, string> = { 
      'GRANDMA': 'Puck', // เสียงนุ่ม สุภาพ
      'GIRLFRIEND': 'Kore', // เสียงที่โทนสูงและแบนกว่าปกติเล็กน้อย
      'BOYFRIEND': 'Charon', // เสียงทุ้มเข้ม
      'PROFESSIONAL': 'Zephyr' // เสียงชัดเจน เป็นการเป็นงาน
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceMap[persona] || 'Puck' } } },
      },
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content?.parts;
      const part = parts?.find(p => !!p.inlineData?.data);
      if (part?.inlineData?.data) {
        const audioBuffer = await decodePcmAudio(decodeBase64(part.inlineData.data), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        if (ctx.state === 'suspended') await ctx.resume();
        source.start(0);
        return { ok: true };
      }
    }
    return { ok: false, error: "No audio data" };
  } catch (e: any) {
    if (e.message?.includes("429")) return { ok: false, error: 'QUOTA_EXCEEDED' };
    return { ok: false, error: e.message };
  }
};
