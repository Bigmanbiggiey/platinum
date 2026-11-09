import { useEffect, useState } from 'react';

/** True where the browser can open a live camera (secure context + getUserMedia). */
export const canUseCamera = () =>
  typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getUserMedia === 'function';

/** Object URLs for previews, revoked when the files change or the component unmounts. */
export function useObjectUrls(files: File[]) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const next = files.map((f) => URL.createObjectURL(f));
    setUrls(next);
    return () => next.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);
  return urls;
}
