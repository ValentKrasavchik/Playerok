import { describe, expect, it } from 'vitest';
import {
  calculateRefund,
  getAvailableRefundOptions,
  getSellerFundableAmount,
  validatePartialAmount,
  type RefundDemoContext,
} from './refundLogic';

const baseContext: RefundDemoContext = {
  mode: 'strict',
  dealStatus: 'completed',
  dealBalance: 900,
  sellerAccrued: 850,
  sellerBalance: 800,
  alreadyRefunded: 0,
  sellerName: 'seller',
};

describe('refundLogic integration', () => {
  it('uses bank scenario when deal exceeds seller accrued despite large wallet', () => {
    const context: RefundDemoContext = {
      ...baseContext,
      dealBalance: 150,
      sellerAccrued: 100,
      sellerBalance: 800,
    };
    expect(getSellerFundableAmount(context)).toBe(100);
    expect(getAvailableRefundOptions(context)).toEqual([
      'full_with_refund_bank',
      'partial_from_seller',
      'partial_with_refund_bank',
    ]);

    const full = calculateRefund('full_with_refund_bank', context, null);
    expect(full.fromSellerBalance).toBe(100);
    expect(full.fromRefundBank).toBe(50);
  });

  it('rejects in-progress partial refund above seller accrued', () => {
    const result = validatePartialAmount('partial_from_deal', 851, {
      ...baseContext,
      dealStatus: 'in_progress',
      sellerBalance: null,
    });
    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      'Сумма частичного возврата должна быть меньше 850 ₽',
    );
  });

  it('allows completed bank partial above accrued when below deal remainder', () => {
    const result = validatePartialAmount(
      'partial_with_refund_bank',
      899,
      baseContext,
    );
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('requires bank partial refund to exceed seller fundable amount', () => {
    const tooLow = validatePartialAmount(
      'partial_with_refund_bank',
      800,
      baseContext,
    );
    expect(tooLow.valid).toBe(false);
    expect(tooLow.error).toBe(
      'Сумма частичного возврата должна быть больше 800 ₽',
    );

    const ok = validatePartialAmount(
      'partial_with_refund_bank',
      801,
      baseContext,
    );
    expect(ok.valid).toBe(true);

    const accruedLimited = validatePartialAmount(
      'partial_with_refund_bank',
      100,
      {
        ...baseContext,
        dealBalance: 150,
        sellerAccrued: 100,
        sellerBalance: 800,
      },
    );
    expect(accruedLimited.valid).toBe(false);
    expect(accruedLimited.error).toBe(
      'Сумма частичного возврата должна быть больше 100 ₽',
    );
  });

  it('rejects seller partial refund above fundable amount', () => {
    const tooHigh = validatePartialAmount(
      'partial_from_seller',
      801,
      baseContext,
    );
    expect(tooHigh.valid).toBe(false);
    expect(tooHigh.error).toBe(
      'Сумма частичного возврата не может быть больше 800 ₽',
    );

    const ok = validatePartialAmount('partial_from_seller', 800, baseContext);
    expect(ok.valid).toBe(true);

    const aboveAccrued = validatePartialAmount('partial_from_seller', 101, {
      ...baseContext,
      dealBalance: 150,
      sellerAccrued: 100,
      sellerBalance: 800,
    });
    expect(aboveAccrued.valid).toBe(false);
    expect(aboveAccrued.error).toBe(
      'Сумма частичного возврата не может быть больше 100 ₽',
    );
  });

  it('allows partial refund equal to seller accrued', () => {
    const result = validatePartialAmount('partial_from_deal', 850, {
      ...baseContext,
      dealStatus: 'in_progress',
      sellerBalance: null,
    });
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('calculates 100 refund as accrued − refund', () => {
    const breakdown = calculateRefund(
      'partial_from_deal',
      {
        ...baseContext,
        dealStatus: 'in_progress',
        sellerBalance: null,
      },
      100,
    );
    expect(breakdown.refundAmount).toBe(100);
    expect(breakdown.newSellerAccrued).toBe(750);
    expect(breakdown.sellerAccruedReduction).toBe(100);
    expect(breakdown.commissionReduction).toBe(0);
  });

  it('calculates 850 refund (= accrued): seller keeps commission', () => {
    const breakdown = calculateRefund(
      'partial_from_deal',
      {
        ...baseContext,
        dealStatus: 'in_progress',
        sellerBalance: null,
      },
      850,
    );
    expect(breakdown.refundAmount).toBe(850);
    expect(breakdown.newSellerAccrued).toBe(50);
    expect(breakdown.sellerAccruedReduction).toBe(800);
    expect(breakdown.commissionReduction).toBe(50);
  });

  it('uses seller wallet cap for funding', () => {
    const breakdown = calculateRefund(
      'partial_from_seller',
      { ...baseContext, sellerBalance: 400 },
      850,
    );
    expect(breakdown.fromSellerBalance).toBe(400);
    expect(breakdown.fromRefundBank).toBe(450);
  });

  it('respects already refunded amount', () => {
    const context = { ...baseContext, alreadyRefunded: 100 };
    const invalid = validatePartialAmount('partial_from_seller', 800, context);
    expect(invalid.valid).toBe(false);

    const ok = validatePartialAmount('partial_from_seller', 750, context);
    expect(ok.valid).toBe(true);

    const breakdown = calculateRefund('partial_from_seller', context, 750);
    expect(breakdown.remainingAmount).toBe(50);
    expect(breakdown.newSellerAccrued).toBe(50);
  });
});
