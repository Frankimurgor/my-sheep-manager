// app/sheep/[id].tsx
// Sheep profile — photo, identity, quick actions, tabbed sections:
// Overview · Health · Weights · Breeding · Offspring · Money.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSheep } from '../../src/context/SheepContext';
import type { Palette } from '../../src/theme';
import { fonts, radius, spacing, type, useTheme } from '../../src/theme';
import type {
    BreedingEvent,
    HealthEvent,
    LambingRecord,
    MoneyRecord,
    Sheep,
    WeightRecord,
} from '../../src/types';
import {
    formatMedium,
    formatRelativeDay,
    formatShort,
} from '../../src/utils/date';
import { money, symbolFor } from '../../src/utils/money';
import {
    ageFromDob,
    daysUntilWithdrawalClears,
    formatWeight,
    sexLabel,
    sheepDisplayName,
    withdrawalEndDate,
} from '../../src/utils/sheep';

type TabKey =
  | 'overview'
  | 'health'
  | 'weights'
  | 'breeding'
  | 'offspring'
  | 'money';

const TABS: { key: TabKey; label: string; emoji: string }[] = [
  { key: 'overview', label: 'Overview', emoji: '📌' },
  { key: 'health', label: 'Health', emoji: '🩺' },
  { key: 'weights', label: 'Weights', emoji: '⚖️' },
  { key: 'breeding', label: 'Breeding', emoji: '💞' },
  { key: 'offspring', label: 'Offspring', emoji: '🐣' },
  { key: 'money', label: 'Money', emoji: '💰' },
];

// ─────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────

export default function SheepProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { palette } = useTheme();
  const {
    getSheep,
    updateSheep,
    deleteSheep,
    healthForSheep,
    weightsForSheep,
    weightSeriesForSheep,
    breedingForDam,
    lambingsForDam,
    moneyRecords,
    moneyCategories,
    settings,
  } = useSheep();

  const [tab, setTab] = useState<TabKey>('overview');

  const sheep = useMemo(() => (id ? getSheep(id) : undefined), [id, getSheep]);

  const events = useMemo(
    () => (sheep ? healthForSheep(sheep.id) : []),
    [sheep, healthForSheep]
  );
  const weights = useMemo(
    () => (sheep ? weightsForSheep(sheep.id) : []),
    [sheep, weightsForSheep]
  );
  const weightSeries = useMemo(
    () => (sheep ? weightSeriesForSheep(sheep.id) : []),
    [sheep, weightSeriesForSheep]
  );
  const breedings = useMemo(
    () => (sheep ? breedingForDam(sheep.id) : []),
    [sheep, breedingForDam]
  );
  const lambings = useMemo(
    () => (sheep ? lambingsForDam(sheep.id) : []),
    [sheep, lambingsForDam]
  );
  const moneyForSheep = useMemo(
    () =>
      sheep
        ? moneyRecords
            .filter((m) => m.sheepId === sheep.id)
            .sort((a, b) => (a.date < b.date ? 1 : -1))
        : [],
    [sheep, moneyRecords]
  );

  if (!sheep) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        <View style={styles.notFound}>
          <Text style={[type.h3, { color: palette.text }]}>
            Sheep not found
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{ marginTop: spacing.lg }}
          >
            <Text style={[type.body, { color: palette.primary }]}>
              Go back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const currencySymbol = symbolFor(settings.currency);
  const onWithdrawal = daysUntilWithdrawalClears(events) > 0;
  const sexColor =
    sheep.sex === 'ram'
      ? palette.male
      : sheep.sex === 'ewe'
      ? palette.female
      : palette.textMuted;

  // ─── Actions ─────────────────────────────────────────────
  const handleEdit = () => {
    router.push(`/sheep/add?id=${sheep.id}`);
  };

  const handleMarkSold = () => {
    Alert.alert('Mark as sold', 'This will set the animal as no longer active.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark sold',
        onPress: async () => {
          await updateSheep(sheep.id, {
            status: 'sold',
            exitDate: new Date().toISOString().slice(0, 10),
          });
        },
      },
    ]);
  };

  const handleMarkDead = () => {
    Alert.alert(
      'Mark as deceased',
      'This will remove the animal from your active flock.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark deceased',
          style: 'destructive',
          onPress: async () => {
            await updateSheep(sheep.id, {
              status: 'dead',
              exitDate: new Date().toISOString().slice(0, 10),
            });
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete permanently?',
      'This will remove the sheep and all related records (health, weights, breeding). Cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSheep(sheep.id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.topBarBtn}
        >
          <Text style={[styles.topBarBtnText, { color: palette.textMuted }]}>
            Back
          </Text>
        </Pressable>
        <Pressable onPress={handleEdit} hitSlop={12} style={styles.topBarBtn}>
          <Text
            style={[
              styles.topBarBtnText,
              { color: palette.primary, textAlign: 'right' },
            ]}
          >
            Edit
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Identity header */}
        <View style={styles.hero}>
          {sheep.photoUri ? (
            <Image source={{ uri: sheep.photoUri }} style={styles.heroPhoto} />
          ) : (
            <View
              style={[
                styles.heroPhotoFallback,
                { backgroundColor: sexColor + '22' },
              ]}
            >
              <Text style={styles.heroEmoji}>🐑</Text>
            </View>
          )}

          <Text style={[type.h2, { color: palette.text, marginTop: spacing.md }]}>
            {sheepDisplayName(sheep)}
          </Text>

          <View style={styles.heroBadges}>
            <View
              style={[styles.heroBadge, { backgroundColor: sexColor + '20' }]}
            >
              <Text style={[styles.heroBadgeText, { color: sexColor }]}>
                {sexLabel(sheep.sex)}
              </Text>
            </View>
            <View
              style={[
                styles.heroBadge,
                { backgroundColor: palette.primary + '20' },
              ]}
            >
              <Text style={[styles.heroBadgeText, { color: palette.primary }]}>
                #{sheep.tag}
              </Text>
            </View>
            {onWithdrawal ? (
              <View
                style={[
                  styles.heroBadge,
                  { backgroundColor: palette.danger + '20' },
                ]}
              >
                <Text
                  style={[styles.heroBadgeText, { color: palette.danger }]}
                >
                  🚫 Withdrawal
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            style={[
              type.caption,
              { color: palette.textMuted, marginTop: spacing.sm },
            ]}
          >
            {sheep.breed} · {ageFromDob(sheep.dob)}
          </Text>
        </View>

        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <ActionButton
            palette={palette}
            emoji="🩺"
            label="Health"
            onPress={() => router.push(`/health/add?sheepId=${sheep.id}`)}
          />
          <ActionButton
            palette={palette}
            emoji="⚖️"
            label="Weight"
            onPress={() => router.push(`/weight/add?sheepId=${sheep.id}`)}
          />
          <ActionButton
            palette={palette}
            emoji="💞"
            label="Breed"
            onPress={() => router.push(`/breeding/add?damId=${sheep.id}`)}
          />
          <ActionButton
            palette={palette}
            emoji="🐣"
            label="Lamb"
            onPress={() => router.push(`/lambing/add?damId=${sheep.id}`)}
          />
        </View>

        {/* Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
        >
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: active
                      ? palette.primary
                      : palette.surface,
                    borderColor: active ? palette.primary : palette.border,
                  },
                ]}
              >
                <Text style={styles.tabEmoji}>{t.emoji}</Text>
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: active ? '#FFFFFF' : palette.textMuted,
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
        </ScrollView>

        {/* Tab body */}
        {tab === 'overview' ? (
          <OverviewTab
            palette={palette}
            sheep={sheep}
            events={events}
            weights={weights}
            breedings={breedings}
            lambings={lambings}
            currencySymbol={currencySymbol}
            moneyForSheep={moneyForSheep}
          />
        ) : null}

        {tab === 'health' ? (
          <HealthTab
            palette={palette}
            sheepId={sheep.id}
            events={events}
          />
        ) : null}

        {tab === 'weights' ? (
          <WeightsTab
            palette={palette}
            sheepId={sheep.id}
            weights={weights}
            series={weightSeries}
          />
        ) : null}

        {tab === 'breeding' ? (
          <BreedingTab
            palette={palette}
            sheepId={sheep.id}
            breedings={breedings}
            lambings={lambings}
          />
        ) : null}

        {tab === 'offspring' ? (
          <OffspringTab
            palette={palette}
            lambings={lambings}
            getSheep={getSheep}
          />
        ) : null}

        {tab === 'money' ? (
          <MoneyTab
            palette={palette}
            records={moneyForSheep}
            currencySymbol={currencySymbol}
            getCategory={(cid) =>
              moneyCategories.find((c) => c.id === cid)
            }
          />
        ) : null}

        {/* Danger actions */}
        <View style={styles.dangerBlock}>
          {sheep.status === 'active' ? (
            <>
              <Pressable
                onPress={handleMarkSold}
                style={[
                  styles.dangerBtn,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                  },
                ]}
              >
                <Text style={[styles.dangerBtnText, { color: palette.text }]}>
                  💰 Mark as sold
                </Text>
              </Pressable>
              <Pressable
                onPress={handleMarkDead}
                style={[
                  styles.dangerBtn,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.warning + '55',
                  },
                ]}
              >
                <Text
                  style={[styles.dangerBtnText, { color: palette.warning }]}
                >
                  ⚠️ Mark as deceased
                </Text>
              </Pressable>
            </>
          ) : (
            <View
              style={[
                styles.inactiveBanner,
                {
                  backgroundColor: palette.surfaceAlt,
                  borderColor: palette.border,
                },
              ]}
            >
              <Text style={[type.bodyStrong, { color: palette.textMuted }]}>
                This animal is marked as {sheep.status}
                {sheep.exitDate
                  ? ` on ${formatMedium(sheep.exitDate)}`
                  : ''}
                .
              </Text>
            </View>
          )}

          <Pressable
            onPress={handleDelete}
            style={[
              styles.dangerBtn,
              {
                backgroundColor: palette.surface,
                borderColor: palette.danger + '55',
              },
            ]}
          >
            <Text style={[styles.dangerBtnText, { color: palette.danger }]}>
              🗑️ Delete permanently
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────
// Tabs
// ─────────────────────────────────────────────────────────

function OverviewTab({
  palette,
  sheep,
  events,
  weights,
  breedings,
  lambings,
  currencySymbol,
  moneyForSheep,
}: {
  palette: Palette;
  sheep: Sheep;
  events: HealthEvent[];
  weights: WeightRecord[];
  breedings: BreedingEvent[];
  lambings: LambingRecord[];
  currencySymbol: string;
  moneyForSheep: MoneyRecord[];
}) {
  const latestWeight = weights[0];
  const firstWeight = weights[weights.length - 1];
  const weightDelta =
    latestWeight && firstWeight && weights.length > 1
      ? latestWeight.weightKg - firstWeight.weightKg
      : undefined;

  const lastEvent = events[0];
  const activeBreeding = breedings.find(
    (b) => b.confirmed || new Date(b.expectedLambingDate) >= new Date()
  );
  const totalLambs = lambings.reduce(
    (sum, l) => sum + l.lambs.filter((x) => x.bornAlive).length,
    0
  );
  const moneyNet = moneyForSheep.reduce(
    (sum, m) => sum + (m.kind === 'income' ? m.amount : -m.amount),
    0
  );

  return (
    <View style={{ marginTop: spacing.lg }}>
      {/* Stat grid */}
      <View style={styles.statGrid}>
        <StatCard
          palette={palette}
          label="LATEST WEIGHT"
          value={
            latestWeight ? formatWeight(latestWeight.weightKg) : '—'
          }
          sub={
            weightDelta !== undefined && weightDelta !== 0
              ? `${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg since first`
              : latestWeight
              ? `Recorded ${formatRelativeDay(latestWeight.date)}`
              : 'No weights yet'
          }
        />
        <StatCard
          palette={palette}
          label="LAST HEALTH"
          value={lastEvent ? formatRelativeDay(lastEvent.date) : '—'}
          sub={lastEvent ? lastEvent.product || 'Event logged' : 'None'}
        />
        <StatCard
          palette={palette}
          label="BREEDING"
          value={
            activeBreeding
              ? `Due ${formatShort(activeBreeding.expectedLambingDate)}`
              : 'Not mated'
          }
          sub={
            activeBreeding?.scanResult
              ? `Scan: ${activeBreeding.scanResult}`
              : activeBreeding
              ? 'Expected lambing'
              : breedings.length > 0
              ? `${breedings.length} past matings`
              : 'No mating recorded'
          }
        />
        <StatCard
          palette={palette}
          label="LAMBS PRODUCED"
          value={`${totalLambs}`}
          sub={`${lambings.length} lambing${
            lambings.length === 1 ? '' : 's'
          }`}
        />
      </View>

      {/* Identity details */}
      <Text
        style={[
          styles.blockLabel,
          { color: palette.textMuted, marginTop: spacing.xl },
        ]}
      >
        IDENTITY
      </Text>
      <DetailCard
        palette={palette}
        rows={[
          { label: 'Tag', value: sheep.tag },
          ...(sheep.name ? [{ label: 'Name', value: sheep.name }] : []),
          { label: 'Breed', value: sheep.breed },
          { label: 'Sex', value: sexLabel(sheep.sex) },
          { label: 'Date of birth', value: formatMedium(sheep.dob) },
          { label: 'Age', value: ageFromDob(sheep.dob) },
          ...(sheep.group ? [{ label: 'Group / mob', value: sheep.group }] : []),
          { label: 'Status', value: sheep.status },
          ...(sheep.purchaseSource
            ? [{ label: 'Purchased from', value: sheep.purchaseSource }]
            : []),
        ]}
      />

      {/* Money summary */}
      {moneyForSheep.length > 0 ? (
        <>
          <Text
            style={[
              styles.blockLabel,
              { color: palette.textMuted, marginTop: spacing.xl },
            ]}
          >
            MONEY · NET
          </Text>
          <View
            style={[
              styles.moneyBanner,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <Text
              style={[
                styles.moneyBannerValue,
                {
                  color:
                    moneyNet >= 0 ? palette.healthy : palette.danger,
                },
              ]}
            >
              {money(moneyNet, currencySymbol)}
            </Text>
            <Text
              style={[
                type.caption,
                { color: palette.textMuted, marginTop: 2 },
              ]}
            >
              Across {moneyForSheep.length} record
              {moneyForSheep.length === 1 ? '' : 's'}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

function HealthTab({
  palette,
  sheepId,
  events,
}: {
  palette: Palette;
  sheepId: string;
  events: HealthEvent[];
}) {
  const router = useRouter();

  if (events.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <Text style={styles.emptyTabEmoji}>🩺</Text>
        <Text
          style={[
            type.bodyStrong,
            { color: palette.text, marginTop: spacing.sm },
          ]}
        >
          No health events
        </Text>
        <Text
          style={[
            type.caption,
            {
              color: palette.textMuted,
              marginTop: spacing.xs,
              textAlign: 'center',
            },
          ]}
        >
          Vaccinations, deworming, and treatments will show up here.
        </Text>
        <Pressable
          onPress={() => router.push(`/health/add?sheepId=${sheepId}`)}
          style={[
            styles.tabPrimaryBtn,
            { backgroundColor: palette.primary, marginTop: spacing.lg },
          ]}
        >
          <Text style={styles.tabPrimaryBtnText}>Log health event</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
      <Pressable
        onPress={() => router.push(`/health/add?sheepId=${sheepId}`)}
        style={[
          styles.tabPrimaryBtn,
          { backgroundColor: palette.primary, marginBottom: spacing.sm },
        ]}
      >
        <Text style={styles.tabPrimaryBtnText}>+ Log health event</Text>
      </Pressable>

      {events.map((e) => (
        <HealthEventRow key={e.id} palette={palette} event={e} />
      ))}
    </View>
  );
}

function WeightsTab({
  palette,
  sheepId,
  weights,
  series,
}: {
  palette: Palette;
  sheepId: string;
  weights: WeightRecord[];
  series: { date: string; weightKg: number }[];
}) {
  const router = useRouter();

  return (
    <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
      <Pressable
        onPress={() => router.push(`/weight/add?sheepId=${sheepId}`)}
        style={[
          styles.tabPrimaryBtn,
          { backgroundColor: palette.primary },
        ]}
      >
        <Text style={styles.tabPrimaryBtnText}>+ Log weight</Text>
      </Pressable>

      {weights.length === 0 ? (
        <View style={styles.emptyTab}>
          <Text style={styles.emptyTabEmoji}>⚖️</Text>
          <Text
            style={[
              type.bodyStrong,
              { color: palette.text, marginTop: spacing.sm },
            ]}
          >
            No weights yet
          </Text>
        </View>
      ) : (
        <>
          <MiniSparkline palette={palette} series={series} />
          {weights.map((w) => (
            <View
              key={w.id}
              style={[
                styles.miniRow,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[type.bodyStrong, { color: palette.text }]}>
                  {formatWeight(w.weightKg)}
                </Text>
                <Text
                  style={[
                    type.caption,
                    { color: palette.textMuted, marginTop: 2 },
                  ]}
                >
                  {formatMedium(w.date)}
                  {w.note ? ` · ${w.note}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function BreedingTab({
  palette,
  sheepId,
  breedings,
  lambings,
}: {
  palette: Palette;
  sheepId: string;
  breedings: BreedingEvent[];
  lambings: LambingRecord[];
}) {
  const router = useRouter();

  return (
    <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
      <Pressable
        onPress={() => router.push(`/breeding/add?damId=${sheepId}`)}
        style={[
          styles.tabPrimaryBtn,
          { backgroundColor: palette.primary },
        ]}
      >
        <Text style={styles.tabPrimaryBtnText}>+ Log mating</Text>
      </Pressable>

      {breedings.length === 0 ? (
        <View style={styles.emptyTab}>
          <Text style={styles.emptyTabEmoji}>💞</Text>
          <Text
            style={[
              type.bodyStrong,
              { color: palette.text, marginTop: spacing.sm },
            ]}
          >
            No breeding records
          </Text>
        </View>
      ) : (
        breedings.map((b) => {
          const due = new Date(b.expectedLambingDate) >= new Date();
          return (
            <View
              key={b.id}
              style={[
                styles.miniRow,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  borderLeftWidth: 4,
                  borderLeftColor: due
                    ? palette.breeding
                    : palette.textMuted,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[type.bodyStrong, { color: palette.text }]}>
                  Mated {formatMedium(b.matingDate)}
                </Text>
                <Text
                  style={[
                    type.caption,
                    { color: palette.textMuted, marginTop: 2 },
                  ]}
                >
                  {due
                    ? `Due ${formatShort(b.expectedLambingDate)} · ${formatRelativeDay(
                        b.expectedLambingDate
                      )}`
                    : `Was due ${formatMedium(b.expectedLambingDate)}`}
                  {b.scanResult && b.scanResult !== 'unknown'
                    ? ` · ${b.scanResult}`
                    : ''}
                </Text>
              </View>
            </View>
          );
        })
      )}

      {lambings.length > 0 ? (
        <Text
          style={[
            styles.blockLabel,
            { color: palette.textMuted, marginTop: spacing.lg },
          ]}
        >
          LAMBING HISTORY
        </Text>
      ) : null}

      {lambings.map((l) => {
        const born = l.lambs.filter((x) => x.bornAlive).length;
        return (
          <View
            key={l.id}
            style={[
              styles.miniRow,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                borderLeftWidth: 4,
                borderLeftColor: palette.healthy,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[type.bodyStrong, { color: palette.text }]}>
                {born} lamb{born === 1 ? '' : 's'} born
              </Text>
              <Text
                style={[
                  type.caption,
                  { color: palette.textMuted, marginTop: 2 },
                ]}
              >
                {formatMedium(l.lambingDate)}
                {l.ease ? ` · Ease ${l.ease}/5` : ''}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function OffspringTab({
  palette,
  lambings,
  getSheep,
}: {
  palette: Palette;
  lambings: LambingRecord[];
  getSheep: (id: string) => Sheep | undefined;
}) {
  const lambs = useMemo(() => {
    const out: { sheep?: Sheep; sex: string; born: boolean; date: string }[] =
      [];
    for (const l of lambings) {
      for (const lamb of l.lambs) {
        out.push({
          sheep: lamb.sheepId ? getSheep(lamb.sheepId) : undefined,
          sex: lamb.sex,
          born: lamb.bornAlive,
          date: l.lambingDate,
        });
      }
    }
    return out.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [lambings, getSheep]);

  if (lambs.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <Text style={styles.emptyTabEmoji}>🐣</Text>
        <Text
          style={[
            type.bodyStrong,
            { color: palette.text, marginTop: spacing.sm },
          ]}
        >
          No offspring yet
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
      {lambs.map((l, idx) => (
        <View
          key={idx}
          style={[
            styles.miniRow,
            {
              backgroundColor: palette.surface,
              borderColor: palette.border,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[type.bodyStrong, { color: palette.text }]}>
              {l.sheep ? sheepDisplayName(l.sheep) : 'Unnamed lamb'}
              {l.sheep ? ` · #${l.sheep.tag}` : ''}
            </Text>
            <Text
              style={[
                type.caption,
                { color: palette.textMuted, marginTop: 2 },
              ]}
            >
              Born {formatMedium(l.date)} · {l.sex} ·{' '}
              {l.born ? 'Alive' : 'Stillborn'}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function MoneyTab({
  palette,
  records,
  currencySymbol,
  getCategory,
}: {
  palette: Palette;
  records: MoneyRecord[];
  currencySymbol: string;
  getCategory: (id: string) =>
    | { emoji: string; name: string; color: string }
    | undefined;
}) {
  if (records.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <Text style={styles.emptyTabEmoji}>💰</Text>
        <Text
          style={[
            type.bodyStrong,
            { color: palette.text, marginTop: spacing.sm },
          ]}
        >
          No money records
        </Text>
        <Text
          style={[
            type.caption,
            {
              color: palette.textMuted,
              marginTop: spacing.xs,
              textAlign: 'center',
            },
          ]}
        >
          Sale proceeds or purchase costs linked to this animal appear here.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
      {records.map((m) => {
        const cat = getCategory(m.categoryId);
        const isIncome = m.kind === 'income';
        return (
          <View
            key={m.id}
            style={[
              styles.miniRow,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <View
              style={[
                styles.rowEmojiWrap,
                { backgroundColor: (cat?.color ?? palette.textMuted) + '22' },
              ]}
            >
              <Text style={styles.rowEmoji}>{cat?.emoji ?? '💰'}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[type.bodyStrong, { color: palette.text }]}>
                {m.note?.trim() || cat?.name || (isIncome ? 'Income' : 'Expense')}
              </Text>
              <Text
                style={[
                  type.caption,
                  { color: palette.textMuted, marginTop: 2 },
                ]}
              >
                {formatMedium(m.date)}
              </Text>
            </View>
            <Text
              style={[
                styles.moneyAmount,
                { color: isIncome ? palette.healthy : palette.danger },
              ]}
            >
              {isIncome ? '+' : '−'}
              {money(m.amount, currencySymbol).replace(/^[−-]/, '')}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────

function ActionButton({
  palette,
  emoji,
  label,
  onPress,
}: {
  palette: Palette;
  emoji: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        {
          backgroundColor: pressed ? palette.surfaceAlt : palette.surface,
          borderColor: palette.border,
        },
      ]}
    >
      <Text style={styles.actionBtnEmoji}>{emoji}</Text>
      <Text style={[styles.actionBtnLabel, { color: palette.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatCard({
  palette,
  label,
  value,
  sub,
}: {
  palette: Palette;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <Text style={[styles.statLabel, { color: palette.textMuted }]}>
        {label}
      </Text>
      <Text
        style={[styles.statValue, { color: palette.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>
      {sub ? (
        <Text
          style={[styles.statSub, { color: palette.textMuted }]}
          numberOfLines={2}
        >
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

function DetailCard({
  palette,
  rows,
}: {
  palette: Palette;
  rows: { label: string; value: string }[];
}) {
  return (
    <View
      style={[
        styles.detailCard,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      {rows.map((r, i) => (
        <View
          key={r.label + i}
          style={[
            styles.detailRow,
            i < rows.length - 1 && {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: palette.divider,
            },
          ]}
        >
          <Text style={[styles.detailLabel, { color: palette.textMuted }]}>
            {r.label}
          </Text>
          <Text
            style={[styles.detailValue, { color: palette.text }]}
            numberOfLines={2}
          >
            {r.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

function HealthEventRow({
  palette,
  event,
}: {
  palette: Palette;
  event: HealthEvent;
}) {
  const end = withdrawalEndDate(event);
  const activeWithdrawal =
    end && new Date(end) >= new Date() ? end : undefined;

  return (
    <View
      style={[
        styles.miniRow,
        {
          backgroundColor: palette.surface,
          borderColor: palette.border,
          borderLeftWidth: 4,
          borderLeftColor: activeWithdrawal
            ? palette.danger
            : palette.info,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[type.bodyStrong, { color: palette.text }]}>
          {event.product || healthLabel(event.type)}
        </Text>
        <Text
          style={[
            type.caption,
            { color: palette.textMuted, marginTop: 2 },
          ]}
        >
          {formatMedium(event.date)}
          {event.dose ? ` · ${event.dose}` : ''}
          {event.cost ? ` · Cost ${event.cost}` : ''}
        </Text>
        {activeWithdrawal ? (
          <Text
            style={[
              styles.withdrawalNote,
              { color: palette.danger, marginTop: 4 },
            ]}
          >
            🚫 Withdrawal until {formatShort(activeWithdrawal)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function MiniSparkline({
  palette,
  series,
}: {
  palette: Palette;
  series: { date: string; weightKg: number }[];
}) {
  if (series.length < 2) return null;
  const values = series.map((s) => s.weightKg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const width = 300;
  const height = 60;
  const step = width / (series.length - 1);
  const points = series
    .map((s, i) => {
      const x = i * step;
      const y = height - ((s.weightKg - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  // We can't use SVG without installing react-native-svg — but it's already
  // in package.json from Lumo Expense. However, to keep this file self-
  // contained, we render a lightweight inline sparkline using flex bars.
  // This is a placeholder that will be replaced with a proper chart later.
  return (
    <View
      style={[
        styles.sparkWrap,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      <View style={styles.sparkBars}>
        {series.map((s, i) => {
          const h = ((s.weightKg - min) / range) * 44 + 8;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: h,
                backgroundColor: palette.primary,
                borderRadius: 2,
                marginHorizontal: 1,
                alignSelf: 'flex-end',
              }}
            />
          );
        })}
      </View>
      <View style={styles.sparkMeta}>
        <Text style={[styles.sparkMetaText, { color: palette.textMuted }]}>
          {formatShort(series[0].date)}
        </Text>
        <Text style={[styles.sparkMetaText, { color: palette.textMuted }]}>
          {formatShort(series[series.length - 1].date)}
        </Text>
      </View>
    </View>
  );
}

function healthLabel(t: string): string {
  switch (t) {
    case 'vaccine':
      return 'Vaccination';
    case 'deworm':
      return 'Deworming';
    case 'treatment':
      return 'Treatment';
    case 'vet':
      return 'Vet visit';
    case 'hoof':
      return 'Hoof trim';
    case 'shear':
      return 'Shearing';
    default:
      return 'Health event';
  }
}

// ─────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────

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

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },

  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },

  hero: { alignItems: 'center', marginTop: spacing.sm },
  heroPhoto: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  heroPhotoFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmoji: { fontSize: 44 },
  heroBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
    justifyContent: 'center',
  },
  heroBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  heroBadgeText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11.5,
    letterSpacing: 0.3,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionBtn: {
    flex: 1,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  actionBtnEmoji: { fontSize: 20 },
  actionBtnLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11.5,
  },

  tabsScroll: {
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  tabEmoji: { fontSize: 14 },
  tabLabel: { fontSize: 13 },

  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '48.5%',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    minHeight: 100,
  },
  statLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.5,
  },
  statValue: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 20,
    marginTop: spacing.sm,
  },
  statSub: {
    fontFamily: fonts.sansRegular,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },

  blockLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },

  detailCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  detailLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 13.5,
    flexShrink: 0,
  },
  detailValue: {
    fontFamily: fonts.sansMedium,
    fontSize: 13.5,
    flex: 1,
    textAlign: 'right',
  },

  moneyBanner: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  moneyBannerValue: {
    fontFamily: fonts.serifBold,
    fontSize: 26,
  },

  emptyTab: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTabEmoji: { fontSize: 42 },
  tabPrimaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPrimaryBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.sansSemiBold,
    fontSize: 14.5,
  },

  miniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowEmojiWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowEmoji: { fontSize: 18 },
  moneyAmount: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14.5,
  },
  withdrawalNote: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
  },

  // Sparkline
  sparkWrap: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sparkBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 60,
  },
  sparkMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  sparkMetaText: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
  },

  // Danger block
  dangerBlock: {
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  dangerBtn: {
    paddingVertical: 14,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  dangerBtnText: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14.5,
  },
  inactiveBanner: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});