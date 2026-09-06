import type { RefundLogData } from './components/RefundLogModal';

export type OperationKind = 'refund' | 'credit' | 'debit';

export type OperationRecord = {
  id: string;
  kind: OperationKind;
  createdAt: number;
  timeLabel: string;
  amount: number;
  title: string;
  subtitle: string;
  sellerName: string;
  buyerName: string;
  adminName: string;
  refundId: string;
  fromRefundBank: number;
  refundLog?: RefundLogData;
};

export type OperationsState = {
  operations: OperationRecord[];
  refundBankBalance: number;
};

const STORAGE_KEY = 'playerok-refund-ops-v1';
const DEFAULT_BANK = 1_000_000;

function emptyState(): OperationsState {
  return {
    operations: [],
    refundBankBalance: DEFAULT_BANK,
  };
}

export function loadOperationsState(): OperationsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as OperationsState;
    if (!Array.isArray(parsed.operations)) return emptyState();
    return {
      operations: parsed.operations,
      refundBankBalance:
        typeof parsed.refundBankBalance === 'number'
          ? parsed.refundBankBalance
          : DEFAULT_BANK,
    };
  } catch {
    return emptyState();
  }
}

export function saveOperationsState(state: OperationsState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearOperationsState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function createOperationsFromRefund(
  log: RefundLogData,
): OperationRecord[] {
  const createdAt = Date.now();
  const timeLabel = new Date(createdAt).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const orderNo = Math.floor(Math.random() * 90) + 1;
  const txId = `ru-ru-${String(createdAt).slice(-7)}-${String(orderNo).padStart(2, '0')}`;

  const refund: OperationRecord = {
    id: log.id,
    kind: 'refund',
    createdAt,
    timeLabel,
    amount: log.refundAmount,
    title: 'Возврат',
    subtitle: `Заказ № ${orderNo}`,
    sellerName: log.sellerName,
    buyerName: log.buyerName,
    adminName: log.adminName,
    refundId: log.id,
    fromRefundBank: log.breakdown.fromRefundBank,
    refundLog: log,
  };

  const isInProgressPartial =
    log.dealStatus === 'in_progress' && log.breakdown.remainingAmount > 0;
  const isCompleted = log.dealStatus === 'completed';

  const ops: OperationRecord[] = [refund];

  if (!(isCompleted && log.breakdown.fromSellerBalance <= 0)) {
    ops.push({
      id: log.debit.id,
      kind: 'debit',
      createdAt: createdAt + 1,
      timeLabel,
      amount: log.debit.amount,
      title: isInProgressPartial
        ? 'Списание с покупателя'
        : isCompleted
          ? 'Списание с продавца'
          : 'Списание',
      subtitle: txId,
      sellerName: log.sellerName,
      buyerName: log.buyerName,
      adminName: log.adminName,
      refundId: log.id,
      fromRefundBank: 0,
    });
  }

  ops.push({
    id: log.credit.id,
    kind: 'credit',
    createdAt: createdAt + 2,
    timeLabel,
    amount: log.credit.amount,
    title: isInProgressPartial
      ? 'Начисление продавцу'
      : isCompleted
        ? 'Начисление покупателю'
        : 'Начисление',
    subtitle: txId,
    sellerName: log.sellerName,
    buyerName: log.buyerName,
    adminName: log.adminName,
    refundId: log.id,
    fromRefundBank: 0,
  });

  // Банк возвратов только уменьшает баланс — отдельной операции в логе нет.
  return ops;
}

export function appendRefundOperations(
  state: OperationsState,
  log: RefundLogData,
): OperationsState {
  const created = createOperationsFromRefund(log);
  return {
    operations: [...created, ...state.operations],
    refundBankBalance: Math.max(
      0,
      state.refundBankBalance - (log.breakdown.fromRefundBank || 0),
    ),
  };
}
