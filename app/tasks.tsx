// app/tasks.tsx
// Tasks — grouped by due date: Overdue · Today · This week · Later · Done.

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSheep } from '../src/context/SheepContext';
import type { Palette } from '../src/theme';
import { fonts, radius, spacing, type, useTheme } from '../src/theme';
import type { Task } from '../src/types';
import {
    formatMedium,
    formatRelativeDay,
    todayISO,
} from '../src/utils/date';

// ─── Bucketization ────────────────────────────────────────

type Bucket = 'overdue' | 'today' | 'week' | 'later' | 'done';

const BUCKET_ORDER: Bucket[] = ['overdue', 'today', 'week', 'later', 'done'];

const BUCKET_TITLE: Record<Bucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  week: 'This week',
  later: 'Later',
  done: 'Completed',
};

function bucketFor(task: Task): Bucket {
  if (task.completed) return 'done';
  const today = todayISO();
  if (task.dueDate < today) return 'overdue';
  if (task.dueDate === today) return 'today';
  const t = new Date(task.dueDate);
  const now = new Date(today);
  const diffDays = Math.round(
    (t.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays <= 7) return 'week';
  return 'later';
}

// ─── Screen ────────────────────────────────────────────────

export default function TasksScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const { ready, tasks, toggleTaskComplete, deleteTask, getSheep } =
    useSheep();

  const [showDone, setShowDone] = useState(false);

  // Bucketize
  const bucketed = useMemo(() => {
    const out: Record<Bucket, Task[]> = {
      overdue: [],
      today: [],
      week: [],
      later: [],
      done: [],
    };
    for (const t of tasks) {
      out[bucketFor(t)].push(t);
    }
    // Sort each bucket by due date, then by createdAt desc
    for (const k of Object.keys(out) as Bucket[]) {
      out[k].sort((a, b) => {
        if (a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
        return b.createdAt - a.createdAt;
      });
    }
    // Done: sort newest completion first
    out.done.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
    return out;
  }, [tasks]);

  const totalOpen = tasks.filter((t) => !t.completed).length;

  const handleDelete = (task: Task) => {
    Alert.alert('Delete task?', `"${task.title}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteTask(task.id),
      },
    ]);
  };

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
        <Text style={[type.title, { color: palette.text }]}>Tasks</Text>
        <View style={styles.topBarBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[type.h2, { color: palette.text }]}>
            {totalOpen === 0
              ? 'All caught up'
              : `${totalOpen} open task${totalOpen === 1 ? '' : 's'}`}
          </Text>
          <Text
            style={[
              type.caption,
              { color: palette.textMuted, marginTop: spacing.xs },
            ]}
          >
            Reminders for vaccinations, dosing, mating, and anything else on
            the farm.
          </Text>
        </View>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <Pressable
            onPress={() => router.push('/task/add')}
            style={[
              styles.quickPrimary,
              { backgroundColor: palette.primary },
            ]}
          >
            <Text style={styles.quickPrimaryText}>+ New task</Text>
          </Pressable>
          <Pressable
            onPress={() => setShowDone((v) => !v)}
            style={[
              styles.quickSecondary,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <Text style={[type.bodyStrong, { color: palette.text }]}>
              {showDone ? 'Hide done' : 'Show done'}
            </Text>
          </Pressable>
        </View>

        {!ready ? (
          <Text style={[type.body, { color: palette.textMuted }]}>
            Loading…
          </Text>
        ) : tasks.length === 0 ? (
          <Empty palette={palette} onAdd={() => router.push('/task/add')} />
        ) : (
          <>
            {BUCKET_ORDER.map((bucket) => {
              if (bucket === 'done' && !showDone) return null;
              const list = bucketed[bucket];
              if (list.length === 0) return null;
              return (
                <View key={bucket} style={styles.sectionWrap}>
                  <Text
                    style={[
                      styles.sectionLabel,
                      {
                        color:
                          bucket === 'overdue'
                            ? palette.danger
                            : bucket === 'today'
                            ? palette.warning
                            : palette.textMuted,
                      },
                    ]}
                  >
                    {BUCKET_TITLE[bucket].toUpperCase()}{' '}
                    <Text
                      style={[
                        styles.sectionCount,
                        { color: palette.textMuted },
                      ]}
                    >
                      · {list.length}
                    </Text>
                  </Text>

                  <View style={{ gap: spacing.sm }}>
                    {list.map((t) => (
                      <TaskRow
                        key={t.id}
                        palette={palette}
                        task={t}
                        sheepLabel={(() => {
                          if (!t.sheepId) return undefined;
                          const s = getSheep(t.sheepId);
                          return s ? `#${s.tag}` : undefined;
                        })()}
                        onToggle={() => toggleTaskComplete(t.id)}
                        onPress={() => router.push(`/task/add?id=${t.id}`)}
                        onDelete={() => handleDelete(t)}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Row ──────────────────────────────────────────────────

function TaskRow({
  palette,
  task,
  sheepLabel,
  onToggle,
  onPress,
  onDelete,
}: {
  palette: Palette;
  task: Task;
  sheepLabel?: string;
  onToggle: () => void;
  onPress: () => void;
  onDelete: () => void;
}) {
  const overdue = !task.completed && task.dueDate < todayISO();

  return (
    <View
      style={[
        styles.taskRow,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          borderLeftWidth: 4,
          borderLeftColor: task.completed
            ? palette.textMuted
            : overdue
            ? palette.danger
            : palette.primary,
          opacity: task.completed ? 0.65 : 1,
        },
      ]}
    >
      <Pressable
        onPress={onToggle}
        hitSlop={8}
        style={[
          styles.checkbox,
          {
            borderColor: task.completed ? palette.primary : palette.border,
            backgroundColor: task.completed
              ? palette.primary
              : 'transparent',
          },
        ]}
      >
        {task.completed ? (
          <Text style={styles.checkboxCheck}>✓</Text>
        ) : null}
      </Pressable>

      <Pressable onPress={onPress} style={{ flex: 1 }}>
        <Text
          style={[
            type.bodyStrong,
            {
              color: palette.text,
              textDecorationLine: task.completed ? 'line-through' : 'none',
            },
          ]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        <Text
          style={[
            type.caption,
            { color: palette.textMuted, marginTop: 2 },
          ]}
          numberOfLines={1}
        >
          {overdue ? '⚠️ Overdue · ' : ''}
          {formatRelativeDay(task.dueDate)} · {formatMedium(task.dueDate)}
          {sheepLabel ? ` · ${sheepLabel}` : ''}
          {task.recurrence !== 'none' ? ` · 🔁 ${task.recurrence}` : ''}
        </Text>
      </Pressable>

      <Pressable onPress={onDelete} hitSlop={8} style={styles.deleteBtn}>
        <Text style={[styles.deleteText, { color: palette.textMuted }]}>
          ✕
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Empty ────────────────────────────────────────────────

function Empty({
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
      <Text style={styles.emptyEmoji}>✅</Text>
      <Text
        style={[
          type.h3,
          { color: palette.text, textAlign: 'center', marginTop: spacing.md },
        ]}
      >
        No tasks yet
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
        Set reminders for vaccinations, dosing schedules, mating dates, and
        more.
      </Text>
      <Pressable
        onPress={onAdd}
        style={[
          styles.primaryBtn,
          { backgroundColor: palette.primary, marginTop: spacing.xl },
        ]}
      >
        <Text style={styles.primaryBtnText}>Create first task</Text>
      </Pressable>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

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

  header: { marginBottom: spacing.lg },

  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  quickPrimaryText: {
    color: '#FFFFFF',
    fontFamily: fonts.sansSemiBold,
    fontSize: 14.5,
  },
  quickSecondary: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionWrap: { marginBottom: spacing.lg },
  sectionLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  sectionCount: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
  },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontFamily: fonts.sansBold,
    fontSize: 13,
    lineHeight: 15,
  },
  deleteBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  deleteText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
  },

  emptyCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyEmoji: { fontSize: 44 },
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