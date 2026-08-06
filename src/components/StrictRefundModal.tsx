import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { Radio } from './Radio';
import { ConfirmRefundModal } from './ConfirmRefundModal';
import {
  DEPARTMENTS,
  calculateRefund,
  formatRub,
  formatRubSigned,
  getAvailableRefundOptions,
  getOptionCopy,
  isSingleAmountOption,
  requiresAmountInput,
  showSellerInHeader,
  showsRefundBankLine,
  validatePartialAmount,
  type RefundDemoContext,
  type RefundOptionId,
} from '../refundLogic';
import { parseAmount } from '../utils';
import { assetUrl } from '../assets';

type StrictRefundModalProps = {
  context: RefundDemoContext;
  onClose: () => void;
  onBack: () => void;
  onSuccess: (message: string) => void;
};

export function StrictRefundModal({
  context,
  onClose,
  onBack,
  onSuccess,
}: StrictRefundModalProps) {
  const options = useMemo(
    () => getAvailableRefundOptions(context),
    [context],
  );
  const isSingleAmountCard =
    options.length === 1 && isSingleAmountOption(options[0]);

  const [selected, setSelected] = useState<RefundOptionId>(options[0]);
  const [amountRaw, setAmountRaw] = useState(
    isSingleAmountCard ? String(context.dealBalance) : '',
  );
  const [comment, setComment] = useState('');
  const [department, setDepartment] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setSelected(options[0]);
    if (isSingleAmountOption(options[0])) {
      setAmountRaw(String(context.dealBalance));
    } else {
      setAmountRaw('');
    }
  }, [options, context.dealBalance]);

  const enteredAmount = parseAmount(amountRaw);
  const needsAmount = requiresAmountInput(selected);

  const validation = useMemo(() => {
    if (!needsAmount) return { valid: true, error: null as string | null };
    if (enteredAmount === null) {
      return { valid: false, error: null as string | null };
    }
    return validatePartialAmount(selected, enteredAmount, context);
  }, [needsAmount, enteredAmount, selected, context]);

  const breakdown = useMemo(() => {
    if (needsAmount && !validation.valid) {
      return {
        refundAmount: 0,
        fromDealBalance: 0,
        fromSellerBalance: 0,
        fromRefundBank: 0,
      };
    }
    return calculateRefund(
      selected,
      context,
      needsAmount ? enteredAmount : null,
    );
  }, [needsAmount, validation.valid, selected, context, enteredAmount]);

  const canSubmit =
    validation.valid &&
    (!needsAmount || (enteredAmount !== null && enteredAmount > 0));

  const handleSelect = (option: RefundOptionId) => {
    setSelected(option);
    if (!requiresAmountInput(option)) {
      setAmountRaw('');
    } else if (isSingleAmountOption(option) && amountRaw === '') {
      setAmountRaw(String(context.dealBalance));
    }
  };

  return (
    <>
    <Modal
      title="Произвести возврат"
      onClose={onClose}
      footer={
        <>
          <div className="footer-total">
            <p className="footer-total__amount">
              {formatRub(breakdown.refundAmount)}
            </p>
            <p className="footer-total__label">Возврат</p>
          </div>
          <button
            type="button"
            className="primary-btn"
            disabled={!canSubmit}
            onClick={() => setConfirmOpen(true)}
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
        {showSellerInHeader(context) ? (
          <div className="summary-row">
            <p className="summary-row__label">{context.sellerName}</p>
            <p className="summary-row__value">
              {formatRub(context.sellerBalance ?? 0)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="options-shell">
        {options.map((option) => {
          const copy = getOptionCopy(option);
          const isSelected = selected === option;
          const showAmount = requiresAmountInput(option);
          const showError =
            isSelected && needsAmount && Boolean(validation.error);
          const hideRadio = isSingleAmountCard;

          let bankAmount: number | null = null;
          if (option === 'partial_with_refund_bank') {
            bankAmount =
              isSelected && validation.valid && enteredAmount !== null
                ? breakdown.fromRefundBank
                : 0;
          } else if (
            isSelected &&
            showsRefundBankLine(option) &&
            (option === 'full_with_refund_bank' ||
              option === 'full_from_refund_bank' ||
              (requiresAmountInput(option) &&
                validation.valid &&
                enteredAmount !== null))
          ) {
            bankAmount = breakdown.fromRefundBank;
          }

          return (
            <div
              key={option}
              className={[
                'option-card',
                isSelected || hideRadio ? 'option-card--selected' : '',
                hideRadio ? 'option-card--static' : '',
                showError ? 'option-card--error' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role={hideRadio ? undefined : 'button'}
              tabIndex={hideRadio ? undefined : 0}
              onClick={hideRadio ? undefined : () => handleSelect(option)}
              onKeyDown={
                hideRadio
                  ? undefined
                  : (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleSelect(option);
                      }
                    }
              }
            >
              <div className="option-card__main">
                {hideRadio ? null : <Radio checked={isSelected} />}
                <div className="option-card__text">
                  <p className="option-card__title">{copy.title}</p>
                  <p className="option-card__desc">{copy.description}</p>
                </div>
              </div>

              {showAmount ? (
                <input
                  className="field field--amount"
                  placeholder="Сумма"
                  inputMode="decimal"
                  value={isSelected || hideRadio ? amountRaw : ''}
                  onClick={(event) => event.stopPropagation()}
                  onFocus={() => handleSelect(option)}
                  onChange={(event) => {
                    handleSelect(option);
                    setAmountRaw(event.target.value);
                  }}
                />
              ) : null}

              {showError ? (
                <p className="option-card__error">{validation.error}</p>
              ) : null}

              {bankAmount !== null ? (
                <div className="summary-row">
                  <p className="summary-row__label">Банк возвратов</p>
                  <p className="summary-row__value">
                    {formatRubSigned(bankAmount)}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
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
    {confirmOpen ? (
      <ConfirmRefundModal
        amount={breakdown.refundAmount}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          onSuccess(
            `Возврат ${formatRub(breakdown.refundAmount)} выполнен (демо)`,
          );
          onBack();
        }}
      />
    ) : null}
    </>
  );
}
