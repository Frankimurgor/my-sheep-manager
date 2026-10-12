// app/weight/add.tsx
// Log a weight. Respects the user's kg/lb preference from settings.

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
import {
    addDays,
    formatMedium,
    toISODate,
} from '../../src/utils/date';
import { sheepDisplayName, toKg } from '../../src/utils/sheep';

const DATE_PRESETS = [
  { label: 'Today', offset: 0 },
  { label: 'Yesterday', offset: -1 },
  { label: '1 week ago', offset: -7 },
] as const;

export default function AddWeight() {
  const router = useRouter();
  const { palette } = useTheme();
  const { sheepId } = useLocalSearchParams<{ sheepId?: string }>();
  const { activeSheep, addWeight, getSheep, settings } = useSheep();

  const preselect = sheepId ? getSheep(sheepId) : undefined;

  const [selectedSheepId, setSelectedSheepId] = useState<string | undefined>(
    preselect?.id
  );
  const [dateOffset, setDateOffset] = useState(0);
  const [customDate, setCustomDate] = useState<string | null>(null);
  const [weightText, setWeightText] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const unit = settings.weightUnit;

  const eventDate = useMemo(
    () => customDate ?? toISODate(addDays(new Date(), dateOffset)),
    [customDate, dateOffset]
  );

  const weightValue = useMemo(() => {
    const n = parseFloat(weightText);
    return isFinite(n) && n > 0 ? n : 0;
  }, [weightText]);

  const canSave =
    !!selectedSheepId && weightValue > 0 && !saving;

  const handleSave = async () => {
    if (!selectedSheepId) {
      Alert.alert('Pick a sheep', 'Choose which animal this weight is for.');
      return;
    }
    if (weightValue <= 0) {
      Alert.alert('Weight required', 'Enter a positive number.');
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      // Always store in kg — convert if the user entered pounds
      const weightKg = toKg(weightValue, unit);
      await addWeight({
        sheepId: selectedSheepId,
        date: eventDate,
        weightKg,
        note: note.trim() || undefined,
      });
      router.back();
    } catch (e) {
      Alert.alert('Could not save', String(e));
    } finally {
      setSaving(false);
    }
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
          <Text style={[type.title, { color: palette.text }]}>Log Weight</Text>
          <View style={styles.topBarBtn} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 200 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Sheep picker */}
          {preselect ? (
            <>
              <SectionLabel palette={palette} text="ANIMAL" />
              <View
                style={[
                  styles.selectedSheep,
                  {
                    backgroundColor: palette.surfaceAlt,
                    borderColor: palette.border,
                  },
                ]}
              >
                <Text style={styles.selectedSheepEmoji}>🐑</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[type.bodyStrong, { color: palette.text }]}>
                    {sheepDisplayName(preselect)}
                  </Text>
                  <Text
                    style={[
                      type.caption,
                      { color: palette.textMuted, marginTop: 2 },
                    ]}
                  >
                    #{preselect.tag} · {preselect.breed}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <SectionLabel palette={palette} text="ANIMAL · REQUIRED" />
              <SheepPicker
                palette={palette}
                sheepList={activeSheep}
                selectedId={selectedSheepId}
                onSelect={setSelectedSheepId}
              />
            </>
          )}

          {/* Weight input */}
          <SectionLabel
            palette={palette}
            text={`WEIGHT (${unit.toUpperCase()}) · REQUIRED`}
          />
          <View
            style={[
              styles.weightWrap,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <TextInput
              value={weightText}
              onChangeText={(t) => setWeightText(t.slice(0, 8))}
              placeholder="0.0"
              placeholderTextColor={palette.textMuted}
              style={[
                styles.weightInput,
                { color: palette.text, fontFamily: fonts.serifBold },
              ]}
              keyboardType="decimal-pad"
              maxLength={8}
              autoFocus={!!preselect}
            />
            <Text
              style={[
                styles.weightUnit,
                { color: palette.textMuted, fontFamily: fonts.sansSemiBold },
              ]}
            >
              {unit}
            </Text>
          </View>

          {/* Quick buttons for common weights (kg only) */}
          {unit === 'kg' ? (
            <View style={styles.chipsWrap}>
              {[5, 10, 20, 30, 40, 50, 60, 80].map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setWeightText(String(v))}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      {
                        color: palette.textMuted,
                        fontFamily: fonts.sansMedium,
                      },
                    ]}
                  >
                    {v} kg
                  </Text>
                </Pressable>
              ))}
            </View>
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
            placeholder="e.g., Pre-sale check, after shearing"
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
              Save weight
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────

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

function SheepPicker({
  palette,
  sheepList,
  selectedId,
  onSelect,
}: {
  palette: Palette;
  sheepList: { id: string; tag: string; name?: string; breed: string }[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  if (sheepList.length === 0) {
    return (
      <View
        style={[
          styles.emptyPicker,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
          },
        ]}
      >
        <Text style={[type.caption, { color: palette.textMuted }]}>
          No sheep in your flock yet.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.hScroll}
    >
      {sheepList.map((s) => {
        const active = s.id === selectedId;
        return (
          <Pressable
            key={s.id}
            onPress={() => onSelect(s.id)}
            style={[
              styles.sheepCard,
              {
                backgroundColor: active
                  ? palette.primary + '20'
                  : palette.surface,
                borderColor: active ? palette.primary : palette.border,
              },
            ]}
          >
            <Text style={styles.sheepCardEmoji}>🐑</Text>
            <Text
              style={[
                styles.sheepCardLabel,
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
            <Text
              style={[styles.sheepCardSub, { color: palette.textMuted }]}
              numberOfLines={1}
            >
              #{s.tag}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── Style helpers ─────────────────────────────────────────

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

  weightWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  weightInput: {
    fontSize: 52,
    lineHeight: 58,
    textAlign: 'center',
    minWidth: 120,
    paddingVertical: 0,
  },
  weightUnit: {
    fontSize: 20,
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
  chipLabel: { fontSize: 13.5 },

  emptyPicker: {
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  sheepCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 90,
  },
  sheepCardEmoji: { fontSize: 22 },
  sheepCardLabel: { fontSize: 13, marginTop: 4 },
  sheepCardSub: { fontSize: 11, marginTop: 2 },

  selectedSheep: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  selectedSheepEmoji: { fontSize: 24 },

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