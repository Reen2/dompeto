import { useLocalSearchParams } from 'expo-router';

import type { TxnType } from '@/db/types';
import { TransactionEditor } from '@/screens/transaction-editor';

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{
    type?: string;
    amount?: string;
    note?: string;
    payee?: string;
  }>();
  const type: TxnType =
    params.type === 'income' || params.type === 'transfer' ? params.type : 'expense';
  const amount = params.amount ? Number.parseInt(params.amount, 10) : undefined;

  return (
    <TransactionEditor
      mode="new"
      initialType={type}
      initialAmount={Number.isFinite(amount) ? amount : undefined}
      initialNote={params.note}
      initialPayee={params.payee}
    />
  );
}
