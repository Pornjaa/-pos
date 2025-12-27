
import React, { useState, useRef, useEffect } from 'react';
import { Camera, Save, X, Loader2, ArrowLeft, CheckSquare, Square, Image as ImageIcon, Plus, Trash2, Package, Tag, Wallet, Zap, ListFilter, AlertTriangle } from 'lucide-react';
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

const ProductManager: React.FC<ProductManagerProps> = ({ products, onSave, onDelete, onBack, prefillData, persona = 'GRANDMA' as AiPersona }) => {
  const [view, setView] = useState<'list' | 'add'>('list');
  const [isCapturingProduct, setIsCapturingProduct] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRetailProduct, setIsRetailProduct] = useState(false);
  
  const [productName, setProductName] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('0');
  const [minStockLevel, setMinStockLevel] = useState('5');
  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (prefillData) {
      setProductName(prefillData.name);
      setView('add');
      speakText("ยายจ๋า มีของมาใหม่เหรอ ใส่ราคาและสต๊อกให้หน่อยนะ", persona);
    }
  }, [prefillData]);

  useEffect(() => {
    if (isCapturingProduct) {
      (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          if (videoRef.current) videoRef.current.srcObject = stream;
        } catch (err) { alert("เปิดกล้องไม่ได้เลยจ้ะ"); setIsCapturingProduct(false); }
      })();
    } else {
      if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  }, [isCapturingProduct]);

  const handleSave = () => {
    if (!productName || !sellingPrice) { speakText("ใส่ชื่อกับราคาให้ครบก่อนนะจ๊ะ", persona); return; }
    onSave({
      id: crypto.randomUUID(),
      name: productName,
      barcode: '',
      costPrice: parseFloat(costPrice) || 0,
      price: parseFloat(sellingPrice) || 0,
      isRetailProduct: isRetailProduct,
      imageUrl: productImageUrl || undefined,
      stockQuantity: parseInt(stockQuantity) || 0,
      minStockLevel: parseInt(minStockLevel) || 5
    });
    // Reset fields
    setProductName(''); setCostPrice(''); setSellingPrice(''); setStockQuantity('0'); setMinStockLevel('5'); setProductImageUrl(null); setIsRetailProduct(false);
    speakText("จดลงสมุดและตั้งสต๊อกให้เรียบร้อยแล้วจ้ะ", persona);
    setView('list');
  };

  const handleCaptureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsProcessing(true);
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    setProductImageUrl(base64);
    try {
      const res = await recognizeProduct(base64.split(',')[1]);
      setProductName(res.name);
      speakText(`อ่านชื่อได้ว่า ${res.name} จ้ะ`, persona);
    } catch(e) {
      speakText("ยายจ๋า อ่านไม่ออกเลย พิมพ์เองนะจ๊ะ", persona);
    } finally {
      setIsProcessing(false); setIsCapturingProduct(false);
    }
  };

  if (view === 'list') {
    return (
      <div className="space-y-6 pb-32">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-2xl font-black text-gray-800">สมุดสต๊อกยาย</h2>
          <button onClick={() => setView('add')} className="bg-blue-600 text-white p-4 rounded-2xl flex items-center gap-2 font-black shadow-lg active:scale-95"><Plus size={24}/> เพิ่มของใหม่</button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {products.length === 0 ? (
            <div className="bg-white p-16 rounded-[40px] text-center text-gray-400 font-bold border-2 border-dashed border-gray-100">ยังไม่มีของในสต๊อกจ้ะยาย</div>
          ) : (
            products.map(p => {
              const isLow = p.stockQuantity <= p.minStockLevel;
              return (
                <div key={p.id} className={`bg-white p-5 rounded-[32px] border ${isLow ? 'border-red-200' : 'border-gray-100'} flex items-center gap-5 shadow-sm relative overflow-hidden`}>
                  {isLow && (
                    <div className="absolute top-0 left-0 bg-red-500 text-white text-[8px] font-black px-3 py-1 rounded-br-xl flex items-center gap-1 uppercase">
                      <AlertTriangle size={8}/> ของใกล้หมด
                    </div>
                  )}
                  {p.isRetailProduct && (
                    <div className="absolute top-0 right-10 bg-orange-500 text-white text-[9px] font-black px-3 py-1 rounded-b-xl flex items-center gap-1 uppercase tracking-widest">
                      <ListFilter size={10} /> ขายย่อย
                    </div>
                  )}
                  <div className="w-16 h-16 bg-gray-100 rounded-2xl overflow-hidden border border-gray-50 flex items-center justify-center">
                    {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <Package className="text-gray-300" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-gray-800 truncate">{p.name}</p>
                    <div className="flex items-center gap-3">
                      <p className="text-blue-600 font-black text-sm">฿{p.price}</p>
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isLow ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-400'}`}>
                        คงเหลือ: {p.stockQuantity}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => onDelete(p.id)} className="p-4 text-red-200"><Trash2 size={24}/></button>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32">
      <button onClick={() => setView('list')} className="flex items-center gap-2 text-gray-500 font-black"><ArrowLeft size={20}/> กลับสมุด</button>
      <div className="bg-white p-8 rounded-[50px] shadow-2xl space-y-8 animate-in slide-in-from-bottom duration-500">
        <h3 className="text-2xl font-black text-center text-gray-800">ช่วยจดของใหม่หน่อยจ้ะ</h3>
        
        <div className="flex justify-center">
          {productImageUrl ? (
            <div className="relative"><img src={productImageUrl} className="w-48 h-48 rounded-[50px] object-cover border-4 border-blue-50 shadow-xl" /><button onClick={() => setProductImageUrl(null)} className="absolute -top-2 -right-2 bg-red-500 text-white p-2 rounded-full shadow-lg"><X size={20}/></button></div>
          ) : (
            <button onClick={() => setIsCapturingProduct(true)} className="w-48 h-48 rounded-[50px] bg-gray-50 border-4 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 text-gray-300 active:scale-95">
              <Camera size={48} />
              <span className="text-[10px] font-black uppercase">แตะเพื่อถ่ายรูปของ</span>
            </button>
          )}
        </div>
        
        <div className="space-y-6">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-gray-400 uppercase ml-4">ชื่อสินค้า</label>
            <input value={productName} onChange={e => setProductName(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[30px] text-xl font-black border-2 border-transparent focus:border-blue-500 outline-none shadow-inner" placeholder="ของชื่ออะไรจ๊ะ..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-orange-400 uppercase ml-4">ทุนยาย</label>
              <input type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[30px] text-2xl font-black text-center" placeholder="0" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-blue-400 uppercase ml-4">ราคาขาย</label>
              <input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[30px] text-2xl font-black text-center" placeholder="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-emerald-400 uppercase ml-4">จำนวนในสต๊อก</label>
              <input type="number" value={stockQuantity} onChange={e => setStockQuantity(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[30px] text-2xl font-black text-center" placeholder="0" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-red-400 uppercase ml-4">เตือนเมื่อเหลือน้อย</label>
              <input type="number" value={minStockLevel} onChange={e => setMinStockLevel(e.target.value)} className="w-full bg-gray-50 p-6 rounded-[30px] text-2xl font-black text-center" placeholder="5" />
            </div>
          </div>
        </div>

        <button 
          onClick={() => setIsRetailProduct(!isRetailProduct)} 
          className={`w-full flex items-center justify-between p-6 rounded-[35px] border-4 transition-all ${isRetailProduct ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-lg' : 'bg-gray-50 border-transparent text-gray-500'}`}
        >
          <div className="flex items-center gap-4">
            {isRetailProduct ? <CheckSquare size={32} /> : <Square size={32} />}
            <span className="text-xl font-black">เป็นสินค้าขายย่อย</span>
          </div>
          <ListFilter />
        </button>
        
        <button onClick={handleSave} className="w-full bg-blue-600 text-white py-8 rounded-[40px] font-black text-2xl shadow-xl active:scale-95 transition-all">จดลงสมุดสต๊อกจ้ะ</button>
      </div>

      {isCapturingProduct && (
        <div className="fixed inset-0 z-[1200] bg-black flex flex-col">
          <div className="p-8 absolute top-0 left-0 right-0 z-[1230] text-white flex justify-between"><button onClick={() => setIsCapturingProduct(false)} className="bg-white/20 p-4 rounded-full"><X/></button></div>
          <video ref={videoRef} autoPlay playsInline className="flex-1 object-cover" />
          <div className="p-12 flex justify-center bg-black">
            {isProcessing ? <Loader2 className="animate-spin text-white w-12 h-12" /> : 
            <button onClick={handleCaptureAndRecognize} className="w-24 h-24 bg-white rounded-full border-[10px] border-gray-100 flex items-center justify-center shadow-xl"><Camera size={48} className="text-blue-600" /></button>}
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
};

export default ProductManager;
