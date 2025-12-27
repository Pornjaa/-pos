
import React, { useState, useEffect, useMemo } from 'react';
import { InventoryRecord, SummaryStats, Category, PosProduct, SyncConfig, ProductItem, AiPersona } from './types';
import Dashboard from './components/Dashboard';
import CameraUploader from './components/CameraUploader';
import HistoryList from './components/HistoryList';
import POSSystem from './components/POSSystem';
import ProductManager from './components/ProductManager';
import SyncManager from './components/SyncManager';
import { processReceiptImage, speakText, initAudio, openKeySelector, hasCustomKey } from './services/geminiService';
import { LayoutDashboard, History, Camera, Loader2, Store, Package, Power, Coffee, Zap, Cloud, ShieldAlert, Sparkles, Check, X, Plus, Minus, Info, Trash2, Tag, Edit3, Coins, Eye, RotateCw, Key, Shield, AlertTriangle } from 'lucide-react';
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
  const [isInternalScanning, setIsInternalScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingRecord, setPendingRecord] = useState<any | null>(null);
  const [lastCapturedImage, setLastCapturedImage] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [prefillProduct, setPrefillProduct] = useState<{name: string, barcode: string} | null>(null);
  const [isSystemOff, setIsSystemOff] = useState(false);
  const [showQuotaError, setShowQuotaError] = useState(false);

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
      daily: 0, weekly: 0, monthly: 0, yearly: 0, 
      dailyInvestment: 0, weeklyInvestment: 0, monthlyInvestment: 0, yearlyInvestment: 0,
      totalSales: 0, aiCredits,
      byCategory: { [Category.ICE]: 0, [Category.BEVERAGE]: 0, [Category.OTHERS]: 0, [Category.SALE]: 0 }
    };

    records.forEach(r => {
      const d = new Date(r.timestamp);
      if (r.type === 'SALE') {
        result.totalSales += r.totalCost;
        if (isSameDay(d, now)) result.daily += r.totalCost;
        if (isSameWeek(d, now)) result.weekly += r.totalCost;
        if (isSameMonth(d, now)) result.monthly += r.totalCost;
        if (isSameYear(d, now)) result.yearly += r.totalCost;
      } else {
        if (isSameDay(d, now)) result.dailyInvestment += r.totalCost;
        if (isSameWeek(d, now)) result.weeklyInvestment += r.totalCost;
        if (isSameMonth(d, now)) result.monthlyInvestment += r.totalCost;
        if (isSameYear(d, now)) result.yearlyInvestment += r.totalCost;
        result.byCategory[r.category] += r.totalCost;
      }
    });
    return result;
  }, [records, aiCredits]);

  const handleCapture = async (base64: string) => {
    setIsCameraOpen(false);
    setLastCapturedImage(`data:image/jpeg;base64,${base64}`);
    await initAudio();
    setIsProcessing(true);
    setPendingRecord(null);

    try {
      const data = await processReceiptImage(base64);
      const finalItems = data.items && data.items.length > 0 
        ? data.items 
        : [{ name: 'รายการจากบิล', quantity: 1, unitPrice: 0, totalPrice: 0 }];

      setPendingRecord({
        ...data,
        items: finalItems,
        iceMetrics: {
          delivered: data.iceMetrics?.delivered || 0,
          returned: data.iceMetrics?.returned || 0
        }
      });
      speakText(`อ่านบิลเรียบร้อยจ้ะ ช่วยยายตรวจดูหน่อยนะ`, persona);
    } catch (err: any) { 
      if (err.message === 'QUOTA_EXCEEDED') {
        setShowQuotaError(true);
        speakText("ยายจ๋า โควต้าสแกนวันนี้หมดแล้วจ้ะ", persona);
      } else {
        speakText("ยายจ๋า บิลนี้อ่านยากจัง ลองพิมพ์เองสักหน่อยนะจ๊ะ", persona); 
        setPendingRecord({
          category: Category.OTHERS,
          items: [{ name: '', quantity: 1, unitPrice: 0, totalPrice: 0 }],
          iceMetrics: { delivered: 0, returned: 0 },
          notes: ''
        });
      }
    } finally { 
      setIsProcessing(false); 
    }
  };

  const handleOpenKeySelector = async () => {
    const success = await openKeySelector();
    if (success) {
      setShowQuotaError(false);
      if (lastCapturedImage) {
        handleCapture(lastCapturedImage.split(',')[1]);
      }
    }
  };

  const saveConfirmedRecord = async () => {
    if (!pendingRecord) return;
    await initAudio();
    const items = pendingRecord.items.filter((i: any) => i.name.trim() !== '');
    const total = items.reduce((a: number, b: any) => a + (parseFloat(b.totalPrice) || 0), 0);
    
    setPosProducts(prev => prev.map(p => {
      const matchedItem = items.find((item: any) => item.name.toLowerCase().trim() === p.name.toLowerCase().trim());
      if (matchedItem) {
        return { ...p, stockQuantity: (p.stockQuantity || 0) + matchedItem.quantity };
      }
      return p;
    }));

    const newRecord: InventoryRecord = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      category: pendingRecord.category as Category,
      items: items,
      totalCost: total,
      iceMetrics: pendingRecord.iceMetrics,
      notes: pendingRecord.notes,
      type: 'INVESTMENT',
      isSynced: syncConfig.isEnabled
    };
    setRecords(prev => [...prev, newRecord]);
    setPendingRecord(null);
    setLastCapturedImage(null);
    speakText(`บันทึกและเพิ่มสต๊อกให้เรียบร้อยแล้วจ้ะยาย`, persona);
    setActiveTab('history');
  };

  const handlePOSSale = (items: any[], total: number) => {
    setPosProducts(prev => prev.map(p => {
      const soldItem = items.find(i => i.product.id === p.id);
      if (soldItem) {
        return { ...p, stockQuantity: Math.max(0, (p.stockQuantity || 0) - soldItem.qty) };
      }
      return p;
    }));

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

  const lowStockProducts = useMemo(() => {
    return posProducts.filter(p => p.stockQuantity <= p.minStockLevel);
  }, [posProducts]);

  const themes = {
    dashboard: { bg: 'bg-blue-50', header: 'bg-blue-600', text: 'text-blue-600', nav: 'text-blue-600', accent: 'bg-blue-600' },
    history: { bg: 'bg-indigo-50', header: 'bg-indigo-600', text: 'text-indigo-600', nav: 'text-indigo-600', accent: 'bg-indigo-600' },
    pos: { bg: 'bg-emerald-50', header: 'bg-emerald-600', text: 'text-emerald-600', nav: 'text-emerald-600', accent: 'bg-emerald-600' },
    manage: { bg: 'bg-amber-50', header: 'bg-amber-600', text: 'text-amber-600', nav: 'text-amber-600', accent: 'bg-amber-600' },
    sync: { bg: 'bg-rose-50', header: 'bg-rose-600', text: 'text-rose-600', nav: 'text-rose-600', accent: 'bg-rose-600' },
  };

  const currentTheme = themes[activeTab];
  const shouldHideNav = isCameraOpen || isInternalScanning;

  const handleTabChange = async (tab: any) => {
    await initAudio();
    setActiveTab(tab);
    const labels: Record<string, string> = {
      dashboard: "ดูภาพรวมร้านนะจ๊ะ",
      history: "ดูประวัติการขายจ้ะ",
      pos: "เปิดร้านขายของแล้วจ้ะ",
      manage: "เข้ามาจัดการหลังร้านจ้ะ",
      sync: "ตั้งค่าระบบนะจ๊ะ"
    };
    speakText(labels[tab], persona);
  };

  return (
    <div className={`max-w-md mx-auto min-h-screen h-screen ${currentTheme.bg} flex flex-col relative overflow-hidden transition-colors duration-500`}>
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0">
        <div className="absolute top-10 -left-10 w-64 h-64 border-[40px] border-black rounded-full"></div>
      </div>

      {activeTab !== 'pos' && (
        <header className={`${currentTheme.header} p-4 pt-10 sticky top-0 z-30 flex justify-between items-center shadow-lg text-white`}>
          <div className="flex items-center gap-3">
            <button onClick={() => { setIsSystemOff(true); speakText("ปิดระบบแล้วนะจ๊ะยาย", persona); }} className="p-2 bg-white/20 rounded-full"><Power size={20} /></button>
            <h1 className="text-xl font-black tracking-tight">คุณยาย <span className="opacity-70">POS</span></h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 px-3 py-1 rounded-full border border-white/30 flex items-center gap-1.5 backdrop-blur-md">
               <Zap size={14} className="text-yellow-300 fill-yellow-300" />
               <span className="text-xs font-black">{aiCredits}</span>
            </div>
            {ownerPhoto && <div className="w-10 h-10 rounded-full border-2 border-white/50 overflow-hidden"><img src={ownerPhoto} className="w-full h-full object-cover" /></div>}
          </div>
        </header>
      )}

      <main className={`flex-1 overflow-y-auto relative z-10 ${activeTab === 'pos' ? '' : 'p-4'}`}>
        {isProcessing && (
          <div className="fixed inset-0 z-[1000] bg-white/80 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
            <div className="relative mb-6">
              <Loader2 className={`w-20 h-20 ${currentTheme.text} animate-spin`} />
              <Sparkles className="absolute -top-2 -right-2 text-yellow-500 animate-bounce" />
            </div>
            <h2 className="text-2xl font-black text-gray-800 tracking-tight">กำลังเพ่งบิลอยู่นะจ๊ะยาย...</h2>
            <p className="text-gray-400 font-bold mt-2">ห้ามปิดหน้านี้นะจ๊ะ</p>
          </div>
        )}

        {/* Low Stock Alert */}
        {lowStockProducts.length > 0 && activeTab === 'dashboard' && (
          <div className="mb-4 bg-red-50 border-2 border-red-100 p-4 rounded-[30px] flex items-center gap-4 animate-bounce-slow">
            <div className="bg-red-500 text-white p-2 rounded-full"><AlertTriangle size={20}/></div>
            <div className="flex-1">
              <p className="text-xs font-black text-red-700">ยายจ๋า ของใกล้หมด {lowStockProducts.length} อย่างนะจ๊ะ</p>
              <p className="text-[10px] font-bold text-red-500 italic">กดดูที่หลังร้านได้เลยจ้ะ</p>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {pendingRecord && (
          <div className="fixed inset-0 z-[2000] bg-black/95 backdrop-blur-2xl flex flex-col p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-md rounded-[50px] p-6 space-y-6 shadow-2xl my-auto mx-auto relative flex flex-col max-h-[95vh] animate-in zoom-in duration-300">
              <div className="shrink-0">
                {lastCapturedImage && (
                  <div className={`w-full overflow-hidden rounded-[30px] border-4 border-blue-50 transition-all cursor-pointer mb-4 ${showImagePreview ? 'h-64' : 'h-16'}`} onClick={() => setShowImagePreview(!showImagePreview)}>
                    <img src={lastCapturedImage} className={`w-full ${showImagePreview ? 'h-full object-contain' : 'h-full object-cover opacity-50'}`} />
                    {!showImagePreview && <div className="absolute inset-0 flex items-center justify-center text-blue-600 font-black text-[10px] uppercase">แตะดูรูปบิล</div>}
                  </div>
                )}
                <div className="text-center space-y-1">
                  <h3 className="text-2xl font-black text-gray-800">ลงของเรียบร้อยจ้ะ</h3>
                  <p className="text-[11px] font-bold text-gray-400 uppercase">ตรวจรายการให้ยายหน่อยนะจ๊ะ</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar min-h-[150px]">
                {pendingRecord.items.map((item: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 p-5 rounded-[35px] border border-gray-100 space-y-4 relative">
                    <button onClick={() => { setPendingRecord({...pendingRecord, items: pendingRecord.items.filter((_:any, i:number) => i !== idx)}); speakText("ลบรายการนี้แล้วจ้ะ", persona); }} className="absolute -top-2 -right-2 bg-red-100 text-red-500 p-2 rounded-full shadow-md"><Trash2 size={16}/></button>
                    <input value={item.name} onChange={e => {const n=[...pendingRecord.items]; n[idx].name=e.target.value; setPendingRecord({...pendingRecord, items:n});}} className="w-full bg-white px-5 py-3 rounded-2xl text-base font-black border border-gray-200 outline-none" />
                    <div className="grid grid-cols-2 gap-4">
                       <input type="number" value={item.quantity} onChange={e => {const n=[...pendingRecord.items]; n[idx].quantity=parseInt(e.target.value)||0; setPendingRecord({...pendingRecord, items:n});}} className="w-full bg-white px-4 py-3 rounded-2xl text-lg font-black text-center" />
                       <input type="number" value={item.totalPrice} onChange={e => {const n=[...pendingRecord.items]; n[idx].totalPrice=parseFloat(e.target.value)||0; setPendingRecord({...pendingRecord, items:n});}} className="w-full bg-blue-50 px-5 py-3 rounded-2xl text-xl font-black text-right text-blue-700" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-100 shrink-0">
                <div className="flex justify-between items-center bg-gray-900 text-white p-6 rounded-[35px] shadow-2xl">
                   <span className="text-xs font-black uppercase opacity-60">ยอดลงทุนรวม</span>
                   <span className="text-3xl font-black">฿{pendingRecord.items.reduce((a:number, b:any)=>a+(parseFloat(b.totalPrice)||0), 0).toLocaleString()}</span>
                </div>
                <button onClick={saveConfirmedRecord} className="w-full bg-blue-600 text-white py-7 rounded-[40px] font-black text-2xl shadow-xl active:scale-95">บันทึกและเพิ่มสต๊อกจ้ะ</button>
                <button onClick={() => { setPendingRecord(null); speakText("ยกเลิกการบันทึกบิลแล้วจ้ะ", persona); }} className="w-full text-gray-400 font-black text-xs">ยกเลิก</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && <Dashboard 
          stats={stats} records={records} currentIceBalance={currentIceBalance} ownerPhoto={ownerPhoto}
          onOpenTopUp={async () => { await initAudio(); setAiCredits(prev => prev + 50); speakText("เติมเหรียญให้แล้วนะจ๊ะ", persona); }} 
          onStartScan={async () => { await initAudio(); setIsCameraOpen(true); speakText("เปิดกล้องสแกนบิลสินค้าจ้ะ", persona); }}
          onStartSale={async () => handleTabChange('pos')} 
          onOpenManage={async () => handleTabChange('manage')}
          hideSensitiveData={syncConfig.role === 'STAFF'} 
        />}
        {activeTab === 'history' && <HistoryList records={records} onDelete={id => { setRecords(prev => prev.filter(r => r.id !== id)); speakText("ลบประวัติรายการนี้แล้วจ้ะ", persona); }} canDelete={syncConfig.role === 'OWNER'} />}
        {activeTab === 'pos' && <POSSystem products={posProducts} onSaleComplete={handlePOSSale} onGoBack={() => handleTabChange('dashboard')} onUnregisteredProduct={(n, b) => {setPrefillProduct({name:n, barcode:b}); setActiveTab('manage');}} persona={persona} onScanningStateChange={setIsInternalScanning} />}
        {activeTab === 'manage' && (
           syncConfig.role === 'OWNER' 
            ? <ProductManager products={posProducts} onSave={p => setPosProducts(v => [...v, p])} onDelete={id => { setPosProducts(prev => prev.filter(p => p.id !== id)); speakText("เอาสินค้าออกจากสมุดแล้วนะจ๊ะ", persona); }} onBack={() => handleTabChange('dashboard')} prefillData={prefillProduct} persona={persona} onScanningStateChange={setIsInternalScanning} />
            : <div className="text-center py-20 text-red-500 font-black">เฉพาะเจ้าของที่เข้าได้นะจ๊ะ</div>
        )}
        {activeTab === 'sync' && <SyncManager config={syncConfig} ownerPhoto={ownerPhoto} onSetPhoto={setOwnerPhoto} onSave={setSyncConfig} onBackup={() => {}} onRestore={() => {}} onCreateMascot={() => {}} onOpenKeySelector={handleOpenKeySelector} />}
      </main>

      {!shouldHideNav && (
        <nav className="shrink-0 bg-white border-t border-gray-100 pb-10 px-4 pt-3 z-[100] shadow-[0_-20px_50px_rgba(0,0,0,0.1)] rounded-t-[50px] flex justify-between items-center animate-in slide-in-from-bottom duration-300">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'ภาพรวม' },
            { id: 'history', icon: History, label: 'ประวัติ' },
            { id: 'pos', icon: Store, label: 'ขายของ' },
            { id: 'manage', icon: Package, label: 'หลังร้าน' },
            { id: 'sync', icon: Cloud, label: 'ตั้งค่า' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)} 
              className={`flex flex-col items-center gap-1.5 flex-1 transition-all ${activeTab === tab.id ? themes[tab.id as keyof typeof themes].text + ' scale-110' : 'text-gray-300'}`}
            >
              <div className={`p-2.5 rounded-2xl ${activeTab === tab.id ? themes[tab.id as keyof typeof themes].bg : ''}`}>
                <tab.icon size={24} strokeWidth={activeTab === tab.id ? 3 : 2} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider">{tab.label}</span>
            </button>
          ))}
        </nav>
      )}

      {isCameraOpen && <CameraUploader onCapture={handleCapture} onCancel={() => { setIsCameraOpen(false); speakText("ปิดกล้องแล้วจ้ะ", persona); }} />}
    </div>
  );
};

export default App;
