import React from 'react';
import { 
  ShoppingBag, Package, ArrowUpDown, FileText, 
  Sparkles, Database, UserCheck, Shield, ChevronDown, 
  Scan, Check, Store 
} from 'lucide-react';
import { User, UserRole } from '../types';

export type TabType = 'POS' | 'INVENTORY' | 'MOVEMENTS' | 'INVOICES' | 'AI' | 'POSTGRES_HUB';

interface NavbarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  currentUser: User;
  users: User[];
  onSwitchUser: (user: User) => void;
  onOpenScanner: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  users,
  onSwitchUser,
  onOpenScanner,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Store Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-950/50">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight">
                  KigaliStock <span className="text-emerald-400">AI</span>
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  RWF (Frw)
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                PostgreSQL CRUD &bull; POS &bull; MTN MoMo &bull; Barcode Reader
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => onSelectTab('POS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'POS'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>POS Terminal</span>
            </button>

            <button
              onClick={() => onSelectTab('INVENTORY')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'INVENTORY'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Inventory</span>
            </button>

            <button
              onClick={() => onSelectTab('MOVEMENTS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'MOVEMENTS'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Stock In/Out</span>
            </button>

            <button
              onClick={() => onSelectTab('INVOICES')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'INVOICES'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Invoices</span>
            </button>

            <button
              onClick={() => onSelectTab('AI')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'AI'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Forecast</span>
            </button>

            <button
              onClick={() => onSelectTab('POSTGRES_HUB')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'POSTGRES_HUB'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span>Python & PostgreSQL</span>
            </button>
          </nav>

          {/* Right Action: Quick Scanner & Multi-User Switcher */}
          <div className="flex items-center gap-3">
            <button
              onClick={onOpenScanner}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
              title="Quick Barcode Scanner"
            >
              <Scan className="w-4 h-4 text-emerald-400" />
            </button>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-white leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-emerald-400 capitalize font-medium flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5" />
                    <span>{currentUser.role}</span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Switch User & Role
                    </span>
                    <p className="text-[11px] text-slate-500">RBAC permissions simulated</p>
                  </div>

                  <div className="py-1">
                    {users.map((u) => {
                      const isCurrent = u.id === currentUser.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            onSwitchUser(u);
                            setUserDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors ${
                            isCurrent
                              ? 'bg-slate-800 text-white font-semibold'
                              : 'text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                              {u.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs">{u.name}</p>
                              <p className="text-[10px] text-slate-500 capitalize">{u.role}</p>
                            </div>
                          </div>
                          {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Sub-Navigation */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-slate-800 text-xs no-scrollbar">
          {[
            { id: 'POS', label: 'POS Terminal' },
            { id: 'INVENTORY', label: 'Inventory' },
            { id: 'MOVEMENTS', label: 'Stock In/Out' },
            { id: 'INVOICES', label: 'Invoices' },
            { id: 'AI', label: 'AI Forecast' },
            { id: 'POSTGRES_HUB', label: 'Python & SQL' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as TabType)}
              className={`px-3 py-1 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === item.id
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-900 text-slate-400'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
