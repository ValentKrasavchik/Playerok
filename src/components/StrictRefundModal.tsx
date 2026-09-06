import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { Radio } from './Radio';
import { ConfirmRefundModal } from './ConfirmRefundModal';
import {
  calculateRefund,
  formatRub,
  getAvailableRefundOptions,
  getOptionCopy,
  getRemainingGross,
  isPartialOption,
  isSingleAmountOption,
  requiresAmountInput,
  showSellerAccruedInHeader,
  showSellerInHeader,
  validatePartialAmount,
  type RefundDemoContext,
  type RefundOptionId,
} from '../refundLogic';
import { parseAmount } from '../utils';
import { assetUrl } from '../assets';
import { calcInProgressPartialRelatedOps } from '../sellerAccruedLogic';
import type { RefundLogData } from './RefundLogModal';
import type { TransactionDetailData } from './TransactionDetailModal';

type StrictRefundModalProps = {
  context: RefundDemoContext;
  onClose: () => void;
  onBack: () => void;
  onSuccess: (message: string) => void;
  onRefundCompleted?: (log: RefundLogData) => void;
  embedded?: boolean;
};

export function StrictRefundModal({
  context,
  onBack,
  onSuccess,
  onRefundCompleted,
  embedded,
}: StrictRefundModalProps) {
  const options = useMemo(
    () => getAvailableRefundOptions(context),
    [context],
  );
  const remainingDeal = getRemainingGross(
    context.dealBalance,
    context.alreadyRefunded,
  );

  const isSingleAmountCard =
    options.length === 1 && isSingleAmountOption(options[0]);

  const [selected, setSelected] = useState<RefundOptionId | null>(
    options[0] ?? null,
  );
  const [amountRaw, setAmountRaw] = useState(
    isSingleAmountCard ? String(remainingDeal) : '',
  );
  const [comment, setComment] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const next = options[0] ?? null;
    setSelected(next);
    if (next && isSingleAmountOption(next)) {
      setAmountRaw(String(remainingDeal));
    } else {
      setAmountRaw('');
    }
  }, [options, remainingDeal]);

  const enteredAmount = parseAmount(amountRaw);
  const needsAmount = selected ? requiresAmountInput(selected) : false;

  const validation = useMemo(() => {
    if (!selected || !needsAmount) {
      return { valid: true, error: null as string | null };
    }
    if (enteredAmount === null) {
      return { valid: false, error: null as string | null };
    }
    return validatePartialAmount(selected, enteredAmount, context);
  }, [needsAmount, enteredAmount, selected, context]);

  const breakdown = useMemo(() => {
    if (!selected || (needsAmount && !validation.valid)) {
      return {
        refundAmount: 0,
        fromDealBalance: 0,
        fromSellerBalance: 0,
        fromRefundBank: 0,
        remainingAmount: remainingDeal,
        newSellerAccrued: 0,
        sellerAccruedReduction: 0,
        commissionReduction: 0,
      };
    }
    return calculateRefund(
      selected,
      context,
      needsAmount ? enteredAmount : null,
    );
  }, [
    needsAmount,
    validation.valid,
    selected,
    context,
    enteredAmount,
    remainingDeal,
  ]);

  const canSubmit =
    Boolean(selected) &&
    validation.valid &&
    (!needsAmount || (enteredAmount !== null && enteredAmount > 0));

  const isPartialSelected = selected ? isPartialOption(selected) : false;
  const showSellerAccruedHint =
    isPartialSelected &&
    context.dealStatus === 'in_progress' &&
    validation.valid &&
    enteredAmount !== null &&
    enteredAmount > 0 &&
    breakdown.newSellerAccrued > 0;

  const showBuyerRefundHint =
    selected === 'partial_from_seller' &&
    context.dealStatus === 'completed' &&
    validation.valid &&
    enteredAmount !== null &&
    enteredAmount > 0;

  const footerLabel =
    selected === 'partial_from_seller' ||
    (isPartialSelected && context.dealStatus === 'in_progress')
      ? 'Частичный возврат'
      : 'Возврат';

  const showFooterWarnIcon =
    context.dealStatus === 'completed' ||
    (isPartialSelected && context.dealStatus === 'in_progress');

  const handleSelect = (option: RefundOptionId) => {
    setSelected(option);
    if (!requiresAmountInput(option)) {
      setAmountRaw('');
    } else if (isSingleAmountOption(option) && amountRaw === '') {
      setAmountRaw(String(remainingDeal));
    }
  };

  const resetForm = () => {
    const next = options[0] ?? null;
    setSelected(next);
    setAmountRaw(
      next && isSingleAmountOption(next) ? String(remainingDeal) : '',
    );
    setComment('');
    setConfirmOpen(false);
  };

  return (
    <>
    <Modal
      title="Произвести возврат"
      onClose={onBack}
      embedded={embedded}
      footer={
        <>
          <div className="footer-total">
            <p className="footer-total__amount">
              {formatRub(breakdown.refundAmount)}
            </p>
            {showFooterWarnIcon ? (
              <p className="footer-total__label footer-total__label--partial">
                <img
                  className="footer-total__warn-icon"
                  src={assetUrl('icons/icon-warning.svg')}
                  alt=""
                  width={16}
                  height={16}
                />
                {footerLabel}
              </p>
            ) : (
              <p className="footer-total__label">{footerLabel}</p>
            )}
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
          <p className="summary-row__label">Сумма сделки</p>
          <p className="summary-row__value">{formatRub(remainingDeal)}</p>
        </div>
        {showSellerAccruedInHeader(context) ? (
          <div className="summary-row">
            <p className="summary-row__label">Начислено продавцу</p>
            <p className="summary-row__value">
              {formatRub(context.sellerAccrued ?? 0)}
            </p>
          </div>
        ) : null}
        {showSellerInHeader(context) ? (
          <div className="summary-row summary-row--with-nick">
            <div className="summary-row__left">
              <p className="summary-row__label">Баланс продавца</p>
              <p className="summary-row__nick">{context.sellerName}</p>
            </div>
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

          let bankHintAmount: number | null = null;
          if (
            isSelected &&
            (option === 'full_with_refund_bank' ||
              option === 'full_from_refund_bank' ||
              ((option === 'partial_with_refund_bank' ||
                option === 'partial_from_refund_bank') &&
                validation.valid &&
                enteredAmount !== null))
          ) {
            bankHintAmount = breakdown.fromRefundBank;
          }

          const showBankHint =
            bankHintAmount !== null && bankHintAmount > 0;

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

              {isSelected && showSellerAccruedHint ? (
                <div className="option-card__hint">
                  <img
                    className="option-card__hint-icon"
                    src={assetUrl('icons/icon-warning.svg')}
                    alt=""
                    width={16}
                    height={16}
                  />
                  <p className="option-card__hint-text">
                    Продавцу будет начислено{' '}
                    <span className="option-card__hint-amount">
                      {formatRub(breakdown.newSellerAccrued)}
                    </span>
                  </p>
                </div>
              ) : null}

              {isSelected && showBuyerRefundHint ? (
                <div className="option-card__hint">
                  <img
                    className="option-card__hint-icon"
                    src={assetUrl('icons/icon-warning.svg')}
                    alt=""
                    width={16}
                    height={16}
                  />
                  <p className="option-card__hint-text">
                    Покупателю будет возвращено{' '}
                    <span className="option-card__hint-amount">
                      {formatRub(enteredAmount ?? 0)}
                    </span>{' '}
                    из{' '}
                    <span className="option-card__hint-amount">
                      {formatRub(context.dealBalance)}
                    </span>
                  </p>
                </div>
              ) : null}

              {showBankHint ? (
                <div className="option-card__hint">
                  <img
                    className="option-card__hint-icon"
                    src={assetUrl('icons/icon-warning.svg')}
                    alt=""
                    width={16}
                    height={16}
                  />
                  <p className="option-card__hint-text">
                    Из банка возвратов будет списано{' '}
                    <span className="option-card__hint-amount">
                      {formatRub(bankHintAmount ?? 0)}
                    </span>
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
    </Modal>
    {confirmOpen ? (
      <ConfirmRefundModal
        amount={breakdown.refundAmount}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          const idBase = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
          const sellerName = context.sellerName;
          const buyerName = 'wwwqwq0 (0)';
          const adminName = 'ValentAdmin (1)';
          const sellerDisplay = /\(\d+\)$/.test(sellerName)
            ? sellerName
            : `${sellerName} (0)`;
          const commentValue = comment.trim();
          const sellerAccruedValue = context.sellerAccrued ?? 0;
          const isInProgressPartial =
            context.dealStatus === 'in_progress' &&
            breakdown.remainingAmount > 0;
          const isCompleted = context.dealStatus === 'completed';
          const related = isInProgressPartial
            ? calcInProgressPartialRelatedOps(
                context.dealBalance,
                sellerAccruedValue,
                context.alreadyRefunded,
                breakdown.refundAmount,
              )
            : {
                buyerDebit: breakdown.refundAmount,
                sellerCredit: breakdown.refundAmount,
              };

          const debitAmount = isInProgressPartial
            ? related.buyerDebit
            : isCompleted && breakdown.fromSellerBalance > 0
              ? breakdown.fromSellerBalance
              : breakdown.refundAmount;
          const creditAmount = isInProgressPartial
            ? related.sellerCredit
            : breakdown.refundAmount;

          const now = new Date();
          const createdAtLabel = `${now.getDate()} ${now.toLocaleString('ru-RU', { month: 'long' })} в ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;

          const debitTx: TransactionDetailData = {
            id: `debit_${idBase}`,
            type: 'debit',
            amount: debitAmount,
            sellerName: sellerDisplay,
            buyerName,
            adminName,
            dealStatus: context.dealStatus,
            dealBalance: context.dealBalance,
            comment: commentValue,
            createdAtLabel,
          };

          const creditTx: TransactionDetailData = {
            id: `credit_${idBase}`,
            type: 'credit',
            amount: creditAmount,
            sellerName: sellerDisplay,
            buyerName,
            adminName,
            dealStatus: context.dealStatus,
            dealBalance: context.dealBalance,
            comment: commentValue,
            createdAtLabel,
          };

          const log: RefundLogData = {
            id: `refund_${idBase}`,
            mode: context.mode,
            createdAtLabel,
            statusLabel: 'Завершен',
            comment: commentValue,
            sellerName: sellerDisplay,
            buyerName,
            adminName,
            dealStatus: context.dealStatus,
            dealBalance: context.dealBalance,
            sellerAccrued: sellerAccruedValue,
            refundAmount: breakdown.refundAmount,
            debit: debitTx,
            credit: creditTx,
            breakdown,
          };

          onRefundCompleted?.(log);
          onSuccess(`Возврат ${formatRub(breakdown.refundAmount)} выполнен`);
          resetForm();
        }}
      />
    ) : null}
    </>
  );
}
