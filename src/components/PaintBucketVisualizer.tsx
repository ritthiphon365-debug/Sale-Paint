import React from 'react';
import { Sparkles, Trophy, Flame, CheckCircle2 } from 'lucide-react';

interface PaintBucketVisualizerProps {
  currentSales: number;
  targetSales: number;
  achievementPercent: number;
  gap: number;
  expectedMonthEndSales: number;
  daysRemaining: number;
}

export const PaintBucketVisualizer: React.FC<PaintBucketVisualizerProps> = ({
  currentSales,
  targetSales,
  achievementPercent,
  gap,
  expectedMonthEndSales,
  daysRemaining,
}) => {
  // Cap visual fill between 5% and 100% for aesthetic balance
  const visualFill = Math.min(100, Math.max(8, achievementPercent));
  const isTargetMet = achievementPercent >= 100;

  // Liquid color scheme
  const themeColor =
    achievementPercent >= 100
      ? {
          primary: '#10B981', // emerald
          secondary: '#059669',
          bgLight: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          badge: 'bg-emerald-500 text-white',
          glow: 'rgba(16, 185, 129, 0.4)',
        }
      : achievementPercent >= 80
      ? {
          primary: '#F59E0B', // amber
          secondary: '#D97706',
          bgLight: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200',
          badge: 'bg-amber-500 text-white',
          glow: 'rgba(245, 158, 11, 0.4)',
        }
      : {
          primary: '#E11D48', // rose
          secondary: '#BE123C',
          bgLight: 'bg-rose-50',
          text: 'text-rose-700',
          border: 'border-rose-200',
          badge: 'bg-rose-500 text-white',
          glow: 'rgba(225, 29, 72, 0.4)',
        };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm relative overflow-hidden">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* Left: Info & Milestones */}
        <div className="space-y-4 flex-1 w-full">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${themeColor.bgLight} ${themeColor.text} ${themeColor.border}`}
            >
              {isTargetMet ? <Trophy className="w-3.5 h-3.5" /> : <Flame className="w-3.5 h-3.5" />}
              {isTargetMet ? 'บรรลุเป้าหมายการขาย 100%+ แล้ว!' : 'ถังสีเติมยอดขายเป้าหมายประจำเดือน'}
            </span>
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              ยอดขายสะสมเดือนนี้
            </h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-mono">
                ฿{currentSales.toLocaleString()}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                / เป้า ฿{targetSales.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Progress bar info & forecast */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[11px] text-slate-400 block font-medium">ความคืบหน้า</span>
              <span className="text-lg font-bold text-slate-900 font-mono">
                {achievementPercent.toFixed(1)}%
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <span className="text-[11px] text-slate-400 block font-medium">
                {isTargetMet ? 'ยอดเกินเป้า' : 'ขาดอีก'}
              </span>
              <span className={`text-lg font-bold font-mono ${isTargetMet ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isTargetMet
                  ? `+฿${(currentSales - targetSales).toLocaleString()}`
                  : `฿${gap.toLocaleString()}`}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-400 block font-medium">คาดการณ์สิ้นเดือน</span>
              <span className="text-lg font-bold text-indigo-600 font-mono">
                ฿{Math.round(expectedMonthEndSales).toLocaleString()}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            {isTargetMet
              ? '🎉 ยอดขายทะลุเป้าหมายแล้ว! คอมมิชชั่น Tier สูงสุดและสิทธิ์รับโบนัสพิเศษทำงานเต็มอัตรา'
              : `เหลือเวลาอีก ${daysRemaining} วันในการพิชิตเป้าหมายประจำเดือน`}
          </p>
        </div>

        {/* Right: The Interactive 3D Animated Paint Bucket */}
        <div className="relative flex flex-col items-center justify-center p-4">
          {/* Dripping Paint drops above the bucket */}
          <div className="relative w-24 h-8 flex justify-center overflow-hidden mb-1">
            <div
              className="w-2.5 h-3.5 rounded-full animate-bounce"
              style={{
                backgroundColor: themeColor.primary,
                boxShadow: `0 0 10px ${themeColor.glow}`,
                animationDuration: '1.4s',
              }}
            />
          </div>

          {/* SVG Paint Bucket Container */}
          <div className="relative w-44 h-56 flex items-center justify-center">
            <svg
              viewBox="0 0 160 200"
              className="w-full h-full drop-shadow-xl"
              style={{ overflow: 'visible' }}
            >
              <defs>
                {/* Paint Fill Gradient */}
                <linearGradient id="paintLiquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={themeColor.primary} />
                  <stop offset="100%" stopColor={themeColor.secondary} />
                </linearGradient>

                {/* Metallic Bucket Gradient */}
                <linearGradient id="bucketMetallic" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#CBD5E1" />
                  <stop offset="25%" stopColor="#F1F5F9" />
                  <stop offset="70%" stopColor="#E2E8F0" />
                  <stop offset="100%" stopColor="#94A3B8" />
                </linearGradient>

                {/* Rim Highlight */}
                <linearGradient id="rimMetallic" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#94A3B8" />
                  <stop offset="50%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#64748B" />
                </linearGradient>

                {/* Clip Path for Bucket Body */}
                <clipPath id="bucketInnerClip">
                  {/* Tapered Bucket Interior: top wide, bottom narrower */}
                  <polygon points="25,35 135,35 125,185 35,185" />
                </clipPath>
              </defs>

              {/* Bucket Handle */}
              <path
                d="M 20 40 C 20 -10, 140 -10, 140 40"
                fill="none"
                stroke="#64748B"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Handle Gripper */}
              <rect x="68" y="0" width="24" height="6" rx="3" fill="#334155" />

              {/* Bucket Body (Outer Outline) */}
              <polygon
                points="20,35 140,35 128,190 32,190"
                fill="url(#bucketMetallic)"
                stroke="#94A3B8"
                strokeWidth="2"
              />

              {/* Inner Liquid Filling Area */}
              <g clipPath="url(#bucketInnerClip)">
                {/* Background inside empty bucket */}
                <rect x="0" y="0" width="160" height="200" fill="#E2E8F0" opacity="0.4" />

                {/* Liquid Level Rectangle with Height matching visualFill */}
                {/* Bucket internal height is from y=35 (top) to y=185 (bottom), span=150px */}
                {/* y position = 185 - (150 * visualFill / 100) */}
                <rect
                  x="0"
                  y={185 - (150 * visualFill) / 100}
                  width="160"
                  height="200"
                  fill="url(#paintLiquidGradient)"
                  className="transition-all duration-1000 ease-out"
                />

                {/* Animated Wave Surface on top of liquid */}
                <ellipse
                  cx="80"
                  cy={185 - (150 * visualFill) / 100}
                  rx="50"
                  ry="7"
                  fill={themeColor.primary}
                  opacity="0.9"
                  className="transition-all duration-1000 ease-out"
                />
              </g>

              {/* Bucket Metal Rings / Ridges for Realistic Craftsmanship */}
              <line x1="28" y1="85" x2="132" y2="85" stroke="#94A3B8" strokeWidth="1.5" opacity="0.6" />
              <line x1="31" y1="135" x2="129" y2="135" stroke="#94A3B8" strokeWidth="1.5" opacity="0.6" />

              {/* Top Rim Ellipse */}
              <ellipse
                cx="80"
                cy="35"
                rx="60"
                ry="8"
                fill="url(#rimMetallic)"
                stroke="#64748B"
                strokeWidth="2"
              />

              {/* Measurement Target Notch (100% Mark Line) */}
              <line
                x1="22"
                y1="40"
                x2="35"
                y2="40"
                stroke="#E11D48"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <text x="38" y="44" fontSize="8" fontWeight="bold" fill="#E11D48" fontFamily="sans-serif">
                100% TARGET
              </text>

              {/* Measurement 50% Notch */}
              <line
                x1="26"
                y1="110"
                x2="36"
                y2="110"
                stroke="#64748B"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <text x="39" y="113" fontSize="7" fill="#64748B" fontFamily="sans-serif">
                50%
              </text>

              {/* Bottom Base Rim */}
              <ellipse
                cx="80"
                cy="190"
                rx="48"
                ry="6"
                fill="#94A3B8"
                stroke="#64748B"
                strokeWidth="1.5"
              />
            </svg>

            {/* Percentage Badge Floating on Bucket */}
            <div
              className={`absolute px-3 py-1 rounded-full text-xs font-black shadow-lg font-mono tracking-wider transition-all duration-700 ${themeColor.badge}`}
              style={{
                top: `${Math.max(15, Math.min(80, 85 - (visualFill * 0.7)))}%`,
              }}
            >
              {achievementPercent.toFixed(0)}%
            </div>
          </div>

          <span className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
            PAINT BUCKET FILL LEVEL
          </span>
        </div>
      </div>
    </div>
  );
};
