
import React from 'react';
import { InventoryRecord, Category } from '../types';
import { format } from 'date-fns';
import { Package, Droplets, Trash2, ChevronRight, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface HistoryListProps {
  records: InventoryRecord[];
  onDelete: (id: string) => void;
  canDelete?: boolean;
}

const HistoryList: React.FC<HistoryListProps> = ({ records, onDelete, canDelete }) => {
  const sortedRecords = [...records].sort((a, b) => b.timestamp - a.timestamp);

  const getIcon = (cat: Category) => {
    switch(cat) {
      case Category.ICE: return <Droplets className="w-5 h-5 text-blue-500" />;
      case Category.BEVERAGE: return <Package className="w-5 h-5 text-green-500" />;
      case Category.SALE: return <Package className="w-5 h-5 text-orange-500" />;
      default: return <Package className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {sortedRecords.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p>ยังไม่มีข้อมูลบันทึก</p>
        </div>
      )}
      {sortedRecords.map((record) => (
        <div key={record.id} className="bg-white p-4 rounded-[30px] shadow-sm border border-gray-100 flex gap-4 animate-in fade-in slide-in-from-left duration-300">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 border border-gray-100 shadow-inner">
            {getIcon(record.category)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-black text-gray-800 truncate tracking-tight">
                {record.type === 'SALE' ? 'ขายของ' : (record.category === Category.ICE ? 'ลงน้ำแข็ง' : record.category === Category.BEVERAGE ? 'ลงเครื่องดื่ม' : 'ลงของอื่นๆ')}
              </h4>
              <p className={`text-sm font-black ${record.type === 'SALE' ? 'text-green-600' : 'text-blue-600'}`}>฿{record.totalCost.toLocaleString()}</p>
            </div>
            <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">{format(record.timestamp, 'dd MMM yyyy HH:mm')}</p>
            
            {/* Ice Metrics Display */}
            {record.iceMetrics && (record.iceMetrics.delivered > 0 || record.iceMetrics.returned > 0) && (
              <div className="flex gap-2 mb-3">
                <div className="bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-1">
                  <ArrowDownLeft size={10} className="text-blue-600" />
                  <span className="text-[10px] font-black text-blue-700">ส่ง: {record.iceMetrics.delivered}</span>
                </div>
                <div className="bg-orange-50 px-2 py-1 rounded-lg flex items-center gap-1">
                  <ArrowUpRight size={10} className="text-orange-600" />
                  <span className="text-[10px] font-black text-orange-700">คืน: {record.iceMetrics.returned}</span>
                </div>
                <div className="bg-gray-50 px-2 py-1 rounded-lg">
                   <span className="text-[10px] font-black text-gray-400">ค้าง: {record.iceMetrics.delivered - record.iceMetrics.returned}</span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-1">
              {record.items.map((item, idx) => (
                <span key={idx} className="text-[10px] bg-gray-50 px-2 py-1 rounded-full text-gray-600 font-bold border border-gray-100">
                  {item.name} x{item.quantity}
                </span>
              ))}
            </div>
          </div>
          {canDelete && (
            <button 
              onClick={() => {
                if (confirm('ยืนยันการลบรายการนี้?')) onDelete(record.id);
              }}
              className="p-2 text-gray-200 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default HistoryList;
