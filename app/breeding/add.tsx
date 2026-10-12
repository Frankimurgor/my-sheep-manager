// app/breeding/add.tsx
// Log a mating / joining. Auto-computes expected lambing date (147d).

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSheep } from '../../src/context/SheepContext';
import type { Palette } from '../../src/theme';
import { fonts, radius, spacing, type, useTheme } from '../../src/theme';
import type { BreedingScanResult } from '../../src/types';
import {
    addDays,
    formatMedium,
    toISODate,
} from '../../src/utils/date';
import {
    SHEEP_GESTATION_DAYS,
    expectedLambingDate,
    sheepDisplayName,
} from '../../src/utils/sheep';

// ─── Constants ─────────────────────────────────────────────

const MATING_DATE_PRESETS = [
  { label: 'Today', offset: 0 },
  { label: 'Yesterday', offset: -1 },
  { label: '1 week ago', offset: -7 },
  { label: '1 month ago', offset: -30 },
] as const;

const SCAN_OPTIONS: { value: BreedingScanResult; label: string; emoji: string }[] = [
  { value: 'unknown', label: 'Not scanned', emoji: '❔' },
  { value: 'single', label: 'Single', emoji: '1️⃣' },
  { value: 'multiple', label: 'Multiple', emoji: '2️⃣' },
  { value: 'dry', label: 'Dry (empty)', emoji: '🚫' },
];

// ─── Screen ────────────────────────────────────────────────

export default function AddBreeding() {
  const router = useRouter();
  const { palette } = useTheme();
  const { damId } = useLocalSearchParams<{ damId?: string }>();
  const { activeSheep, addBreedingEvent, getSheep, settings } = useSheep();

  const preselectedDam = damId ? getSheep(damId) : undefined;

  const [selectedDamId, setSelectedDamId] = useState<string | undefined>(
    preselectedDam?.id
  );
  const [selectedSireId, setSelectedSireId] = useState<string | undefined>(
    settings.defaultSireId
  );
  const [matingOffset, setMatingOffset] = useState(0);
  const [customMatingDate, setCustomMatingDate] = useState<string | null>(
    null
  );
  const [expectedOverride, setExpectedOverride] = useState<string | null>(
    null
  );
  const [overrideActive, setOverrideActive] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [scanResult, setScanResult] = useState<BreedingScanResult>('unknown');
  const [scanDate, setScanDate] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Female sheep (potential dams)
  const eweOptions = useMemo(
    () => activeSheep.filter((s) => s.sex === 'ewe'),
    [activeSheep]
  );
  // Male sheep (potential sires)
  const ramOptions = useMemo(
    () => activeSheep.filter((s) => s.sex === 'ram'),
    [activeSheep]
  );

  // Compute mating date
  const matingDate = useMemo(
    () => customMatingDate ?? toISODate(addDays(new Date(), matingOffset)),
    [customMatingDate, matingOffset]
  );

  // Compute expected lambing date
  const computedLambing = useMemo(
    () => expectedLambingDate(matingDate),
    [matingDate]
  );

  // If user toggles override, seed with the computed date
  useEffect(() => {
    if (overrideActive && !expectedOverride) {
      setExpectedOverride(computedLambing);
    }
  }, [overrideActive, expectedOverride, computedLambing]);

  const effectiveLambing = overrideActive
    ? expectedOverride ?? computedLambing
    : computedLambing;

  const canSave = !!selectedDamId && !saving;

  const handleSave = async () => {
    if (!selectedDamId) {
      Alert.alert('Pick a ewe', 'Choose which ewe was mated.');
      return;
    }
    const dam = getSheep(selectedDamId);
    if (dam && dam.sex !== 'ewe') {
      Alert.alert(
        'Invalid dam',
        'Only ewes can be recorded as the mother. Change the sex of this animal first.'
      );
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      await addBreedingEvent({
        damId: selectedDamId,
        sireId: selectedSireId,
        matingDate,
        scanDate: scanDate ?? undefined,
        scanResult,
        expectedLambingDateOverride:
          overrideActive && expectedOverride ? expectedOverride : undefined,
        confirmed,
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
          <Text style={[type.title, { color: palette.text }]}>Log Breeding</Text>
          <View style={styles.topBarBtn} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 200 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Dam */}
          {preselectedDam ? (
            <>
              <SectionLabel palette={palette} text="EWE (MOTHER)" />
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
                    {sheepDisplayName(preselectedDam)}
                  </Text>
                  <Text
                    style={[
                      type.caption,
                      { color: palette.textMuted, marginTop: 2 },
                    ]}
                  >
                    #{preselectedDam.tag} · {preselectedDam.breed}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <SectionLabel palette={palette} text="EWE (MOTHER) · REQUIRED" />
              {eweOptions.length === 0 ? (
                <View
                  style={[
                    styles.emptyPicker,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      type.caption,
                      { color: palette.textMuted, textAlign: 'center' },
                    ]}
                  >
                    No ewes in your flock. Add a female sheep first, or change
                    the sex of an existing animal.
                  </Text>
                </View>
              ) : (
                <SheepPicker
                  palette={palette}
                  sheepList={eweOptions}
                  selectedId={selectedDamId}
                  onSelect={setSelectedDamId}
                />
              )}
            </>
          )}

          {/* Sire */}
          <SectionLabel palette={palette} text="RAM (FATHER) · OPTIONAL" />
          {ramOptions.length === 0 ? (
            <View
              style={[
                styles.emptyPicker,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <Text
                style={[
                  type.caption,
                  { color: palette.textMuted, textAlign: 'center' },
                ]}
              >
                No rams in your flock. Save without a sire, or add a ram later.
              </Text>
            </View>
          ) : (
            <SheepPicker
              palette={palette}
              sheepList={ramOptions}
              selectedId={selectedSireId}
              onSelect={setSelectedSireId}
              allowNone
            />
          )}

          {/* Mating date */}
          <SectionLabel palette={palette} text="MATING DATE" />
          <View style={styles.chipsWrap}>
            {MATING_DATE_PRESETS.map((q) => {
              const active =
                !customMatingDate && q.offset === matingOffset;
              return (
                <Pressable
                  key={q.label}
                  onPress={() => {
                    setCustomMatingDate(null);
                    setMatingOffset(q.offset);
                    setExpectedOverride(null);
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
              onPress={() =>
                setCustomMatingDate(customMatingDate ? null : matingDate)
              }
              style={[
                styles.chip,
                {
                  backgroundColor: customMatingDate
                    ? palette.primary + '18'
                    : palette.surface,
                  borderColor: customMatingDate
                    ? palette.primary
                    : palette.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipLabel,
                  {
                    color: customMatingDate ? palette.text : palette.textMuted,
                    fontFamily: customMatingDate
                      ? fonts.sansSemiBold
                      : fonts.sansMedium,
                  },
                ]}
              >
                Custom
              </Text>
            </Pressable>
          </View>
          {customMatingDate ? (
            <TextInput
              value={customMatingDate}
              onChangeText={(t) => {
                setCustomMatingDate(t);
                setExpectedOverride(null);
              }}
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
              {formatMedium(matingDate)}
            </Text>
          )}

          {/* Expected lambing — auto-computed, override optional */}
          <SectionLabel palette={palette} text="EXPECTED LAMBING" />
          <View
            style={[
              styles.lambingCard,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <Text style={styles.lambingEmoji}>🐣</Text>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.lambingValue,
                  { color: palette.text, fontFamily: fonts.serifBold },
                ]}
              >
                {effectiveLambing ? formatMedium(effectiveLambing) : '—'}
              </Text>
              <Text
                style={[
                  type.caption,
                  { color: palette.textMuted, marginTop: 4 },
                ]}
              >
                {overrideActive
                  ? 'Manually set'
                  : `Auto · ${SHEEP_GESTATION_DAYS} day gestation`}
              </Text>
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={[type.body, { color: palette.text, flex: 1 }]}>
              Override date
            </Text>
            <Switch
              value={overrideActive}
              onValueChange={setOverrideActive}
              trackColor={{
                false: palette.divider,
                true: palette.primary + '88',
              }}
              thumbColor={
                overrideActive ? palette.primary : palette.surface
              }
            />
          </View>

          {overrideActive && expectedOverride ? (
            <TextInput
              value={expectedOverride}
              onChangeText={setExpectedOverride}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={palette.textMuted}
              style={[inputStyle(palette), { marginTop: spacing.sm }]}
              autoCapitalize="none"
              maxLength={10}
            />
          ) : null}

          {/* Confirmed mating */}
          <View
            style={[
              styles.switchRow,
              { marginTop: spacing.lg, alignItems: 'flex-start' },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[type.body, { color: palette.text }]}>
                Mating confirmed
              </Text>
              <Text
                style={[
                  type.caption,
                  { color: palette.textMuted, marginTop: 2 },
                ]}
              >
                Turn on if she held to the ram (or if it was a controlled
                mating).
              </Text>
            </View>
            <Switch
              value={confirmed}
              onValueChange={setConfirmed}
              trackColor={{
                false: palette.divider,
                true: palette.primary + '88',
              }}
              thumbColor={confirmed ? palette.primary : palette.surface}
            />
          </View>

          {/* Scan */}
          <SectionLabel palette={palette} text="PREGNANCY SCAN · OPTIONAL" />
          <View style={styles.chipsWrap}>
            {SCAN_OPTIONS.map((opt) => {
              const active = opt.value === scanResult;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    setScanResult(opt.value);
                    if (opt.value === 'unknown') {
                      setScanDate(null);
                    } else if (!scanDate) {
                      setScanDate(toISODate(new Date()));
                    }
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? palette.breeding + '20'
                        : palette.surface,
                      borderColor: active
                        ? palette.breeding
                        : palette.border,
                    },
                  ]}
                >
                  <Text style={styles.chipEmoji}>{opt.emoji}</Text>
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
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {scanResult !== 'unknown' && scanDate ? (
            <>
              <Text
                style={[
                  type.caption,
                  { color: palette.textMuted, marginTop: spacing.md },
                ]}
              >
                Scan date
              </Text>
              <TextInput
                value={scanDate}
                onChangeText={setScanDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={palette.textMuted}
                style={[inputStyle(palette), { marginTop: spacing.xs }]}
                autoCapitalize="none"
                maxLength={10}
              />
            </>
          ) : null}

          {/* Note */}
          <SectionLabel palette={palette} text="NOTE · OPTIONAL" />
          <TextInput
            value={note}
            onChangeText={(t) => setNote(t.slice(0, 200))}
            placeholder="Anything worth remembering"
            placeholderTextColor={palette.textMuted}
            style={[
              inputStyle(palette),
              { minHeight: 80, textAlignVertical: 'top' },
            ]}
            multiline
            maxLength={200}
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
              Save breeding
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
  allowNone,
}: {
  palette: Palette;
  sheepList: { id: string; tag: string; name?: string; breed: string }[];
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  allowNone?: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.hScroll}
    >
      {allowNone ? (
        <Pressable
          onPress={() => onSelect(undefined)}
          style={[
            styles.sheepCard,
            {
              backgroundColor: !selectedId
                ? palette.primary + '20'
                : palette.surface,
              borderColor: !selectedId ? palette.primary : palette.border,
            },
          ]}
        >
          <Text style={styles.sheepCardEmoji}>❔</Text>
          <Text
            style={[
              styles.sheepCardLabel,
              {
                color: !selectedId ? palette.text : palette.textMuted,
                fontFamily: !selectedId
                  ? fonts.sansSemiBold
                  : fonts.sansMedium,
              },
            ]}
          >
            Unknown
          </Text>
        </Pressable>
      ) : null}
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

  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
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
  chipEmoji: { fontSize: 15, marginRight: 6 },
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

  lambingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  lambingEmoji: { fontSize: 26 },
  lambingValue: {
    fontSize: 18,
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.md,
  },

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