import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

// ─── Individual Toast Item ─────────────────────────────────────────────────
function Toast({ toast, onRemove }) {
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 320);
  }, [onRemove, toast.id]);

  useEffect(() => {
    if (toast.duration === 0) return; // manual dismiss only
    const t = setTimeout(dismiss, toast.duration ?? 4000);
    return () => clearTimeout(t);
  }, [dismiss, toast.duration]);

  const icons = {
    success: <CheckCircle size={16} />,
    error: <AlertCircle size={16} />,
    warning: <AlertTriangle size={16} />,
    info: <Info size={16} />,
  };

  const colors = {
    success: {
      accent: 'var(--pulse-success)',
      bg: 'rgba(52, 211, 153, 0.10)',
      border: 'rgba(52, 211, 153, 0.25)',
    },
    error: {
      accent: 'var(--pulse-danger)',
      bg: 'rgba(244, 63, 94, 0.10)',
      border: 'rgba(244, 63, 94, 0.25)',
    },
    warning: {
      accent: 'var(--pulse-warning)',
      bg: 'rgba(251, 191, 36, 0.10)',
      border: 'rgba(251, 191, 36, 0.25)',
    },
    info: {
      accent: 'var(--pulse-accent)',
      bg: 'var(--pulse-accent-muted)',
      border: 'var(--pulse-accent-border)',
    },
  };

  const style = colors[toast.type] || colors.info;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '11px 14px',
        borderRadius: 12,
        background: style.bg,
        border: `1px solid ${style.border}`,
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        color: style.accent,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: 'var(--font-body)',
        minWidth: 260,
        maxWidth: 380,
        transform: exiting ? 'translateX(110%)' : 'translateX(0)',
        opacity: exiting ? 0 : 1,
        transition: 'transform 0.32s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.32s ease',
        willChange: 'transform, opacity',
        animation: exiting ? 'none' : 'toastSlideIn 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: 'all',
      }}
    >
      {/* Icon */}
      <span style={{ flexShrink: 0, marginTop: 1 }}>{icons[toast.type] || icons.info}</span>

      {/* Content */}
      <div style={{ flex: 1, lineHeight: 1.45 }}>
        {toast.title && (
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2, color: style.accent }}>
            {toast.title}
          </div>
        )}
        <div style={{ color: toast.title ? 'var(--text-secondary)' : style.accent, fontSize: toast.title ? 12 : 13 }}>
          {toast.message}
        </div>
      </div>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          padding: 2,
          flexShrink: 0,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Toast Container (renders all active toasts) ───────────────────────────
export function ToastContainer({ toasts, onRemove }) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 96,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ─── useToast Hook ─────────────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const addToast = useCallback((message, options = {}) => {
    const id = `toast-${++counterRef.current}`;
    const toast = {
      id,
      message: typeof message === 'string' ? message : message.message,
      title: options.title || (typeof message === 'object' ? message.title : undefined),
      type: options.type || 'info',
      duration: options.duration,
    };
    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (message, opts) => addToast(message, { ...opts, type: 'success' }),
    error: (message, opts) => addToast(message, { ...opts, type: 'error' }),
    warning: (message, opts) => addToast(message, { ...opts, type: 'warning' }),
    info: (message, opts) => addToast(message, { ...opts, type: 'info' }),
  };

  return { toasts, toast, removeToast };
}
