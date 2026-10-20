/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar, TabType } from './components/Navbar';
import { PosTerminal } from './components/PosTerminal';
import { InventoryManager } from './components/InventoryManager';
import { StockMovementManager } from './components/StockMovementManager';
import { InvoicesList } from './components/InvoicesList';
import { AiAssistant } from './components/AiAssistant';
import { PostgresPythonHub } from './components/PostgresPythonHub';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_SUPPLIERS, 
  INITIAL_USERS, 
  INITIAL_MOVEMENTS, 
  INITIAL_SALES 
} from './data/mockData';
import { Product, Supplier, User, StockMovement, Sale, MovementReason } from './types';

export default function App() {
  // Initialize state with LocalStorage caching
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('kigalistock_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem('kigalistock_suppliers');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  const [users] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('kigalistock_user');
    return saved ? JSON.parse(saved) : INITIAL_USERS[0];
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    const saved = localStorage.getItem('kigalistock_movements');
    return saved ? JSON.parse(saved) : INITIAL_MOVEMENTS;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('kigalistock_sales');
    return saved ? JSON.parse(saved) : INITIAL_SALES;
  });

  const [activeTab, setActiveTab] = useState<TabType>('POS');
  const [globalScannerOpen, setGlobalScannerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((prev) => (prev === msg ? null : prev)), 4000);
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('kigalistock_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('kigalistock_movements', JSON.stringify(movements));
  }, [movements]);

  useEffect(() => {
    localStorage.setItem('kigalistock_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('kigalistock_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // Complete POS Sale
  const handleCompleteSale = (newSale: Sale) => {
    // 1. Deduct Stock for each sale item
    setProducts((prev) =>
      prev.map((prod) => {
        const cartItem = newSale.items.find((item) => item.productId === prod.id);
        if (cartItem) {
          return {
            ...prod,
            currentStock: Math.max(0, prod.currentStock - cartItem.quantity),
            updatedAt: new Date().toISOString(),
          };
        }
        return prod;
      })
    );

    // 2. Record Stock Movements for each item
    const newMovements: StockMovement[] = newSale.items.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const prevStock = prod ? prod.currentStock : 0;
      return {
        id: `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId: item.productId,
        productName: item.productName,
        barcode: item.barcode,
        type: 'OUT',
        reason: 'SALE',
        quantity: item.quantity,
        previousStock: prevStock,
        newStock: Math.max(0, prevStock - item.quantity),
        unitCostRwf: prod?.purchasePriceRwf || 0,
        referenceNo: newSale.invoiceNumber,
        performedBy: `${currentUser.name} (${currentUser.role})`,
        notes: `POS sale payment via ${newSale.paymentMethod}`,
        timestamp: newSale.timestamp,
      };
    });

    setMovements((prev) => [...newMovements, ...prev]);
    setSales((prev) => [newSale, ...prev]);
  };

  // Stock In (Receiving)
  const handleStockIn = (data: {
    productId: string;
    quantity: number;
    unitCostRwf: number;
    supplierId?: string;
    referenceNo: string;
    batchNumber?: string;
    expiryDate?: string;
    notes?: string;
  }) => {
    const product = products.find((p) => p.id === data.productId);
    if (!product) return;

    const prevStock = product.currentStock;
    const nextStock = prevStock + data.quantity;
    const supplier = suppliers.find((s) => s.id === data.supplierId);

    // Update Product
    setProducts((prev) =>
      prev.map((p) =>
        p.id === data.productId
          ? {
              ...p,
              currentStock: nextStock,
              purchasePriceRwf: data.unitCostRwf,
              expiryDate: data.expiryDate || p.expiryDate,
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );

    // Record Movement
    const newMovement: StockMovement = {
      id: `mov-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      barcode: product.barcode,
      type: 'IN',
      reason: 'PURCHASE_RECEIPT',
      quantity: data.quantity,
      previousStock: prevStock,
      newStock: nextStock,
      unitCostRwf: data.unitCostRwf,
      referenceNo: data.referenceNo,
      supplierId: data.supplierId,
      supplierName: supplier?.name,
      batchNumber: data.batchNumber,
      expiryDate: data.expiryDate,
      performedBy: `${currentUser.name} (${currentUser.role})`,
      notes: data.notes,
      timestamp: new Date().toISOString(),
    };

    setMovements((prev) => [newMovement, ...prev]);
  };

  // Stock Out (Adjustment/Damaged/Expired)
  const handleStockOut = (data: {
    productId: string;
    quantity: number;
    reason: MovementReason;
    referenceNo: string;
    notes?: string;
  }) => {
    const product = products.find((p) => p.id === data.productId);
    if (!product) return;

    const prevStock = product.currentStock;
    const nextStock = Math.max(0, prevStock - data.quantity);

    // Update Product
    setProducts((prev) =>
      prev.map((p) =>
        p.id === data.productId
          ? {
              ...p,
              currentStock: nextStock,
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );

    // Record Movement
    const newMovement: StockMovement = {
      id: `mov-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      barcode: product.barcode,
      type: 'OUT',
      reason: data.reason,
      quantity: data.quantity,
      previousStock: prevStock,
      newStock: nextStock,
      unitCostRwf: product.purchasePriceRwf,
      referenceNo: data.referenceNo,
      performedBy: `${currentUser.name} (${currentUser.role})`,
      notes: data.notes,
      timestamp: new Date().toISOString(),
    };

    setMovements((prev) => [newMovement, ...prev]);
  };

  // Product CRUD
  const handleAddProduct = (newProd: Product) => {
    setProducts((prev) => [newProd, ...prev]);
  };

  const handleUpdateProduct = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleDeleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  // Trigger Reorder from AI
  const handleTriggerReorder = (productId: string, qty: number) => {
    const prod = products.find((p) => p.id === productId);
    if (prod) {
      handleStockIn({
        productId: prod.id,
        quantity: qty,
        unitCostRwf: prod.purchasePriceRwf,
        referenceNo: `AI-PO-${Date.now().toString().slice(-5)}`,
        notes: 'Auto replenishment recommended by Gemini 3.8 Flash',
      });
      showToast(`Replenishment order for ${qty} ${prod.unit} of "${prod.name}" processed!`);
      setActiveTab('MOVEMENTS');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-400 animate-in fade-in">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-75">
            &times;
          </button>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        currentUser={currentUser}
        users={users}
        onSwitchUser={setCurrentUser}
        onOpenScanner={() => setGlobalScannerOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'POS' && (
          <PosTerminal
            products={products}
            currentUser={currentUser}
            onCompleteSale={handleCompleteSale}
          />
        )}

        {activeTab === 'INVENTORY' && (
          <InventoryManager
            products={products}
            suppliers={suppliers}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {activeTab === 'MOVEMENTS' && (
          <StockMovementManager
            products={products}
            suppliers={suppliers}
            movements={movements}
            currentUser={currentUser}
            onStockIn={handleStockIn}
            onStockOut={handleStockOut}
          />
        )}

        {activeTab === 'INVOICES' && <InvoicesList sales={sales} />}

        {activeTab === 'AI' && (
          <AiAssistant
            products={products}
            sales={sales}
            movements={movements}
            onTriggerReorder={handleTriggerReorder}
          />
        )}

        {activeTab === 'POSTGRES_HUB' && <PostgresPythonHub />}
      </main>

      {/* Global Barcode Scanner Modal (Triggerable anywhere) */}
      <BarcodeScannerModal
        isOpen={globalScannerOpen}
        onClose={() => setGlobalScannerOpen(false)}
        onScan={(barcode) => {
          const found = products.find(
            (p) => p.barcode === barcode || p.sku.toLowerCase() === barcode.toLowerCase()
          );
          if (found) {
            showToast(`Found product: ${found.name} (${found.currentStock} in stock, ${found.sellingPriceRwf.toLocaleString()} Frw)`);
            setActiveTab('INVENTORY');
          } else {
            showToast(`No product found with barcode "${barcode}".`);
          }
        }}
        products={products}
      />
    </div>
  );
}
