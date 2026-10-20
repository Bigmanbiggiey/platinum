import { useState } from 'react';
import { Button, Card, Label } from './ui';
import { useInstallPrompt } from '../pwa/useInstallPrompt';

const DISMISSED_KEY = 'pms-install-dismissed';

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Dashboard card offering to install the admin as "PMS Admin". Android / desktop
 * Chrome get a one-tap button; iPhone Safari gets the Share → Add to Home Screen
 * steps. Hidden once installed, after "Not now", and in browsers that can't install.
 */
export function InstallAppCard() {
  const { canPrompt, prompt, installed, ios } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(wasDismissed);

  if (installed || dismissed || (!canPrompt && !ios)) return null;

  const notNow = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // Private mode / blocked storage: hidden for this visit only.
    }
  };

  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <img src="/icons/admin-192.png" alt="" width={48} height={48} className="rounded-lg" />
      <div className="flex-1">
        <Label>Install the app</Label>
        {ios ? (
          <p className="mt-1 text-sm">
            Add PMS Admin to your home screen: tap <strong>Share</strong>, then{' '}
            <strong>Add to Home Screen</strong>.
          </p>
        ) : (
          <p className="mt-1 text-sm">
            Open the admin from your home screen, full-screen, like any other app.
          </p>
        )}
      </div>
      <div className="flex gap-2">
        {!ios && (
          <Button variant="primary" onClick={() => void prompt()}>
            Install
          </Button>
        )}
        <Button onClick={notNow}>Not now</Button>
      </div>
    </Card>
  );
}
