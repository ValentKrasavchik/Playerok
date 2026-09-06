import type { ReactNode } from 'react';

export type BrowserTabId = 'refund' | 'operations';

type BrowserShellProps = {
  activeTab: BrowserTabId;
  onTabChange: (tab: BrowserTabId) => void;
  onResetSetup: () => void;
  children: ReactNode;
};

const TABS: Array<{ id: BrowserTabId; label: string }> = [
  { id: 'refund', label: 'Произвести возврат' },
  { id: 'operations', label: 'Операции' },
];

export function BrowserShell({
  activeTab,
  onTabChange,
  onResetSetup,
  children,
}: BrowserShellProps) {
  return (
    <div className="browser-shell">
      <div className="browser-chrome">
        <div className="browser-chrome__traffic">
          <span className="browser-chrome__dot browser-chrome__dot--red" />
          <span className="browser-chrome__dot browser-chrome__dot--yellow" />
          <span className="browser-chrome__dot browser-chrome__dot--green" />
        </div>
        <div className="browser-tabs" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`browser-tab${activeTab === tab.id ? ' browser-tab--active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              <span className="browser-tab__label">{tab.label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="browser-chrome__reset"
          onClick={onResetSetup}
        >
          Новая конфигурация
        </button>
      </div>
      <div className="browser-content">{children}</div>
    </div>
  );
}
