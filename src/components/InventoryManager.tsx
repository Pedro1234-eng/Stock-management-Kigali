import React, { useState, useMemo } from 'react';
import { 
  Package, Plus, Search, Edit3, Trash2, Barcode, 
  AlertTriangle, Filter, CheckCircle, X, Printer,
  DollarSign, ArrowUpDown, Layers
} from 'lucide-react';
import { Product, Supplier, UnitType } from '../types';
import { formatRwf } from '../utils/formatters';
import { BarcodeBadge } from './BarcodeBadge';

interface InventoryManagerProps {
  products: Product[];
  suppliers: Supplier[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  products,
  suppliers,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  
  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [barcodeModalProduct, setBarcodeModalProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((prev) => (prev === msg ? null : prev)), 3500);
  };

  // Form State
  const [formData, setFormData] = useState<{
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
    location: string;
    expiryDate: string;
  }>({
    sku: '',
    barcode: '',
    name: '',
    category: 'General',
    description: '',
    unit: 'pcs',
    purchasePriceRwf: 1000,
    sellingPriceRwf: 1500,
    currentStock: 10,
    minStockLevel: 10,
    supplierId: suppliers[0]?.id || '',
    location: 'Aisle 1',
    expiryDate: '',
  });

  const categories = useMemo(() => {
    const list = Array.from(new Set(products.map((p) => p.category)));
    return ['ALL', ...list];
  }, [products]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalItems = products.length;
    const totalUnits = products.reduce((acc, p) => acc + p.currentStock, 0);
    const totalCostValuation = products.reduce((acc, p) => acc + p.currentStock * p.purchasePriceRwf, 0);
    const totalRetailValuation = products.reduce((acc, p) => acc + p.currentStock * p.sellingPriceRwf, 0);
    const lowStockCount = products.filter((p) => p.currentStock <= p.minStockLevel && p.currentStock > 0).length;
    const outOfStockCount = products.filter((p) => p.currentStock <= 0).length;
    return {
      totalItems,
      totalUnits,
      totalCostValuation,
      totalRetailValuation,
      lowStockCount,
      outOfStockCount,
    };
  }, [products]);

  // Filtered Products
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.includes(search);
      const matchCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
      const matchStock =
        stockStatusFilter === 'ALL'
          ? true
          : stockStatusFilter === 'LOW'
          ? p.currentStock <= p.minStockLevel && p.currentStock > 0
          : p.currentStock <= 0;

      return matchSearch && matchCategory && matchStock;
    });
  }, [products, search, categoryFilter, stockStatusFilter]);

  // Open Add Product
  const openAddModal = () => {
    const randomBarcode = '600' + Math.floor(100000000 + Math.random() * 900000000).toString();
    const randomSku = 'SKU-' + Math.floor(1000 + Math.random() * 9000);
    setFormData({
      sku: randomSku,
      barcode: randomBarcode,
      name: '',
      category: 'Beverages',
      description: '',
      unit: 'pack',
      purchasePriceRwf: 1000,
      sellingPriceRwf: 1500,
      currentStock: 25,
      minStockLevel: 10,
      supplierId: suppliers[0]?.id || '',
      location: 'Section A1',
      expiryDate: '',
    });
    setEditingProduct(null);
    setEditModalOpen(true);
  };

  // Open Edit Product
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      category: product.category,
      description: product.description || '',
      unit: product.unit,
      purchasePriceRwf: product.purchasePriceRwf,
      sellingPriceRwf: product.sellingPriceRwf,
      currentStock: product.currentStock,
      minStockLevel: product.minStockLevel,
      supplierId: product.supplierId,
      location: product.location || '',
      expiryDate: product.expiryDate || '',
    });
    setEditModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.barcode.trim()) {
      showToast('Product name and barcode are required.');
      return;
    }

    const now = new Date().toISOString();

    if (editingProduct) {
      const updated: Product = {
        ...editingProduct,
        ...formData,
        updatedAt: now,
      };
      onUpdateProduct(updated);
    } else {
      const created: Product = {
        id: `prod-${Date.now()}`,
        ...formData,
        createdAt: now,
        updatedAt: now,
      };
      onAddProduct(created);
    }

    setEditModalOpen(false);
  };

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-400 animate-in fade-in">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Valuation & Stock Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Total Catalog SKUs</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white">{stats.totalItems}</p>
          <p className="text-xs text-slate-500 mt-1">{stats.totalUnits.toLocaleString()} stock units on hand</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Inventory Cost (RWF)</span>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400">{formatRwf(stats.totalCostValuation)}</p>
          <p className="text-xs text-slate-500 mt-1">Acquisition valuation</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Retail Value (RWF)</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{formatRwf(stats.totalRetailValuation)}</p>
          <p className="text-xs text-emerald-500/80 mt-1">
            Potential margin: +{formatRwf(stats.totalRetailValuation - stats.totalCostValuation)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-amber-400">{stats.lowStockCount}</p>
            <span className="text-xs text-slate-400">low /</span>
            <p className="text-2xl font-black text-rose-400">{stats.outOfStockCount}</p>
            <span className="text-xs text-slate-400">out</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Needs reordering from suppliers</p>
        </div>
      </div>

      {/* Action Bar & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product name, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>

          {/* Stock Alert Filter */}
          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="LOW">Low Stock Alert (&le; Min)</option>
            <option value="OUT">Out of Stock (0 units)</option>
          </select>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-950/40 whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Item & SKU</th>
                <th className="py-3.5 px-4">Barcode</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">Cost (RWF)</th>
                <th className="py-3.5 px-4 text-right">Retail (RWF)</th>
                <th className="py-3.5 px-4 text-center">Stock Level</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((prod) => {
                  const isOutOfStock = prod.currentStock <= 0;
                  const isLow = prod.currentStock <= prod.minStockLevel;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-sm">{prod.name}</div>
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                          <span>{prod.sku}</span>
                          <span>&bull;</span>
                          <span>Unit: {prod.unit}</span>
                          {prod.location && (
                            <>
                              <span>&bull;</span>
                              <span className="text-slate-500">{prod.location}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">
                        <button
                          type="button"
                          onClick={() => setBarcodeModalProduct(prod)}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-950 border border-slate-800 hover:border-slate-600 text-[11px] hover:text-emerald-400 transition-colors"
                        >
                          <Barcode className="w-3.5 h-3.5 text-slate-400" />
                          <span>{prod.barcode}</span>
                        </button>
                      </td>

                      <td className="py-3 px-4 text-slate-300">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-medium border border-slate-700">
                          {prod.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right font-mono text-slate-300">
                        {formatRwf(prod.purchasePriceRwf)}
                      </td>

                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {formatRwf(prod.sellingPriceRwf)}
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-sm">
                        <span
                          className={
                            isOutOfStock
                              ? 'text-rose-400'
                              : isLow
                              ? 'text-amber-400'
                              : 'text-white'
                          }
                        >
                          {prod.currentStock} {prod.unit}
                        </span>
                        <div className="text-[10px] text-slate-500 font-normal">
                          Min: {prod.minStockLevel}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                            Optimal
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(prod)}
                            title="Edit Product"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete "${prod.name}"?`)) {
                                onDeleteProduct(prod.id);
                              }
                            }}
                            title="Delete Product"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT PRODUCT MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
              <h3 className="font-bold text-white text-base">
                {editingProduct ? 'Edit Product Catalog Item' : 'Register New Product in PostgreSQL'}
              </h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Product SKU *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Barcode Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inyange Whole Milk 500ml"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dairy, Beverages"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Packaging Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as UnitType })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="pack">Pack / Pouch</option>
                    <option value="bottle">Bottle</option>
                    <option value="can">Can</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="box">Box / Carton</option>
                    <option value="litres">Litres</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Purchase Cost (RWF) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.purchasePriceRwf}
                    onChange={(e) => setFormData({ ...formData, purchasePriceRwf: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Retail Selling Price (RWF) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.sellingPriceRwf}
                    onChange={(e) => setFormData({ ...formData, sellingPriceRwf: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono font-bold text-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Initial Stock Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.currentStock}
                    onChange={(e) => setFormData({ ...formData, currentStock: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Minimum Safety Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minStockLevel}
                    onChange={(e) => setFormData({ ...formData, minStockLevel: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    Primary Supplier
                  </label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
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
                    Warehouse / Shelf Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Aisle 2 - Rack B"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl shadow-md transition-colors"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BARCODE BADGE VIEW / PRINT MODAL */}
      {barcodeModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl p-6 text-center space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-sm font-bold text-white">Product Barcode Label</span>
              <button
                onClick={() => setBarcodeModalProduct(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-white rounded-xl shadow-inner flex flex-col items-center justify-center">
              <BarcodeBadge
                barcode={barcodeModalProduct.barcode}
                name={barcodeModalProduct.name}
                priceRwf={barcodeModalProduct.sellingPriceRwf}
                width={220}
                height={60}
              />
            </div>

            <p className="text-xs text-slate-400">
              Standard Code128 / EAN format readable by handheld USB scanners and smartphone cameras.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setBarcodeModalProduct(null)}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Label</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
