
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Save, X, Loader2, ArrowLeft, CheckSquare, Square, Image as ImageIcon, Plus, Trash2, Package, Tag, Wallet, Zap } from 'lucide-react';
import { recognizeProduct, speakText } from '../services/geminiService';
import { PosProduct, AiPersona } from '../types';

interface ProductManagerProps {
  products: PosProduct[];
  onSave: (product: PosProduct) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
  prefillData?: { name: string; barcode: string } | null;
  persona?: AiPersona;
}

// @google/genai fix: Added type assertion to persona default value to ensure it's treated as AiPersona union type
const ProductManager: React.FC<ProductManagerProps> = ({ products, onSave, onDelete, onBack, prefillData, persona = 'GRANDMA' as AiPersona }) => {
  const [view, setView] = useState<'list' | 'add'>('list');
  const [isCapturingProduct, setIsCapturingProduct] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isQuickSelect, setIsQuickSelect] = useState(false);
  
  const [productName, setProductName] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (prefillData) {
      setProductName(prefillData.name);
      setView('add');
      speakText("มีของมาใหม่เหรอ ช่วยใส่ราคาหน่อยสิ", persona);
    }
  }, [prefillData]);

  useEffect(() => {
    if (isCapturingProduct) {
      (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) { alert("เปิดกล้องไม่ได้เลย"); setIsCapturingProduct(false); }
      })();
    } else {
      if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  }, [isCapturingProduct]);

  const handleSave = () => {
    if (!productName || !sellingPrice) { speakText("ใส่ชื่อกับราคาให้ก่อนสิลูก", persona); return; }
    onSave({
      id: crypto.randomUUID(),
      name: productName,
      barcode: '',
      costPrice: parseFloat(costPrice) || 0,
      price: parseFloat(sellingPrice) || 0,
      isQuickSelect: isQuickSelect,
      imageUrl: productImageUrl || undefined
    });
    setProductName(''); setCostPrice(''); setSellingPrice(''); setProductImageUrl(null); setIsQuickSelect(false);
    speakText("บันทึกของใหม่เรียบร้อยแล้ว", persona);
    setView('list');
  };

  const handleCaptureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsProcessing(true);
    
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    
    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    setProductImageUrl(base64);

    try {
      const res = await recognizeProduct(base64.split(',')[1]);
      setProductName(res.name);
      speakText(`ของชิ้นนี้ชื่อ ${res.name} ใช่ไหม?`, persona);
    } catch(e) {
      speakText("มองไม่เห็นชื่อเลย พิมพ์ให้หน่อยนะ", persona);
    } finally {
      setIsProcessing(false);
      setIsCapturingProduct(false);
    }
  };

  if (view === 'list') {
    return (
      <div className="space-y-6 pb-24">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-2xl font-black text-gray-800 tracking-tight">สมุดจดของ ({products.length})</h2>
          <button onClick={() => setView('add')} className="bg-blue-600 text-white p-4 rounded-2xl flex items-center gap-2 font-black shadow-lg active:scale-95 transition-all"><Plus size={24}/> เพิ่มของใหม่</button>
        </div>

        {products.length === 0 ? (
          <div className="bg-white p-16 rounded-[40px] border-2 border-dashed border-gray-200 text-center text-gray-400">
             <Package className="mx-auto w-20 h-20 mb-6 opacity-10" />
             <p className="font-black text-xl">ยังไม่มีของในสมุดเลย</p>
             <p className="text-sm">มาช่วยกันเพิ่มของกันหน่อยนะ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {products.map(p => (
              <div key={p.id} className="bg-white p-5 rounded-[32px] border border-gray-100 flex items-center gap-5 shadow-sm relative overflow-hidden group">
                {p.isQuickSelect && (
                  <div className="absolute top-0 right-10 bg-orange-500 text-white text-[10px] font-black px-3 py-1 rounded-b-xl shadow-sm flex items-center gap-1">
                    <Zap size={10} fill="white" /> ขายบ่อย
                  </div>
                )}
                <div className="w-20 h-20 bg-gray-50 rounded-[24px] shrink-0 overflow-hidden border border-gray-100">
                  {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-gray-300">ไม่มีรูป</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-800 text-lg truncate leading-tight">{p.name}</p>
                  <div className="flex gap-4 items-center mt-1">
                    <p className="text-orange-500 font-black text-sm">ทุน: ฿{p.costPrice}</p>
                    <p className="text-blue-600 font-black text-lg">ขาย: ฿{p.price}</p>
                  </div>
                </div>
                <button onClick={() => { if(confirm('จะลบจริงเหรอ?')) onDelete(p.id); }} className="p-4 text-red-200 hover:text-red-500 transition-colors active:scale-90"><Trash2 size={24}/></button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <button onClick={() => setView('list')} className="flex items-center gap-2 text-gray-500 font-black p-2"><ArrowLeft size={20}/> กลับไปดูสมุด</button>
      
      <div className="bg-white p-8 rounded-[50px] shadow-2xl border border-gray-100 space-y-8 animate-in slide-in-from-bottom duration-500">
        <h3 className="text-2xl font-black text-center text-gray-800 uppercase tracking-tight">ช่วยเพิ่มของหน่อย</h3>
        
        <div className="flex justify-center">
          {productImageUrl ? (
            <div className="relative group">
              <img src={productImageUrl} className="w-56 h-56 rounded-[50px] object-cover border-8 border-blue-50 shadow-2xl transition-all group-hover:scale-105" />
              <button onClick={() => setProductImageUrl(null)} className="absolute -top-3 -right-3 bg-red-500 text-white p-3 rounded-full shadow-xl border-4 border-white active:scale-90"><X size={24}/></button>
            </div>
          ) : (
            <button 
              onClick={() => setIsCapturingProduct(true)} 
              className="w-56 h-56 rounded-[50px] bg-gray-50 border-4 border-dashed border-gray-200 flex flex-col items-center justify-center gap-4 text-gray-400 hover:bg-gray-100 hover:border-blue-200 transition-all group"
            >
              <div className="bg-white p-6 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                <ImageIcon size={64} className="text-blue-200" />
              </div>
              <span className="text-xs font-black uppercase tracking-[0.2em]">ถ่ายรูปให้ดูหน่อย</span>
            </button>
          )}
        </div>
        
        <button 
          onClick={() => setIsQuickSelect(!isQuickSelect)} 
          className={`w-full flex items-center justify-between p-8 rounded-[35px] border-4 transition-all ${isQuickSelect ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-lg' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'}`}
        >
          <div className="flex items-center gap-4">
            {isQuickSelect ? <CheckSquare size={36} strokeWidth={3} /> : <Square size={36} strokeWidth={3} />}
            <div className="text-left">
              <p className="text-2xl font-black">ของที่ขายบ่อย</p>
              <p className="text-xs opacity-70 font-bold">จะแยกเอาไว้กดง่ายๆ นะ</p>
            </div>
          </div>
          {isQuickSelect && <Zap size={32} fill="currentColor" className="animate-bounce" />}
        </button>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-6">ชื่อสินค้า</label>
            <input 
              value={productName} 
              onChange={e => setProductName(e.target.value)} 
              className="w-full bg-gray-50 p-8 rounded-[30px] text-2xl font-black border-4 border-transparent focus:border-blue-500 outline-none shadow-inner" 
              placeholder="ของชื่ออะไร..." 
            />
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest ml-6 flex items-center gap-2"><Wallet size={14}/> ซื้อมาเท่าไหร่</label>
              <input 
                type="number" 
                value={costPrice} 
                onChange={e => setCostPrice(e.target.value)} 
                className="w-full bg-orange-50/50 p-8 rounded-[30px] text-4xl font-black text-center outline-none border-4 border-transparent focus:border-orange-500 text-orange-600 shadow-inner" 
                placeholder="0" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-6 flex items-center gap-2"><Tag size={14}/> จะขายกี่บาท</label>
              <input 
                type="number" 
                value={sellingPrice} 
                onChange={e => setSellingPrice(e.target.value)} 
                className="w-full bg-blue-50/50 p-8 rounded-[30px] text-4xl font-black text-center outline-none border-4 border-transparent focus:border-blue-500 text-blue-600 shadow-inner" 
                placeholder="0" 
              />
            </div>
          </div>
        </div>
        
        <button onClick={handleSave} className="w-full bg-blue-600 text-white py-8 rounded-[40px] font-black text-3xl shadow-[0_20px_40px_rgba(37,99,235,0.3)] active:scale-95 transition-all hover:bg-blue-700">
          จดลงสมุดเลย
        </button>
      </div>

      {isCapturingProduct && (
        <div className="fixed inset-0 z-[1200] bg-black flex flex-col">
          <div className="p-8 flex justify-between items-center absolute top-0 left-0 right-0 z-[1230] text-white bg-gradient-to-b from-black/80 to-transparent">
            <button onClick={() => setIsCapturingProduct(false)} className="p-4 bg-white/20 rounded-full backdrop-blur-md"><X size={32}/></button>
            <p className="font-black text-xl">มองของไม่ชัดเลย</p>
            <div className="w-14"></div>
          </div>
          
          <div className="flex-1 relative bg-gray-950 flex items-center justify-center overflow-hidden">
            <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center p-12 pointer-events-none mb-20">
               <div className="w-full aspect-square border-4 border-white/30 border-dashed rounded-[60px] shadow-[0_0_0_1000px_rgba(0,0,0,0.6)]"></div>
            </div>
            <div className="absolute bottom-20 left-0 right-0 flex justify-center z-[1240]">
              {isProcessing ? (
                <div className="bg-white/95 backdrop-blur-xl px-12 py-6 rounded-full flex items-center gap-5 shadow-2xl border-4 border-blue-500">
                  <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
                  <p className="font-black text-blue-600 text-2xl">กำลังเพ่งอยู่นะ...</p>
                </div>
              ) : (
                <button 
                  onClick={handleCaptureAndRecognize} 
                  className="w-32 h-32 bg-white rounded-full flex items-center justify-center border-[14px] border-gray-200 shadow-[0_0_60px_rgba(255,255,255,0.4)] active:scale-90 transition-all"
                >
                  <Camera size={64} className="text-blue-600" />
                </button>
              )}
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
};

export default ProductManager;
