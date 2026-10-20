import React, { useState } from 'react';
import { Printer, Download, X, CheckCircle, Smartphone, CreditCard, Banknote, ShieldCheck } from 'lucide-react';
import { Sale } from '../types';
import { formatRwf, formatDateTime } from '../utils/formatters';
import { BarcodeBadge } from './BarcodeBadge';

interface ReceiptModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, isOpen, onClose }) => {
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col my-8 no-print">
        {/* Header Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-base">Receipt & Tax Invoice</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Paid in RWF
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Format Switcher */}
            <div className="flex bg-slate-800 p-1 rounded-lg text-xs font-medium">
              <button
                type="button"
                onClick={() => setPrintFormat('thermal')}
                className={`px-3 py-1 rounded-md transition-all ${
                  printFormat === 'thermal'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Thermal (POS)
              </button>
              <button
                type="button"
                onClick={() => setPrintFormat('a4')}
                className={`px-3 py-1 rounded-md transition-all ${
                  printFormat === 'a4'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                A4 Tax Invoice
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable View Container */}
        <div className="p-6 overflow-y-auto max-h-[70vh] flex justify-center bg-slate-950/40">
          {/* Print Section with ID #printable-receipt */}
          <div
            id="printable-receipt"
            className={`${
              printFormat === 'thermal'
                ? 'w-[320px] p-4 text-xs font-mono bg-white text-slate-900 border border-slate-300 shadow-lg'
                : 'w-[520px] p-6 text-xs bg-white text-slate-900 border border-slate-300 shadow-lg font-sans'
            } rounded-md`}
          >
            {/* Header */}
            <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
              <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-900">
                KIGALISTOCK SUPERMARKET
              </h2>
              <p className="text-[11px] text-slate-700">KN 4 Ave, Kigali - Rwanda</p>
              <p className="text-[10px] text-slate-600">Tel: +250 788 123 456 / +250 791 000 111</p>
              <p className="text-[10px] font-bold text-slate-800">TIN: 100234567 | VAT REG: RW100234567</p>
              <div className="mt-1 inline-block px-2 py-0.5 bg-slate-100 border border-slate-300 text-[10px] font-semibold text-slate-700">
                RRA ELECTRONIC BILLING MACHINE (EBM v2)
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="grid grid-cols-2 gap-1 text-[11px] border-b border-dashed border-slate-300 pb-2 mb-3">
              <div>
                <span className="text-slate-500">Invoice: </span>
                <span className="font-bold text-slate-800">{sale.invoiceNumber}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500">Date: </span>
                <span>{formatDateTime(sale.timestamp)}</span>
              </div>
              <div>
                <span className="text-slate-500">EBM Ref: </span>
                <span className="font-mono text-[10px]">{sale.ebmReceiptNumber}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500">Cashier: </span>
                <span className="font-semibold">{sale.cashierName}</span>
              </div>
              {sale.customerName && (
                <div className="col-span-2 pt-1 border-t border-slate-200 mt-1">
                  <span className="text-slate-500">Customer: </span>
                  <span className="font-semibold">{sale.customerName}</span>
                  {sale.customerTin && <span className="ml-2 text-slate-500">TIN: {sale.customerTin}</span>}
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="mb-3">
              <div className="flex justify-between font-bold border-b border-slate-800 pb-1 text-[11px] uppercase">
                <span className="w-1/2">Item Description</span>
                <span className="w-1/6 text-center">Qty</span>
                <span className="w-1/6 text-right">Price</span>
                <span className="w-1/6 text-right">Total</span>
              </div>

              <div className="divide-y divide-slate-200 my-1">
                {sale.items.map((item, idx) => (
                  <div key={idx} className="py-1 flex justify-between text-[11px]">
                    <div className="w-1/2">
                      <p className="font-medium truncate">{item.productName}</p>
                      <p className="text-[9px] text-slate-500">{item.barcode}</p>
                    </div>
                    <div className="w-1/6 text-center">{item.quantity} {item.unit}</div>
                    <div className="w-1/6 text-right">{item.unitPriceRwf.toLocaleString()}</div>
                    <div className="w-1/6 text-right font-semibold">{item.subtotalRwf.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="border-t-2 border-slate-900 pt-2 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-600">Net Subtotal (excl. VAT):</span>
                <span>{sale.subtotalRwf.toLocaleString()} Frw</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Rwanda VAT (18% included):</span>
                <span>{sale.taxAmountRwf.toLocaleString()} Frw</span>
              </div>
              {sale.discountRwf > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount Applied:</span>
                  <span>-{sale.discountRwf.toLocaleString()} Frw</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold border-t border-slate-800 pt-1 mt-1 text-slate-900">
                <span>TOTAL PAYABLE (RWF):</span>
                <span className="text-base font-black">{formatRwf(sale.totalRwf)}</span>
              </div>
            </div>

            {/* Payment Verification Box */}
            <div className="my-3 p-2 bg-slate-50 rounded border border-slate-200 text-[10px] space-y-0.5">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span className="flex items-center gap-1">
                  {sale.paymentMethod === 'MOMO' && <Smartphone className="w-3.5 h-3.5 text-amber-600" />}
                  {sale.paymentMethod === 'VISA' && <CreditCard className="w-3.5 h-3.5 text-blue-600" />}
                  {sale.paymentMethod === 'CASH' && <Banknote className="w-3.5 h-3.5 text-emerald-600" />}
                  PAID VIA: {sale.paymentMethod === 'MOMO' ? 'MTN MOBILE MONEY (MOMO)' : sale.paymentMethod === 'VISA' ? 'VISA CARD EMV' : 'CASH IN RWF'}
                </span>
                <span className="text-emerald-700 uppercase font-black">SUCCESSFUL</span>
              </div>

              {sale.paymentMethod === 'MOMO' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">MoMo Phone Number:</span>
                    <span className="font-mono">{sale.paymentDetails?.momoPhone || '078XXXXXXX'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">MoMo Trans ID:</span>
                    <span className="font-mono">{sale.paymentDetails?.momoTransactionId || 'MP-RWA-OK'}</span>
                  </div>
                </>
              )}

              {sale.paymentMethod === 'VISA' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Card Number:</span>
                    <span className="font-mono">{sale.paymentDetails?.visaCardNumberMasked || '4111 **** **** 8829'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Auth Approval Code:</span>
                    <span className="font-mono">{sale.paymentDetails?.visaAuthCode || 'AUTH-09281'}</span>
                  </div>
                </>
              )}

              {sale.paymentMethod === 'CASH' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount Tendered:</span>
                    <span>{(sale.paymentDetails?.cashTenderedRwf || sale.totalRwf).toLocaleString()} Frw</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span className="text-slate-600">Change Returned:</span>
                    <span>{(sale.paymentDetails?.cashChangeRwf || 0).toLocaleString()} Frw</span>
                  </div>
                </>
              )}
            </div>

            {/* Barcode & Footer */}
            <div className="text-center pt-2 border-t border-dashed border-slate-400 space-y-1">
              <div className="flex justify-center my-1">
                <BarcodeBadge barcode={sale.ebmReceiptNumber} showText={false} width={180} height={36} />
              </div>
              <p className="text-[10px] font-mono tracking-wider text-slate-600">
                *{sale.ebmReceiptNumber}*
              </p>
              <p className="text-[10px] text-slate-600">
                Murakoze cyane! Thank you for shopping with us.
              </p>
              <p className="text-[9px] text-slate-400">
                Official RRA receipt generated by KigaliStock AI
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Ready for 58mm/80mm thermal POS or standard A4 printer</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
            >
              Done
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors shadow-md shadow-emerald-900/30"
            >
              <Printer className="w-4 h-4" />
              Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
