/** All amounts in rubles with up to 2 decimal places. Internal math uses kopecks. */

export type SellerAccruedInput = {
  grossAmount: number;
  originalSellerAccrued: number;
  alreadyRefunded: number;
  refundAmount: number;
  sellerWalletBalance: number | null;
};

export type SellerAccruedResult = {
  refundAmount: number;
  remainingAmount: number;
  newSellerAccrued: number;
  sellerAccruedReduction: number;
  commissionReduction: number;
  fromSellerWallet: number;
  fromRefundBank: number;
  isFullRefund: boolean;
};

export type SellerAccruedValidation = {
  valid: boolean;
  error: string | null;
  maxRefund: number;
};

const SCALE = 100;

export function toKopecks(rubles: number): number {
  return Math.round(rubles * SCALE);
}

export function fromKopecks(kopecks: number): number {
  return kopecks / SCALE;
}

/** Seller accrued after cumulative refunds: each refund reduces accrued 1:1 until 0. */
export function calcSellerAccruedAfterRefunds(
  originalSellerAccruedKop: number,
  totalRefundedKop: number,
): number {
  return Math.max(0, originalSellerAccruedKop - totalRefundedKop);
}

/**
 * In-progress partial refund — seller accrual after this refund.
 *
 * Rules:
 * 1. Default: newAccrued = sellerAccrued − refundAmount (floored at 0).
 * 2. If refundAmount === sellerAccrued (current), commission is returned to the seller:
 *    newAccrued = remaining deal = dealAmount − alreadyRefunded − refundAmount
 *    (equals original commission when this is the first refund of the full accrued).
 */
export function calcInProgressSellerAccruedAfterPartial(
  dealAmount: number,
  sellerAccrued: number,
  alreadyRefunded: number,
  refundAmount: number,
): number {
  const dealKop = toKopecks(dealAmount);
  const accruedKop = toKopecks(sellerAccrued);
  const alreadyKop = toKopecks(alreadyRefunded);
  const refundKop = toKopecks(refundAmount);

  const previousAccruedKop = calcSellerAccruedAfterRefunds(accruedKop, alreadyKop);
  const remainingAfterKop = dealKop - alreadyKop - refundKop;

  if (refundKop === previousAccruedKop && remainingAfterKop > 0) {
    return fromKopecks(remainingAfterKop);
  }

  return fromKopecks(
    calcSellerAccruedAfterRefunds(accruedKop, alreadyKop + refundKop),
  );
}

export type InProgressPartialRelatedOps = {
  /** Списание с покупателя = сумма сделки − возврат (остаток сделки). */
  buyerDebit: number;
  /** Начисление продавцу (с правилом возврата комиссии). */
  sellerCredit: number;
};

/**
 * Related ops for in-progress partial refund.
 * - buyerDebit = deal − refund (remaining)
 * - sellerCredit = accrued − refund, or commission if refund === accrued
 */
export function calcInProgressPartialRelatedOps(
  dealAmount: number,
  sellerAccrued: number,
  alreadyRefunded: number,
  refundAmount: number,
): InProgressPartialRelatedOps {
  const remaining = getRemainingGross(dealAmount, alreadyRefunded + refundAmount);
  const sellerCredit = calcInProgressSellerAccruedAfterPartial(
    dealAmount,
    sellerAccrued,
    alreadyRefunded,
    refundAmount,
  );
  return {
    buyerDebit: remaining,
    sellerCredit,
  };
}

export function validateRefundAmount(
  grossAmount: number,
  alreadyRefunded: number,
  refundAmount: number,
  allowFullAmount = true,
): SellerAccruedValidation {
  const grossKop = toKopecks(grossAmount);
  const alreadyKop = toKopecks(alreadyRefunded);
  const maxRefund = fromKopecks(grossKop - alreadyKop);

  if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
    return {
      valid: false,
      error: 'Введите сумму больше 0 ₽',
      maxRefund,
    };
  }

  const refundKop = toKopecks(refundAmount);

  if (refundKop > grossKop - alreadyKop) {
    return {
      valid: false,
      error: `Сумма возврата не может превышать ${formatAmount(maxRefund)} ₽`,
      maxRefund,
    };
  }

  if (!allowFullAmount && refundKop >= grossKop - alreadyKop) {
    return {
      valid: false,
      error: `Сумма частичного возврата должна быть меньше ${formatAmount(maxRefund)} ₽`,
      maxRefund,
    };
  }

  return { valid: true, error: null, maxRefund };
}

export function calculateSellerAccruedRefund(
  input: SellerAccruedInput,
): SellerAccruedResult {
  const grossKop = toKopecks(input.grossAmount);
  const originalAccruedKop = toKopecks(input.originalSellerAccrued);
  const alreadyKop = toKopecks(input.alreadyRefunded);
  const refundKop = toKopecks(input.refundAmount);

  const remainingBeforeKop = grossKop - alreadyKop;
  const remainingAfterKop = remainingBeforeKop - refundKop;

  const previousAccruedKop = calcSellerAccruedAfterRefunds(
    originalAccruedKop,
    alreadyKop,
  );

  // In-progress rule: refund === accrued → commission returned to seller.
  const newAccruedKop = toKopecks(
    calcInProgressSellerAccruedAfterPartial(
      input.grossAmount,
      input.originalSellerAccrued,
      input.alreadyRefunded,
      input.refundAmount,
    ),
  );

  const sellerAccruedReductionKop = previousAccruedKop - newAccruedKop;
  const commissionReductionKop = refundKop - sellerAccruedReductionKop;

  const walletKop =
    input.sellerWalletBalance === null
      ? sellerAccruedReductionKop
      : toKopecks(input.sellerWalletBalance);

  const fromSellerWalletKop = Math.min(walletKop, sellerAccruedReductionKop);
  const fromRefundBankKop = refundKop - fromSellerWalletKop;

  return {
    refundAmount: fromKopecks(refundKop),
    remainingAmount: fromKopecks(remainingAfterKop),
    newSellerAccrued: fromKopecks(newAccruedKop),
    sellerAccruedReduction: fromKopecks(sellerAccruedReductionKop),
    commissionReduction: fromKopecks(commissionReductionKop),
    fromSellerWallet: fromKopecks(fromSellerWalletKop),
    fromRefundBank: fromKopecks(fromRefundBankKop),
    isFullRefund: remainingAfterKop <= 0,
  };
}

/** Cumulative check: multiple partial refunds equal one combined refund. */
export function calculateCumulativeRefund(
  grossAmount: number,
  originalSellerAccrued: number,
  refunds: number[],
  sellerWalletBalance: number | null = null,
): SellerAccruedResult {
  const totalRefunded = refunds.reduce((sum, r) => sum + r, 0);
  return calculateSellerAccruedRefund({
    grossAmount,
    originalSellerAccrued,
    alreadyRefunded: 0,
    refundAmount: totalRefunded,
    sellerWalletBalance,
  });
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getCommission(
  grossAmount: number,
  sellerAccrued: number,
): number {
  return Math.max(
    0,
    fromKopecks(toKopecks(grossAmount) - toKopecks(sellerAccrued)),
  );
}

export function getRemainingGross(
  grossAmount: number,
  alreadyRefunded: number,
): number {
  return fromKopecks(toKopecks(grossAmount) - toKopecks(alreadyRefunded));
}
