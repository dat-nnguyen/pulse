import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  Volume1,
  Heart,
  Mic2,
  ListMusic,
  Sliders,
  Maximize2
} from 'lucide-react';

export default function PlayerBar({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isShuffle,
  repeatMode,
  isLiked,
  showLyrics,
  showQueue,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLike,
  onToggleLyrics,
  onToggleQueue,
  onOpenEqualizer,
  onOpenFullscreen,
}) {
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);

  const formatTime = (secs) => {
    if (!secs || isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      onVolumeChange(prevVolume || 0.8);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      onVolumeChange(0);
      setIsMuted(true);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercent = volume * 100;

  return (
    <footer className="aura-player-dock">
      {/* Left: Now Playing Details */}
      <div className="aura-dock-left">
        {currentTrack ? (
          <>
            <img
              src={currentTrack.coverUrl || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80'}
              alt={currentTrack.title}
              className="aura-dock-cover"
              onClick={onOpenFullscreen}
              style={{ cursor: 'pointer' }}
            />
            <div className="aura-dock-info">
              <span
                className="aura-dock-title"
                onClick={onOpenFullscreen}
                style={{ cursor: 'pointer' }}
                title={currentTrack.title}
              >
                {currentTrack.title}
              </span>
              <span className="aura-dock-artist" title={currentTrack.artist}>
                {currentTrack.artist}
              </span>
            </div>

            {/* Embedded Live Waveform Indicator */}
            {isPlaying && (
              <div className="aura-dock-waveform" title="Audio hardware active">
                <div className="aura-wave-bar" />
                <div className="aura-wave-bar" />
                <div className="aura-wave-bar" />
                <div className="aura-wave-bar" />
                <div className="aura-wave-bar" />
              </div>
            )}

            <button
              className={`aura-control-btn ${isLiked ? 'active' : ''}`}
              onClick={onToggleLike}
              title={isLiked ? 'Remove from Favorites' : 'Save to Favorites'}
            >
              <Heart size={18} fill={isLiked ? '#f43f5e' : 'none'} color={isLiked ? '#f43f5e' : 'currentColor'} />
            </button>
          </>
        ) : (
          <div className="aura-dock-info">
            <span className="aura-dock-title" style={{ color: 'var(--text-muted)' }}>Pulse Audio</span>
            <span className="aura-dock-artist">Select a track to play</span>
          </div>
        )}
      </div>

      {/* Center: Playback Controls & Waveform Scrubber */}
      <div className="aura-dock-center">
        <div className="aura-dock-controls">
          <button
            className={`aura-control-btn ${isShuffle ? 'active' : ''}`}
            onClick={onToggleShuffle}
            title={isShuffle ? 'Disable shuffle' : 'Enable shuffle'}
          >
            <Shuffle size={16} />
          </button>

          <button className="aura-control-btn" onClick={onPrev} title="Previous">
            <SkipBack size={20} />
          </button>

          <button
            className="aura-play-btn"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={20} fill="#ffffff" /> : <Play size={20} fill="#ffffff" style={{ marginLeft: 2 }} />}
          </button>

          <button className="aura-control-btn" onClick={onNext} title="Next">
            <SkipForward size={20} />
          </button>

          <button
            className={`aura-control-btn ${repeatMode !== 'off' ? 'active' : ''}`}
            onClick={onToggleRepeat}
            title={`Repeat mode: ${repeatMode}`}
          >
            {repeatMode === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}
          </button>
        </div>

        <div className="aura-dock-timeline">
          <span className="aura-time-label">{formatTime(currentTime)}</span>
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="aura-scrubber"
            style={{
              background: `linear-gradient(to right, var(--pulse-accent) 0%, var(--pulse-accent) ${progressPercent}%, rgba(255, 255, 255, 0.12) ${progressPercent}%, rgba(255, 255, 255, 0.12) 100%)`,
            }}
          />
          <span className="aura-time-label">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Lyrics, Queue, Equalizer, Volume, Fullscreen */}
      <div className="aura-dock-right">
        <button
          className={`aura-control-btn ${showLyrics ? 'active' : ''}`}
          onClick={onToggleLyrics}
          title="Karaoke Lyrics"
        >
          <Mic2 size={18} />
        </button>

        <button
          className={`aura-control-btn ${showQueue ? 'active' : ''}`}
          onClick={onToggleQueue}
          title="Session Queue"
        >
          <ListMusic size={18} />
        </button>

        <button
          className="aura-control-btn"
          onClick={onOpenEqualizer}
          title="Sound Equalizer"
        >
          <Sliders size={18} />
        </button>

        {/* Volume Control */}
        <div className="aura-volume-control">
          <button className="aura-control-btn" onClick={handleMuteToggle} title={isMuted ? 'Unmute' : 'Mute'}>
            {isMuted || volume === 0 ? (
              <VolumeX size={18} />
            ) : volume < 0.5 ? (
              <Volume1 size={18} />
            ) : (
              <Volume2 size={18} />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setIsMuted(false);
              onVolumeChange(parseFloat(e.target.value));
            }}
            className="aura-scrubber aura-volume-slider"
            style={{
              background: `linear-gradient(to right, #ffffff 0%, #ffffff ${volumePercent}%, rgba(255, 255, 255, 0.12) ${volumePercent}%, rgba(255, 255, 255, 0.12) 100%)`,
            }}
          />
        </div>

        {/* Expand / Soundstage Fullscreen Button */}
        <button
          className="aura-control-btn aura-fullscreen-btn"
          onClick={onOpenFullscreen}
          title="Open Soundstage Player"
        >
          <Maximize2 size={16} />
        </button>
      </div>
    </footer>
  );
}
