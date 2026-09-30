import React, { useCallback, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

// ─── ConfirmDialog Modal ─────────────────────────────────────────────────────
export function ConfirmDialog({
  isOpen,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'info'
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const colors = {
    danger: {
      accent: 'var(--pulse-danger)',
      bg: 'rgba(244, 63, 94, 0.10)',
      border: 'rgba(244, 63, 94, 0.28)',
      btnBg: 'var(--pulse-danger)',
      btnColor: '#fff',
    },
    warning: {
      accent: 'var(--pulse-warning)',
      bg: 'rgba(251, 191, 36, 0.10)',
      border: 'rgba(251, 191, 36, 0.28)',
      btnBg: 'var(--pulse-warning)',
      btnColor: '#07090e',
    },
    info: {
      accent: 'var(--pulse-accent)',
      bg: 'var(--pulse-accent-muted)',
      border: 'var(--pulse-accent-border)',
      btnBg: 'var(--pulse-accent)',
      btnColor: '#07090e',
    },
  };

  const style = colors[variant] || colors.danger;

  return (
    <div
      className="aura-modal-overlay"
      onClick={onCancel}
      style={{ zIndex: 500 }}
    >
      <div
        className="aura-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 420, width: '100%', padding: '28px 24px' }}
      >
        {/* Icon + Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: style.bg,
              border: `1px solid ${style.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={20} color={style.accent} />
          </div>

          <div style={{ flex: 1 }}>
            <h3
              style={{
                margin: '0 0 6px',
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-display)',
              }}
            >
              {title}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: 13.5,
                color: 'var(--text-secondary)',
                lineHeight: 1.55,
              }}
            >
              {message}
            </p>
          </div>

          <button
            className="aura-circle-btn"
            onClick={onCancel}
            style={{ width: 30, height: 30, flexShrink: 0 }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            className="aura-btn-secondary"
            onClick={onCancel}
            style={{ padding: '8px 20px', fontSize: 13 }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: style.btnBg,
              color: style.btnColor,
              border: 'none',
              borderRadius: 'var(--radius-pill)',
              padding: '8px 20px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'opacity 0.15s',
              fontFamily: 'var(--font-body)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── useConfirm Hook ──────────────────────────────────────────────────────────
// Returns a ConfirmDialog-ready state + a `confirm()` function that returns a Promise.
export function useConfirm() {
  const [state, setState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    variant: 'danger',
    resolve: null,
  });

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        title: options.title || 'Are you sure?',
        message: options.message || '',
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        variant: options.variant || 'danger',
        resolve,
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setState((prev) => {
      prev.resolve?.(true);
      return { ...prev, isOpen: false };
    });
  }, []);

  const handleCancel = useCallback(() => {
    setState((prev) => {
      prev.resolve?.(false);
      return { ...prev, isOpen: false };
    });
  }, []);

  const dialogProps = {
    isOpen: state.isOpen,
    title: state.title,
    message: state.message,
    confirmLabel: state.confirmLabel,
    cancelLabel: state.cancelLabel,
    variant: state.variant,
    onConfirm: handleConfirm,
    onCancel: handleCancel,
  };

  return { confirm, dialogProps };
}
