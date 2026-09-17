import React from 'react';
import {
  LayoutDashboard,
  History,
  Plus,
  Package,
  Menu,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const MobileNavigation: React.FC = () => {
  const { activeTab, setActiveTab, setOpenDrawer } = useApp();

  return (
    <div
      id="mobile-bottom-navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-300 pb-safe safe-bottom"
    >
      <div className="flex items-center justify-around h-16 px-2 relative max-w-lg mx-auto">
        {/* 1. Dashboard */}
        <button
          id="mobile-nav-dashboard"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            activeTab === 'dashboard' ? 'text-rose-500 font-semibold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">แดชบอร์ด</span>
        </button>

        {/* 2. History */}
        <button
          id="mobile-nav-history"
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            activeTab === 'history' ? 'text-rose-500 font-semibold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">ประวัติขาย</span>
        </button>

        {/* 3. Floating Action Button for Sales Entry */}
        <div className="relative -top-5 flex-1 flex justify-center">
          <button
            id="mobile-fab-sales-entry"
            onClick={() => setActiveTab('sales-entry')}
            aria-label="บันทึกการขาย"
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 text-white shadow-lg shadow-rose-600/40 flex items-center justify-center transition-transform active:scale-95 ring-4 ring-slate-950"
          >
            <Plus className="w-7 h-7 stroke-[2.5]" />
          </button>
        </div>

        {/* 4. Stock */}
        <button
          id="mobile-nav-stock"
          onClick={() => setActiveTab('stock')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            activeTab === 'stock' ? 'text-rose-500 font-semibold' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Package className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">สต็อก</span>
        </button>

        {/* 5. Menu Drawer */}
        <button
          id="mobile-nav-menu"
          onClick={() => setOpenDrawer(true)}
          className="flex flex-col items-center justify-center flex-1 h-full text-slate-400 hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          <span className="text-[10px]">เมนูเพิ่ม</span>
        </button>
      </div>
    </div>
  );
};
