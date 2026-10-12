// app/(tabs)/money.tsx
// Money — income/expense list, range toggle, totals, and FAB to add.

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSheep } from '../../src/context/SheepContext';
import type { Palette } from '../../src/theme';
import { fonts, radius, spacing, type, useTheme } from '../../src/theme';
import type { MoneyRecord, TimeRange } from '../../src/types';
import { formatRelativeDay } from '../../src/utils/date';
import { money, moneyCompact, symbolFor } from '../../src/utils/money';

const RANGE_LABELS: Record<TimeRange, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  year: 'Year',
};

export default function Money() {
  const { palette } = useTheme();
  const router = useRouter();
  const {
    ready,
    moneyRecords,
    moneyCategories,
    moneyTotalsForRange,
    moneyInRange,
    getMoneyCategory,
    getSheep,
    settings,
  } = useSheep();

  const [range, setRange] = useState<TimeRange>('month');
  const currencySymbol = symbolFor(settings.currency);

  const totals = useMemo(
    () => moneyTotalsForRange(range),
    [moneyTotalsForRange, range]
  );
  const inRange = useMemo(
    () => moneyInRange(range),
    [moneyInRange, range]
  );

  const sorted = useMemo(() => {
    return [...inRange].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return b.createdAt - a.createdAt;
    });
  }, [inRange]);

  const hasAny = moneyRecords.length > 0;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.brand, { color: palette.textMuted }]}>
            MONEY
          </Text>
          <Text style={[type.h2, { color: palette.text, marginTop: spacing.xs }]}>
            {money(totals.net, currencySymbol)}
          </Text>
          <Text
            style={[
              type.caption,
              { color: palette.textMuted, marginTop: 2 },
            ]}
          >
            Net for the selected period
          </Text>
        </View>

        {/* Range toggle */}
        <View
          style={[
            styles.segment,
            {
              backgroundColor: palette.surfaceAlt,
              borderColor: palette.border,
            },
          ]}
        >
          {(['day', 'week', 'month', 'year'] as TimeRange[]).map((r) => {
            const active = r === range;
            return (
              <Pressable
                key={r}
                onPress={() => setRange(r)}
                style={[
                  styles.segmentItem,
                  active && { backgroundColor: palette.surface },
                ]}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    {
                      color: active ? palette.text : palette.textMuted,
                      fontFamily: active
                        ? fonts.sansSemiBold
                        : fonts.sansMedium,
                    },
                  ]}
                >
                  {RANGE_LABELS[r]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Totals row */}
        <View style={styles.totalsRow}>
          <TotalCard
            palette={palette}
            label="Income"
            value={moneyCompact(totals.income, currencySymbol)}
            color={palette.healthy}
          />
          <TotalCard
            palette={palette}
            label="Expense"
            value={moneyCompact(totals.expense, currencySymbol)}
            color={palette.danger}
          />
          <TotalCard
            palette={palette}
            label="Net"
            value={moneyCompact(totals.net, currencySymbol)}
            color={totals.net >= 0 ? palette.healthy : palette.danger}
          />
        </View>

        {/* See breakdown link */}
        {totals.expense > 0 || totals.income > 0 ? (
          <Pressable
            onPress={() => router.push('/breakdown')}
            style={[
              styles.breakdownRow,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <Text style={styles.breakdownEmoji}>📊</Text>
            <Text style={[type.bodyStrong, { color: palette.text, flex: 1 }]}>
              See breakdown
            </Text>
            <Text style={[styles.chev, { color: palette.textMuted }]}>›</Text>
          </Pressable>
        ) : null}

        {/* Records */}
        <View style={styles.sectionHead}>
          <Text style={[type.h3, { color: palette.text }]}>Records</Text>
          <Text style={[type.caption, { color: palette.textMuted }]}>
            {sorted.length} in range
          </Text>
        </View>

        {!ready ? (
          <Empty palette={palette} text="Loading…" />
        ) : !hasAny ? (
          <Empty
            palette={palette}
            emoji="💰"
            text="No money records yet"
            hint="Log sales, feed costs, medicine, and more to track your farm's profitability."
          />
        ) : sorted.length === 0 ? (
          <Empty
            palette={palette}
            emoji="🗓️"
            text="Nothing in this range"
            hint="Try switching to a wider period above."
          />
        ) : (
          <View
            style={[
              styles.list,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            {sorted.map((m, idx) => (
              <MoneyRow
                key={m.id}
                record={m}
                isLast={idx === sorted.length - 1}
                palette={palette}
                currencySymbol={currencySymbol}
                category={getMoneyCategory(m.categoryId)}
                sheepLabel={
                  m.sheepId
                    ? (() => {
                        const s = getSheep(m.sheepId);
                        return s ? `#${s.tag}` : undefined;
                      })()
                    : undefined
                }
                onPress={() => router.push(`/money/add?id=${m.id}`)}
              />
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      <Pressable
        onPress={() => router.push('/money/add')}
        style={[
          styles.fab,
          {
            backgroundColor: palette.primary,
            shadowColor: palette.primaryDark,
          },
        ]}
        accessibilityLabel="Add money record"
      >
        <Text style={styles.fabPlus}>＋</Text>
      </Pressable>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────

function TotalCard({
  palette,
  label,
  value,
  color,
}: {
  palette: Palette;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View
      style={[
        styles.totalCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <View style={[styles.totalDot, { backgroundColor: color }]} />
      <Text style={[styles.totalLabel, { color: palette.textMuted }]}>
        {label}
      </Text>
      <Text
        style={[styles.totalValue, { color: palette.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
    </View>
  );
}

function MoneyRow({
  record,
  isLast,
  palette,
  currencySymbol,
  category,
  sheepLabel,
  onPress,
}: {
  record: MoneyRecord;
  isLast: boolean;
  palette: Palette;
  currencySymbol: string;
  category?: { name: string; emoji: string; color: string };
  sheepLabel?: string;
  onPress: () => void;
}) {
  const isIncome = record.kind === 'income';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: palette.divider,
        },
        pressed && { backgroundColor: palette.surfaceAlt },
      ]}
    >
      <View
        style={[
          styles.rowEmojiWrap,
          { backgroundColor: (category?.color ?? palette.textMuted) + '22' },
        ]}
      >
        <Text style={styles.rowEmoji}>{category?.emoji ?? '💰'}</Text>
      </View>

      <View style={styles.rowMid}>
        <Text
          style={[type.bodyStrong, { color: palette.text }]}
          numberOfLines={1}
        >
          {record.note?.trim() ||
            category?.name ||
            (isIncome ? 'Income' : 'Expense')}
        </Text>
        <Text
          style={[type.caption, { color: palette.textMuted, marginTop: 2 }]}
          numberOfLines={1}
        >
          {category?.name ?? 'Unknown'}
          {sheepLabel ? ` · ${sheepLabel}` : ''} ·{' '}
          {formatRelativeDay(record.date)}
        </Text>
      </View>

      <Text
        style={[
          styles.rowAmount,
          { color: isIncome ? palette.healthy : palette.danger },
        ]}
        numberOfLines={1}
      >
        {isIncome ? '+' : '−'}
        {moneyCompact(record.amount, currencySymbol)}
      </Text>
    </Pressable>
  );
}

function Empty({
  palette,
  emoji,
  text,
  hint,
}: {
  palette: Palette;
  emoji?: string;
  text: string;
  hint?: string;
}) {
  return (
    <View
      style={[
        styles.emptyCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      {emoji ? <Text style={styles.emptyEmoji}>{emoji}</Text> : null}
      <Text
        style={[
          type.bodyStrong,
          { color: palette.text, marginTop: spacing.sm, textAlign: 'center' },
        ]}
      >
        {text}
      </Text>
      {hint ? (
        <Text
          style={[
            type.caption,
            {
              color: palette.textMuted,
              marginTop: spacing.xs,
              textAlign: 'center',
            },
          ]}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  header: { marginBottom: spacing.lg },
  brand: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 3,
  },

  segment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  segmentLabel: { fontSize: 12.5, letterSpacing: 0.3 },

  totalsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  totalCard: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 78,
    justifyContent: 'space-between',
  },
  totalDot: { width: 8, height: 8, borderRadius: 4, marginBottom: spacing.xs },
  totalLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
    letterSpacing: 0.4,
  },
  totalValue: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14.5,
    marginTop: 2,
  },

  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  breakdownEmoji: { fontSize: 18 },
  chev: { fontFamily: fonts.sansRegular, fontSize: 22, lineHeight: 24 },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },

  emptyCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmoji: { fontSize: 34 },

  list: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowEmojiWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowEmoji: { fontSize: 20 },
  rowMid: { flex: 1, marginRight: spacing.sm },
  rowAmount: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    flexShrink: 0,
  },

  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabPlus: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 32,
    fontFamily: fonts.sansRegular,
    marginTop: -3,
  },
});