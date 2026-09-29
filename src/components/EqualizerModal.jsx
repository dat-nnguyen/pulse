import React, { useState, useEffect, useRef } from 'react';
import { X, Sliders, Sparkles, RefreshCw } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';

const PRESETS = {
  Flat: [0, 0, 0, 0, 0],
  'Bass Boost': [6, 4, 1, 0, 1],
  'Vocal Boost': [-2, 2, 4, 2, -1],
  Acoustic: [3, 2, 0, 2, 3],
  Rock: [4, 2, -1, 2, 4],
  Electronic: [5, 3, 0, 2, 4],
  'Treble Boost': [-2, 0, 2, 4, 6],
};

const BANDS = [
  { label: '60 Hz', sub: 'Sub-Bass' },
  { label: '250 Hz', sub: 'Bass' },
  { label: '1 kHz', sub: 'Mids' },
  { label: '4 kHz', sub: 'Upper Mids' },
  { label: '16 kHz', sub: 'Treble' },
];

export default function EqualizerModal({ isOpen, onClose }) {
  const [activePreset, setActivePreset] = useState('Flat');
  const [bandValues, setBandValues] = useState([0, 0, 0, 0, 0]);
  const [bassBoost, setBassBoost] = useState(0);
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  // Apply preset
  const handleSelectPreset = (name) => {
    setActivePreset(name);
    const gains = PRESETS[name];
    setBandValues([...gains]);
    audioEngine.applyEQPreset(gains);
  };

  // Adjust individual band
  const handleBandChange = (index, value) => {
    const val = parseFloat(value);
    const newValues = [...bandValues];
    newValues[index] = val;
    setBandValues(newValues);
    setActivePreset('Custom');
    audioEngine.setEqualizerBand(index, val);
  };

  // Adjust Bass Boost
  const handleBassBoostChange = (value) => {
    const val = parseFloat(value);
    setBassBoost(val);
    audioEngine.setBassBoost(val);
  };

  // Reset EQ
  const handleReset = () => {
    handleSelectPreset('Flat');
    setBassBoost(0);
    audioEngine.setBassBoost(0);
  };

  // Real-time audio spectrum visualizer loop
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      const freqData = audioEngine.getFrequencyData();
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / freqData.length) * 1.5;
      let x = 0;

      for (let i = 0; i < freqData.length; i++) {
        const barHeight = (freqData[i] / 255) * canvas.height;
        const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);
        grad.addColorStop(0, '#00c2d1');
        grad.addColorStop(1, '#00d8e8');

        ctx.fillStyle = grad;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 2, barHeight);
        x += barWidth;
      }
    };

    draw();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-surface" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sliders size={20} color="var(--pulse-accent)" />
            <h2 className="modal-title">Equalizer</h2>
          </div>
          <button className="aura-circle-btn" onClick={onClose} style={{ width: 30, height: 30 }}>
            <X size={16} />
          </button>
        </div>

        {/* Real-time spectrum visualizer */}
        <div className="eq-visualizer-box">
          <canvas
            ref={canvasRef}
            width={480}
            height={70}
            style={{ width: '100%', height: 70, display: 'block' }}
          />
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Sparkles size={10} color="var(--pulse-accent)" />
            <span>Real-time Web Audio API</span>
          </div>
        </div>

        {/* Presets */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, marginBottom: 14 }}>
          {Object.keys(PRESETS).map((p) => (
            <button
              key={p}
              className={`aura-chip ${activePreset === p ? 'active' : ''}`}
              onClick={() => handleSelectPreset(p)}
            >
              {p}
            </button>
          ))}
        </div>

        {/* 5-Band Sliders */}
        <div className="eq-band-grid">
          {BANDS.map((band, idx) => (
            <div key={band.label} className="eq-band-item">
              <span className="eq-band-value">
                {bandValues[idx] > 0 ? `+${bandValues[idx]}` : bandValues[idx]} dB
              </span>
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={bandValues[idx]}
                onChange={(e) => handleBandChange(idx, e.target.value)}
                className="eq-vertical-slider"
                orient="vertical"
              />
              <span className="eq-band-label">{band.label}</span>
              <span className="eq-band-sublabel">{band.sub}</span>
            </div>
          ))}
        </div>

        {/* Bass Boost */}
        <div className="eq-bass-box">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12.5, fontWeight: 600 }}>
            <span style={{ color: 'var(--text-primary)' }}>Bass Boost</span>
            <span style={{ color: 'var(--pulse-accent)' }}>+{bassBoost} dB</span>
          </div>
          <input
            type="range"
            min="0"
            max="12"
            step="0.5"
            value={bassBoost}
            onChange={(e) => handleBassBoostChange(e.target.value)}
            className="aura-scrubber"
            style={{
              width: '100%',
              height: 5,
              background: `linear-gradient(to right, var(--pulse-accent) 0%, var(--pulse-accent) ${(bassBoost / 12) * 100}%, rgba(255,255,255,0.1) ${(bassBoost / 12) * 100}%, rgba(255,255,255,0.1) 100%)`,
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handleReset}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              fontSize: 12.5,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} />
            <span>Reset</span>
          </button>

          <button className="aura-btn-primary" onClick={onClose} style={{ padding: '8px 20px' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
