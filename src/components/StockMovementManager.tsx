import React, { useState } from 'react';
import { 
  ArrowDownLeft, ArrowUpRight, PlusCircle, MinusCircle, 
  Search, Calendar, Filter, FileText, CheckCircle2, AlertCircle, X 
} from 'lucide-react';
import { Product, StockMovement, Supplier, User, MovementType, MovementReason } from '../types';
import { formatRwf, formatDateTime } from '../utils/formatters';

interface StockMovementManagerProps {
  products: Product[];
  suppliers: Supplier[];
  movements: StockMovement[];
  currentUser: User;
  onStockIn: (data: {
    productId: string;
    quantity: number;
    unitCostRwf: number;
    supplierId?: string;
    referenceNo: string;
    batchNumber?: string;
    expiryDate?: string;
    notes?: string;
  }) => void;
  onStockOut: (data: {
    productId: string;
    quantity: number;
    reason: MovementReason;
    referenceNo: string;
    notes?: string;
  }) => void;
}

export const StockMovementManager: React.FC<StockMovementManagerProps> = ({
  products,
  suppliers,
  movements,
  currentUser,
  onStockIn,
  onStockOut,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  
  // Modals
  const [stockInModalOpen, setStockInModalOpen] = useState(false);
  const [stockOutModalOpen, setStockOutModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((prev) => (prev === msg ? null : prev)), 3500);
  };

  // Stock In Form
  const [inProdId, setInProdId] = useState(products[0]?.id || '');
  const [inQty, setInQty] = useState<number>(10);
  const [inCostRwf, setInCostRwf] = useState<number>(1000);
  const [inSupplierId, setInSupplierId] = useState(suppliers[0]?.id || '');
  const [inRefNo, setInRefNo] = useState(`PO-${Date.now().toString().slice(-6)}`);
  const [inBatch, setInBatch] = useState(`BATCH-${new Date().toISOString().slice(2, 7).replace('-', '')}`);
  const [inExpiry, setInExpiry] = useState('');
  const [inNotes, setInNotes] = useState('');

  // Stock Out Form
  const [outProdId, setOutProdId] = useState(products[0]?.id || '');
  const [outQty, setOutQty] = useState<number>(1);
  const [outReason, setOutReason] = useState<MovementReason>('DAMAGED');
  const [outRefNo, setOutRefNo] = useState(`ADJ-${Date.now().toString().slice(-6)}`);
  const [outNotes, setOutNotes] = useState('');

  const selectedInProduct = products.find((p) => p.id === inProdId);
  const selectedOutProduct = products.find((p) => p.id === outProdId);

  const handleStockInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inProdId || inQty <= 0) {
      showToast('Please select product and valid positive quantity.');
      return;
    }
    onStockIn({
      productId: inProdId,
      quantity: inQty,
      unitCostRwf: inCostRwf || selectedInProduct?.purchasePriceRwf || 0,
      supplierId: inSupplierId,
      referenceNo: inRefNo,
      batchNumber: inBatch,
      expiryDate: inExpiry,
      notes: inNotes,
    });
    setStockInModalOpen(false);
    setInNotes('');
  };

  const handleStockOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!outProdId || outQty <= 0) {
      showToast('Please select product and valid positive quantity.');
      return;
    }
    if (selectedOutProduct && outQty > selectedOutProduct.currentStock) {
      showToast(`Cannot deduct more than available stock (${selectedOutProduct.currentStock} units).`);
      return;
    }
    onStockOut({
      productId: outProdId,
      quantity: outQty,
      reason: outReason,
      referenceNo: outRefNo,
      notes: outNotes,
    });
    setStockOutModalOpen(false);
    setOutNotes('');
  };

  const filteredMovements = movements.filter((m) => {
    const matchType = filterType === 'ALL' || m.type === filterType;
    const matchSearch =
      m.productName.toLowerCase().includes(search.toLowerCase()) ||
      m.referenceNo.toLowerCase().includes(search.toLowerCase()) ||
      m.barcode.includes(search);
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl shadow-2xl flex items-center gap-2 border border-rose-400 animate-in fade-in">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner & Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h3 className="font-bold text-white text-base">Stock In & Stock Out Movements</h3>
          <p className="text-xs text-slate-400">
            Real-time inventory ledger synced with PostgreSQL transactions & audit logs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (selectedInProduct) setInCostRwf(selectedInProduct.purchasePriceRwf);
              setStockInModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-md shadow-emerald-950/40"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Stock In (Receive Goods)</span>
          </button>

          <button
            onClick={() => setStockOutModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors shadow-md shadow-rose-950/40"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Stock Out (Deduct Goods)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by product, barcode, or reference PO #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'IN', 'OUT'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterType === t
                  ? 'bg-slate-700 text-white border border-slate-600'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {t === 'ALL' ? 'All Movements' : t === 'IN' ? 'Stock In (+)' : 'Stock Out (-)'}
            </button>
          ))}
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Product</th>
                <th className="py-3.5 px-4">Reason / Notes</th>
                <th className="py-3.5 px-4 text-right">Quantity</th>
                <th className="py-3.5 px-4 text-center">Stock Change</th>
                <th className="py-3.5 px-4 text-right">Unit Cost (RWF)</th>
                <th className="py-3.5 px-4">Performed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No stock movements recorded yet.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {formatDateTime(m.timestamp)}
                    </td>

                    <td className="py-3 px-4">
                      {m.type === 'IN' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          <ArrowDownLeft className="w-3 h-3" /> STOCK IN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                          <ArrowUpRight className="w-3 h-3" /> STOCK OUT
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{m.productName}</div>
                      <div className="text-[10px] font-mono text-slate-500">{m.barcode}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-300">
                      <div className="font-medium text-[11px] text-slate-200">
                        {m.reason.replace(/_/g, ' ')}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-xs">
                        Ref: {m.referenceNo} {m.notes ? `• ${m.notes}` : ''}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono font-bold text-sm">
                      <span className={m.type === 'IN' ? 'text-emerald-400' : 'text-rose-400'}>
                        {m.type === 'IN' ? '+' : '-'}
                        {m.quantity}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center font-mono text-slate-400 text-[11px]">
                      <span>{m.previousStock}</span>
                      <span className="mx-1">&rarr;</span>
                      <span className="font-bold text-white">{m.newStock}</span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-slate-300">
                      {formatRwf(m.unitCostRwf)}
                    </td>

                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {m.performedBy}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* STOCK IN MODAL */}
      {stockInModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Receive Stock In (Supplier Delivery)</h3>
              </div>
              <button
                onClick={() => setStockInModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockInSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Select Product *
                </label>
                <select
                  value={inProdId}
                  onChange={(e) => {
                    setInProdId(e.target.value);
                    const p = products.find((x) => x.id === e.target.value);
                    if (p) setInCostRwf(p.purchasePriceRwf);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.currentStock} {p.unit} currently)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Quantity Received *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={inQty}
                    onChange={(e) => setInQty(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Unit Purchase Cost (RWF) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={inCostRwf}
                    onChange={(e) => setInCostRwf(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Supplier
                  </label>
                  <select
                    value={inSupplierId}
                    onChange={(e) => setInSupplierId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    PO / Invoice Ref #
                  </label>
                  <input
                    type="text"
                    value={inRefNo}
                    onChange={(e) => setInRefNo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Batch / Lot Number
                  </label>
                  <input
                    type="text"
                    value={inBatch}
                    onChange={(e) => setInBatch(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Batch Expiry Date
                  </label>
                  <input
                    type="date"
                    value={inExpiry}
                    onChange={(e) => setInExpiry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Receiving Inspection Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Delivered by truck in chilled container, seals intact."
                  value={inNotes}
                  onChange={(e) => setInNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStockInModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  Confirm & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK OUT MODAL */}
      {stockOutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-white text-base">Deduct Stock Out (Adjustment/Damaged)</h3>
              </div>
              <button
                onClick={() => setStockOutModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockOutSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Select Product *
                </label>
                <select
                  value={outProdId}
                  onChange={(e) => setOutProdId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Available: {p.currentStock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Quantity to Deduct *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={outQty}
                    onChange={(e) => setOutQty(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Reason for Deduction *
                  </label>
                  <select
                    value={outReason}
                    onChange={(e) => setOutReason(e.target.value as MovementReason)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="DAMAGED">Damaged / Broken</option>
                    <option value="EXPIRED">Expired Shelf Life</option>
                    <option value="INTERNAL_USE">Internal Store Use / Tasting</option>
                    <option value="STOCK_COUNT_ADJUSTMENT">Stocktaking Discrepancy</option>
                    <option value="THEFT_LOSS">Theft / Shrinkage Loss</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Internal Authorization Reference #
                </label>
                <input
                  type="text"
                  value={outRefNo}
                  onChange={(e) => setOutRefNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Reason Explanation & Action Taken
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Broken packaging during shelf restocking, disposed per protocol."
                  value={outNotes}
                  onChange={(e) => setOutNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStockOutModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                >
                  Authorize Deduction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
