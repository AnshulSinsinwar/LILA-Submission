import { useState, useEffect } from 'react';

export default function TutorialModal({ onDismiss }) {
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(s => s + 1);
    } else {
      onDismiss();
    }
  };

  const steps = [
    {
      title: 'Analyze the Aggregate',
      desc: 'Start with 10,000-foot view. Leave "All Matches" selected and turn on the Traffic Heatmap to see where players flow organically across multiple days.',
    },
    {
      title: 'Diagnose with Compare Mode',
      desc: 'Turn on Compare mode in the Date Range filter. This renders two overlapping heatmaps (Blue vs Red) perfect for A/B testing map redesigns or patch impacts.',
    },
    {
      title: 'Replay Specific Matches',
      desc: 'Select an individual match from the dropdown to unlock the Timeline Bar. Hit Play to watch humans and bots move, fight, and extract in real-time.',
    }
  ];

  return (
    <div className="login-container" style={{ zIndex: 99999 }}>
      <div className="login-card" style={{ maxWidth: '500px', textAlign: 'center', padding: '40px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--text-primary)' }}>Welcome to LILA Pathfinder</h2>
        
        <div style={{ height: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '15px', color: 'var(--accent-blue)', marginBottom: '8px' }}>
            {step}. {steps[step - 1].title}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {steps[step - 1].desc}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '32px' }}>
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: step === i ? 'var(--accent-blue)' : 'var(--border-light)',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>

        <button 
          onClick={nextStep} 
          className="login-btn"
        >
          {step === totalSteps ? 'Get Started' : 'Next'}
        </button>
      </div>
      <div className="login-map-bg" style={{ filter: 'saturate(0) blur(12px)', opacity: 0.3 }}></div>
    </div>
  );
}
