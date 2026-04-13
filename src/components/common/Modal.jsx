import './Modal.css';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;

  return (
    <div className="glass-modal-overlay" onClick={onClose}>
      <div
        className={`glass-modal modal--${size}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title">{title}</h2>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>
        <div className="modal__body">
          {children}
        </div>
      </div>
    </div>
  );
}
