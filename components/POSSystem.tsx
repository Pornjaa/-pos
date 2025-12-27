
import React, { useState, useRef, useEffect } from 'react';
import { Camera, ShoppingCart, Trash2, CheckCircle2, X, Loader2, ArrowLeft, Zap, ListFilter } from 'lucide-react';
import { speakText, recognizeProduct } from '../services/geminiService';
import { PosProduct, AiPersona } from '../types';

interface POSSystemProps {
  products: PosProduct[];
  onSaleComplete: (items: any[], total: number) => void;
  onGoBack: () => void;
  onUnregisteredProduct: (name: string, barcode: string) => void;
  persona?: AiPersona;
}

const POSSystem: React.FC<POSSystemProps> = ({ products, onSaleComplete, onGoBack, onUnregisteredProduct, persona = 'GRANDMA' as AiPersona }) => {
  const [cart, setCart] = useState<{product: PosProduct, qty: number}[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showRetailSelector, setShowRetailSelector] = useState(false);
  
  const [pendingProduct, setPendingProduct] = useState<PosProduct | null>(null);
  const [inputQty, setInputQty] = useState('1');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // แยกสินค้าขายย่อยออกมาสำหรับปุ่มเมนูพิเศษ
  const retailProducts = products.filter(p => p.isRetailProduct);

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
      alert("เปิดกล้องไม่ได้เลยลูก");
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
    const s = scannedName.toLowerCase().trim();
    if (!s) return null;
    
    // ค้นหาแบบตรงเป๊ะก่อน
    let match = products.find(p => p.name.toLowerCase().trim() === s);
    if (match) return match;

    // ค้นหาแบบบางส่วน
    const matches = products.map(p => {
      const pName = p.name.toLowerCase().trim();
      let score = 0;
      if (s.includes(pName) || pName.includes(s)) score += 100;
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
      
      // ส่งรายชื่อสินค้าที่มีอยู่ไปให้ AI ช่วยดูด้วย
      const productNames = products.map(p => p.name);
      const result = await recognizeProduct(base64, productNames);
      
      const product = findBestMatch(result.name);
      if (!product) {
        speakText(`ไม่รู้จัก ${result.name} เลย ต้องเพิ่มของก่อนนะจ๊ะ`, persona);
        onUnregisteredProduct(result.name, '');
        setIsScanning(false);
        return;
      }
      setPendingProduct(product);
      setInputQty('1');
    } catch (err) {
      speakText("มองไม่ชัดเลยจ้ะยาย", persona);
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
    speakText(`หยิบ ${product.name} ใส่ตะกร้าแล้วนะจ๊ะ`, persona);
  };

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white p-4 border-b border-gray-100 shadow-sm sticky top-0 z-20 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={onGoBack} className="p-2 -ml-2 text-gray-400"><ArrowLeft/></button>
            <ShoppingCart className="text-blue-600" size={20}/>
            <h3 className="text-base font-black text-gray-800">ตะกร้าของยาย</h3>
          </div>
          <div className="bg-blue-600 text-white px-4 py-1 rounded-full font-black text-sm">฿{total.toLocaleString()}</div>
        </div>
        {cart.length > 0 && (
          <div className="flex overflow-x-auto gap-2 py-1 no-scrollbar max-h-24">
            {cart.map((item, idx) => (
              <div key={idx} className="shrink-0 flex items-center gap-2 bg-blue-50 p-2 rounded-xl border border-blue-100">
                <span className="text-[10px] font-black text-blue-800 truncate w-20">{item.product.name}</span>
                <span className="text-[10px] font-bold text-blue-600">x{item.qty}</span>
                <button onClick={() => setCart(prev => prev.filter((_, i) => i !== idx))} className="text-red-300"><Trash2 size={12}/></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 p-6 flex flex-col items-center justify-center gap-6">
        <div className="w-full space-y-4 max-w-sm">
          <button 
            onClick={() => setIsScanning(true)} 
            className="w-full bg-blue-600 text-white py-12 rounded-[50px] font-black text-3xl flex flex-col items-center justify-center gap-4 shadow-[0_20px_40px_rgba(37,99,235,0.3)] active:scale-95 transition-all"
          >
            <Camera size={64} /> 
            <span>สแกนสินค้า</span>
          </button>
          
          <button 
            onClick={() => setShowRetailSelector(true)} 
            className="w-full bg-orange-500 text-white py-8 rounded-[50px] font-black text-xl flex items-center justify-center gap-4 shadow-lg active:scale-95 transition-all"
          >
            <ListFilter size={28} /> เลือกสินค้าขายย่อย
          </button>
          
          {cart.length > 0 && (
            <button 
              onClick={() => setShowCheckout(true)} 
              className="w-full bg-green-500 text-white py-8 rounded-[50px] font-black text-2xl flex items-center justify-center gap-4 shadow-xl active:scale-95 transition-all"
            >
              <CheckCircle2 size={36} /> คิดเงินจบการขาย
            </button>
          )}
        </div>
        
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] text-center mt-4">
          แตะปุ่มสแกนเพื่อเริ่มขายจ้ะยาย
        </p>
      </div>

      {showRetailSelector && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex flex-col p-6 overflow-hidden">
          <div className="bg-white w-full rounded-[50px] flex flex-col max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
               <div className="flex items-center gap-2">
                 <Zap className="text-orange-500" fill="currentColor"/>
                 <h3 className="font-black text-xl text-gray-800">สินค้าขายย่อย</h3>
               </div>
               <button onClick={() => setShowRetailSelector(false)} className="bg-gray-100 p-2 rounded-full"><X/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 no-scrollbar">
               {retailProducts.length > 0 ? retailProducts.map(p => (
                 <button 
                    key={p.id} 
                    onClick={() => { addToCart(p); setShowRetailSelector(false); }}
                    className="bg-orange-50 border-2 border-orange-100 p-4 rounded-[30px] flex flex-col gap-1 active:scale-95 transition-all text-left"
                  >
                    <p className="font-black text-orange-800 text-xs truncate">{p.name}</p>
                    <p className="font-black text-orange-600 text-lg">฿{p.price}</p>
                  </button>
               )) : (
                 <div className="col-span-2 py-10 text-center text-gray-400 font-bold">ยังไม่ได้ตั้งค่าสินค้าขายย่อยจ้ะยาย</div>
               )}
            </div>
            <div className="p-4 bg-gray-50 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">แตะที่สินค้าเพื่อหยิบใส่ตะกร้าจ้ะ</div>
          </div>
        </div>
      )}

      {isScanning && (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col">
          <div className="p-6 absolute top-0 left-0 right-0 z-[210] flex justify-between items-center text-white">
            <button onClick={() => setIsScanning(false)} className="bg-white/20 p-4 rounded-full"><X size={32}/></button>
            <div className="bg-blue-600 px-6 py-2 rounded-full font-black">฿{total}</div>
          </div>
          <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center p-12 pointer-events-none">
             <div className="w-full aspect-square border-4 border-white/30 border-dashed rounded-[60px] shadow-[0_0_0_1000px_rgba(0,0,0,0.6)]"></div>
          </div>
          <div className="absolute bottom-12 left-0 right-0 flex justify-center z-[220]">
            {isProcessing ? <Loader2 className="animate-spin text-white w-16 h-16" /> : 
            <button onClick={handleScan} className="w-24 h-24 bg-white rounded-full flex items-center justify-center border-[10px] border-gray-100 shadow-xl"><Camera size={48} className="text-blue-600" /></button>}
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {pendingProduct && (
        <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-8">
          <div className="bg-white w-full max-w-xs rounded-[50px] p-8 space-y-6 text-center">
            <p className="text-2xl font-black">{pendingProduct.name}</p>
            <input type="number" value={inputQty} onChange={e => setInputQty(e.target.value)} className="w-full text-6xl font-black p-4 bg-gray-50 rounded-3xl text-center outline-none border-4 border-blue-500 text-blue-600 shadow-inner" autoFocus />
            <button onClick={() => { addToCart(pendingProduct, parseInt(inputQty) || 1); setPendingProduct(null); }} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-xl">ใส่ตะกร้าจ้ะ</button>
            <button onClick={() => setPendingProduct(null)} className="w-full text-gray-400 font-black">ยกเลิก</button>
          </div>
        </div>
      )}

      {showCheckout && (
        <div className="fixed inset-0 z-[400] bg-black/95 flex items-center justify-center p-8">
          <div className="bg-white w-full max-w-xs rounded-[50px] p-8 space-y-6 text-center">
            <p className="text-5xl font-black text-blue-600">฿{total}</p>
            <div className="space-y-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">รับเงินมาเท่าไหร่จ๊ะยาย?</p>
              <input type="number" value={cashReceived} onChange={e => setCashReceived(e.target.value)} className="w-full text-4xl font-black p-4 bg-gray-50 rounded-3xl text-center outline-none border-4 border-transparent focus:border-blue-500 shadow-inner" placeholder="0" />
            </div>
            {cashNum > 0 && (
              <div className="p-4 rounded-2xl bg-orange-50 text-orange-600">
                <p className="text-[9px] font-black uppercase mb-1">{change < 0 ? 'ยังไม่พอจ้ะ' : 'เงินทอนจ้ะ'}</p>
                <p className="text-3xl font-black">฿{Math.abs(change)}</p>
              </div>
            )}
            <button onClick={() => { onSaleComplete(cart, total); setCart([]); setCashReceived(''); setShowCheckout(false); onGoBack(); }} disabled={change < 0 || cashNum === 0} className={`w-full py-5 rounded-3xl font-black text-xl text-white ${change < 0 || cashNum === 0 ? 'bg-gray-200' : 'bg-blue-600 active:scale-95'}`}>ขายเสร็จแล้วจ้ะ</button>
            <button onClick={() => setShowCheckout(false)} className="w-full text-gray-400 font-black text-sm">กลับไปตะกร้า</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSSystem;
