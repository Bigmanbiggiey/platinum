import { useRef, useState } from 'react';
import { Button } from './ui';
import { CameraCapture } from './CameraCapture';
import { canUseCamera } from '../lib/camera';

/**
 * "Take photo" (in-app camera) + "Upload" (file picker) for adding photos. The camera
 * button only shows where the browser has a live camera API; the picker always shows.
 */
export function PhotoSource({
  onFiles,
  label,
  busy = false,
  busyLabel = 'Uploading…',
  className = '',
}: {
  onFiles: (files: File[]) => void;
  /** Names the upload input for screen readers, e.g. "Add check-in photos". */
  label: string;
  busy?: boolean;
  busyLabel?: string;
  className?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [camera, setCamera] = useState(false);
  const hasCamera = canUseCamera();

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* No `capture` attribute: phones then offer both "Take photo" and the gallery. */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        aria-label={label}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = '';
        }}
      />
      {busy ? (
        <Button disabled>{busyLabel}</Button>
      ) : (
        <>
          {hasCamera && (
            <Button variant="primary" onClick={() => setCamera(true)}>
              Take photo
            </Button>
          )}
          <Button onClick={() => fileRef.current?.click()}>{hasCamera ? 'Upload' : label}</Button>
        </>
      )}
      {camera && (
        <CameraCapture
          onCancel={() => setCamera(false)}
          onDone={(files) => {
            setCamera(false);
            onFiles(files);
          }}
          onFallback={() => {
            setCamera(false);
            fileRef.current?.click();
          }}
        />
      )}
    </div>
  );
}
