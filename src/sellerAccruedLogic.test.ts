import { describe, expect, it } from 'vitest';
import {
  calculateCumulativeRefund,
  calculateSellerAccruedRefund,
  calcInProgressPartialRelatedOps,
  fromKopecks,
  toKopecks,
} from './sellerAccruedLogic';

const GROSS = 900;
const ACCRUED = 850;

function refund(
  amount: number,
  alreadyRefunded = 0,
  wallet: number | null = null,
) {
  return calculateSellerAccruedRefund({
    grossAmount: GROSS,
    originalSellerAccrued: ACCRUED,
    alreadyRefunded,
    refundAmount: amount,
    sellerWalletBalance: wallet,
  });
}

describe('calculateSellerAccruedRefund (accrued − refund)', () => {
  it('100 ₽ refund → seller accrued 750', () => {
    const r = refund(100);
    expect(r.refundAmount).toBe(100);
    expect(r.remainingAmount).toBe(800);
    expect(r.newSellerAccrued).toBe(750);
    expect(r.sellerAccruedReduction).toBe(100);
    expect(r.commissionReduction).toBe(0);
  });

  it('850 ₽ refund (= accrued) → seller keeps commission 50', () => {
    const r = refund(850);
    expect(r.remainingAmount).toBe(50);
    expect(r.newSellerAccrued).toBe(50);
    expect(r.sellerAccruedReduction).toBe(800);
    expect(r.commissionReduction).toBe(50);
  });

  it('related ops: refund === accrued returns commission as seller credit', () => {
    const ops = calcInProgressPartialRelatedOps(GROSS, ACCRUED, 0, 850);
    expect(ops.buyerDebit).toBe(50);
    expect(ops.sellerCredit).toBe(50);
  });

  it('related ops: refund 200 → buyer 700, seller 650', () => {
    const ops = calcInProgressPartialRelatedOps(GROSS, ACCRUED, 0, 200);
    expect(ops.buyerDebit).toBe(700);
    expect(ops.sellerCredit).toBe(650);
  });

  it('880 ₽ refund: seller 0, reduction 850, commission 30', () => {
    const r = refund(880);
    expect(r.refundAmount).toBe(880);
    expect(r.remainingAmount).toBe(20);
    expect(r.newSellerAccrued).toBe(0);
    expect(r.sellerAccruedReduction).toBe(850);
    expect(r.commissionReduction).toBe(30);
    expect(r.sellerAccruedReduction + r.commissionReduction).toBe(880);
  });

  it.each([
    [10, 890, 840, 10, 0],
    [50, 850, 800, 50, 0],
    [100, 800, 750, 100, 0],
    [850, 50, 50, 800, 50],
    [880, 20, 0, 850, 30],
    [899, 1, 0, 850, 49],
    [900, 0, 0, 850, 50],
  ])(
    'refund %i → remaining %i, newAccrued %i, sellerReduction %i, commission %i',
    (refundAmount, remaining, newAccrued, sellerReduction, commission) => {
      const r = refund(refundAmount);
      expect(r.remainingAmount).toBe(remaining);
      expect(r.newSellerAccrued).toBe(newAccrued);
      expect(r.sellerAccruedReduction).toBe(sellerReduction);
      expect(r.commissionReduction).toBe(commission);
      expect(r.newSellerAccrued).toBeLessThanOrEqual(ACCRUED);
    },
  );

  it('9800 refund on 10000/9000 deal', () => {
    const r = calculateSellerAccruedRefund({
      grossAmount: 10_000,
      originalSellerAccrued: 9_000,
      alreadyRefunded: 0,
      refundAmount: 9_800,
      sellerWalletBalance: null,
    });
    expect(r.refundAmount).toBe(9_800);
    expect(r.remainingAmount).toBe(200);
    expect(r.newSellerAccrued).toBe(0);
    expect(r.sellerAccruedReduction).toBe(9_000);
    expect(r.commissionReduction).toBe(800);
  });

  it('allows refund equal to sellerAccrued (850)', () => {
    const r = refund(850);
    expect(r.refundAmount).toBe(850);
    expect(r.newSellerAccrued).toBe(50);
    expect(r.sellerAccruedReduction).toBe(800);
    expect(r.commissionReduction).toBe(50);
  });

  it('funds from seller wallet capped by sellerAccruedReduction', () => {
    const r = refund(850, 0, 400);
    expect(r.sellerAccruedReduction).toBe(800);
    expect(r.fromSellerWallet).toBe(400);
    expect(r.fromRefundBank).toBe(450);
    expect(r.commissionReduction).toBe(50);
  });

  it('does not debit seller wallet beyond accrued reduction', () => {
    const r = refund(880, 0, 900);
    expect(r.fromSellerWallet).toBe(850);
    expect(r.fromRefundBank).toBe(30);
    expect(r.fromSellerWallet).not.toBe(880);
  });
});

describe('cumulative partial refunds', () => {
  it('100 + 780 equals single 880 refund', () => {
    const single = refund(880);
    const cumulative = calculateCumulativeRefund(GROSS, ACCRUED, [100, 780]);
    expect(cumulative.remainingAmount).toBe(single.remainingAmount);
    expect(cumulative.newSellerAccrued).toBe(single.newSellerAccrued);
    expect(cumulative.sellerAccruedReduction).toBe(single.sellerAccruedReduction);
  });

  it('sequential refunds match cumulative formula', () => {
    const first = refund(100, 0);
    expect(first.newSellerAccrued).toBe(750);
    expect(first.sellerAccruedReduction).toBe(100);

    const second = refund(750, 100);
    expect(second.newSellerAccrued).toBe(50);
    expect(second.sellerAccruedReduction).toBe(700);
    expect(second.remainingAmount).toBe(50);
  });
});

describe('kopeck rounding invariant', () => {
  it('sellerAccruedReduction + commissionReduction = refundAmount in kopecks', () => {
    for (const amount of [1, 50, 100, 850, 880, 899, 900]) {
      const r = refund(amount);
      const sumKop =
        toKopecks(r.sellerAccruedReduction) + toKopecks(r.commissionReduction);
      expect(sumKop).toBe(toKopecks(amount));
    }
  });

  it('uses integer kopecks internally', () => {
    expect(toKopecks(18.89)).toBe(1889);
    expect(fromKopecks(1889)).toBe(18.89);
  });
});
