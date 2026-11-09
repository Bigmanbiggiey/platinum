import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CameraCapture } from './CameraCapture';

const stop = vi.fn();
const getUserMedia = vi.fn();

function fakeStream() {
  return { getTracks: () => [{ stop }] } as unknown as MediaStream;
}

async function liveCamera() {
  const video = document.querySelector('video')!;
  await vi.waitFor(() => expect(getUserMedia).toHaveBeenCalled());
  fireEvent.loadedMetadata(video);
  return video;
}

describe('<CameraCapture />', () => {
  beforeEach(() => {
    stop.mockReset();
    getUserMedia.mockReset().mockResolvedValue(fakeStream());
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia },
      configurable: true,
    });
    vi.spyOn(HTMLVideoElement.prototype, 'videoWidth', 'get').mockReturnValue(1600);
    vi.spyOn(HTMLVideoElement.prototype, 'videoHeight', 'get').mockReturnValue(1200);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as never);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (cb) {
      cb(new Blob(['jpeg'], { type: 'image/jpeg' }));
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('asks for the back camera', async () => {
    render(<CameraCapture onDone={vi.fn()} onCancel={vi.fn()} onFallback={vi.fn()} />);
    await liveCamera();
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: false,
        video: expect.objectContaining({ facingMode: { ideal: 'environment' } }),
      }),
    );
  });

  it('takes several photos and hands them back as JPEG files', async () => {
    const user = userEvent.setup();
    const onDone = vi.fn();
    const { unmount } = render(
      <CameraCapture onDone={onDone} onCancel={vi.fn()} onFallback={vi.fn()} />,
    );
    await liveCamera();
    const shutter = screen.getByRole('button', { name: 'Take photo' });
    await user.click(shutter);
    await user.click(shutter);
    await user.click(screen.getByRole('button', { name: 'Remove photo 1' }));
    await user.click(shutter);
    await user.click(screen.getByRole('button', { name: 'Done (2)' }));

    const files = onDone.mock.calls[0][0] as File[];
    expect(files).toHaveLength(2);
    expect(files[0].type).toBe('image/jpeg');
    expect(files[0].name).toMatch(/\.jpg$/);
    unmount();
    expect(stop).toHaveBeenCalled();
  });

  it('turns the camera off on cancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const { unmount } = render(
      <CameraCapture onDone={vi.fn()} onCancel={onCancel} onFallback={vi.fn()} />,
    );
    await liveCamera();
    expect(screen.getByRole('button', { name: 'Done (0)' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
    unmount();
    expect(stop).toHaveBeenCalled();
  });

  it('asks before discarding photos already taken', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<CameraCapture onDone={vi.fn()} onCancel={onCancel} onFallback={vi.fn()} />);
    await liveCamera();
    await user.click(screen.getByRole('button', { name: 'Take photo' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(confirm).toHaveBeenCalledWith('Discard 1 photo(s)?');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('offers the file picker when camera access is denied', async () => {
    const user = userEvent.setup();
    const onFallback = vi.fn();
    getUserMedia.mockRejectedValue(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
    render(<CameraCapture onDone={vi.fn()} onCancel={vi.fn()} onFallback={onFallback} />);
    expect(await screen.findByText(/Camera access is blocked/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take photo' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Upload instead' }));
    expect(onFallback).toHaveBeenCalled();
  });
});
