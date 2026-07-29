import type { ReactNode } from 'react';
import { assetUrl } from '../assets';

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  setup?: boolean;
};

export function Modal({ title, onClose, children, footer, setup }: ModalProps) {
  return (
    <div className="overlay" role="presentation" onClick={onClose}>
      <div
        className={`modal${setup ? ' modal--setup' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
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
              src={assetUrl('icons/icon-close.svg')}
              alt=""
              width={18}
              height={18}
            />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {footer ? <footer className="modal__footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
