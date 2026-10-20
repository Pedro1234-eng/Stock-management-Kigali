import React, { useState, useMemo } from 'react';
import { 
  FileText, Search, Printer, Smartphone, CreditCard, 
  Banknote, Download, Calendar, ShieldCheck, Eye 
} from 'lucide-react';
import { Sale, PaymentMethodType } from '../types';
import { formatRwf, formatDateTime } from '../utils/formatters';
import { ReceiptModal } from './ReceiptModal';

interface InvoicesListProps {
  sales: Sale[];
}

export const InvoicesList: React.FC<InvoicesListProps> = ({ sales }) => {
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Revenue analytics by payment method
  const summary = useMemo(() => {
    let totalRevenue = 0;
    let momoRevenue = 0;
    let visaRevenue = 0;
    let cashRevenue = 0;

    sales.forEach((s) => {
      totalRevenue += s.totalRwf;
      if (s.paymentMethod === 'MOMO') momoRevenue += s.totalRwf;
      else if (s.paymentMethod === 'VISA') visaRevenue += s.totalRwf;
      else if (s.paymentMethod === 'CASH') cashRevenue += s.totalRwf;
    });

    return {
      totalRevenue,
      momoRevenue,
      visaRevenue,
      cashRevenue,
      totalCount: sales.length,
    };
  }, [sales]);

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchMethod = methodFilter === 'ALL' || s.paymentMethod === methodFilter;
      const matchSearch =
        s.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        s.ebmReceiptNumber.toLowerCase().includes(search.toLowerCase()) ||
        (s.customerName && s.customerName.toLowerCase().includes(search.toLowerCase())) ||
        (s.paymentDetails?.momoPhone && s.paymentDetails.momoPhone.includes(search));
      return matchMethod && matchSearch;
    });
  }, [sales, methodFilter, search]);

  const exportSalesCsv = () => {
    const headers = [
      'Invoice #',
      'EBM Receipt #',
      'Date',
      'Payment Method',
      'Subtotal (RWF)',
      'VAT (RWF)',
      'Total (RWF)',
      'Cashier',
      'Customer',
    ];
    const rows = filteredSales.map((s) => [
      s.invoiceNumber,
      s.ebmReceiptNumber,
      s.timestamp,
      s.paymentMethod,
      s.subtotalRwf,
      s.taxAmountRwf,
      s.totalRwf,
      s.cashierName,
      s.customerName || 'N/A',
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kigalistock_sales_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Cards with Payment Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Total Gross Sales (RWF)</span>
            <FileText className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white">{formatRwf(summary.totalRevenue)}</p>
          <p className="text-xs text-slate-500 mt-1">{summary.totalCount} completed transactions</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">MTN MoMo Collected</span>
            <Smartphone className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">{formatRwf(summary.momoRevenue)}</p>
          <p className="text-xs text-slate-500 mt-1">Mobile Money Rwanda payments</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Visa Card EMV</span>
            <CreditCard className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-blue-400">{formatRwf(summary.visaRevenue)}</p>
          <p className="text-xs text-slate-500 mt-1">Card terminal settlements</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase">Cash Register (RWF)</span>
            <Banknote className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{formatRwf(summary.cashRevenue)}</p>
          <p className="text-xs text-slate-500 mt-1">Cash in drawer</p>
        </div>
      </div>

      {/* Action / Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search invoice #, customer, or MoMo phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setMethodFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                methodFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Payments
            </button>
            <button
              onClick={() => setMethodFilter('MOMO')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                methodFilter === 'MOMO' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              MTN MoMo
            </button>
            <button
              onClick={() => setMethodFilter('VISA')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                methodFilter === 'VISA' ? 'bg-blue-500/20 text-blue-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              Visa Card
            </button>
            <button
              onClick={() => setMethodFilter('CASH')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                methodFilter === 'CASH' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              Cash (RWF)
            </button>
          </div>
        </div>

        <button
          onClick={exportSalesCsv}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700 shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Invoices Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">RRA EBM S/N</th>
                <th className="py-3.5 px-4">Items Summary</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4 text-right">Tax (18%)</th>
                <th className="py-3.5 px-4 text-right">Total (RWF)</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No sales invoices found.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white font-mono">
                      {sale.invoiceNumber}
                      {sale.customerName && (
                        <div className="text-[10px] font-normal text-slate-400">{sale.customerName}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 font-mono whitespace-nowrap">
                      {formatDateTime(sale.timestamp)}
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                      {sale.ebmReceiptNumber}
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 max-w-[200px] truncate">
                      {sale.items.map((i) => `${i.productName} (${i.quantity})`).join(', ')}
                    </td>

                    <td className="py-3.5 px-4">
                      {sale.paymentMethod === 'MOMO' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-semibold">
                          <Smartphone className="w-3 h-3 text-amber-400" />
                          MTN MoMo
                        </span>
                      )}
                      {sale.paymentMethod === 'VISA' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px] font-semibold">
                          <CreditCard className="w-3 h-3 text-blue-400" />
                          Visa Card
                        </span>
                      )}
                      {sale.paymentMethod === 'CASH' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[10px] font-semibold">
                          <Banknote className="w-3 h-3 text-emerald-400" />
                          Cash RWF
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                      {formatRwf(sale.taxAmountRwf)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-emerald-400">
                      {formatRwf(sale.totalRwf)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedSale(sale);
                          setReceiptOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      <ReceiptModal
        sale={selectedSale}
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
      />
    </div>
  );
};
