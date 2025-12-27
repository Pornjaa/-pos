
export enum Category {
  ICE = 'ICE',
  BEVERAGE = 'BEVERAGE',
  OTHERS = 'OTHERS',
  SALE = 'SALE'
}

export type AiPersona = 'GRANDMA' | 'GIRLFRIEND' | 'BOYFRIEND' | 'PROFESSIONAL';

export interface ProductItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface IceMetrics {
  delivered: number;
  returned: number;
  outstanding: number;
}

export interface InventoryRecord {
  id: string;
  timestamp: number;
  category: Category;
  items: ProductItem[];
  totalCost: number;
  imageUrl?: string;
  notes?: string;
  iceMetrics?: IceMetrics;
  type?: 'INVESTMENT' | 'SALE';
  isSynced?: boolean; 
  deviceId?: string; 
}

export interface SyncConfig {
  shopId: string;
  role: 'OWNER' | 'STAFF';
  isEnabled: boolean;
  lastSync?: number;
  ownerPin?: string;
  aiPersona?: AiPersona;
}

export interface SummaryStats {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
  dailyInvestment: number;
  weeklyInvestment: number;
  monthlyInvestment: number;
  yearlyInvestment: number;
  byCategory: Record<Category, number>;
  totalSales: number;
  aiCredits: number;
}

export interface PosProduct {
  id: string;
  barcode: string;
  name: string;
  price: number;
  costPrice: number;
  imageUrl?: string;
  isRetailProduct?: boolean;
  stockQuantity: number;    // จำนวนคงเหลือปัจจุบัน
  minStockLevel: number;    // จุดที่ต้องเตือนว่าของน้อย
}
