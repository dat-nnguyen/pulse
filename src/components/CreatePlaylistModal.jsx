import React, { useState, useRef } from 'react';
import { X, Disc3, Image as ImageIcon, Upload, Check, Sparkles } from 'lucide-react';
import { savePlaylist } from '../services/storageService';

export default function CreatePlaylistModal({
  isOpen,
  onClose,
  onPlaylistCreated,
  currentTrackId,
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Handle local image file upload
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setImageError('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError('Image must be smaller than 5MB.');
      return;
    }

    setImageError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      setCoverUrl(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const newPlaylist = {
        id: `pl_${Date.now()}`,
        name: name.trim(),
        description: description.trim() || 'Custom playlist',
        coverUrl: coverUrl || null,
        createdAt: Date.now(),
        trackIds: currentTrackId ? [currentTrackId] : [],
      };

      await savePlaylist(newPlaylist);
      onPlaylistCreated(newPlaylist);
      handleClose();
    } catch (err) {
      console.error('Failed to create playlist:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setCoverUrl('');
    setImageError('');
    onClose();
  };

  return (
    <div className="aura-modal-overlay" onClick={handleClose}>
      <div
        className="aura-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 460, width: '100%', padding: '28px 24px' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: 'rgba(0, 194, 209, 0.12)',
                border: '1px solid rgba(0, 194, 209, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Disc3 size={18} color="var(--pulse-accent)" />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: 18, margin: 0 }}>Create Playlist</h2>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                Add your own avatar and description
              </p>
            </div>
          </div>
          <button className="aura-circle-btn" onClick={handleClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Avatar / Cover Art Upload Area */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 130,
                height: 130,
                borderRadius: 14,
                border: coverUrl ? '1px solid var(--border-medium)' : '2px dashed var(--border-medium)',
                background: 'var(--pulse-bg-raised)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                position: 'relative',
                transition: 'all var(--transition)',
              }}
              title="Click to upload playlist image"
            >
              {coverUrl ? (
                <>
                  <img
                    src={coverUrl}
                    alt="Playlist cover preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0, 0, 0, 0.55)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      color: '#ffffff',
                      fontSize: 11,
                      fontWeight: 600,
                      gap: 4,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '0')}
                  >
                    <Upload size={18} />
                    <span>Change Image</span>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                  <ImageIcon size={28} color="var(--pulse-accent)" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>Upload Avatar</span>
                  <span style={{ fontSize: 9.5 }}>PNG, JPG, WebP</span>
                </div>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageFileChange}
              style={{ display: 'none' }}
            />

            {coverUrl && (
              <button
                type="button"
                onClick={() => setCoverUrl('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--pulse-danger)',
                  fontSize: 11,
                  cursor: 'pointer',
                  padding: '2px 8px',
                }}
              >
                Remove image
              </button>
            )}

            {imageError && (
              <span style={{ color: 'var(--pulse-danger)', fontSize: 11 }}>{imageError}</span>
            )}
          </div>

          {/* Playlist Name Field */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
              Playlist Name <span style={{ color: 'var(--pulse-accent)' }}>*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Midnight Soundstage, Daily Favorites"
              className="pulse-input"
              style={{ fontSize: 14, padding: '10px 14px' }}
            />
          </div>

          {/* Playlist Description Field */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Description <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(Optional)</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Give your playlist a mood or note..."
              className="pulse-input"
              style={{ resize: 'none', fontSize: 13, padding: '8px 12px' }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
            <button
              type="button"
              className="aura-btn-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="aura-btn-primary"
              disabled={!name.trim() || isSubmitting}
              style={{ padding: '8px 20px' }}
            >
              {isSubmitting ? 'Creating...' : 'Create Playlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
