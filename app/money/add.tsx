// app/money/add.tsx
// Add or edit a money record. Income / expense, category, optional sheep link.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import type { MoneyKind } from '../../src/types';
import {
    addDays,
    formatMedium,
    toISODate,
} from '../../src/utils/date';
import { symbolFor } from '../../src/utils/money';

const DATE_PRESETS = [
  { label: 'Today', offset: 0 },
  { label: 'Yesterday', offset: -1 },
  { label: '2 days ago', offset: -2 },
] as const;

export default function AddMoneyRecord() {
  const router = useRouter();
  const { palette } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const {
    moneyRecords,
    moneyCategories,
    activeSheep,
    addMoneyRecord,
    updateMoneyRecord,
    deleteMoneyRecord,
    settings,
  } = useSheep();

  const editing = id ? moneyRecords.find((m) => m.id === id) : undefined;

  const currencySymbol = symbolFor(settings.currency);

  const [kind, setKind] = useState<MoneyKind>(editing?.kind ?? 'expense');
  const [amountText, setAmountText] = useState<string>(
    editing?.amount ? editing.amount.toFixed(2) : '0'
  );
  const [categoryId, setCategoryId] = useState<string | null>(
    editing?.categoryId ?? null
  );
  const [sheepId, setSheepId] = useState<string | undefined>(editing?.sheepId);
  const [dateOffset, setDateOffset] = useState(0);
  const [customDate, setCustomDate] = useState<string | null>(null);
  const [note, setNote] = useState(editing?.note ?? '');
  const [saving, setSaving] = useState(false);

  const eventDate = useMemo(
    () => customDate ?? toISODate(addDays(new Date(), dateOffset)),
    [customDate, dateOffset]
  );

  const visibleCategories = useMemo(
    () => moneyCategories.filter((c) => c.group === kind),
    [moneyCategories, kind]
  );

  // Keep category valid when kind changes
  useEffect(() => {
    if (!categoryId || !visibleCategories.some((c) => c.id === categoryId)) {
      setCategoryId(visibleCategories[0]?.id ?? null);
    }
  }, [visibleCategories, categoryId]);

  const amountValue = useMemo(() => {
    const n = parseFloat(amountText);
    return isFinite(n) && n > 0 ? n : 0;
  }, [amountText]);

  const canSave = amountValue > 0 && !!categoryId && !saving;

  // ─── Keypad ────────────────────────────────────────────
  const handleDigit = (d: string) => {
    setAmountText((prev) => {
      if (prev === '0') return d;
      const [, decimals] = prev.split('.');
      if (decimals && decimals.length >= 2) return prev;
      if (prev.replace('.', '').length >= 10) return prev;
      return prev + d;
    });
  };
  const handleDot = () =>
    setAmountText((prev) => (prev.includes('.') ? prev : prev + '.'));
  const handleBackspace = () =>
    setAmountText((prev) => (prev.length <= 1 ? '0' : prev.slice(0, -1)));

  // ─── Save ─────────────────────────────────────────────
  const handleSave = async () => {
    if (!canSave || !categoryId) return;
    setSaving(true);
    try {
      if (editing) {
        await updateMoneyRecord(editing.id, {
          kind,
          amount: amountValue,
          categoryId,
          sheepId,
          date: eventDate,
          note: note.trim() || undefined,
        });
      } else {
        await addMoneyRecord({
          kind,
          amount: amountValue,
          categoryId,
          sheepId,
          date: eventDate,
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
    Alert.alert('Delete record?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMoneyRecord(editing.id);
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
            {editing ? 'Edit Record' : 'New Record'}
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
          {/* Kind toggle */}
          <View
            style={[
              styles.kindSegment,
              {
                backgroundColor: palette.surfaceAlt,
                borderColor: palette.border,
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
                    styles.kindItem,
                    active && { backgroundColor: activeColor },
                  ]}
                >
                  <Text
                    style={[
                      styles.kindLabel,
                      {
                        color: active ? '#FFFFFF' : palette.textMuted,
                        fontFamily: active
                          ? fonts.sansSemiBold
                          : fonts.sansMedium,
                      },
                    ]}
                  >
                    {k === 'expense' ? 'Expense' : 'Income'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Amount */}
          <View style={styles.amountWrap}>
            <Text style={[styles.amountCurrency, { color: palette.textMuted }]}>
              {currencySymbol}
            </Text>
            <Text
              style={[
                styles.amountValue,
                {
                  color: kind === 'expense' ? palette.danger : palette.healthy,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {amountText}
            </Text>
          </View>

          {/* Keypad */}
          <View style={styles.keypad}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['.', '0', '⌫'],
            ].map((row, ri) => (
              <View key={ri} style={styles.keypadRow}>
                {row.map((key) => (
                  <Pressable
                    key={key}
                    onPress={() => {
                      if (key === '.') handleDot();
                      else if (key === '⌫') handleBackspace();
                      else handleDigit(key);
                    }}
                    style={({ pressed }) => [
                      styles.key,
                      {
                        backgroundColor: pressed
                          ? palette.surfaceAlt
                          : palette.surface,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    <Text style={[styles.keyText, { color: palette.text }]}>
                      {key}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>

          {/* Category chips */}
          <SectionLabel palette={palette} text="CATEGORY" />
          <View style={styles.chipsWrap}>
            {visibleCategories.map((c) => {
              const active = c.id === categoryId;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setCategoryId(c.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? c.color + '22'
                        : palette.surface,
                      borderColor: active ? c.color : palette.border,
                    },
                  ]}
                >
                  <Text style={styles.chipEmoji}>{c.emoji}</Text>
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
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

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
                    styles.sheepChip,
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
                        styles.sheepChip,
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

          {/* Date */}
          <SectionLabel palette={palette} text="DATE" />
          <View style={styles.chipsWrap}>
            {DATE_PRESETS.map((q) => {
              const active = !customDate && q.offset === dateOffset;
              return (
                <Pressable
                  key={q.label}
                  onPress={() => {
                    setCustomDate(null);
                    setDateOffset(q.offset);
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
              onPress={() => setCustomDate(customDate ? null : eventDate)}
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
              {formatMedium(eventDate)}
            </Text>
          )}

          {/* Note */}
          <SectionLabel palette={palette} text="NOTE · OPTIONAL" />
          <TextInput
            value={note}
            onChangeText={(t) => setNote(t.slice(0, 120))}
            placeholder="What was it for?"
            placeholderTextColor={palette.textMuted}
            style={inputStyle(palette)}
            maxLength={120}
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
                backgroundColor: canSave
                  ? kind === 'expense'
                    ? palette.danger
                    : palette.healthy
                  : palette.surfaceAlt,
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
              {editing
                ? 'Save changes'
                : `Save ${kind === 'expense' ? 'expense' : 'income'}`}
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

  kindSegment: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
  },
  kindItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  kindLabel: { fontSize: 14, letterSpacing: 0.3 },

  amountWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  amountCurrency: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 20,
    marginRight: spacing.sm,
  },
  amountValue: {
    fontFamily: fonts.serifBold,
    fontSize: 48,
    lineHeight: 54,
    maxWidth: '80%',
  },

  keypad: { marginTop: spacing.xs },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  key: {
    flex: 1,
    marginHorizontal: 4,
    height: 52,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { fontFamily: fonts.sansSemiBold, fontSize: 20 },

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
  },
  hScroll: { gap: spacing.sm, paddingVertical: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  sheepChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipEmoji: { fontSize: 15, marginRight: 6 },
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