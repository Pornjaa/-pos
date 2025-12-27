
import React, { useState, useRef, useEffect } from 'react';
import { Camera, ShoppingCart, Trash2, CheckCircle2, X, Loader2, ArrowLeft, Zap, ListFilter, Wallet, Coins, ChevronRight } from 'lucide-react';
import { speakText, recognizeProduct } from '../services/geminiService';
import { PosProduct, AiPersona } from '../types';

interface POSSystemProps {
  products: PosProduct[];
  onSaleComplete: (items: any[], total: number) => void;
  onGoBack: () => void;
  onUnregisteredProduct: (name: string, barcode: string) => void;
  persona?: AiPersona;
  onScanningStateChange?: (isScanning: boolean) => void;
}

const POSSystem: React.FC<POSSystemProps> = ({ products, onSaleComplete, onGoBack, onUnregisteredProduct, persona = 'GRANDMA' as AiPersona, onScanningStateChange }) => {
  const [cart, setCart] = useState<{product: PosProduct, qty: number}[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showRetailSelector, setShowRetailSelector] = useState(false);
  const [saleSummary, setSaleSummary] = useState<{total: number, received: number, change: number} | null>(null);
  
  const [pendingProduct, setPendingProduct] = useState<PosProduct | null>(null);
  const [inputQty, setInputQty] = useState('1');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const retailProducts = products.filter(p => p.isRetailProduct);
  const total = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
  const cashNum = parseFloat(cashReceived) || 0;
  const change = cashNum - total;

  useEffect(() => {
    if (onScanningStateChange) onScanningStateChange(isScanning);
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
    let match = products.find(p => p.name.toLowerCase().trim() === s);
    if (match) return match;
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
      const productNames = products.map(p => p.name);
      const result = await recognizeProduct(base64, productNames);
      const product = findBestMatch(result.name);
      if (!product) {
        speakText(`ไม่รู้จักสินค้าตัวนี้เลย ต้องจดลงสมุดก่อนนะจ๊ะ`, persona);
        onUnregisteredProduct(result.name, '');
        setIsScanning(false);
        return;
      }
      // ไม่ต้องพูดตอนสแกน แต่รอพูดตอนใส่จำนวน
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
    // พูดยืนยันจำนวนที่หยิบใส่ตะกร้าจริง
    speakText(`หยิบ ${product.name} จำนวน ${qty} ชิ้น ใส่ตะกร้าแล้วนะจ๊ะ`, persona);
  };

  const handleCompleteSale = () => {
    if (cashNum < total) {
      speakText("เงินที่รับมายังไม่พอนะจ๊ะที่รัก", persona);
      return;
    }
    const currentTotal = total;
    const currentReceived = cashNum;
    const currentChange = change;
    
    onSaleComplete(cart, currentTotal);
    setSaleSummary({ total: currentTotal, received: currentReceived, change: currentChange });
    setShowCheckout(false);
    setCart([]);
    setCashReceived('');
    
    // พูดสรุปยอดเงินและเงินทอนให้ชัดเจน
    speakText(`คิดเงินจบการขายเรียบร้อยจ้ะ ยอดรวม ${currentTotal} บาท รับมา ${currentReceived} บาท ทอนเงิน ${currentChange} บาทนะจ๊ะ`, persona);
  };

  const closeSummary = () => {
    setSaleSummary(null);
  };

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Header with Cart summary */}
      <div className="bg-white p-4 border-b border-gray-100 shadow-sm sticky top-0 z-20 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => { onGoBack(); }} className="p-2 -ml-2 text-gray-400"><ArrowLeft/></button>
            <ShoppingCart className="text-blue-600" size={20}/>
            <h3 className="text-base font-black text-gray-800">ตะกร้าของยาย</h3>
          </div>
          <div className="bg-blue-600 text-white px-4 py-1 rounded-full font-black text-sm">฿{total.toLocaleString()}</div>
        </div>
        {cart.length > 0 && (
          <div className="flex overflow-x-auto gap-2 py-1 no-scrollbar max-h-24">
            {cart.map((item, idx) => (
              <div key={idx} className="shrink-0 flex items-center gap-2 bg-blue-50 p-2 rounded-xl border border-blue-100 animate-in zoom-in duration-300">
                <span className="text-[10px] font-black text-blue-800 truncate w-20">{item.product.name}</span>
                <span className="text-[10px] font-bold text-blue-600">x{item.qty}</span>
                <button onClick={() => { setCart(prev => prev.filter((_, i) => i !== idx)); speakText("เอาออกจากตะกร้าแล้วจ้ะ", persona); }} className="text-red-300"><Trash2 size={12}/></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Actions */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center gap-6">
        <div className="w-full space-y-4 max-w-sm">
          <button onClick={() => { setIsScanning(true); }} className="w-full bg-blue-600 text-white py-12 rounded-[50px] font-black text-3xl flex flex-col items-center justify-center gap-4 shadow-[0_20px_40px_rgba(37,99,235,0.3)] active:scale-95 transition-all"><Camera size={64} /><span>สแกนสินค้า</span></button>
          <button onClick={() => { setShowRetailSelector(true); }} className="w-full bg-orange-500 text-white py-8 rounded-[50px] font-black text-xl flex items-center justify-center gap-4 shadow-lg active:scale-95 transition-all"><ListFilter size={28} /> เลือกสินค้าขายย่อย</button>
          {cart.length > 0 && <button onClick={() => { setShowCheckout(true); speakText(`ยอดรวมทั้งหมด ${total} บาทจ้ะ`, persona); }} className="w-full bg-green-500 text-white py-8 rounded-[50px] font-black text-2xl flex items-center justify-center gap-4 shadow-xl active:scale-95 transition-all"><CheckCircle2 size={36} /> คิดเงินจบการขาย</button>}
        </div>
      </div>

      {/* Retail Selector */}
      {showRetailSelector && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex flex-col p-6 overflow-hidden">
          <div className="bg-white w-full rounded-[50px] flex flex-col max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center"><div className="flex items-center gap-2"><Zap className="text-orange-500" fill="currentColor"/><h3 className="font-black text-xl text-gray-800">สินค้าขายย่อย</h3></div><button onClick={() => setShowRetailSelector(false)} className="bg-gray-100 p-2 rounded-full"><X/></button></div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 no-scrollbar">
              {retailProducts.length > 0 ? retailProducts.map(p => (
                <button key={p.id} onClick={() => { addToCart(p, 1); setShowRetailSelector(false); }} className="bg-orange-50 border-2 border-orange-100 p-4 rounded-[30px] flex flex-col gap-1 active:scale-95 transition-all text-left">
                  <p className="font-black text-orange-800 text-xs truncate">{p.name}</p>
                  <p className="font-black text-orange-600 text-lg">฿{p.price}</p>
                </button>
              )) : (<div className="col-span-2 py-10 text-center text-gray-400 font-bold">ยังไม่ได้ตั้งค่าสินค้าขายย่อยจ้ะยาย</div>)}
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-[2000] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[60px] p-8 space-y-8 shadow-2xl animate-in zoom-in duration-300">
             <div className="text-center space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">สรุปยอดขาย</p>
                <h3 className="text-5xl font-black text-blue-600">฿{total.toLocaleString()}</h3>
             </div>
             
             <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-6">รับเงินมา (บาท)</label>
                  <input 
                    type="number" 
                    value={cashReceived} 
                    onChange={e => setCashReceived(e.target.value)}
                    className="w-full bg-gray-50 p-8 rounded-[40px] text-4xl font-black text-center border-4 border-transparent focus:border-green-500 outline-none transition-all"
                    placeholder="0"
                    autoFocus
                  />
                </div>

                {cashNum >= total && (
                  <div className="bg-green-50 p-6 rounded-[40px] border-2 border-green-100 flex justify-between items-center animate-in fade-in duration-500">
                    <span className="text-xs font-black text-green-700 uppercase">เงินทอน</span>
                    <span className="text-3xl font-black text-green-600">฿{change.toLocaleString()}</span>
                  </div>
                )}
             </div>

             <div className="space-y-3">
               <button onClick={handleCompleteSale} className="w-full bg-green-500 text-white py-8 rounded-[40px] font-black text-2xl shadow-xl active:scale-95 transition-all">ยืนยันการขายจ้ะ</button>
               <button onClick={() => { setShowCheckout(false); }} className="w-full text-gray-400 font-black text-xs">กลับไปแก้ไข</button>
             </div>
          </div>
        </div>
      )}

      {/* Sale Summary Receipt Modal */}
      {saleSummary && (
        <div className="fixed inset-0 z-[4000] bg-blue-600 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[60px] p-10 space-y-8 shadow-2xl text-center relative overflow-hidden animate-in zoom-in duration-500">
            <div className="absolute top-0 left-0 w-full h-4 bg-green-500"></div>
            <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={48} />
            </div>
            
            <div className="space-y-1">
              <h3 className="text-3xl font-black text-gray-800">ขายสำเร็จแล้วจ้ะ!</h3>
              <p className="text-gray-400 font-bold">บันทึกลงประวัติเรียบร้อย</p>
            </div>

            <div className="bg-gray-50 rounded-[40px] p-8 space-y-4 border border-gray-100">
               <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <span className="text-xs font-black text-gray-400 uppercase">ยอดทั้งหมด</span>
                  <span className="text-xl font-black text-gray-800">฿{saleSummary.total.toLocaleString()}</span>
               </div>
               <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <span className="text-xs font-black text-gray-400 uppercase">รับเงินมา</span>
                  <span className="text-xl font-black text-gray-800">฿{saleSummary.received.toLocaleString()}</span>
               </div>
               <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-black text-green-700 uppercase">เงินทอน</span>
                  <span className="text-4xl font-black text-green-600">฿{saleSummary.change.toLocaleString()}</span>
               </div>
            </div>

            <button onClick={closeSummary} className="w-full bg-gray-900 text-white py-8 rounded-[40px] font-black text-xl shadow-xl active:scale-95 flex items-center justify-center gap-3">
              รับทราบจ้ะ <ChevronRight />
            </button>
          </div>
        </div>
      )}

      {/* Camera Scanning View */}
      {isScanning && (
        <div className="fixed inset-0 z-[2000] bg-black flex flex-col">
          <div className="p-6 absolute top-0 left-0 right-0 z-[2010] flex justify-between items-center text-white"><button onClick={() => { setIsScanning(false); }} className="bg-white/20 p-4 rounded-full"><X size={32}/></button><div className="bg-blue-600 px-6 py-2 rounded-full font-black">฿{total}</div></div>
          <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center p-12 pointer-events-none"><div className="w-full aspect-square border-4 border-white/30 border-dashed rounded-[60px] shadow-[0_0_0_1000px_rgba(0,0,0,0.6)]"></div></div>
          <div className="absolute bottom-20 left-0 right-0 flex justify-center z-[2020]">
            {isProcessing ? <Loader2 className="animate-spin text-white w-16 h-16" /> : 
            <button onClick={handleScan} className="w-24 h-24 bg-white rounded-full flex items-center justify-center border-[10px] border-gray-100 shadow-[0_0_30px_rgba(255,255,255,0.3)] active:scale-90 transition-transform"><Camera size={48} className="text-blue-600" /></button>}
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* Quantity Popup */}
      {pendingProduct && (
        <div className="fixed inset-0 z-[3000] bg-black/95 flex items-center justify-center p-8">
          <div className="bg-white w-full max-w-xs rounded-[50px] p-8 space-y-6 text-center animate-in zoom-in duration-300">
            <p className="text-2xl font-black text-gray-800">{pendingProduct.name}</p>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase">ระบุจำนวน</label>
              <input 
                type="number" 
                value={inputQty} 
                onChange={e => setInputQty(e.target.value)} 
                className="w-full text-6xl font-black p-4 bg-gray-50 rounded-3xl text-center outline-none border-4 border-blue-500 text-blue-600 shadow-inner" 
                autoFocus 
              />
            </div>
            <button onClick={() => { addToCart(pendingProduct, parseInt(inputQty) || 1); setPendingProduct(null); }} className="w-full bg-blue-600 text-white py-7 rounded-3xl font-black text-2xl shadow-lg active:scale-95">ใส่ตะกร้าจ้ะ</button>
            <button onClick={() => { setPendingProduct(null); }} className="w-full text-gray-400 font-black text-xs uppercase tracking-widest">ยกเลิก</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSSystem;
