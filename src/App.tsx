import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNavigation } from './components/layout/MobileNavigation';
import { MobileDrawer } from './components/layout/MobileDrawer';

// Views
import { DashboardView } from './views/DashboardView';
import { SalesEntryView } from './views/SalesEntryView';
import { HistoryView } from './views/HistoryView';
import { StockView } from './views/StockView';
import { CustomersView } from './views/CustomersView';
import { CommissionView } from './views/CommissionView';
import { MarketShareView } from './views/MarketShareView';
import { YearlyView } from './views/YearlyView';
import { SyncView } from './views/SyncView';
import { SettingsView } from './views/SettingsView';
import { CatalogView } from './views/CatalogView';

// Modals
import { OrderModal } from './components/modals/OrderModal';
import { BulkStockModal } from './components/modals/BulkStockModal';
import { TargetModal } from './components/modals/TargetModal';
import { DailyBriefModal } from './components/modals/DailyBriefModal';
import { WeeklyReviewModal } from './components/modals/WeeklyReviewModal';
import { ImportExportModal } from './components/modals/ImportExportModal';
import { ImportSalesModal } from './components/modals/ImportSalesModal';
import { PwaInstallModal } from './components/modals/PwaInstallModal';
import { AuditLogsModal } from './components/modals/AuditLogsModal';

const AppContent: React.FC = () => {
  const { activeTab, isOnline, toastMessage } = useApp();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'sales-entry':
        return <SalesEntryView />;
      case 'catalog':
        return <CatalogView />;
      case 'history':
        return <HistoryView />;
      case 'stock':
        return <StockView />;
      case 'customers':
        return <CustomersView />;
      case 'commission':
        return <CommissionView />;
      case 'market-share':
        return <MarketShareView />;
      case 'yearly':
        return <YearlyView />;
      case 'sheets-sync':
        return <SyncView />;
      case 'settings':
      case 'brand-settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col md:flex-row antialiased font-sans">
      {/* Desktop Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Viewport */}
      <main className="flex-1 pb-24 md:pb-6 overflow-y-auto min-h-screen">
        {/* Offline Warning banner if internet drops */}
        {!isOnline && (
          <div className="bg-amber-500 text-slate-900 px-4 py-2 text-xs font-semibold text-center sticky top-0 z-30 shadow-xs">
            ⚠️ คุณกำลังทำงานในโหมดออฟไลน์ (Offline Mode) • ข้อมูลจะถูกบันทึกลงในเครื่อง และซิงค์ขึ้นระบบเมื่อมีอินเทอร์เน็ต
          </div>
        )}

        {renderActiveView()}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNavigation />

      {/* Mobile Drawer */}
      <MobileDrawer />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2 max-w-sm transition-all duration-300 ${
            toastMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : toastMessage.type === 'info'
              ? 'bg-slate-900 border-slate-700 text-white'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              toastMessage.type === 'error'
                ? 'bg-rose-600'
                : toastMessage.type === 'info'
                ? 'bg-amber-400'
                : 'bg-emerald-500'
            }`}
          />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Global Interactive Modals */}
      <OrderModal />
      <BulkStockModal />
      <TargetModal />
      <DailyBriefModal />
      <WeeklyReviewModal />
      <ImportExportModal />
      <ImportSalesModal />
      <PwaInstallModal />
      <AuditLogsModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
