import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Phone,
  Calendar,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CustomerCRM, FollowUpStatus } from '../types';

export const CustomersView: React.FC = () => {
  const { customers } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = searchQuery.toLowerCase();
      const matchQuery =
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone ? c.phone.includes(searchQuery) : false);

      if (!matchQuery) return false;
      if (selectedStatus !== 'ALL' && c.followUpStatus !== selectedStatus) return false;
      return true;
    });
  }, [customers, searchQuery, selectedStatus]);

  const totalCustomers = customers.length;
  const overdueCount = customers.filter((c) => c.followUpStatus === 'OVERDUE').length;
  const dueCount = customers.filter((c) => c.followUpStatus === 'DUE').length;

  const renderBadge = (status: FollowUpStatus) => {
    switch (status) {
      case 'OVERDUE':
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-red-100 text-red-700 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> เกินกำหนด (OVERDUE)
          </span>
        );
      case 'DUE':
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
            <Clock className="w-3 h-3" /> ถึงรอบซื้อ (DUE)
          </span>
        );
      case 'NEW':
        return (
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
            ลูกค้าใหม่ (NEW)
          </span>
        );
      case 'OK':
      default:
        return (
          <span className="px-2.5 py-1 text-[11px] font-medium rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> สัมพันธ์ปกติ (OK)
          </span>
        );
    }
  };

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-600" />
            ลูกค้าสัมพันธ์และประวัติการสั่งซื้อ (CRM)
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium">
            Customer CRM • สร้างข้อมูลอัตโนมัติจากการบันทึกขาย วิเคราะห์รอบสั่งซื้อ และแจ้งเตือนติดตามงาน (Follow-up)
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium">ลูกค้าทั้งหมดในระบบ</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {totalCustomers}
            <span className="text-xs font-normal text-slate-400 ml-1">ราย</span>
          </div>
          <span className="text-[11px] text-slate-400">สร้างจากประวัติการขาย</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium">ถึงรอบสั่งซื้อใหม่ (Due)</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            {dueCount}
            <span className="text-xs font-normal text-slate-400 ml-1">ราย</span>
          </div>
          <span className="text-[11px] text-slate-400">รอบสั่งซื้อเฉลี่ย × 0.9</span>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
          <span className="text-xs text-slate-500 font-medium">ขาดการติดต่อเกินรอบ (Overdue)</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">
            {overdueCount}
            <span className="text-xs font-normal text-slate-400 ml-1">ราย</span>
          </div>
          <span className="text-[11px] text-slate-400">เกินรอบเฉลี่ย × 1.4 ควรบกวนโทรสอบถาม</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อลูกค้า, ช่าง, โครงการ หรือเบอร์โทรศัพท์..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['ALL', 'DUE', 'OVERDUE', 'OK', 'NEW'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedStatus === st
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {st === 'ALL' ? 'ทั้งหมด' : st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl text-center text-slate-400">
            ไม่พบรายชื่อลูกค้า
          </div>
        ) : (
          filteredCustomers.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-3 hover:border-rose-200 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{c.name}</h3>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{c.phone || '-'}</span>
                    </div>
                  </div>
                  <div>{renderBadge(c.followUpStatus)}</div>
                </div>

                {/* Spending stats */}
                <div className="mt-3 p-3 bg-slate-50 rounded-xl grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">ยอดซื้อรวม</span>
                    <span className="font-bold text-slate-900 text-sm">
                      ฿{c.totalSpending.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">จำนวนบิล / ชิ้น</span>
                    <span className="font-semibold text-slate-700">
                      {c.billCount} บิล ({c.totalOrders} ชิ้น)
                    </span>
                  </div>
                </div>

                {/* Purchase cycle info */}
                <div className="mt-2 text-xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>รอบซื้อเฉลี่ย:</span>
                    <span className="font-medium text-slate-700">~{c.avgPurchaseCycleDays} วัน</span>
                  </div>
                  <div className="flex justify-between">
                    <span>สั่งล่าสุดเมื่อ:</span>
                    <span className="font-medium text-slate-700">
                      {c.lastOrderDate} ({c.daysSinceLastOrder} วันที่แล้ว)
                    </span>
                  </div>
                </div>

                {/* Favorite products */}
                {c.favoriteProducts && c.favoriteProducts.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-400 block mb-1">
                      สินค้าที่สั่งบ่อย:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {c.favoriteProducts.map((fav, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-medium"
                        >
                          {fav.productName} ({fav.quantity})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action */}
              {c.phone && c.phone !== '-' && (
                <div className="pt-2">
                  <a
                    href={`tel:${c.phone}`}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>โทรติดต่อลูกค้า</span>
                  </a>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
