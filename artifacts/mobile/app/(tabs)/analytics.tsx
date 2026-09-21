import React, { useMemo } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path, Circle, Polyline } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useLanguage, useRTL } from '@/context/LanguageContext';
import { useSubscriptions, getCategoryColor, getCategoryLabel, Category, getMonthlyShareAmount } from '@/context/SubscriptionContext';
import { useBills } from '@/context/BillsContext';
import { useLoans } from '@/context/LoanContext';
import { useMonthlySnapshots, MonthlySnapshot } from '@/hooks/useMonthlySnapshots';
import { useAuth } from '@/context/AuthContext';

function formatSAR(n: number) {
  return n.toLocaleString('en-SA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function shortMonth(yyyyMM: string, isRTL: boolean): string {
  const [y, m] = yyyyMM.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleString(isRTL ? 'ar-SA' : 'en-SA', { month: 'short' });
}

// ── Donut chart (SVG) ─────────────────────────────────────────────────────────
interface DonutSegment { color: string; pct: number; label: string; amount: number }

function polarXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function makeArcPath(cx: number, cy: number, R: number, r: number, startDeg: number, endDeg: number): string {
  const sweep = endDeg - startDeg;
  if (sweep >= 359.9) {
    // Full circle — two half-arcs to avoid degenerate SVG
    const p1 = polarXY(cx, cy, R, 0); const p2 = polarXY(cx, cy, R, 180);
    const i1 = polarXY(cx, cy, r, 0); const i2 = polarXY(cx, cy, r, 180);
    return [
      `M ${p1.x} ${p1.y} A ${R} ${R} 0 1 1 ${p2.x} ${p2.y} A ${R} ${R} 0 1 1 ${p1.x} ${p1.y}`,
      `M ${i1.x} ${i1.y} A ${r} ${r} 0 1 0 ${i2.x} ${i2.y} A ${r} ${r} 0 1 0 ${i1.x} ${i1.y}`,
    ].join(' ');
  }
  const p1 = polarXY(cx, cy, R, startDeg);
  const p2 = polarXY(cx, cy, R, endDeg);
  const i1 = polarXY(cx, cy, r, startDeg);
  const i2 = polarXY(cx, cy, r, endDeg);
  const large = sweep > 180 ? 1 : 0;
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${R} ${R} 0 ${large} 1 ${p2.x} ${p2.y}`,
    `L ${i2.x} ${i2.y}`,
    `A ${r} ${r} 0 ${large} 0 ${i1.x} ${i1.y}`,
    'Z',
  ].join(' ');
}

function DonutChart({ segments, size = 180 }: { segments: DonutSegment[]; size?: number }) {
  const cx = size / 2, cy = size / 2;
  const R = size / 2 - 10, r = R - 34;
  let angle = 0;
  return (
    <Svg width={size} height={size}>
      {segments.map((seg, i) => {
        if (seg.pct < 0.003) return null;
        const start = angle;
        angle += seg.pct * 360;
        return (
          <Path key={i} d={makeArcPath(cx, cy, R, r, start, angle)} fill={seg.color} />
        );
      })}
      {/* Donut hole */}
      <Circle cx={cx} cy={cy} r={r - 2} fill="transparent" />
    </Svg>
  );
}

// ── Bar chart (pure View) ────────────────────────────────────────────────────
function BarChart({
  data,
  primaryColor,
  mutedColor,
  textColor,
  mutedText,
  fontBold,
  fontReg,
  isRTL,
}: {
  data: MonthlySnapshot[];
  primaryColor: string;
  mutedColor: string;
  textColor: string;
  mutedText: string;
  fontBold: string;
  fontReg: string;
  isRTL: boolean;
}) {
  const maxVal = Math.max(...data.map(d => d.total), 1);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const bars = data.slice(-6); // last 6 months
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 130, paddingHorizontal: 4 }}>
      {bars.map(snap => {
        const isCurrent = snap.month === currentMonth;
        const heightPct = snap.total / maxVal;
        return (
          <View key={snap.month} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            {/* Amount label on current month */}
            {isCurrent && (
              <Text style={{ color: primaryColor, fontFamily: fontBold, fontSize: 9, textAlign: 'center' }} numberOfLines={1}>
                {formatSAR(snap.total)}
              </Text>
            )}
            {!isCurrent && <View style={{ height: 14 }} />}
            <View style={{ flex: 1, width: '100%', justifyContent: 'flex-end' }}>
              <View style={{
                width: '100%',
                height: `${Math.max(4, heightPct * 100)}%`,
                backgroundColor: isCurrent ? primaryColor : mutedColor,
                borderRadius: 5,
                opacity: isCurrent ? 1 : 0.55,
              }} />
            </View>
            <Text style={{ color: mutedText, fontFamily: fontReg, fontSize: 9, textAlign: 'center' }}>
              {shortMonth(snap.month, isRTL)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ── Savings rate sparkline (SVG) ─────────────────────────────────────────────
function SavingsSparkline({ rates, color, width = 80, height = 32 }: {
  rates: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (rates.length < 2) return null;
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const range = max - min || 1;
  const points = rates.map((r, i) => {
    const x = (i / (rates.length - 1)) * width;
    const y = height - ((r - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ── Savings rate arc gauge (SVG) ──────────────────────────────────────────────
function SavingsGauge({ pct, color, size = 100 }: { pct: number; color: string; size?: number }) {
  const cx = size / 2, cy = size / 2 + 8;
  const R = size / 2 - 8;
  // Arc from -180° to 0° (left to right, bottom half)
  const startAngle = -180;
  const endAngle = 0;
  const totalArc = endAngle - startAngle; // 180°
  const fillAngle = startAngle + Math.min(pct / 100, 1) * totalArc;

  function arcPoint(angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad) };
  }
  const s = arcPoint(startAngle);
  const e = arcPoint(fillAngle);
  const large = (fillAngle - startAngle) > 180 ? 1 : 0;
  const trackE = arcPoint(endAngle);

  return (
    <Svg width={size} height={size / 2 + 10}>
      {/* Track */}
      <Path
        d={`M ${s.x} ${s.y} A ${R} ${R} 0 0 1 ${trackE.x} ${trackE.y}`}
        fill="none"
        stroke="#333"
        strokeWidth={8}
        strokeLinecap="round"
      />
      {/* Fill */}
      {pct > 0 && (
        <Path
          d={`M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function AnalyticsScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { t, fonts, isRTL } = useLanguage();
  const rtl = useRTL();
  const router = useRouter();
  const { user } = useAuth();

  const { subscriptions, monthlyTotal } = useSubscriptions();
  const { bills, monthlyBillsTotal }    = useBills();
  const { loans, monthlyPayments }      = useLoans();

  const snapshots = useMonthlySnapshots(monthlyTotal, monthlyBillsTotal, monthlyPayments, subscriptions);
  const topPadding = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const totalOutflow = monthlyTotal + monthlyBillsTotal + monthlyPayments;

  // ── Category donut segments ──────────────────────────────────────────────
  const donutSegments = useMemo<DonutSegment[]>(() => {
    const parts: DonutSegment[] = [];
    const grand = totalOutflow || 1;

    // Subscription categories — use per-user share to stay consistent with monthlyTotal
    const catMap: Record<string, number> = {};
    subscriptions.filter(s => s.status === 'active').forEach(s => {
      catMap[s.category] = (catMap[s.category] ?? 0) + getMonthlyShareAmount(s);
    });
    Object.entries(catMap).forEach(([cat, amt]) => {
      parts.push({
        color: getCategoryColor(cat as Category),
        pct: amt / grand,
        label: getCategoryLabel(cat as Category),
        amount: amt,
      });
    });

    // Bills as one segment
    if (monthlyBillsTotal > 0) {
      parts.push({ color: '#FF6B6B', pct: monthlyBillsTotal / grand, label: t('analytics_seg_bills'), amount: monthlyBillsTotal });
    }
    // Loans as one segment
    if (monthlyPayments > 0) {
      parts.push({ color: '#45B7D1', pct: monthlyPayments / grand, label: t('analytics_seg_loans'), amount: monthlyPayments });
    }

    return parts.sort((a, b) => b.pct - a.pct);
  }, [subscriptions, monthlyTotal, monthlyBillsTotal, monthlyPayments, totalOutflow, t]);

  // ── Subscription creep score ─────────────────────────────────────────────
  const creep = useMemo(() => {
    if (snapshots.length < 2) return null;
    const oldest = snapshots[0].subs;
    const current = snapshots[snapshots.length - 1].subs;
    if (oldest === 0) return null;
    const pct = ((current - oldest) / oldest) * 100;
    const months = snapshots.length - 1;
    return { pct, months };
  }, [snapshots]);

  // ── Savings rate ─────────────────────────────────────────────────────────
  const savingsRate = useMemo(() => {
    const income = user?.income;
    if (!income || income <= 0) return null;
    const rate = Math.max(0, ((income - totalOutflow) / income) * 100);
    return { rate, income };
  }, [user?.income, totalOutflow]);

  // Historical savings rates from snapshots (for sparkline)
  const savingsRateHistory = useMemo(() => {
    const income = user?.income;
    if (!income || income <= 0 || snapshots.length < 2) return [];
    return snapshots.map(s => Math.max(0, ((income - s.total) / income) * 100));
  }, [user?.income, snapshots]);

  const savingsColor = !savingsRate ? colors.primary
    : savingsRate.rate >= 20 ? '#00D9A6'
    : savingsRate.rate >= 10 ? '#F59E0B'
    : '#FF4757';

  const savingsLabel = !savingsRate ? ''
    : savingsRate.rate >= 20 ? t('analytics_savings_green')
    : savingsRate.rate >= 10 ? t('analytics_savings_amber')
    : t('analytics_savings_red');

  const sparkTrend = useMemo(() => {
    if (savingsRateHistory.length < 2) return null;
    const last = savingsRateHistory[savingsRateHistory.length - 1];
    const prev = savingsRateHistory[savingsRateHistory.length - 2];
    const diff = last - prev;
    if (Math.abs(diff) < 1) return 'flat';
    return diff > 0 ? 'up' : 'down';
  }, [savingsRateHistory]);

  const creepColor  = !creep ? colors.primary
    : creep.pct >= 50 ? '#FF4757'
    : creep.pct >= 20 ? '#F59E0B'
    : '#00D9A6';
  const creepLabel  = !creep ? t('analytics_creep_na')
    : creep.pct >= 50 ? t('analytics_creep_high')
    : creep.pct >= 20 ? t('analytics_creep_mid')
    : t('analytics_creep_low');

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 100 : 90 }}
    >
      {/* ── Header ── */}
      <LinearGradient
        colors={['#1A0E3C', '#0A0E1A']}
        style={[styles.hero, { paddingTop: topPadding + 20 }]}
      >
        <Text style={[styles.heroTitle, { fontFamily: fonts.bold, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('analytics_title')}
        </Text>
        <Text style={[styles.heroSub, { fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('analytics_subtitle')}
        </Text>
        <View style={[styles.heroStats, rtl.row()]}>
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatVal, { fontFamily: fonts.bold }]}>SAR {formatSAR(totalOutflow)}</Text>
            <Text style={[styles.heroStatLbl, { fontFamily: fonts.regular }]}>{t('analytics_this_month')}</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatVal, { fontFamily: fonts.bold }]}>SAR {formatSAR(totalOutflow * 12)}</Text>
            <Text style={[styles.heroStatLbl, { fontFamily: fonts.regular }]}>{t('analytics_per_year')}</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatVal, { fontFamily: fonts.bold }]}>{snapshots.length}</Text>
            <Text style={[styles.heroStatLbl, { fontFamily: fonts.regular }]}>{t('analytics_months_tracked')}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Bar chart ── */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, rtl.row()]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>
            {t('analytics_trend_title')}
          </Text>
          <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
            <Feather name="bar-chart-2" size={12} color={colors.primary} />
            <Text style={[styles.badgeText, { color: colors.primary, fontFamily: fonts.semibold }]}>
              {t('analytics_6mo')}
            </Text>
          </View>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {snapshots.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="bar-chart-2" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
                {t('analytics_no_data')}
              </Text>
            </View>
          ) : (
            <BarChart
              data={snapshots}
              primaryColor={colors.primary}
              mutedColor={colors.primary}
              textColor={colors.foreground}
              mutedText={colors.mutedForeground}
              fontBold={fonts.bold}
              fontReg={fonts.regular}
              isRTL={isRTL}
            />
          )}
          {/* Breakdown legend */}
          <View style={[styles.legendRow, rtl.row(), { marginTop: 16 }]}>
            {[
              { label: t('analytics_seg_subs'),  color: colors.primary,   val: monthlyTotal },
              { label: t('analytics_seg_bills'), color: '#FF6B6B',         val: monthlyBillsTotal },
              { label: t('analytics_seg_loans'), color: '#45B7D1',         val: monthlyPayments },
            ].map(item => (
              <View key={item.label} style={[styles.legendItem, rtl.row()]}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <View>
                  <Text style={[styles.legendLabel, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>{item.label}</Text>
                  <Text style={[styles.legendVal, { color: colors.foreground, fontFamily: fonts.semibold }]}>SAR {formatSAR(item.val)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── Category donut ── */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, rtl.row()]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>
            {t('analytics_cat_title')}
          </Text>
          {user?.income && user.income > 0 && (
            <Text style={[styles.incomeAnnotation, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
              {t('analytics_vs_income').replace('{amount}', formatSAR(user.income))}
            </Text>
          )}
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {donutSegments.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="pie-chart" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
                {t('analytics_no_data')}
              </Text>
            </View>
          ) : (
            <View style={[styles.donutRow, rtl.row()]}>
              {/* Donut */}
              <View style={styles.donutWrap}>
                <DonutChart segments={donutSegments} size={160} />
                {/* Center label */}
                <View style={styles.donutCenter}>
                  <Text style={[styles.donutCenterVal, { color: colors.foreground, fontFamily: fonts.bold }]}>
                    SAR {formatSAR(totalOutflow)}
                  </Text>
                  <Text style={[styles.donutCenterLbl, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
                    /mo
                  </Text>
                </View>
              </View>
              {/* Legend */}
              <View style={styles.donutLegend}>
                {donutSegments.map(seg => {
                  const incomePct = user?.income && user.income > 0
                    ? (seg.amount / user.income) * 100
                    : null;
                  return (
                    <View key={seg.label} style={[styles.donutLegendRow, rtl.row()]}>
                      <View style={[styles.donutLegendDot, { backgroundColor: seg.color }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.donutLegendLabel, { color: colors.foreground, fontFamily: fonts.medium }]} numberOfLines={1}>
                          {seg.label}
                        </Text>
                        <Text style={[styles.donutLegendPct, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
                          {(seg.pct * 100).toFixed(1)}% · SAR {formatSAR(seg.amount)}
                        </Text>
                        {incomePct !== null && (
                          <Text style={[styles.donutLegendIncome, { color: colors.primary, fontFamily: fonts.regular }]}>
                            {t('analytics_income_pct').replace('{pct}', incomePct.toFixed(1))}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </View>

      {/* ── Subscription creep score ── */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, rtl.row()]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>
            {t('analytics_creep_title')}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {!creep ? (
            <View style={styles.creepEmpty}>
              <Feather name="trending-up" size={28} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
                {t('analytics_creep_wait')}
              </Text>
            </View>
          ) : (
            <View style={[styles.creepContent, rtl.row()]}>
              <LinearGradient
                colors={[creepColor + '30', creepColor + '10']}
                style={[styles.creepIconBox, { borderRadius: 16 }]}
              >
                <Feather
                  name={creep.pct >= 20 ? 'trending-up' : 'check-circle'}
                  size={28}
                  color={creepColor}
                />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <View style={[styles.creepTopRow, rtl.row()]}>
                  <Text style={[styles.creepPct, { color: creepColor, fontFamily: fonts.bold }]}>
                    {creep.pct > 0 ? '+' : ''}{creep.pct.toFixed(1)}%
                  </Text>
                  <View style={[styles.creepBadge, { backgroundColor: creepColor + '20' }]}>
                    <Text style={[styles.creepBadgeText, { color: creepColor, fontFamily: fonts.semibold }]}>
                      {creepLabel}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.creepDesc, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
                  {creep.pct > 0
                    ? t('analytics_creep_grew').replace('{pct}', Math.abs(creep.pct).toFixed(1)).replace('{n}', String(creep.months))
                    : t('analytics_creep_shrunk').replace('{pct}', Math.abs(creep.pct).toFixed(1)).replace('{n}', String(creep.months))
                  }
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* ── Spend split bar ── */}
      {totalOutflow > 0 && (
        <View style={styles.section}>
          <View style={[styles.sectionHeader, rtl.row()]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>
              {t('analytics_split_title')}
            </Text>
            {user?.income && user.income > 0 && (
              <Text style={[styles.incomeAnnotation, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
                {t('analytics_vs_income').replace('{amount}', formatSAR(user.income))}
              </Text>
            )}
          </View>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            {/* Stacked bar */}
            <View style={styles.splitBar}>
              {monthlyTotal > 0 && (
                <View style={[styles.splitSegment, { flex: monthlyTotal, backgroundColor: colors.primary }]} />
              )}
              {monthlyBillsTotal > 0 && (
                <View style={[styles.splitSegment, { flex: monthlyBillsTotal, backgroundColor: '#FF6B6B' }]} />
              )}
              {monthlyPayments > 0 && (
                <View style={[styles.splitSegment, { flex: monthlyPayments, backgroundColor: '#45B7D1' }]} />
              )}
            </View>
            {/* Labels */}
            {[
              { label: t('analytics_seg_subs'),  color: colors.primary, val: monthlyTotal,       pct: monthlyTotal / totalOutflow * 100 },
              { label: t('analytics_seg_bills'), color: '#FF6B6B',       val: monthlyBillsTotal, pct: monthlyBillsTotal / totalOutflow * 100 },
              { label: t('analytics_seg_loans'), color: '#45B7D1',       val: monthlyPayments,   pct: monthlyPayments / totalOutflow * 100 },
            ].filter(i => i.val > 0).map(item => {
              const incomePct = user?.income && user.income > 0
                ? (item.val / user.income) * 100
                : null;
              return (
                <View key={item.label} style={[styles.splitRow, rtl.row(), { borderTopColor: colors.border }]}>
                  <View style={[styles.splitDot, { backgroundColor: item.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.splitLabel, { color: colors.foreground, fontFamily: fonts.medium }]}>{item.label}</Text>
                    {incomePct !== null && (
                      <Text style={[styles.splitIncomePct, { color: colors.primary, fontFamily: fonts.regular }]}>
                        {t('analytics_income_pct').replace('{pct}', incomePct.toFixed(1))}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.splitPct, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
                    {item.pct.toFixed(1)}%
                  </Text>
                  <Text style={[styles.splitVal, { color: colors.foreground, fontFamily: fonts.semibold }]}>
                    SAR {formatSAR(item.val)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* ── Savings Rate ── */}
      <View style={styles.section}>
        <View style={[styles.sectionHeader, rtl.row()]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>
            {t('analytics_savings_title')}
          </Text>
          {savingsRate && (
            <View style={[styles.badge, { backgroundColor: savingsColor + '20' }]}>
              <Feather name="trending-up" size={12} color={savingsColor} />
              <Text style={[styles.badgeText, { color: savingsColor, fontFamily: fonts.semibold }]}>
                {savingsLabel}
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
          {!savingsRate ? (
            /* No income set — prompt */
            <View style={styles.savingsEmpty}>
              <LinearGradient
                colors={[colors.primary + '30', colors.primary + '10']}
                style={[styles.savingsEmptyIcon, { borderRadius: 16 }]}
              >
                <Feather name="dollar-sign" size={28} color={colors.primary} />
              </LinearGradient>
              <Text style={[styles.savingsEmptyText, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
                {t('analytics_savings_no_income')}
              </Text>
              <Pressable
                onPress={() => router.push('/(tabs)/settings')}
                style={[styles.savingsSetBtn, { backgroundColor: colors.primary + '20', borderRadius: 10 }]}
              >
                <Text style={[styles.savingsSetBtnText, { color: colors.primary, fontFamily: fonts.semibold }]}>
                  {t('analytics_savings_set_income')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View>
              {/* Gauge + rate number */}
              <View style={[styles.savingsGaugeRow, rtl.row()]}>
                <View style={styles.savingsGaugeWrap}>
                  <SavingsGauge pct={savingsRate.rate} color={savingsColor} size={110} />
                  <View style={styles.savingsGaugeLabel}>
                    <Text style={[styles.savingsRateNum, { color: savingsColor, fontFamily: fonts.bold }]}>
                      {savingsRate.rate.toFixed(1)}%
                    </Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.savingsRateDesc, { color: colors.foreground, fontFamily: fonts.medium }]}>
                    {t('analytics_savings_rate').replace('{pct}', savingsRate.rate.toFixed(1))}
                  </Text>
                  <Text style={[styles.savingsIncomeRow, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
                    Income: SAR {formatSAR(savingsRate.income)} · Outflow: SAR {formatSAR(totalOutflow)}
                  </Text>
                  {/* Sparkline + trend */}
                  {savingsRateHistory.length >= 2 && (
                    <View style={[styles.savingsSparkRow, rtl.row()]}>
                      <SavingsSparkline rates={savingsRateHistory} color={savingsColor} width={80} height={28} />
                      <Text style={[styles.savingsTrendText, { color: savingsColor, fontFamily: fonts.semibold }]}>
                        {sparkTrend === 'up'   ? t('analytics_savings_trend_up')
                         : sparkTrend === 'down' ? t('analytics_savings_trend_down')
                         : t('analytics_savings_trend_flat')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              {/* Colour legend */}
              <View style={[styles.savingsLegend, rtl.row(), { borderTopColor: colors.border }]}>
                {[
                  { color: '#FF4757', label: '<10%' },
                  { color: '#F59E0B', label: '10–20%' },
                  { color: '#00D9A6', label: '≥20%' },
                ].map(item => (
                  <View key={item.label} style={[styles.savingsLegendItem, rtl.row()]}>
                    <View style={[styles.savingsLegendDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.savingsLegendText, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  hero: { paddingHorizontal: 20, paddingBottom: 24 },
  heroTitle: { color: '#fff', fontSize: 24, marginBottom: 4 },
  heroSub:   { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20 },
  heroStats: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 },
  heroStat:  { flex: 1, alignItems: 'center', gap: 3 },
  heroStatVal:  { color: '#fff', fontSize: 14 },
  heroStatLbl:  { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
  heroStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 4 },

  section:          { marginTop: 24 },
  sectionHeader:    { justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle:     { fontSize: 17 },
  incomeAnnotation: { fontSize: 11, opacity: 0.75 },

  badge:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeText: { fontSize: 11 },

  card: { marginHorizontal: 16, padding: 16, borderWidth: 1 },

  emptyBox:  { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 13, textAlign: 'center' },

  legendRow:  { gap: 0 },
  legendItem: { flex: 1, gap: 6, alignItems: 'center' },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendLabel:{ fontSize: 10 },
  legendVal:  { fontSize: 12 },

  donutRow:    { gap: 16, alignItems: 'center' },
  donutWrap:   { position: 'relative', width: 160, height: 160, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutCenterVal: { color: '#fff', fontSize: 13 },
  donutCenterLbl: { fontSize: 10 },
  donutLegend: { flex: 1, gap: 8 },
  donutLegendRow:  { gap: 8, alignItems: 'center' },
  donutLegendDot:  { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  donutLegendLabel:  { fontSize: 12 },
  donutLegendPct:    { fontSize: 10, marginTop: 1 },
  donutLegendIncome: { fontSize: 10, marginTop: 1 },

  creepEmpty:   { alignItems: 'center', paddingVertical: 20, gap: 8 },
  creepContent: { gap: 14, alignItems: 'center' },
  creepIconBox: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  creepTopRow:  { gap: 10, alignItems: 'center', marginBottom: 4 },
  creepPct:     { fontSize: 26 },
  creepBadge:   { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  creepBadgeText: { fontSize: 12 },
  creepDesc:    { fontSize: 13, lineHeight: 19 },

  splitBar:     { height: 14, flexDirection: 'row', borderRadius: 7, overflow: 'hidden', marginBottom: 12 },
  splitSegment: { height: '100%' },
  splitRow:     { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 10, gap: 10, alignItems: 'center' },
  splitDot:     { width: 10, height: 10, borderRadius: 5 },
  splitLabel:     { fontSize: 13 },
  splitIncomePct: { fontSize: 10, marginTop: 1 },
  splitPct:       { fontSize: 12, width: 40, textAlign: 'right' },
  splitVal:       { fontSize: 13, width: 80, textAlign: 'right' },

  // Savings rate
  savingsEmpty:       { alignItems: 'center', paddingVertical: 20, gap: 12 },
  savingsEmptyIcon:   { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  savingsEmptyText:   { fontSize: 13, textAlign: 'center', lineHeight: 20, paddingHorizontal: 12 },
  savingsSetBtn:      { paddingHorizontal: 16, paddingVertical: 8 },
  savingsSetBtnText:  { fontSize: 13 },
  savingsGaugeRow:    { gap: 14, alignItems: 'center', marginBottom: 4 },
  savingsGaugeWrap:   { position: 'relative', alignItems: 'center' },
  savingsGaugeLabel:  { position: 'absolute', bottom: 0, alignItems: 'center' },
  savingsRateNum:     { fontSize: 22 },
  savingsRateDesc:    { fontSize: 13, lineHeight: 19, marginBottom: 4 },
  savingsIncomeRow:   { fontSize: 11, lineHeight: 16, marginBottom: 8 },
  savingsSparkRow:    { gap: 8, alignItems: 'center' },
  savingsTrendText:   { fontSize: 11 },
  savingsLegend:      { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 8, gap: 0, justifyContent: 'space-around' },
  savingsLegendItem:  { gap: 5, alignItems: 'center' },
  savingsLegendDot:   { width: 8, height: 8, borderRadius: 4 },
  savingsLegendText:  { fontSize: 10 },
});
