import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Icon } from '@/components/icon';
import { ConfirmSheet, Sheet } from '@/components/sheet';
import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  Row,
  Screen,
  Segmented,
  Txt,
} from '@/components/ui';
import { useQuery } from '@/db';
import {
  deleteCategory,
  listCategories,
  saveCategory,
  setCategoryArchived,
} from '@/db/queries';
import type { Category, CategoryType } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { ICON_CHOICES } from '@/lib/icons';
import { categoryPalette, radius } from '@/lib/theme';

type Filter = 'expense' | 'income';

export default function CategoriesScreen() {
  const c = useTheme();
  const [filter, setFilter] = useState<Filter>('expense');
  const [editing, setEditing] = useState<Category | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const categories = useQuery(() => listCategories(undefined, true), []);
  const list = useMemo(
    () =>
      (categories.data ?? []).filter(
        (category) =>
          category.type === filter && (showArchived ? true : !category.archived_at),
      ),
    [categories.data, filter, showArchived],
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Screen bottomInset={100}>
        <Segmented
          options={[
            { value: 'expense', label: 'Pengeluaran' },
            { value: 'income', label: 'Pemasukan' },
          ]}
          value={filter}
          onChange={(value) => setFilter(value as Filter)}
        />

        <Row between style={{ marginTop: 16, marginBottom: 10 }}>
          <Txt variant="caption" color={c.textMuted} style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {list.length} kategori
          </Txt>
          <Pressable onPress={() => setShowArchived((prev) => !prev)} hitSlop={8}>
            <Txt variant="caption" color={c.accent} weight="600">
              {showArchived ? 'Sembunyikan arsip' : 'Lihat arsip'}
            </Txt>
          </Pressable>
        </Row>

        {list.length === 0 ? (
          <EmptyState
            icon="square.grid.2x2"
            title="Belum ada kategori"
            description="Buat kategori agar laporanmu lebih rapi."
            actionLabel="Tambah kategori"
            onAction={() => {
              setEditing(null);
              setSheetOpen(true);
            }}
          />
        ) : (
          <Card padded={false} style={{ paddingHorizontal: 16 }}>
            {list.map((category, index) => (
              <View key={category.id}>
                {index > 0 ? <Divider inset={46} /> : null}
                <Pressable
                  onPress={() => {
                    setEditing(category);
                    setSheetOpen(true);
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    paddingVertical: 12,
                    opacity: pressed ? 0.6 : 1,
                  })}>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 11,
                      backgroundColor: `${category.color}1F`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Icon sf={category.icon} size={16} color={category.color} />
                  </View>
                  <View style={{ flex: 1, gap: 1 }}>
                    <Txt variant="body" weight="500">
                      {category.name}
                    </Txt>
                    <Txt variant="caption" color={c.textMuted}>
                      {category.usage_count > 0
                        ? `${category.usage_count} transaksi`
                        : 'Belum dipakai'}
                    </Txt>
                  </View>
                  {category.archived_at ? <Badge label="Arsip" color={c.textFaint} /> : null}
                  <Icon sf="chevron.right" size={12} color={c.textFaint} />
                </Pressable>
              </View>
            ))}
          </Card>
        )}

        <Button
          label="Tambah kategori"
          variant="secondary"
          icon="plus"
          style={{ marginTop: 16 }}
          onPress={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
        />
      </Screen>

      <CategorySheet
        key={`${editing?.id ?? 'new'}-${sheetOpen}`}
        visible={sheetOpen}
        category={editing}
        type={filter}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}

function CategorySheet({
  visible,
  category,
  type,
  onClose,
}: {
  visible: boolean;
  category: Category | null;
  type: CategoryType;
  onClose: () => void;
}) {
  const c = useTheme();
  const [name, setName] = useState(category?.name ?? '');
  const [icon, setIcon] = useState(category?.icon ?? ICON_CHOICES[0]);
  const [color, setColor] = useState(category?.color ?? categoryPalette[0]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The parent re-mounts this sheet via `key`, so initial state is enough.

  async function submit() {
    if (!name.trim()) {
      setError('Nama kategori wajib diisi.');
      return;
    }
    await saveCategory({ id: category?.id, name: name.trim(), type: category?.type ?? type, icon, color });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  }

  return (
    <>
      <Sheet
        visible={visible}
        onClose={onClose}
        title={category ? 'Ubah kategori' : 'Kategori baru'}
        footer={
          <View style={{ gap: 8 }}>
            <Button label={category ? 'Simpan' : 'Tambah'} size="lg" onPress={submit} />
            {category ? (
              <>
                <Button
                  label={category.archived_at ? 'Keluarkan dari arsip' : 'Arsipkan kategori'}
                  variant="ghost"
                  onPress={() => {
                    void setCategoryArchived(category.id, !category.archived_at).then(onClose);
                  }}
                />
                <Button label="Hapus kategori" variant="danger" onPress={() => setConfirmDelete(true)} />
              </>
            ) : null}
          </View>
        }>
        <View style={{ alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 22,
              backgroundColor: `${color}22`,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon sf={icon} size={28} color={color} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {categoryPalette.map((tone) => (
              <Pressable
                key={tone}
                onPress={() => setColor(tone)}
                accessibilityLabel={`Warna ${tone}`}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: tone,
                  borderWidth: color === tone ? 2.5 : 0,
                  borderColor: c.text,
                }}
              />
            ))}
          </ScrollView>
        </View>

        <View>
          <Txt variant="caption" color={c.textMuted} style={{ marginBottom: 6 }}>
            Nama
          </Txt>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="mis. Kopi & Nongkrong"
            placeholderTextColor={c.textFaint}
            style={{
              backgroundColor: c.surfaceAlt,
              borderRadius: radius.md,
              paddingHorizontal: 14,
              paddingVertical: 13,
              fontSize: 16,
              color: c.text,
            }}
          />
        </View>

        <View>
          <Txt variant="caption" color={c.textMuted} style={{ marginBottom: 8 }}>
            Ikon
          </Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {ICON_CHOICES.map((symbol) => (
              <Pressable
                key={symbol}
                onPress={() => {
                  Haptics.selectionAsync();
                  setIcon(symbol);
                }}
                accessibilityLabel={symbol}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: icon === symbol ? `${color}22` : c.surfaceAlt,
                  borderWidth: icon === symbol ? 1.5 : 0,
                  borderColor: color,
                }}>
                <Icon sf={symbol} size={17} color={icon === symbol ? color : c.textMuted} />
              </Pressable>
            ))}
          </View>
        </View>

        {error ? (
          <Txt variant="caption" color={c.expense}>
            {error}
          </Txt>
        ) : null}
      </Sheet>

      <ConfirmSheet
        visible={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Hapus kategori?"
        message="Kategori yang sudah dipakai transaksi tidak bisa dihapus — arsipkan saja."
        onConfirm={() => {
          if (!category) return;
          void deleteCategory(category.id).then((result) => {
            if (!result.ok) setError(result.reason ?? 'Tidak bisa menghapus kategori.');
            else onClose();
          });
        }}
      />
    </>
  );
}
