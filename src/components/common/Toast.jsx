import { useToast } from '../../contexts/ToastContext';
import './Toast.css';

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  const getIcon = (type) => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '⚠';
      default: return 'ℹ';
    }
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast--${toast.type} ${toast.exiting ? 'toast-exit' : 'toast-enter'}`}
          onClick={() => removeToast(toast.id)}
        >
          <span className="toast__icon">{getIcon(toast.type)}</span>
          <span className="toast__message">{toast.message}</span>
          <button className="toast__close" onClick={() => removeToast(toast.id)}>×</button>
        </div>
      ))}
    </div>
  );
}
