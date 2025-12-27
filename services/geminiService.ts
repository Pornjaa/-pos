
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Category, AiPersona } from "../types";

// กฎเหล็ก: สร้างใหม่ทุกครั้งก่อนเรียกใช้เพื่อให้ได้ Key ล่าสุดจาก Dialog
const getAi = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") return null;
  return new GoogleGenAI({ apiKey });
};

let audioCtx: AudioContext | null = null;

const cleanJsonResponse = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

const decodeBase64 = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const handleAiError = (e: any) => {
  console.error("AI Error Detail:", e);
  const errorMessage = e?.message || String(e);
  
  if (errorMessage.includes("Requested entity was not found")) {
    throw new Error("ยายจ๋า โปรเจกต์นี้ยังไม่ได้ 'เปิดสวิตช์ AI' จ้ะ หรืออาจจะยังไม่ได้ผูกบัตรให้โปรเจกต์นี้โดยเฉพาะนะจ๊ะ");
  }
  
  if (errorMessage.includes("API_KEY_INVALID") || errorMessage.includes("403")) {
    if ((window as any).aistudio?.openSelectKey) {
      (window as any).aistudio.openSelectKey();
    }
    throw new Error("กุญแจ AI มีปัญหาจ้ะยาย กำลังเปิดหน้าเลือกกุญแจให้ใหม่นะ");
  }
  
  throw e;
};

export const processReceiptImage = async (base64Image: string) => {
  const ai = getAi();
  if (!ai) throw new Error("ยายจ๋า ต้องกดเชื่อมต่อระบบ AI ในหน้าตั้งค่าก่อนนะจ๊ะ");

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
    
    const text = response.text || "{}";
    const cleanedText = cleanJsonResponse(text);
    return JSON.parse(cleanedText);
  } catch (e) {
    return handleAiError(e);
  }
};

export const recognizeProduct = async (base64Image: string) => {
  const ai = getAi();
  if (!ai) throw new Error("ยายจ๋า ต้องกดเชื่อมต่อระบบ AI");

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
    
    return JSON.parse(cleanJsonResponse(response.text || "{}"));
  } catch (e) {
    return handleAiError(e);
  }
};

export const generateMascot = async () => {
  const ai = getAi();
  if (!ai) throw new Error("ยายจ๋า ต้องกดเชื่อมต่อระบบ AI");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: "A friendly Thai grandmother mascot, Pixar style, 3D" }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });

    // ด่านตรวจความปลอดภัย: ตรวจสอบว่ามีข้อมูลส่งกลับมาจริงๆ หรือไม่
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0 || !candidates[0].content?.parts) {
      throw new Error("ยายจ๋า AI ไม่ยอมวาดรูปให้จ้ะ ลองใหม่อีกทีนะ");
    }

    for (const part of candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("สร้างรูปไม่สำเร็จจ้ะ");
  } catch (e) {
    return handleAiError(e);
  }
};

export const speakText = async (text: string, persona: AiPersona = 'GRANDMA') => {
  if (!text.trim()) return;
  const ai = getAi();
  if (!ai) return;

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
      contents: [{ parts: [{ text: `Speak in Thai: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    });

    // ด่านตรวจความปลอดภัยสำหรับเสียง
    const candidates = response.candidates;
    const base64Audio = candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (base64Audio) {
      const bytes = decodeBase64(base64Audio);
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
      }
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start();
    }
  } catch (e) {
    console.error("TTS Error:", e);
  }
};
