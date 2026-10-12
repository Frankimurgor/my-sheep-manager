// app/task/add.tsx
// Add or edit a task. Optional sheep link, group link, recurrence.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSheep } from '../../src/context/SheepContext';
import type { Palette } from '../../src/theme';
import { fonts, radius, spacing, type, useTheme } from '../../src/theme';
import type { TaskRecurrence } from '../../src/types';
import {
    addDays,
    formatMedium,
    toISODate,
} from '../../src/utils/date';

const DATE_PRESETS = [
  { label: 'Today', offset: 0 },
  { label: 'Tomorrow', offset: 1 },
  { label: 'In 3 days', offset: 3 },
  { label: 'In 1 week', offset: 7 },
  { label: 'In 1 month', offset: 30 },
] as const;

const RECURRENCE_OPTIONS: {
  value: TaskRecurrence;
  label: string;
}[] = [
  { value: 'none', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export default function AddTask() {
  const router = useRouter();
  const { palette } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const {
    tasks,
    activeSheep,
    flockGroups,
    addTask,
    updateTask,
    deleteTask,
    getSheep,
  } = useSheep();

  const editing = id ? tasks.find((t) => t.id === id) : undefined;

  const [title, setTitle] = useState(editing?.title ?? '');
  const [dueOffset, setDueOffset] = useState(0);
  const [customDate, setCustomDate] = useState<string | null>(
    editing?.dueDate ?? null
  );
  const [sheepId, setSheepId] = useState<string | undefined>(editing?.sheepId);
  const [group, setGroup] = useState<string | undefined>(editing?.group);
  const [recurrence, setRecurrence] = useState<TaskRecurrence>(
    editing?.recurrence ?? 'none'
  );
  const [recurrenceEnd, setRecurrenceEnd] = useState<string | undefined>(
    editing?.recurrenceEndDate
  );
  const [note, setNote] = useState(editing?.note ?? '');
  const [saving, setSaving] = useState(false);

  const dueDate = useMemo(
    () => customDate ?? toISODate(addDays(new Date(), dueOffset)),
    [customDate, dueOffset]
  );

  const canSave = title.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      if (editing) {
        await updateTask(editing.id, {
          title: title.trim(),
          dueDate,
          sheepId,
          group,
          recurrence,
          recurrenceEndDate: recurrenceEnd,
          note: note.trim() || undefined,
        });
      } else {
        await addTask({
          title: title.trim(),
          dueDate,
          sheepId,
          group,
          recurrence,
          recurrenceEndDate: recurrenceEnd,
          note: note.trim() || undefined,
        });
      }
      router.back();
    } catch (e) {
      Alert.alert('Could not save', String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!editing) return;
    Alert.alert('Delete task?', `"${editing.title}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(editing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.topBarBtn}
          >
            <Text style={[styles.topBarBtnText, { color: palette.textMuted }]}>
              Cancel
            </Text>
          </Pressable>
          <Text style={[type.title, { color: palette.text }]}>
            {editing ? 'Edit Task' : 'New Task'}
          </Text>
          {editing ? (
            <Pressable
              onPress={handleDelete}
              hitSlop={12}
              style={styles.topBarBtn}
            >
              <Text
                style={[
                  styles.topBarBtnText,
                  { color: palette.danger, textAlign: 'right' },
                ]}
              >
                Delete
              </Text>
            </Pressable>
          ) : (
            <View style={styles.topBarBtn} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 200 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <SectionLabel palette={palette} text="TASK · REQUIRED" />
          <TextInput
            value={title}
            onChangeText={(t) => setTitle(t.slice(0, 80))}
            placeholder="e.g., Vaccinate lambs"
            placeholderTextColor={palette.textMuted}
            style={inputStyle(palette)}
            maxLength={80}
            autoFocus={!editing}
          />

          {/* Due date */}
          <SectionLabel palette={palette} text="DUE DATE" />
          <View style={styles.chipsWrap}>
            {DATE_PRESETS.map((q) => {
              const active = !customDate && q.offset === dueOffset;
              return (
                <Pressable
                  key={q.label}
                  onPress={() => {
                    setCustomDate(null);
                    setDueOffset(q.offset);
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? palette.primary + '18'
                        : palette.surface,
                      borderColor: active ? palette.primary : palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      {
                        color: active ? palette.text : palette.textMuted,
                        fontFamily: active
                          ? fonts.sansSemiBold
                          : fonts.sansMedium,
                      },
                    ]}
                  >
                    {q.label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setCustomDate(customDate ? null : dueDate)}
              style={[
                styles.chip,
                {
                  backgroundColor: customDate
                    ? palette.primary + '18'
                    : palette.surface,
                  borderColor: customDate ? palette.primary : palette.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipLabel,
                  {
                    color: customDate ? palette.text : palette.textMuted,
                    fontFamily: customDate
                      ? fonts.sansSemiBold
                      : fonts.sansMedium,
                  },
                ]}
              >
                Custom
              </Text>
            </Pressable>
          </View>
          {customDate ? (
            <TextInput
              value={customDate}
              onChangeText={setCustomDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={palette.textMuted}
              style={[inputStyle(palette), { marginTop: spacing.sm }]}
              autoCapitalize="none"
              maxLength={10}
            />
          ) : (
            <Text
              style={[
                type.caption,
                { color: palette.textMuted, marginTop: spacing.sm },
              ]}
            >
              {formatMedium(dueDate)}
            </Text>
          )}

          {/* Recurrence */}
          <SectionLabel palette={palette} text="REPEAT" />
          <View style={styles.chipsWrap}>
            {RECURRENCE_OPTIONS.map((r) => {
              const active = r.value === recurrence;
              return (
                <Pressable
                  key={r.value}
                  onPress={() => setRecurrence(r.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? palette.primary + '18'
                        : palette.surface,
                      borderColor: active ? palette.primary : palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      {
                        color: active ? palette.text : palette.textMuted,
                        fontFamily: active
                          ? fonts.sansSemiBold
                          : fonts.sansMedium,
                      },
                    ]}
                  >
                    {r.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {recurrence !== 'none' ? (
            <>
              <Text
                style={[
                  type.caption,
                  { color: palette.textMuted, marginTop: spacing.md },
                ]}
              >
                Repeats until (optional)
              </Text>
              <TextInput
                value={recurrenceEnd ?? ''}
                onChangeText={(t) => setRecurrenceEnd(t || undefined)}
                placeholder="YYYY-MM-DD · leave blank for forever"
                placeholderTextColor={palette.textMuted}
                style={[inputStyle(palette), { marginTop: spacing.xs }]}
                autoCapitalize="none"
                maxLength={10}
              />
            </>
          ) : null}

          {/* Sheep link */}
          {activeSheep.length > 0 ? (
            <>
              <SectionLabel palette={palette} text="LINK TO SHEEP · OPTIONAL" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hScroll}
              >
                <Pressable
                  onPress={() => setSheepId(undefined)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: !sheepId
                        ? palette.primary + '20'
                        : palette.surface,
                      borderColor: !sheepId
                        ? palette.primary
                        : palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      {
                        color: !sheepId ? palette.text : palette.textMuted,
                        fontFamily: !sheepId
                          ? fonts.sansSemiBold
                          : fonts.sansMedium,
                      },
                    ]}
                  >
                    None
                  </Text>
                </Pressable>
                {activeSheep.map((s) => {
                  const active = s.id === sheepId;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => setSheepId(s.id)}
                      style={[
                        styles.pill,
                        {
                          backgroundColor: active
                            ? palette.primary + '20'
                            : palette.surface,
                          borderColor: active
                            ? palette.primary
                            : palette.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipLabel,
                          {
                            color: active ? palette.text : palette.textMuted,
                            fontFamily: active
                              ? fonts.sansSemiBold
                              : fonts.sansMedium,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {s.name?.trim() || `#${s.tag}`}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          ) : null}

          {/* Group link */}
          {flockGroups.length > 0 ? (
            <>
              <SectionLabel palette={palette} text="LINK TO GROUP · OPTIONAL" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hScroll}
              >
                <Pressable
                  onPress={() => setGroup(undefined)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: !group
                        ? palette.primary + '20'
                        : palette.surface,
                      borderColor: !group ? palette.primary : palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      {
                        color: !group ? palette.text : palette.textMuted,
                        fontFamily: !group
                          ? fonts.sansSemiBold
                          : fonts.sansMedium,
                      },
                    ]}
                  >
                    None
                  </Text>
                </Pressable>
                {flockGroups.map((g) => {
                  const active = g === group;
                  return (
                    <Pressable
                      key={g}
                      onPress={() => setGroup(g)}
                      style={[
                        styles.pill,
                        {
                          backgroundColor: active
                            ? palette.primary + '20'
                            : palette.surface,
                          borderColor: active
                            ? palette.primary
                            : palette.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipLabel,
                          {
                            color: active ? palette.text : palette.textMuted,
                            fontFamily: active
                              ? fonts.sansSemiBold
                              : fonts.sansMedium,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {g}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          ) : null}

          {/* Note */}
          <SectionLabel palette={palette} text="NOTE · OPTIONAL" />
          <TextInput
            value={note}
            onChangeText={(t) => setNote(t.slice(0, 200))}
            placeholder="Any details"
            placeholderTextColor={palette.textMuted}
            style={[
              inputStyle(palette),
              { minHeight: 80, textAlignVertical: 'top' },
            ]}
            multiline
            maxLength={200}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
        </ScrollView>

        {/* Save bar */}
        <View
          style={[
            styles.saveWrap,
            {
              backgroundColor: palette.background,
              borderTopColor: palette.divider,
            },
          ]}
        >
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            style={[
              styles.saveBtn,
              {
                backgroundColor: canSave ? palette.primary : palette.surfaceAlt,
                opacity: canSave ? 1 : 0.6,
              },
            ]}
          >
            <Text
              style={[
                styles.saveBtnText,
                {
                  color: canSave ? '#FFFFFF' : palette.textMuted,
                  fontFamily: fonts.sansSemiBold,
                },
              ]}
            >
              {editing ? 'Save changes' : 'Create task'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────

function SectionLabel({
  palette,
  text,
}: {
  palette: Palette;
  text: string;
}) {
  return (
    <Text
      style={[
        styles.sectionLabel,
        { color: palette.textMuted, marginTop: spacing.lg },
      ]}
    >
      {text}
    </Text>
  );
}

function inputStyle(palette: Palette) {
  return {
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: StyleSheet.hairlineWidth,
    color: palette.text,
    fontFamily: fonts.sansRegular,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  } as const;
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

  scroll: { paddingHorizontal: spacing.lg },

  sectionLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  hScroll: { gap: spacing.sm, paddingVertical: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipLabel: { fontSize: 13.5 },

  saveWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveBtn: {
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { fontSize: 16, letterSpacing: 0.3 },
});