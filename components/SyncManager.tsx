
import React, { useState, useRef } from 'react';
import { Camera, User, Wand2, Heart, Star, Briefcase, Volume2, X, ShieldCheck, Loader2, CheckCircle, AlertCircle, Headphones, KeyRound, BellRing, Key } from 'lucide-react';
import { SyncConfig, AiPersona } from '../types';
import { speakText, isApiKeyReady, testAiConnection, initAudio, playTestBeep } from '../services/geminiService';

interface SyncManagerProps {
  config: SyncConfig;
  ownerPhoto: string | null;
  onSetPhoto: (photo: string) => void;
  onSave: (config: SyncConfig) => void;
  onBackup: () => void;
  onRestore: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCreateMascot: () => void;
  onOpenKeySelector?: () => void;
}

const SyncManager: React.FC<SyncManagerProps> = ({ config, ownerPhoto, onSetPhoto, onSave, onCreateMascot, onOpenKeySelector }) => {
  const [aiPersona, setAiPersona] = useState<AiPersona>(config.aiPersona || 'GRANDMA');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState<'IDLE' | 'LOADING' | 'OK' | 'ERROR'>('IDLE');
  const [apiMsg, setApiMsg] = useState('');
  const [testSoundStatus, setTestSoundStatus] = useState<'IDLE' | 'LOADING' | 'DONE'>('IDLE');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const checkApi = async () => {
    setApiStatus('LOADING');
    const result = await testAiConnection();
    setApiStatus(result.ok ? 'OK' : 'ERROR');
    setApiMsg(result.msg);
  };

  const handleTestBeep = async () => {
    try {
      await initAudio();
      await playTestBeep();
      setApiMsg("ถ้าได้ยินเสียงติ๊ด แสดงว่าลำโพงแอปเปิดแล้วจ้ะ!");
      setApiStatus('OK');
    } catch (e) {
      setApiMsg("ลำโพงยายติดปัญหาจ้ะ ลองกดปุ่ม 'ทดสอบเสียงพูด' ดูนะ");
      setApiStatus('ERROR');
    }
  };

  const handleUnlockAudio = async () => {
    setTestSoundStatus('LOADING');
    try {
      const ctx = await initAudio();
      await ctx.resume();
      const result = await speakText("ลำโพงยายเปิดแล้วนะจ๊ะ ได้ยินฉันไหม?", aiPersona);
      if (result.ok) {
        setTestSoundStatus('DONE');
        setApiMsg("สำเร็จแล้วจ้ะ! เสียงออกปกติแล้ว");
        setApiStatus('OK');
      } else {
        setTestSoundStatus('IDLE');
        if (result.error === 'QUOTA_EXCEEDED') {
          setApiMsg("วันนี้ยายใช้โควต้าเสียงครบ 10 ครั้งแล้วจ้ะ ต้องรอวันพรุ่งนี้นะ");
          setApiStatus('ERROR');
        } else {
          setApiMsg("ระบบเสียง AI มีปัญหาชั่วคราว ลองกดใหม่นะจ๊ะ");
        }
      }
    } catch (e) {
      setTestSoundStatus('IDLE');
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { setIsCameraOpen(false); }
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
    onSave({ ...config, aiPersona });
    speakText("บันทึกเรียบร้อยแล้วจ้ะ", aiPersona);
  };

  const personas: { id: AiPersona, label: string, icon: any, color: string, desc: string }[] = [
    { id: 'GRANDMA', label: 'คุณยายใจดี', icon: User, color: 'bg-blue-500', desc: 'อบอุ่น เหมือนยายคุยกับหลาน' },
    { id: 'GIRLFRIEND', label: 'แฟนสาวขี้อ้อน', icon: Heart, color: 'bg-rose-500', desc: 'เรียกที่รักจ๋าทุกคำ หวานมาก' },
    { id: 'BOYFRIEND', label: 'แฟนหนุ่มแสนดี', icon: Star, color: 'bg-amber-500', desc: 'สุภาพ อบอุ่น แฟนหนุ่มในฝัน' },
    { id: 'PROFESSIONAL', label: 'ผู้ช่วยมือโปร', icon: Briefcase, color: 'bg-indigo-600', desc: 'ฉะฉาน เป็นการเป็นงาน' }
  ];

  return (
    <div className="space-y-6 pb-24">
      <div className="bg-white p-8 rounded-[50px] shadow-2xl border border-rose-50 space-y-8 relative overflow-hidden">
        <div className="text-center space-y-4">
          <div className="relative inline-block group">
            <div className="w-32 h-32 bg-rose-50 rounded-[40px] flex items-center justify-center mx-auto mb-4 overflow-hidden border-4 border-white shadow-xl">
              {ownerPhoto ? <img src={ownerPhoto} className="w-full h-full object-cover" /> : <User size={56} className="text-rose-200" />}
            </div>
            <div className="absolute -bottom-2 -right-2 flex flex-col gap-2">
              <button onClick={startCamera} className="bg-rose-600 text-white p-3 rounded-full shadow-lg border-2 border-white active:scale-90"><Camera size={18} /></button>
              <button onClick={onCreateMascot} className="bg-blue-600 text-white p-3 rounded-full shadow-lg border-2 border-white active:scale-90"><Wand2 size={18} /></button>
            </div>
          </div>
          <h2 className="text-2xl font-black text-gray-800">โปรไฟล์ของคุณยาย</h2>
        </div>

        <div className="bg-gray-50 p-6 rounded-[35px] border-2 border-gray-100 space-y-4">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">จัดการระบบ AI</p>
          <div className="flex flex-col gap-2">
            <button 
              onClick={onOpenKeySelector}
              className="w-full p-4 rounded-2xl border-2 border-blue-600 bg-blue-600 text-white flex items-center justify-center gap-2 font-black text-sm active:scale-95 transition-all shadow-lg"
            >
              <Key size={20}/> เลือกกุญแจ (API Key) ส่วนตัว
            </button>
            <div className="flex gap-2">
              <button onClick={checkApi} className="flex-1 p-4 rounded-2xl border-2 bg-white flex flex-col items-center gap-1 active:bg-gray-100 transition-colors">
                {apiStatus === 'LOADING' ? <Loader2 className="animate-spin text-blue-500" size={20}/> :
                 apiStatus === 'OK' ? <CheckCircle className="text-green-500" size={20}/> :
                 apiStatus === 'ERROR' ? <AlertCircle className="text-red-500" size={20}/> : <KeyRound className="text-gray-400" size={20}/>}
                <span className="text-[10px] font-black uppercase">เช็คระบบ AI</span>
              </button>
              <button onClick={handleUnlockAudio} className="flex-1 p-4 rounded-2xl border-2 bg-white flex flex-col items-center gap-1 active:bg-gray-100 transition-colors">
                {testSoundStatus === 'LOADING' ? <Loader2 className="animate-spin text-blue-500" size={20}/> : <Volume2 className={testSoundStatus === 'DONE' ? 'text-blue-500' : 'text-gray-400'} size={20}/>}
                <span className="text-[10px] font-black uppercase">ทดสอบเสียงพูด</span>
              </button>
            </div>
            <button onClick={handleTestBeep} className="w-full p-4 rounded-2xl border-2 border-blue-100 bg-blue-50 text-blue-600 flex items-center justify-center gap-2 font-black text-sm active:scale-95 transition-all shadow-sm">
              <BellRing size={20}/> ทดสอบลำโพง (กดปุ่มนี้ก่อน)
            </button>
          </div>
          {apiMsg && (
            <div className={`p-4 rounded-2xl text-center text-[11px] font-bold animate-in fade-in slide-in-from-top-2 duration-300 ${apiStatus === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700 border-2 border-red-200'}`}>
              {apiMsg}
            </div>
          )}
          <p className="text-[9px] text-gray-400 font-bold text-center leading-tight">
            ยายจ๋า หากโควต้าสแกนฟรีหมด ยายสามารถนำกุญแจส่วนตัวมาใส่เพื่อใช้งานต่อได้นะจ๊ะ (ดูวิธีสมัครที่ ai.google.dev/gemini-api/docs/billing)
          </p>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-rose-300 uppercase tracking-[0.3em] ml-6">เลือกเสียงคู่หูช่วยขาย</label>
          <div className="grid grid-cols-1 gap-3">
            {personas.map((p) => (
              <button key={p.id} onClick={() => { setAiPersona(p.id); speakText("เลือกเสียงฉันนะจ๊ะ", p.id); }}
                className={`p-4 rounded-[30px] border-2 flex items-center gap-4 transition-all ${aiPersona === p.id ? 'bg-rose-50 border-rose-500 shadow-md scale-[1.02]' : 'bg-gray-50 border-transparent opacity-60 hover:opacity-100'}`}>
                <div className={`w-12 h-12 ${p.color} rounded-2xl flex items-center justify-center text-white`}><p.icon size={24} /></div>
                <div className="text-left">
                  <p className="font-black text-gray-800 text-sm">{p.label}</p>
                  <p className="text-[9px] text-gray-400 font-bold">{p.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleFinalSave} className="w-full bg-rose-600 text-white py-8 rounded-[40px] font-black text-2xl shadow-xl active:scale-95 transition-all">บันทึกการตั้งค่า</button>
      </div>

      {isCameraOpen && (
        <div className="fixed inset-0 z-[250] bg-black flex flex-col">
          <div className="p-8 flex justify-between items-center text-white bg-black/40 absolute top-0 left-0 right-0 z-20"><button onClick={() => setIsCameraOpen(false)} className="p-4 bg-white/10 rounded-full"><X size={32}/></button></div>
          <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover scale-x-[-1]" />
          <div className="p-12 flex justify-center bg-black"><button onClick={capturePhoto} className="w-28 h-28 bg-white rounded-full border-[12px] border-gray-100 flex items-center justify-center"><Camera size={56} className="text-rose-600" /></button></div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
};

export default SyncManager;
