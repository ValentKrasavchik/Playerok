import { useMemo, useState } from 'react';
import { Modal } from './Modal';
import { Radio } from './Radio';
import type {
  DealStatus,
  RefundDemoContext,
  RefundMode,
} from '../refundLogic';
import { parseAmount } from '../utils';

type SetupModalProps = {
  onClose: () => void;
  onSubmit: (context: RefundDemoContext) => void;
};

export function SetupModal({ onClose, onSubmit }: SetupModalProps) {
  const [mode, setMode] = useState<RefundMode>('strict');
  const [dealStatus, setDealStatus] = useState<DealStatus>('in_progress');
  const [dealBalanceRaw, setDealBalanceRaw] = useState('900');
  const [sellerBalanceRaw, setSellerBalanceRaw] = useState('800');
  const [sellerName, setSellerName] = useState('DarkMark32');

  const dealBalance = parseAmount(dealBalanceRaw);
  const sellerBalance = parseAmount(sellerBalanceRaw);
  const isStrict = mode === 'strict' || mode === 'strict_v2';
  const strictVersion = mode === 'strict_v2' ? 2 : 1;

  const canSubmit = useMemo(() => {
    if (dealBalance === null || dealBalance < 0) return false;
    if (!sellerName.trim()) return false;
    if (dealStatus === 'completed') {
      return sellerBalance !== null && sellerBalance >= 0;
    }
    return true;
  }, [dealBalance, dealStatus, sellerBalance, sellerName]);

  const handleSubmit = () => {
    if (!canSubmit || dealBalance === null) return;

    onSubmit({
      mode,
      dealStatus,
      dealBalance,
      sellerBalance: dealStatus === 'completed' ? sellerBalance : null,
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
          <span className="field-label">Вариант логики</span>
          <div className="status-group">
            <div
              className={`status-option status-option--with-chips${isStrict ? ' status-option--selected' : ''}`}
            >
              <button
                type="button"
                className="status-option__main"
                onClick={() =>
                  setMode(strictVersion === 2 ? 'strict_v2' : 'strict')
                }
              >
                <Radio checked={isStrict} />
                <span className="status-option__text">
                  <strong>Строгий вариант</strong>
                  <small>
                    {strictVersion === 1
                      ? 'V1: текущая логика без изменений'
                      : 'V2: один инпут для сделки в процессе'}
                  </small>
                </span>
              </button>
              <div className="version-chips" role="group" aria-label="Версия строгого варианта">
                <button
                  type="button"
                  className={`version-chip${isStrict && strictVersion === 1 ? ' version-chip--active' : ''}`}
                  onClick={() => setMode('strict')}
                >
                  1
                </button>
                <button
                  type="button"
                  className={`version-chip${isStrict && strictVersion === 2 ? ' version-chip--active' : ''}`}
                  onClick={() => setMode('strict_v2')}
                >
                  2
                </button>
              </div>
            </div>
            <button
              type="button"
              className={`status-option${mode === 'flexible' ? ' status-option--selected' : ''}`}
              onClick={() => setMode('flexible')}
            >
              <Radio checked={mode === 'flexible'} />
              <span className="status-option__text">
                <strong>Гибкий вариант</strong>
                <small>Ручное распределение сумм</small>
              </span>
            </button>
          </div>
        </div>

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
            Баланс сделки
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
