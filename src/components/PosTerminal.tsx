import React, { useState, useEffect, useMemo } from 'react';
import { 
  Scan, Search, Plus, Minus, Trash2, ShoppingBag, 
  CreditCard, Smartphone, Banknote, CheckCircle, 
  ArrowRight, Sparkles, X, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { Product, SaleItem, Sale, User, PaymentMethodType, PaymentDetails } from '../types';
import { formatRwf } from '../utils/formatters';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { ReceiptModal } from './ReceiptModal';

interface PosTerminalProps {
  products: Product[];
  currentUser: User;
  onCompleteSale: (sale: Sale) => void;
}

export const PosTerminal: React.FC<PosTerminalProps> = ({
  products,
  currentUser,
  onCompleteSale,
}) => {
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [scannerOpen, setScannerOpen] = useState(false);
  
  // Checkout Modal State
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('MOMO');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerTin, setCustomerTin] = useState('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // MTN MoMo State
  const [momoPhone, setMomoPhone] = useState('0788771122');
  const [momoProcessing, setMomoProcessing] = useState(false);
  const [momoApproved, setMomoApproved] = useState(false);

  // Visa State
  const [visaCardNumber, setVisaCardNumber] = useState('4111 2222 3333 8829');
  const [visaHolder, setVisaHolder] = useState('JEAN PAUL BIZIMANA');
  const [visaProcessing, setVisaProcessing] = useState(false);
  const [visaApproved, setVisaApproved] = useState(false);

  // Cash State
  const [cashTendered, setCashTendered] = useState<number>(0);

  // Completed Sale for Receipt Printing
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  
  // In-app Toast message (replaces window.alert per iframe guidelines)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Hardware Barcode Scanner listener (captures rapid keystrokes from USB/BT barcode readers ending with Enter)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in regular text inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 100) {
        buffer = ''; // Reset if keystrokes are too slow (human typing)
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 4) {
          handleBarcodeScanned(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [products, cart]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['ALL', ...Array.from(set)];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'ALL' || p.category === selectedCategory;
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.includes(searchQuery) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart calculations
  const subtotalBeforeDiscount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.subtotalRwf, 0);
  }, [cart]);

  const discountAmountRwf = useMemo(() => {
    return Math.round((subtotalBeforeDiscount * discountPercent) / 100);
  }, [subtotalBeforeDiscount, discountPercent]);

  const totalPayableRwf = useMemo(() => {
    return Math.max(0, subtotalBeforeDiscount - discountAmountRwf);
  }, [subtotalBeforeDiscount, discountAmountRwf]);

  // Rwanda 18% VAT included
  const taxAmountRwf = useMemo(() => {
    return Math.round(totalPayableRwf - totalPayableRwf / 1.18);
  }, [totalPayableRwf]);

  const cashChangeRwf = useMemo(() => {
    if (cashTendered >= totalPayableRwf) {
      return cashTendered - totalPayableRwf;
    }
    return 0;
  }, [cashTendered, totalPayableRwf]);

  // Cart actions
  const addToCart = (product: Product) => {
    if (product.currentStock <= 0) {
      showToast(`"${product.name}" is out of stock!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.currentStock) {
          showToast(`Cannot add more than available stock (${product.currentStock} ${product.unit}).`);
          return prev;
        }
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotalRwf: (item.quantity + 1) * item.unitPriceRwf,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          barcode: product.barcode,
          unit: product.unit,
          quantity: 1,
          unitPriceRwf: product.sellingPriceRwf,
          discountPercent: 0,
          subtotalRwf: product.sellingPriceRwf,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (product && nextQty > product.currentStock) {
              showToast(`Cannot exceed available stock of ${product.currentStock}.`);
              return item;
            }
            return {
              ...item,
              quantity: nextQty,
              subtotalRwf: nextQty * item.unitPriceRwf,
            };
          }
          return item;
        })
        .filter(Boolean) as SaleItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleBarcodeScanned = (barcode: string) => {
    const found = products.find(
      (p) => p.barcode === barcode || p.sku.toLowerCase() === barcode.toLowerCase()
    );
    if (found) {
      addToCart(found);
    } else {
      showToast(`No product found matching barcode: ${barcode}`);
    }
  };

  // Open checkout and default cash tendered to total
  const openCheckout = () => {
    if (cart.length === 0) return;
    setCashTendered(totalPayableRwf);
    setMomoApproved(false);
    setVisaApproved(false);
    setCheckoutOpen(true);
  };

  // Simulate MTN MoMo Push Request & Approval
  const handleMomoPushRequest = () => {
    setMomoProcessing(true);
    setMomoApproved(false);

    // Simulate USSD prompt on Rwanda phone
    setTimeout(() => {
      setMomoProcessing(false);
      setMomoApproved(true);
    }, 1500);
  };

  // Simulate Visa Card Processing
  const handleVisaProcess = () => {
    setVisaProcessing(true);
    setVisaApproved(false);

    setTimeout(() => {
      setVisaProcessing(false);
      setVisaApproved(true);
    }, 1200);
  };

  // Finalize Sale
  const handleFinalizeSale = () => {
    if (paymentMethod === 'MOMO' && !momoApproved) {
      showToast('Please send and approve the MTN MoMo push payment first.');
      return;
    }
    if (paymentMethod === 'VISA' && !visaApproved) {
      showToast('Please process the Visa card transaction first.');
      return;
    }
    if (paymentMethod === 'CASH' && cashTendered < totalPayableRwf) {
      showToast('Tendered cash amount is less than total payable.');
      return;
    }

    const timestamp = new Date().toISOString();
    const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
    const ebmNum = `RRA-EBM-${Math.floor(100000 + Math.random() * 900000)}`;

    const paymentDetails: PaymentDetails = {
      cashTenderedRwf: paymentMethod === 'CASH' ? cashTendered : undefined,
      cashChangeRwf: paymentMethod === 'CASH' ? cashChangeRwf : undefined,
      momoPhone: paymentMethod === 'MOMO' ? momoPhone : undefined,
      momoTransactionId:
        paymentMethod === 'MOMO'
          ? `MP${new Date().toISOString().slice(2, 10).replace(/-/g, '')}.${Math.floor(1000 + Math.random() * 9000)}`
          : undefined,
      momoStatus: paymentMethod === 'MOMO' ? 'SUCCESS' : undefined,
      momoPromptCode:
        paymentMethod === 'MOMO'
          ? `*182*8*1*550212*${totalPayableRwf}#`
          : undefined,
      visaCardNumberMasked:
        paymentMethod === 'VISA' ? visaCardNumber.slice(0, 4) + ' **** **** ' + visaCardNumber.slice(-4) : undefined,
      visaAuthCode:
        paymentMethod === 'VISA' ? `AUTH-${Math.floor(10000 + Math.random() * 90000)}` : undefined,
      visaCardHolder: paymentMethod === 'VISA' ? visaHolder : undefined,
    };

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      invoiceNumber: invoiceNum,
      ebmReceiptNumber: ebmNum,
      items: [...cart],
      subtotalRwf: subtotalBeforeDiscount,
      taxRatePercent: 18,
      taxAmountRwf: taxAmountRwf,
      discountRwf: discountAmountRwf,
      totalRwf: totalPayableRwf,
      paymentMethod,
      paymentDetails,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      customerTin: customerTin.trim() || undefined,
      timestamp,
    };

    onCompleteSale(newSale);
    setCart([]);
    setCheckoutOpen(false);
    setCompletedSale(newSale);
    setReceiptOpen(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl shadow-2xl flex items-center gap-2 border border-rose-400 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* LEFT: Product Catalog & Barcode Scanner Area (8 Cols) */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 overflow-hidden">
        {/* Top Search & Barcode Trigger */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products by name, SKU or scan barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={() => setScannerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-950/40"
          >
            <Scan className="w-4 h-4" />
            <span>Scan Barcode</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 text-xs font-medium no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700/80 border border-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 pr-1">
          {filteredProducts.map((prod) => {
            const isOutOfStock = prod.currentStock <= 0;
            const isLowStock = prod.currentStock <= prod.minStockLevel;

            return (
              <div
                key={prod.id}
                onClick={() => !isOutOfStock && addToCart(prod)}
                className={`relative flex flex-col justify-between p-3 rounded-xl border transition-all select-none cursor-pointer ${
                  isOutOfStock
                    ? 'bg-slate-950/40 border-slate-800 opacity-60 cursor-not-allowed'
                    : 'bg-slate-900 hover:bg-slate-800/90 border-slate-800 hover:border-slate-700 hover:shadow-lg'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono text-slate-500 truncate">{prod.sku}</span>
                    {isOutOfStock ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        Out of stock
                      </span>
                    ) : isLowStock ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Low: {prod.currentStock} {prod.unit}
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        {prod.currentStock} {prod.unit}
                      </span>
                    )}
                  </div>

                  <h4 className="font-semibold text-white text-xs leading-snug line-clamp-2">
                    {prod.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{prod.barcode}</p>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800">
                  <span className="text-sm font-extrabold text-emerald-400">
                    {formatRwf(prod.sellingPriceRwf)}
                  </span>
                  <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Plus className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Cart & Checkout Summary (4-5 Cols) */}
      <div className="lg:col-span-5 xl:col-span-4 flex flex-col bg-slate-900 p-5 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        {/* Cart Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Current Cart</h3>
              <p className="text-xs text-slate-400">{cart.length} item(s) selected</p>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-rose-400 hover:text-rose-300 hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80 my-3 pr-1">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
              <Scan className="w-12 h-12 text-slate-700 stroke-1 animate-pulse" />
              <p className="text-sm font-medium text-slate-400">Your cart is empty</p>
              <p className="text-xs text-slate-600 max-w-xs">
                Scan barcodes with the camera, hardware reader, or click any product to begin sale.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h5 className="text-xs font-semibold text-white truncate">{item.productName}</h5>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {formatRwf(item.unitPriceRwf)} / {item.unit}
                  </p>
                </div>

                {/* Stepper */}
                <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-1">
                  <button
                    onClick={() => updateQuantity(item.productId, -1)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold text-white w-6 text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.productId, 1)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Subtotal */}
                <div className="text-right min-w-[70px]">
                  <span className="text-xs font-bold text-white block">
                    {formatRwf(item.subtotalRwf)}
                  </span>
                  <button
                    onClick={() => removeFromCart(item.productId)}
                    className="text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3 h-3 ml-auto" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pricing & Checkout Summary */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          {/* Discount input */}
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Special Discount</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                className="w-12 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-right text-xs text-white"
              />
              <span>%</span>
            </div>
          </div>

          <div className="flex justify-between text-xs text-slate-400">
            <span>Subtotal</span>
            <span>{formatRwf(subtotalBeforeDiscount)}</span>
          </div>

          <div className="flex justify-between text-xs text-slate-400">
            <span>Rwanda VAT (18% included)</span>
            <span>{formatRwf(taxAmountRwf)}</span>
          </div>

          {discountAmountRwf > 0 && (
            <div className="flex justify-between text-xs text-emerald-400">
              <span>Discount Amount</span>
              <span>-{formatRwf(discountAmountRwf)}</span>
            </div>
          )}

          <div className="flex justify-between items-baseline pt-2 border-t border-slate-800 text-white">
            <span className="text-sm font-semibold">Total Amount</span>
            <span className="text-xl font-extrabold text-emerald-400">
              {formatRwf(totalPayableRwf)}
            </span>
          </div>

          {/* Charge Button */}
          <button
            onClick={openCheckout}
            disabled={cart.length === 0}
            className={`w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
              cart.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/60'
            }`}
          >
            <span>Proceed to Payment</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CHECKOUT PAYMENT MODAL */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col my-8 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
              <div>
                <h3 className="font-bold text-white text-base">Complete Payment</h3>
                <p className="text-xs text-slate-400">Select payment method in Rwandan Francs (RWF)</p>
              </div>
              <button
                onClick={() => setCheckoutOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Display */}
            <div className="bg-slate-950 p-4 border-b border-slate-800 text-center">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Total Due</span>
              <p className="text-3xl font-black text-emerald-400 mt-1">{formatRwf(totalPayableRwf)}</p>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="grid grid-cols-3 p-3 gap-2 border-b border-slate-800 bg-slate-900/50">
              <button
                type="button"
                onClick={() => setPaymentMethod('MOMO')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  paymentMethod === 'MOMO'
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-5 h-5 mb-1 text-amber-400" />
                <span className="text-xs font-bold">MTN MoMo</span>
                <span className="text-[10px] text-slate-500">Mobile Money</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('VISA')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  paymentMethod === 'VISA'
                    ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="w-5 h-5 mb-1 text-blue-400" />
                <span className="text-xs font-bold">Visa Card</span>
                <span className="text-[10px] text-slate-500">Debit / Credit</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Banknote className="w-5 h-5 mb-1 text-emerald-400" />
                <span className="text-xs font-bold">Cash in RWF</span>
                <span className="text-[10px] text-slate-500">Banknotes</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6 space-y-4">
              {/* Optional Customer Information */}
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-800/80">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase">
                    Customer Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Marie Claire"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase">
                    Customer TIN (for RRA Tax)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 100481928"
                    value={customerTin}
                    onChange={(e) => setCustomerTin(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* 1. MTN MoMo Section */}
              {paymentMethod === 'MOMO' && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 text-xs">
                    <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" /> MTN Mobile Money Rwanda Gateway
                    </p>
                    <p className="text-slate-300">
                      Merchant Code: <span className="font-mono font-bold text-white">550212</span> (KigaliStock POS)
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      USSD String: *182*8*1*550212*{totalPayableRwf}#
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Customer MTN Phone Number
                    </label>
                    <div className="flex gap-2">
                      <span className="inline-flex items-center px-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
                        🇷🇼 +250
                      </span>
                      <input
                        type="text"
                        placeholder="788 123 456"
                        value={momoPhone}
                        onChange={(e) => setMomoPhone(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* MoMo Status and Action */}
                  <div className="pt-2">
                    {momoApproved ? (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-400">
                        <span className="flex items-center gap-2 font-semibold">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          Payment Approved by MTN Rwanda!
                        </span>
                        <span className="font-mono text-[10px] text-emerald-300">
                          Ref: MP2609.{Math.floor(1000 + Math.random() * 9000)}
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleMomoPushRequest}
                        disabled={momoProcessing}
                        className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                      >
                        {momoProcessing ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Pushing USSD Prompt to Customer Phone...</span>
                          </>
                        ) : (
                          <>
                            <Smartphone className="w-4 h-4" />
                            <span>Send MoMo Push Prompt ({formatRwf(totalPayableRwf)})</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 2. Visa Card Section */}
              {paymentMethod === 'VISA' && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-1 text-xs">
                    <p className="font-semibold text-blue-300 flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4" /> Visa EMV / Contactless Terminal
                    </p>
                    <p className="text-slate-300">
                      Supports Visa Chip, PayWave NFC, and Magnetic Stripe in Rwandan Francs.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Card Number
                      </label>
                      <input
                        type="text"
                        value={visaCardNumber}
                        onChange={(e) => setVisaCardNumber(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400">
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          value={visaHolder}
                          onChange={(e) => setVisaHolder(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-400">
                          Expiry / CVV
                        </label>
                        <input
                          type="text"
                          defaultValue="08/29 - ***"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    {visaApproved ? (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-400">
                        <span className="flex items-center gap-2 font-semibold">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          Visa Transaction Authorized!
                        </span>
                        <span className="font-mono text-[10px] text-emerald-300">
                          Auth: AUTH-{Math.floor(10000 + Math.random() * 90000)}
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleVisaProcess}
                        disabled={visaProcessing}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                      >
                        {visaProcessing ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Contacting Visa Terminal Gateway...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            <span>Authorize Card ({formatRwf(totalPayableRwf)})</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Cash in RWF Section */}
              {paymentMethod === 'CASH' && (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs space-y-1">
                    <p className="font-semibold text-emerald-300 flex items-center gap-1.5">
                      <Banknote className="w-4 h-4" /> Rwandan Francs (RWF) Cash Register
                    </p>
                    <p className="text-slate-300">
                      Enter cash tendered or click quick banknote denominations below.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Cash Tendered by Customer (RWF)
                    </label>
                    <input
                      type="number"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-lg font-bold text-emerald-400 font-mono"
                    />
                  </div>

                  {/* Banknote Shortcut Buttons */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                      Quick Rwandan Banknote Presets:
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {[1000, 2000, 5000, 10000, 20000, 50000].map((bill) => (
                        <button
                          key={bill}
                          type="button"
                          onClick={() => setCashTendered(bill)}
                          className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-mono font-semibold text-slate-200 transition-colors"
                        >
                          {bill.toLocaleString()} Frw
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setCashTendered(totalPayableRwf)}
                        className="col-span-2 py-1.5 px-2 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-xs font-bold text-emerald-300"
                      >
                        Exact Amount ({formatRwf(totalPayableRwf)})
                      </button>
                    </div>
                  </div>

                  {/* Change Calculation */}
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Change to Return</span>
                      <span className="text-base font-extrabold text-white font-mono">
                        {formatRwf(cashChangeRwf)}
                      </span>
                    </div>
                    {cashTendered < totalPayableRwf && (
                      <span className="text-xs text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Remaining: {formatRwf(totalPayableRwf - cashTendered)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCheckoutOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800"
              >
                Back to Cart
              </button>

              <button
                type="button"
                onClick={handleFinalizeSale}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 transition-colors"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Complete Sale & Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleBarcodeScanned}
        products={products}
      />

      {/* Receipt & Invoice Modal */}
      <ReceiptModal
        sale={completedSale}
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
      />
    </div>
  );
};
