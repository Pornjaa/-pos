
import React, { useState, useRef, useEffect } from 'react';
import { Camera, ShoppingCart, Trash2, CheckCircle2, X, Loader2, ArrowLeft, Zap, Image as ImageIcon, Plus, ScanLine } from 'lucide-react';
import { speakText, recognizeProduct } from '../services/geminiService';
import { PosProduct, AiPersona } from '../types';

interface POSSystemProps {
  products: PosProduct[];
  onSaleComplete: (items: any[], total: number) => void;
  onGoBack: () => void;
  onUnregisteredProduct: (name: string, barcode: string) => void;
  persona?: AiPersona;
}

// @google/genai fix: Added type assertion to persona default value to ensure it's treated as AiPersona union type
const POSSystem: React.FC<POSSystemProps> = ({ products, onSaleComplete, onGoBack, onUnregisteredProduct, persona = 'GRANDMA' as AiPersona }) => {
  const [cart, setCart] = useState<{product: PosProduct, qty: number}[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  
  const [pendingProduct, setPendingProduct] = useState<PosProduct | null>(null);
  const [inputQty, setInputQty] = useState('1');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const quickSelectProducts = products.filter(p => p.isQuickSelect);
  const total = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
  const cashNum = parseFloat(cashReceived) || 0;
  const change = cashNum - total;

  useEffect(() => {
    if (isScanning) startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [isScanning]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 } } 
      });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("เปิดกล้องไม่ได้เลยลูก ลองใหม่อีกทีนะ");
      setIsScanning(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  const findBestMatch = (scannedName: string) => {
    const normScanned = scannedName.toLowerCase().trim();
    const matches = products.map(p => {
      const pName = p.name.toLowerCase().trim();
      let score = 0;
      if (normScanned === pName) score = 100;
      else if (normScanned.includes(pName) || pName.includes(normScanned)) score = Math.max(pName.length, normScanned.length);
      return { product: p, score };
    }).filter(m => m.score > 0).sort((a, b) => b.score - a.score);
    return matches.length > 0 ? matches[0].product : null;
  };

  const handleScan = async () => {
    if (!videoRef.current || !canvasRef.current || isProcessing) return;
    setIsProcessing(true);
    try {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error();
      ctx.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      const result = await recognizeProduct(base64);
      const product = findBestMatch(result.name);
      if (!product) {
        speakText(`ไม่รู้จัก ${result.name} เลย สงสัยต้องเพิ่มของใหม่ก่อนนะ`, persona);
        onUnregisteredProduct(result.name, '');
        return;
      }
      setPendingProduct(product);
      setInputQty('1');
      speakText(`เจอ ${product.name} แล้วนะ`, persona);
    } catch (err) {
      speakText("มองไม่ชัดเลย ถ่ายใหม่อีกทีนะ", persona);
    } finally {
      setIsProcessing(false);
    }
  };

  const addToCart = (product: PosProduct, qty: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) return prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + qty } : item);
      return [...prev, { product, qty }];
    });
    speakText(`หยิบ ${product.name} ใส่ตะกร้าให้แล้ว`, persona);
  };

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white p-4 border-b border-gray-100 shadow-sm sticky top-0 z-20 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="text-blue-600" size={20}/>
            <h3 className="text-base font-black text-gray-800">ตะกร้า</h3>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-black text-gray-400 bg-gray-50 px-2 py-1 rounded-md uppercase">{cart.length} อย่าง</span>
             <div className="bg-blue-600 text-white px-3 py-1 rounded-full font-black text-sm">฿{total.toLocaleString()}</div>
          </div>
        </div>
        
        {cart.length > 0 && (
          <div className="flex overflow-x-auto gap-2 py-1 no-scrollbar max-h-24">
            {cart.map((item, idx) => (
              <div key={idx} className="shrink-0 flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-100 animate-in fade-in duration-300">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-700 truncate w-24">{item.product.name}</span>
                  <span className="text-[9px] font-bold text-blue-600">x{item.qty} (฿{item.product.price * item.qty})</span>
                </div>
                <button onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))} className="text-red-300 p-1"><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 p-4 space-y-6 pb-24">
        <div className="space-y-3">
          <button 
            onClick={() => setIsScanning(true)} 
            className="w-full bg-blue-600 text-white py-6 rounded-[32px] font-black text-2xl flex items-center justify-center gap-4 shadow-[0_15px_30px_rgba(37,99,235,0.2)] active:scale-90 transition-all cursor-pointer relative z-10"
          >
            <Camera size={32} /> ช่วยสแกนของหน่อย
          </button>
          
          {cart.length > 0 && (
            <button 
              onClick={() => setShowCheckout(true)} 
              className="w-full bg-green-500 text-white py-6 rounded-[32px] font-black text-2xl flex items-center justify-center gap-4 shadow-[0_15px_30px_rgba(34,197,94,0.2)] active:scale-90 transition-all cursor-pointer relative z-10"
            >
              <CheckCircle2 size={32} /> คิดเงินจบการขาย
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Zap size={14} className="text-orange-500 fill-orange-500" /> ของขายบ่อย
            </h4>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pb-8">
            {quickSelectProducts.length > 0 ? (
              quickSelectProducts.map(p => (
                <button 
                  key={p.id} 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    addToCart(p);
                  }}
                  className="bg-white border-2 border-gray-100 p-4 rounded-[28px] flex flex-col gap-1 active:scale-95 transition-all shadow-sm hover:border-blue-400 group text-left relative z-10 cursor-pointer pointer-events-auto"
                >
                  <p className="font-black text-gray-800 text-xs leading-tight truncate w-full">{p.name}</p>
                  <div className="flex justify-between items-center w-full mt-1">
                    <p className="font-black text-blue-600 text-lg">฿{p.price}</p>
                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-active:bg-blue-600 group-active:text-white transition-colors">
                       <Plus size={20} strokeWidth={4} />
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="col-span-2 py-10 text-center bg-gray-100/50 rounded-[40px] border-4 border-dashed border-gray-200">
                 <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">ยังไม่มีของขายบ่อยเลย</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isScanning && (
        <div className="fixed inset-0 z-[120] bg-black flex flex-col">
          <div className="p-6 flex justify-between items-center absolute top-0 left-0 right-0 z-[130] text-white bg-gradient-to-b from-black/80 to-transparent">
            <button onClick={() => setIsScanning(false)} className="bg-white/20 p-4 rounded-full backdrop-blur-md active:scale-90"><X size={32}/></button>
            <div className="bg-blue-600/90 backdrop-blur-md px-6 py-2 rounded-full border border-white/20 shadow-xl">
              <p className="font-black text-lg">ยอด ฿{total.toLocaleString()}</p>
            </div>
            <div className="w-14"></div>
          </div>
          <div className="flex-1 relative bg-black flex flex-col overflow-hidden">
            <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center p-10 pointer-events-none mb-40">
               <div className="w-full aspect-square border-4 border-white/20 border-dashed rounded-[60px] relative shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]">
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <ScanLine size={64} className="text-white/10 mb-4 animate-pulse" />
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">วางของให้ดูหน่อย</p>
                  </div>
               </div>
            </div>
            <div className="absolute bottom-12 left-0 right-0 flex justify-center items-center z-[140]">
              {isProcessing ? (
                <div className="bg-white/95 backdrop-blur-xl px-12 py-6 rounded-full flex items-center gap-5 shadow-2xl border-4 border-blue-500 animate-pulse">
                  <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
                  <p className="font-black text-blue-600 text-2xl">กำลังเพ่งมองนะ...</p>
                </div>
              ) : (
                <button onClick={handleScan} className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(255,255,255,0.4)] active:scale-90 border-[10px] border-gray-100"><Camera size={48} className="text-blue-600" /></button>
              )}
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {pendingProduct && (
        <div className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-xl flex items-center justify-center p-8">
          <div className="bg-white w-full max-w-xs rounded-[50px] p-8 space-y-6 shadow-2xl text-center">
            <p className="text-2xl font-black text-gray-900 leading-tight">{pendingProduct.name}</p>
            <div className="space-y-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">กี่ชิ้นดี?</p>
              <input type="number" value={inputQty} onChange={e => setInputQty(e.target.value)} className="w-full text-6xl font-black p-4 bg-gray-50 rounded-3xl text-center outline-none border-4 border-transparent focus:border-blue-500 text-blue-600 shadow-inner" autoFocus />
            </div>
            <button onClick={() => { addToCart(pendingProduct, parseInt(inputQty) || 1); setPendingProduct(null); }} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-xl shadow-xl active:scale-95">ตามนี้เลย</button>
            <button onClick={() => setPendingProduct(null)} className="w-full text-gray-400 font-black text-sm">เปลี่ยนใจแล้ว</button>
          </div>
        </div>
      )}

      {showCheckout && (
        <div className="fixed inset-0 z-[2100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-8">
          <div className="bg-white w-full max-w-xs rounded-[50px] p-8 space-y-6 shadow-2xl text-center">
            <p className="text-6xl font-black text-blue-600">฿{total.toLocaleString()}</p>
            <div className="space-y-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">รับเงินมาเท่าไหร่?</p>
              <input type="number" value={cashReceived} onChange={e => setCashReceived(e.target.value)} className="w-full text-4xl font-black p-4 bg-gray-50 rounded-3xl text-center outline-none border-4 border-transparent focus:border-blue-500 shadow-inner" placeholder="0" />
            </div>
            {cashNum > 0 && (
              <div className={`p-4 rounded-2xl ${change < 0 ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-600'}`}>
                <p className="text-[9px] font-black uppercase mb-1">{change < 0 ? 'ยังจ่ายไม่ครบนะ' : 'เงินทอนจ้ะ'}</p>
                <p className="text-3xl font-black">฿{Math.abs(change).toLocaleString()}</p>
              </div>
            )}
            <button onClick={() => { onSaleComplete(cart, total); speakText(`เรียบร้อยแล้วนะ อย่าลืมทอนเงินเขา ${change} บาทนะ เดี๋ยวเขาจะว่าเอา`, persona); setCart([]); setCashReceived(''); setShowCheckout(false); onGoBack(); }} disabled={change < 0 || cashNum === 0} className={`w-full py-5 rounded-3xl font-black text-xl text-white shadow-xl ${change < 0 || cashNum === 0 ? 'bg-gray-200' : 'bg-blue-600 active:scale-95'}`}>ขายเสร็จแล้ว</button>
            <button onClick={() => setShowCheckout(false)} className="w-full text-gray-400 font-black text-sm">ดูอีกที</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSSystem;
