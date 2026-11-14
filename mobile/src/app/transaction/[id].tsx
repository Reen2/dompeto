import { useLocalSearchParams } from 'expo-router';

import { TransactionEditor } from '@/screens/transaction-editor';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TransactionEditor mode="edit" transactionId={id} />;
}
