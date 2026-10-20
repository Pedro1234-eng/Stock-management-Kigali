import React, { useState, useEffect } from 'react';
import { 
  Sparkles, TrendingUp, AlertTriangle, ShieldCheck, 
  Send, RefreshCw, ShoppingCart, MessageSquare, BrainCircuit, CheckCircle2 
} from 'lucide-react';
import { Product, Sale, StockMovement, AiStockForecast, AiInventoryHealthAudit } from '../types';
import { formatRwf } from '../utils/formatters';

interface AiAssistantProps {
  products: Product[];
  sales: Sale[];
  movements: StockMovement[];
  onTriggerReorder?: (productId: string, qty: number) => void;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({
  products,
  sales,
  movements,
  onTriggerReorder,
}) => {
  const [activeTab, setActiveTab] = useState<'FORECAST' | 'AUDIT' | 'CHAT'>('FORECAST');
  
  // Forecast State
  const [forecasts, setForecasts] = useState<AiStockForecast[]>([]);
  const [loadingForecast, setLoadingForecast] = useState(false);

  // Audit State
  const [audit, setAudit] = useState<AiInventoryHealthAudit | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    {
      sender: 'ai',
      text: 'Muraho! I am your KigaliStock AI Inventory Strategist. Ask me about stockout risks, MTN MoMo sales, or suggested purchase orders for Inyange & Bralirwa suppliers.',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [sendingQuery, setSendingQuery] = useState(false);

  // Fetch Forecast
  const fetchForecast = async () => {
    setLoadingForecast(true);
    try {
      const res = await fetch('/api/ai/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products, salesHistory: sales }),
      });
      const data = await res.json();
      if (data.forecasts) {
        setForecasts(data.forecasts);
      }
    } catch (err) {
      console.error('Error fetching forecast:', err);
    } finally {
      setLoadingForecast(false);
    }
  };

  // Fetch Audit
  const fetchAudit = async () => {
    setLoadingAudit(true);
    try {
      const res = await fetch('/api/ai/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products, movements }),
      });
      const data = await res.json();
      if (data.audit) {
        setAudit(data.audit);
      }
    } catch (err) {
      console.error('Error fetching audit:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    fetchForecast();
    fetchAudit();
  }, []);

  const handleSendChat = async (queryText?: string) => {
    const q = queryText || inputQuery;
    if (!q.trim() || sendingQuery) return;

    const newMsgs = [...chatMessages, { sender: 'user' as const, text: q }];
    setChatMessages(newMsgs);
    setInputQuery('');
    setSendingQuery(true);

    try {
      const totalSalesRwf = sales.reduce((acc, s) => acc + s.totalRwf, 0);
      const lowStockCount = products.filter((p) => p.currentStock <= p.minStockLevel).length;

      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          context: {
            productsCount: products.length,
            lowStockCount,
            totalSalesRwf,
            sampleProducts: products.slice(0, 5).map((p) => ({
              name: p.name,
              stock: p.currentStock,
              priceRwf: p.sellingPriceRwf,
            })),
          },
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setChatMessages([...newMsgs, { sender: 'ai', text: data.reply }]);
      }
    } catch (err) {
      setChatMessages([
        ...newMsgs,
        {
          sender: 'ai',
          text: 'Unable to reach Gemini AI server. Please check connection.',
        },
      ]);
    } finally {
      setSendingQuery(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Sub-Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">Google Gemini AI Stock Intelligence</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                gemini-3.8-flash
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Automated demand forecasting, inventory health audits, and conversational assistant
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('FORECAST')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'FORECAST'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Demand Forecast</span>
          </button>

          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'AUDIT'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Health Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('CHAT')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'CHAT'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>AI Assistant</span>
          </button>
        </div>
      </div>

      {/* TAB 1: DEMAND FORECAST */}
      {activeTab === 'FORECAST' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-200">
              Stockout Risk & Smart Reorder Predictions
            </h4>
            <button
              onClick={fetchForecast}
              disabled={loadingForecast}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingForecast ? 'animate-spin' : ''}`} />
              <span>Refresh Forecast</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {forecasts.map((f, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        f.priority === 'CRITICAL'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : f.priority === 'WARNING'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {f.priority}
                    </span>
                    <span className="text-xs text-slate-400">
                      Days left: <strong className="text-white font-mono">{f.daysUntilStockout}d</strong>
                    </span>
                  </div>

                  <h5 className="font-bold text-white text-sm">{f.productName}</h5>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{f.reasoning}</p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Recommended Order</span>
                    <span className="text-sm font-black text-purple-400 font-mono">
                      +{f.recommendedOrderQty} units
                    </span>
                  </div>

                  {onTriggerReorder && (
                    <button
                      onClick={() => onTriggerReorder(f.productId, f.recommendedOrderQty)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Reorder</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: INVENTORY HEALTH AUDIT */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-200">
              AI Store Inventory Health & Quality Audit
            </h4>
            <button
              onClick={fetchAudit}
              disabled={loadingAudit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
              <span>Run New Audit</span>
            </button>
          </div>

          {audit ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Score & Summary */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-xs uppercase font-semibold text-slate-400">
                    Store Inventory Health Score
                  </span>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-5xl font-black text-purple-400 font-mono">
                      {audit.overallHealthScore}
                    </span>
                    <span className="text-sm text-slate-500 font-mono">/ 100</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-3 leading-relaxed">{audit.summary}</p>
                </div>

                <div className="p-3 bg-purple-950/30 border border-purple-900/40 rounded-xl text-xs text-purple-300">
                  Calculated against Rwanda retail turn rates & safety stock margins.
                </div>
              </div>

              {/* Critical Alerts & Near Expiry */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h5 className="font-bold text-white text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Immediate Action Alerts</span>
                </h5>
                <ul className="space-y-2 text-xs">
                  {audit.criticalAlerts.map((alert, i) => (
                    <li key={i} className="flex items-start gap-2 text-rose-300 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                      <span>&bull;</span>
                      <span>{alert}</span>
                    </li>
                  ))}
                </ul>

                <h5 className="font-bold text-white text-sm flex items-center gap-2 pt-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Near-Expiry Risks</span>
                </h5>
                <div className="space-y-1 text-xs">
                  {audit.nearExpiryRisks.map((risk, i) => (
                    <div key={i} className="flex justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                      <span className="truncate">{risk.productName}</span>
                      <span className="text-amber-400 font-mono">Exp: {risk.expiryDate}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Restock Recommendations */}
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <h5 className="font-bold text-white text-sm flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-emerald-400" />
                  <span>AI Restock Priority</span>
                </h5>
                <div className="space-y-2 text-xs">
                  {audit.reorderRecommendations.map((r, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between font-semibold text-white">
                        <span className="truncate">{r.productName}</span>
                        <span className="text-purple-400 font-mono font-bold">+{r.suggestedQty}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Est. Cost: {formatRwf(r.estimatedCostRwf)}</span>
                        <span className="text-emerald-400 font-semibold">{r.urgency} Urgency</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500">Loading audit data...</div>
          )}
        </div>
      )}

      {/* TAB 3: INTERACTIVE NATURAL LANGUAGE ASSISTANT */}
      {activeTab === 'CHAT' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          {/* Quick Preset Queries */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="text-slate-400 py-1 font-semibold">Suggested Questions:</span>
            {[
              'Which products are below safety stock threshold?',
              'Break down sales by MTN MoMo, Visa, and Cash in RWF',
              'Draft an Inyange Dairy replenishment order',
              'What is our total inventory valuation in RWF?',
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => handleSendChat(chip)}
                className="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Chat Messages Log */}
          <div className="h-80 overflow-y-auto space-y-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
            {chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 text-xs leading-relaxed ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] p-3 rounded-2xl ${
                    msg.sender === 'user'
                      ? 'bg-purple-600 text-white rounded-tr-xs'
                      : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-xs'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {sendingQuery && (
              <div className="flex items-center gap-2 text-xs text-purple-400">
                <span className="w-3.5 h-3.5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span>Gemini is analyzing store stock & transactions...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask anything about stock, sales, barcodes, or suppliers..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={() => handleSendChat()}
              disabled={sendingQuery || !inputQuery.trim()}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-semibold text-sm transition-colors flex items-center gap-2 shadow-md shadow-purple-950/40"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
