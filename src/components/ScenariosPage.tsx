import {
  ScenarioInteractive,
  type ScenarioDemoConfig,
} from './ScenarioInteractive';
import { scenariosAbsoluteUrl, scenariosHash } from '../routing';

type ScenariosPageProps = {
  onBack?: () => void;
  onGoToDemo?: () => void;
  embedded?: boolean;
  /** When set, only this scenario is shown (deep link). */
  focusScenarioId?: string | null;
  onOpenScenario?: (scenarioId: string | null) => void;
};

type Scenario = {
  id: string;
  eyebrow: string;
  title: string;
  lead: string;
  when: string;
  whatHappens: string[];
  demo: ScenarioDemoConfig;
  note?: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: 'in-progress-full',
    eyebrow: 'Сделка в процессе',
    title: 'Полный возврат покупателю',
    lead: 'Покупателю возвращается вся сумма сделки, пока средства ещё не переведены на баланс продавца.',
    when: 'Сделка находится в статусе «В процессе». Источником средств служит сама сделка.',
    whatHappens: [
      'Покупателю возвращается полная сумма сделки.',
    ],
    demo: {
      dealBalance: 900,
      sellerAccrued: 850,
      sellerBalance: null,
      dealStatus: 'in_progress',
      activeOptions: ['full_from_deal'],
      preferOption: 'full_from_deal',
    },
  },
  {
    id: 'in-progress-partial',
    eyebrow: 'Сделка в процессе',
    title: 'Частичный возврат',
    lead: 'Покупателю возвращается только часть суммы сделки — например, при частичном несоответствии товара условиям.',
    when: 'Сделка в статусе «В процессе». Сумма возврата не превышает величину «Начислено продавцу».',
    whatHappens: [
      'Покупатель получает указанную сумму возврата.',
      'Остаток сделки сохраняется: последующее начисление продавцу уменьшается на сумму возврата.',
      'Если возврат равен начислению продавцу, продавцу остаётся только комиссия платформы по сделке.',
    ],
    demo: {
      dealBalance: 900,
      sellerAccrued: 850,
      sellerBalance: null,
      dealStatus: 'in_progress',
      activeOptions: ['partial_from_deal'],
      preferOption: 'partial_from_deal',
      suggestedPartial: 200,
    },
    note: 'Сумма возврата не может превышать «Начислено продавцу». Возврат всего остатка сделки оформляется как полный возврат.',
  },
  {
    id: 'completed-seller-covers',
    eyebrow: 'Сделка завершена',
    title: 'Возврат полностью с баланса продавца',
    lead: 'Средства уже находятся у продавца, и доступной суммы достаточно, чтобы полностью покрыть возврат без банка возвратов.',
    when: 'Сделка завершена. На балансе продавца достаточно средств, а начисление по сделке не меньше суммы возврата.',
    whatHappens: [
      'При полном возврате вся сумма списывается с баланса продавца.',
      'При частичном возврате указанная сумма также списывается исключительно с баланса продавца.',
      'Банк возвратов в финансировании не участвует.',
    ],
    demo: {
      dealBalance: 900,
      sellerAccrued: 900,
      sellerBalance: 950,
      dealStatus: 'completed',
      activeOptions: ['full_from_seller', 'partial_from_seller'],
      preferOption: 'full_from_seller',
      suggestedPartial: 300,
    },
    note: 'Сейчас такой сценарий скорее всего не сработает: продавец обычно получает меньше суммы сделки из‑за комиссии, поэтому для полного возврата подключается банк. Имеет смысл заложить на будущее — например, если комиссию у продавцов уберём.',
  },
  {
    id: 'completed-mixed',
    eyebrow: 'Сделка завершена',
    title: 'Совместное финансирование: продавец и банк возвратов',
    lead: 'Доступной суммы у продавца недостаточно для полного возврата. Недостающую часть компенсирует банк возвратов.',
    when: 'Сделка завершена. С продавца по этой сделке можно списать только часть суммы — исходя из баланса или начисления.',
    whatHappens: [
      'В первую очередь списывается максимально доступная сумма с продавца по сделке.',
      'Остаток покрывается из банка возвратов.',
      'Доступны полный возврат с участием банка и частичный: только с продавца либо с добором из банка.',
    ],
    demo: {
      dealBalance: 900,
      sellerAccrued: 850,
      sellerBalance: 800,
      dealStatus: 'completed',
      activeOptions: [
        'full_with_refund_bank',
        'partial_with_refund_bank',
      ],
      preferOption: 'full_with_refund_bank',
      suggestedPartial: 500,
      suggestedBankPartial: 850,
    },
    note: 'Даже при высоком балансе кошелька с конкретной сделки нельзя списать больше, чем «Начислено продавцу». В этом случае также подключается банк возвратов.',
  },
  {
    id: 'completed-accrued-limit',
    eyebrow: 'Сделка завершена',
    title: 'Начисление продавцу меньше суммы сделки',
    lead: 'Типичная ситуация: сумма сделки превышает начисление продавцу — например, 150 ₽ против 100 ₽ при существенно большем балансе кошелька.',
    when: 'Завершённая сделка, в которой начисление продавцу меньше суммы возврата.',
    whatHappens: [
      'С продавца списывается не более начисленной по сделке суммы.',
      'Разница (как правило, комиссия платформы) покрывается банком возвратов.',
      'Система предлагает сценарий с участием банка, а не возврат только с баланса продавца.',
    ],
    demo: {
      dealBalance: 150,
      sellerAccrued: 100,
      sellerBalance: 800,
      dealStatus: 'completed',
      activeOptions: ['full_with_refund_bank'],
      preferOption: 'full_with_refund_bank',
      suggestedPartial: 60,
      suggestedBankPartial: 120,
    },
  },
  {
    id: 'completed-bank-only',
    eyebrow: 'Сделка завершена',
    title: 'Финансирование только из банка возвратов',
    lead: 'С продавца по сделке списать нечего: нулевой баланс.',
    when: 'Сделка завершена, и продавец вывел все средства со своего баланса.',
    whatHappens: [
      'Полный или частичный возврат полностью финансируется банком возвратов.',
      'Баланс продавца не изменяется.',
      'Покупатель получает согласованную сумму возврата.',
    ],
    demo: {
      dealBalance: 900,
      sellerAccrued: 850,
      sellerBalance: 0,
      dealStatus: 'completed',
      activeOptions: ['full_from_refund_bank', 'partial_from_refund_bank'],
      preferOption: 'full_from_refund_bank',
      suggestedPartial: 400,
    },
  },
];

export function isScenarioId(value: string): boolean {
  return SCENARIOS.some((scenario) => scenario.id === value);
}

export function getScenarioById(id: string) {
  return SCENARIOS.find((scenario) => scenario.id === id) ?? null;
}

const PRINCIPLES = [
  {
    title: 'Источник средств зависит от статуса сделки',
    text: 'Пока сделка в процессе, возврат идёт из суммы сделки. После завершения — с баланса продавца и, при необходимости, из банка возвратов.',
  },
  {
    title: 'Начисление задаёт лимит списания с продавца',
    text: 'По конкретной сделке с продавца нельзя списать больше, чем Начислено продавцу — даже если остаток на его балансе выше.',
  },
  {
    title: 'Банк возвратов — резервный источник',
    text: 'Подключается, когда средств продавца недостаточно. На практике это почти всегда так при полном возврате по завершённой сделке: продавец получает меньше суммы сделки из‑за комиссии платформы, и банк добивает разницу. В истории операций отдельная карточка по банку не создаётся: сумма отражается в составе возврата.',
  },
  {
    title: 'Частичный возврат сохраняет остаток сделки',
    text: 'Покупатель получает меньшую сумму, продавец сохраняет остаток начисления. Если возврат равен начислению, продавцу остаётся комиссия платформы.',
  },
];

const HOW_TO_USE = [
  {
    title: '1. Задайте конфигурацию сделки',
    text: 'На старте откроется форма параметров. Укажите статус («В процессе» или «Завершена»), сумму сделки, «Начислено продавцу» и имя продавца. Для завершённой сделки дополнительно нужен баланс продавца. Комиссия считается автоматически как разница между суммой сделки и начислением.',
  },
  {
    title: '2. Работайте во вкладках демо',
    text: 'После сохранения параметров открывается эмуляция интерфейса: «Произвести возврат» — форма возврата, «Операции» — история начислений и списаний, «Сценарии» — этот справочник. Кнопка «Новая конфигурация» возвращает к параметрам сделки.',
  },
  {
    title: '3. Подберите цифры под нужный кейс',
    text: 'Чтобы увидеть полный возврат из сделки — статус «В процессе». Чтобы банк добивал разницу — завершённая сделка, где начисление или баланс меньше суммы сделки. Чтобы возврат шёл только из банка — обнулите баланс продавца. Чтобы смоделировать возврат только с продавца — начисление не меньше суммы сделки и достаточный баланс (сейчас редкий кейс из‑за комиссии).',
  },
  {
    title: '4. Используйте интерактивные примеры',
    text: 'В каждом сценарии ниже можно выбрать доступный вариант возврата и изменить сумму. Сразу видно, откуда идут средства и какие связанные операции появятся. Заблокированные варианты относятся к другим сценариям и показаны для контекста.',
  },
  {
    title: '5. Открывайте сценарий по ссылке',
    text: 'У каждого сценария есть отдельный адрес. По ссылке откроется демо сразу на вкладке «Сценарии» с нужным кейсом — можно скопировать ссылку и отправить коллеге.',
  },
];

export function ScenariosPage({
  onBack,
  onGoToDemo,
  embedded,
  focusScenarioId = null,
  onOpenScenario,
}: ScenariosPageProps) {
  const goDemo = onGoToDemo ?? onBack;
  const focused = focusScenarioId
    ? getScenarioById(focusScenarioId)
    : null;
  const visibleScenarios = focused ? [focused] : SCENARIOS;
  const focusedIndex = focused
    ? SCENARIOS.findIndex((scenario) => scenario.id === focused.id)
    : -1;

  const handleOpenScenario = (scenarioId: string | null) => {
    onOpenScenario?.(scenarioId);
  };

  const copyScenarioLink = async (scenarioId: string) => {
    const url = scenariosAbsoluteUrl(scenarioId);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Скопируйте ссылку на сценарий:', url);
    }
  };

  return (
    <div
      className={`scenarios-page${embedded ? ' scenarios-page--embedded' : ''}${focused ? ' scenarios-page--focused' : ''}`}
    >
      <header className="scenarios-hero">
        <div className="scenarios-hero__inner">
          {focused ? (
            <button
              type="button"
              className="scenarios-hero__back"
              onClick={() => handleOpenScenario(null)}
            >
              ← Все сценарии
            </button>
          ) : null}
          <p className="scenarios-hero__eyebrow">
            {focused ? focused.eyebrow : 'Справочник по возвратам'}
          </p>
          <h1 className="scenarios-hero__title">
            {focused ? (
              focused.title
            ) : (
              <>
                Сценарии возврата средств
                <br />
                в разных ситуациях
              </>
            )}
          </h1>
          <p className="scenarios-hero__lead">
            {focused
              ? focused.lead
              : 'Обзор типовых кейсов с интерактивными примерами: выберите вариант возврата и измените сумму — сразу видно, откуда берутся средства. Материал предназначен для поддержки и модерации.'}
          </p>
        </div>
      </header>

      {!focused ? (
        <>
          <section className="scenarios-howto" aria-label="Как пользоваться демо">
            <div className="scenarios-howto__header">
              <h2 className="scenarios-howto__title">Как пользоваться демо</h2>
              <p className="scenarios-howto__lead">
                Сначала настройте параметры сделки, затем прогоните возврат на
                форме или разберите готовый сценарий на этой странице.
              </p>
            </div>
            <ol className="scenarios-howto__list">
              {HOW_TO_USE.map((item) => (
                <li key={item.title} className="scenarios-howto__item">
                  <h3 className="scenarios-howto__item-title">{item.title}</h3>
                  <p className="scenarios-howto__item-text">{item.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="scenarios-principles" aria-label="Общие правила">
            <div className="scenarios-principles__grid">
              {PRINCIPLES.map((item) => (
                <article key={item.title} className="scenarios-principle">
                  <h2 className="scenarios-principle__title">{item.title}</h2>
                  <p className="scenarios-principle__text">{item.text}</p>
                </article>
              ))}
            </div>
          </section>

          <nav className="scenarios-toc" aria-label="Содержание">
            <p className="scenarios-toc__label">Сценарии</p>
            <ol className="scenarios-toc__list">
              {SCENARIOS.map((scenario, index) => (
                <li key={scenario.id}>
                  <a
                    href={scenariosHash(scenario.id)}
                    onClick={(event) => {
                      event.preventDefault();
                      handleOpenScenario(scenario.id);
                    }}
                  >
                    <span className="scenarios-toc__num">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    {scenario.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </>
      ) : null}

      <div className="scenarios-list">
        {visibleScenarios.map((scenario) => {
          const index =
            focusedIndex >= 0
              ? focusedIndex
              : SCENARIOS.findIndex((item) => item.id === scenario.id);

          return (
            <article
              key={scenario.id}
              id={scenario.id}
              className="scenario-chapter"
            >
              <div className="scenario-chapter__meta">
                <span className="scenario-chapter__num">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="scenario-chapter__eyebrow">
                  {scenario.eyebrow}
                </span>
                <button
                  type="button"
                  className="scenario-chapter__link"
                  onClick={() => {
                    void copyScenarioLink(scenario.id);
                  }}
                >
                  Скопировать ссылку
                </button>
              </div>
              {!focused ? (
                <>
                  <h2 className="scenario-chapter__title">
                    <a
                      className="scenario-chapter__title-link"
                      href={scenariosHash(scenario.id)}
                      onClick={(event) => {
                        event.preventDefault();
                        handleOpenScenario(scenario.id);
                      }}
                    >
                      {scenario.title}
                    </a>
                  </h2>
                  <p className="scenario-chapter__lead">{scenario.lead}</p>
                </>
              ) : null}

              <div className="scenario-chapter__grid">
                <div className="scenario-block">
                  <h3 className="scenario-block__title">Условия</h3>
                  <p className="scenario-block__text">{scenario.when}</p>
                </div>
                <div className="scenario-block">
                  <h3 className="scenario-block__title">Результат</h3>
                  <ul className="scenario-block__list">
                    {scenario.whatHappens.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <ScenarioInteractive key={scenario.id} demo={scenario.demo} />

              {scenario.note ? (
                <p className="scenario-chapter__note">{scenario.note}</p>
              ) : null}
            </article>
          );
        })}
      </div>

      <footer className="scenarios-footer">
        <p className="scenarios-footer__text">
          Чтобы закрепить логику, откройте демо и воспроизведите нужный сценарий
          на полной форме возврата.
        </p>
        {goDemo ? (
          <button
            type="button"
            className="primary-btn scenarios-footer__btn"
            onClick={goDemo}
          >
            Перейти к демо
          </button>
        ) : null}
      </footer>
    </div>
  );
}
