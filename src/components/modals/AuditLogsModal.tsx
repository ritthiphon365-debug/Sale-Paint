import React from 'react';
import {
  ShieldAlert,
  Clock,
  X,
  User,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AuditLogsModal: React.FC = () => {
  const { modalOpen, setModalOpen, auditLogs } = useApp();

  if (modalOpen !== 'audit-logs') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <h2 className="font-bold text-base text-slate-900">
              บันทึกกิจกรรมและความปลอดภัย (Audit Security Logs)
            </h2>
          </div>
          <button
            onClick={() => setModalOpen(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto divide-y divide-slate-100 text-xs flex-1">
          {auditLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">ยังไม่มีประวัติกิจกรรม</div>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                    {log.action}
                  </span>
                  <span className="text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleString('th-TH')}
                  </span>
                </div>
                <div className="text-slate-600">{log.details}</div>
                <div className="text-[10px] text-slate-400">โดย: {log.user}</div>
              </div>
            ))
          )}
        </div>

        <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={() => setModalOpen(null)}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
