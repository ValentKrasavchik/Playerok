export type DealStatus = 'in_progress' | 'completed';

export type RefundMode = 'strict' | 'strict_v2' | 'flexible';

export type RefundDemoContext = {
  mode: RefundMode;
  dealStatus: DealStatus;
  dealBalance: number;
  sellerBalance: number | null;
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
};

export type ValidationResult = {
  valid: boolean;
  error: string | null;
};

export const DEPARTMENTS = [
  'Поддержка',
  'Модерация',
  'Финансы',
  'Безопасность',
] as const;

export function getAvailableRefundOptions(
  context: RefundDemoContext,
): RefundOptionId[] {
  if (context.dealStatus === 'in_progress') {
    if (context.mode === 'strict_v2') {
      return ['amount_from_deal'];
    }
    return ['full_from_deal', 'partial_from_deal'];
  }

  if (
    context.sellerBalance !== null &&
    context.sellerBalance >= context.dealBalance
  ) {
    return ['full_from_seller', 'partial_from_seller'];
  }

  if (
    context.sellerBalance !== null &&
    context.sellerBalance > 0 &&
    context.sellerBalance < context.dealBalance
  ) {
    return [
      'full_with_refund_bank',
      'partial_from_seller',
      'partial_with_refund_bank',
    ];
  }

  if (context.mode === 'strict_v2') {
    return ['amount_from_refund_bank'];
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
        title: 'С баланса сделки',
        description:
          'Сумма будет списана с текущего баланса сделки, и возвращена покупателю',
      };
    case 'partial_from_deal':
      return {
        title: 'Частичный возврат с баланса сделки',
        description:
          'Напишите сумму, которая будет списана с баланса сделки, и возвращена покупателю',
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
          'Сумма будет списана с баланса продавца, и возвращена покупателю',
      };
    case 'partial_from_seller':
      return {
        title: 'Частичный возврат с баланса продавца',
        description:
          'Напишите сумму, которая будет списана с баланса продавца, и возвращена покупателю',
      };
    case 'full_with_refund_bank':
      return {
        title: 'С банка возвратов',
        description:
          'Весь баланс продавца будет списан в счет возврата, оставшаяся сумма будет добавлена из банка возвратов',
      };
    case 'partial_with_refund_bank':
      return {
        title: 'Частичный возврат с баланса возвратов',
        description:
          'Напишите сумму. Доступные средства будут списаны с баланса продавца, а недостающая часть — из банка возвратов',
      };
    case 'full_from_refund_bank':
      return {
        title: 'С банка возвратов',
        description:
          'С банка возвратов будет списана вся сумма сделки и возвращена покупателю',
      };
    case 'partial_from_refund_bank':
      return {
        title: 'Частичный возврат с банка возвратов',
        description:
          'Напишите сумму, которая будет списана с банка возвратов и возвращена покупателю',
      };
  }
}

export function validatePartialAmount(
  option: RefundOptionId,
  enteredAmount: number,
  context: RefundDemoContext,
): ValidationResult {
  const seller = context.sellerBalance ?? 0;

  if (!Number.isFinite(enteredAmount) || enteredAmount <= 0) {
    return {
      valid: false,
      error: 'Введите сумму больше 0',
    };
  }

  switch (option) {
    case 'partial_from_deal':
      if (enteredAmount >= context.dealBalance) {
        return {
          valid: false,
          error:
            'Сумма частичного возврата должна быть меньше баланса сделки',
        };
      }
      return { valid: true, error: null };

    case 'amount_from_deal':
      if (enteredAmount > context.dealBalance) {
        return {
          valid: false,
          error: 'Сумма возврата не может быть больше баланса сделки',
        };
      }
      return { valid: true, error: null };

    case 'amount_from_refund_bank':
      if (enteredAmount > context.dealBalance) {
        return {
          valid: false,
          error: 'Сумма возврата не может быть больше баланса сделки',
        };
      }
      return { valid: true, error: null };

    case 'partial_from_seller': {
      if (enteredAmount >= context.dealBalance) {
        return {
          valid: false,
          error:
            'Сумма частичного возврата должна быть меньше доступной суммы возврата по сделке',
        };
      }
      if (enteredAmount >= seller) {
        return {
          valid: false,
          error:
            'Сумма частичного возврата должна быть меньше баланса продавца',
        };
      }
      return { valid: true, error: null };
    }

    case 'partial_with_refund_bank': {
      if (enteredAmount >= context.dealBalance) {
        return {
          valid: false,
          error:
            'Сумма частичного возврата должна быть меньше доступной суммы возврата по сделке',
        };
      }
      if (enteredAmount <= seller) {
        return {
          valid: false,
          error:
            'Сумма частичного возврата с баланса возвратов должна быть больше баланса продавца',
        };
      }
      return { valid: true, error: null };
    }

    case 'partial_from_refund_bank':
      if (enteredAmount >= context.dealBalance) {
        return {
          valid: false,
          error:
            'Сумма частичного возврата должна быть меньше баланса сделки',
        };
      }
      return { valid: true, error: null };

    default:
      return { valid: true, error: null };
  }
}

export function calculateRefund(
  option: RefundOptionId,
  context: RefundDemoContext,
  enteredAmount: number | null,
): RefundBreakdown {
  const seller = context.sellerBalance ?? 0;

  switch (option) {
    case 'full_from_deal':
      return {
        refundAmount: context.dealBalance,
        fromDealBalance: context.dealBalance,
        fromSellerBalance: 0,
        fromRefundBank: 0,
      };

    case 'partial_from_deal': {
      const amount = enteredAmount ?? 0;
      return {
        refundAmount: amount,
        fromDealBalance: amount,
        fromSellerBalance: 0,
        fromRefundBank: 0,
      };
    }

    case 'amount_from_deal': {
      const amount = enteredAmount ?? 0;
      return {
        refundAmount: amount,
        fromDealBalance: amount,
        fromSellerBalance: 0,
        fromRefundBank: 0,
      };
    }

    case 'amount_from_refund_bank': {
      const amount = enteredAmount ?? 0;
      return {
        refundAmount: amount,
        fromDealBalance: 0,
        fromSellerBalance: 0,
        fromRefundBank: amount,
      };
    }

    case 'full_from_seller':
      return {
        refundAmount: context.dealBalance,
        fromDealBalance: 0,
        fromSellerBalance: context.dealBalance,
        fromRefundBank: 0,
      };

    case 'partial_from_seller': {
      const amount = enteredAmount ?? 0;
      return {
        refundAmount: amount,
        fromDealBalance: 0,
        fromSellerBalance: amount,
        fromRefundBank: 0,
      };
    }

    case 'full_with_refund_bank': {
      const fromSellerBalance = Math.min(seller, context.dealBalance);
      return {
        refundAmount: context.dealBalance,
        fromDealBalance: 0,
        fromSellerBalance,
        fromRefundBank: context.dealBalance - fromSellerBalance,
      };
    }

    case 'partial_with_refund_bank': {
      const amount = enteredAmount ?? 0;
      return {
        refundAmount: amount,
        fromDealBalance: 0,
        fromSellerBalance: seller,
        fromRefundBank: Math.max(0, amount - seller),
      };
    }

    case 'full_from_refund_bank':
      return {
        refundAmount: context.dealBalance,
        fromDealBalance: 0,
        fromSellerBalance: 0,
        fromRefundBank: context.dealBalance,
      };

    case 'partial_from_refund_bank': {
      const amount = enteredAmount ?? 0;
      return {
        refundAmount: amount,
        fromDealBalance: 0,
        fromSellerBalance: 0,
        fromRefundBank: amount,
      };
    }
  }
}

export function formatRub(value: number): string {
  const formatted = new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
  }).format(value);
  return `${formatted} ₽`;
}

export function formatRubSigned(value: number): string {
  if (value === 0) return `0 ₽`;
  return `−${formatRub(value).replace(' ₽', '')} ₽`;
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
