import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobPhotos } from './JobPhotos';
import type { JobPhoto } from '../../lib/jobs';

const photo = (over: Partial<JobPhoto>): JobPhoto => ({
  id: 'ph1',
  job_id: 'j1',
  finding_id: null,
  media_id: 'm1',
  stage: 'diagnosis',
  caption: null,
  is_public: true,
  display_order: 100,
  created_at: '2026-09-30T08:00:00Z',
  media: { storage_path: 'uploads/a.webp', alt_text: 'Worn pads' },
  ...over,
});

describe('<JobPhotos />', () => {
  it('marks hidden photos and toggles visibility', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const hidden = photo({
      id: 'ph2',
      is_public: false,
      media: { storage_path: 'uploads/b.webp', alt_text: 'Plate visible' },
    });
    render(
      <JobPhotos
        photos={[photo({}), hidden]}
        onUpload={vi.fn()}
        onTogglePublic={onToggle}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getAllByText('Hidden from website')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Show on website' }));
    expect(onToggle).toHaveBeenCalledWith(hidden);
  });

  it('passes chosen files to onUpload', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();
    render(
      <JobPhotos
        photos={[]}
        onUpload={onUpload}
        onTogglePublic={vi.fn()}
        onDelete={vi.fn()}
        label="Add before photos"
      />,
    );
    const file = new File(['x'], 'pads.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByLabelText('Add before photos'), file);
    expect(onUpload).toHaveBeenCalledWith([file]);
  });

  it('asks the parent to delete a photo', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const p = photo({});
    render(
      <JobPhotos photos={[p]} onUpload={vi.fn()} onTogglePublic={vi.fn()} onDelete={onDelete} />,
    );
    await user.click(screen.getByRole('button', { name: 'Delete photo' }));
    expect(onDelete).toHaveBeenCalledWith(p);
  });

  it('has no camera button where the browser has no camera API', () => {
    render(
      <JobPhotos photos={[]} onUpload={vi.fn()} onTogglePublic={vi.fn()} onDelete={vi.fn()} />,
    );
    expect(screen.queryByRole('button', { name: 'Take photo' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add photos' })).toBeInTheDocument();
  });

  it('opens the in-app camera beside the upload button', async () => {
    const getUserMedia = vi.fn(() => new Promise<MediaStream>(() => {}));
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia },
      configurable: true,
    });
    try {
      const user = userEvent.setup();
      render(
        <JobPhotos photos={[]} onUpload={vi.fn()} onTogglePublic={vi.fn()} onDelete={vi.fn()} />,
      );
      expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Take photo' }));
      expect(screen.getByRole('dialog', { name: 'Camera' })).toBeInTheDocument();
      expect(getUserMedia).toHaveBeenCalled();
    } finally {
      delete (navigator as { mediaDevices?: unknown }).mediaDevices;
    }
  });
});
