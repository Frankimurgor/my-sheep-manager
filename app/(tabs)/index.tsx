// app/(tabs)/index.tsx
// Home dashboard — flock summary, alerts, quick actions, recent activity.

import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
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
import {
    formatRelativeDay,
    formatShort
} from '../../src/utils/date';
import { sheepDisplayName } from '../../src/utils/sheep';

// ─── Header helpers ────────────────────────────────────────

const MONTHS_SHORT = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
];
const DAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAYS_LONG = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday',
  'Thursday', 'Friday', 'Saturday',
];

function longDayName(): string {
  return DAYS_LONG[new Date().getDay()];
}
function shortDateStamp(): string {
  const d = new Date();
  return `${DAYS_SHORT[d.getDay()]} · ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

// ─── Screen ────────────────────────────────────────────────

export default function Home() {
  const { palette } = useTheme();
  const router = useRouter();
  const {
    ready,
    sheep,
    activeSheep,
    flockStats,
    sheepOnWithdrawal,
    upcomingLambings,
    dueTasks,
    tasksDueWithin,
    healthEvents,
    weights,
    breedingEvents,
    lambingRecords,
    moneyRecords,
    runDueTaskRecurrence,
    getSheep,
  } = useSheep();

  // Recurring tasks — advance overdue repeats on boot
  useEffect(() => {
    if (!ready) return;
    if (sheep.length === 0) return;
    runDueTaskRecurrence().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const upcomingWithin14 = useMemo(
    () => upcomingLambings(14).slice(0, 3),
    [upcomingLambings]
  );
  const upcomingWithin7 = useMemo(
    () => tasksDueWithin(7).slice(0, 3),
    [tasksDueWithin]
  );
  const withdrawalList = useMemo(
    () => sheepOnWithdrawal.slice(0, 3),
    [sheepOnWithdrawal]
  );

  // Recent activity — merge all event types, sort by date desc
  const recentActivity = useMemo(() => {
    const items: {
      id: string;
      kind: 'health' | 'weight' | 'breeding' | 'lambing' | 'money';
      date: string;
      title: string;
      subtitle: string;
      emoji: string;
      color: string;
      sheepId?: string;
      recordId: string;
    }[] = [];

    for (const h of healthEvents) {
      items.push({
        id: `h_${h.id}`,
        recordId: h.id,
        kind: 'health',
        date: h.date,
        title: h.product || healthLabel(h.type),
        subtitle: healthLabel(h.type),
        emoji: healthEmoji(h.type),
        color: palette.info,
        sheepId: h.sheepId,
      });
    }
    for (const w of weights) {
      items.push({
        id: `w_${w.id}`,
        recordId: w.id,
        kind: 'weight',
        date: w.date,
        title: `${w.weightKg.toFixed(1)} kg`,
        subtitle: 'Weight recorded',
        emoji: '⚖️',
        color: palette.primary,
        sheepId: w.sheepId,
      });
    }
    for (const b of breedingEvents) {
      items.push({
        id: `b_${b.id}`,
        recordId: b.id,
        kind: 'breeding',
        date: b.matingDate,
        title: 'Mated',
        subtitle: `Lambing due ${formatShort(b.expectedLambingDate)}`,
        emoji: '💞',
        color: palette.breeding,
        sheepId: b.damId,
      });
    }
    for (const l of lambingRecords) {
      const count = l.lambs.filter((x) => x.bornAlive).length;
      items.push({
        id: `l_${l.id}`,
        recordId: l.id,
        kind: 'lambing',
        date: l.lambingDate,
        title: `${count} lamb${count === 1 ? '' : 's'} born`,
        subtitle: 'Lambing recorded',
        emoji: '🐣',
        color: palette.healthy,
        sheepId: l.damId,
      });
    }
    for (const m of moneyRecords.slice(0, 20)) {
      items.push({
        id: `m_${m.id}`,
        recordId: m.id,
        kind: 'money',
        date: m.date,
        title: m.note?.trim() || (m.kind === 'income' ? 'Income' : 'Expense'),
        subtitle: m.kind === 'income' ? 'Money in' : 'Money out',
        emoji: m.kind === 'income' ? '📈' : '📉',
        color: m.kind === 'income' ? palette.healthy : palette.danger,
      });
    }

    return items
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 5);
  }, [
    healthEvents,
    weights,
    breedingEvents,
    lambingRecords,
    moneyRecords,
    palette,
  ]);

  const hasFlock = activeSheep.length > 0;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — date hero */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <Text style={[styles.brand, { color: palette.textMuted }]}>
              MY SHEEP MANAGER
            </Text>
            <Text style={[styles.dateStamp, { color: palette.textMuted }]}>
              {shortDateStamp()}
            </Text>
          </View>
          <Text style={[styles.dayHero, { color: palette.text }]}>
            {longDayName()}
          </Text>
        </View>

        {!ready ? (
          <Text style={[type.body, { color: palette.textMuted }]}>
            Loading…
          </Text>
        ) : !hasFlock ? (
          <EmptyFlock palette={palette} onAdd={() => router.push('/sheep/add')} />
        ) : (
          <>
            {/* Flock summary */}
            <View
              style={[
                styles.flockCard,
                {
                  backgroundColor: palette.primary,
                  shadowColor: palette.primaryDark,
                },
              ]}
            >
              <Text style={[styles.flockLabel, { color: '#C6DBCB' }]}>
                YOUR FLOCK
              </Text>
              <Text style={[styles.flockCount, { color: palette.onPrimary }]}>
                {flockStats.total}
              </Text>
              <Text style={[styles.flockSub, { color: '#C6DBCB' }]}>
                {flockStats.total === 1 ? 'animal' : 'animals'} active
              </Text>

              <View style={styles.breakdownRow}>
                <BreakdownCell
                  label="RAMS"
                  value={flockStats.rams}
                  color="#A5D6A7"
                />
                <View
                  style={[
                    styles.breakdownDivider,
                    { backgroundColor: 'rgba(255,255,255,0.15)' },
                  ]}
                />
                <BreakdownCell
                  label="EWES"
                  value={flockStats.ewes}
                  color="#F5C4E8"
                />
                <View
                  style={[
                    styles.breakdownDivider,
                    { backgroundColor: 'rgba(255,255,255,0.15)' },
                  ]}
                />
                <BreakdownCell
                  label="LAMBS"
                  value={flockStats.lambs}
                  color="#FFF1B8"
                />
              </View>
            </View>

            {/* Quick actions */}
            <View style={styles.actionsRow}>
              <QuickAction
                palette={palette}
                emoji="🐑"
                label="Add sheep"
                onPress={() => router.push('/sheep/add')}
              />
              <QuickAction
                palette={palette}
                emoji="🩺"
                label="Health"
                onPress={() => router.push('/health/add')}
              />
              <QuickAction
                palette={palette}
                emoji="⚖️"
                label="Weight"
                onPress={() => router.push('/weight/add')}
              />
              <QuickAction
                palette={palette}
                emoji="💰"
                label="Money"
                onPress={() => router.push('/money/add')}
              />
            </View>

            {/* Alerts */}
            {withdrawalList.length > 0 ? (
              <AlertCard
                palette={palette}
                tone="danger"
                emoji="🚫"
                title={`${sheepOnWithdrawal.length} on withdrawal`}
                subtitle="Do not sell — meat still has medicine residue"
                items={withdrawalList.map((s) => ({
                  id: s.id,
                  label: sheepDisplayName(s),
                  meta: `#${s.tag}`,
                }))}
                onPress={() => router.push('/(tabs)/flock')}
              />
            ) : null}

            {upcomingWithin14.length > 0 ? (
              <AlertCard
                palette={palette}
                tone="info"
                emoji="🐣"
                title={`${upcomingWithin14.length} lambing${
                  upcomingWithin14.length === 1 ? '' : 's'
                } within 14 days`}
                subtitle="Expected lambing dates coming up"
                items={upcomingWithin14.map((b) => {
                  const dam = getSheep(b.damId);
                  return {
                    id: b.id,
                    label: dam ? sheepDisplayName(dam) : 'Unknown ewe',
                    meta: formatRelativeDay(b.expectedLambingDate),
                  };
                })}
                onPress={() => router.push('/more')}
              />
            ) : null}

            {dueTasks.length > 0 ? (
              <AlertCard
                palette={palette}
                tone="warning"
                emoji="✅"
                title={`${dueTasks.length} task${
                  dueTasks.length === 1 ? '' : 's'
                } due`}
                subtitle="Overdue or due today"
                items={dueTasks.slice(0, 3).map((t) => ({
                  id: t.id,
                  label: t.title,
                  meta: formatRelativeDay(t.dueDate),
                }))}
                onPress={() => router.push('/tasks')}
              />
            ) : null}

            {dueTasks.length === 0 && upcomingWithin7.length > 0 ? (
              <AlertCard
                palette={palette}
                tone="info"
                emoji="📅"
                title={`${upcomingWithin7.length} task${
                  upcomingWithin7.length === 1 ? '' : 's'
                } this week`}
                subtitle="Coming up"
                items={upcomingWithin7.map((t) => ({
                  id: t.id,
                  label: t.title,
                  meta: formatRelativeDay(t.dueDate),
                }))}
                onPress={() => router.push('/tasks')}
              />
            ) : null}

            {/* Recent activity */}
            <View style={styles.sectionHead}>
              <Text style={[type.h3, { color: palette.text }]}>Recent</Text>
            </View>

            {recentActivity.length === 0 ? (
              <View
                style={[
                  styles.emptySmall,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                  },
                ]}
              >
                <Text style={[type.caption, { color: palette.textMuted }]}>
                  No activity yet.
                </Text>
              </View>
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
                {recentActivity.map((item, idx) => {
                  const sheep = item.sheepId
                    ? getSheep(item.sheepId)
                    : undefined;
                  const isLast = idx === recentActivity.length - 1;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() =>
                        sheep && router.push(`/sheep/${sheep.id}`)
                      }
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
                          { backgroundColor: item.color + '22' },
                        ]}
                      >
                        <Text style={styles.rowEmoji}>{item.emoji}</Text>
                      </View>
                      <View style={styles.rowMid}>
                        <Text
                          style={[type.bodyStrong, { color: palette.text }]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={[
                            type.caption,
                            { color: palette.textMuted, marginTop: 2 },
                          ]}
                          numberOfLines={1}
                        >
                          {sheep ? `#${sheep.tag} · ` : ''}
                          {item.subtitle} · {formatRelativeDay(item.date)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View style={{ height: 60 }} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────

function BreakdownCell({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.breakdownCell}>
      <Text style={[styles.breakdownLabel, { color: '#C6DBCB' }]}>
        {label}
      </Text>
      <Text style={[styles.breakdownValue, { color }]}>{value}</Text>
    </View>
  );
}

function QuickAction({
  palette,
  emoji,
  label,
  onPress,
}: {
  palette: Palette;
  emoji: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickAction,
        {
          backgroundColor: pressed ? palette.surfaceAlt : palette.surface,
          borderColor: palette.border,
        },
      ]}
    >
      <Text style={styles.quickEmoji}>{emoji}</Text>
      <Text
        style={[styles.quickLabel, { color: palette.text }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type AlertTone = 'danger' | 'warning' | 'info';

function AlertCard({
  palette,
  tone,
  emoji,
  title,
  subtitle,
  items,
  onPress,
}: {
  palette: Palette;
  tone: AlertTone;
  emoji: string;
  title: string;
  subtitle: string;
  items: { id: string; label: string; meta: string }[];
  onPress: () => void;
}) {
  const toneColor =
    tone === 'danger'
      ? palette.danger
      : tone === 'warning'
      ? palette.warning
      : palette.info;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.alertCard,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          borderLeftColor: toneColor,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.alertHead}>
        <View
          style={[
            styles.alertEmojiWrap,
            { backgroundColor: toneColor + '22' },
          ]}
        >
          <Text style={styles.alertEmoji}>{emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[type.bodyStrong, { color: palette.text }]}>
            {title}
          </Text>
          <Text
            style={[
              type.caption,
              { color: palette.textMuted, marginTop: 2 },
            ]}
          >
            {subtitle}
          </Text>
        </View>
      </View>

      {items.length > 0 ? (
        <View
          style={[
            styles.alertItems,
            { borderTopColor: palette.divider },
          ]}
        >
          {items.map((it) => (
            <View key={it.id} style={styles.alertItemRow}>
              <Text
                style={[styles.alertItemLabel, { color: palette.text }]}
                numberOfLines={1}
              >
                {it.label}
              </Text>
              <Text
                style={[
                  styles.alertItemMeta,
                  { color: palette.textMuted },
                ]}
              >
                {it.meta}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

function EmptyFlock({
  palette,
  onAdd,
}: {
  palette: Palette;
  onAdd: () => void;
}) {
  return (
    <View
      style={[
        styles.emptyCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <Text style={styles.emptyEmoji}>🐑</Text>
      <Text
        style={[
          type.h3,
          { color: palette.text, textAlign: 'center', marginTop: spacing.md },
        ]}
      >
        No sheep yet
      </Text>
      <Text
        style={[
          type.body,
          {
            color: palette.textMuted,
            textAlign: 'center',
            marginTop: spacing.sm,
          },
        ]}
      >
        Add your first animal to start tracking health, weights, breeding,
        and money for your flock.
      </Text>
      <Pressable
        onPress={onAdd}
        style={[
          styles.primaryBtn,
          { backgroundColor: palette.primary, marginTop: spacing.xl },
        ]}
      >
        <Text style={styles.primaryBtnText}>Add first sheep</Text>
      </Pressable>
    </View>
  );
}

// ─── Health label helpers (local for now) ──────────────────

function healthLabel(t: string): string {
  switch (t) {
    case 'vaccine':
      return 'Vaccination';
    case 'deworm':
      return 'Deworming';
    case 'treatment':
      return 'Treatment';
    case 'vet':
      return 'Vet visit';
    case 'hoof':
      return 'Hoof trim';
    case 'shear':
      return 'Shearing';
    default:
      return 'Health event';
  }
}

function healthEmoji(t: string): string {
  switch (t) {
    case 'vaccine':
      return '💉';
    case 'deworm':
      return '🧪';
    case 'treatment':
      return '💊';
    case 'vet':
      return '🩺';
    case 'hoof':
      return '🦶';
    case 'shear':
      return '✂️';
    default:
      return '📋';
  }
}

// ─── Styles ────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },

  header: { marginBottom: spacing.lg },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  brand: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 3,
  },
  dateStamp: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 2,
  },
  dayHero: {
    fontFamily: fonts.serifBold,
    fontSize: 30,
    lineHeight: 36,
    marginTop: spacing.xs,
  },

  // Flock card
  flockCard: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  flockLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 2,
  },
  flockCount: {
    fontFamily: fonts.serifBold,
    fontSize: 46,
    lineHeight: 52,
    marginTop: spacing.xs,
  },
  flockSub: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    marginTop: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  breakdownCell: { flex: 1, alignItems: 'center' },
  breakdownDivider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
  },
  breakdownLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  breakdownValue: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 18,
    marginTop: 2,
  },

  // Quick actions
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  quickAction: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    gap: spacing.xs,
  },
  quickEmoji: { fontSize: 20 },
  quickLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 0.2,
  },

  // Alert card
  alertCard: {
    marginTop: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  alertHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  alertEmojiWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertEmoji: { fontSize: 18 },
  alertItems: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  alertItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    gap: spacing.md,
  },
  alertItemLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 13.5,
    flex: 1,
  },
  alertItemMeta: {
    fontFamily: fonts.sansMedium,
    fontSize: 12.5,
  },

  // Recent list
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  rowEmoji: { fontSize: 18 },
  rowMid: { flex: 1 },

  emptySmall: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    alignItems: 'center',
  },

  // Empty flock
  emptyCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  emptyEmoji: { fontSize: 48 },
  primaryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
  },
});