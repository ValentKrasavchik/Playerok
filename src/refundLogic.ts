import {
  calculateSellerAccruedRefund,
  getCommission,
  getRemainingGross,
  validateRefundAmount,
} from './sellerAccruedLogic';

export type DealStatus = 'in_progress' | 'completed';

export type RefundMode = 'strict';

export type RefundDemoContext = {
  mode: RefundMode;
  dealStatus: DealStatus;
  /** Исходная сумма сделки (gross). */
  dealBalance: number;
  /** Начислено продавцу по сделке — не путать с балансом кошелька. */
  sellerAccrued: number | null;
  /** Фактический баланс кошелька продавца. */
  sellerBalance: number | null;
  /** Сумма уже завершённых возвратов по сделке. */
  alreadyRefunded: number;
  sellerName: string;
};

export type RefundOptionId =
  | 'full_from_deal'
  | 'partial_from_deal'
  | 'amount_from_deal'
  | 'full_from_seller'
  | 'partial_from_seller'
  | 'full_with_refund_bank'
  | 'partial_with_refund_bank'
  | 'full_from_refund_bank'
  | 'partial_from_refund_bank'
  | 'amount_from_refund_bank';

export type RefundBreakdown = {
  refundAmount: number;
  fromDealBalance: number;
  fromSellerBalance: number;
  fromRefundBank: number;
  remainingAmount: number;
  newSellerAccrued: number;
  sellerAccruedReduction: number;
  commissionReduction: number;
};

export type ValidationResult = {
  valid: boolean;
  error: string | null;
};

function remainingGross(context: RefundDemoContext): number {
  return getRemainingGross(context.dealBalance, context.alreadyRefunded);
}

function sellerAccruedOrZero(context: RefundDemoContext): number {
  if (context.sellerAccrued !== null) {
    return context.sellerAccrued;
  }
  return remainingGross(context);
}

/** Сколько ещё можно списать с продавца по этой сделке (не больше начисления и кошелька). */
export function getSellerFundableAmount(context: RefundDemoContext): number {
  const wallet = context.sellerBalance ?? 0;
  if (wallet <= 0) {
    return 0;
  }

  if (context.sellerAccrued === null) {
    return wallet;
  }

  const currentAccrued = calculateSellerAccruedRefund({
    grossAmount: context.dealBalance,
    originalSellerAccrued: context.sellerAccrued,
    alreadyRefunded: 0,
    refundAmount: context.alreadyRefunded,
    sellerWalletBalance: null,
  }).newSellerAccrued;

  return Math.min(wallet, currentAccrued);
}

function buildEconomicBreakdown(
  context: RefundDemoContext,
  refundAmount: number,
  fromDealBalance: number,
): RefundBreakdown {
  const economic = calculateSellerAccruedRefund({
    grossAmount: context.dealBalance,
    originalSellerAccrued: sellerAccruedOrZero(context),
    alreadyRefunded: context.alreadyRefunded,
    refundAmount,
    sellerWalletBalance: context.sellerBalance,
  });

  return {
    refundAmount: economic.refundAmount,
    fromDealBalance,
    fromSellerBalance: economic.fromSellerWallet,
    fromRefundBank: economic.fromRefundBank,
    remainingAmount: economic.remainingAmount,
    newSellerAccrued: economic.newSellerAccrued,
    sellerAccruedReduction: economic.sellerAccruedReduction,
    commissionReduction: economic.commissionReduction,
  };
}

export function getAvailableRefundOptions(
  context: RefundDemoContext,
): RefundOptionId[] {
  const remaining = remainingGross(context);

  if (remaining <= 0) {
    return [];
  }

  if (context.dealStatus === 'in_progress') {
    return ['full_from_deal', 'partial_from_deal'];
  }

  // С продавца нельзя взять больше «Начислено продавцу», даже если кошелёк больше.
  const sellerCover = getSellerFundableAmount(context);

  if (sellerCover >= remaining) {
    return ['full_from_seller', 'partial_from_seller'];
  }

  if (sellerCover > 0) {
    return [
      'full_with_refund_bank',
      'partial_from_seller',
      'partial_with_refund_bank',
    ];
  }

  return ['full_from_refund_bank', 'partial_from_refund_bank'];
}

export function showSellerInHeader(context: RefundDemoContext): boolean {
  return (
    context.dealStatus === 'completed' &&
    context.sellerBalance !== null &&
    context.sellerBalance > 0
  );
}

export function showSellerAccruedInHeader(context: RefundDemoContext): boolean {
  return context.sellerAccrued !== null && context.sellerAccrued > 0;
}

export function isPartialOption(option: RefundOptionId): boolean {
  return option.startsWith('partial_');
}

export function requiresAmountInput(option: RefundOptionId): boolean {
  return (
    isPartialOption(option) ||
    option === 'amount_from_deal' ||
    option === 'amount_from_refund_bank'
  );
}

export function isSingleAmountOption(option: RefundOptionId): boolean {
  return option === 'amount_from_deal' || option === 'amount_from_refund_bank';
}

export function getOptionCopy(option: RefundOptionId): {
  title: string;
  description: string;
} {
  switch (option) {
    case 'full_from_deal':
      return {
        title: 'Полный возврат',
        description:
          'Возврат будет произведен покупателю в полном объеме из средств сделки',
      };
    case 'partial_from_deal':
      return {
        title: 'Частичный возврат',
        description: 'Укажите сумму, которую необходимо вернуть покупателю',
      };
    case 'amount_from_deal':
      return {
        title: 'Возврат с баланса сделки',
        description:
          'Напишите сумму, которая будет списана с баланса сделки, и возвращена покупателю',
      };
    case 'amount_from_refund_bank':
      return {
        title: 'Возврат с банка возвратов',
        description:
          'Напишите сумму, которая будет списана с банка возвратов и возвращена покупателю',
      };
    case 'full_from_seller':
      return {
        title: 'С баланса продавца',
        description:
          'Возврат будет произведен покупателю в полном объеме с баланса продавца',
      };
    case 'partial_from_seller':
      return {
        title: 'Частичный возврат с баланса продавца',
        description: 'Укажите сумму, которую необходимо вернуть покупателю',
      };
    case 'full_with_refund_bank':
      return {
        title: 'Банк возвратов',
        description:
          'Возврат будет произведен за счет баланса продавца, а недостающая сумма - из банка возвратов',
      };
    case 'partial_with_refund_bank':
      return {
        title: 'Частичный возврат из банка возвратов',
        description:
          'Укажите сумму возврата. Средства с баланса продавца будут использованы в первую очередь, недостающая сумма - из банка возвратов',
      };
    case 'full_from_refund_bank':
      return {
        title: 'Банк возвратов',
        description:
          'Возврат будет произведен покупателю в полном объеме из банка возвратов',
      };
    case 'partial_from_refund_bank':
      return {
        title: 'Частичный возврат из банка возвратов',
        description:
          'Укажите сумму, которую необходимо вернуть покупателю из банка возвратов',
      };
  }
}

export function validatePartialAmount(
  option: RefundOptionId,
  enteredAmount: number,
  context: RefundDemoContext,
): ValidationResult {
  const remaining = remainingGross(context);
  const isPartial = isPartialOption(option);

  // allowFullAmount=true: only bounds vs deal remainder; partial caps checked below
  const result = validateRefundAmount(
    context.dealBalance,
    context.alreadyRefunded,
    enteredAmount,
    true,
  );

  if (!result.valid) {
    return { valid: result.valid, error: result.error };
  }

  if (isPartial && context.sellerAccrued !== null && context.dealStatus === 'in_progress') {
    const currentAccrued = calculateSellerAccruedRefund({
      grossAmount: context.dealBalance,
      originalSellerAccrued: context.sellerAccrued,
      alreadyRefunded: 0,
      refundAmount: context.alreadyRefunded,
      sellerWalletBalance: null,
    }).newSellerAccrued;

    if (enteredAmount > currentAccrued) {
      return {
        valid: false,
        error: `Сумма частичного возврата должна быть меньше ${formatRub(currentAccrued)}`,
      };
    }
  }

  if (isPartial && enteredAmount >= remaining) {
    const cap =
      context.dealStatus === 'in_progress' && context.sellerAccrued !== null
        ? calculateSellerAccruedRefund({
            grossAmount: context.dealBalance,
            originalSellerAccrued: context.sellerAccrued,
            alreadyRefunded: 0,
            refundAmount: context.alreadyRefunded,
            sellerWalletBalance: null,
          }).newSellerAccrued
        : remaining;

    return {
      valid: false,
      error: `Сумма частичного возврата должна быть меньше ${formatRub(cap)}`,
    };
  }

  if (option === 'partial_with_refund_bank') {
    const sellerCover = getSellerFundableAmount(context);
    if (enteredAmount <= sellerCover) {
      return {
        valid: false,
        error: `Сумма частичного возврата должна быть больше ${formatRub(sellerCover)}`,
      };
    }
  }

  if (option === 'partial_from_seller') {
    const sellerCover = getSellerFundableAmount(context);
    if (enteredAmount > sellerCover) {
      return {
        valid: false,
        error: `Сумма частичного возврата не может быть больше ${formatRub(sellerCover)}`,
      };
    }
  }

  return { valid: true, error: null };
}

export function calculateRefund(
  option: RefundOptionId,
  context: RefundDemoContext,
  enteredAmount: number | null,
): RefundBreakdown {
  const remaining = remainingGross(context);
  const empty: RefundBreakdown = {
    refundAmount: 0,
    fromDealBalance: 0,
    fromSellerBalance: 0,
    fromRefundBank: 0,
    remainingAmount: remaining,
    newSellerAccrued: 0,
    sellerAccruedReduction: 0,
    commissionReduction: 0,
  };

  if (!option || remaining <= 0) {
    return empty;
  }

  switch (option) {
    case 'full_from_deal':
      return buildEconomicBreakdown(context, remaining, remaining);

    case 'partial_from_deal':
    case 'amount_from_deal': {
      const amount = enteredAmount ?? 0;
      return buildEconomicBreakdown(context, amount, amount);
    }

    case 'full_from_seller':
      return buildEconomicBreakdown(context, remaining, 0);

    case 'partial_from_seller':
    case 'partial_with_refund_bank':
    case 'partial_from_refund_bank':
    case 'amount_from_refund_bank': {
      const amount = enteredAmount ?? 0;
      return buildEconomicBreakdown(context, amount, 0);
    }

    case 'full_with_refund_bank':
      return buildEconomicBreakdown(context, remaining, 0);

    case 'full_from_refund_bank':
      return buildEconomicBreakdown(context, remaining, 0);

    default:
      return empty;
  }
}

export function formatRub(value: number): string {
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} ₽`;
}

export function formatRubSigned(value: number): string {
  if (value === 0) return `0 ₽`;
  const formatted = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
  return `−${formatted} ₽`;
}

export function showsRefundBankLine(option: RefundOptionId): boolean {
  return (
    option === 'full_with_refund_bank' ||
    option === 'partial_with_refund_bank' ||
    option === 'full_from_refund_bank' ||
    option === 'partial_from_refund_bank' ||
    option === 'amount_from_refund_bank'
  );
}

export { getCommission, getRemainingGross };
