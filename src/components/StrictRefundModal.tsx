import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { Radio } from './Radio';
import {
  DEPARTMENTS,
  calculateRefund,
  formatRub,
  formatRubSigned,
  getAvailableRefundOptions,
  getOptionCopy,
  isPartialOption,
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

  const [selected, setSelected] = useState<RefundOptionId>(options[0]);
  const [amountRaw, setAmountRaw] = useState('');
  const [comment, setComment] = useState('');
  const [department, setDepartment] = useState('');

  useEffect(() => {
    setSelected(options[0]);
    setAmountRaw('');
  }, [options]);

  const enteredAmount = parseAmount(amountRaw);
  const partial = isPartialOption(selected);

  const validation = useMemo(() => {
    if (!partial) return { valid: true, error: null as string | null };
    if (enteredAmount === null) {
      return { valid: false, error: null as string | null };
    }
    return validatePartialAmount(selected, enteredAmount, context);
  }, [partial, enteredAmount, selected, context]);

  const breakdown = useMemo(() => {
    if (partial && !validation.valid) {
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
      partial ? enteredAmount : null,
    );
  }, [partial, validation.valid, selected, context, enteredAmount]);

  const canSubmit =
    validation.valid &&
    (!partial || (enteredAmount !== null && enteredAmount > 0));

  const handleSelect = (option: RefundOptionId) => {
    setSelected(option);
    if (!isPartialOption(option)) {
      setAmountRaw('');
    }
  };

  return (
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
            onClick={() => {
              onSuccess(
                `Возврат ${formatRub(breakdown.refundAmount)} выполнен (демо)`,
              );
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
          const showAmount = isPartialOption(option);
          const showError =
            isSelected &&
            isPartialOption(option) &&
            Boolean(validation.error);

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
              (isPartialOption(option) &&
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
                isSelected ? 'option-card--selected' : '',
                showError ? 'option-card--error' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(option)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleSelect(option);
                }
              }}
            >
              <div className="option-card__main">
                <Radio checked={isSelected} />
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
                  value={isSelected ? amountRaw : ''}
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
  );
}
