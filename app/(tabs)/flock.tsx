// app/(tabs)/flock.tsx
// Flock — all sheep, with search + sex filter + group filter.

import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    FlatList,
    Image,
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
import type { Sheep, SheepSex } from '../../src/types';
import { ageFromDob, sexLabel, sheepDisplayName } from '../../src/utils/sheep';

type SexFilter = 'all' | SheepSex;

const SEX_FILTERS: { label: string; value: SexFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Rams', value: 'ram' },
  { label: 'Ewes', value: 'ewe' },
  { label: 'Wethers', value: 'wether' },
  { label: 'Lambs', value: 'lamb' },
];

export default function Flock() {
  const { palette } = useTheme();
  const router = useRouter();
  const {
    ready,
    activeSheep,
    flockGroups,
    sheepOnWithdrawal,
    getSheep,
  } = useSheep();

  const [query, setQuery] = useState('');
  const [sexFilter, setSexFilter] = useState<SexFilter>('all');
  const [groupFilter, setGroupFilter] = useState<string | null>(null);

  // Set of sheep IDs currently on withdrawal (for the badge)
  const withdrawalIds = useMemo(
    () => new Set(sheepOnWithdrawal.map((s) => s.id)),
    [sheepOnWithdrawal]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activeSheep
      .filter((s) => {
        if (sexFilter !== 'all' && s.sex !== sexFilter) return false;
        if (groupFilter && s.group !== groupFilter) return false;
        if (!q) return true;
        return [s.tag, s.name, s.breed, s.group]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        // Sort by tag alphanumerically
        return a.tag.localeCompare(b.tag, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      });
  }, [activeSheep, query, sexFilter, groupFilter]);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.brand, { color: palette.textMuted }]}>
          FLOCK
        </Text>
        <Text style={[type.h2, { color: palette.text, marginTop: spacing.xs }]}>
          {activeSheep.length}{' '}
          {activeSheep.length === 1 ? 'animal' : 'animals'}
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchWrap,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search tag, name, breed…"
            placeholderTextColor={palette.textMuted}
            style={[
              styles.searchInput,
              { color: palette.text, fontFamily: fonts.sansRegular },
            ]}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Text style={[styles.searchClear, { color: palette.textMuted }]}>
                ✕
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Sex filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScroll}
      >
        {SEX_FILTERS.map((f) => {
          const active = sexFilter === f.value;
          return (
            <Pressable
              key={f.value}
              onPress={() => setSexFilter(f.value)}
              style={[
                styles.chip,
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
                  styles.chipLabel,
                  {
                    color: active ? '#FFFFFF' : palette.textMuted,
                    fontFamily: active
                      ? fonts.sansSemiBold
                      : fonts.sansMedium,
                  },
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Group filter (only if there are groups) */}
      {flockGroups.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.chipScroll,
            { paddingTop: 0, marginTop: -spacing.xs },
          ]}
        >
          <Pressable
            onPress={() => setGroupFilter(null)}
            style={[
              styles.chipSmall,
              {
                backgroundColor:
                  groupFilter === null
                    ? palette.primary + '20'
                    : 'transparent',
                borderColor:
                  groupFilter === null ? palette.primary : palette.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipSmallLabel,
                {
                  color:
                    groupFilter === null ? palette.text : palette.textMuted,
                  fontFamily:
                    groupFilter === null
                      ? fonts.sansSemiBold
                      : fonts.sansMedium,
                },
              ]}
            >
              All groups
            </Text>
          </Pressable>
          {flockGroups.map((g) => {
            const active = groupFilter === g;
            return (
              <Pressable
                key={g}
                onPress={() => setGroupFilter(active ? null : g)}
                style={[
                  styles.chipSmall,
                  {
                    backgroundColor: active
                      ? palette.primary + '20'
                      : 'transparent',
                    borderColor: active ? palette.primary : palette.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipSmallLabel,
                    {
                      color: active ? palette.text : palette.textMuted,
                      fontFamily: active
                        ? fonts.sansSemiBold
                        : fonts.sansMedium,
                    },
                  ]}
                >
                  {g}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {/* List */}
      {!ready ? (
        <View style={styles.center}>
          <Text style={[type.body, { color: palette.textMuted }]}>
            Loading…
          </Text>
        </View>
      ) : activeSheep.length === 0 ? (
        <EmptyFlock palette={palette} onAdd={() => router.push('/sheep/add')} />
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={[type.bodyStrong, { color: palette.text }]}>
            No matches
          </Text>
          <Text
            style={[
              type.caption,
              { color: palette.textMuted, marginTop: spacing.xs },
            ]}
          >
            Try a different search or filter.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <SheepRow
              sheep={item}
              palette={palette}
              onWithdrawal={withdrawalIds.has(item.id)}
              onPress={() => router.push(`/sheep/${item.id}`)}
            />
          )}
        />
      )}

      {/* FAB */}
      <Pressable
        onPress={() => router.push('/sheep/add')}
        style={[
          styles.fab,
          {
            backgroundColor: palette.primary,
            shadowColor: palette.primaryDark,
          },
        ]}
        accessibilityLabel="Add sheep"
      >
        <Text style={styles.fabPlus}>＋</Text>
      </Pressable>
    </SafeAreaView>
  );
}

// ─── Row ───────────────────────────────────────────────────

function SheepRow({
  sheep,
  palette,
  onWithdrawal,
  onPress,
}: {
  sheep: Sheep;
  palette: Palette;
  onWithdrawal: boolean;
  onPress: () => void;
}) {
  const sexColor =
    sheep.sex === 'ram'
      ? palette.male
      : sheep.sex === 'ewe'
      ? palette.female
      : palette.textMuted;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? palette.surfaceAlt : palette.surface,
          borderColor: palette.border,
        },
      ]}
    >
      {/* Photo or avatar */}
      <View style={styles.rowLeft}>
        {sheep.photoUri ? (
          <Image source={{ uri: sheep.photoUri }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatarFallback,
              { backgroundColor: sexColor + '22' },
            ]}
          >
            <Text style={styles.avatarEmoji}>🐑</Text>
          </View>
        )}
        {onWithdrawal ? (
          <View
            style={[
              styles.withdrawalDot,
              { backgroundColor: palette.danger },
            ]}
          >
            <Text style={styles.withdrawalDotText}>!</Text>
          </View>
        ) : null}
      </View>

      {/* Middle */}
      <View style={styles.rowMid}>
        <View style={styles.rowTitleLine}>
          <Text
            style={[type.bodyStrong, { color: palette.text }]}
            numberOfLines={1}
          >
            {sheepDisplayName(sheep)}
          </Text>
          <View
            style={[
              styles.sexBadge,
              { backgroundColor: sexColor + '20' },
            ]}
          >
            <Text style={[styles.sexBadgeText, { color: sexColor }]}>
              {sexLabel(sheep.sex)}
            </Text>
          </View>
        </View>
        <Text
          style={[type.caption, { color: palette.textMuted, marginTop: 2 }]}
          numberOfLines={1}
        >
          #{sheep.tag} · {sheep.breed} · {ageFromDob(sheep.dob)}
        </Text>
        {sheep.group ? (
          <Text
            style={[type.caption, { color: palette.textMuted, marginTop: 1 }]}
            numberOfLines={1}
          >
            {sheep.group}
          </Text>
        ) : null}
      </View>

      {/* Chevron */}
      <Text style={[styles.chev, { color: palette.textMuted }]}>›</Text>
    </Pressable>
  );
}

// ─── Empty state ───────────────────────────────────────────

function EmptyFlock({
  palette,
  onAdd,
}: {
  palette: Palette;
  onAdd: () => void;
}) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyEmoji}>🐑</Text>
      <Text
        style={[
          type.h3,
          { color: palette.text, textAlign: 'center', marginTop: spacing.md },
        ]}
      >
        No sheep yet
      </Text>
      <Text
        style={[
          type.body,
          {
            color: palette.textMuted,
            textAlign: 'center',
            marginTop: spacing.sm,
            paddingHorizontal: spacing.xl,
          },
        ]}
      >
        Add your first animal to start tracking your flock.
      </Text>
      <Pressable
        onPress={onAdd}
        style={[
          styles.primaryBtn,
          { backgroundColor: palette.primary, marginTop: spacing.xl },
        ]}
      >
        <Text style={styles.primaryBtnText}>Add first sheep</Text>
      </Pressable>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  brand: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 3,
  },

  searchRow: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  searchIcon: { fontSize: 15 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  searchClear: {
    fontSize: 15,
    fontFamily: fonts.sansMedium,
    paddingHorizontal: 4,
  },

  chipScroll: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipLabel: { fontSize: 13 },

  chipSmall: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  chipSmallLabel: { fontSize: 12.5 },

  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 24 },
  withdrawalDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  withdrawalDotText: {
    color: '#FFFFFF',
    fontFamily: fonts.sansBold,
    fontSize: 11,
    lineHeight: 12,
  },

  rowMid: { flex: 1 },
  rowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sexBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  sexBadgeText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10.5,
    letterSpacing: 0.3,
  },

  chev: {
    fontFamily: fonts.sansRegular,
    fontSize: 22,
    lineHeight: 24,
    marginLeft: spacing.xs,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyEmoji: { fontSize: 48 },
  primaryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
  },

  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabPlus: {
    color: '#FFFFFF',
    fontSize: 30,
    lineHeight: 32,
    fontFamily: fonts.sansRegular,
    marginTop: -3,
  },
});