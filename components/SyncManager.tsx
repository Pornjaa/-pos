
import React, { useState, useRef } from 'react';
import { Cloud, ShieldCheck, Smartphone, Lock, Save, Info, RefreshCw, X, Camera, User, Loader2, Download, Upload, Sparkles, Wand2, Heart, Star, Briefcase } from 'lucide-react';
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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      setIsCameraOpen(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) { alert("เปิดกล้องหน้าไม่ได้จ้ะ"); setIsCameraOpen(false); }
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current!;
    canvas.width = videoRef.current!.videoWidth; canvas.height = videoRef.current!.videoHeight;
    canvas.getContext('2d')!.drawImage(videoRef.current!, 0, 0);
    onSetPhoto(canvas.toDataURL('image/jpeg', 0.8));
    if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    setIsCameraOpen(false);
    speakText("รูปสวยมากเลยจ้ะ!", aiPersona);
  };

  const handleRoleChange = (newRole: 'OWNER' | 'STAFF') => {
    if (newRole === 'OWNER' && config.ownerPin) { setTempRole('OWNER'); setShowPinEntry(true); }
    else setRole(newRole);
  };

  const handleFinalSave = () => {
    if (role === 'OWNER' && !config.ownerPin && !pin) { setTempRole('SET_PIN'); setShowPinEntry(true); return; }
    onSave({ ...config, shopId, role, aiPersona, isEnabled: !!shopId, ownerPin: (tempRole === 'SET_PIN' ? pin : config.ownerPin) });
    setShowPinEntry(false); setPin('');
    speakText("บันทึกการตั้งค่าเรียบร้อยแล้วนะ", aiPersona);
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
            <p className="text-xs font-bold text-rose-400 uppercase tracking-widest mt-1">ตั้งค่ามาสคอตและร้านของคุณ</p>
          </div>
        </div>

        {/* Persona Selection */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-rose-300 uppercase tracking-[0.3em] ml-6">เลือกเสียงคู่หูช่วยขาย</label>
          <div className="grid grid-cols-1 gap-3">
            {personas.map((p) => (
              <button 
                key={p.id}
                onClick={() => { setAiPersona(p.id); speakText("สวัสดีจ้ะ เลือกฉันสิ!", p.id); }}
                className={`p-4 rounded-[30px] border-2 flex items-center gap-4 transition-all ${aiPersona === p.id ? 'bg-rose-50 border-rose-500 shadow-md scale-[1.02]' : 'bg-gray-50 border-transparent opacity-60'}`}
              >
                <div className={`w-12 h-12 ${p.color} rounded-2xl flex items-center justify-center text-white shadow-sm`}>
                  <p.icon size={24} />
                </div>
                <div className="text-left">
                  <p className="font-black text-gray-800 text-sm">{p.label}</p>
                  <p className="text-[10px] font-bold text-gray-400">{p.desc}</p>
                </div>
                {aiPersona === p.id && <div className="ml-auto bg-rose-500 w-3 h-3 rounded-full animate-pulse"></div>}
              </button>
            ))}
          </div>
        </div>

        {/* Backup & Restore */}
        <div className="grid grid-cols-2 gap-4">
          <button onClick={onBackup} className="bg-rose-50/50 p-6 rounded-[30px] border-2 border-rose-100 flex flex-col items-center gap-2 active:scale-95 transition-all group">
            <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:rotate-12 transition-transform"><Download size={24} className="text-rose-600" /></div>
            <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider">สำรองข้อมูล</span>
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="bg-rose-50/50 p-6 rounded-[30px] border-2 border-rose-100 flex flex-col items-center gap-2 active:scale-95 transition-all group">
            <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:-rotate-12 transition-transform"><Upload size={24} className="text-orange-500" /></div>
            <span className="text-[10px] font-black uppercase text-rose-400 tracking-wider">กู้คืนข้อมูล</span>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={onRestore} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-rose-300 uppercase tracking-[0.3em] ml-6">ชื่อร้าน</label>
            <input 
              value={shopId} 
              onChange={e => setShopId(e.target.value.toUpperCase())} 
              className="w-full bg-gray-50 p-7 rounded-[30px] text-3xl font-black text-center border-4 border-transparent focus:border-rose-400 outline-none uppercase shadow-inner text-rose-700" 
              placeholder="MY-SHOP" 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => handleRoleChange('OWNER')} 
              className={`p-8 rounded-[40px] border-4 transition-all duration-300 flex flex-col items-center gap-3 shadow-sm ${role === 'OWNER' ? 'bg-rose-600 border-rose-200 text-white scale-105 shadow-rose-200 shadow-xl' : 'bg-gray-50 border-transparent text-gray-300'}`}
            >
              <ShieldCheck size={32} />
              <span className="font-black text-sm uppercase">เจ้าของ</span>
            </button>
            <button 
              onClick={() => handleRoleChange('STAFF')} 
              className={`p-8 rounded-[40px] border-4 transition-all duration-300 flex flex-col items-center gap-3 shadow-sm ${role === 'STAFF' ? 'bg-orange-500 border-orange-200 text-white scale-105 shadow-orange-200 shadow-xl' : 'bg-gray-50 border-transparent text-gray-300'}`}
            >
              <Smartphone size={32} />
              <span className="font-black text-sm uppercase">พนักงาน</span>
            </button>
          </div>
        </div>

        <button 
          onClick={handleFinalSave} 
          className="w-full bg-rose-600 text-white py-8 rounded-[40px] font-black text-2xl shadow-[0_15px_30px_rgba(225,29,72,0.3)] flex items-center justify-center gap-4 active:scale-95 transition-all hover:bg-rose-700"
        >
          <Save size={28} /> บันทึกการตั้งค่า
        </button>
      </div>

      {isCameraOpen && (
        <div className="fixed inset-0 z-[250] bg-black flex flex-col">
          <div className="p-8 flex justify-between items-center text-white bg-black/40 absolute top-0 left-0 right-0 z-20"><button onClick={() => setIsCameraOpen(false)} className="p-4 bg-white/10 rounded-full backdrop-blur-md"><X size={32}/></button><span className="font-black text-xl uppercase tracking-widest">ถ่ายรูปคุณ</span><div className="w-14"></div></div>
          <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover scale-x-[-1]" />
          <div className="p-12 flex justify-center bg-black"><button onClick={capturePhoto} className="w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.3)] border-[12px] border-gray-100 active:scale-90 transition-all"><Camera size={56} className="text-rose-600" /></button></div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {showPinEntry && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-8">
          <div className="bg-white w-full max-sm rounded-[60px] p-10 space-y-8 text-center relative shadow-2xl animate-in zoom-in duration-300">
            <button onClick={() => setShowPinEntry(false)} className="absolute top-8 right-8 p-3 bg-gray-100 rounded-full text-gray-400 hover:text-red-500 transition-colors"><X size={24}/></button>
            <div className="bg-rose-50 w-24 h-24 rounded-[40px] flex items-center justify-center mx-auto shadow-inner"><Lock size={48} className="text-rose-600" /></div>
            <div>
              <h3 className="text-3xl font-black text-gray-800">{tempRole === 'SET_PIN' ? 'ตั้งรหัสลับ 4 หลัก' : 'ใส่รหัสลับเจ้าของ'}</h3>
            </div>
            <input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={e => setPin(e.target.value)} className="w-full text-7xl font-black p-4 text-center tracking-[0.5em] outline-none border-b-8 border-rose-50 focus:border-rose-600 transition-colors text-rose-600" autoFocus />
            <button onClick={tempRole === 'SET_PIN' ? handleFinalSave : () => { if(pin===config.ownerPin){setRole('OWNER'); setShowPinEntry(false); setPin('');} else {speakText("รหัสผิดจ้ะ", aiPersona); setPin('');} }} className="w-full bg-rose-600 text-white py-6 rounded-[35px] font-black text-2xl shadow-xl hover:bg-rose-700 active:scale-95 transition-all">ยืนยันรหัส</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SyncManager;
