import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  PieChart,
  Award,
  Package,
  Users,
  Calendar,
  Layers,
  Settings,
  ShieldAlert,
  Download,
  Upload,
  RefreshCw,
  LogOut,
  ChevronRight,
  Sparkles,
  Sheet,
  Smartphone,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    brandSettings,
    userSession,
    isOnline,
    logout,
    setModalOpen,
  } = useApp();

  const navItems = [
    { id: 'dashboard', th: 'ภาพรวมยอดขาย', en: 'Dashboard', icon: LayoutDashboard },
    { id: 'sales-entry', th: 'บันทึกการขาย', en: 'Sales Entry', icon: PlusCircle },
    { id: 'catalog', th: 'ฐานข้อมูลสินค้า PC', en: 'Product Catalog', icon: Layers },
    { id: 'history', th: 'ประวัติและส่งออก', en: 'History & Export', icon: History },
    { id: 'market-share', th: 'ส่วนแบ่งตลาด MKS', en: 'Market Share', icon: PieChart },
    { id: 'commission', th: 'คอมมิชชั่น & โบนัส', en: 'Incentives', icon: Award },
    { id: 'stock', th: 'สต็อกและสินค้า', en: 'Inventory', icon: Package },
    { id: 'customers', th: 'ลูกค้าและ CRM', en: 'Customers', icon: Users },
    { id: 'yearly', th: 'ภาพรวมรายปี', en: 'Yearly Overview', icon: Calendar },
  ];

  return (
    <aside
      id="desktop-sidebar"
      className="hidden md:flex flex-col w-[280px] bg-slate-900 text-slate-200 border-r border-slate-800 shrink-0 select-none justify-between h-screen sticky top-0 overflow-y-auto"
    >
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 via-rose-600 to-amber-600 flex items-center justify-center text-white font-bold shadow-md shadow-rose-950/40 shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base text-white tracking-wide truncate">
                  {brandSettings.brandName}
                </h1>
              </div>
              <p className="text-xs text-rose-400 font-medium truncate">
                {brandSettings.badge}
              </p>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 truncate flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-rose-500 ring-2 ring-rose-500/20'}`} />
            <span>{brandSettings.branch}</span>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all duration-150 relative ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white font-medium shadow-md shadow-rose-900/30'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-rose-400'
                    }`}
                  />
                  <div>
                    <div className="text-sm leading-tight">{item.th}</div>
                    <div
                      className={`text-[10px] tracking-wider uppercase font-semibold ${
                        isActive ? 'text-rose-100/80' : 'text-slate-500'
                      }`}
                    >
                      {item.en}
                    </div>
                  </div>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-white shrink-0" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Auxiliary quick links & User profile footer */}
      <div className="p-3 border-t border-slate-800/90 bg-slate-950/60 space-y-2">
        <div className="grid grid-cols-3 gap-1 px-1">
          <button
            onClick={() => setActiveTab('sheets-sync')}
            className="flex flex-col items-center justify-center p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 transition-colors"
            title="Google Sheets Sync"
          >
            <Sheet className="w-4 h-4 mb-1 text-emerald-400" />
            <span className="text-[10px]">Sheets</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className="flex flex-col items-center justify-center p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
            title="Brand Settings"
          >
            <Settings className="w-4 h-4 mb-1" />
            <span className="text-[10px]">ตั้งค่า</span>
          </button>
          <button
            onClick={() => setModalOpen('audit-logs')}
            className="flex flex-col items-center justify-center p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 transition-colors"
            title="Audit Logs"
          >
            <ShieldAlert className="w-4 h-4 mb-1" />
            <span className="text-[10px]">บันทึก</span>
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800/80">
          <button
            onClick={() => setActiveTab('settings')}
            className="flex items-center gap-2.5 overflow-hidden text-left flex-1 hover:opacity-85 transition-opacity"
            title="คลิกเพื่อแก้ไขโปรไฟล์ในหน้าการตั้งค่า"
          >
            <div className="relative shrink-0">
              {userSession.avatar ? (
                <img
                  src={userSession.avatar}
                  alt={userSession.name}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xs font-semibold">
                  {userSession.name.charAt(0)}
                </div>
              )}
              <span
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${
                  isOnline ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-medium text-white truncate">
                {userSession.name}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {userSession.email || (isOnline ? 'Online / พร้อมใช้งาน' : 'Offline')}
              </div>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors shrink-0 ml-1"
            title="แก้ไขข้อมูลผู้ใช้ (Settings)"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
