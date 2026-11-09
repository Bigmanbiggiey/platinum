import { useEffect, useRef, useState } from 'react';
import { Button } from './ui';
import { useObjectUrls } from '../lib/camera';

function cameraError(err: unknown): string {
  switch ((err as { name?: string }).name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Camera access is blocked. Allow it in your browser settings, or upload a photo instead.';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera was found on this device.';
    case 'NotReadableError':
      return 'The camera is in use by another app. Close it and try again.';
    default:
      return 'Could not start the camera.';
  }
}

const stopStream = (s: MediaStream) => s.getTracks().forEach((t) => t.stop());

/**
 * Full-screen camera: take several shots, then hand them back as JPEG files. The files go
 * through the same `prepareImageSet` pipeline as uploads (resize, strip metadata). The
 * camera is switched off on Done / Cancel / unmount and while the app is in the background.
 */
export function CameraCapture({
  onDone,
  onCancel,
  onFallback,
}: {
  onDone: (files: File[]) => void;
  onCancel: () => void;
  /** Called from "Upload instead" when the camera can't start. */
  onFallback: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden');
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [shots, setShots] = useState<File[]>([]);
  const thumbs = useObjectUrls(shots);

  useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    if (hidden) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    const video = videoRef.current;
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 2560 },
          height: { ideal: 1920 },
        },
        audio: false,
      })
      .then((s) => {
        if (cancelled) return stopStream(s);
        stream = s;
        if (video) video.srcObject = s;
      })
      .catch((e) => {
        if (!cancelled) setFailure(cameraError(e));
      });
    return () => {
      cancelled = true;
      if (stream) stopStream(stream);
      if (video) video.srcObject = null;
      setReady(false);
    };
  }, [hidden]);

  const cancel = () => {
    if (shots.length && !confirm(`Discard ${shots.length} photo(s)?`)) return;
    onCancel();
  };

  // Escape cancels; the ref keeps the listener on the latest `shots`.
  const cancelRef = useRef(cancel);
  useEffect(() => {
    cancelRef.current = cancel;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancelRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const shoot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return setFailure('Could not take the photo. Please try again.');
        const name = `photo-${Date.now()}.jpg`;
        setShots((s) => [...s, new File([blob], name, { type: 'image/jpeg' })]);
      },
      'image/jpeg',
      0.92,
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Camera"
      className="fixed inset-0 z-50 flex flex-col bg-black text-white"
    >
      <div className="relative min-h-0 flex-1">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={() => setReady(true)}
          className="h-full w-full object-contain"
        />
        {failure && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
            <p className="text-sm">{failure}</p>
            <Button variant="accent" onClick={onFallback}>
              Upload instead
            </Button>
          </div>
        )}
        {!failure && !ready && !hidden && (
          <p className="absolute inset-0 flex items-center justify-center text-sm opacity-70">
            Starting camera…
          </p>
        )}
      </div>

      {shots.length > 0 && (
        <ul className="flex gap-2 overflow-x-auto px-4 pt-3" aria-label="Photos taken">
          {shots.map((f, i) => (
            <li key={f.name + i} className="relative shrink-0">
              <img
                src={thumbs[i]}
                alt={`Photo ${i + 1}`}
                className="h-16 w-16 rounded object-cover"
              />
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => setShots((s) => s.filter((_, j) => j !== i))}
                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/80 text-xs"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        className="grid grid-cols-3 items-center px-4 pt-4"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <button type="button" onClick={cancel} className="justify-self-start py-3 text-sm">
          Cancel
        </button>
        <button
          type="button"
          aria-label="Take photo"
          disabled={!ready || !!failure}
          onClick={shoot}
          className="h-16 w-16 justify-self-center rounded-full border-4 border-white bg-white/20 active:bg-white/60 disabled:opacity-40"
        />
        <button
          type="button"
          disabled={shots.length === 0}
          onClick={() => onDone(shots)}
          className="justify-self-end py-3 text-sm font-semibold disabled:opacity-40"
        >
          Done ({shots.length})
        </button>
      </div>
    </div>
  );
}
