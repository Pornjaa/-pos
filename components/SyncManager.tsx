
import React, { useState, useRef, useEffect } from 'react';
import { Cloud, ShieldCheck, Smartphone, Lock, Save, Info, RefreshCw, X, Camera, User, Loader2, Download, Upload, Sparkles, Wand2, Heart, Star, Briefcase, Key, ExternalLink, Volume2, Settings2 } from 'lucide-react';
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
  const [shopId, setShopId] = useState(config.shopId);
  const [role, setRole] = useState(config.role);
  const [aiPersona, setAiPersona] = useState<AiPersona>(config.aiPersona || 'GRANDMA');
  const [pin, setPin] = useState('');
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [tempRole, setTempRole] = useState<'OWNER' | 'STAFF' | 'SET_PIN' | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkKey = async () => {
      if ((window as any).aistudio?.hasSelectedApiKey) {
        const selected = await (window as any).aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      }
    };
    checkKey();
  }, []);

  const handleConnectKey = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

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

  const handleRoleChange = (newRole: 'OWNER' | 'STAFF') => {
    if (newRole === 'OWNER' && config.ownerPin) { setTempRole('OWNER'); setShowPinEntry(true); }
    else setRole(newRole);
  };

  const handleFinalSave = () => {
    if (role === 'OWNER' && !config.ownerPin && !pin) { setTempRole('SET_PIN'); setShowPinEntry(true); return; }
    onSave({ ...config, shopId, role, aiPersona, isEnabled: !!shopId, ownerPin: (tempRole === 'SET_PIN' ? pin : config.ownerPin) });
    setShowPinEntry(false); setPin('');
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
            <h2 className="text-2xl font-black text-gray-800">ข้อมูลร้าน</h2>
          </div>
        </div>

        {/* AI Key & Billing Helper */}
        <div className="bg-gray-50 p-6 rounded-[35px] border-2 border-gray-100 space-y-4">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className={`p-2 rounded-xl ${hasApiKey ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    <Key size={20} />
                 </div>
                 <div>
                    <p className="text-xs font-black text-gray-700">กุญแจ AI</p>
                    <p className={`text-[10px] font-bold ${hasApiKey ? 'text-green-500' : 'text-red-500'}`}>
                       {hasApiKey ? 'เชื่อมต่อแล้วจ้ะ' : 'ยังไม่ได้เชื่อมต่อ'}
                    </p>
                 </div>
              </div>
              <button onClick={handleConnectKey} className="bg-blue-600 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase shadow-lg active:scale-90 transition-all">เชื่อมต่อ AI</button>
           </div>

           {/* ปุ่มช่วยเปิดสวิตช์ AI สำหรับคุณยาย */}
           <div className="bg-white p-4 rounded-2xl border border-blue-100 space-y-3">
             <div className="flex items-start gap-2">
               <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
               <p className="text-[10px] text-gray-500 font-bold leading-tight">
                 ยายจ๋า ถ้ากด "เชื่อมต่อ AI" แล้วยังขึ้น Error แดงๆ แปลว่ายายต้องไป **"เปิดสวิตช์ AI"** ให้โปรเจกต์ของยายก่อนนะจ๊ะ (ใช้ปุ่มข้างล่างนี้เลย):
               </p>
             </div>
             <a 
               href="https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com" 
               target="_blank" 
               rel="noopener noreferrer"
               className="w-full bg-blue-50 text-blue-700 py-3 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors"
             >
               <Settings2 size={14} /> กดที่นี่เพื่อ "เปิดสวิตช์ AI"
             </a>
             <div className="flex justify-center">
               <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-[9px] text-blue-400 font-bold underline flex items-center gap-1"><ExternalLink size={10}/> วิธีผูกบัตรเครดิต</a>
             </div>
           </div>

           {/* ปุ่มทดสอบเสียง */}
           <button 
             onClick={handleTestSound}
             className="w-full bg-rose-50 text-rose-600 py-4 rounded-2xl text-xs font-black flex items-center justify-center gap-3 border border-rose-100 active:scale-95 transition-all"
           >
             <Volume2 size={18} /> ทดสอบเสียง (กดดูนะจ๊ะ)
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
