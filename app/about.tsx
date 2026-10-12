// app/about.tsx
// About / Hire Me — Lumo Labs contact and social links.

import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ABOUT_BLURB, CONTACT } from '../src/config/contact';
import type { Palette } from '../src/theme';
import { fonts, radius, spacing, type, useTheme } from '../src/theme';

// ─── Link helpers ──────────────────────────────────────────

async function open(url: string, label: string) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('Cannot open', `Could not open ${label}.`);
      return;
    }
    await Linking.openURL(url);
  } catch (e) {
    Alert.alert('Cannot open', String(e));
  }
}

const mailto = (email: string) =>
  `mailto:${email}?subject=${encodeURIComponent('My Sheep Manager — inquiry')}`;

// ─── Screen ────────────────────────────────────────────────

export default function About() {
  const router = useRouter();
  const { palette } = useTheme();

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
        <Text style={[type.title, { color: palette.text }]}>About</Text>
        <View style={styles.topBarBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View
            style={[
              styles.logoBadge,
              { backgroundColor: palette.primary + '18' },
            ]}
          >
            <Text style={styles.logoEmoji}>🐑</Text>
          </View>
          <Text
            style={[
              type.h2,
              { color: palette.text, marginTop: spacing.md },
            ]}
          >
            My Sheep Manager
          </Text>
          <Text
            style={[
              type.caption,
              { color: palette.textMuted, marginTop: 4 },
            ]}
          >
            v{CONTACT.version} · by {CONTACT.company}
          </Text>
        </View>

        {/* Blurb */}
        <Text
          style={[
            type.body,
            {
              color: palette.textMuted,
              textAlign: 'center',
              lineHeight: 22,
            },
          ]}
        >
          {ABOUT_BLURB}
        </Text>

        {/* Hire me banner */}
        <View
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
            Need a mobile app for your farm, business, or idea?
          </Text>
          <Text
            style={[
              type.caption,
              { color: '#C6DBCB', marginTop: spacing.sm, lineHeight: 18 },
            ]}
          >
            I build production React Native apps end-to-end — design, code,
            ship. Let's talk.
          </Text>

          <Pressable
            onPress={() => open(CONTACT.whatsappUrl, 'WhatsApp')}
            style={[styles.hireBtn, { backgroundColor: '#FFFFFF' }]}
          >
            <Text style={[styles.hireBtnText, { color: palette.primary }]}>
              💬  Message on WhatsApp
            </Text>
          </Pressable>

          <Pressable
            onPress={() => open(mailto(CONTACT.businessEmail), 'Email')}
            style={[
              styles.hireBtnOutline,
              { borderColor: 'rgba(255,255,255,0.35)' },
            ]}
          >
            <Text style={[styles.hireBtnText, { color: '#FFFFFF' }]}>
              ✉️  Email Lumo Labs
            </Text>
          </Pressable>
        </View>

        {/* Contact */}
        <SectionLabel palette={palette} text="CONTACT" />
        <Group palette={palette}>
          <Row
            palette={palette}
            emoji="💬"
            title="WhatsApp"
            subtitle={`+${CONTACT.whatsapp}`}
            onPress={() => open(CONTACT.whatsappUrl, 'WhatsApp')}
          />
          <Divider palette={palette} />
          <Row
            palette={palette}
            emoji="💼"
            title="Business email"
            subtitle={CONTACT.businessEmail}
            onPress={() => open(mailto(CONTACT.businessEmail), 'Email')}
          />
          <Divider palette={palette} />
          <Row
            palette={palette}
            emoji="✉️"
            title="Personal email"
            subtitle={CONTACT.personalEmail}
            onPress={() => open(mailto(CONTACT.personalEmail), 'Email')}
          />
        </Group>

        {/* Follow */}
        <SectionLabel palette={palette} text="FOLLOW" />
        <Group palette={palette}>
          <Row
            palette={palette}
            emoji="📢"
            title="WhatsApp Channel"
            subtitle="Updates on new Lumo Labs apps"
            onPress={() =>
              open(CONTACT.whatsappChannelUrl, 'WhatsApp Channel')
            }
          />
          <Divider palette={palette} />
          <Row
            palette={palette}
            emoji="🐙"
            title="GitHub"
            subtitle="See all my projects"
            onPress={() => open(CONTACT.github, 'GitHub')}
          />
          <Divider palette={palette} />
          <Row
            palette={palette}
            emoji="📱"
            title="Expo"
            subtitle="@frankkips"
            onPress={() => open(CONTACT.expo, 'Expo')}
          />
        </Group>

        {/* Support */}
        <SectionLabel palette={palette} text="SUPPORT THE WORK" />
        <Group palette={palette}>
          <Row
            palette={palette}
            emoji="💰"
            title="PayPal"
            subtitle={CONTACT.paypal}
            onPress={() => open(mailto(CONTACT.paypal), 'PayPal')}
          />
        </Group>

        {/* Footer */}
        <Text
          style={[
            type.caption,
            {
              color: palette.textMuted,
              textAlign: 'center',
              marginTop: spacing.xxl,
            },
          ]}
        >
          Made with ❤️ in Kenya
        </Text>
        <Text
          style={[
            type.caption,
            {
              color: palette.textMuted,
              textAlign: 'center',
              marginTop: 4,
            },
          ]}
        >
          © {new Date().getFullYear()} {CONTACT.company}
        </Text>
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

  hero: {
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  logoBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 40 },

  hireBanner: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginTop: spacing.xl,
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  hireLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 2,
  },
  hireTitle: {
    fontFamily: fonts.serifSemiBold,
    fontSize: 20,
    lineHeight: 26,
    marginTop: spacing.sm,
  },
  hireBtn: {
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  hireBtnOutline: {
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  hireBtnText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14.5,
    letterSpacing: 0.3,
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
});