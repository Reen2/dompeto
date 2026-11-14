import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Icon } from '@/components/icon';
import { Txt } from '@/components/ui';
import type { TransactionRow as TxnRow } from '@/db/types';
import { useTheme } from '@/hooks/use-theme';
import { formatDateID, relativeDateLabel } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { useSettings } from '@/store/settings';

export function TransactionRow({
  transaction,
  onPress,
  showDate = false,
  showWallet = true,
}: {
  transaction: TxnRow;
  onPress?: () => void;
  showDate?: boolean;
  showWallet?: boolean;
}) {
  const c = useTheme();
  const { settings } = useSettings();
  const isTransfer = transaction.type === 'transfer';
  const isIncome = transaction.type === 'income';

  const title =
    transaction.payee?.trim() ||
    transaction.category_name ||
    (isTransfer ? 'Transfer' : transaction.note?.trim()) ||
    (isIncome ? 'Pemasukan' : 'Pengeluaran');

  const subtitleParts: string[] = [];
  if (showWallet) subtitleParts.push(transaction.wallet_name);
  if (isTransfer && transaction.to_wallet_name) subtitleParts.push(`→ ${transaction.to_wallet_name}`);
  if (transaction.note && transaction.payee) subtitleParts.push(transaction.note);
  if (showDate) subtitleParts.push(relativeDateLabel(transaction.date));

  const icon = isTransfer ? 'arrow.left.arrow.right' : transaction.category_icon ?? 'circle.fill';
  const color = isTransfer ? c.info : transaction.category_color ?? c.textMuted;
  const signed = isIncome ? transaction.amount : isTransfer ? transaction.amount + transaction.fee : -transaction.amount;

  return (
    <Pressable
      onPress={
        onPress
          ? () => {
              Haptics.selectionAsync();
              onPress();
            }
          : undefined
      }
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 11,
        opacity: pressed ? 0.6 : 1,
      })}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 13,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: `${color}1F`,
        }}>
        <Icon sf={icon} size={18} color={color} />
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="body" weight="500" numberOfLines={1}>
          {title}
        </Txt>
        <Txt variant="caption" color={c.textMuted} numberOfLines={1}>
          {subtitleParts.filter(Boolean).join(' · ')}
        </Txt>
      </View>

      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Txt
          variant="amount"
          color={isTransfer ? c.text : isIncome ? c.income : c.expense}
          style={{ fontSize: 15 }}>
          {formatMoney(signed, { sign: isIncome, masked: settings.hideBalances })}
        </Txt>
        {!showDate && transaction.time ? (
          <Txt variant="caption" color={c.textFaint} style={{ fontSize: 11 }}>
            {transaction.time}
          </Txt>
        ) : null}
        {!showDate && !transaction.time ? (
          <Txt variant="caption" color={c.textFaint} style={{ fontSize: 11 }}>
            {formatDateID(transaction.date, false)}
          </Txt>
        ) : null}
      </View>
    </Pressable>
  );
}
