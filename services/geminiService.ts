import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Category, AiPersona } from "../types";

export const isApiKeyReady = () => {
  return !!process.env.API_KEY && process.env.API_KEY.length > 10;
};

// Use fallback to avoid TS2322: Type 'string | undefined' is not assignable to type 'string'
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

let audioCtx: AudioContext | null = null;

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Robust PCM 16-bit Little Endian decoder using DataView for cross-device compatibility.
 */
async function decodePcmAudio(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  // 16-bit = 2 bytes per sample. Ensure we don't read past the end if data is misaligned.
  const validByteLength = data.byteLength - (data.byteLength % (2 * numChannels));
  const frameCount = validByteLength / (2 * numChannels);
  
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  const view = new DataView(data.buffer, data.byteOffset, validByteLength);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      // Offset: (sample index * channels + current channel) * bytes per sample (2)
      const byteOffset = (i * numChannels + channel) * 2;
      // Gemini TTS PCM is Little Endian (true)
      const sample = view.getInt16(byteOffset, true);
      // Normalize Int16 (-32768 to 32767) to Float32 (-1.0 to 1.0)
      channelData[i] = sample / 32768.0;
    }
  }
  return buffer;
}

export const initAudio = async () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  }
  if (audioCtx.state === 'suspended') {
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
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "ตอบคำว่า OK",
    });
    return { ok: !!response.text, msg: "เชื่อมต่อ AI สำเร็จแล้วจ้ะ!" };
  } catch (e: any) {
    let errorMsg = "กุญแจอาจจะผิดหรือหมดอายุจ้ะ";
    if (e.message?.includes("429")) errorMsg = "โควต้าการใช้งานวันนี้หมดแล้วจ้ะ (จำกัด 10 ครั้ง/วัน)";
    return { ok: false, msg: errorMsg };
  }
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
      contents: {
        parts: [
          {
            text: 'A cute friendly Thai shop owner mascot character, 3D render style, warm colors, professional but approachable.',
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString: string = part.inlineData.data;
          return `data:image/png;base64,${base64EncodeString}`;
        }
      }
    }
    throw new Error("No image data found in response");
  } catch (e) {
    console.error("ยายจ๋า วาดรูปไม่สำเร็จจ้ะ:", e);
    throw new Error("ยายจ๋า วาดรูปไม่สำเร็จจ้ะ");
  }
};

export const speakText = async (text: string, persona: AiPersona = 'GRANDMA') => {
  if (!text.trim()) return { ok: true };
  const ctx = await initAudio();
  try {
    const voiceMap: Record<AiPersona, string> = { 
      'GRANDMA': 'Kore', 
      'GIRLFRIEND': 'Puck', 
      'BOYFRIEND': 'Charon', 
      'PROFESSIONAL': 'Zephyr' 
    };
    const voiceName = voiceMap[persona] || 'Kore';
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
      },
    });
    
    if (response.candidates?.[0]?.content?.parts) {
      const part = response.candidates[0].content.parts.find(p => p.inlineData?.data);
      if (part?.inlineData?.data) {
        const bytes = decodeBase64(part.inlineData.data);
        const audioBuffer = await decodePcmAudio(bytes, ctx, 24000, 1);
        
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        
        if (ctx.state === 'suspended') await ctx.resume();
        source.start(0);
        return { ok: true };
      }
    }
  } catch (e: any) {
    if (e.message?.includes("429")) {
      return { ok: false, error: "QUOTA_EXCEEDED" };
    }
    console.error("ยายจ๋า เสียงมีปัญหา:", e);
  }
  return { ok: false, error: "UNKNOWN" };
};