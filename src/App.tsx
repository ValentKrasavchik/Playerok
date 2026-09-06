import { useEffect, useState } from 'react';
import { SetupModal } from './components/SetupModal';
import { RefundModal } from './components/RefundModal';
import { BrowserShell, type BrowserTabId } from './components/BrowserShell';
import { OperationsPage } from './components/OperationsPage';
import {
  ScenariosPage,
  isScenarioId,
} from './components/ScenariosPage';
import { RefundLogModal, type RefundLogData } from './components/RefundLogModal';
import type { RefundDemoContext } from './refundLogic';
import {
  appendRefundOperations,
  clearOperationsState,
  loadOperationsState,
  saveOperationsState,
  type OperationsState,
} from './operationsStore';
import {
  clearAppHash,
  navigateToScenarios,
  parseLocationHash,
} from './routing';
import './styles.css';

type Step = 'setup' | 'workspace';

type SessionState = {
  step: Step;
  context: RefundDemoContext | null;
  activeTab: BrowserTabId;
};

const SESSION_KEY = 'playerok-refund-session-v1';

const DEFAULT_CONTEXT: RefundDemoContext = {
  mode: 'strict',
  dealStatus: 'completed',
  dealBalance: 900,
  sellerAccrued: 850,
  sellerBalance: 800,
  alreadyRefunded: 0,
  sellerName: 'DarkMark32',
};

function normalizeTab(tab: BrowserTabId | string | undefined): BrowserTabId {
  if (tab === 'operations' || tab === 'scenarios' || tab === 'refund') {
    return tab;
  }
  return 'refund';
}

function resolveFocusScenarioId(raw: string | null): string | null {
  if (!raw) return null;
  return isScenarioId(raw) ? raw : null;
}

function loadSession(): SessionState {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return { step: 'setup', context: null, activeTab: 'refund' };
    }
    const parsed = JSON.parse(raw) as {
      step?: string;
      context?: RefundDemoContext | null;
      activeTab?: BrowserTabId;
    };
    // Legacy: standalone scenarios page → workspace + scenarios tab
    if (parsed.step === 'scenarios') {
      return {
        step: 'workspace',
        context: parsed.context
          ? { ...parsed.context, mode: 'strict' as const }
          : { ...DEFAULT_CONTEXT },
        activeTab: 'scenarios',
      };
    }
    if (parsed.step === 'workspace' && parsed.context) {
      return {
        step: 'workspace',
        context: { ...parsed.context, mode: 'strict' },
        activeTab: normalizeTab(parsed.activeTab),
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

function getInitialView(): {
  step: Step;
  context: RefundDemoContext | null;
  activeTab: BrowserTabId;
  focusScenarioId: string | null;
} {
  const route = parseLocationHash();
  const session = loadSession();

  if (route.kind === 'scenarios') {
    return {
      step: 'workspace',
      context: session.context ?? { ...DEFAULT_CONTEXT },
      activeTab: 'scenarios',
      focusScenarioId: resolveFocusScenarioId(route.scenarioId),
    };
  }

  return {
    ...session,
    focusScenarioId: null,
  };
}

export default function App() {
  const initial = getInitialView();
  const [step, setStep] = useState<Step>(initial.step);
  const [context, setContext] = useState<RefundDemoContext | null>(
    initial.context,
  );
  const [activeTab, setActiveTab] = useState<BrowserTabId>(initial.activeTab);
  const [focusScenarioId, setFocusScenarioId] = useState<string | null>(
    initial.focusScenarioId,
  );
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

  useEffect(() => {
    const syncFromHash = () => {
      const route = parseLocationHash();
      if (route.kind === 'scenarios') {
        setContext((prev) => prev ?? { ...DEFAULT_CONTEXT });
        setStep('workspace');
        setActiveTab('scenarios');
        setFocusScenarioId(resolveFocusScenarioId(route.scenarioId));
        return;
      }

      setFocusScenarioId(null);
      if (activeTab === 'scenarios') {
        // Hash cleared while on scenarios tab — keep the tab, show all scenarios
      }
    };

    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [activeTab]);

  const handleTabChange = (tab: BrowserTabId) => {
    setActiveTab(tab);
    if (tab === 'refund') {
      setContext((prev) =>
        prev ? { ...prev, alreadyRefunded: 0 } : prev,
      );
    }
    if (tab === 'scenarios') {
      navigateToScenarios(focusScenarioId, 'replace');
    } else {
      clearAppHash('replace');
    }
  };

  const openSetup = () => {
    clearAppHash('replace');
    setFocusScenarioId(null);
    setContext(null);
    setActiveTab('refund');
    setPendingLog(null);
    setStep('setup');
  };

  const openScenariosTab = (scenarioId: string | null = null) => {
    setPendingLog(null);
    setContext((prev) => prev ?? { ...DEFAULT_CONTEXT });
    setFocusScenarioId(scenarioId);
    setActiveTab('scenarios');
    setStep('workspace');
    navigateToScenarios(scenarioId);
  };

  const handleOpenScenario = (scenarioId: string | null) => {
    setFocusScenarioId(scenarioId);
    navigateToScenarios(scenarioId);
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
    clearAppHash('replace');
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
            <button
              type="button"
              className="app-intro__link"
              onClick={() => openScenariosTab(null)}
            >
              Смотреть все сценарии
            </button>
          </div>
          <SetupModal
            onClose={openSetup}
            onSubmit={(next) => {
              clearAppHash('replace');
              setFocusScenarioId(null);
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
          ) : null}
          {activeTab === 'operations' ? (
            <OperationsPage
              state={opsState}
              onClear={() => {
                clearOperationsState();
                setOpsState(loadOperationsState());
              }}
            />
          ) : null}
          {activeTab === 'scenarios' ? (
            <ScenariosPage
              embedded
              focusScenarioId={focusScenarioId}
              onOpenScenario={handleOpenScenario}
              onGoToDemo={() => {
                clearAppHash('replace');
                setActiveTab('refund');
              }}
            />
          ) : null}
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
