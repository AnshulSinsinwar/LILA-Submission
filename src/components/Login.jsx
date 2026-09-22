import { useState } from 'react';

export default function Login({ onLogin }) {
  const [loading, setLoading] = useState(false);

  const handleConnect = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      onLogin();
    }, 1200); // Simulate network SSO auth delay
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="header-logo" style={{ fontSize: '32px', marginBottom: '12px', justifyContent: 'center', letterSpacing: '-1px' }}>
          <span className="header-logo-accent">LILA</span>
          <span>Pathfinder</span>
        </div>
        <p className="login-subtitle">Internal Player Journey & Level Design Analytics</p>
        
        <form onSubmit={handleConnect} className="login-form">
          <div className="input-group">
            <label>Employee Email</label>
            <input type="email" placeholder="name@lilagames.com" required defaultValue="" spellCheck="false" />
          </div>
          <div className="input-group">
            <label>Password / Security Key</label>
            <input type="password" placeholder="••••••••" required defaultValue="" />
          </div>
          
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '3px', borderTopColor: '#ffffff', margin: '0 auto' }} /> : 'Sign in with LILA SSO'}
          </button>
        </form>

        <div className="login-footer">
          Secured by internal telemetry gateway
        </div>
      </div>
      
      <div className="login-map-bg"></div>
    </div>
  );
}
