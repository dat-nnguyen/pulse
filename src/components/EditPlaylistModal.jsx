import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Disc3,
  Camera,
  Trash2,
  Link2,
  Check,
  Loader2,
} from 'lucide-react';

/**
 * Spotify-styled "Edit details" modal for playlists.
 * Allows clicking on the avatar photo box to choose a photo,
 * drag & drop from computer, or paste an image URL.
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
      setImageError('Please select a valid image (PNG, JPG, WebP, GIF, SVG).');
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
        toast.info('Photo loaded. Click Save to apply.', { title: 'Photo Selected' });
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
      toast.info('Image URL applied. Click Save to commit.', { title: 'Image URL Set' });
    }
  };

  const handleRemovePhoto = (e) => {
    e.stopPropagation();
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
          maxWidth: 520,
          width: '100%',
          padding: '22px 24px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.08)',
          borderRadius: 14,
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
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
          {/* Balanced 2-Column Content: Left Cover + Right Inputs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '180px 1fr',
              gap: 18,
              alignItems: 'start',
            }}
            className="pulse-edit-details-grid"
          >
            {/* Left Column: Avatar Artwork Box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                  borderRadius: 10,
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
                      Choose photo
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

              {/* Cover Action Links below photo */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '2px 2px',
                }}
              >
                {coverUrl ? (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--pulse-danger)',
                      cursor: 'pointer',
                      fontSize: 11.5,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: 0,
                    }}
                    title="Remove custom photo and reset to default disc"
                  >
                    <Trash2 size={12} />
                    <span>Remove photo</span>
                  </button>
                ) : (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Click photo to browse</span>
                )}

                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: 0,
                  }}
                  title="Paste web image link"
                >
                  <Link2 size={12} />
                  <span>{showUrlInput ? 'Hide' : 'Paste link'}</span>
                </button>
              </div>

              {/* Collapsible Image URL input */}
              {showUrlInput && (
                <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
                  <input
                    type="url"
                    placeholder="https://...image.jpg"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    className="pulse-input"
                    style={{ fontSize: 11.5, padding: '5px 8px', flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    className="aura-btn-primary"
                    style={{ padding: '4px 8px', fontSize: 11.5 }}
                    title="Apply image URL"
                  >
                    <Check size={13} />
                  </button>
                </div>
              )}

              {imageError && (
                <span style={{ color: 'var(--pulse-danger)', fontSize: 11 }}>{imageError}</span>
              )}
            </div>

            {/* Right Column: Name & Description inputs */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                height: 180,
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: 5,
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
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    padding: '8px 12px',
                    width: '100%',
                  }}
                />
              </div>

              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                }}
              >
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    marginBottom: 5,
                  }}
                >
                  Description <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(Optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add an optional description"
                  className="pulse-input"
                  style={{
                    flex: 1,
                    resize: 'none',
                    fontSize: 13,
                    lineHeight: 1.5,
                    padding: '8px 12px',
                    width: '100%',
                    height: '100%',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <span
              style={{
                fontSize: 10.5,
                color: 'var(--text-muted)',
                lineHeight: 1.4,
                maxWidth: 290,
              }}
            >
              By proceeding, you agree to give Pulse access to the image you choose to upload.
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <button
                type="button"
                onClick={onClose}
                className="aura-btn-secondary"
                style={{ padding: '8px 16px', fontSize: 12.5 }}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving || !name.trim()}
                className="aura-btn-primary"
                style={{
                  padding: '8px 24px',
                  fontSize: 12.5,
                  fontWeight: 800,
                  borderRadius: 'var(--radius-pill)',
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="spin" />
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
