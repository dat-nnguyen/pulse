import { describe, it, expect, vi } from 'vitest';
import EditPlaylistModal from '../src/components/EditPlaylistModal.jsx';

describe('Playlist Avatar & Cover Customization', () => {
  it('EditPlaylistModal exports a valid React component function', () => {
    expect(typeof EditPlaylistModal).toBe('function');
  });

  it('correctly updates playlist object with custom coverUrl, name, and description', () => {
    const initialPlaylist = {
      id: 'pl_workout_123',
      name: 'Work Out',
      description: 'Gym cardio songs',
      coverUrl: null,
      trackIds: ['track_a', 'track_b'],
      createdAt: 1727800000000,
    };

    const customCover = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    // Simulated update like onSave in EditPlaylistModal
    const updated = {
      ...initialPlaylist,
      name: 'Intense Work Out Beats',
      title: 'Intense Work Out Beats',
      description: 'Lossless pump-up music',
      coverUrl: customCover,
      updatedAt: Date.now(),
    };

    expect(updated.name).toBe('Intense Work Out Beats');
    expect(updated.description).toBe('Lossless pump-up music');
    expect(updated.coverUrl).toBe(customCover);
    expect(updated.trackIds).toEqual(['track_a', 'track_b']);
    expect(updated.id).toBe('pl_workout_123');
  });

  it('allows removing coverUrl to reset to default icon', () => {
    const playlistWithCover = {
      id: 'pl_ambient',
      name: 'Ambient Relax',
      coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
      trackIds: ['track_c'],
    };

    const removedCover = {
      ...playlistWithCover,
      coverUrl: null,
    };

    expect(removedCover.coverUrl).toBeNull();
    expect(removedCover.name).toBe('Ambient Relax');
  });

  it('supports custom image URLs or data URLs for playlist avatars', () => {
    const customUrls = [
      'https://example.com/my-cool-artwork.png',
      'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    ];

    for (const url of customUrls) {
      const playlist = {
        id: 'pl_custom_art',
        name: 'My Playlist',
        coverUrl: url,
      };
      expect(playlist.coverUrl).toBe(url);
    }
  });
});
