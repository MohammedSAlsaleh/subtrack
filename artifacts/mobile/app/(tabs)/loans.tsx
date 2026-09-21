import React, { useState, useRef } from 'react';
import {
  Animated,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Line, Text as SvgText, Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Rect, G } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useColors } from '@/hooks/useColors';
import {
  useLoans, Loan, LoanType,
  LOAN_TYPE_ICON, LOAN_TYPE_COLOR,
  daysUntil, loanProgress,
} from '@/context/LoanContext';
import { useLanguage, useRTL } from '@/context/LanguageContext';
import { PremiumGate } from '@/components/PremiumGate';
import { EmptyState } from '@/components/EmptyState';

// ─── Loan-type metadata ───────────────────────────────────────────────────────
const LOAN_TYPES: LoanType[] = ['credit_card', 'bnpl', 'personal_loan', 'other'];

// ─── Form state ───────────────────────────────────────────────────────────────
interface FormState {
  name: string; lender: string; type: LoanType;
  currentBalance: string; originalAmount: string;
  creditLimit: string; interestRate: string; minimumPayment: string;
  totalInstallments: string; paidInstallments: string; installmentAmount: string;
  nextPaymentDate: string; nextPaymentAmount: string;
}
const BLANK: FormState = {
  name: '', lender: '', type: 'credit_card',
  currentBalance: '', originalAmount: '',
  creditLimit: '', interestRate: '', minimumPayment: '',
  totalInstallments: '', paidInstallments: '', installmentAmount: '',
  nextPaymentDate: '', nextPaymentAmount: '',
};

function fmtDateInput(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}
function parseDate(ddmmyyyy: string): string | null {
  const [dd, mm, yyyy] = ddmmyyyy.split('/').map(Number);
  if (!dd || !mm || !yyyy || yyyy < 2024) return null;
  return new Date(yyyy, mm - 1, dd).toISOString().split('T')[0];
}

// ─── Payoff calculator ───────────────────────────────────────────────────────
interface PayoffResult {
  months: number;        // -1 = never (payment too low)
  totalInterest: number; // -1 = never
  payoffDate: Date | null;
}

function calcPayoff(
  balance: number,
  apr: number | undefined,
  monthlyPayment: number,
  type: LoanType,
  totalInstallments?: number,
  paidInstallments?: number,
): PayoffResult {
  if (balance <= 0) {
    return { months: 0, totalInterest: 0, payoffDate: new Date() };
  }

  // BNPL: no interest, use remaining installments
  if (type === 'bnpl') {
    const remaining = (totalInstallments ?? 0) - (paidInstallments ?? 0);
    const months = remaining > 0 ? remaining : (monthlyPayment > 0 ? Math.ceil(balance / monthlyPayment) : 0);
    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + months);
    return { months, totalInterest: 0, payoffDate };
  }

  // No interest
  if (!apr || apr === 0) {
    const months = monthlyPayment > 0 ? Math.ceil(balance / monthlyPayment) : 0;
    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + months);
    return { months, totalInterest: 0, payoffDate };
  }

  const monthlyRate = apr / 100 / 12;
  let b = balance;
  let months = 0;
  let totalInterest = 0;
  const MAX_MONTHS = 600; // 50-year cap

  while (b > 0.01 && months < MAX_MONTHS) {
    const interest = b * monthlyRate;
    if (monthlyPayment <= interest) {
      return { months: -1, totalInterest: -1, payoffDate: null };
    }
    totalInterest += interest;
    b = b + interest - monthlyPayment;
    months++;
  }

  if (months >= MAX_MONTHS) return { months: -1, totalInterest: -1, payoffDate: null };

  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + months);
  return { months, totalInterest, payoffDate };
}

// ─── Balance trajectory for chart ────────────────────────────────────────────
interface TrajectoryPoint { month: number; balance: number; }

function calcTrajectory(
  balance: number,
  apr: number | undefined,
  monthlyPayment: number,
  type: LoanType,
  totalInstallments?: number,
  paidInstallments?: number,
  maxPoints = 120,
): TrajectoryPoint[] {
  if (balance <= 0 || monthlyPayment <= 0) return [{ month: 0, balance: 0 }];

  const points: TrajectoryPoint[] = [{ month: 0, balance }];

  if (type === 'bnpl') {
    const remaining = (totalInstallments ?? 0) - (paidInstallments ?? 0);
    const months = remaining > 0 ? remaining : Math.ceil(balance / monthlyPayment);
    const perMonth = balance / Math.max(months, 1);
    let b = balance;
    for (let m = 1; m <= Math.min(months, maxPoints); m++) {
      b = Math.max(0, b - perMonth);
      points.push({ month: m, balance: Math.round(b) });
    }
    return points;
  }

  if (!apr || apr === 0) {
    let b = balance;
    let m = 0;
    while (b > 0.01 && m < maxPoints) {
      b = Math.max(0, b - monthlyPayment);
      m++;
      points.push({ month: m, balance: Math.round(b) });
    }
    return points;
  }

  const monthlyRate = apr / 100 / 12;
  let b = balance;
  let m = 0;
  while (b > 0.01 && m < maxPoints) {
    const interest = b * monthlyRate;
    if (monthlyPayment <= interest) break; // can't payoff
    b = Math.max(0, b + interest - monthlyPayment);
    m++;
    points.push({ month: m, balance: Math.round(b) });
  }
  return points;
}

// ─── Payoff Chart ─────────────────────────────────────────────────────────────
function PayoffChart({
  minPoints,
  extraPoints,
  minColor,
  extraColor,
}: {
  minPoints: TrajectoryPoint[];
  extraPoints: TrajectoryPoint[] | null;
  minColor: string;
  extraColor: string;
}) {
  const W = 320;
  const H = 160;
  const PAD = { top: 12, right: 16, bottom: 32, left: 48 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Touch state
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const viewWidthRef = useRef<number>(W);

  // Linger / fade-out state
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const lingerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const AnimatedG = useRef(Animated.createAnimatedComponent(G)).current;

  const clearLinger = () => {
    if (lingerTimerRef.current !== null) {
      clearTimeout(lingerTimerRef.current);
      lingerTimerRef.current = null;
    }
    fadeAnim.stopAnimation();
  };

  const startLinger = () => {
    clearLinger();
    // Start fade-out after 1.2 s, complete after 300 ms (total ~1.5 s)
    lingerTimerRef.current = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setActiveMonth(null);
      });
    }, 1200);
  };

  // Combine all points to determine scale
  const allPoints = extraPoints ? [...minPoints, ...extraPoints] : minPoints;
  const maxMonth = Math.max(...allPoints.map(p => p.month), 1);
  const maxBal   = Math.max(...allPoints.map(p => p.balance), 1);

  const scaleX = (m: number) => PAD.left + (m / maxMonth) * chartW;
  const scaleY = (b: number) => PAD.top + chartH - (b / maxBal) * chartH;

  const toPath = (pts: TrajectoryPoint[]) => {
    if (pts.length === 0) return '';
    return pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(p.month).toFixed(1)},${scaleY(p.balance).toFixed(1)}`)
      .join(' ');
  };

  const toFillPath = (pts: TrajectoryPoint[]) => {
    if (pts.length === 0) return '';
    const line = toPath(pts);
    const lastX = scaleX(pts[pts.length - 1].month).toFixed(1);
    const baseY = scaleY(0).toFixed(1);
    const firstX = scaleX(pts[0].month).toFixed(1);
    return `${line} L${lastX},${baseY} L${firstX},${baseY} Z`;
  };

  // Axis label helpers
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    val: Math.round(maxBal * f),
    y: scaleY(maxBal * f),
  }));

  // X tick marks — 3 evenly spaced
  const xTicks = [0, 0.5, 1].map(f => ({
    val: Math.round(maxMonth * f),
    x: scaleX(maxMonth * f),
  }));

  const minPath   = toPath(minPoints);
  const minFill   = toFillPath(minPoints);
  const extraPath = extraPoints ? toPath(extraPoints) : null;
  const extraFill = extraPoints ? toFillPath(extraPoints) : null;

  // Format balance labels compactly
  const fmtBal = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : `${v}`;
  const fmtBalShort = (v: number) => Math.round(v).toLocaleString();

  // Find balance at a given month (nearest point)
  const getPointAtMonth = (pts: TrajectoryPoint[], month: number): TrajectoryPoint => {
    let best = pts[0];
    let bestDist = Math.abs(pts[0].month - month);
    for (const p of pts) {
      const d = Math.abs(p.month - month);
      if (d < bestDist) { bestDist = d; best = p; }
    }
    return best;
  };

  // Touch → month mapping — kept in a ref so the panResponder always uses the
  // latest maxMonth even when the loan is edited while the simulator is open.
  const locationXToMonthRef = useRef<(locationX: number) => number>(null!);
  locationXToMonthRef.current = (locationX: number): number => {
    const scale = viewWidthRef.current / W;
    const relX = locationX / scale - PAD.left;
    const clamped = Math.max(0, Math.min(chartW, relX));
    return Math.round((clamped / chartW) * maxMonth);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        clearLinger();
        fadeAnim.setValue(1);
        setActiveMonth(locationXToMonthRef.current(e.nativeEvent.locationX));
      },
      onPanResponderMove: (e) => {
        clearLinger();
        fadeAnim.setValue(1);
        setActiveMonth(locationXToMonthRef.current(e.nativeEvent.locationX));
      },
      onPanResponderRelease: () => startLinger(),
      onPanResponderTerminate: () => startLinger(),
    })
  ).current;

  // Cursor + tooltip data
  let cursorX: number | null = null;
  let tooltipMinPt: TrajectoryPoint | null = null;
  let tooltipExtraPt: TrajectoryPoint | null = null;

  if (activeMonth !== null) {
    tooltipMinPt = getPointAtMonth(minPoints, activeMonth);
    cursorX = scaleX(tooltipMinPt.month);
    if (extraPoints && extraPoints.length > 0) {
      tooltipExtraPt = getPointAtMonth(extraPoints, activeMonth);
    }
  }

  // Tooltip positioning
  const tooltipW = extraPoints ? 148 : 96;
  const tooltipH = extraPoints ? 44 : 30;
  const tooltipPad = 6;
  let tooltipX = cursorX !== null ? cursorX - tooltipW / 2 : 0;
  tooltipX = Math.max(PAD.left, Math.min(W - PAD.right - tooltipW, tooltipX));
  const tooltipY = PAD.top + tooltipPad;

  return (
    <View
      onLayout={(e) => { viewWidthRef.current = e.nativeEvent.layout.width; }}
      {...panResponder.panHandlers}
      style={{ width: '100%' }}
    >
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <SvgLinearGradient id="minFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={minColor} stopOpacity="0.25" />
            <Stop offset="1" stopColor={minColor} stopOpacity="0.03" />
          </SvgLinearGradient>
          <SvgLinearGradient id="extraFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={extraColor} stopOpacity="0.20" />
            <Stop offset="1" stopColor={extraColor} stopOpacity="0.02" />
          </SvgLinearGradient>
        </Defs>

        {/* Grid lines */}
        {yLabels.map(({ y }, i) => (
          <Line key={i} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
            stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
        ))}

        {/* Fill areas */}
        {minFill ? <Path d={minFill} fill="url(#minFill)" /> : null}
        {extraFill ? <Path d={extraFill} fill="url(#extraFill)" /> : null}

        {/* Lines */}
        {minPath ? (
          <Path d={minPath} fill="none" stroke={minColor} strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />
        ) : null}
        {extraPath ? (
          <Path d={extraPath} fill="none" stroke={extraColor} strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />
        ) : null}

        {/* End dots (hidden when cursor is active) */}
        {cursorX === null && minPoints.length > 0 && (
          <Circle
            cx={scaleX(minPoints[minPoints.length - 1].month)}
            cy={scaleY(minPoints[minPoints.length - 1].balance)}
            r={4} fill={minColor} />
        )}
        {cursorX === null && extraPoints && extraPoints.length > 0 && (
          <Circle
            cx={scaleX(extraPoints[extraPoints.length - 1].month)}
            cy={scaleY(extraPoints[extraPoints.length - 1].balance)}
            r={4} fill={extraColor} />
        )}

        {/* Y-axis labels */}
        {yLabels.filter((_, i) => i % 2 === 0).map(({ val, y }, i) => (
          <SvgText key={i} x={PAD.left - 6} y={y + 4}
            fontSize="9" fill="rgba(255,255,255,0.4)" textAnchor="end">
            {fmtBal(val)}
          </SvgText>
        ))}

        {/* X-axis labels */}
        {xTicks.map(({ val, x }, i) => (
          <SvgText key={i} x={x} y={H - 6}
            fontSize="9" fill="rgba(255,255,255,0.4)" textAnchor="middle">
            {val}mo
          </SvgText>
        ))}

        {/* Axis lines */}
        <Line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={H - PAD.bottom}
          stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <Line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom}
          stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

        {/* ── Interactive cursor ── */}
        {cursorX !== null && tooltipMinPt !== null && (
          <AnimatedG opacity={fadeAnim}>
            {/* Vertical cursor line */}
            <Line
              x1={cursorX} y1={PAD.top}
              x2={cursorX} y2={H - PAD.bottom}
              stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"
              strokeDasharray="3,3"
            />

            {/* Dots on each trajectory at cursor */}
            <Circle cx={cursorX} cy={scaleY(tooltipMinPt.balance)} r={5}
              fill={minColor} stroke="rgba(0,0,0,0.6)" strokeWidth="1.5" />
            {tooltipExtraPt && (
              <Circle cx={cursorX} cy={scaleY(tooltipExtraPt.balance)} r={5}
                fill={extraColor} stroke="rgba(0,0,0,0.6)" strokeWidth="1.5" />
            )}

            {/* Tooltip background */}
            <Rect
              x={tooltipX} y={tooltipY}
              width={tooltipW} height={tooltipH}
              rx={6} ry={6}
              fill="rgba(20,16,40,0.92)"
              stroke="rgba(255,255,255,0.12)" strokeWidth="1"
            />

            {/* Month label */}
            <SvgText
              x={tooltipX + tooltipW / 2} y={tooltipY + 13}
              fontSize="9.5" fill="rgba(255,255,255,0.55)"
              textAnchor="middle" fontWeight="600">
              Month {tooltipMinPt.month}
            </SvgText>

            {/* Min balance */}
            <SvgText
              x={tooltipX + 8} y={tooltipY + (tooltipExtraPt ? 26 : 22)}
              fontSize="10" fill={minColor}
              textAnchor="start" fontWeight="700">
              {fmtBalShort(tooltipMinPt.balance)}
            </SvgText>

            {/* Extra balance */}
            {tooltipExtraPt && (
              <>
                <Line
                  x1={tooltipX + tooltipW / 2 - 2} y1={tooltipY + 18}
                  x2={tooltipX + tooltipW / 2 - 2} y2={tooltipY + tooltipH - 8}
                  stroke="rgba(255,255,255,0.12)" strokeWidth="1"
                />
                <SvgText
                  x={tooltipX + tooltipW - 8} y={tooltipY + 26}
                  fontSize="10" fill={extraColor}
                  textAnchor="end" fontWeight="700">
                  {fmtBalShort(tooltipExtraPt.balance)}
                </SvgText>
              </>
            )}
          </AnimatedG>
        )}
      </Svg>
    </View>
  );
}

// ─── Utilization colour helper ────────────────────────────────────────────────
function utilizationColor(pct: number): string {
  if (pct >= 0.7) return '#FF4757';
  if (pct >= 0.3) return '#F59E0B';
  return '#00C896';
}

function fmtPayoffDate(d: Date, locale = 'en-US'): string {
  return d.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
}

// ─── Payoff Simulator Sheet ───────────────────────────────────────────────────
function PayoffSimulatorSheet({ loan, visible, onClose }: { loan: Loan | null; visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const { t, fonts, isRTL, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const dateLocale = language === 'ar' ? 'ar-SA' : 'en-US';
  const [extraPayment, setExtraPayment] = useState('');
  const [sharing, setSharing] = useState(false);
  const shareRef = useRef<View>(null);

  if (!loan) return null;

  const handleShare = async () => {
    if (!shareRef.current || sharing) return;
    try {
      setSharing(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const uri = await captureRef(shareRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Payoff Plan',
        });
      } else {
        Alert.alert('Sharing not available', 'Your device does not support sharing.');
      }
    } catch (err) {
      console.warn('Share failed:', err);
    } finally {
      setSharing(false);
    }
  };

  const minPayment = loan.minimumPayment ?? loan.nextPaymentAmount;
  const extra = parseFloat(extraPayment) || 0;
  const totalPayment = minPayment + extra;

  const minResult = calcPayoff(
    loan.currentBalance, loan.interestRate, minPayment,
    loan.type, loan.totalInstallments, loan.paidInstallments,
  );
  const extraResult = extra > 0
    ? calcPayoff(loan.currentBalance, loan.interestRate, totalPayment,
        loan.type, loan.totalInstallments, loan.paidInstallments)
    : null;

  const minTrajectory = calcTrajectory(
    loan.currentBalance, loan.interestRate, minPayment,
    loan.type, loan.totalInstallments, loan.paidInstallments,
  );
  const extraTrajectory = extra > 0
    ? calcTrajectory(loan.currentBalance, loan.interestRate, totalPayment,
        loan.type, loan.totalInstallments, loan.paidInstallments)
    : null;

  const interestSaved = extraResult && minResult.totalInterest >= 0 && extraResult.totalInterest >= 0
    ? Math.max(0, minResult.totalInterest - extraResult.totalInterest)
    : 0;
  const monthsSaved = extraResult && minResult.months >= 0 && extraResult.months >= 0
    ? Math.max(0, minResult.months - extraResult.months)
    : 0;

  const typeColor = LOAN_TYPE_COLOR[loan.type];
  const isNeverPayoff = minResult.months === -1;

  const renderResult = (result: PayoffResult, label: string, accent: string) => (
    <View style={[simStyles.resultBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[simStyles.resultBoxLabel, { color: colors.mutedForeground, fontFamily: fonts.semibold }]}>{label}</Text>
      <View style={simStyles.resultRow}>
        <View style={simStyles.resultStat}>
          <Text style={[simStyles.resultStatVal, { color: accent, fontFamily: fonts.bold }]}>
            {result.months === -1 ? '∞' : result.months}
          </Text>
          <Text style={[simStyles.resultStatLabel, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
            {t('loans_sim_months')}
          </Text>
        </View>
        <View style={[simStyles.resultDivider, { backgroundColor: colors.border }]} />
        <View style={simStyles.resultStat}>
          <Text style={[simStyles.resultStatVal, { color: accent, fontFamily: fonts.bold }]}>
            {result.payoffDate ? fmtPayoffDate(result.payoffDate, dateLocale) : '—'}
          </Text>
          <Text style={[simStyles.resultStatLabel, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
            {t('loans_sim_payoff_date')}
          </Text>
        </View>
        <View style={[simStyles.resultDivider, { backgroundColor: colors.border }]} />
        <View style={simStyles.resultStat}>
          <Text style={[simStyles.resultStatVal, { color: accent, fontFamily: fonts.bold }]}>
            {result.totalInterest === -1 ? '—' : result.totalInterest < 1 ? t('loans_sim_no_interest') : `${result.totalInterest.toFixed(0)}`}
          </Text>
          <Text style={[simStyles.resultStatLabel, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
            {result.totalInterest > 0 ? t('loans_sim_interest_sar') : t('loans_sim_interest')}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[simStyles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 20 }]}>
        <View style={[simStyles.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={[simStyles.header, { borderBottomColor: colors.border }]}>
          <View style={simStyles.headerLeft}>
            <View style={[simStyles.headerIcon, { backgroundColor: typeColor + '20' }]}>
              <Feather name={LOAN_TYPE_ICON[loan.type] as any} size={18} color={typeColor} />
            </View>
            <View>
              <Text style={[simStyles.headerTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>{t('loans_sim_title')}</Text>
              <Text style={[simStyles.headerSub, { color: colors.mutedForeground, fontFamily: fonts.regular }]} numberOfLines={1}>{loan.name}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            {!isNeverPayoff && (
              <TouchableOpacity
                onPress={handleShare}
                disabled={sharing}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ opacity: sharing ? 0.4 : 1 }}
              >
                <Feather name="share-2" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={simStyles.body}>
          {/* Loan summary */}
          <View style={[simStyles.summaryRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={simStyles.summaryStat}>
              <Text style={[simStyles.summaryLabel, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>{t('loans_balance')}</Text>
              <Text style={[simStyles.summaryValue, { color: colors.foreground, fontFamily: fonts.bold }]}>SAR {loan.currentBalance.toLocaleString()}</Text>
            </View>
            <View style={[simStyles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={simStyles.summaryStat}>
              <Text style={[simStyles.summaryLabel, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>{t('loans_apr')}</Text>
              <Text style={[simStyles.summaryValue, { color: loan.interestRate && loan.interestRate > 20 ? '#FF4757' : colors.foreground, fontFamily: fonts.bold }]}>
                {loan.interestRate ? `${loan.interestRate}%` : t('loans_sim_no_interest')}
              </Text>
            </View>
            <View style={[simStyles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={simStyles.summaryStat}>
              <Text style={[simStyles.summaryLabel, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>{t('loans_sim_min_payment')}</Text>
              <Text style={[simStyles.summaryValue, { color: colors.foreground, fontFamily: fonts.bold }]}>SAR {minPayment.toLocaleString()}</Text>
            </View>
          </View>

          {isNeverPayoff && (
            <View style={simStyles.neverBox}>
              <Feather name="alert-triangle" size={14} color="#FF4757" />
              <Text style={[simStyles.neverText, { fontFamily: fonts.regular }]}>{t('loans_sim_never_payoff')}</Text>
            </View>
          )}

          {/* Min payment result */}
          {renderResult(minResult, t('loans_sim_at_minimum'), typeColor)}

          {/* Extra payment input */}
          <View>
            <Text style={[simStyles.extraLabel, { color: colors.foreground, fontFamily: fonts.semibold }]}>{t('loans_sim_extra_payment')}</Text>
            <Text style={[simStyles.extraSub, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>{t('loans_sim_extra_sub')}</Text>
            <View style={[simStyles.extraInput, { backgroundColor: colors.card, borderColor: extraPayment ? '#7B6CF8' : colors.border }]}>
              <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: fonts.semibold, marginRight: 8 }}>SAR +</Text>
              <TextInput
                style={[simStyles.extraInputText, { color: colors.foreground, fontFamily: fonts.bold }]}
                placeholder="0"
                placeholderTextColor={colors.mutedForeground}
                value={extraPayment}
                onChangeText={(v: string) => setExtraPayment(v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
                keyboardType="decimal-pad"
              />
              {extraPayment !== '' && (
                <TouchableOpacity onPress={() => setExtraPayment('')}>
                  <Feather name="x-circle" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* With extra payment result */}
          {extraResult && renderResult(extraResult, t('loans_sim_with_extra', { extra: (minPayment + extra).toFixed(0) }), '#7B6CF8')}

          {/* Payoff timeline chart */}
          {minResult.months !== -1 && minTrajectory.length > 1 && (
            <View style={[simStyles.chartBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={simStyles.chartHeader}>
                <Text style={[simStyles.chartTitle, { color: colors.foreground, fontFamily: fonts.semibold }]}>
                  {t('loans_sim_chart_title')}
                </Text>
                <View style={simStyles.chartLegend}>
                  <View style={simStyles.legendItem}>
                    <View style={[simStyles.legendDot, { backgroundColor: typeColor }]} />
                    <Text style={[simStyles.legendText, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
                      {t('loans_sim_chart_min')}
                    </Text>
                  </View>
                  {extraTrajectory && (
                    <View style={simStyles.legendItem}>
                      <View style={[simStyles.legendDot, { backgroundColor: '#7B6CF8' }]} />
                      <Text style={[simStyles.legendText, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
                        {t('loans_sim_chart_extra')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <PayoffChart
                minPoints={minTrajectory}
                extraPoints={extraTrajectory}
                minColor={typeColor}
                extraColor="#7B6CF8"
              />
            </View>
          )}

          {/* Savings callout */}
          {extraResult && (interestSaved > 0 || monthsSaved > 0) && (
            <LinearGradient colors={['#1A1040', '#0D0D1A']} style={simStyles.savingsBox}>
              <Feather name="trending-down" size={20} color="#A78BFA" />
              <View style={{ flex: 1 }}>
                {interestSaved > 0 && (
                  <Text style={[simStyles.savingsMain, { fontFamily: fonts.bold }]}>
                    {t('loans_sim_interest_saved', { currency: loan.currency, amount: Math.round(interestSaved).toLocaleString() })}
                  </Text>
                )}
                {monthsSaved > 0 && (
                  <Text style={[simStyles.savingsSub, { fontFamily: fonts.regular }]}>
                    {t('loans_sim_months_saved', { n: monthsSaved })}
                  </Text>
                )}
              </View>
            </LinearGradient>
          )}

          {/* Avalanche tip for high-interest loans */}
          {loan.interestRate && loan.interestRate > 20 && (
            <View style={[simStyles.avalancheTip, { backgroundColor: '#FF475710', borderColor: '#FF475730' }]}>
              <Text style={{ fontSize: 16 }}>🔥</Text>
              <Text style={[simStyles.avalancheText, { color: '#FF6B6B', fontFamily: fonts.regular }]}>
                {t('loans_high_interest_tip')}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* ── Off-screen snapshot card (captured for sharing) ── */}
        <View
          ref={shareRef}
          collapsable={false}
          style={[simStyles.snapshotCard, { backgroundColor: '#0D0D1A', direction: isRTL ? 'rtl' : 'ltr' }]}
          pointerEvents="none"
        >
          {/* Snapshot header */}
          <View style={[simStyles.snapshotHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[simStyles.snapshotIconBadge, { backgroundColor: typeColor + '25' }]}>
              <Feather name={LOAN_TYPE_ICON[loan.type] as any} size={16} color={typeColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[simStyles.snapshotTitle, { color: '#fff', fontFamily: fonts.bold, textAlign: isRTL ? 'right' : 'left' }]}>{loan.name}</Text>
              <Text style={[simStyles.snapshotSub, { color: 'rgba(255,255,255,0.5)', fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>{t('loans_sim_snapshot_subtitle')}</Text>
            </View>
          </View>

          {/* Loan key stats */}
          <View style={[simStyles.snapshotStatsRow, { borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={simStyles.snapshotStat}>
              <Text style={[simStyles.snapshotStatLabel, { color: 'rgba(255,255,255,0.45)', fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>{t('loans_balance')}</Text>
              <Text style={[simStyles.snapshotStatVal, { color: '#fff', fontFamily: fonts.bold, textAlign: isRTL ? 'right' : 'left' }]}>{loan.currency} {loan.currentBalance.toLocaleString()}</Text>
            </View>
            <View style={[simStyles.snapshotStatDivider, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
            <View style={simStyles.snapshotStat}>
              <Text style={[simStyles.snapshotStatLabel, { color: 'rgba(255,255,255,0.45)', fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>{t('loans_apr')}</Text>
              <Text style={[simStyles.snapshotStatVal, { color: loan.interestRate && loan.interestRate > 20 ? '#FF4757' : '#fff', fontFamily: fonts.bold, textAlign: isRTL ? 'right' : 'left' }]}>
                {loan.interestRate ? `${loan.interestRate}%` : t('loans_sim_no_interest')}
              </Text>
            </View>
            <View style={[simStyles.snapshotStatDivider, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
            <View style={simStyles.snapshotStat}>
              <Text style={[simStyles.snapshotStatLabel, { color: 'rgba(255,255,255,0.45)', fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>{t('loans_sim_min_payment')}</Text>
              <Text style={[simStyles.snapshotStatVal, { color: '#fff', fontFamily: fonts.bold, textAlign: isRTL ? 'right' : 'left' }]}>{loan.currency} {minPayment.toLocaleString()}</Text>
            </View>
          </View>

          {/* Min result */}
          <View style={[simStyles.snapshotResultBox, { borderColor: typeColor + '40', backgroundColor: typeColor + '10' }]}>
            <Text style={[simStyles.snapshotResultLabel, { color: typeColor, fontFamily: fonts.semibold, textAlign: isRTL ? 'right' : 'left' }]}>{t('loans_sim_snapshot_at_min')}</Text>
            <View style={[simStyles.snapshotResultRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={simStyles.snapshotResultStat}>
                <Text style={[simStyles.snapshotResultVal, { color: typeColor, fontFamily: fonts.bold, textAlign: isRTL ? 'right' : 'left' }]}>
                  {minResult.months === -1 ? '∞' : minResult.months}
                </Text>
                <Text style={[simStyles.snapshotResultKey, { color: 'rgba(255,255,255,0.5)', fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>{t('loans_sim_months')}</Text>
              </View>
              <View style={[simStyles.snapshotResultDivider, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
              <View style={simStyles.snapshotResultStat}>
                <Text style={[simStyles.snapshotResultVal, { color: typeColor, fontFamily: fonts.bold, textAlign: isRTL ? 'right' : 'left' }]}>
                  {minResult.payoffDate ? fmtPayoffDate(minResult.payoffDate, dateLocale) : '—'}
                </Text>
                <Text style={[simStyles.snapshotResultKey, { color: 'rgba(255,255,255,0.5)', fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>{t('loans_sim_payoff_date')}</Text>
              </View>
              <View style={[simStyles.snapshotResultDivider, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
              <View style={simStyles.snapshotResultStat}>
                <Text style={[simStyles.snapshotResultVal, { color: typeColor, fontFamily: fonts.bold, textAlign: isRTL ? 'right' : 'left' }]}>
                  {minResult.totalInterest <= 0 ? t('loans_sim_no_interest') : `${Math.round(minResult.totalInterest).toLocaleString()}`}
                </Text>
                <Text style={[simStyles.snapshotResultKey, { color: 'rgba(255,255,255,0.5)', fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>
                  {minResult.totalInterest > 0 ? t('loans_sim_snapshot_interest_label', { currency: loan.currency }) : t('loans_sim_interest')}
                </Text>
              </View>
            </View>
          </View>

          {/* With extra result (if applicable) */}
          {extraResult && (
            <View style={[simStyles.snapshotResultBox, { borderColor: '#7B6CF840', backgroundColor: '#7B6CF810' }]}>
              <Text style={[simStyles.snapshotResultLabel, { color: '#A78BFA', fontFamily: fonts.semibold, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('loans_sim_snapshot_with_extra', { currency: loan.currency, extra: extra.toLocaleString() })}
              </Text>
              <View style={[simStyles.snapshotResultRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={simStyles.snapshotResultStat}>
                  <Text style={[simStyles.snapshotResultVal, { color: '#A78BFA', fontFamily: fonts.bold, textAlign: isRTL ? 'right' : 'left' }]}>
                    {extraResult.months === -1 ? '∞' : extraResult.months}
                  </Text>
                  <Text style={[simStyles.snapshotResultKey, { color: 'rgba(255,255,255,0.5)', fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>{t('loans_sim_months')}</Text>
                </View>
                <View style={[simStyles.snapshotResultDivider, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
                <View style={simStyles.snapshotResultStat}>
                  <Text style={[simStyles.snapshotResultVal, { color: '#A78BFA', fontFamily: fonts.bold, textAlign: isRTL ? 'right' : 'left' }]}>
                    {extraResult.payoffDate ? fmtPayoffDate(extraResult.payoffDate, dateLocale) : '—'}
                  </Text>
                  <Text style={[simStyles.snapshotResultKey, { color: 'rgba(255,255,255,0.5)', fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>{t('loans_sim_payoff_date')}</Text>
                </View>
                <View style={[simStyles.snapshotResultDivider, { backgroundColor: 'rgba(255,255,255,0.08)' }]} />
                <View style={simStyles.snapshotResultStat}>
                  <Text style={[simStyles.snapshotResultVal, { color: '#A78BFA', fontFamily: fonts.bold, textAlign: isRTL ? 'right' : 'left' }]}>
                    {extraResult.totalInterest <= 0 ? t('loans_sim_no_interest') : `${Math.round(extraResult.totalInterest).toLocaleString()}`}
                  </Text>
                  <Text style={[simStyles.snapshotResultKey, { color: 'rgba(255,255,255,0.5)', fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>
                    {extraResult.totalInterest > 0 ? t('loans_sim_snapshot_interest_label', { currency: loan.currency }) : t('loans_sim_interest')}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Chart */}
          {minResult.months !== -1 && minTrajectory.length > 1 && (
            <View style={[simStyles.snapshotChartBox, { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }]}>
              <Text style={[simStyles.snapshotChartTitle, { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.semibold, textAlign: isRTL ? 'right' : 'left' }]}>
                {t('loans_sim_chart_title')}
              </Text>
              <PayoffChart
                minPoints={minTrajectory}
                extraPoints={extraTrajectory}
                minColor={typeColor}
                extraColor="#7B6CF8"
              />
            </View>
          )}

          {/* Savings callout */}
          {extraResult && (interestSaved > 0 || monthsSaved > 0) && (
            <View style={[simStyles.snapshotSavings, { backgroundColor: '#1A1040', borderColor: '#7B6CF830', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Feather name="trending-down" size={16} color="#A78BFA" />
              <View style={{ flex: 1 }}>
                {interestSaved > 0 && (
                  <Text style={[simStyles.snapshotSavingsMain, { fontFamily: fonts.bold, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('loans_sim_interest_saved', { currency: loan.currency, amount: Math.round(interestSaved).toLocaleString() })}
                  </Text>
                )}
                {monthsSaved > 0 && (
                  <Text style={[simStyles.snapshotSavingsSub, { fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('loans_sim_months_saved', { n: monthsSaved })}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Watermark */}
          <Text style={[simStyles.snapshotWatermark, { color: 'rgba(255,255,255,0.2)', fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('loans_sim_generated_by')}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

// ─── Loan card ────────────────────────────────────────────────────────────────
function LoanCard({ loan, onDelete, onPress }: { loan: Loan; onDelete: () => void; onPress: () => void }) {
  const colors = useColors();
  const { t, fonts, isRTL } = useLanguage();
  const rtl = useRTL();
  const color   = LOAN_TYPE_COLOR[loan.type];
  const days    = daysUntil(loan.nextPaymentDate);
  const rawPct  = loanProgress(loan);
  const dueSoon = days <= 5 && days >= 0;
  const overdue = days < 0;

  const isHighInterest = (loan.interestRate ?? 0) > 20;

  // Credit card: pct is utilisation ratio (balance / limit)
  const utilPct = loan.type === 'credit_card' && loan.creditLimit
    ? Math.min(loan.currentBalance / loan.creditLimit, 1)
    : null;
  const progressColor = utilPct !== null
    ? utilizationColor(utilPct)
    : color;

  const subtitle = loan.type === 'bnpl' && loan.totalInstallments
    ? `${(loan.paidInstallments ?? 0)}/${loan.totalInstallments} ${t('loans_installments_paid')}`
    : loan.type === 'credit_card' && loan.creditLimit
    ? `${t('loans_limit')}: SAR ${loan.creditLimit.toLocaleString()}`
    : `${t('loans_original')}: SAR ${loan.originalAmount.toLocaleString()}`;

  const progressLabel = loan.type === 'credit_card'
    ? t('loans_utilization')
    : t('loans_paid_off');

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.card, borderColor: overdue ? '#FF4757' : dueSoon ? '#FFD93D30' : colors.border, borderRadius: colors.radius }]}
    >
      {/* Left color bar */}
      <View style={[styles.cardBar, { backgroundColor: color }]} />

      <View style={styles.cardBody}>
        {/* Top row */}
        <View style={[styles.cardTop, rtl.row()]}>
          <View style={[styles.typeIcon, { backgroundColor: color + '20' }]}>
            <Feather name={LOAN_TYPE_ICON[loan.type] as any} size={17} color={color} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.cardName, { color: colors.foreground, fontFamily: fonts.semibold, textAlign: isRTL ? 'right' : 'left', flex: 1 }]} numberOfLines={1}>{loan.name}</Text>
              {isHighInterest && (
                <View style={styles.highInterestBadge}>
                  <Text style={{ fontSize: 10 }}>🔥</Text>
                  <Text style={[styles.highInterestText, { fontFamily: fonts.semibold }]}>{t('loans_high_interest')}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.cardLender, { color: colors.mutedForeground, fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>{loan.lender} · {subtitle}</Text>
          </View>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Feather name="trash-2" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Balance row */}
        <View style={[styles.balanceRow, rtl.row()]}>
          <View>
            <Text style={[styles.balanceLabel, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>{t('loans_balance')}</Text>
            <Text style={[styles.balanceAmount, { color: colors.foreground, fontFamily: fonts.bold }]}>SAR {loan.currentBalance.toLocaleString()}</Text>
          </View>
          <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
            <Text style={[styles.balanceLabel, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>{t('loans_next_payment')}</Text>
            <View style={rtl.row({ gap: 5, alignItems: 'center' })}>
              <Text style={[styles.nextAmount, { color: color, fontFamily: fonts.bold }]}>SAR {loan.nextPaymentAmount.toLocaleString()}</Text>
              <View style={[styles.daysBadge, { backgroundColor: overdue ? '#FF475720' : dueSoon ? '#FFD93D20' : colors.secondary }]}>
                <Text style={[styles.daysBadgeText, { color: overdue ? '#FF4757' : dueSoon ? '#F59E0B' : colors.primary, fontFamily: fonts.semibold }]}>
                  {overdue ? t('loans_overdue') : days === 0 ? t('today') : days === 1 ? t('tomorrow') : `${days}d`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Progress bar */}
        <View>
          <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
            <View style={[styles.progressFill, {
              width: `${Math.max(2, rawPct * 100)}%` as any,
              backgroundColor: progressColor,
            }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <Text style={[styles.progressLabel, { color: colors.mutedForeground, fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>
              {progressLabel} {(rawPct * 100).toFixed(0)}%
              {loan.interestRate ? `  ·  ${loan.interestRate}% APR` : ''}
            </Text>
            <Text style={[styles.progressLabel, { color: colors.mutedForeground, fontFamily: fonts.regular }]}>
              {t('loans_tap_simulate')}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Form field helpers ───────────────────────────────────────────────────────
function FLabel({ label, error }: { label: string; error?: string }) {
  const colors = useColors();
  const { fonts } = useLanguage();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: fonts.semibold }}>{label}</Text>
      {!!error && <Text style={{ color: '#FF6B6B', fontSize: 11, fontFamily: fonts.regular }}>{error}</Text>}
    </View>
  );
}

function FInput({ placeholder, value, onChangeText, keyboardType, icon, focused, onFocus, onBlur, hasError }: any) {
  const colors = useColors();
  const { fonts } = useLanguage();
  return (
    <View style={[styles.fInput, { backgroundColor: colors.card, borderColor: hasError ? '#FF6B6B' : focused ? '#7B6CF8' : colors.border, borderRadius: 12 }]}>
      {icon && <Feather name={icon} size={14} color={focused ? '#7B6CF8' : colors.mutedForeground} style={{ marginRight: 8 }} />}
      <TextInput
        style={[styles.fInputText, { color: colors.foreground, fontFamily: fonts.regular }]}
        placeholder={placeholder} placeholderTextColor={colors.mutedForeground}
        value={value} onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="words" autoCorrect={false}
        onFocus={onFocus} onBlur={onBlur}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function LoansScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { loans, totalDebt, monthlyPayments, addLoan, removeLoan } = useLoans();
  const { t, fonts, isRTL } = useLanguage();
  const rtl = useRTL();

  const [showAdd,       setShowAdd]       = useState(false);
  const [form,          setForm]          = useState<FormState>(BLANK);
  const [errors,        setErrors]        = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving,        setSaving]        = useState(false);
  const [focused,       setFocused]       = useState<keyof FormState | null>(null);
  const [selectedLoan,  setSelectedLoan]  = useState<Loan | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);

  const topPadding = Platform.OS === 'web' ? Math.max(insets.top, 67) : insets.top;
  const set = (k: keyof FormState) => (v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };
  const foc = (k: keyof FormState) => () => setFocused(k);
  const blr = () => setFocused(null);

  const sorted = [...loans].sort((a, b) => daysUntil(a.nextPaymentDate) - daysUntil(b.nextPaymentDate));

  const handleDelete = (loan: Loan) => {
    Alert.alert(t('loans_delete_title'), t('loans_delete_msg', { name: loan.name }), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => removeLoan(loan.id) },
    ]);
  };

  const openAdd = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setForm(BLANK); setErrors({}); setSaving(false); setShowAdd(true);
  };

  const openSimulator = (loan: Loan) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLoan(loan);
    setShowSimulator(true);
  };

  const handleSave = async () => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim())   errs.name   = t('required');
    if (!form.lender.trim()) errs.lender = t('required');
    const balance = parseFloat(form.currentBalance);
    if (!form.currentBalance || isNaN(balance) || balance < 0) errs.currentBalance = t('required');
    const nextAmt = parseFloat(form.nextPaymentAmount);
    if (!form.nextPaymentAmount || isNaN(nextAmt) || nextAmt <= 0) errs.nextPaymentAmount = t('required');
    const nextDate = parseDate(form.nextPaymentDate);
    if (!nextDate) errs.nextPaymentDate = 'DD/MM/YYYY';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    const original = parseFloat(form.originalAmount) || balance;
    const creditLimit = form.type === 'credit_card' ? (parseFloat(form.creditLimit) || original) : undefined;
    const totalInst = form.type === 'bnpl' ? parseInt(form.totalInstallments) || undefined : undefined;
    const paidInst  = form.type === 'bnpl' ? parseInt(form.paidInstallments)  || 0 : undefined;
    const instAmt   = form.type === 'bnpl' ? (parseFloat(form.installmentAmount) || nextAmt) : undefined;
    const remaining = totalInst && paidInst !== undefined ? (totalInst - paidInst) * (instAmt ?? nextAmt) : balance;

    try {
      await addLoan({
        name: form.name.trim(),
        lender: form.lender.trim(),
        type: form.type,
        currency: 'SAR',
        currentBalance: form.type === 'bnpl' && totalInst ? remaining : balance,
        originalAmount: original,
        creditLimit,
        interestRate: parseFloat(form.interestRate) || undefined,
        minimumPayment: form.type === 'credit_card' ? (parseFloat(form.minimumPayment) || undefined) : undefined,
        totalInstallments: totalInst,
        paidInstallments: paidInst,
        installmentAmount: instAmt,
        nextPaymentDate: nextDate!,
        nextPaymentAmount: nextAmt,
      });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAdd(false);
    } finally { setSaving(false); }
  };

  const typeLabels: Record<LoanType, string> = {
    credit_card:   t('loans_type_cc'),
    bnpl:          t('loans_type_bnpl'),
    personal_loan: t('loans_type_personal'),
    other:         t('loans_type_other'),
  };

  return (
    <PremiumGate>
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        {/* ── Header ── */}
        <View style={[styles.header, { paddingTop: topPadding + 12, borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.pageTitle, { color: colors.foreground, fontFamily: fonts.bold, textAlign: isRTL ? 'right' : 'left' }]}>{t('loans_title')}</Text>
            <Text style={[styles.pageSub, { color: colors.mutedForeground, fontFamily: fonts.regular, textAlign: isRTL ? 'right' : 'left' }]}>{t('loans_subtitle')}</Text>
          </View>
        </View>

        {/* ── Debt summary hero ── */}
        {loans.length > 0 && (
          <LinearGradient colors={['#1A0525', '#0A0E1A']} style={[styles.hero, { borderBottomColor: colors.border }]}>
            <View style={[styles.heroRow, rtl.row()]}>
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatLabel, { fontFamily: fonts.regular }]}>{t('loans_total_debt')}</Text>
                <Text style={[styles.heroStatValue, { fontFamily: fonts.bold }]}>SAR {totalDebt.toLocaleString()}</Text>
              </View>
              <View style={[styles.heroDivider, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatLabel, { fontFamily: fonts.regular }]}>{t('loans_monthly_payments')}</Text>
                <Text style={[styles.heroStatValue, { fontFamily: fonts.bold }]}>SAR {monthlyPayments.toLocaleString()}</Text>
              </View>
              <View style={[styles.heroDivider, { backgroundColor: 'rgba(255,255,255,0.12)' }]} />
              <View style={styles.heroStat}>
                <Text style={[styles.heroStatLabel, { fontFamily: fonts.regular }]}>{t('loans_active')}</Text>
                <Text style={[styles.heroStatValue, { fontFamily: fonts.bold }]}>{loans.length}</Text>
              </View>
            </View>
            {/* Type breakdown pills */}
            <View style={styles.typePills}>
              {LOAN_TYPES.filter(t => loans.some(l => l.type === t)).map(type => {
                const color = LOAN_TYPE_COLOR[type];
                const count = loans.filter(l => l.type === type).length;
                return (
                  <View key={type} style={[styles.typePill, { backgroundColor: color + '18', borderColor: color + '35' }]}>
                    <Feather name={LOAN_TYPE_ICON[type] as any} size={11} color={color} />
                    <Text style={[styles.typePillText, { color, fontFamily: fonts.semibold }]}>{typeLabels[type]} · {count}</Text>
                  </View>
                );
              })}
            </View>
          </LinearGradient>
        )}

        {/* ── Loan list ── */}
        <FlatList
          data={sorted}
          keyExtractor={l => l.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: Platform.OS === 'web' ? 100 : 90 }}
          ListEmptyComponent={
            <EmptyState
              icon="credit-card"
              title={t('loans_empty_title')}
              subtitle={t('loans_empty_sub')}
              actionLabel={t('loans_add')}
              onAction={openAdd}
            />
          }
          renderItem={({ item }) => (
            <LoanCard
              loan={item}
              onDelete={() => handleDelete(item)}
              onPress={() => openSimulator(item)}
            />
          )}
        />

        {/* ── FAB ── */}
        <TouchableOpacity
          onPress={openAdd} activeOpacity={0.85}
          style={[styles.fab, { backgroundColor: colors.primary, bottom: Platform.OS === 'web' ? 90 : insets.bottom + 70 }]}
        >
          <Feather name="plus" size={22} color={colors.primaryForeground} />
        </TouchableOpacity>

        {/* ══ Payoff Simulator Sheet ══ */}
        <PayoffSimulatorSheet
          loan={selectedLoan}
          visible={showSimulator}
          onClose={() => setShowSimulator(false)}
        />

        {/* ══ Add Loan Modal ══════════════════════════════════════════════════ */}
        <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAdd(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.modal, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={[styles.modalHeader, rtl.row()]}>
              <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: fonts.bold }]}>{t('loans_add')}</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.formBody}>

              {/* Loan type segmented */}
              <View>
                <FLabel label={t('loans_type_label')} />
                <View style={[styles.typeGrid]}>
                  {LOAN_TYPES.map(type => {
                    const active = form.type === type;
                    const c = LOAN_TYPE_COLOR[type];
                    return (
                      <TouchableOpacity
                        key={type}
                        onPress={() => setForm(f => ({ ...f, type }))}
                        activeOpacity={0.75}
                        style={[styles.typeCell, { borderColor: active ? c : colors.border, backgroundColor: active ? c + '15' : colors.card, borderRadius: colors.radius }]}
                      >
                        <Feather name={LOAN_TYPE_ICON[type] as any} size={16} color={active ? c : colors.mutedForeground} />
                        <Text style={[styles.typeCellText, { color: active ? c : colors.mutedForeground, fontFamily: fonts.medium }]}>{typeLabels[type]}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Name + lender */}
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <FLabel label={t('loans_name')} error={errors.name} />
                  <FInput placeholder={form.type === 'bnpl' ? 'e.g. iPhone 15 Pro' : form.type === 'credit_card' ? 'e.g. Platinum Visa' : t('loans_name')}
                    value={form.name} onChangeText={set('name')} icon="tag"
                    focused={focused === 'name'} onFocus={foc('name')} onBlur={blr} hasError={!!errors.name} />
                </View>
                <View style={{ flex: 1 }}>
                  <FLabel label={t('loans_lender')} error={errors.lender} />
                  <FInput placeholder={form.type === 'bnpl' ? 'Tabby / Tamara' : 'Al Rajhi / Riyad'}
                    value={form.lender} onChangeText={set('lender')} icon="home"
                    focused={focused === 'lender'} onFocus={foc('lender')} onBlur={blr} hasError={!!errors.lender} />
                </View>
              </View>

              {/* Credit card fields */}
              {form.type === 'credit_card' && (
                <>
                  <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                      <FLabel label={t('loans_balance')} error={errors.currentBalance} />
                      <AmtInput value={form.currentBalance} onChange={set('currentBalance')} placeholder="0" focused={focused === 'currentBalance'} onFocus={foc('currentBalance')} onBlur={blr} hasError={!!errors.currentBalance} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <FLabel label={t('loans_limit')} />
                      <AmtInput value={form.creditLimit} onChange={set('creditLimit')} placeholder="0" focused={focused === 'creditLimit'} onFocus={foc('creditLimit')} onBlur={blr} />
                    </View>
                  </View>
                  <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                      <FLabel label={t('loans_min_payment')} />
                      <AmtInput value={form.minimumPayment} onChange={set('minimumPayment')} placeholder="0" focused={focused === 'minimumPayment'} onFocus={foc('minimumPayment')} onBlur={blr} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <FLabel label={t('loans_apr')} />
                      <View style={[styles.fInput, { backgroundColor: colors.card, borderColor: focused === 'interestRate' ? '#7B6CF8' : colors.border, borderRadius: 12 }]}>
                        <TextInput style={[styles.fInputText, { color: colors.foreground, fontFamily: fonts.regular, flex: 1 }]}
                          placeholder="24" placeholderTextColor={colors.mutedForeground}
                          value={form.interestRate} onChangeText={set('interestRate')} keyboardType="decimal-pad"
                          onFocus={foc('interestRate')} onBlur={blr} />
                        <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: fonts.regular }}>%</Text>
                      </View>
                    </View>
                  </View>
                </>
              )}

              {/* BNPL fields */}
              {form.type === 'bnpl' && (
                <>
                  <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                      <FLabel label={t('loans_total_amount')} />
                      <AmtInput value={form.originalAmount} onChange={set('originalAmount')} placeholder="0" focused={focused === 'originalAmount'} onFocus={foc('originalAmount')} onBlur={blr} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <FLabel label={t('loans_installment_amount')} />
                      <AmtInput value={form.installmentAmount} onChange={set('installmentAmount')} placeholder="0" focused={focused === 'installmentAmount'} onFocus={foc('installmentAmount')} onBlur={blr} />
                    </View>
                  </View>
                  <View style={styles.twoCol}>
                    <View style={{ flex: 1 }}>
                      <FLabel label={t('loans_total_installments')} />
                      <FInput placeholder="4" value={form.totalInstallments} onChangeText={set('totalInstallments')} keyboardType="number-pad"
                        focused={focused === 'totalInstallments'} onFocus={foc('totalInstallments')} onBlur={blr} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <FLabel label={t('loans_paid_installments')} />
                      <FInput placeholder="1" value={form.paidInstallments} onChangeText={set('paidInstallments')} keyboardType="number-pad"
                        focused={focused === 'paidInstallments'} onFocus={foc('paidInstallments')} onBlur={blr} />
                    </View>
                  </View>
                </>
              )}

              {/* Personal loan / other fields */}
              {(form.type === 'personal_loan' || form.type === 'other') && (
                <View style={styles.twoCol}>
                  <View style={{ flex: 1 }}>
                    <FLabel label={t('loans_original_amount')} />
                    <AmtInput value={form.originalAmount} onChange={set('originalAmount')} placeholder="0" focused={focused === 'originalAmount'} onFocus={foc('originalAmount')} onBlur={blr} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FLabel label={t('loans_balance')} error={errors.currentBalance} />
                    <AmtInput value={form.currentBalance} onChange={set('currentBalance')} placeholder="0" focused={focused === 'currentBalance'} onFocus={foc('currentBalance')} onBlur={blr} hasError={!!errors.currentBalance} />
                  </View>
                </View>
              )}
              {(form.type === 'personal_loan' || form.type === 'other') && (
                <View style={{ flex: 1 }}>
                  <FLabel label={t('loans_apr')} />
                  <View style={[styles.fInput, { backgroundColor: colors.card, borderColor: focused === 'interestRate' ? '#7B6CF8' : colors.border, borderRadius: 12 }]}>
                    <TextInput style={[styles.fInputText, { color: colors.foreground, fontFamily: fonts.regular, flex: 1 }]}
                      placeholder="e.g. 12.5" placeholderTextColor={colors.mutedForeground}
                      value={form.interestRate} onChangeText={set('interestRate')} keyboardType="decimal-pad"
                      onFocus={foc('interestRate')} onBlur={blr} />
                    <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: fonts.regular }}>%</Text>
                  </View>
                </View>
              )}

              {/* Next payment — common to all types */}
              <View style={styles.twoCol}>
                <View style={{ flex: 1 }}>
                  <FLabel label={t('loans_next_payment_amount')} error={errors.nextPaymentAmount} />
                  <AmtInput value={form.nextPaymentAmount} onChange={set('nextPaymentAmount')} placeholder="0" focused={focused === 'nextPaymentAmount'} onFocus={foc('nextPaymentAmount')} onBlur={blr} hasError={!!errors.nextPaymentAmount} />
                </View>
                <View style={{ flex: 1 }}>
                  <FLabel label={t('loans_next_payment_date')} error={errors.nextPaymentDate} />
                  <FInput placeholder="DD/MM/YYYY" value={form.nextPaymentDate} onChangeText={(v: string) => set('nextPaymentDate')(fmtDateInput(v))}
                    keyboardType="number-pad" icon="calendar"
                    focused={focused === 'nextPaymentDate'} onFocus={foc('nextPaymentDate')} onBlur={blr} hasError={!!errors.nextPaymentDate} />
                </View>
              </View>

              {/* Balance field for credit_card (shared) */}
              {form.type === 'credit_card' && (
                <View />
              )}
              {form.type !== 'credit_card' && (
                <View style={{ flex: 1 }}>
                  <FLabel label={t('loans_current_balance')} error={errors.currentBalance} />
                  <AmtInput value={form.currentBalance} onChange={set('currentBalance')} placeholder="0" focused={focused === 'currentBalance'} onFocus={foc('currentBalance')} onBlur={blr} hasError={!!errors.currentBalance} />
                </View>
              )}

              {/* Save */}
              <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85} style={styles.saveBtn}>
                <LinearGradient colors={['#7B6CF8', '#9D8FF8']} style={styles.saveBtnInner}>
                  <Feather name="plus-circle" size={16} color="#fff" />
                  <Text style={[styles.saveBtnText, { fontFamily: fonts.semibold }]}>{saving ? t('saving') : t('loans_add')}</Text>
                </LinearGradient>
              </TouchableOpacity>

            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </PremiumGate>
  );
}

function AmtInput({ value, onChange, placeholder, focused, onFocus, onBlur, hasError }: any) {
  const colors = useColors();
  const { fonts } = useLanguage();
  return (
    <View style={[styles.fInput, { backgroundColor: colors.card, borderColor: hasError ? '#FF6B6B' : focused ? '#7B6CF8' : colors.border, borderRadius: 12 }]}>
      <Text style={{ color: colors.mutedForeground, fontSize: 12, fontFamily: fonts.semibold, marginRight: 6 }}>SAR</Text>
      <TextInput
        style={[styles.fInputText, { color: colors.foreground, fontFamily: fonts.bold, flex: 1, fontSize: 16 }]}
        placeholder={placeholder} placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={(v: string) => onChange(v.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
        keyboardType="decimal-pad" onFocus={onFocus} onBlur={onBlur}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  pageTitle: { fontSize: 26 },
  pageSub:   { fontSize: 12, marginTop: 2 },

  // Hero
  hero:     { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, gap: 12 },
  heroRow:  { gap: 0 },
  heroStat: { flex: 1, alignItems: 'center', gap: 3 },
  heroStatLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11 },
  heroStatValue: { color: '#fff', fontSize: 16 },
  heroDivider: { width: 1, marginVertical: 4 },
  typePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  typePillText: { fontSize: 11 },

  // Card
  card:     { borderWidth: 1, overflow: 'hidden' },
  cardBar:  { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardBody: { padding: 14, paddingLeft: 18, gap: 10 },
  cardTop:  { alignItems: 'flex-start', gap: 10 },
  typeIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  cardName:   { fontSize: 14 },
  cardLender: { fontSize: 11, marginTop: 2 },
  highInterestBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FF475715', borderColor: '#FF475740', borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  highInterestText: { color: '#FF6B6B', fontSize: 9 },
  balanceRow: { justifyContent: 'space-between', alignItems: 'flex-end' },
  balanceLabel: { fontSize: 10, marginBottom: 2 },
  balanceAmount: { fontSize: 18 },
  nextAmount: { fontSize: 15 },
  daysBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7 },
  daysBadgeText: { fontSize: 11 },
  progressBar:  { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressLabel: { fontSize: 10 },

  // FAB
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#6C5CE7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },

  // Modal
  modal: { flex: 1, paddingTop: 10 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  modalHeader: { justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 4 },
  modalTitle: { fontSize: 20 },
  formBody: { paddingHorizontal: 20, paddingBottom: 40, gap: 16 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCell: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1.5, width: '48%' },
  typeCellText: { fontSize: 12 },

  twoCol: { flexDirection: 'row', gap: 10 },
  fInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 12, height: 48 },
  fInputText: { fontSize: 14 },

  saveBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  saveBtnInner: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14 },
  saveBtnText: { color: '#fff', fontSize: 15 },
});

// ─── Simulator styles ─────────────────────────────────────────────────────────
const simStyles = StyleSheet.create({
  sheet: { flex: 1, paddingTop: 10 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18 },
  headerSub: { fontSize: 12, marginTop: 2 },
  body: { padding: 20, gap: 16, paddingBottom: 40 },

  summaryRow: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 14 },
  summaryStat: { flex: 1, alignItems: 'center', gap: 3 },
  summaryLabel: { fontSize: 10 },
  summaryValue: { fontSize: 15 },
  summaryDivider: { width: 1, marginVertical: 2 },

  neverBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF475715', borderColor: '#FF475740', borderWidth: 1, borderRadius: 10, padding: 12 },
  neverText: { color: '#FF6B6B', fontSize: 12, flex: 1 },

  resultBox: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  resultBoxLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  resultRow: { flexDirection: 'row', alignItems: 'center' },
  resultStat: { flex: 1, alignItems: 'center', gap: 3 },
  resultStatVal: { fontSize: 16 },
  resultStatLabel: { fontSize: 10 },
  resultDivider: { width: 1, height: 30, marginHorizontal: 4 },

  extraLabel: { fontSize: 14, marginBottom: 3 },
  extraSub: { fontSize: 11, marginBottom: 10 },
  extraInput: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, height: 52, gap: 6 },
  extraInputText: { flex: 1, fontSize: 20 },

  savingsBox: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  savingsMain: { color: '#A78BFA', fontSize: 15 },
  savingsSub: { color: 'rgba(167,139,250,0.7)', fontSize: 12, marginTop: 3 },

  avalancheTip: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, borderWidth: 1, padding: 12 },
  avalancheText: { fontSize: 12, flex: 1, lineHeight: 18 },

  chartBox: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 12, overflow: 'hidden' },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chartTitle: { fontSize: 13 },
  chartLegend: { flexDirection: 'row', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10 },

  // Snapshot (off-screen capture card)
  snapshotCard: { position: 'absolute', top: -9999, left: 0, width: 360, padding: 20, gap: 14, borderRadius: 0 },
  snapshotHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 2 },
  snapshotIconBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  snapshotTitle: { fontSize: 16 },
  snapshotSub: { fontSize: 11, marginTop: 2 },
  snapshotStatsRow: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 12 },
  snapshotStat: { flex: 1, alignItems: 'center', gap: 3 },
  snapshotStatLabel: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.4 },
  snapshotStatVal: { fontSize: 14 },
  snapshotStatDivider: { width: 1, marginVertical: 2 },
  snapshotResultBox: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  snapshotResultLabel: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  snapshotResultRow: { flexDirection: 'row', alignItems: 'center' },
  snapshotResultStat: { flex: 1, alignItems: 'center', gap: 2 },
  snapshotResultVal: { fontSize: 15 },
  snapshotResultKey: { fontSize: 9 },
  snapshotResultDivider: { width: 1, height: 28, marginHorizontal: 4 },
  snapshotChartBox: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  snapshotChartTitle: { fontSize: 12 },
  snapshotSavings: { borderRadius: 12, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  snapshotSavingsMain: { color: '#A78BFA', fontSize: 13 },
  snapshotSavingsSub: { color: 'rgba(167,139,250,0.65)', fontSize: 11, marginTop: 2 },
  snapshotWatermark: { fontSize: 10, textAlign: 'center', marginTop: 4 },
});
