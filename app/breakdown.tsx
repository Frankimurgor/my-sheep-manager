// app/breakdown.tsx
// Money breakdown — donut + legend, filterable by range and kind.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BreakdownLegend from '../src/components/BreakdownLegend';
import DonutChart from '../src/components/DonutChart';
import { useSheep } from '../src/context/SheepContext';
import { fonts, radius, spacing, type, useTheme } from '../src/theme';
import type { MoneyKind, TimeRange } from '../src/types';
import { moneyCompact, symbolFor } from '../src/utils/money';

const RANGE_LABELS: Record<TimeRange, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
  year: 'Year',
};

export default function Breakdown() {
  const router = useRouter();
  const { palette } = useTheme();
  const {
    moneyBreakdownForRange,
    moneyTotalsForRange,
    settings,
  } = useSheep();

  const [range, setRange] = useState<TimeRange>('month');
  const [kind, setKind] = useState<MoneyKind>('expense');

  const currencySymbol = symbolFor(settings.currency);

  const items = moneyBreakdownForRange(range, kind);
  const totals = moneyTotalsForRange(range);
  const total = kind === 'expense' ? totals.expense : totals.income;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.topBarBtn}
        >
          <Text style={[styles.topBarBtnText, { color: palette.textMuted }]}>
            Close
          </Text>
        </Pressable>
        <Text style={[type.title, { color: palette.text }]}>Breakdown</Text>
        <View style={styles.topBarBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
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

        {/* Kind toggle */}
        <View
          style={[
            styles.segment,
            {
              backgroundColor: palette.surfaceAlt,
              borderColor: palette.border,
              marginTop: spacing.sm,
            },
          ]}
        >
          {(['expense', 'income'] as MoneyKind[]).map((k) => {
            const active = k === kind;
            const activeColor =
              k === 'expense' ? palette.danger : palette.healthy;
            return (
              <Pressable
                key={k}
                onPress={() => setKind(k)}
                style={[
                  styles.segmentItem,
                  active && { backgroundColor: activeColor },
                ]}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    {
                      color: active ? '#FFFFFF' : palette.textMuted,
                      fontFamily: active
                        ? fonts.sansSemiBold
                        : fonts.sansMedium,
                    },
                  ]}
                >
                  {k === 'expense' ? 'Expenses' : 'Income'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Donut */}
        <View style={styles.donutWrap}>
          <DonutChart
            data={items}
            size={240}
            strokeWidth={26}
            centerLabel={kind === 'expense' ? 'TOTAL SPENT' : 'TOTAL EARNED'}
            centerValue={moneyCompact(total, currencySymbol)}
            centerLabelColor={palette.textMuted}
            centerValueColor={palette.text}
            trackColor={palette.divider}
          />
        </View>

        {/* Legend */}
        <BreakdownLegend items={items} currencySymbol={currencySymbol} />

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  topBarBtn: { minWidth: 60 },
  topBarBtnText: { fontFamily: fonts.sansMedium, fontSize: 15 },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },

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

  donutWrap: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
});