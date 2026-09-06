import { useState } from 'react';
import { formatRub, type DealStatus, type RefundBreakdown } from '../refundLogic';
import type { RefundMode } from '../refundLogic';
import { calcInProgressPartialRelatedOps } from '../sellerAccruedLogic';
import { assetUrl } from '../assets';
import { useEscapeToClose } from '../useEscapeToClose';
import {
  TransactionDetailModal,
  type TransactionDetailData,
} from './TransactionDetailModal';

export type RefundLogData = {
  id: string;
  mode: RefundMode;
  createdAtLabel: string;
  statusLabel: string;
  comment: string;

  sellerName: string;
  buyerName: string;
  adminName: string;

  dealStatus: DealStatus;
  dealBalance: number;
  /** Исходное «Начислено продавцу» на момент возврата. */
  sellerAccrued: number;
  refundAmount: number;

  debit: TransactionDetailData;
  credit: TransactionDetailData;
  breakdown: RefundBreakdown;
};

type RefundLogModalProps = {
  log: RefundLogData;
  onClose: () => void;
};

type RelatedTx = 'debit' | 'credit';

function formatRubPlus(value: number): string {
  return `+${formatRub(value)}`;
}

function MockAvatar({ seed }: { seed: string }) {
  const hue = Math.abs(
    seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0),
  ) % 360;
  return (
    <span
      className="refund-log-modal__avatar"
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 70% 42%), hsl(${(hue + 40) % 360} 80% 28%))`,
      }}
      aria-hidden="true"
    />
  );
}

export function RefundLogModal({ log, onClose }: RefundLogModalProps) {
  const [activeTx, setActiveTx] = useState<RelatedTx | null>(null);
  const overlayRef = useEscapeToClose(onClose, activeTx === null);

  const isInProgressPartial =
    log.dealStatus === 'in_progress' && log.breakdown.remainingAmount > 0;
  const isCompleted = log.dealStatus === 'completed';
  const fromSeller = log.breakdown.fromSellerBalance;
  const fromBank = log.breakdown.fromRefundBank;

  const inProgressRelated = isInProgressPartial
    ? calcInProgressPartialRelatedOps(
        log.dealBalance,
        log.sellerAccrued ?? 0,
        log.dealBalance - log.breakdown.remainingAmount - log.refundAmount,
        log.refundAmount,
      )
    : { buyerDebit: 0, sellerCredit: 0 };

  const showInProgressRelated =
    isInProgressPartial &&
    (inProgressRelated.buyerDebit > 0 || inProgressRelated.sellerCredit > 0);

  const showCompletedRelated =
    isCompleted &&
    (fromSeller > 0 || fromBank > 0 || log.refundAmount > 0);

  const dealStatusLabel =
    log.dealStatus === 'in_progress' ? 'В процессе' : 'Завершено';
  const listPrice = Math.round(log.dealBalance / 0.947);
  const discountPct = Math.max(
    1,
    Math.round((1 - log.dealBalance / listPrice) * 100),
  );

  const activeDetail: TransactionDetailData | null =
    activeTx === 'debit'
      ? {
          ...log.debit,
          createdAtLabel: log.debit.createdAtLabel ?? log.createdAtLabel,
          amount: isInProgressPartial
            ? inProgressRelated.buyerDebit
            : fromSeller > 0
              ? fromSeller
              : log.debit.amount,
        }
      : activeTx === 'credit'
        ? {
            ...log.credit,
            createdAtLabel: log.credit.createdAtLabel ?? log.createdAtLabel,
            amount: isInProgressPartial
              ? inProgressRelated.sellerCredit
              : log.refundAmount,
          }
        : null;

  return (
    <div
      ref={overlayRef}
      data-modal-overlay
      className="overlay overlay--entity"
      role="presentation"
    >
      <div className="refund-log-modal" role="dialog" aria-modal="true">
        <div className="refund-log-modal__topbar">
          <div className="refund-log-modal__date">{log.createdAtLabel}</div>
          <button
            type="button"
            className="refund-log-modal__close"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <img
              src={assetUrl('icons/icon-close.svg')}
              alt=""
              width={14}
              height={14}
            />
          </button>
        </div>

        <div className="refund-log-modal__hero">
          <img
            className="refund-log-modal__hero-icon"
            src={assetUrl('icons/icon-wallet.svg')}
            alt=""
            width={48}
            height={48}
          />
          <div className="refund-log-modal__hero-title">Возврат</div>
          <div className="refund-log-modal__hero-amount">
            {formatRub(log.refundAmount)}
          </div>
        </div>

        <div className="refund-log-modal__rows">
          <div className="refund-log-modal__row">
            <div className="refund-log-modal__row-key">Продавец</div>
            <div className="refund-log-modal__row-value refund-log-modal__row-value--user">
              <MockAvatar seed={log.sellerName} />
              <span>{log.sellerName}</span>
            </div>
          </div>
          <div className="refund-log-modal__row">
            <div className="refund-log-modal__row-key">Покупатель</div>
            <div className="refund-log-modal__row-value refund-log-modal__row-value--user">
              <MockAvatar seed={log.buyerName} />
              <span>{log.buyerName}</span>
            </div>
          </div>
          <div className="refund-log-modal__row">
            <div className="refund-log-modal__row-key">Администратор</div>
            <div className="refund-log-modal__row-value refund-log-modal__row-value--user">
              <MockAvatar seed={log.adminName} />
              <span>{log.adminName}</span>
            </div>
          </div>

          {log.comment ? (
            <div className="refund-log-modal__row refund-log-modal__row--comment">
              <div className="refund-log-modal__row-key">Комментарий</div>
              <div className="refund-log-modal__row-value">{log.comment}</div>
            </div>
          ) : null}

          <div className="refund-log-modal__row refund-log-modal__row--deal">
            <div className="refund-log-modal__row-key">Сделка</div>
            <div className="refund-log-modal__deal-card">
              <div className="refund-log-modal__deal-thumb" aria-hidden="true" />
              <div className="refund-log-modal__deal-body">
                <div className="refund-log-modal__deal-prices">
                  <span className="refund-log-modal__deal-price">
                    {formatRub(log.dealBalance)}
                  </span>
                  <span className="refund-log-modal__deal-badge">
                    −{discountPct}%
                  </span>
                  <span className="refund-log-modal__deal-old">
                    {formatRub(listPrice)}
                  </span>
                </div>
                <div className="refund-log-modal__deal-title">
                  Test official product 2
                </div>
                <div className="refund-log-modal__deal-status">
                  {dealStatusLabel}
                </div>
              </div>
            </div>
          </div>
        </div>

        {showInProgressRelated ? (
          <div className="refund-log-modal__related">
            <div className="refund-log-modal__related-title">
              Связанные операции
            </div>
            {inProgressRelated.buyerDebit > 0 ? (
              <button
                type="button"
                className="refund-log-modal__related-row"
                onClick={() => setActiveTx('debit')}
              >
                <div className="refund-log-modal__related-left">
                  <img
                    src={assetUrl('icons/icon-wallet.svg')}
                    alt=""
                    width={40}
                    height={40}
                  />
                  <div className="refund-log-modal__related-text">
                    <span className="refund-log-modal__related-top">
                      Источник
                    </span>
                    <span className="refund-log-modal__related-bottom">
                      Списание с покупателя
                    </span>
                  </div>
                </div>
                <div className="refund-log-modal__related-right">
                  <span>−{formatRub(inProgressRelated.buyerDebit)}</span>
                  <span className="refund-log-modal__related-chevron" aria-hidden>
                    ›
                  </span>
                </div>
              </button>
            ) : null}
            {inProgressRelated.sellerCredit > 0 ? (
              <button
                type="button"
                className="refund-log-modal__related-row"
                onClick={() => setActiveTx('credit')}
              >
                <div className="refund-log-modal__related-left">
                  <img
                    src={assetUrl('icons/icon-wallet.svg')}
                    alt=""
                    width={40}
                    height={40}
                  />
                  <div className="refund-log-modal__related-text">
                    <span className="refund-log-modal__related-top">
                      Источник
                    </span>
                    <span className="refund-log-modal__related-bottom">
                      Начисление продавцу
                    </span>
                  </div>
                </div>
                <div className="refund-log-modal__related-right">
                  <span>{formatRubPlus(inProgressRelated.sellerCredit)}</span>
                  <span className="refund-log-modal__related-chevron" aria-hidden>
                    ›
                  </span>
                </div>
              </button>
            ) : null}
          </div>
        ) : null}

        {showCompletedRelated ? (
          <div className="refund-log-modal__related">
            <div className="refund-log-modal__related-title">
              Связанные операции
            </div>
            {fromSeller > 0 ? (
              <button
                type="button"
                className="refund-log-modal__related-row"
                onClick={() => setActiveTx('debit')}
              >
                <div className="refund-log-modal__related-left">
                  <img
                    src={assetUrl('icons/icon-wallet.svg')}
                    alt=""
                    width={40}
                    height={40}
                  />
                  <div className="refund-log-modal__related-text">
                    <span className="refund-log-modal__related-top">
                      Источник
                    </span>
                    <span className="refund-log-modal__related-bottom">
                      Списание с продавца
                    </span>
                  </div>
                </div>
                <div className="refund-log-modal__related-right">
                  <span>−{formatRub(fromSeller)}</span>
                  <span className="refund-log-modal__related-chevron" aria-hidden>
                    ›
                  </span>
                </div>
              </button>
            ) : null}
            {fromBank > 0 ? (
              <div className="refund-log-modal__related-row refund-log-modal__related-row--static">
                <div className="refund-log-modal__related-left">
                  <img
                    src={assetUrl('icons/icon-bank.svg')}
                    alt=""
                    width={40}
                    height={40}
                  />
                  <div className="refund-log-modal__related-text">
                    <span className="refund-log-modal__related-top">
                      Источник
                    </span>
                    <span className="refund-log-modal__related-bottom">
                      Списано с банка возвратов
                    </span>
                  </div>
                </div>
                <div className="refund-log-modal__related-right">
                  <span>−{formatRub(fromBank)}</span>
                </div>
              </div>
            ) : null}
            {log.refundAmount > 0 ? (
              <button
                type="button"
                className="refund-log-modal__related-row"
                onClick={() => setActiveTx('credit')}
              >
                <div className="refund-log-modal__related-left">
                  <img
                    src={assetUrl('icons/icon-wallet.svg')}
                    alt=""
                    width={40}
                    height={40}
                  />
                  <div className="refund-log-modal__related-text">
                    <span className="refund-log-modal__related-top">
                      Источник
                    </span>
                    <span className="refund-log-modal__related-bottom">
                      Начисление покупателю
                    </span>
                  </div>
                </div>
                <div className="refund-log-modal__related-right">
                  <span>{formatRubPlus(log.refundAmount)}</span>
                  <span className="refund-log-modal__related-chevron" aria-hidden>
                    ›
                  </span>
                </div>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {activeDetail ? (
        <TransactionDetailModal
          tx={activeDetail}
          onClose={() => setActiveTx(null)}
        />
      ) : null}
    </div>
  );
}
