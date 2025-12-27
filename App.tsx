
import React, { useState, useEffect, useMemo } from 'react';
import { InventoryRecord, SummaryStats, Category, PosProduct, SyncConfig, ProductItem, AiPersona } from './types';
import Dashboard from './components/Dashboard';
import CameraUploader from './components/CameraUploader';
import HistoryList from './components/HistoryList';
import POSSystem from './components/POSSystem';
import ProductManager from './components/ProductManager';
import SyncManager from './components/SyncManager';
import { processReceiptImage, speakText, generateMascot, initAudio } from './services/geminiService';
import { LayoutDashboard, History, Camera, Loader2, Store, Package, Power, Coffee, Zap, Cloud, ShieldAlert, Sparkles, Check, X, Plus, Minus, Info } from 'lucide-react';
import { isSameDay, isSameWeek, isSameMonth, isSameYear } from 'date-fns';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'pos' | 'manage' | 'sync'>('dashboard');
  
  const [records, setRecords] = useState<InventoryRecord[]>(() => {
    const saved = localStorage.getItem('inventory_records');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [posProducts, setPosProducts] = useState<PosProduct[]>(() => {
    const saved = localStorage.getItem('pos_products');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [aiCredits, setAiCredits] = useState<number>(() => {
    const saved = localStorage.getItem('ai_credits');
    return saved ? parseInt(saved) : 100;
  });
  
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => {
    const saved = localStorage.getItem('sync_config');
    return saved ? JSON.parse(saved) : { shopId: '', role: 'OWNER', isEnabled: false, aiPersona: 'GRANDMA' };
  });
  
  const [ownerPhoto, setOwnerPhoto] = useState<string | null>(() => {
    return localStorage.getItem('owner_photo');
  });
  
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingRecord, setPendingRecord] = useState<any | null>(null);
  const [prefillProduct, setPrefillProduct] = useState<{name: string, barcode: string} | null>(null);
  const [isSystemOff, setIsSystemOff] = useState(false);

  useEffect(() => {
    localStorage.setItem('inventory_records', JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('pos_products', JSON.stringify(posProducts));
  }, [posProducts]);

  useEffect(() => {
    localStorage.setItem('ai_credits', aiCredits.toString());
  }, [aiCredits]);

  useEffect(() => {
    localStorage.setItem('sync_config', JSON.stringify(syncConfig));
  }, [syncConfig]);

  useEffect(() => {
    if (ownerPhoto) localStorage.setItem('owner_photo', ownerPhoto);
  }, [ownerPhoto]);

  const persona = syncConfig.aiPersona || 'GRANDMA';

  const currentIceBalance = useMemo(() => {
    let totalDelivered = 0;
    let totalReturned = 0;
    records.forEach(r => {
      if (r.iceMetrics) {
        totalDelivered += r.iceMetrics.delivered || 0;
        totalReturned += r.iceMetrics.returned || 0;
      }
    });
    return totalDelivered - totalReturned;
  }, [records]);

  const stats = useMemo<SummaryStats>(() => {
    const now = new Date();
    const result: SummaryStats = {
      daily: 0, weekly: 0, monthly: 0, yearly: 0, totalSales: 0, aiCredits,
      byCategory: { [Category.ICE]: 0, [Category.BEVERAGE]: 0, [Category.OTHERS]: 0, [Category.SALE]: 0 }
    };

    records.forEach(r => {
      const d = new Date(r.timestamp);
      if (r.type === 'SALE') {
        result.totalSales += r.totalCost;
      } else {
        if (isSameDay(d, now)) result.daily += r.totalCost;
        if (isSameWeek(d, now)) result.weekly += r.totalCost;
        if (isSameMonth(d, now)) result.monthly += r.totalCost;
        if (isSameYear(d, now)) result.yearly += r.totalCost;
        result.byCategory[r.category] += r.totalCost;
      }
    });
    return result;
  }, [records, aiCredits]);

  const handleCapture = async (base64: string) => {
    setIsCameraOpen(false);
    // ปลุกระบบเสียงทันทีที่เริ่มโปรเซส
    await initAudio();

    if (aiCredits <= 0) {
      speakText("เหรียญสแกนหมดแล้วนะ ต้องเติมหน่อยแล้วจ้ะ", persona);
      return;
    }

    setAiCredits(prev => prev - 1);
    setIsProcessing(true);
    try {
      const data = await processReceiptImage(base64);
      setPendingRecord({
        ...data,
        iceMetrics: {
          delivered: data.iceMetrics?.delivered || 0,
          returned: data.iceMetrics?.returned || 0
        }
      });
      speakText(`อ่านบิลเสร็จแล้วนะ มาช่วยตรวจความถูกต้องหน่อย`, persona);
    } catch (err) { 
      speakText("มองไม่ออกเลย อ่านบิลนี้ไม่ออกจริงๆ ลองถ่ายใหม่นะ", persona); 
      setAiCredits(prev => prev + 1);
    } finally { 
      setIsProcessing(false); 
    }
  };

  const saveConfirmedRecord = async () => {
    if (!pendingRecord) return;
    await initAudio();
    
    const newRecord: InventoryRecord = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      category: pendingRecord.category as Category,
      items: pendingRecord.items,
      totalCost: pendingRecord.items.reduce((a: number, b: any) => a + (b.totalPrice || 0), 0),
      iceMetrics: pendingRecord.iceMetrics,
      notes: pendingRecord.notes,
      type: 'INVESTMENT',
      isSynced: syncConfig.isEnabled
    };
    
    setRecords(prev => [...prev, newRecord]);
    setPendingRecord(null);
    speakText(`บันทึกข้อมูลเรียบร้อยแล้วจ้ะ`, persona);
    setActiveTab('history');
  };

  const handleCreateMascot = async () => {
    await initAudio();
    setIsProcessing(true);
    try {
      const imageUrl = await generateMascot();
      setOwnerPhoto(imageUrl);
      speakText("ว้าว รูปนี้สวยจังเลย ขอบใจมากนะ", persona);
    } catch (e) {
      speakText("วาดรูปไม่สำเร็จเลย ลองใหมีกทีนะ", persona);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePOSSale = async (items: any[], total: number) => {
    await initAudio();
    const newRecord: InventoryRecord = { 
      id: crypto.randomUUID(), 
      timestamp: Date.now(), 
      category: Category.SALE, 
      items: items.map(i => ({ name: i.product.name, quantity: i.qty, unitPrice: i.product.price, totalPrice: i.product.price * i.qty })), 
      totalCost: total, 
      type: 'SALE',
      isSynced: syncConfig.isEnabled
    };
    setRecords(prev => [...prev, newRecord]);
  };

  const themes = {
    dashboard: { bg: 'bg-blue-50', header: 'bg-blue-600', text: 'text-blue-600', nav: 'text-blue-600', accent: 'bg-blue-600' },
    history: { bg: 'bg-indigo-50', header: 'bg-indigo-600', text: 'text-indigo-600', nav: 'text-indigo-600', accent: 'bg-indigo-600' },
    pos: { bg: 'bg-emerald-50', header: 'bg-emerald-600', text: 'text-emerald-600', nav: 'text-emerald-600', accent: 'bg-emerald-600' },
    manage: { bg: 'bg-amber-50', header: 'bg-amber-600', text: 'text-amber-600', nav: 'text-amber-600', accent: 'bg-amber-600' },
    sync: { bg: 'bg-rose-50', header: 'bg-rose-600', text: 'text-rose-600', nav: 'text-rose-600', accent: 'bg-rose-600' },
  };

  const currentTheme = themes[activeTab];

  if (isSystemOff) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-950 flex flex-col items-center justify-center p-8 text-center space-y-8">
        <Coffee className="text-blue-500 w-16 h-16 animate-pulse" />
        <h1 className="text-3xl font-black text-white">ปิดระบบพักผ่อนแล้วนะ</h1>
        <button onClick={async () => { await initAudio(); setIsSystemOff(false); }} className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-2xl flex items-center gap-4 justify-center shadow-xl"><Power size={32} /> เปิดระบบกันเถอะ</button>
      </div>
    );
  }

  return (
    <div className={`max-w-md mx-auto min-h-screen h-screen ${currentTheme.bg} flex flex-col relative overflow-hidden transition-colors duration-500`}>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-10 -left-10 w-64 h-64 border-[40px] border-black rounded-full"></div>
        <div className="absolute bottom-20 -right-20 w-80 h-80 border-[50px] border-black rounded-[80px] rotate-45"></div>
        <div className="absolute top-1/2 left-1/4 w-40 h-40 border-[20px] border-black rounded-2xl -rotate-12"></div>
      </div>

      {activeTab !== 'pos' && (
        <header className={`${currentTheme.header} p-4 pt-10 sticky top-0 z-30 flex justify-between items-center shadow-lg transition-colors duration-500 text-white`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSystemOff(true)} className="p-2 bg-white/20 rounded-full hover:bg-white/40 transition-colors"><Power size={20} /></button>
            <h1 className="text-xl font-black tracking-tight">คุณยาย <span className="opacity-70">POS</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 px-3 py-1 rounded-full border border-white/30 flex items-center gap-1.5 backdrop-blur-md">
               <Zap size={14} className="text-yellow-300 fill-yellow-300" />
               <span className="text-xs font-black">{aiCredits}</span>
            </div>
            {ownerPhoto && (
               <div className="w-10 h-10 rounded-full border-2 border-white/50 overflow-hidden shadow-md">
                 <img src={ownerPhoto} className="w-full h-full object-cover" />
               </div>
            )}
          </div>
        </header>
      )}

      <main className={`flex-1 overflow-y-auto relative z-10 ${activeTab === 'pos' ? '' : 'p-4'}`}>
        {isProcessing && (
          <div className="fixed inset-0 z-[1000] bg-white/80 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
            <div className="relative">
              <Loader2 className={`w-20 h-20 ${currentTheme.text} animate-spin mb-4`} />
              <Sparkles className="absolute -top-2 -right-2 text-yellow-500 animate-bounce" />
            </div>
            <h2 className="text-xl font-black text-gray-800 tracking-tight">กำลังทำให้อยู่นะ แป๊บนึง...</h2>
          </div>
        )}

        {/* Scan Review Modal */}
        {pendingRecord && (
          <div className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-sm rounded-[50px] p-8 space-y-6 shadow-2xl animate-in zoom-in duration-300 my-auto">
              <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Info size={40} />
                </div>
                <h3 className="text-2xl font-black text-gray-800 tracking-tight">ช่วยตรวจสอบหน่อย</h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">ข้อมูลที่อ่านได้จากบิล</p>
              </div>

              {/* Ice Bags Specific Inputs */}
              <div className="bg-blue-50 p-6 rounded-[35px] space-y-4 border-2 border-blue-100">
                <h4 className="font-black text-blue-700 text-sm flex items-center gap-2 uppercase tracking-widest">
                  <Package size={16} /> ยอดกระสอบน้ำแข็ง
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase ml-2">ที่มาส่ง</label>
                    <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-blue-100">
                      <button onClick={() => setPendingRecord({...pendingRecord, iceMetrics: {...pendingRecord.iceMetrics, delivered: Math.max(0, pendingRecord.iceMetrics.delivered - 1)}})} className="p-2 text-blue-600"><Minus size={16} strokeWidth={4}/></button>
                      <span className="flex-1 text-center font-black text-xl text-blue-700">{pendingRecord.iceMetrics.delivered}</span>
                      <button onClick={() => setPendingRecord({...pendingRecord, iceMetrics: {...pendingRecord.iceMetrics, delivered: pendingRecord.iceMetrics.delivered + 1}})} className="p-2 text-blue-600"><Plus size={16} strokeWidth={4}/></button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-500 uppercase ml-2">ที่เก็บคืน</label>
                    <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-blue-100">
                      <button onClick={() => setPendingRecord({...pendingRecord, iceMetrics: {...pendingRecord.iceMetrics, returned: Math.max(0, pendingRecord.iceMetrics.returned - 1)}})} className="p-2 text-orange-500"><Minus size={16} strokeWidth={4}/></button>
                      <span className="flex-1 text-center font-black text-xl text-orange-600">{pendingRecord.iceMetrics.returned}</span>
                      <button onClick={() => setPendingRecord({...pendingRecord, iceMetrics: {...pendingRecord.iceMetrics, returned: pendingRecord.iceMetrics.returned + 1}})} className="p-2 text-orange-500"><Plus size={16} strokeWidth={4}/></button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={saveConfirmedRecord} className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-xl shadow-xl active:scale-95 flex items-center justify-center gap-3">
                  <Check size={24} strokeWidth={4} /> ถูกต้องแล้วจ้ะ
                </button>
                <button onClick={() => setPendingRecord(null)} className="w-full text-gray-400 font-black text-sm py-2">
                  <X size={16} className="inline mr-1" /> ข้อมูลผิด ทิ้งไปเลย
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && <Dashboard 
          stats={stats} records={records} currentIceBalance={currentIceBalance} ownerPhoto={ownerPhoto}
          onOpenTopUp={async () => { await initAudio(); setAiCredits(prev => prev + 50); speakText("เติมเหรียญให้แล้วนะจ๊ะ", persona); }} 
          onStartScan={async () => { await initAudio(); setIsCameraOpen(true); }}
          onStartSale={async () => { await initAudio(); setActiveTab('pos'); }} 
          onOpenManage={async () => { await initAudio(); setActiveTab('manage'); }}
          hideSensitiveData={syncConfig.role === 'STAFF'} 
        />}
        {activeTab === 'history' && <HistoryList records={records} onDelete={id => setRecords(prev => prev.filter(r => r.id !== id))} canDelete={syncConfig.role === 'OWNER'} />}
        {activeTab === 'pos' && <POSSystem products={posProducts} onSaleComplete={handlePOSSale} onGoBack={() => setActiveTab('dashboard')} onUnregisteredProduct={(n, b) => {setPrefillProduct({name:n, barcode:b}); setActiveTab('manage');}} persona={persona} />}
        {activeTab === 'manage' && (
           syncConfig.role === 'OWNER' 
            ? <ProductManager products={posProducts} onSave={p => setPosProducts(v => [...v, p])} onDelete={id => setPosProducts(prev => prev.filter(p => p.id !== id))} onBack={() => setActiveTab('dashboard')} prefillData={prefillProduct} persona={persona} />
            : <div className="text-center py-20"><ShieldAlert size={64} className="mx-auto text-red-500 mb-4"/><h3 className="text-xl font-black">เฉพาะเจ้าของที่ดูได้นะ</h3></div>
        )}
        {activeTab === 'sync' && <SyncManager config={syncConfig} ownerPhoto={ownerPhoto} onSetPhoto={setOwnerPhoto} onSave={setSyncConfig} onBackup={() => {}} onRestore={() => {}} onCreateMascot={handleCreateMascot} />}
      </main>

      {!isCameraOpen && (
        <nav className="shrink-0 bg-white border-t border-gray-100 pb-8 px-4 pt-3 z-[100] shadow-[0_-15px_40px_rgba(0,0,0,0.08)] rounded-t-[40px]">
          <div className="flex justify-between items-center">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: 'ภาพรวม' },
              { id: 'history', icon: History, label: 'ประวัติ' },
              { id: 'pos', icon: Store, label: 'ขายของ' },
              { id: 'manage', icon: Package, label: 'หลังร้าน' },
              { id: 'sync', icon: Cloud, label: 'ตั้งค่า' }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={async () => { await initAudio(); setActiveTab(tab.id as any); }} 
                className={`flex flex-col items-center gap-1.5 flex-1 transition-all duration-300 ${activeTab === tab.id ? themes[tab.id as keyof typeof themes].text + ' scale-110' : 'text-gray-300'}`}
              >
                <div className={`p-2 rounded-2xl ${activeTab === tab.id ? themes[tab.id as keyof typeof themes].bg : ''}`}>
                  <tab.icon size={22} strokeWidth={activeTab === tab.id ? 3 : 2} />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {isCameraOpen && <CameraUploader onCapture={handleCapture} onCancel={() => setIsCameraOpen(false)} />}
    </div>
  );
};

export default App;
