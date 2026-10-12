// app/sheep/add.tsx
// Add a sheep — full form with breed presets, sex picker, photo, sire/dam.

import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    Alert,
    Image,
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
import type { SheepSex } from '../../src/types';
import { addDays, formatMedium, todayISO, toISODate } from '../../src/utils/date';
import { sexLabel } from '../../src/utils/sheep';

// ─── Presets ───────────────────────────────────────────────

const BREED_PRESETS = [
  'Dorper',
  'Merino',
  'Suffolk',
  'Romney',
  'Katahdin',
  'Sahiwal',
  'Red Maasai',
  'Blackhead Persian',
  'Local / Indigenous',
  'Mixed / Cross',
];

const SEX_OPTIONS: SheepSex[] = ['ram', 'ewe', 'wether', 'lamb'];

const DOB_PRESETS = [
  { label: 'Today', offset: 0 },
  { label: '1 week ago', offset: -7 },
  { label: '1 month ago', offset: -30 },
  { label: '6 months ago', offset: -183 },
  { label: '1 year ago', offset: -365 },
  { label: '2 years ago', offset: -730 },
] as const;

// ─── Screen ────────────────────────────────────────────────

export default function AddSheep() {
  const router = useRouter();
  const { palette } = useTheme();
  const { addSheep, activeSheep } = useSheep();

  // Form state
  const [tag, setTag] = useState('');
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [sex, setSex] = useState<SheepSex>('ewe');
  const [dob, setDob] = useState<string>(() => todayISO());
  const [dobCustom, setDobCustom] = useState(false);
  const [group, setGroup] = useState('');
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [sireId, setSireId] = useState<string | undefined>(undefined);
  const [damId, setDamId] = useState<string | undefined>(undefined);
  const [purchaseSource, setPurchaseSource] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Sires and dams available for pedigree
  const possibleSires = useMemo(
    () => activeSheep.filter((s) => s.sex === 'ram'),
    [activeSheep]
  );
  const possibleDams = useMemo(
    () => activeSheep.filter((s) => s.sex === 'ewe'),
    [activeSheep]
  );

  const canSave = tag.trim().length > 0 && breed.trim().length > 0 && !saving;

  // ─── Photo ─────────────────────────────────────────────
  const pickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission needed',
          'Photo library access is required to add a picture.'
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Could not pick photo', String(e));
    }
  };

  const takePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission needed',
          'Camera access is required to take a photo.'
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Could not open camera', String(e));
    }
  };

  const choosePhoto = () => {
    Alert.alert('Add photo', 'Choose how to add a photo of this sheep.', [
      { text: 'Take photo', onPress: takePhoto },
      { text: 'Choose from library', onPress: pickPhoto },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ─── Save ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!canSave) return;
    // Duplicate tag check
    const dupTag = activeSheep.some(
      (s) => s.tag.trim().toLowerCase() === tag.trim().toLowerCase()
    );
    if (dupTag) {
      Alert.alert(
        'Tag already in use',
        `Another active animal has the tag "${tag.trim()}". Tags must be unique.`
      );
      return;
    }

    setSaving(true);
    try {
      await addSheep({
        tag: tag.trim(),
        name: name.trim() || undefined,
        breed: breed.trim(),
        sex,
        dob,
        sireId,
        damId,
        group: group.trim() || undefined,
        photoUri,
        purchaseSource: purchaseSource.trim() || undefined,
        notes: notes.trim() || undefined,
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
          <Text style={[type.title, { color: palette.text }]}>New Sheep</Text>
          <View style={styles.topBarBtn} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 200 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Photo */}
          <Pressable
            onPress={choosePhoto}
            style={[
              styles.photoWrap,
              {
                backgroundColor: palette.surfaceAlt,
                borderColor: palette.border,
              },
            ]}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <>
                <Text style={styles.photoEmoji}>📷</Text>
                <Text
                  style={[
                    type.caption,
                    { color: palette.textMuted, marginTop: spacing.xs },
                  ]}
                >
                  Add photo
                </Text>
              </>
            )}
          </Pressable>

          {/* Tag */}
          <SectionLabel palette={palette} text="TAG NUMBER · REQUIRED" />
          <TextInput
            value={tag}
            onChangeText={(t) => setTag(t.slice(0, 20))}
            placeholder="e.g., A042"
            placeholderTextColor={palette.textMuted}
            style={inputStyle(palette)}
            autoCapitalize="characters"
            maxLength={20}
          />

          {/* Name */}
          <SectionLabel palette={palette} text="NAME · OPTIONAL" />
          <TextInput
            value={name}
            onChangeText={(t) => setName(t.slice(0, 30))}
            placeholder="e.g., Bella"
            placeholderTextColor={palette.textMuted}
            style={inputStyle(palette)}
            maxLength={30}
          />

          {/* Breed */}
          <SectionLabel palette={palette} text="BREED · REQUIRED" />
          <TextInput
            value={breed}
            onChangeText={(t) => setBreed(t.slice(0, 40))}
            placeholder="Type or pick below"
            placeholderTextColor={palette.textMuted}
            style={inputStyle(palette)}
            maxLength={40}
          />
          <View style={styles.chipsWrap}>
            {BREED_PRESETS.map((b) => {
              const active = b === breed;
              return (
                <Pressable
                  key={b}
                  onPress={() => setBreed(b)}
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
                    {b}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Sex */}
          <SectionLabel palette={palette} text="SEX · REQUIRED" />
          <View style={styles.segment}>
            {SEX_OPTIONS.map((s) => {
              const active = s === sex;
              return (
                <Pressable
                  key={s}
                  onPress={() => setSex(s)}
                  style={[
                    styles.segmentItem,
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
                      styles.segmentLabel,
                      {
                        color: active ? '#FFFFFF' : palette.textMuted,
                        fontFamily: active
                          ? fonts.sansSemiBold
                          : fonts.sansMedium,
                      },
                    ]}
                  >
                    {sexLabel(s)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* DOB */}
          <SectionLabel palette={palette} text="DATE OF BIRTH" />
          <View style={styles.chipsWrap}>
            {DOB_PRESETS.map((preset) => {
              const presetISO = toISODate(
                addDays(new Date(), preset.offset)
              );
              const active = !dobCustom && dob === presetISO;
              return (
                <Pressable
                  key={preset.label}
                  onPress={() => {
                    setDob(presetISO);
                    setDobCustom(false);
                  }}
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
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => setDobCustom(true)}
            style={[
              styles.customDateRow,
              {
                backgroundColor: dobCustom
                  ? palette.primary + '20'
                  : palette.surface,
                borderColor: dobCustom ? palette.primary : palette.border,
              },
            ]}
          >
            <Text style={[type.caption, { color: palette.textMuted }]}>
              {dobCustom ? 'CUSTOM DATE' : 'Set custom date'}
            </Text>
          </Pressable>

          {dobCustom ? (
            <TextInput
              value={dob}
              onChangeText={setDob}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={palette.textMuted}
              style={[inputStyle(palette), { marginTop: spacing.sm }]}
              autoCapitalize="none"
              keyboardType={
                Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'
              }
              maxLength={10}
            />
          ) : null}

          <Text
            style={[
              type.caption,
              { color: palette.textMuted, marginTop: spacing.sm },
            ]}
          >
            {formatMedium(dob)}
          </Text>

          {/* Group */}
          <SectionLabel palette={palette} text="GROUP / MOB · OPTIONAL" />
          <TextInput
            value={group}
            onChangeText={(t) => setGroup(t.slice(0, 30))}
            placeholder="e.g., Ewe mob A"
            placeholderTextColor={palette.textMuted}
            style={inputStyle(palette)}
            maxLength={30}
          />

          {/* Pedigree — only if we have possible parents */}
          {possibleSires.length > 0 || possibleDams.length > 0 ? (
            <>
              <SectionLabel palette={palette} text="PEDIGREE · OPTIONAL" />
              {possibleSires.length > 0 ? (
                <ParentPicker
                  label="Sire (father)"
                  palette={palette}
                  options={possibleSires.map((s) => ({
                    id: s.id,
                    label: `#${s.tag}${s.name ? ` · ${s.name}` : ''}`,
                  }))}
                  selectedId={sireId}
                  onSelect={setSireId}
                />
              ) : null}
              {possibleDams.length > 0 ? (
                <ParentPicker
                  label="Dam (mother)"
                  palette={palette}
                  options={possibleDams.map((s) => ({
                    id: s.id,
                    label: `#${s.tag}${s.name ? ` · ${s.name}` : ''}`,
                  }))}
                  selectedId={damId}
                  onSelect={setDamId}
                />
              ) : null}
            </>
          ) : null}

          {/* Purchase source */}
          <SectionLabel palette={palette} text="PURCHASED FROM · OPTIONAL" />
          <TextInput
            value={purchaseSource}
            onChangeText={(t) => setPurchaseSource(t.slice(0, 60))}
            placeholder="e.g., Njoro Market"
            placeholderTextColor={palette.textMuted}
            style={inputStyle(palette)}
            maxLength={60}
          />

          {/* Notes */}
          <SectionLabel palette={palette} text="NOTES · OPTIONAL" />
          <TextInput
            value={notes}
            onChangeText={(t) => setNotes(t.slice(0, 200))}
            placeholder="Anything worth remembering"
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
              Add to flock
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

function ParentPicker({
  label,
  palette,
  options,
  selectedId,
  onSelect,
}: {
  label: string;
  palette: Palette;
  options: { id: string; label: string }[];
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
}) {
  return (
    <View style={{ marginTop: spacing.sm }}>
      <Text style={[type.caption, { color: palette.textMuted }]}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.hScroll}
      >
        <Pressable
          onPress={() => onSelect(undefined)}
          style={[
            styles.chip,
            {
              backgroundColor: !selectedId
                ? palette.primary + '20'
                : palette.surface,
              borderColor: !selectedId ? palette.primary : palette.border,
            },
          ]}
        >
          <Text
            style={[
              styles.chipLabel,
              {
                color: !selectedId ? palette.text : palette.textMuted,
                fontFamily: !selectedId
                  ? fonts.sansSemiBold
                  : fonts.sansMedium,
              },
            ]}
          >
            None
          </Text>
        </Pressable>
        {options.map((o) => {
          const active = o.id === selectedId;
          return (
            <Pressable
              key={o.id}
              onPress={() => onSelect(o.id)}
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
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
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

  photoWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  photo: { width: '100%', height: '100%' },
  photoEmoji: { fontSize: 32 },

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

  segment: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  segmentLabel: { fontSize: 13.5 },

  customDateRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.sm,
    alignItems: 'center',
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