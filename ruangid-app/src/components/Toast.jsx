import { useState, useEffect, useRef } from 'react';

export default function Toast({ toast }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!toast) return;

    // Show
    setVisible(true);

    // Auto-hide after 3.2 s
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 3200);

    return () => clearTimeout(timerRef.current);
  }, [toast]);

  if (!toast) return null;

  const iconMap = {
    success: 'ri-checkbox-circle-fill',
    error:   'ri-close-circle-fill',
    info:    'ri-information-fill',
  };

  const icon = iconMap[toast.type] ?? iconMap.info;

  return (
    <div className={`toast ${toast.type ?? 'info'}${visible ? ' show' : ''}`} role="status" aria-live="polite">
      <i className={icon} style={{ fontSize: 16, flexShrink: 0 }} />
      {toast.msg}
    </div>
  );
}