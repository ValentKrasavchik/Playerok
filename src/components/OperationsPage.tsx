import { useMemo, useState } from 'react';
import { formatRub, formatRubSigned } from '../refundLogic';
import type { OperationKind, OperationRecord, OperationsState } from '../operationsStore';
import { assetUrl } from '../assets';
import { RefundLogModal } from './RefundLogModal';
import { TransactionDetailModal, type TransactionDetailData } from './TransactionDetailModal';

type OpsSubTab = 'all' | 'ledger' | 'refunds';

type OperationsPageProps = {
  state: OperationsState;
  onClear: () => void;
};

const SUB_TABS: Array<{ id: OpsSubTab; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'ledger', label: 'Начисление / Списание' },
  { id: 'refunds', label: 'Возвраты' },
];

function matchesSubTab(kind: OperationKind, tab: OpsSubTab): boolean {
  if (tab === 'all') return true;
  if (tab === 'ledger') return kind === 'credit' || kind === 'debit';
  return kind === 'refund';
}

function formatAmount(op: OperationRecord): string {
  if (op.kind === 'credit') {
    return `+${formatRub(op.amount)}`;
  }
  if (op.kind === 'debit') {
    return formatRubSigned(op.amount);
  }
  return formatRub(op.amount);
}

function rowIcon(kind: OperationKind): string {
  if (kind === 'debit' || kind === 'credit') {
    return assetUrl('icons/wallet-emoji.png');
  }
  return assetUrl('icons/wallet-emoji.png');
}

export function OperationsPage({ state, onClear }: OperationsPageProps) {
  const [subTab, setSubTab] = useState<OpsSubTab>('refunds');
  const [selectedRefundId, setSelectedRefundId] = useState<string | null>(null);
  const [selectedLedger, setSelectedLedger] = useState<TransactionDetailData | null>(
    null,
  );

  const filtered = useMemo(
    () => state.operations.filter((op) => matchesSubTab(op.kind, subTab)),
    [state.operations, subTab],
  );

  const visible = filtered.slice(0, 20);

  const ledgerTotals = useMemo(() => {
    let credit = 0;
    let debit = 0;
    for (const op of state.operations) {
      if (op.kind === 'credit') credit += op.amount;
      if (op.kind === 'debit') debit += op.amount;
    }
    return { credit, debit };
  }, [state.operations]);

  const bankDelta = useMemo(() => {
    let out = 0;
    let inn = 0;
    for (const op of state.operations) {
      if (op.kind === 'refund' && op.fromRefundBank > 0) {
        out += op.fromRefundBank;
      }
    }
    return { inn, out };
  }, [state.operations]);

  const selectedRefund = useMemo(() => {
    if (!selectedRefundId) return null;
    return (
      state.operations.find(
        (op) => op.id === selectedRefundId && op.kind === 'refund',
      ) ?? null
    );
  }, [selectedRefundId, state.operations]);

  const openOperation = (op: OperationRecord) => {
    if (op.kind === 'refund' && op.refundLog) {
      setSelectedRefundId(op.id);
      return;
    }

    if (op.kind === 'credit' || op.kind === 'debit') {
      const relatedRefund = state.operations.find(
        (item) => item.kind === 'refund' && item.refundId === op.refundId,
      );
      const log = relatedRefund?.refundLog;
      if (!log) return;

      setSelectedLedger({
        ...(op.kind === 'debit' ? log.debit : log.credit),
        createdAtLabel:
          (op.kind === 'debit' ? log.debit : log.credit).createdAtLabel ??
          log.createdAtLabel,
      });
    }
  };

  return (
    <div className="ops-page">
      <div className="ops-page__header">
        <h1 className="ops-page__title">Операции</h1>
        <button type="button" className="ops-page__clear" onClick={onClear}>
          Очистить демо-данные
        </button>
      </div>

      <div className="ops-subtabs" role="tablist">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={subTab === tab.id}
            className={`ops-subtab${subTab === tab.id ? ' ops-subtab--active' : ''}`}
            onClick={() => setSubTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="ops-filters">
        <button type="button" className="ops-filter ops-filter--with-icon">
          <span className="ops-filter__icon-wrap">
            <img
              src={assetUrl('icons/filters.svg')}
              alt=""
              width={16}
              height={16}
            />
            <span className="ops-filter__badge">1</span>
          </span>
          Все фильтры
        </button>
        <button type="button" className="ops-filter">
          Администратор
        </button>
        {subTab === 'ledger' ? (
          <>
            <button type="button" className="ops-filter">
              Операция
            </button>
            <button type="button" className="ops-filter">
              Возврат
            </button>
          </>
        ) : (
          <>
            <button type="button" className="ops-filter">
              Продавец
            </button>
            <button type="button" className="ops-filter">
              Покупатель
            </button>
            <button type="button" className="ops-filter">
              Банк возвратов
            </button>
          </>
        )}
        <button type="button" className="ops-filter ops-filter--active">
          Период
          <img
            className="ops-filter__clear"
            src={assetUrl('icons/filter-clear.svg')}
            alt=""
            width={24}
            height={24}
          />
        </button>
        <button type="button" className="ops-filter">
          Сумма
        </button>
      </div>

      <div className="ops-summary">
        {subTab === 'refunds' ? (
          <>
            <span>В банке возвратов: {formatRub(state.refundBankBalance)}</span>
            <span className="ops-summary__dot" aria-hidden="true">
              ·
            </span>
            <span>
              + {formatRub(bankDelta.inn)} / − {formatRub(bankDelta.out)}
            </span>
          </>
        ) : (
          <span>
            + {formatRub(ledgerTotals.credit)} / −{' '}
            {formatRub(ledgerTotals.debit)}
          </span>
        )}
      </div>

      <div className="ops-list">
        {visible.length === 0 ? (
          <div className="ops-empty">
            <img
              className="ops-empty__icon"
              src={assetUrl('icons/wallet-emoji.png')}
              alt=""
              width={48}
              height={48}
            />
            <p className="ops-empty__text">Список операций пока пуст</p>
          </div>
        ) : (
          visible.map((op) => (
            <button
              key={op.id}
              type="button"
              className="ops-row"
              onClick={() => openOperation(op)}
            >
              <span className="ops-row__icon" aria-hidden="true">
                <img
                  src={rowIcon(op.kind)}
                  alt=""
                  width={40}
                  height={40}
                />
              </span>
              <span className="ops-row__main">
                <span className="ops-row__title">{op.title}</span>
                <span className="ops-row__subtitle">
                  {op.kind === 'refund' ? (
                    <>
                      <img
                        src={assetUrl('icons/moderation.png')}
                        alt=""
                        width={20}
                        height={20}
                      />
                      {op.subtitle}
                    </>
                  ) : (
                    op.subtitle
                  )}
                </span>
              </span>
              <span className="ops-row__time">{op.timeLabel}</span>
              <span className="ops-row__amount">{formatAmount(op)}</span>
            </button>
          ))
        )}
      </div>

      {visible.length > 0 ? (
        <button type="button" className="ops-more" disabled>
          Показать еще
        </button>
      ) : null}

      {selectedRefund?.refundLog ? (
        <RefundLogModal
          log={selectedRefund.refundLog}
          onClose={() => setSelectedRefundId(null)}
        />
      ) : null}

      {selectedLedger ? (
        <TransactionDetailModal
          tx={selectedLedger}
          onClose={() => setSelectedLedger(null)}
        />
      ) : null}
    </div>
  );
}
