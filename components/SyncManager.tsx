
import React, { useState, useRef, useEffect } from 'react';
import { Cloud, Save, Camera, User, Wand2, Heart, Star, Briefcase, Volume2, X } from 'lucide-react';
import { SyncConfig, AiPersona } from '../types';
import { speakText } from '../services/geminiService';

interface SyncManagerProps {
  config: SyncConfig;
  ownerPhoto: string | null;
  onSetPhoto: (photo: string) => void;
  onSave: (config: SyncConfig) => void;
  onBackup: () => void;
  onRestore: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCreateMascot: () => void;
}

const SyncManager: React.FC<SyncManagerProps> = ({ config, ownerPhoto, onSetPhoto, onSave, onBackup, onRestore, onCreateMascot }) => {
  const [aiPersona, setAiPersona] = useState<AiPersona>(config.aiPersona || 'GRANDMA');
  const [pin, setPin] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleTestSound = () => {
    speakText("เสียงดังฟังชัดไหมจ๊ะยาย ถ้าได้ยินแล้วแสดงว่าระบบเสียงพร้อมทำงานแล้วนะ", aiPersona);
  };

  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { alert("เปิดกล้องไม่ได้จ้ะ"); setIsCameraOpen(false); }
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current!;
    canvas.width = videoRef.current!.videoWidth; canvas.height = videoRef.current!.videoHeight;
    canvas.getContext('2d')!.drawImage(videoRef.current!, 0, 0);
    onSetPhoto(canvas.toDataURL('image/jpeg', 0.8));
    if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    setIsCameraOpen(false);
  };

  const handleFinalSave = () => {
    onSave({ ...config, aiPersona, ownerPin: pin || config.ownerPin });
    speakText("บันทึกเรียบร้อยแล้วจ้ะ", aiPersona);
  };

  const personas: { id: AiPersona, label: string, icon: any, color: string, desc: string }[] = [
    { id: 'GRANDMA', label: 'คุณยายใจดี', icon: User, color: 'bg-blue-500', desc: 'อบอุ่น เหมือนยายคุยกับหลาน' },
    { id: 'GIRLFRIEND', label: 'แฟนสาวขี้อ้อน', icon: Heart, color: 'bg-rose-500', desc: 'เรียกที่รักจ๋าทุกคำ หวานมาก' },
    { id: 'BOYFRIEND', label: 'แฟนหนุ่มแสนดี', icon: Star, color: 'bg-amber-500', desc: 'สุภาพ อบอุ่น แฟนหนุ่มในฝัน' },
    { id: 'PROFESSIONAL', label: 'ผู้ช่วยมือโปร', icon: Briefcase, color: 'bg-indigo-600', desc: 'ฉะฉาน เป็นการเป็นงาน' }
  ];

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-right duration-500">
      <div className="bg-white p-8 rounded-[50px] shadow-2xl border border-rose-50 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-[100px] z-0 opacity-50"></div>
        
        <div className="text-center space-y-4 relative z-10">
          <div className="relative inline-block group">
            <div className="w-32 h-32 bg-rose-50 rounded-[40px] flex items-center justify-center mx-auto mb-4 overflow-hidden border-4 border-white shadow-xl transition-transform group-hover:scale-105 duration-300">
              {ownerPhoto ? <img src={ownerPhoto} className="w-full h-full object-cover" /> : <User size={56} className="text-rose-200" />}
            </div>
            <div className="absolute -bottom-2 -right-2 flex flex-col gap-2">
              <button onClick={startCamera} className="bg-rose-600 text-white p-3 rounded-full shadow-lg border-2 border-white hover:bg-rose-700 active:scale-90 transition-all"><Camera size={18} /></button>
              <button onClick={onCreateMascot} className="bg-blue-600 text-white p-3 rounded-full shadow-lg border-2 border-white hover:bg-blue-700 active:scale-90 transition-all"><Wand2 size={18} /></button>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-800">โปรไฟล์ของคุณยาย</h2>
          </div>
        </div>

        {/* ปุ่มทดสอบเสียง */}
        <div className="bg-gray-50 p-4 rounded-[35px] border-2 border-gray-100">
           <button 
             onClick={handleTestSound}
             className="w-full bg-rose-50 text-rose-600 py-6 rounded-2xl text-sm font-black flex items-center justify-center gap-3 border border-rose-100 active:scale-95 transition-all shadow-sm"
           >
             <Volume2 size={24} /> ทดสอบเสียงยายดูจ้ะ
           </button>
        </div>

        {/* Persona Selection */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-rose-300 uppercase tracking-[0.3em] ml-6">เลือกเสียงคู่หูช่วยขาย</label>
          <div className="grid grid-cols-1 gap-3">
            {personas.map((p) => (
              <button 
                key={p.id}
                onClick={() => { setAiPersona(p.id); speakText("เลือกเสียงฉันนะจ๊ะ", p.id); }}
                className={`p-4 rounded-[30px] border-2 flex items-center gap-4 transition-all ${aiPersona === p.id ? 'bg-rose-50 border-rose-500 shadow-md scale-[1.02]' : 'bg-gray-50 border-transparent opacity-60'}`}
              >
                <div className={`w-12 h-12 ${p.color} rounded-2xl flex items-center justify-center text-white shadow-sm`}><p.icon size={24} /></div>
                <div className="text-left">
                  <p className="font-black text-gray-800 text-sm">{p.label}</p>
                  <p className="text-[10px] font-bold text-gray-400">{p.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={handleFinalSave} 
          className="w-full bg-rose-600 text-white py-8 rounded-[40px] font-black text-2xl shadow-xl active:scale-95 transition-all hover:bg-rose-700"
        >
          <Save size={28} /> บันทึกการตั้งค่า
        </button>
      </div>

      {isCameraOpen && (
        <div className="fixed inset-0 z-[250] bg-black flex flex-col">
          {/* Fix: Icon 'X' now imported from lucide-react */}
          <div className="p-8 flex justify-between items-center text-white bg-black/40 absolute top-0 left-0 right-0 z-20"><button onClick={() => setIsCameraOpen(false)} className="p-4 bg-white/10 rounded-full backdrop-blur-md"><X size={32}/></button><span className="font-black text-xl uppercase tracking-widest">ถ่ายรูปคุณ</span><div className="w-14"></div></div>
          <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover scale-x-[-1]" />
          <div className="p-12 flex justify-center bg-black"><button onClick={capturePhoto} className="w-28 h-28 bg-white rounded-full flex items-center justify-center border-[12px] border-gray-100 active:scale-90 transition-all"><Camera size={56} className="text-rose-600" /></button></div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
};

export default SyncManager;
