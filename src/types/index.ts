export type UserRole = 'admin' | 'manager' | 'cashier';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  avatar?: string;
  active: boolean;
}

export type UnitType = 'pcs' | 'kg' | 'box' | 'litres' | 'pack' | 'can' | 'bottle';

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  description: string;
  unit: UnitType;
  purchasePriceRwf: number;
  sellingPriceRwf: number;
  currentStock: number;
  minStockLevel: number;
  supplierId: string;
  expiryDate?: string;
  location?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export type MovementReason = 
  | 'PURCHASE_RECEIPT' 
  | 'RETURN_IN' 
  | 'SALE' 
  | 'DAMAGED' 
  | 'EXPIRED' 
  | 'INTERNAL_USE' 
  | 'STOCK_COUNT_ADJUSTMENT' 
  | 'THEFT_LOSS';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  barcode: string;
  type: MovementType;
  reason: MovementReason;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCostRwf: number;
  referenceNo: string;
  supplierId?: string;
  supplierName?: string;
  batchNumber?: string;
  expiryDate?: string;
  performedBy: string;
  notes?: string;
  timestamp: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  tinNumber: string;
  address: string;
  category: string;
}

export type PaymentMethodType = 'CASH' | 'MOMO' | 'VISA' | 'SPLIT';

export interface PaymentDetails {
  cashTenderedRwf?: number;
  cashChangeRwf?: number;
  momoPhone?: string;
  momoTransactionId?: string;
  momoStatus?: 'SUCCESS' | 'PENDING' | 'FAILED';
  momoPromptCode?: string;
  visaCardNumberMasked?: string;
  visaAuthCode?: string;
  visaCardHolder?: string;
  splitDetails?: {
    cashAmount?: number;
    momoAmount?: number;
    visaAmount?: number;
  };
}

export interface SaleItem {
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  unit: UnitType;
  quantity: number;
  unitPriceRwf: number;
  discountPercent: number;
  subtotalRwf: number;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  ebmReceiptNumber: string;
  items: SaleItem[];
  subtotalRwf: number;
  taxRatePercent: number; // typically 18% in Rwanda
  taxAmountRwf: number;
  discountRwf: number;
  totalRwf: number;
  paymentMethod: PaymentMethodType;
  paymentDetails: PaymentDetails;
  cashierId: string;
  cashierName: string;
  customerName?: string;
  customerPhone?: string;
  customerTin?: string;
  timestamp: string;
  notes?: string;
}

export interface AiStockForecast {
  productId: string;
  productName: string;
  currentStock: number;
  avgDailySales: number;
  daysUntilStockout: number;
  recommendedOrderQty: number;
  priority: 'CRITICAL' | 'WARNING' | 'HEALTHY';
  reasoning: string;
}

export interface AiInventoryHealthAudit {
  overallHealthScore: number;
  summary: string;
  criticalAlerts: string[];
  reorderRecommendations: {
    productName: string;
    suggestedQty: number;
    estimatedCostRwf: number;
    urgency: string;
  }[];
  slowMovers: string[];
  nearExpiryRisks: {
    productName: string;
    expiryDate: string;
    stockCount: number;
  }[];
}
