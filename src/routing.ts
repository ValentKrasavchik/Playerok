export type AppRoute =
  | { kind: 'app' }
  | { kind: 'scenarios'; scenarioId: string | null };

export function parseLocationHash(hash = window.location.hash): AppRoute {
  const raw = hash.replace(/^#/, '').trim();
  if (!raw) return { kind: 'app' };

  const path = raw.startsWith('/') ? raw : `/${raw}`;
  const parts = path.split('/').filter(Boolean);

  if (parts[0] === 'scenarios') {
    return {
      kind: 'scenarios',
      scenarioId: parts[1] ? decodeURIComponent(parts[1]) : null,
    };
  }

  return { kind: 'app' };
}

export function scenariosHash(scenarioId?: string | null): string {
  if (scenarioId) {
    return `#/scenarios/${encodeURIComponent(scenarioId)}`;
  }
  return '#/scenarios';
}

export function scenariosAbsoluteUrl(scenarioId?: string | null): string {
  return `${window.location.origin}${window.location.pathname}${window.location.search}${scenariosHash(scenarioId)}`;
}

export function navigateToScenarios(
  scenarioId?: string | null,
  mode: 'push' | 'replace' = 'push',
): void {
  const next = scenariosHash(scenarioId);
  if (window.location.hash === next) return;

  if (mode === 'replace') {
    const url = `${window.location.pathname}${window.location.search}${next}`;
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = next;
  }
}

export function clearAppHash(mode: 'push' | 'replace' = 'replace'): void {
  if (!window.location.hash) return;
  const url = `${window.location.pathname}${window.location.search}`;
  if (mode === 'replace') {
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = '';
  }
}
