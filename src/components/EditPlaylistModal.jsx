import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Disc3,
  Camera,
  Upload,
  Trash2,
  Sparkles,
  Link2,
  Check,
  Loader2,
} from 'lucide-react';

const PRESET_COVERS = [
  {
    name: 'Acoustic Warmth',
    url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Neon Cyberpunk',
    url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Lo-Fi Chill',
    url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Electric Club',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'High Energy',
    url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
  },
  {
    name: 'Cosmic Ambient',
    url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80',
  },
];

/**
 * Spotify-styled "Edit details" modal for playlists.
 * Allows clicking on the avatar photo box to choose a photo,
 * drag & drop from computer, paste an image URL, or choose curated music presets.
 */
export default function EditPlaylistModal({
  isOpen,
  playlist,
  onClose,
  onSave,
  toast,
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef(null);

  // Sync state whenever playlist prop changes
  useEffect(() => {
    if (playlist) {
      setName(playlist.name || playlist.title || '');
      setDescription(playlist.description || '');
      setCoverUrl(playlist.coverUrl || '');
      setCustomUrlInput('');
      setShowUrlInput(false);
      setImageError('');
    }
  }, [playlist, isOpen]);

  if (!isOpen || !playlist) return null;

  // Process chosen or dropped image file
  const handleProcessImageFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageError('Please select a valid image file (PNG, JPG, WebP, GIF, SVG).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setImageError('Image must be smaller than 8MB.');
      return;
    }

    setImageError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      setCoverUrl(event.target.result);
      if (toast) {
        toast.info('New photo loaded. Click Save to apply.', { title: 'Photo Selected' });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleProcessImageFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessImageFile(file);
  };

  const handleApplyCustomUrl = (e) => {
    e.preventDefault();
    const trimmed = customUrlInput.trim();
    if (!trimmed) return;
    setCoverUrl(trimmed);
    setShowUrlInput(false);
    setCustomUrlInput('');
    if (toast) {
      toast.info('Custom image URL applied. Click Save to commit.', { title: 'Image URL Set' });
    }
  };

  const handleRemovePhoto = () => {
    setCoverUrl('');
    setImageError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const updatedPlaylist = {
        ...playlist,
        name: name.trim(),
        title: name.trim(),
        description: description.trim(),
        coverUrl: coverUrl || null,
        updatedAt: Date.now(),
      };

      await onSave(updatedPlaylist);
      onClose();
    } catch (err) {
      console.error('Failed to update playlist details:', err);
      if (toast) {
        toast.error('Failed to save changes. Please try again.', { title: 'Error' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="aura-modal-overlay" onClick={onClose}>
      <div
        className="aura-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 560,
          width: '100%',
          padding: '24px 26px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Modal Header (Spotify style) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 800,
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          >
            Edit details
          </h2>

          <button
            type="button"
            className="aura-circle-btn"
            onClick={onClose}
            title="Close"
          >
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Main 2-Column Content */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr',
              gap: 20,
              alignItems: 'start',
            }}
            className="pulse-edit-details-grid"
          >
            {/* Left Column: Avatar Artwork Box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div
                className={`pulse-avatar-picker-box ${isDragging ? 'dragging' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                title="Click to choose a photo or drop an image file here"
                style={{
                  width: 180,
                  height: 180,
                  borderRadius: 12,
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: 'pointer',
                  background: 'var(--pulse-bg-raised)',
                  border: isDragging
                    ? '2px dashed var(--pulse-accent)'
                    : coverUrl
                    ? '1px solid var(--border-medium)'
                    : '2px dashed var(--border-medium)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                  transition: 'all var(--transition)',
                }}
              >
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt="Playlist artwork preview"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                    }}
                  >
                    <Disc3 size={48} color="#64748b" />
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
                      No cover
                    </span>
                  </div>
                )}

                {/* Spotify-style hover overlay */}
                <div
                  className="pulse-avatar-hover-overlay"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.65)',
                    backdropFilter: 'blur(2px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    color: '#ffffff',
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                >
                  <Camera size={34} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Choose photo</span>
                </div>
              </div>

              {/* Hidden file selector */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {/* Cover action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="aura-btn-secondary"
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    fontSize: 11.5,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                  }}
                >
                  <Upload size={13} />
                  <span>Choose Photo</span>
                </button>

                {coverUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    style={{
                      background: 'rgba(244, 63, 94, 0.1)',
                      border: '1px solid rgba(244, 63, 94, 0.3)',
                      color: 'var(--pulse-danger)',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    title="Remove custom photo and reset to default disc"
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </button>
                )}
              </div>

              {/* Toggle Paste Image URL */}
              <button
                type="button"
                onClick={() => setShowUrlInput(!showUrlInput)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <Link2 size={12} />
                <span>{showUrlInput ? 'Hide link input' : 'Or paste image link'}</span>
              </button>

              {showUrlInput && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <input
                    type="url"
                    placeholder="https://...image.jpg"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    className="pulse-input"
                    style={{ fontSize: 11, padding: '4px 8px' }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    className="aura-btn-primary"
                    style={{ padding: '4px 8px', fontSize: 11 }}
                  >
                    <Check size={12} />
                  </button>
                </div>
              )}

              {imageError && (
                <span style={{ color: 'var(--pulse-danger)', fontSize: 11 }}>{imageError}</span>
              )}
            </div>

            {/* Right Column: Name & Description inputs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: 6,
                  }}
                >
                  Name <span style={{ color: 'var(--pulse-accent)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Add a name"
                  className="pulse-input"
                  style={{ fontSize: 14, fontWeight: 600, padding: '10px 14px' }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    marginBottom: 6,
                  }}
                >
                  Description <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(Optional)</span>
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add an optional description"
                  className="pulse-input"
                  style={{
                    resize: 'none',
                    fontSize: 13,
                    lineHeight: 1.5,
                    padding: '10px 14px',
                  }}
                />
              </div>

              {/* Curated Presets Bar */}
              <div>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    marginBottom: 8,
                  }}
                >
                  <Sparkles size={12} color="var(--pulse-accent)" />
                  <span>Or select a music preset cover:</span>
                </span>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                  {PRESET_COVERS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setCoverUrl(preset.url)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 8,
                        overflow: 'hidden',
                        padding: 0,
                        border:
                          coverUrl === preset.url
                            ? '2px solid var(--pulse-accent)'
                            : '1px solid var(--border-subtle)',
                        cursor: 'pointer',
                        flexShrink: 0,
                        position: 'relative',
                        transition: 'transform 0.15s ease',
                      }}
                      title={preset.name}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {coverUrl === preset.url && (
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0, 242, 254, 0.4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={14} color="#000000" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer (like Spotify) */}
          <div
            style={{
              marginTop: 24,
              paddingTop: 16,
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                maxWidth: 320,
                lineHeight: 1.4,
              }}
            >
              By proceeding, you agree to give Pulse access to the image you choose to upload.
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={onClose}
                className="aura-btn-secondary"
                style={{ padding: '8px 18px', fontSize: 13 }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="aura-btn-primary"
                style={{
                  padding: '8px 24px',
                  fontSize: 13,
                  fontWeight: 800,
                  borderRadius: 'var(--radius-pill)',
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={15} className="spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
