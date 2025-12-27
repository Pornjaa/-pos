
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Category, AiPersona } from "../types";

// ใช้กุญแจจากระบบ
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

let audioCtx: AudioContext | null = null;

// ฟังก์ชันถอดรหัส Base64
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// ฟังก์ชันถอดรหัส Raw PCM
async function decodePcmAudio(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
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

// ฟังก์ชันเตรียมระบบเสียง + อุ่นเครื่อง (Warm-up)
export const initAudio = async () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  
  // สำคัญมากสำหรับมือถือ: ต้อง Resume ทุกครั้งที่มีการกดปุ่ม
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
  
  // อุ่นเครื่องด้วยเสียงเงียบ
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  gain.gain.value = 0; 
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(0);
  osc.stop(0.001);
  
  return audioCtx;
};

export const processReceiptImage = async (base64Image: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: "คุณคือผู้เชี่ยวชาญการอ่านบิลสินค้าในไทย สกัดข้อมูลจากรูปภาพบิลอย่างละเอียด",
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
          { text: "อ่านบิลนี้" }
        ],
      },
    });
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error(e);
    throw new Error("ยายจ๋า อ่านบิลไม่สำเร็จจ้ะ");
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
    return JSON.parse(response.text || "{}");
  } catch (e) {
    throw new Error("จำสินค้าไม่ได้จ้ะ");
  }
};

export const generateMascot = async () => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: "A friendly Thai grandmother mascot, Pixar style, 3D" }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    
    // แก้ไข TS2532 แบบเด็ดขาด: ใช้ตัวแปรช่วยเช็คทีละขั้น
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        const parts = candidate.content.parts;
        const partWithImage = parts.find(p => p.inlineData && p.inlineData.data);
        if (partWithImage && partWithImage.inlineData && partWithImage.inlineData.data) {
          return `data:image/png;base64,${partWithImage.inlineData.data}`;
        }
      }
    }
    throw new Error("Image missing");
  } catch (e) {
    throw new Error("วาดรูปไม่สำเร็จจ้ะ");
  }
};

export const speakText = async (text: string, persona: AiPersona = 'GRANDMA') => {
  if (!text.trim()) return;

  const ctx = await initAudio();

  try {
    const voiceMap = { 'GRANDMA': 'Kore', 'GIRLFRIEND': 'Puck', 'BOYFRIEND': 'Charon', 'PROFESSIONAL': 'Zephyr' };
    const voiceName = voiceMap[persona] || 'Kore';
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    });

    // แก้ไข TS2532 แบบเด็ดขาด: ตรวจสอบโครงสร้างข้อมูลก่อนใช้งาน
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        const parts = candidate.content.parts;
        const partWithAudio = parts.find(p => p.inlineData && p.inlineData.data);
        if (partWithAudio && partWithAudio.inlineData && partWithAudio.inlineData.data) {
          const base64Audio = partWithAudio.inlineData.data;
          const bytes = decodeBase64(base64Audio);
          const audioBuffer = await decodePcmAudio(bytes, ctx, 24000, 1);
          
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          source.start();
        }
      }
    }
  } catch (e) {
    console.error("ยายจ๋า เสียงมีปัญหา:", e);
  }
};
