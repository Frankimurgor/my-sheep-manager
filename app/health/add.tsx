// app/health/add.tsx
// Log a health event — vaccine, deworm, treatment, vet, hoof, shear, other.
// Handles withdrawal-period tracking for meat safety.

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
import type { HealthEventType } from '../../src/types';
import {
  addDays,
  formatMedium,
  toISODate,
} from '../../src/utils/date';
import { sheepDisplayName } from '../../src/utils/sheep';

// ─── Constants ─────────────────────────────────────────────

type HealthTypeOption = {
  value: HealthEventType;
  label: string;
  emoji: string;
};

const HEALTH_TYPES: HealthTypeOption[] = [
  { value: 'vaccine', label: 'Vaccine', emoji: '💉' },
  { value: 'deworm', label: 'Deworm', emoji: '🧪' },
  { value: 'treatment', label: 'Treatment', emoji: '💊' },
  { value: 'vet', label: 'Vet visit', emoji: '🩺' },
  { value: 'hoof', label: 'Hoof trim', emoji: '🦶' },
  { value: 'shear', label: 'Shearing', emoji: '✂️' },
  { value: 'other', label: 'Other', emoji: '📋' },
];

const DATE_PRESETS = [
  { label: 'Today', offset: 0 },
  { label: 'Yesterday', offset: -1 },
  { label: '2 days ago', offset: -2 },
] as const;

const WITHDRAWAL_PRESETS = [
  { label: 'None', value: 0 },
  { label: '7 days', value: 7 },
  { label: '14 days', value: 14 },
  { label: '21 days', value: 21 },
  { label: '28 days', value: 28 },
] as const;

// ─── Screen ────────────────────────────────────────────────

export default function AddHealthEvent() {
  const router = useRouter();
  const { palette } = useTheme();
  const { sheepId } = useLocalSearchParams<{ sheepId?: string }>();
  const { activeSheep, addHealthEvent, getSheep } = useSheep();

  const preselect = sheepId ? getSheep(sheepId) : undefined;

  const [selectedSheepId, setSelectedSheepId] = useState<string | undefined>(
    preselect?.id
  );
  const [eventType, setEventType] = useState<HealthEventType>('vaccine');
  const [dateOffset, setDateOffset] = useState(0);
  const [customDate, setCustomDate] = useState<string | null>(null);
  const [product, setProduct] = useState('');
  const [dose, setDose] = useState('');
  const [withdrawalDays, setWithdrawalDays] = useState(0);
  const [administeredBy, setAdministeredBy] = useState('');
  const [costText, setCostText] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const eventDate = useMemo(
    () => customDate ?? toISODate(addDays(new Date(), dateOffset)),
    [customDate, dateOffset]
  );

  const costValue = useMemo(() => {
    const n = parseFloat(costText);
    return isFinite(n) && n > 0 ? n : undefined;
  }, [costText]);

  const canSave =
    !!selectedSheepId && product.trim().length > 0 && !saving;

  // ─── Save ─────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedSheepId) {
      Alert.alert('Pick a sheep', 'Choose which animal this event is for.');
      return;
    }
    if (product.trim().length === 0) {
      Alert.alert('Product name required', 'What did you administer?');
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      await addHealthEvent({
        sheepId: selectedSheepId,
        date: eventDate,
        type: eventType,
        product: product.trim(),
        dose: dose.trim() || undefined,
        withdrawalDays: withdrawalDays > 0 ? withdrawalDays : undefined,
        administeredBy: administeredBy.trim() || undefined,
        cost: costValue,
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
          <Text style={[type.title, { color: palette.text }]}>
            Log Health Event
          </Text>
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

          {/* Type */}
          <SectionLabel palette={palette} text="TYPE" />
          <View style={styles.chipsWrap}>
            {HEALTH_TYPES.map((t) => {
              const active = t.value === eventType;
              return (
                <Pressable
                  key={t.value}
                  onPress={() => setEventType(t.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? palette.primary + '20'
                        : palette.surface,
                      borderColor: active ? palette.primary : palette.border,
                    },
                  ]}
                >
                  <Text style={styles.chipEmoji}>{t.emoji}</Text>
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
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Product */}
          <SectionLabel palette={palette} text="PRODUCT · REQUIRED" />
          <TextInput
            value={product}
            onChangeText={(t) => setProduct(t.slice(0, 60))}
            placeholder="e.g., Ivermectin, Coopers, Betamox"
            placeholderTextColor={palette.textMuted}
            style={inputStyle(palette)}
            maxLength={60}
          />

          {/* Dose */}
          <SectionLabel palette={palette} text="DOSE · OPTIONAL" />
          <TextInput
            value={dose}
            onChangeText={(t) => setDose(t.slice(0, 30))}
            placeholder="e.g., 5 ml, 1 tablet"
            placeholderTextColor={palette.textMuted}
            style={inputStyle(palette)}
            maxLength={30}
          />

          {/* Withdrawal */}
          <SectionLabel palette={palette} text="WITHDRAWAL PERIOD" />
          <Text
            style={[
              type.caption,
              { color: palette.textMuted, marginBottom: spacing.sm },
            ]}
          >
            Days before the animal can be sold for meat. Check the product
            label.
          </Text>
          <View style={styles.chipsWrap}>
            {WITHDRAWAL_PRESETS.map((w) => {
              const active = withdrawalDays === w.value;
              return (
                <Pressable
                  key={w.value}
                  onPress={() => setWithdrawalDays(w.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active
                        ? (w.value > 0 ? palette.danger : palette.primary) +
                          '20'
                        : palette.surface,
                      borderColor: active
                        ? w.value > 0
                          ? palette.danger
                          : palette.primary
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
                  >
                    {w.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {withdrawalDays > 0 ? (
            <View
              style={[
                styles.warningBanner,
                {
                  backgroundColor: palette.danger + '15',
                  borderColor: palette.danger + '55',
                },
              ]}
            >
              <Text style={styles.warningEmoji}>🚫</Text>
              <Text
                style={[styles.warningText, { color: palette.danger }]}
              >
                Animal is on withdrawal until{' '}
                {formatMedium(
                  toISODate(addDays(new Date(eventDate), withdrawalDays))
                )}
              </Text>
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

          {/* Administered by */}
          <SectionLabel
            palette={palette}
            text="ADMINISTERED BY · OPTIONAL"
          />
          <TextInput
            value={administeredBy}
            onChangeText={(t) => setAdministeredBy(t.slice(0, 40))}
            placeholder="e.g., Self, Dr. Kamau"
            placeholderTextColor={palette.textMuted}
            style={inputStyle(palette)}
            maxLength={40}
          />

          {/* Cost */}
          <SectionLabel palette={palette} text="COST · OPTIONAL" />
          <TextInput
            value={costText}
            onChangeText={(t) => setCostText(t.slice(0, 12))}
            placeholder="0"
            placeholderTextColor={palette.textMuted}
            style={inputStyle(palette)}
            keyboardType="decimal-pad"
            maxLength={12}
          />

          {/* Note */}
          <SectionLabel palette={palette} text="NOTES · OPTIONAL" />
          <TextInput
            value={note}
            onChangeText={(t) => setNote(t.slice(0, 200))}
            placeholder="Any details worth remembering"
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
              Save event
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
  sheepCardLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  sheepCardSub: {
    fontSize: 11,
    marginTop: 2,
  },

  selectedSheep: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  selectedSheepEmoji: { fontSize: 24 },

  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  warningEmoji: { fontSize: 16 },
  warningText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13,
    flex: 1,
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