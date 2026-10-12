// app/(tabs)/more.tsx
// More tab — hub for tasks, settings, and about.

import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CONTACT, FOOTER_LINE } from '../../src/config/contact';
import { useSheep } from '../../src/context/SheepContext';
import type { Palette } from '../../src/theme';
import { fonts, radius, spacing, type, useTheme } from '../../src/theme';

export default function More() {
  const { palette } = useTheme();
  const router = useRouter();
  const {
    tasks,
    breedingEvents,
    upcomingLambings,
    dueTasks,
  } = useSheep();

  const openTasks = tasks.filter((t) => !t.completed).length;
  const upcoming = upcomingLambings(60).length;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.brand, { color: palette.textMuted }]}>
            MORE
          </Text>
          <Text style={[type.h2, { color: palette.text, marginTop: spacing.xs }]}>
            Manage
          </Text>
        </View>

        <SectionLabel palette={palette} text="FARM" />
        <Group palette={palette}>
          <Row
            palette={palette}
            emoji="✅"
            title="Tasks"
            subtitle={
              openTasks === 0
                ? 'No open tasks'
                : `${openTasks} open · ${dueTasks.length} due`
            }
            onPress={() => router.push('/tasks')}
          />
          <Divider palette={palette} />
          <Row
            palette={palette}
            emoji="🐣"
            title="Upcoming lambings"
            subtitle={
              upcoming === 0
                ? 'None in the next 60 days'
                : `${upcoming} within 60 days`
            }
            onPress={() => {
              // Not built yet
            }}
          />
        </Group>

        <SectionLabel palette={palette} text="ORGANIZE" />
        <Group palette={palette}>
          <Row
            palette={palette}
            emoji="🏷️"
            title="Money categories"
            subtitle="Manage income and expense categories"
            onPress={() => router.push('/categories')}
          />
        </Group>

        <SectionLabel palette={palette} text="APP" />
        <Group palette={palette}>
          <Row
            palette={palette}
            emoji="⚙️"
            title="Settings"
            subtitle="Currency, weight units, PIN, appearance"
            onPress={() => router.push('/settings')}
          />
          <Divider palette={palette} />
          <Row
            palette={palette}
            emoji="💼"
            title="About & Hire Me"
            subtitle={`By ${CONTACT.company} · contact & follow`}
            onPress={() => router.push('/about')}
          />
        </Group>

        {/* Hire banner */}
        <Pressable
          onPress={() => router.push('/about')}
          style={[
            styles.hireBanner,
            {
              backgroundColor: palette.primary,
              shadowColor: palette.primaryDark,
            },
          ]}
        >
          <Text style={[styles.hireLabel, { color: '#C6DBCB' }]}>
            HIRE THE DEVELOPER
          </Text>
          <Text style={[styles.hireTitle, { color: palette.onPrimary }]}>
            Need a custom farm or business app?
          </Text>
          <Text
            style={[
              type.caption,
              { color: '#C6DBCB', marginTop: spacing.xs, lineHeight: 18 },
            ]}
          >
            Lumo Labs builds offline-first mobile apps for farms, shops, and
            small businesses.
          </Text>
          <Text
            style={[
              styles.hireCta,
              { color: palette.onPrimary },
            ]}
          >
            Get in touch →
          </Text>
        </Pressable>

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
              Follow Lumo Labs →
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────

function SectionLabel({ palette, text }: { palette: Palette; text: string }) {
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
}: {
  palette: Palette;
  emoji: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
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
        <Text style={[type.bodyStrong, { color: palette.text }]}>{title}</Text>
        {subtitle ? (
          <Text
            style={[type.caption, { color: palette.textMuted, marginTop: 2 }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.chev, { color: palette.textMuted }]}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },

  header: { marginBottom: spacing.md },
  brand: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 3,
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
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.xl + spacing.md,
  },

  hireBanner: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  hireLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10.5,
    letterSpacing: 2,
  },
  hireTitle: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 18,
    lineHeight: 24,
    marginTop: 6,
  },
  hireCta: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 13.5,
    marginTop: spacing.md,
    letterSpacing: 0.3,
  },

  footer: { marginTop: spacing.xl },
});