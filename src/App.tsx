import { useEffect, useState } from 'react';
import { SetupModal } from './components/SetupModal';
import { RefundModal } from './components/RefundModal';
import type { RefundDemoContext } from './refundLogic';
import './styles.css';

type Step = 'setup' | 'refund';

export default function App() {
  const [step, setStep] = useState<Step>('setup');
  const [context, setContext] = useState<RefundDemoContext | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const openSetup = () => {
    setContext(null);
    setStep('setup');
  };

  return (
    <div className="app-shell">
      <div className="app-intro">
        <h1>Демо возврата средств</h1>
        <p>
          Укажите параметры сделки, затем откроется динамическая форма возврата
          по сценариям.
        </p>
      </div>

      {step === 'setup' ? (
        <SetupModal
          onClose={openSetup}
          onSubmit={(next) => {
            setContext(next);
            setStep('refund');
          }}
        />
      ) : null}

      {step === 'refund' && context ? (
        <RefundModal
          context={context}
          onClose={openSetup}
          onBack={openSetup}
          onSuccess={(message) => setToast(message)}
        />
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
