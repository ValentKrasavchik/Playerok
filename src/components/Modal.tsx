import type { ReactNode } from 'react';
import { assetUrl } from '../assets';
import { useEscapeToClose } from '../useEscapeToClose';

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  setup?: boolean;
  embedded?: boolean;
};

export function Modal({
  title,
  onClose,
  children,
  footer,
  setup,
  embedded,
}: ModalProps) {
  const overlayRef = useEscapeToClose(onClose);

  return (
    <div
      ref={overlayRef}
      data-modal-overlay
      className={embedded ? 'modal-host modal-host--embedded' : 'overlay'}
      role="presentation"
    >
      <div
        className={`modal${setup ? ' modal--setup' : ' modal--refund'}${embedded ? ' modal--embedded' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button
            type="button"
            className="modal__close"
            aria-label="Закрыть"
            onClick={onClose}
          >
            <img
              src={assetUrl(
                setup ? 'icons/icon-close.svg' : 'icons/icon-close-32.svg',
              )}
              alt=""
              width={setup ? 18 : 32}
              height={setup ? 18 : 32}
            />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
