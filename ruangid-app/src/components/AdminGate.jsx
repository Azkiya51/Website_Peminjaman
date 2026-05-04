import { useState } from 'react';

export default function AdminGate({ onLogin, onCancel }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = onLogin(password);
    if (!success) {
      setError('Password salah. Coba lagi.');
      setShake(true);
      setPassword('');
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="admin-gate show">
      <div
        className="admin-gate-card"
        style={shake ? { animation: 'shakeX .4s ease' } : {}}
      >
        {/* Icon */}
        <div className="gate-icon">
          <i className="ri-shield-keyhole-fill" />
        </div>

        <h2>Panel Admin</h2>
        <p>Masukkan password untuk mengakses panel administrasi sistem.</p>

        {/* Form */}
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="gate-input-wrap">
            <i className="ri-lock-password-line gate-lock-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password admin"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              autoFocus
            />
            <button
              type="button"
              className="gate-toggle"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              <i className={showPassword ? 'ri-eye-off-line' : 'ri-eye-line'} />
            </button>
          </div>

          {/* Error */}
          <div className={`gate-error${error ? '' : ' hidden'}`}>
            <i className="ri-error-warning-line" />
            {error}
          </div>

          {/* Actions */}
          <div className="gate-actions">
            <button
              type="button"
              className="btn-ghost"
              style={{ marginTop: 0, width: 'auto' }}
              onClick={onCancel}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{ marginTop: 0, width: 'auto' }}
              disabled={!password}
            >
              <i className="ri-login-circle-line" />
              Masuk
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes shakeX {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-10px); }
          40%      { transform: translateX(10px); }
          60%      { transform: translateX(-8px); }
          80%      { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}