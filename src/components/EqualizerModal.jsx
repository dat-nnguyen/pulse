import React, { useState, useEffect, useRef } from 'react';
import { X, Sliders, Volume2, Sparkles, RefreshCw } from 'lucide-react';
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
        grad.addColorStop(0, '#1ed760');
        grad.addColorStop(1, '#1fdf64');

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
      <div className="modal-surface" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sliders size={22} color="#1ed760" />
            <h2 className="modal-title">Audio Equalizer & Master</h2>
          </div>
          <button className="top-bar-circle-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Real-time spectrum visualizer canvas */}
        <div style={{ marginBottom: 20, background: '#181818', borderRadius: 8, padding: 12, textAlign: 'center' }}>
          <canvas
            ref={canvasRef}
            width={480}
            height={80}
            style={{ width: '100%', height: 80, display: 'block' }}
          />
          <div style={{ fontSize: 11, color: '#727272', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Sparkles size={11} color="#1ed760" />
            <span>Real-time Web Audio API Hardware Acceleration</span>
          </div>
        </div>

        {/* Presets Pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 16 }}>
          {Object.keys(PRESETS).map((p) => (
            <button
              key={p}
              className={`sidebar-filter-pill ${activePreset === p ? 'active' : ''}`}
              onClick={() => handleSelectPreset(p)}
              style={{ fontSize: 12 }}
            >
              {p}
            </button>
          ))}
        </div>

        {/* 5-Band Slider Bars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, margin: '24px 0' }}>
          {BANDS.map((band, idx) => (
            <div
              key={band.label}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
            >
              <span style={{ fontSize: 11, color: '#1ed760', fontWeight: 700 }}>
                {bandValues[idx] > 0 ? `+${bandValues[idx]}` : bandValues[idx]} dB
              </span>
              <input
                type="range"
                min="-12"
                max="12"
                step="0.5"
                value={bandValues[idx]}
                onChange={(e) => handleBandChange(idx, e.target.value)}
                style={{
                  writingMode: 'bt-lr',
                  WebkitAppearance: 'slider-vertical',
                  width: 8,
                  height: 120,
                  cursor: 'pointer',
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#ffffff' }}>{band.label}</span>
              <span style={{ fontSize: 10, color: '#727272' }}>{band.sub}</span>
            </div>
          ))}
        </div>

        {/* Bass Boost Slider */}
        <div style={{ background: '#181818', padding: 14, borderRadius: 8, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
            <span>Bass Boost</span>
            <span style={{ color: '#1ed760' }}>+{bassBoost} dB</span>
          </div>
          <input
            type="range"
            min="0"
            max="12"
            step="0.5"
            value={bassBoost}
            onChange={(e) => handleBassBoostChange(e.target.value)}
            className="custom-range-slider"
            style={{ width: '100%' }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={handleReset}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#b3b3b3',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} />
            <span>Reset to Flat</span>
          </button>

          <button
            className="action-pill-btn"
            style={{ background: '#1ed760', color: '#000000', padding: '10px 24px' }}
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
