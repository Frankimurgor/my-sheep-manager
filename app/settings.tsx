// app/settings.tsx
// Settings — appearance, units, currency, farm, PIN, export, wipe, about.

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CONTACT, FOOTER_LINE } from '../src/config/contact';
import { useSheep } from '../src/context/SheepContext';
import type { Palette } from '../src/theme';
import { fonts, radius, spacing, type, useTheme } from '../src/theme';
import type { CurrencyCode, WeightUnit } from '../src/types';
import { exportFlockCsvAndShare } from '../src/utils/csv';

const CURRENCY_LABEL: Record<CurrencyCode, string> = {
  KES: 'Kenyan Shilling (KSh)',
  USD: 'US Dollar ($)',
  EUR: 'Euro (€)',
  GBP: 'British Pound (£)',
  NGN: 'Nigerian Naira (₦)',
  ZAR: 'South African Rand (R)',
  AUD: 'Australian Dollar (A$)',
  INR: 'Indian Rupee (₹)',
};

export default function Settings() {
  const { palette, preference, cyclePreference } = useTheme();
  const router = useRouter();
  const {
    settings,
    updateSettings,
    wipeAllData,
    sheep,
    healthEvents,
    weights,
    breedingEvents,
    lambingRecords,
    moneyRecords,
    moneyCategories,
    activeSheep,
  } = useSheep();

  const [exporting, setExporting] = useState(false);
  const [farmNameDraft, setFarmNameDraft] = useState(settings.farmName ?? '');

  const themeLabel =
    preference === 'system'
      ? 'Follow system'
      : preference === 'light'
      ? 'Light'
      : 'Dark';

  const handleTheme = () => cyclePreference();

  const handleCurrency = () => {
    const codes: CurrencyCode[] = [
      'KES', 'USD', 'EUR', 'GBP', 'NGN', 'ZAR', 'AUD', 'INR',
    ];
    Alert.alert('Currency', 'Which currency does your farm use?', [
      ...codes.map((c) => ({
        text: c === settings.currency ? `${c} ✓` : c,
        onPress: () => updateSettings({ currency: c }),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const handleWeightUnit = () => {
    const units: WeightUnit[] = ['kg', 'lb'];
    Alert.alert('Weight unit', 'Which weight unit do you use?', [
      ...units.map((u) => ({
        text: u === settings.weightUnit ? `${u} ✓` : u,
        onPress: () => updateSettings({ weightUnit: u }),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const handlePin = () => {
    if (settings.pinHash) {
      Alert.alert('PIN lock', 'PIN is currently enabled.', [
        {
          text: 'Change PIN',
          onPress: () => router.push('/lock?mode=change'),
        },
        {
          text: 'Remove PIN',
          style: 'destructive',
          onPress: () => router.push('/lock?mode=remove'),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      router.push('/lock?mode=set');
    }
  };

  const handleExport = async () => {
    if (sheep.length === 0) {
      Alert.alert('Nothing to export', 'Add at least one sheep first.');
      return;
    }
    if (exporting) return;
    setExporting(true);
    try {
      await exportFlockCsvAndShare(
        sheep,
        healthEvents,
        weights,
        breedingEvents,
        lambingRecords,
        moneyRecords,
        moneyCategories
      );
    } catch (e) {
      Alert.alert('Export failed', String(e));
    } finally {
      setExporting(false);
    }
  };

  const handleSaveFarmName = async () => {
    await updateSettings({ farmName: farmNameDraft.trim() || undefined });
    Alert.alert('Saved', 'Farm name updated.');
  };

  const handleWipe = () => {
    Alert.alert(
      'Erase all data?',
      `This will permanently delete ${sheep.length} sheep, all health records, weights, breeding, lambing, money, and tasks. Cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Erase everything',
          style: 'destructive',
          onPress: async () => {
            await wipeAllData();
            Alert.alert('Done', 'All data erased.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
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
        <Text style={[type.title, { color: palette.text }]}>Settings</Text>
        <View style={styles.topBarBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel palette={palette} text="APPEARANCE" />
        <Group palette={palette}>
          <Row
            palette={palette}
            emoji="🌓"
            title="Theme"
            subtitle={themeLabel}
            onPress={handleTheme}
          />
        </Group>

        <SectionLabel palette={palette} text="FARM" />
        <Group palette={palette}>
          <View style={styles.row}>
            <Text style={styles.rowEmoji}>🏡</Text>
            <View style={{ flex: 1 }}>
              <Text style={[type.bodyStrong, { color: palette.text }]}>
                Farm name
              </Text>
              <TextInput
                value={farmNameDraft}
                onChangeText={(t) => setFarmNameDraft(t.slice(0, 40))}
                placeholder="e.g., Kimurgor Farm"
                placeholderTextColor={palette.textMuted}
                style={[
                  styles.inlineInput,
                  {
                    backgroundColor: palette.surfaceAlt,
                    borderColor: palette.border,
                    color: palette.text,
                    fontFamily: fonts.sansRegular,
                  },
                ]}
                maxLength={40}
                returnKeyType="done"
                onSubmitEditing={handleSaveFarmName}
              />
            </View>
            <Pressable
              onPress={handleSaveFarmName}
              hitSlop={8}
              style={styles.saveInline}
            >
              <Text style={[styles.iconText, { color: palette.primary }]}>
                Save
              </Text>
            </Pressable>
          </View>
          <Divider palette={palette} />
          <Row
            palette={palette}
            emoji="⚖️"
            title="Weight unit"
            subtitle={settings.weightUnit.toUpperCase()}
            onPress={handleWeightUnit}
          />
        </Group>

        <SectionLabel palette={palette} text="MONEY" />
        <Group palette={palette}>
          <Row
            palette={palette}
            emoji="💱"
            title="Currency"
            subtitle={CURRENCY_LABEL[settings.currency]}
            onPress={handleCurrency}
          />
          <Divider palette={palette} />
          <Row
            palette={palette}
            emoji="🏷️"
            title="Money categories"
            subtitle={`${moneyCategories.length} total`}
            onPress={() => router.push('/categories')}
          />
        </Group>

        <SectionLabel palette={palette} text="DATA" />
        <Group palette={palette}>
          <Row
            palette={palette}
            emoji="📤"
            title={exporting ? 'Exporting…' : 'Export CSV'}
            subtitle={`${sheep.length} sheep · ${activeSheep.length} active · all records`}
            onPress={handleExport}
          />
          <Divider palette={palette} />
          <Row
            palette={palette}
            emoji="🔐"
            title="PIN lock"
            subtitle={
              settings.pinHash
                ? 'Enabled — tap to change or remove'
                : 'Disabled — tap to set up'
            }
            onPress={handlePin}
          />
        </Group>

        <SectionLabel palette={palette} text="ABOUT" />
        <Group palette={palette}>
          <Row
            palette={palette}
            emoji="💼"
            title="About & Hire Me"
            subtitle={`By ${CONTACT.company} · contact & follow`}
            onPress={() => router.push('/about')}
          />
          <Divider palette={palette} />
          <Row
            palette={palette}
            emoji="📢"
            title="Follow on WhatsApp"
            subtitle="Updates on new Lumo Labs apps"
            onPress={() => router.push('/about')}
          />
        </Group>

        <SectionLabel palette={palette} text="DANGER ZONE" />
        <Group palette={palette}>
          <Row
            palette={palette}
            emoji="🗑️"
            title="Erase all data"
            subtitle="Every sheep, record, and setting"
            onPress={handleWipe}
            danger
          />
        </Group>

        {/* Footer */}
        <View style={styles.footer}>
          <Text
            style={[
              type.caption,
              { color: palette.textMuted, textAlign: 'center' },
            ]}
          >
            {FOOTER_LINE}
          </Text>
          <Pressable onPress={() => router.push('/about')} hitSlop={8}>
            <Text
              style={[
                type.caption,
                {
                  color: palette.primary,
                  textAlign: 'center',
                  marginTop: 4,
                },
              ]}
            >
              Hire the developer →
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ palette, text }: { palette: Palette; text: string }) {
  return (
    <Text
      style={[
        styles.sectionLabel,
        { color: palette.textMuted, marginTop: spacing.xl },
      ]}
    >
      {text}
    </Text>
  );
}

function Group({
  children,
  palette,
}: {
  children: React.ReactNode;
  palette: Palette;
}) {
  return (
    <View
      style={[
        styles.group,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      {children}
    </View>
  );
}

function Divider({ palette }: { palette: Palette }) {
  return (
    <View style={[styles.divider, { backgroundColor: palette.divider }]} />
  );
}

function Row({
  palette,
  emoji,
  title,
  subtitle,
  onPress,
  danger,
}: {
  palette: Palette;
  emoji: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: palette.surfaceAlt },
      ]}
    >
      <Text style={styles.rowEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            type.bodyStrong,
            { color: danger ? palette.danger : palette.text },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[type.caption, { color: palette.textMuted, marginTop: 2 }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text
        style={[
          styles.chev,
          { color: danger ? palette.danger : palette.textMuted },
        ]}
      >
        ›
      </Text>
    </Pressable>
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

  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  sectionLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },

  group: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  rowEmoji: { fontSize: 20 },
  chev: { fontFamily: fonts.sansRegular, fontSize: 22, lineHeight: 24 },
  iconText: { fontFamily: fonts.sansSemiBold, fontSize: 13 },
  saveInline: { paddingHorizontal: spacing.sm },
  inlineInput: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    marginTop: 6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.xl + spacing.md,
  },

  footer: { marginTop: spacing.xl },
});