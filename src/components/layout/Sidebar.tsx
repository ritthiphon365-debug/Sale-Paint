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
  LogIn,
  ChevronRight,
  Sparkles,
  Sheet,
  Smartphone,
  MessageCircle,
  Eye,
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
    openSpreadsheet,
    openSpreadsheetViewer,
    spreadsheetUrl,
    spreadsheetId,
    spreadsheetName,
  } = useApp();

  const navItems = [
    { id: 'dashboard', th: 'ภาพรวมยอดขาย', en: 'Dashboard', icon: LayoutDashboard },
    { id: 'sales-entry', th: 'บันทึกการขาย', en: 'Sales Entry', icon: PlusCircle },
    { id: 'sheets-sync', th: 'Google Sheet 5 ชีต', en: '1-Click Multi-Tab', icon: Sheet },
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
            <img
              src="./favicon.png"
              alt="Sale Paint Pro Logo"
              className="w-10 h-10 rounded-xl object-cover shadow-md shadow-blue-950/50 shrink-0 border border-slate-700/60 ring-1 ring-blue-500/20"
            />
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
        {/* Real-time Google Sheet quick status & open button */}
        {spreadsheetId && (
          <button
            onClick={openSpreadsheetViewer}
            className="w-full flex items-center justify-between px-3 py-2 bg-emerald-950/50 hover:bg-emerald-900/70 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 transition-all group"
            title="คลิกเพื่อเปิดดู Google Sheet ในแอป"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="truncate text-left">
                <div className="font-semibold truncate text-[11px] text-emerald-200">
                  {spreadsheetName || 'Google Sheet สด'}
                </div>
                <div className="text-[9px] text-emerald-400/80 flex items-center gap-1">
                  <span>Real-time Sync</span>
                </div>
              </div>
            </div>
            <Eye className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 shrink-0" />
          </button>
        )}

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
        <div className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
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
                  {userSession.email || 'ยังไม่ได้ล็อกอิน'}
                </div>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
              title="แก้ไขข้อมูลผู้ใช้ (Settings)"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 pt-0.5">
            <button
              onClick={() => setModalOpen('ai-assistant')}
              className="w-full py-1.5 px-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="เปิดน้องบอท สอบถามยอดขายและค่าคอมมิชชั่น"
            >
              <MessageCircle className="w-3.5 h-3.5 text-white fill-white" />
              <span>น้องบอท</span>
            </button>

            <button
              onClick={() => openSpreadsheet()}
              className="w-full py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-[10px] font-medium flex items-center justify-center gap-1.5 transition-colors border border-slate-700/60 cursor-pointer"
              title="คลิกเพื่อเปิดดู Google Spreadsheet 5 แท็บของเราบนแท็บใหม่ทันที"
            >
              <Sheet className="w-3.5 h-3.5" />
              <span>เปิดดู Google Sheet ของเรา</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
