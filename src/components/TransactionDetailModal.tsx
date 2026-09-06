import { formatRub, formatRubSigned, type DealStatus } from '../refundLogic';
import { assetUrl } from '../assets';
import { useEscapeToClose } from '../useEscapeToClose';

export type TransactionType = 'debit' | 'credit';

export type TransactionDetailData = {
  id: string;
  type: TransactionType;
  amount: number;
  sellerName: string;
  buyerName: string;
  adminName: string;
  dealStatus: DealStatus;
  dealBalance: number;
  comment: string;
  createdAtLabel?: string;
};

type TransactionDetailModalProps = {
  tx: TransactionDetailData;
  onClose: () => void;
};

function MockAvatar({ seed }: { seed: string }) {
  const hue = Math.abs(
    seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0),
  ) % 360;
  return (
    <span
      className="entity-modal__avatar"
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 70% 42%), hsl(${(hue + 40) % 360} 80% 28%))`,
      }}
      aria-hidden="true"
    />
  );
}

function formatRubPlus(value: number): string {
  return `+${formatRub(value)}`;
}

export function TransactionDetailModal({
  tx,
  onClose,
}: TransactionDetailModalProps) {
  const overlayRef = useEscapeToClose(onClose);
  const isDebit = tx.type === 'debit';
  const title = isDebit ? 'Списание' : 'Начисление';
  const amountText = isDebit
    ? formatRubSigned(tx.amount)
    : formatRubPlus(tx.amount);

  const userName =
    tx.dealStatus === 'completed'
      ? isDebit
        ? tx.sellerName
        : tx.buyerName
      : isDebit
        ? tx.buyerName
        : tx.sellerName;

  const footerNote = isDebit
    ? 'Списание обработано в рамках возврата по сделке'
    : 'Начисление обработано в рамках возврата по сделке';

  return (
    <div
      ref={overlayRef}
      data-modal-overlay
      className="overlay overlay--entity"
      role="presentation"
    >
      <div className="entity-modal" role="dialog" aria-modal="true">
        <div className="entity-modal__topbar">
          <div className="entity-modal__date">
            {tx.createdAtLabel ?? ''}
          </div>
          <button
            type="button"
            className="entity-modal__close"
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

        <div className="entity-modal__hero">
          <img
            className="entity-modal__hero-icon"
            src={assetUrl('icons/icon-wallet.svg')}
            alt=""
            width={48}
            height={48}
          />
          <div className="entity-modal__hero-title">{title}</div>
          <div
            className={[
              'entity-modal__hero-amount',
              isDebit
                ? 'entity-modal__hero-amount--debit'
                : 'entity-modal__hero-amount--credit',
            ].join(' ')}
          >
            {amountText}
          </div>
        </div>

        <div className="entity-modal__rows">
          <div className="entity-modal__row">
            <div className="entity-modal__row-key">Пользователь</div>
            <div className="entity-modal__row-value entity-modal__row-value--user">
              <MockAvatar seed={userName} />
              <span>{userName}</span>
            </div>
          </div>
          <div className="entity-modal__row">
            <div className="entity-modal__row-key">Администратор</div>
            <div className="entity-modal__row-value entity-modal__row-value--user">
              <MockAvatar seed={tx.adminName} />
              <span>{tx.adminName}</span>
            </div>
          </div>
        </div>

        <p className="entity-modal__note">{footerNote}</p>
      </div>
    </div>
  );
}
