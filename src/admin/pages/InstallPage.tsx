import type { ReactNode } from 'react';
import { Button, Card, Label, PageTitle } from '../components/ui';
import { isIos, useInstallPrompt } from '../pwa/useInstallPrompt';

/**
 * "Install app" from the ☰ menu — owner and staff. Always reachable (unlike the
 * Dashboard card, which staff never see and "Not now" hides): one-tap install when the
 * browser offers it, otherwise the steps for this phone.
 */
export function InstallPage() {
  const { canPrompt, prompt, installed, ios } = useInstallPrompt();
  const adminUrl = `${window.location.host}/admin`;

  return (
    <section className="space-y-6">
      <PageTitle>Install the app</PageTitle>

      <Card className="flex items-center gap-4">
        <img src="/icons/admin-192.png" alt="" width={56} height={56} className="rounded-lg" />
        <div>
          <p className="font-semibold">PMS Admin</p>
          <p className="text-sm text-[color:var(--color-muted)]">
            Opens from your home screen, full-screen, like any other app.
          </p>
        </div>
      </Card>

      {installed ? (
        <Card>
          <p className="text-sm">
            <strong>PMS Admin is installed on this device.</strong> Open it from your home
            screen or app drawer.
          </p>
        </Card>
      ) : canPrompt ? (
        <Card className="flex flex-wrap items-center gap-4">
          <p className="flex-1 text-sm">Tap Install, then Install again in the pop-up.</p>
          <Button variant="primary" onClick={() => void prompt()}>
            Install
          </Button>
        </Card>
      ) : ios ? (
        <Steps
          title="iPhone / iPad (Safari)"
          steps={[
            <>
              Tap <strong>Share</strong> (the square with an arrow pointing up).
            </>,
            <>
              Scroll down and tap <strong>Add to Home Screen</strong>.
            </>,
            <>
              Check the name says <strong>PMS Admin</strong>, then tap <strong>Add</strong>.
            </>,
            <>Open it from the home screen and sign in.</>,
          ]}
        />
      ) : isIos() ? (
        <Card>
          <p className="text-sm">
            On iPhone and iPad, apps install from <strong>Safari</strong> only. Open{' '}
            <strong className="font-mono">{adminUrl}</strong> in Safari, then come back to{' '}
            <strong>☰ → Install app</strong>.
          </p>
        </Card>
      ) : (
        <>
          <Steps
            title="Android (Chrome)"
            steps={[
              <>
                Tap Chrome's <strong>⋮</strong> menu (top right).
              </>,
              <>
                Tap <strong>Install app</strong> (or <strong>Add to Home screen → Install</strong>
                ).
              </>,
              <>
                <strong>PMS Admin</strong> appears on your home screen and in the app drawer.
              </>,
            ]}
          />
          <Steps
            title="Computer (Chrome or Edge)"
            steps={[
              <>
                Click the install icon at the right of the address bar, or the browser menu →{' '}
                <strong>Install PMS Admin</strong>.
              </>,
            ]}
          />
          <p className="text-sm text-[color:var(--color-muted)]">
            No Install option? Reload this page once and try again. Firefox can't install
            apps; use Chrome. On iPhone, use Safari.
          </p>
        </>
      )}
    </section>
  );
}

function Steps({ title, steps }: { title: string; steps: ReactNode[] }) {
  return (
    <Card>
      <Label>{title}</Label>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </Card>
  );
}
