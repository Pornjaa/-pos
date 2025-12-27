
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Category, AiPersona } from "../types";

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
let audioCtx: AudioContext | null = null;

const cleanJsonResponse = (text: string) => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

export const processReceiptImage = async (base64Image: string) => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: "คุณคือผู้เชี่ยวชาญการอ่านบิลสินค้าในไทย สกัดข้อมูลจากรูปภาพบิลส่งของอย่างละเอียดและแม่นยำที่สุด",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          category: { 
            type: Type.STRING, 
            description: "หมวดหมู่สินค้าหลักในบิลนี้",
            enum: ["ICE", "BEVERAGE", "OTHERS"]
          },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "ชื่อสินค้า" },
                quantity: { type: Type.NUMBER, description: "จำนวน" },
                unitPrice: { type: Type.NUMBER, description: "ราคาต่อหน่วย" },
                totalPrice: { type: Type.NUMBER, description: "ราคารวมของรายการนี้" }
              },
              required: ["name", "quantity", "unitPrice", "totalPrice"]
            }
          },
          iceMetrics: {
            type: Type.OBJECT,
            properties: {
              delivered: { type: Type.NUMBER, description: "จำนวนกระสอบน้ำแข็งที่มาส่ง" },
              returned: { type: Type.NUMBER, description: "จำนวนกระสอบน้ำแข็งที่เก็บคืน" }
            }
          },
          notes: { type: Type.STRING, description: "หมายเหตุเพิ่มเติม" }
        },
        required: ["category", "items"]
      }
    },
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: "อ่านบิลนี้และสรุปข้อมูลสินค้าทั้งหมด รวมถึงจำนวนการส่งและคืนกระสอบน้ำแข็งถ้ามี" }
      ],
    },
  });
  
  try {
    const cleanedText = cleanJsonResponse(response.text || "{}");
    return JSON.parse(cleanedText);
  } catch (e) {
    console.error("JSON Parse Error:", e, response.text);
    throw new Error("อ่านบิลไม่ออกเลยจ้ะ");
  }
};

export const recognizeProduct = async (base64Image: string) => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: "คุณคือเครื่องสแกนสินค้าอัจฉริยะ ระบุชื่อแบรนด์และขนาดบรรจุจากรูปลักษณ์ภายนอก",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "ชื่อสินค้าและขนาดบรรจุ" }
        },
        required: ["name"]
      }
    },
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: "นี่คือสินค้าอะไร? ตอบชื่อยี่ห้อและขนาดเป็นภาษาไทยสั้นๆ" }
      ],
    },
  });
  
  try {
    const cleanedText = cleanJsonResponse(response.text || "{}");
    return JSON.parse(cleanedText);
  } catch (e) {
    throw new Error("ไม่รู้จักสินค้านี้จ้ะ");
  }
};

export const generateMascot = async () => {
  const ai = getAi();
  const prompt = "A friendly, modern Thai grandmother mascot, cute 3D Pixar character style, wearing a colorful blue apron with a small heart, holding a refreshing glass of iced tea, smiling warmly with glasses, bright white background, high quality, vibrant colors";
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  const candidates = response?.candidates;
  if (!candidates || candidates.length === 0 || !candidates[0]?.content?.parts) {
    throw new Error("สร้างรูปไม่สำเร็จจ้ะ");
  }

  for (const part of candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("สร้างรูปไม่สำเร็จจ้ะ");
};

export const speakText = async (text: string, persona: AiPersona = 'GRANDMA') => {
  if (!text.trim()) return;
  try {
    const ai = getAi();
    let personaInstruction = "";
    let voiceName = "Kore"; 

    switch(persona) {
      case 'GRANDMA':
        personaInstruction = "Speak as a kind Thai grandmother. Use 'นะลูก', 'จ้ะ'. Tone: warm and gentle.";
        voiceName = "Kore";
        break;
      case 'GIRLFRIEND':
        personaInstruction = "Speak as an affectionate Thai girlfriend. Use 'ที่รักจ๋า', 'นะคะ'. Tone: sweet and playful.";
        voiceName = "Puck";
        break;
      case 'BOYFRIEND':
        personaInstruction = "Speak as a caring Thai boyfriend. Use 'ที่รักครับ', 'นะครับ'. Tone: gentle and protective.";
        voiceName = "Charon";
        break;
      case 'PROFESSIONAL':
        personaInstruction = "Speak as a professional Thai assistant. Tone: clear and formal.";
        voiceName = "Zephyr";
        break;
    }
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Instruction: ${personaInstruction}. Speech Content: ${text}` }] }],
      config: {
        systemInstruction: "You are a professional Text-to-Speech engine. Your ONLY output is audio content. Do not provide any text response.",
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } },
      },
    });

    const candidates = response?.candidates;
    const base64Audio = candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      
      const dataInt16 = new Int16Array(bytes.buffer);
      if (audioCtx) {
        const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
        const channelData = buffer.getChannelData(0);
        for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
        
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start();
      }
    }
  } catch (e) { 
    console.error("TTS Error:", e);
  }
};
