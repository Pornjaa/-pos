
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Category, AiPersona } from "../types";

export const isApiKeyReady = () => {
  const key = process.env.API_KEY;
  return !!key && key.length > 10;
};

// เช็คว่ามีการเลือก API Key ผ่าน AI Studio หรือยัง
export const hasCustomKey = async () => {
  if (typeof (window as any).aistudio?.hasSelectedApiKey === 'function') {
    return await (window as any).aistudio.hasSelectedApiKey();
  }
  return false;
};

// เปิดหน้าต่างเลือก API Key
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
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "ตอบคำว่า OK",
    });
    return { ok: !!response.text, msg: "เชื่อมต่อ AI สำเร็จแล้วจ้ะ!" };
  } catch (e: any) {
    let errorMsg = "กุญแจอาจจะผิดหรือหมดอายุจ้ะ";
    if (e.message?.includes("429")) errorMsg = "โควต้าการใช้งานวันนี้หมดแล้วจ้ะ (จำกัด 20 ครั้ง/วัน)";
    return { ok: false, msg: errorMsg };
  }
};

export const processReceiptImage = async (base64Image: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `คุณคือผู้เชี่ยวชาญการอ่านบิลส่งของในร้านค้าไทย หน้าที่คือสกัดข้อมูลบิลให้คุณยายเจ้าของร้าน
        คำสั่งสำคัญ:
        1. พยายามสแกนหาตัวเลข "ยอดรวมสุทธิ" หรือ "Total" ในบิลให้เจอ
        2. สกัดรายการสินค้าทุกอย่าง (ชื่อ, จำนวน, ราคารวมรายการ)
        3. หากอ่านรายการสินค้าไม่ได้เลย ให้คืนรายการเดียวที่มีชื่อว่า "รวมยอดตามบิล" และใส่ยอดรวมเงินสุทธิที่เห็นลงในช่อง totalPrice
        4. ห้ามส่งคืนอาเรย์ items ว่างเด็ดขาด อย่างน้อยต้องมี 1 รายการ
        5. สำหรับน้ำแข็ง: สกัดจำนวนที่มาส่ง (delivered) และจำนวนที่คืนถุง (returned) จากข้อความในบิล`,
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
          { text: "ช่วยอ่านบิลนี้และสกัดยอดเงินทั้งหมดมาให้คุณยายตรวจสอบหน่อยจ้ะ" }
        ],
      },
    });
    
    return JSON.parse(response.text || "{}");
  } catch (e: any) {
    console.error("Gemini API Error:", e);
    if (e.message?.includes("429") || e.message?.includes("quota") || e.message?.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw new Error("ยายจ๋า อ่านบิลไม่สำเร็จจ้ะ");
  }
};

export const recognizeProduct = async (base64Image: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
    return JSON.parse(response.text || "{}");
  } catch (e: any) {
    if (e.message?.includes("429") || e.message?.includes("quota") || e.message?.includes("RESOURCE_EXHAUSTED")) {
      throw new Error("QUOTA_EXCEEDED");
    }
    throw new Error("จำสินค้าไม่ได้จ้ะ");
  }
};

export const generateMascot = async () => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: 'A cute friendly Thai shop owner mascot character, 3D render style, warm colors, professional but approachable.' }],
      },
      config: { imageConfig: { aspectRatio: "1:1" } },
    });
    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data");
  } catch (e) {
    throw new Error("ยายจ๋า วาดรูปไม่สำเร็จจ้ะ");
  }
};

export const speakText = async (text: string, persona: AiPersona = 'GRANDMA'): Promise<{ ok: boolean; error?: string }> => {
  if (!text.trim()) return { ok: true };
  const ctx = await initAudio();
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const voiceMap: Record<AiPersona, string> = { 'GRANDMA': 'Kore', 'GIRLFRIEND': 'Puck', 'BOYFRIEND': 'Charon', 'PROFESSIONAL': 'Zephyr' };
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceMap[persona] || 'Kore' } } },
      },
    });
    const parts = response.candidates?.[0]?.content?.parts;
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
  } catch (e: any) {
    if (e.message?.includes("429")) return { ok: false, error: 'QUOTA_EXCEEDED' };
  }
  return { ok: false };
};
