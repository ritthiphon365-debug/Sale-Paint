import React from 'react';
import {
  X,
  PieChart,
  Award,
  Users,
  Calendar,
  Settings,
  ShieldAlert,
  FileText,
  Sheet,
  Download,
  Upload,
  RefreshCw,
  LogOut,
  Smartphone,
  ChevronRight,
  TrendingUp,
  RotateCcw,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const MobileDrawer: React.FC = () => {
  const {
    openDrawer,
    setOpenDrawer,
    activeTab,
    setActiveTab,
    brandSettings,
    userSession,
    isOnline,
    setModalOpen,
  } = useApp();

  if (!openDrawer) return null;

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    setOpenDrawer(false);
  };

  const menuSections = [
    {
      title: 'ระบบรายงานและการวิเคราะห์',
      items: [
        { id: 'catalog', th: 'ฐานข้อมูลสินค้า PC', en: 'Product Catalog (Excel / Google)', icon: Layers },
        { id: 'market-share', th: 'ส่วนแบ่งตลาด MKS', en: 'Market Share Daily/Weekly', icon: PieChart },
        { id: 'commission', th: 'คอมมิชชั่นและอินเซนทีฟ', en: 'Commission & Gallon Rules', icon: Award },
        { id: 'customers', th: 'ลูกค้าสัมพันธ์ CRM', en: 'Customer CRM & Follow-up', icon: Users },
        { id: 'yearly', th: 'ภาพรวมรายปี', en: 'Yearly Overview & Targets', icon: Calendar },
      ],
    },
    {
      title: 'เครื่องมือและระบบงานขาย',
      items: [
        { id: 'order-gen', th: 'สร้างใบสั่งสินค้า Line', en: 'Order Generator', icon: FileText, modal: 'order-gen' },
        { id: 'daily-brief', th: 'สรุปการขายประจำวัน', en: 'Daily Brief Summary', icon: TrendingUp, modal: 'daily-brief' },
        { id: 'weekly-review', th: 'รีวิวรายสัปดาห์', en: 'Weekly Review', icon: Sparkles, modal: 'weekly-review' },
        { id: 'bulk-stock', th: 'เติมสต็อกเข้าแบบกลุ่ม', en: 'Bulk Stock In', icon: Upload, modal: 'bulk-stock' },
      ],
    },
    {
      title: 'การเชื่อมต่อและข้อมูล',
      items: [
        { id: 'sheets-sync', th: 'Google Sheets & Drive Sync', en: 'Google Cloud Sync', icon: Sheet },
        { id: 'import-export', th: 'นำเข้า / ส่งออก Excel', en: 'Excel Import / Export', icon: Download, modal: 'import-export' },
        { id: 'audit-logs', th: 'ประวัติบันทึกการทำงาน', en: 'Audit Security Logs', icon: ShieldAlert, modal: 'audit-logs' },
        { id: 'install-pwa', th: 'ติดตั้งแอปบนมือถือ', en: 'Install as PWA', icon: Smartphone, modal: 'install-pwa' },
        { id: 'settings', th: 'ตั้งค่าสาขาและระบบ', en: 'Brand & System Settings', icon: Settings },
      ],
    },
  ];

  return (
    <div className="md:hidden fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="w-[85%] max-w-[340px] h-full bg-slate-900 text-slate-100 flex flex-col shadow-2xl border-l border-slate-800">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h2 className="font-bold text-white text-base">{brandSettings.brandName}</h2>
            <p className="text-xs text-rose-400 font-medium">{brandSettings.badge}</p>
          </div>
          <button
            onClick={() => setOpenDrawer(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="px-4 py-3 bg-slate-950/30 border-b border-slate-800/60 flex items-center gap-3">
          <div className="relative">
            {userSession.avatar ? (
              <img src={userSession.avatar} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-700" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-sm">
                {userSession.name.charAt(0)}
              </div>
            )}
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${
                isOnline ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
          </div>
          <div className="overflow-hidden flex-1">
            <div className="text-xs font-semibold text-white truncate">{userSession.name}</div>
            <div className="text-[11px] text-slate-400 truncate">{userSession.email || 'ออฟไลน์'}</div>
          </div>
        </div>

        {/* Menu Items List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {menuSections.map((sec, idx) => (
            <div key={idx}>
              <div className="text-[11px] font-semibold uppercase text-slate-400 px-2 mb-1.5 tracking-wider">
                {sec.title}
              </div>
              <div className="space-y-1">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isCurrent = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.modal) {
                          setModalOpen(item.modal);
                          setOpenDrawer(false);
                        } else {
                          handleNavigate(item.id);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                        isCurrent
                          ? 'bg-rose-600 text-white font-medium'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isCurrent ? 'text-white' : 'text-slate-400'}`} />
                        <div>
                          <div className="text-xs font-medium leading-snug">{item.th}</div>
                          <div className={`text-[9px] ${isCurrent ? 'text-rose-100' : 'text-slate-500'}`}>
                            {item.en}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/70 text-center">
          <p className="text-[10px] text-slate-500">
            Sale Paint v1.0.0 • Mobile-First PWA
          </p>
        </div>
      </div>
    </div>
  );
};
