import { formatRub } from '../refundLogic';
import { useEscapeToClose } from '../useEscapeToClose';

type ConfirmRefundModalProps = {
  amount: number;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmRefundModal({
  amount,
  onCancel,
  onConfirm,
}: ConfirmRefundModalProps) {
  const overlayRef = useEscapeToClose(onCancel);

  return (
    <div
      ref={overlayRef}
      data-modal-overlay
      className="overlay overlay--confirm"
      role="presentation"
    >
      <div
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-refund-title"
      >
        <div className="confirm-modal__text">
          <h2 id="confirm-refund-title" className="confirm-modal__title">
            Произвести возврат?
          </h2>
          <p className="confirm-modal__desc">
            После подтверждения сумма будет возвращена покупателю. Действие
            нельзя будет отменить
          </p>
        </div>
        <div className="confirm-modal__actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={onCancel}
          >
            Отменить
          </button>
          <button
            type="button"
            className="danger-btn"
            onClick={onConfirm}
          >
            Вернуть {formatRub(amount)}
          </button>
        </div>
      </div>
    </div>
  );
}
