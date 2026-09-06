import { useMemo, useState } from 'react';
import { Radio } from './Radio';
import {
  calculateRefund,
  formatRub,
  getAvailableRefundOptions,
  getOptionCopy,
  getRemainingGross,
  getSellerFundableAmount,
  isPartialOption,
  requiresAmountInput,
  validatePartialAmount,
  type RefundDemoContext,
  type RefundOptionId,
} from '../refundLogic';
import { parseAmount } from '../utils';
import { assetUrl } from '../assets';
import {
  calcInProgressPartialRelatedOps,
  calcInProgressSellerAccruedAfterPartial,
} from '../sellerAccruedLogic';

export type ScenarioDemoConfig = {
  dealBalance: number;
  sellerAccrued: number | null;
  sellerBalance: number | null;
  dealStatus: 'in_progress' | 'completed';
  /** Options that belong to this scenario; others are shown but locked */
  activeOptions: RefundOptionId[];
  /** Prefer this option on first render if available */
  preferOption?: RefundOptionId;
  /** Suggested amount for seller-only / in-progress partial */
  suggestedPartial?: number;
  /** Suggested amount for partial that involves the refund bank */
  suggestedBankPartial?: number;
};

type ScenarioInteractiveProps = {
  demo: ScenarioDemoConfig;
};

type RelatedRow = {
  label: string;
  amountLabel: string;
  tone: 'debit' | 'credit' | 'bank';
};

function buildContext(demo: ScenarioDemoConfig): RefundDemoContext {
  return {
    mode: 'strict',
    dealStatus: demo.dealStatus,
    dealBalance: demo.dealBalance,
    sellerAccrued: demo.sellerAccrued,
    sellerBalance: demo.sellerBalance,
    alreadyRefunded: 0,
    sellerName: 'Продавец',
  };
}

function amountForOption(
  option: RefundOptionId,
  demo: ScenarioDemoConfig,
  sellerFundable: number,
): string {
  if (!requiresAmountInput(option)) return '';

  if (option === 'partial_with_refund_bank') {
    if (demo.suggestedBankPartial != null) {
      return String(demo.suggestedBankPartial);
    }
    if (demo.suggestedPartial != null && demo.suggestedPartial > sellerFundable) {
      return String(demo.suggestedPartial);
    }
    return String(
      Math.min(
        demo.dealBalance,
        Math.max(sellerFundable + 1, Math.round(sellerFundable * 1.5) || 1),
      ),
    );
  }

  if (option === 'partial_from_seller') {
    const raw = demo.suggestedPartial ?? Math.max(1, Math.round(sellerFundable / 2));
    return String(Math.min(raw, sellerFundable));
  }

  if (demo.suggestedPartial != null) {
    return String(demo.suggestedPartial);
  }

  return '';
}

export function ScenarioInteractive({ demo }: ScenarioInteractiveProps) {
  const context = useMemo(() => buildContext(demo), [demo]);
  const options = useMemo(
    () => getAvailableRefundOptions(context),
    [context],
  );
  const remaining = getRemainingGross(context.dealBalance, 0);
  const sellerFundable = getSellerFundableAmount(context);

  const initialOption =
    (demo.preferOption &&
    options.includes(demo.preferOption) &&
    demo.activeOptions.includes(demo.preferOption)
      ? demo.preferOption
      : demo.activeOptions.find((id) => options.includes(id)) ??
        options[0]) ?? null;

  const [selected, setSelected] = useState<RefundOptionId | null>(initialOption);
  const [amountRaw, setAmountRaw] = useState(() =>
    initialOption ? amountForOption(initialOption, demo, sellerFundable) : '',
  );

  const isOptionActive = (option: RefundOptionId) =>
    demo.activeOptions.includes(option);

  const handleSelect = (option: RefundOptionId) => {
    if (!isOptionActive(option)) return;
    setSelected(option);
    if (requiresAmountInput(option)) {
      setAmountRaw(amountForOption(option, demo, sellerFundable));
    } else {
      setAmountRaw('');
    }
  };

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
  }, [selected, needsAmount, enteredAmount, context]);

  const breakdown = useMemo(() => {
    if (!selected || (needsAmount && !validation.valid)) {
      return null;
    }
    return calculateRefund(
      selected,
      context,
      needsAmount ? enteredAmount : null,
    );
  }, [selected, needsAmount, validation.valid, context, enteredAmount]);

  const sellerAccruedValue = context.sellerAccrued ?? 0;
  const isInProgressPartial =
    context.dealStatus === 'in_progress' &&
    breakdown !== null &&
    breakdown.remainingAmount > 0;

  const displaySources = useMemo(() => {
    if (!breakdown) {
      return { deal: 0, seller: 0, bank: 0, total: 0 };
    }
    if (context.dealStatus === 'in_progress') {
      return {
        deal: breakdown.refundAmount,
        seller: 0,
        bank: 0,
        total: breakdown.refundAmount,
      };
    }
    return {
      deal: breakdown.fromDealBalance,
      seller: breakdown.fromSellerBalance,
      bank: breakdown.fromRefundBank,
      total: breakdown.refundAmount,
    };
  }, [breakdown, context.dealStatus]);

  const relatedRows = useMemo((): RelatedRow[] => {
    if (!breakdown || !validation.valid) return [];

    if (isInProgressPartial) {
      const related = calcInProgressPartialRelatedOps(
        context.dealBalance,
        sellerAccruedValue,
        0,
        breakdown.refundAmount,
      );
      const rows: RelatedRow[] = [];
      if (related.buyerDebit > 0) {
        rows.push({
          label: 'Списание с покупателя (остаток сделки)',
          amountLabel: `−${formatRub(related.buyerDebit)}`,
          tone: 'debit',
        });
      }
      if (related.sellerCredit > 0) {
        rows.push({
          label: 'Начисление продавцу',
          amountLabel: `+${formatRub(related.sellerCredit)}`,
          tone: 'credit',
        });
      }
      return rows;
    }

    if (context.dealStatus === 'completed') {
      const rows: RelatedRow[] = [];
      if (displaySources.seller > 0) {
        rows.push({
          label: 'Списание с продавца',
          amountLabel: `−${formatRub(displaySources.seller)}`,
          tone: 'debit',
        });
      }
      if (displaySources.bank > 0) {
        rows.push({
          label: 'Списано с банка возвратов',
          amountLabel: `−${formatRub(displaySources.bank)}`,
          tone: 'bank',
        });
      }
      rows.push({
        label: 'Начисление покупателю',
        amountLabel: `+${formatRub(breakdown.refundAmount)}`,
        tone: 'credit',
      });
      return rows;
    }

    return [];
  }, [
    breakdown,
    validation.valid,
    isInProgressPartial,
    context,
    sellerAccruedValue,
    displaySources,
  ]);

  const sellerKeeps = useMemo(() => {
    if (!breakdown || context.dealStatus !== 'in_progress') return null;
    if (isInProgressPartial) {
      return calcInProgressSellerAccruedAfterPartial(
        context.dealBalance,
        sellerAccruedValue,
        0,
        breakdown.refundAmount,
      );
    }
    return 0;
  }, [breakdown, context, isInProgressPartial, sellerAccruedValue]);

  const totalBar = displaySources.total > 0 ? displaySources.total : remaining;
  const dealPct = totalBar > 0 ? (displaySources.deal / totalBar) * 100 : 0;
  const sellerPct = totalBar > 0 ? (displaySources.seller / totalBar) * 100 : 0;
  const bankPct = totalBar > 0 ? (displaySources.bank / totalBar) * 100 : 0;
  const hasHeldOptions = options.some((option) => !isOptionActive(option));
  const multiActive =
    demo.activeOptions.filter((id) => options.includes(id)).length > 1;
  const statusLabel =
    context.dealStatus === 'in_progress' ? 'В процессе' : 'Завершена';

  return (
    <div className="scenario-demo">
      <div className="scenario-demo__toolbar">
        <p className="scenario-demo__label">Интерактивный пример</p>
        <p className="scenario-demo__hint">
          {hasHeldOptions && !multiActive
            ? 'Активен вариант этого сценария. Остальные показаны для контекста и заблокированы.'
            : multiActive
              ? 'Можно переключать варианты этого сценария — полный и частичный — и менять сумму.'
              : 'Измените сумму при необходимости — ниже видно, откуда берутся средства.'}
        </p>
      </div>

      <div className="scenario-demo__meta">
        <span>
          Статус <strong>{statusLabel}</strong>
        </span>
        <span>
          Сделка <strong>{formatRub(demo.dealBalance)}</strong>
        </span>
        {demo.sellerAccrued !== null ? (
          <span>
            Начислено <strong>{formatRub(demo.sellerAccrued)}</strong>
          </span>
        ) : null}
        {demo.sellerBalance !== null ? (
          <span>
            Баланс продавца <strong>{formatRub(demo.sellerBalance)}</strong>
          </span>
        ) : null}
        {context.dealStatus === 'completed' && sellerFundable > 0 ? (
          <span>
            Доступно с продавца <strong>{formatRub(sellerFundable)}</strong>
          </span>
        ) : null}
      </div>

      <div
        className="scenario-demo__options"
        role="listbox"
        aria-label="Варианты возврата"
      >
        {options.map((option) => {
          const copy = getOptionCopy(option);
          const isActive = isOptionActive(option);
          const isSelected = selected === option;
          const showAmount =
            requiresAmountInput(option) && isSelected && isActive;
          const showError =
            isSelected && isActive && needsAmount && validation.error !== null;
          const showBankHint =
            isSelected &&
            isActive &&
            context.dealStatus === 'completed' &&
            displaySources.bank > 0 &&
            !isPartialOption(option);
          const showPartialBankHint =
            isSelected &&
            isActive &&
            context.dealStatus === 'completed' &&
            displaySources.bank > 0 &&
            isPartialOption(option);
          const showSellerAccruedHint =
            isSelected &&
            isActive &&
            isPartialOption(option) &&
            context.dealStatus === 'in_progress' &&
            breakdown !== null &&
            validation.valid &&
            sellerKeeps !== null;
          const showBuyerRefundHint =
            isSelected &&
            isActive &&
            isPartialOption(option) &&
            context.dealStatus === 'completed' &&
            breakdown !== null &&
            validation.valid &&
            displaySources.bank === 0;

          return (
            <div
              key={option}
              className={[
                'option-card',
                'scenario-demo__card',
                isSelected && isActive ? 'option-card--selected' : '',
                !isActive ? 'scenario-demo__card--held' : '',
                showError ? 'option-card--error' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role="option"
              aria-selected={isSelected && isActive}
              aria-disabled={!isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => handleSelect(option)}
              onKeyDown={(event) => {
                if (!isActive) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleSelect(option);
                }
              }}
            >
              <div className="option-card__main">
                <Radio checked={isSelected && isActive} />
                <div className="option-card__text">
                  <p className="option-card__title">{copy.title}</p>
                  <p className="option-card__desc">{copy.description}</p>
                </div>
              </div>

              {!isActive ? (
                <p className="scenario-demo__held-label">Не в этом сценарии</p>
              ) : null}

              {showAmount ? (
                <input
                  className="field field--amount"
                  placeholder="Сумма"
                  inputMode="decimal"
                  value={amountRaw}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => setAmountRaw(event.target.value)}
                />
              ) : null}

              {showError ? (
                <p className="option-card__error">{validation.error}</p>
              ) : null}

              {showSellerAccruedHint && sellerKeeps !== null ? (
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
                      {formatRub(sellerKeeps)}
                    </span>
                  </p>
                </div>
              ) : null}

              {showBankHint || showPartialBankHint ? (
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
                      {formatRub(displaySources.bank)}
                    </span>
                  </p>
                </div>
              ) : null}

              {showBuyerRefundHint && breakdown ? (
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
                      {formatRub(breakdown.refundAmount)}
                    </span>{' '}
                    из{' '}
                    <span className="option-card__hint-amount">
                      {formatRub(context.dealBalance)}
                    </span>
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="scenario-demo__result">
        <h4 className="scenario-demo__result-title">Откуда идут средства</h4>
        {breakdown && validation.valid && displaySources.total > 0 ? (
          <>
            <div
              className="scenario-demo__bar"
              role="img"
              aria-label="Разбивка источников возврата"
            >
              {displaySources.deal > 0 ? (
                <span
                  className="scenario-demo__seg scenario-demo__seg--deal"
                  style={{ width: `${dealPct}%` }}
                  title={`Сделка: ${formatRub(displaySources.deal)}`}
                />
              ) : null}
              {displaySources.seller > 0 ? (
                <span
                  className="scenario-demo__seg scenario-demo__seg--seller"
                  style={{ width: `${sellerPct}%` }}
                  title={`Продавец: ${formatRub(displaySources.seller)}`}
                />
              ) : null}
              {displaySources.bank > 0 ? (
                <span
                  className="scenario-demo__seg scenario-demo__seg--bank"
                  style={{ width: `${bankPct}%` }}
                  title={`Банк: ${formatRub(displaySources.bank)}`}
                />
              ) : null}
            </div>
            <ul className="scenario-demo__legend">
              {displaySources.deal > 0 ? (
                <li>
                  <span className="scenario-demo__dot scenario-demo__dot--deal" />
                  Сделка <strong>{formatRub(displaySources.deal)}</strong>
                </li>
              ) : null}
              {displaySources.seller > 0 ? (
                <li>
                  <span className="scenario-demo__dot scenario-demo__dot--seller" />
                  Баланс продавца{' '}
                  <strong>{formatRub(displaySources.seller)}</strong>
                </li>
              ) : null}
              {displaySources.bank > 0 ? (
                <li>
                  <span className="scenario-demo__dot scenario-demo__dot--bank" />
                  Банк возвратов{' '}
                  <strong>{formatRub(displaySources.bank)}</strong>
                </li>
              ) : null}
            </ul>
          </>
        ) : (
          <p className="scenario-demo__empty">
            {needsAmount && !amountRaw
              ? 'Укажите сумму частичного возврата'
              : (validation.error ?? 'Выберите вариант возврата')}
          </p>
        )}

        {breakdown && validation.valid ? (
          <dl className="scenario-demo__outcomes">
            <div>
              <dt>Покупатель получит</dt>
              <dd>{formatRub(breakdown.refundAmount)}</dd>
            </div>
            {sellerKeeps !== null ? (
              <div>
                <dt>Продавцу останется к начислению</dt>
                <dd>{formatRub(sellerKeeps)}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {relatedRows.length > 0 ? (
          <div className="scenario-demo__related">
            <h4 className="scenario-demo__result-title">Связанные операции</h4>
            <ul className="scenario-demo__related-list">
              {relatedRows.map((row) => (
                <li
                  key={row.label}
                  className={`scenario-demo__related-row scenario-demo__related-row--${row.tone}`}
                >
                  <span>{row.label}</span>
                  <strong>{row.amountLabel}</strong>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
