import { useEffect, useState } from 'react';
import { SetupModal } from './components/SetupModal';
import { RefundModal } from './components/RefundModal';
import { BrowserShell, type BrowserTabId } from './components/BrowserShell';
import { OperationsPage } from './components/OperationsPage';
import { RefundLogModal, type RefundLogData } from './components/RefundLogModal';
import type { RefundDemoContext } from './refundLogic';
import {
  appendRefundOperations,
  clearOperationsState,
  loadOperationsState,
  saveOperationsState,
  type OperationsState,
} from './operationsStore';
import './styles.css';

type Step = 'setup' | 'workspace';

type SessionState = {
  step: Step;
  context: RefundDemoContext | null;
  activeTab: BrowserTabId;
};

const SESSION_KEY = 'playerok-refund-session-v1';

function loadSession(): SessionState {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return { step: 'setup', context: null, activeTab: 'refund' };
    }
    const parsed = JSON.parse(raw) as SessionState;
    if (parsed.step === 'workspace' && parsed.context) {
      return {
        step: 'workspace',
        context: { ...parsed.context, mode: 'strict' },
        activeTab: parsed.activeTab === 'operations' ? 'operations' : 'refund',
      };
    }
  } catch {
    // ignore
  }
  return { step: 'setup', context: null, activeTab: 'refund' };
}

function saveSession(session: SessionState): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export default function App() {
  const initial = loadSession();
  const [step, setStep] = useState<Step>(initial.step);
  const [context, setContext] = useState<RefundDemoContext | null>(
    initial.context,
  );
  const [activeTab, setActiveTab] = useState<BrowserTabId>(initial.activeTab);
  const [opsState, setOpsState] = useState<OperationsState>(() =>
    loadOperationsState(),
  );
  const [toast, setToast] = useState<string | null>(null);
  const [pendingLog, setPendingLog] = useState<RefundLogData | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    saveOperationsState(opsState);
  }, [opsState]);

  useEffect(() => {
    saveSession({ step, context, activeTab });
  }, [step, context, activeTab]);

  const handleTabChange = (tab: BrowserTabId) => {
    setActiveTab(tab);
    // В демо каждое открытие вкладки возврата — новый проход по той же конфигурации.
    if (tab === 'refund') {
      setContext((prev) =>
        prev ? { ...prev, alreadyRefunded: 0 } : prev,
      );
    }
  };

  const openSetup = () => {
    setContext(null);
    setActiveTab('refund');
    setPendingLog(null);
    setStep('setup');
  };

  const handleRefundCompleted = (log: RefundLogData) => {
    setOpsState((prev) => appendRefundOperations(prev, log));
    setContext((prev) =>
      prev
        ? {
            ...prev,
            alreadyRefunded: prev.alreadyRefunded + log.refundAmount,
          }
        : prev,
    );
    setPendingLog(log);
    setActiveTab('operations');
  };

  return (
    <div
      className={`app-shell${step === 'workspace' ? ' app-shell--workspace' : ''}`}
    >
      {step === 'setup' ? (
        <>
          <div className="app-intro">
            <h1>Демо возврата средств</h1>
            <p>
              Укажите параметры сделки, затем откроется эмуляция вкладок:
              форма возврата и таблица операций.
            </p>
          </div>
          <SetupModal
            onClose={openSetup}
            onSubmit={(next) => {
              setContext(next);
              setActiveTab('refund');
              setStep('workspace');
            }}
          />
        </>
      ) : null}

      {step === 'workspace' && context ? (
        <BrowserShell
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onResetSetup={openSetup}
        >
          {activeTab === 'refund' ? (
            <RefundModal
              context={context}
              embedded
              onClose={() => setActiveTab('operations')}
              onBack={() => setActiveTab('operations')}
              onSuccess={(message) => setToast(message)}
              onRefundCompleted={handleRefundCompleted}
            />
          ) : (
            <OperationsPage
              state={opsState}
              onClear={() => {
                clearOperationsState();
                setOpsState(loadOperationsState());
              }}
            />
          )}
        </BrowserShell>
      ) : null}

      {pendingLog ? (
        <RefundLogModal
          log={pendingLog}
          onClose={() => setPendingLog(null)}
        />
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
