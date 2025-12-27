
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Category, AiPersona } from "../types";

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });
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

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("สร้างรูปไม่สำเร็จจ้ะ");
};

export const speakText = async (text: string, persona: AiPersona = 'GRANDMA') => {
  try {
    const ai = getAi();
    let personaPrompt = "";
    let voiceName = "Kore"; // Default female

    switch(persona) {
      case 'GRANDMA':
        personaPrompt = `พูดด้วยน้ำเสียงหญิงชราไทยที่ใจดีและอบอุ่น เหมือนยายกำลังคุยกับหลานที่รัก ใช้คำสร้อยเช่น 'นะลูก', 'จ้ะ', 'ยาย...' และน้ำเสียงอ่อนโยน: ${text}`;
        voiceName = "Kore";
        break;
      case 'GIRLFRIEND':
        personaPrompt = `สวมบทบาทเป็นแฟนสาวที่ขี้อ้อนและรักแฟนมาก พูดจาน่ารัก หวานหยดย้อย ต้องเรียกผู้ใช้ว่า 'ที่รักจ๋า' หรือ 'เค้า' ทุกประโยค และลงท้ายด้วย 'นะคะ' หรือ 'น้าาา': ${text}`;
        voiceName = "Puck";
        break;
      case 'BOYFRIEND':
        personaPrompt = `สวมบทบาทเป็นแฟนหนุ่มแสนดี อบอุ่น สุภาพบุรุษ พูดจานุ่มนวล ต้องเรียกผู้ใช้ว่า 'ที่รักครับ' หรือ 'คุณ' ทุกประโยค และใช้น้ำเสียงปกป้องดูแล: ${text}`;
        voiceName = "Charon";
        break;
      case 'PROFESSIONAL':
        personaPrompt = `สวมบทบาทเป็นผู้ช่วยส่วนตัวมืออาชีพ พูดจาฉะฉาน ชัดเจน เป็นทางการแต่ยังคงความสุภาพ: ${text}`;
        voiceName = "Zephyr";
        break;
    }
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: personaPrompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const binaryString = atob(base64Audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start();
    }
  } catch (e) { console.error(e); }
};
