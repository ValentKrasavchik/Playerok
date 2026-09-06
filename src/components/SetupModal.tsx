import { useMemo, useState } from 'react';
import { Modal } from './Modal';
import { Radio } from './Radio';
import type { DealStatus, RefundDemoContext } from '../refundLogic';
import { formatRub, getCommission } from '../refundLogic';
import { parseAmount } from '../utils';

type SetupModalProps = {
  onClose: () => void;
  onSubmit: (context: RefundDemoContext) => void;
};

export function SetupModal({ onClose, onSubmit }: SetupModalProps) {
  const [dealStatus, setDealStatus] = useState<DealStatus>('completed');
  const [dealBalanceRaw, setDealBalanceRaw] = useState('900');
  const [sellerAccruedRaw, setSellerAccruedRaw] = useState('850');
  const [sellerBalanceRaw, setSellerBalanceRaw] = useState('800');
  const [sellerName, setSellerName] = useState('DarkMark32');

  const dealBalance = parseAmount(dealBalanceRaw);
  const sellerAccrued = parseAmount(sellerAccruedRaw);
  const sellerBalance = parseAmount(sellerBalanceRaw);

  const commission =
    dealBalance !== null && sellerAccrued !== null
      ? getCommission(dealBalance, sellerAccrued)
      : null;

  const canSubmit = useMemo(() => {
    if (dealBalance === null || dealBalance < 0) return false;
    if (!sellerName.trim()) return false;

    if (sellerAccrued !== null) {
      if (sellerAccrued < 0 || sellerAccrued > dealBalance) return false;
    }

    if (dealStatus === 'completed') {
      return sellerBalance !== null && sellerBalance >= 0;
    }
    return sellerAccrued !== null && sellerAccrued >= 0;
  }, [dealBalance, dealStatus, sellerBalance, sellerAccrued, sellerName]);

  const handleSubmit = () => {
    if (!canSubmit || dealBalance === null) return;

    onSubmit({
      mode: 'strict',
      dealStatus,
      dealBalance,
      sellerAccrued,
      sellerBalance: dealStatus === 'completed' ? sellerBalance : null,
      alreadyRefunded: 0,
      sellerName: sellerName.trim(),
    });
  };

  return (
    <Modal
      setup
      title="Параметры сделки"
      onClose={onClose}
      footer={
        <button
          type="button"
          className="primary-btn"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          Показать форму возврата
        </button>
      }
    >
      <div className="field-group">
        <div>
          <span className="field-label">Статус сделки</span>
          <div className="status-group">
            <button
              type="button"
              className={`status-option${dealStatus === 'in_progress' ? ' status-option--selected' : ''}`}
              onClick={() => setDealStatus('in_progress')}
            >
              <Radio checked={dealStatus === 'in_progress'} />
              <span>В процессе</span>
            </button>
            <button
              type="button"
              className={`status-option${dealStatus === 'completed' ? ' status-option--selected' : ''}`}
              onClick={() => setDealStatus('completed')}
            >
              <Radio checked={dealStatus === 'completed'} />
              <span>Завершена</span>
            </button>
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="deal-balance">
            Сумма сделки
          </label>
          <input
            id="deal-balance"
            className="field field--amount"
            inputMode="decimal"
            placeholder="0"
            value={dealBalanceRaw}
            onChange={(event) => setDealBalanceRaw(event.target.value)}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="seller-accrued">
            Начислено продавцу
          </label>
          <input
            id="seller-accrued"
            className="field field--amount"
            inputMode="decimal"
            placeholder="0"
            value={sellerAccruedRaw}
            onChange={(event) => setSellerAccruedRaw(event.target.value)}
          />
          {commission !== null ? (
            <p className="field-hint">Комиссия: {formatRub(commission)}</p>
          ) : null}
        </div>

        {dealStatus === 'completed' ? (
          <div>
            <label className="field-label" htmlFor="seller-balance">
              Баланс продавца
            </label>
            <input
              id="seller-balance"
              className="field field--amount"
              inputMode="decimal"
              placeholder="0"
              value={sellerBalanceRaw}
              onChange={(event) => setSellerBalanceRaw(event.target.value)}
            />
          </div>
        ) : null}

        <div>
          <label className="field-label" htmlFor="seller-name">
            Имя продавца
          </label>
          <input
            id="seller-name"
            className="field field--amount"
            placeholder="DarkMark32"
            value={sellerName}
            onChange={(event) => setSellerName(event.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
