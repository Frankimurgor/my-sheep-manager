// app/lambing/add.tsx
// Log a lambing — dam, sire, dynamic lamb list, welfare scores.
// Optionally creates new sheep records for the tagged lambs.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
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
import type {
    BirthType,
    LambRecord,
    LambingEase,
} from '../../src/types';
import {
    addDays,
    formatMedium,
    toISODate,
} from '../../src/utils/date';
import { sheepDisplayName, toKg } from '../../src/utils/sheep';

// ─── Constants ─────────────────────────────────────────────

const LAMBING_DATE_PRESETS = [
  { label: 'Today', offset: 0 },
  { label: 'Yesterday', offset: -1 },
  { label: '2 days ago', offset: -2 },
] as const;

const BIRTH_TYPES: { value: BirthType; label: string; count: number }[] = [
  { value: 'single', label: 'Single', count: 1 },
  { value: 'double', label: 'Double', count: 2 },
  { value: 'triple', label: 'Triple', count: 3 },
  { value: 'quad', label: 'Quad', count: 4 },
  { value: 'more', label: 'More (5+)', count: 5 },
];

const SCORES: LambingEase[] = [1, 2, 3, 4, 5];

const SCORE_LABELS: Record<LambingEase, string> = {
  1: 'Easy',
  2: 'Slight assist',
  3: 'Assisted',
  4: 'Difficult',
  5: 'Cesarean',
};

const MOTHERING_LABELS: Record<LambingEase, string> = {
  1: 'Excellent',
  2: 'Good',
  3: 'Fair',
  4: 'Poor',
  5: 'Rejected',
};

const MILK_LABELS: Record<LambingEase, string> = {
  1: 'Plenty',
  2: 'Good',
  3: 'Adequate',
  4: 'Low',
  5: 'None',
};

// ─── Lamb draft type ──────────────────────────────────────

type LambDraft = {
  /** Local UI id, not persisted */
  tempId: string;
  sex: 'ram' | 'ewe' | 'unknown';
  birthWeightText: string;
  bornAlive: boolean;
  survived: boolean;
  tag: string; // optional — if set, a new Sheep is created
  name: string;
  note: string;
};

function newLambDraft(): LambDraft {
  return {
    tempId: `ld_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    sex: 'unknown',
    birthWeightText: '',
    bornAlive: true,
    survived: true,
    tag: '',
    name: '',
    note: '',
  };
}

// ─── Screen ────────────────────────────────────────────────

export default function AddLambing() {
  const router = useRouter();
  const { palette } = useTheme();
  const { damId } = useLocalSearchParams<{ damId?: string }>();
  const {
    activeSheep,
    getSheep,
    addLambing,
    addSheep,
    settings,
  } = useSheep();

  const preselectedDam = damId ? getSheep(damId) : undefined;

  const [selectedDamId, setSelectedDamId] = useState<string | undefined>(
    preselectedDam?.id
  );
  const [selectedSireId, setSelectedSireId] = useState<string | undefined>(
    undefined
  );
  const [lambingOffset, setLambingOffset] = useState(0);
  const [customDate, setCustomDate] = useState<string | null>(null);
  const [lambs, setLambs] = useState<LambDraft[]>([newLambDraft()]);
  const [ease, setEase] = useState<LambingEase | undefined>(undefined);
  const [mothering, setMothering] = useState<LambingEase | undefined>(
    undefined
  );
  const [milkiness, setMilkiness] = useState<LambingEase | undefined>(
    undefined
  );
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const unit = settings.weightUnit;

  // Dam options
  const eweOptions = useMemo(
    () => activeSheep.filter((s) => s.sex === 'ewe'),
    [activeSheep]
  );
  const ramOptions = useMemo(
    () => activeSheep.filter((s) => s.sex === 'ram'),
    [activeSheep]
  );

  // Date
  const lambingDate = useMemo(
    () => customDate ?? toISODate(addDays(new Date(), lambingOffset)),
    [customDate, lambingOffset]
  );

  // Auto-derive birth type from lamb count
  const derivedBirthType: BirthType = useMemo(() => {
    const alive = lambs.length;
    if (alive <= 1) return 'single';
    if (alive === 2) return 'double';
    if (alive === 3) return 'triple';
    if (alive === 4) return 'quad';
    return 'more';
  }, [lambs]);

  const canSave = !!selectedDamId && lambs.length > 0 && !saving;

  // ─── Lamb list manipulation ─────────────────────────────
  const addLambRow = () => {
    setLambs((prev) => [...prev, newLambDraft()]);
  };

  const removeLambRow = (tempId: string) => {
    setLambs((prev) => {
      if (prev.length <= 1) return prev; // always keep one
      return prev.filter((l) => l.tempId !== tempId);
    });
  };

  const updateLamb = (tempId: string, patch: Partial<LambDraft>) => {
    setLambs((prev) =>
      prev.map((l) => (l.tempId === tempId ? { ...l, ...patch } : l))
    );
  };

  // ─── Save ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedDamId) {
      Alert.alert('Pick a ewe', 'Choose which ewe gave birth.');
      return;
    }
    if (lambs.length === 0) {
      Alert.alert('Add at least one lamb', 'Every lambing has at least one lamb.');
      return;
    }
    if (saving) return;
    setSaving(true);

    try {
      // Convert lamb drafts into LambRecord[], creating new sheep if tagged.
      const lambRecords: LambRecord[] = [];
      for (const d of lambs) {
        let sheepId: string | undefined = undefined;
        const trimmedTag = d.tag.trim();
        if (d.bornAlive && trimmedTag) {
          // Duplicate check
          const dup = activeSheep.some(
            (s) => s.tag.toLowerCase() === trimmedTag.toLowerCase()
          );
          if (dup) {
            Alert.alert(
              'Tag already in use',
              `Tag "${trimmedTag}" belongs to another animal. Change it and try again.`
            );
            setSaving(false);
            return;
          }
          const weightKg = d.birthWeightText
            ? toKg(parseFloat(d.birthWeightText), unit)
            : undefined;
          const newSheep = await addSheep({
            tag: trimmedTag,
            name: d.name.trim() || undefined,
            breed: preselectedDam?.breed ?? 'Mixed / Cross',
            sex: d.sex === 'unknown' ? 'lamb' : d.sex,
            dob: lambingDate,
            damId: selectedDamId,
            sireId: selectedSireId,
            notes: d.note.trim() || undefined,
          });
          sheepId = newSheep.id;
          // (Optional weight creation — we can add weight later from profile.)
          if (weightKg && weightKg > 0) {
            // Note: context exposes addWeight; using it would create a
            // weight record automatically. Skip here to keep flow simple.
          }
        }

        lambRecords.push({
          sheepId,
          sex: d.sex,
          birthWeightKg: d.birthWeightText
            ? toKg(parseFloat(d.birthWeightText), unit)
            : undefined,
          bornAlive: d.bornAlive,
          survived: d.bornAlive ? d.survived : undefined,
          note: d.note.trim() || undefined,
        });
      }

      await addLambing({
        damId: selectedDamId,
        sireId: selectedSireId,
        lambingDate,
        birthType: derivedBirthType,
        lambs: lambRecords,
        ease,
        mothering,
        milkiness,
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
          <Text style={[type.title, { color: palette.text }]}>Log Lambing</Text>
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
                    No ewes in your flock.
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
          <SheepPicker
            palette={palette}
            sheepList={ramOptions}
            selectedId={selectedSireId}
            onSelect={setSelectedSireId}
            allowNone
          />

          {/* Date */}
          <SectionLabel palette={palette} text="LAMBING DATE" />
          <View style={styles.chipsWrap}>
            {LAMBING_DATE_PRESETS.map((q) => {
              const active = !customDate && q.offset === lambingOffset;
              return (
                <Pressable
                  key={q.label}
                  onPress={() => {
                    setCustomDate(null);
                    setLambingOffset(q.offset);
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
              onPress={() => setCustomDate(customDate ? null : lambingDate)}
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
              {formatMedium(lambingDate)}
            </Text>
          )}

          {/* Lambs list */}
          <View style={styles.lambHeaderRow}>
            <SectionLabelNoMargin
              palette={palette}
              text={`LAMBS · ${lambs.length}`}
            />
            <Pressable
              onPress={addLambRow}
              hitSlop={8}
              style={styles.addLambBtn}
            >
              <Text style={[styles.addLambText, { color: palette.primary }]}>
                + Add lamb
              </Text>
            </Pressable>
          </View>

          <View
            style={[
              styles.autoTypeBanner,
              {
                backgroundColor: palette.surfaceAlt,
                borderColor: palette.border,
              },
            ]}
          >
            <Text style={[type.caption, { color: palette.textMuted }]}>
              Birth type:{' '}
              <Text
                style={[type.caption, { color: palette.text }]}
              >
                {BIRTH_TYPES.find((b) => b.value === derivedBirthType)?.label ??
                  '—'}
              </Text>{' '}
              (auto from count)
            </Text>
          </View>

          {lambs.map((d, idx) => (
            <LambEditor
              key={d.tempId}
              palette={palette}
              index={idx}
              unit={unit}
              lamb={d}
              canRemove={lambs.length > 1}
              onChange={(patch) => updateLamb(d.tempId, patch)}
              onRemove={() => removeLambRow(d.tempId)}
            />
          ))}

          {/* Welfare scores */}
          <SectionLabel palette={palette} text="LAMBING EASE" />
          <ScoreRow
            palette={palette}
            value={ease}
            onChange={setEase}
            labels={SCORE_LABELS}
          />

          <SectionLabel palette={palette} text="MOTHERING" />
          <ScoreRow
            palette={palette}
            value={mothering}
            onChange={setMothering}
            labels={MOTHERING_LABELS}
          />

          <SectionLabel palette={palette} text="MILKINESS" />
          <ScoreRow
            palette={palette}
            value={milkiness}
            onChange={setMilkiness}
            labels={MILK_LABELS}
          />

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
              Save lambing · {lambs.length} lamb
              {lambs.length === 1 ? '' : 's'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Lamb editor ──────────────────────────────────────────

function LambEditor({
  palette,
  index,
  unit,
  lamb,
  canRemove,
  onChange,
  onRemove,
}: {
  palette: Palette;
  index: number;
  unit: 'kg' | 'lb';
  lamb: LambDraft;
  canRemove: boolean;
  onChange: (patch: Partial<LambDraft>) => void;
  onRemove: () => void;
}) {
  const sexColor =
    lamb.sex === 'ram'
      ? palette.male
      : lamb.sex === 'ewe'
      ? palette.female
      : palette.textMuted;

  return (
    <View
      style={[
        styles.lambCard,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          borderLeftColor: sexColor,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.lambCardHead}>
        <View
          style={[
            styles.lambIndexBadge,
            { backgroundColor: sexColor + '20' },
          ]}
        >
          <Text style={[styles.lambIndexText, { color: sexColor }]}>
            LAMB {index + 1}
          </Text>
        </View>
        {canRemove ? (
          <Pressable onPress={onRemove} hitSlop={8}>
            <Text style={[styles.lambRemove, { color: palette.danger }]}>
              Remove
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Sex */}
      <Text
        style={[styles.miniLabel, { color: palette.textMuted, marginTop: spacing.sm }]}
      >
        SEX
      </Text>
      <View style={styles.miniSegment}>
        {(['ram', 'ewe', 'unknown'] as const).map((s) => {
          const active = lamb.sex === s;
          return (
            <Pressable
              key={s}
              onPress={() => onChange({ sex: s })}
              style={[
                styles.miniSegmentItem,
                {
                  backgroundColor: active
                    ? palette.primary
                    : palette.surfaceAlt,
                  borderColor: active ? palette.primary : palette.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.miniSegmentText,
                  {
                    color: active ? '#FFFFFF' : palette.textMuted,
                    fontFamily: active
                      ? fonts.sansSemiBold
                      : fonts.sansMedium,
                  },
                ]}
              >
                {s === 'ram' ? '♂ Ram' : s === 'ewe' ? '♀ Ewe' : '? Unknown'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Birth weight */}
      <Text
        style={[styles.miniLabel, { color: palette.textMuted, marginTop: spacing.md }]}
      >
        BIRTH WEIGHT ({unit.toUpperCase()}) · OPTIONAL
      </Text>
      <TextInput
        value={lamb.birthWeightText}
        onChangeText={(t) => onChange({ birthWeightText: t.slice(0, 6) })}
        placeholder="0.0"
        placeholderTextColor={palette.textMuted}
        style={inputStyle(palette)}
        keyboardType="decimal-pad"
        maxLength={6}
      />

      {/* Born alive / Survived */}
      <View style={styles.switchMini}>
        <Text style={[type.body, { color: palette.text, flex: 1 }]}>
          Born alive
        </Text>
        <Switch
          value={lamb.bornAlive}
          onValueChange={(v) =>
            onChange({ bornAlive: v, survived: v ? lamb.survived : false })
          }
          trackColor={{
            false: palette.divider,
            true: palette.primary + '88',
          }}
          thumbColor={lamb.bornAlive ? palette.primary : palette.surface}
        />
      </View>

      {lamb.bornAlive ? (
        <View style={styles.switchMini}>
          <Text style={[type.body, { color: palette.text, flex: 1 }]}>
            Survived past 24h
          </Text>
          <Switch
            value={lamb.survived}
            onValueChange={(v) => onChange({ survived: v })}
            trackColor={{
              false: palette.divider,
              true: palette.primary + '88',
            }}
            thumbColor={lamb.survived ? palette.primary : palette.surface}
          />
        </View>
      ) : null}

      {/* Tag this lamb immediately */}
      {lamb.bornAlive ? (
        <>
          <Text
            style={[
              styles.miniLabel,
              { color: palette.textMuted, marginTop: spacing.md },
            ]}
          >
            TAG NOW · OPTIONAL
          </Text>
          <Text
            style={[
              type.caption,
              { color: palette.textMuted, marginBottom: spacing.sm },
            ]}
          >
            Give this lamb a tag and we'll add it to your flock automatically.
          </Text>
          <View style={styles.tagRow}>
            <TextInput
              value={lamb.tag}
              onChangeText={(t) => onChange({ tag: t.slice(0, 20) })}
              placeholder="e.g., A123"
              placeholderTextColor={palette.textMuted}
              style={[inputStyle(palette), { flex: 1 }]}
              autoCapitalize="characters"
              maxLength={20}
            />
            <TextInput
              value={lamb.name}
              onChangeText={(t) => onChange({ name: t.slice(0, 30) })}
              placeholder="Name"
              placeholderTextColor={palette.textMuted}
              style={[inputStyle(palette), { flex: 1, marginLeft: spacing.sm }]}
              maxLength={30}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

// ─── Score row ────────────────────────────────────────────

function ScoreRow({
  palette,
  value,
  onChange,
  labels,
}: {
  palette: Palette;
  value: LambingEase | undefined;
  onChange: (v: LambingEase | undefined) => void;
  labels: Record<LambingEase, string>;
}) {
  return (
    <View>
      <View style={styles.scoreRow}>
        {SCORES.map((n) => {
          const active = value === n;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(active ? undefined : n)}
              style={[
                styles.scoreCell,
                {
                  backgroundColor: active
                    ? palette.primary
                    : palette.surface,
                  borderColor: active ? palette.primary : palette.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.scoreCellText,
                  {
                    color: active ? '#FFFFFF' : palette.textMuted,
                    fontFamily: active
                      ? fonts.sansSemiBold
                      : fonts.sansMedium,
                  },
                ]}
              >
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {value ? (
        <Text
          style={[
            type.caption,
            { color: palette.textMuted, marginTop: spacing.xs },
          ]}
        >
          {labels[value]}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Shared ───────────────────────────────────────────────

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

function SectionLabelNoMargin({
  palette,
  text,
}: {
  palette: Palette;
  text: string;
}) {
  return (
    <Text style={[styles.sectionLabel, { color: palette.textMuted }]}>
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
  if (sheepList.length === 0 && !allowNone) {
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
          None available.
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

// ─── Style helper ─────────────────────────────────────────

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

  lambHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  addLambBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addLambText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13.5,
  },

  autoTypeBanner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm,
  },

  lambCard: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 4,
    marginBottom: spacing.md,
  },
  lambCardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lambIndexBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  lambIndexText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  lambRemove: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12.5,
  },

  miniLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  miniSegment: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  miniSegmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  miniSegmentText: { fontSize: 12.5 },

  switchMini: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.md,
  },

  tagRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  scoreRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scoreCell: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  scoreCellText: { fontSize: 16 },

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