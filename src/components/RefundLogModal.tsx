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

function parseUserLabel(raw: string): { name: string; count: string | null } {
  const match = raw.match(/^(.*?)\s*\((\d+)\)\s*$/);
  if (match) {
    return { name: match[1], count: match[2] };
  }
  return { name: raw, count: null };
}

function UserValue({
  name,
  count,
  icon,
  chevron,
}: {
  name: string;
  count?: string | null;
  icon?: string;
  chevron?: boolean;
}) {
  return (
    <div className="refund-log-modal__user">
      <div className="refund-log-modal__user-main">
        {icon ? (
          <img
            className="refund-log-modal__user-icon"
            src={icon}
            alt=""
            width={20}
            height={20}
          />
        ) : null}
        <span className="refund-log-modal__user-name">{name}</span>
        {count != null ? (
          <span className="refund-log-modal__chip">{count}</span>
        ) : null}
      </div>
      {chevron ? (
        <img
          className="refund-log-modal__chevron"
          src={assetUrl('icons/arrow-right.svg')}
          alt=""
          width={24}
          height={24}
        />
      ) : null}
    </div>
  );
}

export function RefundLogModal({ log, onClose }: RefundLogModalProps) {
  const [activeTx, setActiveTx] = useState<RelatedTx | null>(null);
  const overlayRef = useEscapeToClose(
    activeTx !== null ? () => setActiveTx(null) : onClose,
  );

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

  const seller = parseUserLabel(log.sellerName);
  const buyer = parseUserLabel(log.buyerName);
  const admin = parseUserLabel(log.adminName);

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
      {activeDetail ? (
        <TransactionDetailModal
          tx={activeDetail}
          embedded
          onClose={() => setActiveTx(null)}
          onDismiss={onClose}
        />
      ) : null}

      {activeDetail ? null : (
      <div className="refund-log-modal" role="dialog" aria-modal="true">
        <section className="refund-log-modal__head">
          <header className="refund-log-modal__topbar">
            <div className="refund-log-modal__date">{log.createdAtLabel}</div>
            <button
              type="button"
              className="refund-log-modal__close"
              aria-label="Закрыть"
              onClick={onClose}
            >
              <img
                src={assetUrl('icons/icon-close-32.svg')}
                alt=""
                width={32}
                height={32}
              />
            </button>
          </header>

          <div className="refund-log-modal__hero">
            <img
              className="refund-log-modal__hero-icon"
              src={assetUrl('icons/wallet-emoji.png')}
              alt=""
              width={56}
              height={56}
            />
            <div className="refund-log-modal__hero-copy">
              <div className="refund-log-modal__hero-title">Возврат</div>
              <div className="refund-log-modal__hero-amount">
                {formatRub(log.refundAmount)}
              </div>
            </div>
          </div>
        </section>

        <section className="refund-log-modal__section">
          <div className="refund-log-modal__rows">
            <div className="refund-log-modal__row">
              <div className="refund-log-modal__row-key">Продавец</div>
              <UserValue
                name={seller.name}
                count={seller.count ?? '0'}
                icon={assetUrl('icons/trophy.png')}
                chevron
              />
            </div>
            <div className="refund-log-modal__row">
              <div className="refund-log-modal__row-key">Покупатель</div>
              <UserValue
                name={buyer.name}
                count={buyer.count ?? '0'}
                chevron
              />
            </div>
            <div className="refund-log-modal__row">
              <div className="refund-log-modal__row-key">Администратор</div>
              <UserValue
                name={admin.name}
                icon={assetUrl('icons/moderation.png')}
              />
            </div>

            {log.comment ? (
              <div className="refund-log-modal__row">
                <div className="refund-log-modal__row-key">Комментарий</div>
                <div className="refund-log-modal__row-value">{log.comment}</div>
              </div>
            ) : null}

            <div className="refund-log-modal__deal-card">
              <div className="refund-log-modal__deal-thumb-wrap">
                <img
                  className="refund-log-modal__deal-thumb"
                  src={assetUrl('icons/product-item.png')}
                  alt=""
                  width={105}
                  height={78}
                />
              </div>
              <div className="refund-log-modal__deal-body">
                <div className="refund-log-modal__deal-prices">
                  <div className="refund-log-modal__deal-price-group">
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
                  <span className="refund-log-modal__deal-status">
                    {dealStatusLabel}
                  </span>
                </div>
                <div className="refund-log-modal__deal-title">
                  60 UC по айди очень длинное название которое переносится на
                  новую строку и зарезается многоточием
                </div>
              </div>
            </div>
          </div>
        </section>

        {showInProgressRelated ? (
          <section className="refund-log-modal__related">
            <div className="refund-log-modal__related-title">
              Связанные операции
            </div>
            {inProgressRelated.buyerDebit > 0 ? (
              <button
                type="button"
                className="refund-log-modal__related-row"
                onClick={() => setActiveTx('debit')}
              >
                <img
                  className="refund-log-modal__related-icon"
                  src={assetUrl('icons/wallet-emoji.png')}
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
                <div className="refund-log-modal__related-right">
                  <span>−{formatRub(inProgressRelated.buyerDebit)}</span>
                  <img
                    src={assetUrl('icons/arrow-right.svg')}
                    alt=""
                    width={24}
                    height={24}
                  />
                </div>
              </button>
            ) : null}
            {inProgressRelated.sellerCredit > 0 ? (
              <button
                type="button"
                className="refund-log-modal__related-row"
                onClick={() => setActiveTx('credit')}
              >
                <img
                  className="refund-log-modal__related-icon"
                  src={assetUrl('icons/wallet-emoji.png')}
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
                <div className="refund-log-modal__related-right">
                  <span>{formatRubPlus(inProgressRelated.sellerCredit)}</span>
                  <img
                    src={assetUrl('icons/arrow-right.svg')}
                    alt=""
                    width={24}
                    height={24}
                  />
                </div>
              </button>
            ) : null}
          </section>
        ) : null}

        {showCompletedRelated ? (
          <section className="refund-log-modal__related">
            <div className="refund-log-modal__related-title">
              Связанные операции
            </div>
            {fromBank > 0 ? (
              <div className="refund-log-modal__related-row refund-log-modal__related-row--static">
                <img
                  className="refund-log-modal__related-icon"
                  src={assetUrl('icons/bank-emoji.png')}
                  alt=""
                  width={40}
                  height={40}
                />
                <div className="refund-log-modal__related-text">
                  <span className="refund-log-modal__related-top">
                    Источник
                  </span>
                  <span className="refund-log-modal__related-bottom">
                    Списание с банка возвратов
                  </span>
                </div>
                <div className="refund-log-modal__related-right">
                  <span>−{formatRub(fromBank)}</span>
                </div>
              </div>
            ) : null}
            {fromSeller > 0 ? (
              <button
                type="button"
                className="refund-log-modal__related-row"
                onClick={() => setActiveTx('debit')}
              >
                <img
                  className="refund-log-modal__related-icon"
                  src={assetUrl('icons/wallet-emoji.png')}
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
                <div className="refund-log-modal__related-right">
                  <span>−{formatRub(fromSeller)}</span>
                  <img
                    src={assetUrl('icons/arrow-right.svg')}
                    alt=""
                    width={24}
                    height={24}
                  />
                </div>
              </button>
            ) : null}
            {log.refundAmount > 0 ? (
              <button
                type="button"
                className="refund-log-modal__related-row"
                onClick={() => setActiveTx('credit')}
              >
                <img
                  className="refund-log-modal__related-icon"
                  src={assetUrl('icons/wallet-emoji.png')}
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
                <div className="refund-log-modal__related-right">
                  <span>{formatRubPlus(log.refundAmount)}</span>
                  <img
                    src={assetUrl('icons/arrow-right.svg')}
                    alt=""
                    width={24}
                    height={24}
                  />
                </div>
              </button>
            ) : null}
          </section>
        ) : null}
      </div>
      )}
    </div>
  );
}
