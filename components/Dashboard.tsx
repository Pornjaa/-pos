
import React from 'react';
import { InventoryRecord, SummaryStats, Category } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Package, Droplets, CreditCard, Zap, PlusCircle, Camera, Store, Shield, Sparkles, User, Settings, ArrowRight } from 'lucide-react';

interface DashboardProps {
  records: InventoryRecord[];
  stats: SummaryStats;
  currentIceBalance: number;
  ownerPhoto?: string | null;
  onOpenTopUp: () => void;
  onStartScan: () => void;
  onStartSale: () => void;
  onOpenManage: () => void;
  hideSensitiveData?: boolean;
}

const COLORS: Record<Category, string> = {
  [Category.ICE]: '#3b82f6',
  [Category.BEVERAGE]: '#10b981',
  [Category.OTHERS]: '#f59e0b',
  [Category.SALE]: '#10b981',
};

const Dashboard: React.FC<DashboardProps> = ({ stats, currentIceBalance, ownerPhoto, onOpenTopUp, onStartScan, onStartSale, onOpenManage, hideSensitiveData }) => {
  const chartData = Object.entries(stats.byCategory).map(([key, value]) => ({
    name: key,
    amount: value,
  }));

  const getCreditColor = (credits: number) => {
    if (credits > 50) return 'text-green-500';
    if (credits > 10) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom duration-500">
      {/* Mascot Hero Area */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-800 rounded-[50px] p-8 text-white relative overflow-hidden shadow-2xl border-b-8 border-indigo-900/30">
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full border-4 border-white/40 overflow-hidden bg-white/20 shrink-0 shadow-[0_0_30px_rgba(255,255,255,0.2)] animate-in zoom-in duration-700">
              {ownerPhoto ? (
                <img src={ownerPhoto} className="w-full h-full object-cover" alt="คุณยายเจ้าของร้าน" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={40} className="opacity-50" />
                </div>
              )}
            </div>
            <div>
              <p className="text-blue-100 font-black text-sm uppercase tracking-widest opacity-80 mb-1">ยินดีต้อนรับจ้ะยาย!</p>
              <h2 className="text-3xl font-black leading-tight">วันนี้รวยๆ นะจ๊ะ!</h2>
              <div className="mt-2 flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/20 w-fit">
                 <Sparkles size={14} className="text-yellow-300" />
                 <span className="text-[10px] font-black uppercase tracking-widest">เปิดร้านเรียบร้อยจ้ะ</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {!hideSensitiveData && (
              <button 
                onClick={onOpenManage}
                className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl p-4 flex items-center justify-center gap-2 border border-white/20 transition-all active:scale-95"
              >
                <Settings size={18} />
                <span className="font-black text-xs">ตั้งค่าร้าน</span>
              </button>
            )}
            <div className="flex-1 bg-white text-blue-700 rounded-2xl p-4 flex flex-col items-center justify-center shadow-lg">
               <p className="text-[9px] font-black uppercase opacity-60">ยอดขายวันนี้</p>
               <p className="text-xl font-black">฿{stats.daily.toLocaleString()}</p>
            </div>
          </div>
        </div>
        
        {/* Decorations */}
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12"><Store size={120} /></div>
      </div>

      {/* AI Token Card */}
      <div className="bg-white p-6 rounded-[40px] shadow-xl border border-gray-100 flex items-center justify-between group">
        <div className="flex items-center gap-5">
          <div className={`p-5 rounded-3xl bg-gray-50 ${getCreditColor(stats.aiCredits)} shadow-inner group-hover:scale-110 transition-transform`}>
            <Zap size={32} fill="currentColor" className="animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">คุณยายโทเค็น</p>
            <h3 className={`text-4xl font-black ${getCreditColor(stats.aiCredits)}`}>
              {stats.aiCredits} <span className="text-sm font-bold opacity-60">เหลืออยู่</span>
            </h3>
          </div>
        </div>
        {!hideSensitiveData && (
          <button onClick={onOpenTopUp} className="bg-blue-50 p-4 rounded-full text-blue-600 active:scale-90 transition-all hover:bg-blue-100">
            <PlusCircle size={40} />
          </button>
        )}
      </div>

      {/* Main Actions Area */}
      <div className="space-y-4">
        <button 
          onClick={onStartScan}
          className="w-full bg-blue-600 text-white p-8 rounded-[40px] shadow-[0_20px_40px_rgba(37,99,235,0.3)] flex items-center justify-between active:scale-95 transition-all group overflow-hidden relative"
        >
          <div className="flex items-center gap-6 relative z-10">
            <div className="bg-white/20 p-5 rounded-3xl shadow-lg backdrop-blur-md group-hover:rotate-12 transition-transform"><Camera size={40} /></div>
            <div className="text-left">
              <h3 className="text-2xl font-black leading-tight">สแกนบิลลงของ</h3>
              <p className="text-sm opacity-80 font-bold">ใช้ AI อ่านข้อมูลให้ยายจ้ะ</p>
            </div>
          </div>
          <ArrowRight className="opacity-30 group-hover:translate-x-2 transition-transform" size={40} />
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-xl"></div>
        </button>
        
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={onStartSale}
            className="bg-white border-4 border-emerald-50 text-gray-800 p-6 rounded-[40px] shadow-lg flex flex-col items-center justify-center gap-3 active:scale-95 transition-all hover:border-emerald-200"
          >
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center shadow-inner">
               <Store size={32} />
            </div>
            <span className="text-lg font-black text-emerald-800">เปิดร้านขายของ</span>
          </button>
          {!hideSensitiveData && (
            <button 
              onClick={onOpenManage}
              className="bg-white border-4 border-amber-50 text-gray-800 p-6 rounded-[40px] shadow-lg flex flex-col items-center justify-center gap-3 active:scale-95 transition-all hover:border-amber-200"
            >
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center shadow-inner">
                 <Package size={32} />
              </div>
              <span className="text-lg font-black text-amber-800">จัดการหลังร้าน</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-600 text-white p-6 rounded-[40px] flex flex-col justify-between aspect-square shadow-xl relative overflow-hidden">
          <CreditCard className="w-10 h-10 opacity-30" />
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">ยอดลงทุนวันนี้</p>
            <h3 className="text-3xl font-black">฿{stats.dailyInvestment.toLocaleString()}</h3>
          </div>
          <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/10 rounded-full"></div>
        </div>
        <div className="bg-white p-6 rounded-[40px] shadow-lg border border-gray-50 flex flex-col justify-between aspect-square relative overflow-hidden">
          <Droplets className="w-10 h-10 text-blue-500 opacity-20" />
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">น้ำแข็งค้างส่ง</p>
            <h3 className="text-3xl font-black text-gray-800">{currentIceBalance} <span className="text-sm opacity-40">กระสอบ</span></h3>
          </div>
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-[40px]"></div>
        </div>
      </div>

      {/* Charts & Locked View */}
      {!hideSensitiveData ? (
        <div className="bg-white p-8 rounded-[40px] shadow-xl border border-gray-100 space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-gray-800 flex items-center gap-3 text-sm tracking-widest uppercase">
              <TrendingUp className="w-5 h-5 text-blue-600" /> สถิติการลงทุน
            </h4>
            <div className="flex gap-1">
              {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-100"></div>)}
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  formatter={(value: number) => [`฿${value.toLocaleString()}`, 'ยอดเงิน']}
                  contentStyle={{ borderRadius: '30px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '16px' }}
                />
                <Bar dataKey="amount" radius={[12, 12, 12, 12]} barSize={45}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name as Category] || '#E2E8F0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-gray-100/50 backdrop-blur-md p-8 rounded-[40px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-4">
          <div className="p-4 bg-white rounded-full shadow-sm text-gray-300">
            <Shield size={40} />
          </div>
          <p className="text-sm font-black text-gray-400 italic text-center leading-relaxed">ข้อมูลสรุปถูกล็อคไว้จ้ะยาย<br/>เฉพาะเจ้าของที่ดูได้นะจ๊ะ</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;