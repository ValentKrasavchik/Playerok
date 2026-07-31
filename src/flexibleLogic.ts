import type { RefundDemoContext, ValidationResult } from './refundLogic';

export type FlexibleAllocation = {
  fromSeller: number;
  fromBank: number;
};

export type FlexibleDefaults = {
  sellerRaw: string;
  bankRaw: string;
  showSellerField: boolean;
  sellerLocked: boolean;
};

export function getFlexibleDefaults(
  context: RefundDemoContext,
): FlexibleDefaults {
  const deal = context.dealBalance;

  if (context.dealStatus === 'in_progress') {
    return {
      sellerRaw: String(deal),
      bankRaw: '0',
      showSellerField: true,
      sellerLocked: false,
    };
  }

  const sellerBalance = context.sellerBalance ?? 0;

  if (sellerBalance <= 0) {
    return {
      sellerRaw: '0',
      bankRaw: String(deal),
      showSellerField: true,
      sellerLocked: true,
    };
  }

  const fromSeller = Math.min(sellerBalance, deal);
  const fromBank = deal - fromSeller;

  return {
    sellerRaw: String(fromSeller),
    bankRaw: String(fromBank),
    showSellerField: true,
    sellerLocked: false,
  };
}

export function isSellerCleared(raw: string): boolean {
  const trimmed = raw.trim();
  if (trimmed === '') return true;
  const value = Number(trimmed.replace(',', '.'));
  return Number.isFinite(value) && value === 0;
}

export function recalcSellerFromBank(
  context: RefundDemoContext,
  bankAmount: number,
): number {
  const next = Math.max(0, context.dealBalance - bankAmount);

  if (context.dealStatus === 'completed') {
    const sellerCap = context.sellerBalance ?? 0;
    return Math.min(next, sellerCap);
  }

  return next;
}

export function validateFlexibleAllocation(
  context: RefundDemoContext,
  sellerRaw: string,
  bankRaw: string,
  showSellerField: boolean,
): ValidationResult & { allocation: FlexibleAllocation } {
  const empty = {
    allocation: { fromSeller: 0, fromBank: 0 },
  };

  const sellerParsed =
    sellerRaw.trim() === ''
      ? 0
      : Number(sellerRaw.trim().replace(',', '.'));
  const bankParsed =
    bankRaw.trim() === '' ? 0 : Number(bankRaw.trim().replace(',', '.'));

  if (
    (showSellerField &&
      sellerRaw.trim() !== '' &&
      !Number.isFinite(sellerParsed)) ||
    (bankRaw.trim() !== '' && !Number.isFinite(bankParsed))
  ) {
    return {
      valid: false,
      error: 'Введите корректную сумму',
      ...empty,
    };
  }

  const fromSeller = showSellerField ? Math.max(0, sellerParsed || 0) : 0;
  const fromBank = Math.max(0, bankParsed || 0);
  const allocation = { fromSeller, fromBank };
  const total = fromSeller + fromBank;

  if (fromSeller < 0 || fromBank < 0) {
    return {
      valid: false,
      error: 'Сумма не может быть отрицательной',
      allocation,
    };
  }

  if (fromSeller > context.dealBalance) {
    return {
      valid: false,
      error: 'Сумма продавца не может быть больше баланса сделки',
      allocation,
    };
  }

  if (fromBank > context.dealBalance) {
    return {
      valid: false,
      error: 'Сумма банка возвратов не может быть больше баланса сделки',
      allocation,
    };
  }

  if (total > context.dealBalance) {
    return {
      valid: false,
      error: 'Сумма возврата не может быть больше баланса сделки',
      allocation,
    };
  }

  if (
    context.dealStatus === 'completed' &&
    context.sellerBalance !== null &&
    fromSeller > context.sellerBalance
  ) {
    return {
      valid: false,
      error: 'Сумма продавца не может быть больше баланса продавца',
      allocation,
    };
  }

  if (total <= 0) {
    return {
      valid: false,
      error: 'Укажите сумму возврата',
      allocation,
    };
  }

  return {
    valid: true,
    error: null,
    allocation,
  };
}
