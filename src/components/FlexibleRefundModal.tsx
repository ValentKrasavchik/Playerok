import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import {
  DEPARTMENTS,
  formatRub,
  type RefundDemoContext,
} from '../refundLogic';
import {
  getFlexibleDefaults,
  isSellerCleared,
  recalcSellerFromBank,
  validateFlexibleAllocation,
} from '../flexibleLogic';
import { assetUrl } from '../assets';

type FlexibleRefundModalProps = {
  context: RefundDemoContext;
  onClose: () => void;
  onBack: () => void;
  onSuccess: (message: string) => void;
};

export function FlexibleRefundModal({
  context,
  onClose,
  onBack,
  onSuccess,
}: FlexibleRefundModalProps) {
  const defaults = useMemo(() => getFlexibleDefaults(context), [context]);
  const showSellerHeader =
    context.dealStatus === 'completed' && context.sellerBalance !== null;

  const [sellerRaw, setSellerRaw] = useState(defaults.sellerRaw);
  const [bankRaw, setBankRaw] = useState(defaults.bankRaw);
  const [sellerManuallyCleared, setSellerManuallyCleared] = useState(
    defaults.sellerLocked,
  );
  const [comment, setComment] = useState('');
  const [department, setDepartment] = useState('');

  useEffect(() => {
    const next = getFlexibleDefaults(context);
    setSellerRaw(next.sellerRaw);
    setBankRaw(next.bankRaw);
    setSellerManuallyCleared(next.sellerLocked);
    setComment('');
    setDepartment('');
  }, [context]);

  const validation = useMemo(
    () =>
      validateFlexibleAllocation(
        context,
        sellerRaw,
        bankRaw,
        defaults.showSellerField,
      ),
    [context, sellerRaw, bankRaw, defaults.showSellerField],
  );

  const refundAmount = validation.valid
    ? validation.allocation.fromSeller + validation.allocation.fromBank
    : 0;

  const canSubmit = validation.valid && refundAmount > 0;
  const hasError = Boolean(validation.error);

  const handleSellerChange = (value: string) => {
    if (defaults.sellerLocked) return;
    setSellerRaw(value);
    setSellerManuallyCleared(isSellerCleared(value));
  };

  const handleBankChange = (value: string) => {
    setBankRaw(value);

    if (
      !defaults.showSellerField ||
      defaults.sellerLocked ||
      sellerManuallyCleared
    ) {
      return;
    }

    const bankAmount =
      value.trim() === '' ? 0 : Number(value.trim().replace(',', '.'));
    if (!Number.isFinite(bankAmount)) return;

    const nextSeller = recalcSellerFromBank(context, bankAmount);
    setSellerRaw(String(nextSeller));
  };

  return (
    <Modal
      title="Произвести возврат"
      onClose={onClose}
      footer={
        <>
          <div className="footer-total">
            <p className="footer-total__amount">{formatRub(refundAmount)}</p>
            <p className="footer-total__label">Возврат</p>
          </div>
          <button
            type="button"
            className="primary-btn"
            disabled={!canSubmit}
            onClick={() => {
              onSuccess(`Возврат ${formatRub(refundAmount)} выполнен (демо)`);
              onBack();
            }}
          >
            Сделать возврат
          </button>
        </>
      }
    >
      <div className="summary-rows">
        <div className="summary-row">
          <p className="summary-row__label">Баланс сделки</p>
          <p className="summary-row__value">{formatRub(context.dealBalance)}</p>
        </div>
        {showSellerHeader ? (
          <div className="summary-row">
            <p className="summary-row__label">{context.sellerName}</p>
            <p className="summary-row__value">
              {formatRub(context.sellerBalance ?? 0)}
            </p>
          </div>
        ) : null}
      </div>

      <div
        className={[
          'flexible-group',
          hasError ? 'flexible-group--error' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="flexible-fields-row">
          <div className="flexible-field">
            <label className="flexible-field__label" htmlFor="flex-bank">
              Банк возвратов
            </label>
            <input
              id="flex-bank"
              className="field field--amount"
              inputMode="decimal"
              placeholder="0"
              value={bankRaw}
              onChange={(event) => handleBankChange(event.target.value)}
            />
          </div>

          {defaults.showSellerField ? (
            <div className="flexible-field">
              <label className="flexible-field__label" htmlFor="flex-seller">
                Продавец
              </label>
              <input
                id="flex-seller"
                className="field field--amount"
                inputMode="decimal"
                placeholder="0"
                value={sellerRaw}
                readOnly={defaults.sellerLocked}
                aria-readonly={defaults.sellerLocked}
                onChange={(event) => handleSellerChange(event.target.value)}
              />
            </div>
          ) : null}
        </div>

        {hasError ? (
          <p className="option-card__error">{validation.error}</p>
        ) : null}
      </div>

      <textarea
        className="field field--comment"
        placeholder="Комментарий"
        value={comment}
        onChange={(event) => setComment(event.target.value)}
      />

      <div className="field--select-wrap">
        <select
          className={`field--select${department ? '' : ' placeholder'}`}
          value={department}
          required
          onChange={(event) => setDepartment(event.target.value)}
        >
          <option value="" disabled>
            Выберите свой отдел
          </option>
          {DEPARTMENTS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <span className="field--select-icon" aria-hidden="true">
          <img
            src={assetUrl('icons/icon-chevron.svg')}
            alt=""
            width={14}
            height={8}
          />
        </span>
      </div>
    </Modal>
  );
}
