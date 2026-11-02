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
  /** Full dismiss (e.g. close whole stack). Falls back to onClose. */
  onDismiss?: () => void;
  /** Render without its own overlay (parent already provides one). */
  embedded?: boolean;
};

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
    <div className="entity-modal__user">
      <div className="entity-modal__user-main">
        {icon ? (
          <img
            className="entity-modal__user-icon"
            src={icon}
            alt=""
            width={20}
            height={20}
          />
        ) : null}
        <span className="entity-modal__user-name">{name}</span>
        {count != null ? (
          <span className="entity-modal__chip">{count}</span>
        ) : null}
      </div>
      {chevron ? (
        <img
          className="entity-modal__chevron"
          src={assetUrl('icons/arrow-right.svg')}
          alt=""
          width={24}
          height={24}
        />
      ) : null}
    </div>
  );
}

export function TransactionDetailModal({
  tx,
  onClose,
  onDismiss,
  embedded = false,
}: TransactionDetailModalProps) {
  const dismiss = onDismiss ?? onClose;
  const overlayRef = useEscapeToClose(onClose, !embedded);
  const isDebit = tx.type === 'debit';
  const title = isDebit ? 'Списание' : 'Начисление';
  const amountText = isDebit
    ? formatRubSigned(tx.amount)
    : formatRubPlus(tx.amount);

  const userRaw =
    tx.dealStatus === 'completed'
      ? isDebit
        ? tx.sellerName
        : tx.buyerName
      : isDebit
        ? tx.buyerName
        : tx.sellerName;

  const user = parseUserLabel(userRaw);
  const admin = parseUserLabel(tx.adminName);
  const showTrophy =
    tx.dealStatus === 'completed' ? isDebit : !isDebit;

  const footerNote = isDebit
    ? 'Списание обработано в рамках возврата по сделке'
    : 'Начисление обработано в рамках возврата по сделке';

  const dialog = (
    <div className="entity-modal" role="dialog" aria-modal="true">
      <section className="entity-modal__head">
        <header className="entity-modal__topbar">
          <button
            type="button"
            className="entity-modal__back"
            aria-label="Назад"
            onClick={onClose}
          >
            <img
              src={assetUrl('icons/arrow-back.svg')}
              alt=""
              width={32}
              height={32}
            />
          </button>
          <div className="entity-modal__date">{tx.createdAtLabel ?? ''}</div>
          <button
            type="button"
            className="entity-modal__close"
            aria-label="Закрыть"
            onClick={dismiss}
          >
            <img
              src={assetUrl('icons/icon-close-32.svg')}
              alt=""
              width={32}
              height={32}
            />
          </button>
        </header>

        <div className="entity-modal__hero">
          <img
            className="entity-modal__hero-icon"
            src={assetUrl('icons/wallet-emoji.png')}
            alt=""
            width={56}
            height={56}
          />
          <div className="entity-modal__hero-copy">
            <div className="entity-modal__hero-title">{title}</div>
            <div className="entity-modal__hero-amount">{amountText}</div>
          </div>
        </div>
      </section>

      <section className="entity-modal__section">
        <div className="entity-modal__rows">
          <div className="entity-modal__row">
            <div className="entity-modal__row-key">Пользователь</div>
            <UserValue
              name={user.name}
              count={user.count ?? '0'}
              icon={showTrophy ? assetUrl('icons/trophy.png') : undefined}
              chevron
            />
          </div>
          <div className="entity-modal__row">
            <div className="entity-modal__row-key">Администратор</div>
            <UserValue
              name={admin.name}
              icon={assetUrl('icons/moderation.png')}
            />
          </div>
        </div>
      </section>

      <section className="entity-modal__footer">
        <p className="entity-modal__note">{footerNote}</p>
      </section>
    </div>
  );

  if (embedded) {
    return dialog;
  }

  return (
    <div
      ref={overlayRef}
      data-modal-overlay
      className="overlay overlay--entity"
      role="presentation"
    >
      {dialog}
    </div>
  );
}
