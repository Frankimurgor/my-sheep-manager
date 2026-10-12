// app/categories.tsx
// Manage money categories — expense and income.

import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSheep } from '../src/context/SheepContext';
import type { Palette } from '../src/theme';
import { fonts, radius, spacing, type, useTheme } from '../src/theme';
import type { MoneyCategory, MoneyKind } from '../src/types';

const COLOR_CHOICES = [
  '#E57373', '#FFB74D', '#FFD54F', '#AED581', '#66BB6A',
  '#4DB6AC', '#64B5F6', '#7986CB', '#BA68C8', '#A1887F',
  '#90A4AE', '#F06292',
];

const EMOJI_CHOICES = [
  '🐑', '🐏', '🐣', '🌾', '💊', '🩺', '✂️', '🧶', '🥛', '💩',
  '🚚', '👷', '💧', '💰', '📈', '🏦', '💳', '🏷️', '🛒', '⚕️',
  '📦', '🧪', '🚫', '🌱', '☀️', '🌧️', '🏠', '🔧', '📊', '📋',
];

export default function Categories() {
  const router = useRouter();
  const { palette } = useTheme();
  const {
    moneyCategories,
    addMoneyCategory,
    updateMoneyCategory,
    deleteMoneyCategory,
    moneyRecords,
  } = useSheep();

  const expenseCats = useMemo(
    () => moneyCategories.filter((c) => c.group === 'expense'),
    [moneyCategories]
  );
  const incomeCats = useMemo(
    () => moneyCategories.filter((c) => c.group === 'income'),
    [moneyCategories]
  );

  const [editing, setEditing] = useState<MoneyCategory | null>(null);
  const [creating, setCreating] = useState<MoneyKind | null>(null);

  const usageCount = (catId: string) =>
    moneyRecords.filter((m) => m.categoryId === catId).length;

  const handleDelete = (cat: MoneyCategory) => {
    if (cat.builtin) {
      Alert.alert(
        'Built-in category',
        'This category ships with My Sheep Manager. You can rename or re-color it, but not delete it.'
      );
      return;
    }
    const count = usageCount(cat.id);
    Alert.alert(
      'Delete category?',
      count > 0
        ? `${count} record${count === 1 ? '' : 's'} use this category. They'll show as "Unknown" afterwards.`
        : 'This category is not used.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMoneyCategory(cat.id),
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
        <Text style={[type.title, { color: palette.text }]}>Categories</Text>
        <View style={styles.topBarBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader
          palette={palette}
          title="Expense categories"
          count={expenseCats.length}
        />
        <CategoryList
          palette={palette}
          items={expenseCats}
          usageCount={usageCount}
          onEdit={setEditing}
          onDelete={handleDelete}
        />
        <AddRow
          palette={palette}
          label="Add expense category"
          onPress={() => setCreating('expense')}
        />

        <SectionHeader
          palette={palette}
          title="Income categories"
          count={incomeCats.length}
        />
        <CategoryList
          palette={palette}
          items={incomeCats}
          usageCount={usageCount}
          onEdit={setEditing}
          onDelete={handleDelete}
        />
        <AddRow
          palette={palette}
          label="Add income category"
          onPress={() => setCreating('income')}
        />

        <View style={{ height: 40 }} />
      </ScrollView>

      <CategoryEditor
        visible={!!editing}
        initial={editing}
        defaultGroup={editing?.group ?? 'expense'}
        onClose={() => setEditing(null)}
        onSubmit={async (v) => {
          if (editing) await updateMoneyCategory(editing.id, v);
          setEditing(null);
        }}
      />

      <CategoryEditor
        visible={!!creating}
        initial={null}
        defaultGroup={creating ?? 'expense'}
        onClose={() => setCreating(null)}
        onSubmit={async (v) => {
          if (creating) {
            await addMoneyCategory({
              name: v.name!,
              group: creating,
              emoji: v.emoji!,
              color: v.color!,
            });
          }
          setCreating(null);
        }}
      />
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────

function SectionHeader({
  palette,
  title,
  count,
}: {
  palette: Palette;
  title: string;
  count: number;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[type.bodyStrong, { color: palette.text }]}>{title}</Text>
      <Text style={[type.caption, { color: palette.textMuted }]}>{count}</Text>
    </View>
  );
}

function CategoryList({
  palette,
  items,
  usageCount,
  onEdit,
  onDelete,
}: {
  palette: Palette;
  items: MoneyCategory[];
  usageCount: (id: string) => number;
  onEdit: (c: MoneyCategory) => void;
  onDelete: (c: MoneyCategory) => void;
}) {
  if (items.length === 0) {
    return (
      <View
        style={[
          styles.emptyCard,
          { backgroundColor: palette.surface, borderColor: palette.border },
        ]}
      >
        <Text style={[type.caption, { color: palette.textMuted }]}>
          None yet.
        </Text>
      </View>
    );
  }
  return (
    <View
      style={[
        styles.list,
        { backgroundColor: palette.surface, borderColor: palette.border },
      ]}
    >
      {items.map((cat, idx) => {
        const count = usageCount(cat.id);
        const isLast = idx === items.length - 1;
        return (
          <View
            key={cat.id}
            style={[
              styles.row,
              !isLast && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: palette.divider,
              },
            ]}
          >
            <View
              style={[
                styles.rowEmojiWrap,
                { backgroundColor: cat.color + '22' },
              ]}
            >
              <Text style={styles.rowEmoji}>{cat.emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[type.bodyStrong, { color: palette.text }]}
                numberOfLines={1}
              >
                {cat.name}
              </Text>
              <Text
                style={[
                  type.caption,
                  { color: palette.textMuted, marginTop: 2 },
                ]}
              >
                {count === 0
                  ? 'Not used yet'
                  : `${count} record${count === 1 ? '' : 's'}`}
              </Text>
            </View>
            <Pressable
              onPress={() => onEdit(cat)}
              hitSlop={8}
              style={styles.iconBtn}
            >
              <Text style={[styles.iconText, { color: palette.primary }]}>
                Edit
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onDelete(cat)}
              hitSlop={8}
              style={styles.iconBtn}
              disabled={cat.builtin}
            >
              <Text
                style={[
                  styles.iconText,
                  {
                    color: cat.builtin ? palette.textMuted : palette.danger,
                    opacity: cat.builtin ? 0.5 : 1,
                  },
                ]}
              >
                Delete
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function AddRow({
  palette,
  label,
  onPress,
}: {
  palette: Palette;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.addRow,
        { backgroundColor: palette.surfaceAlt, borderColor: palette.border },
      ]}
    >
      <Text style={[styles.addPlus, { color: palette.primary }]}>＋</Text>
      <Text style={[type.bodyStrong, { color: palette.primary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

type EditorValues = { name?: string; emoji?: string; color?: string };

function CategoryEditor({
  visible,
  initial,
  defaultGroup,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  initial: MoneyCategory | null;
  defaultGroup: MoneyKind;
  onClose: () => void;
  onSubmit: (values: EditorValues) => void | Promise<void>;
}) {
  const { palette } = useTheme();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🏷️');
  const [color, setColor] = useState(COLOR_CHOICES[0]);

  React.useEffect(() => {
    if (visible) {
      setName(initial?.name ?? '');
      setEmoji(initial?.emoji ?? '🏷️');
      setColor(initial?.color ?? COLOR_CHOICES[0]);
    }
  }, [visible, initial]);

  const isEdit = !!initial;
  const title = isEdit
    ? `Edit ${defaultGroup} category`
    : `New ${defaultGroup} category`;
  const canSave = name.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View
          style={[
            styles.modalCard,
            { backgroundColor: palette.background, borderColor: palette.border },
          ]}
        >
          <View style={styles.modalTopBar}>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={[styles.topBarBtnText, { color: palette.textMuted }]}>
                Cancel
              </Text>
            </Pressable>
            <Text style={[type.title, { color: palette.text }]}>{title}</Text>
            <Pressable
              onPress={() => canSave && onSubmit({ name: name.trim(), emoji, color })}
              hitSlop={12}
              disabled={!canSave}
            >
              <Text
                style={[
                  styles.topBarBtnText,
                  {
                    color: canSave ? palette.primary : palette.textMuted,
                    opacity: canSave ? 1 : 0.5,
                  },
                ]}
              >
                Save
              </Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalScroll}>
            <Text style={[styles.fieldLabel, { color: palette.textMuted }]}>
              NAME
            </Text>
            <TextInput
              value={name}
              onChangeText={(t) => setName(t.slice(0, 40))}
              placeholder="e.g., Feed supplement"
              placeholderTextColor={palette.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                  color: palette.text,
                  fontFamily: fonts.sansRegular,
                },
              ]}
              maxLength={40}
            />

            <Text
              style={[
                styles.fieldLabel,
                { color: palette.textMuted, marginTop: spacing.lg },
              ]}
            >
              ICON
            </Text>
            <View style={styles.chipsWrap}>
              {EMOJI_CHOICES.map((e) => {
                const active = e === emoji;
                return (
                  <Pressable
                    key={e}
                    onPress={() => setEmoji(e)}
                    style={[
                      styles.emojiChip,
                      {
                        backgroundColor: active
                          ? palette.primary + '22'
                          : palette.surface,
                        borderColor: active ? palette.primary : palette.border,
                      },
                    ]}
                  >
                    <Text style={styles.emojiChipText}>{e}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Text
              style={[
                styles.fieldLabel,
                { color: palette.textMuted, marginTop: spacing.lg },
              ]}
            >
              COLOR
            </Text>
            <View style={styles.chipsWrap}>
              {COLOR_CHOICES.map((c) => {
                const active = c === color;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setColor(c)}
                    style={[
                      styles.colorChip,
                      {
                        backgroundColor: c,
                        borderColor: active ? palette.text : 'transparent',
                        borderWidth: active ? 3 : 0,
                      },
                    ]}
                  />
                );
              })}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
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

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  list: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  rowEmojiWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rowEmoji: { fontSize: 19 },

  iconBtn: { paddingHorizontal: spacing.xs, paddingVertical: 2 },
  iconText: { fontFamily: fonts.sansSemiBold, fontSize: 12.5 },

  emptyCard: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    alignItems: 'center',
  },

  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  addPlus: {
    fontFamily: fonts.sansRegular,
    fontSize: 22,
    lineHeight: 22,
    marginTop: -2,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '85%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  modalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  modalScroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },

  fieldLabel: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  input: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
  },

  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  emojiChip: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiChipText: { fontSize: 20 },
  colorChip: { width: 36, height: 36, borderRadius: 18 },
});