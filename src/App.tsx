import { useEffect, useState } from 'react';
import { RevealView } from './components/RevealView';
import { SetupView } from './components/SetupView';
import { ShareDashboardView } from './components/ShareDashboardView';
import { encryptPayload } from './lib/crypto';
import { solveSecretSanta } from './lib/draw';
import { buildWhatsAppShareUrl, normalizePhoneForWhatsApp } from './lib/phone';
import { loadPersistedState, savePersistedState } from './lib/storage';
import type { DrawEntry, PersistedAppState, SecretPayload } from './types';

function extractSecretTokenFromLocation(): string | null {
  const hash = window.location.hash;
  if (hash.startsWith('#s=')) {
    return decodeURIComponent(hash.slice(3));
  }
  const params = new URLSearchParams(window.location.search);
  const queryToken = params.get('s');
  return queryToken ? queryToken : null;
}

export function App() {
  const [secretToken, setSecretToken] = useState<string | null>(() =>
    extractSecretTokenFromLocation(),
  );
  const [appState, setAppState] = useState<PersistedAppState>(() =>
    loadPersistedState(),
  );
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const onHashChange = () => {
      setSecretToken(extractSecretTokenFromLocation());
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    savePersistedState(appState);
  }, [appState]);

  async function runDraw() {
    const active = appState.participants.filter((p, index) => {
      if (index === 0) return p.name.trim().length > 0;
      return (
        p.name.trim().length > 0 &&
        normalizePhoneForWhatsApp(p.phone, p.countryCode) !== null
      );
    });

    if (active.length < 3) return;

    const organizerId = appState.participants[0]?.id;
    const activeIds = active.map((p) => p.id);
    const assignment = solveSecretSanta(activeIds);
    if (!assignment) return;

    setIsDrawing(true);
    try {
      const byId = new Map(active.map((p) => [p.id, p]));
      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      const { title, budget, date, note } = appState.eventDetails;

      const entries: DrawEntry[] = await Promise.all(
        active.map(async (giver) => {
          const isOrganizer = giver.id === organizerId;
          const receiver = byId.get(assignment[giver.id])!;

          const payload: SecretPayload = {
            v: 1,
            g: giver.name.trim(),
            r: receiver.name.trim(),
            ...(title.trim() ? { t: title.trim() } : {}),
            ...(budget.trim() ? { b: budget.trim() } : {}),
            ...(date.trim() ? { d: date.trim() } : {}),
            ...(note.trim() ? { n: note.trim() } : {}),
          };

          const token = await encryptPayload(payload);
          const secretUrl = `${baseUrl}#s=${token}`;

          if (isOrganizer) {
            return {
              giverId: giver.id,
              giverName: giver.name.trim(),
              isOrganizer: true,
              secretUrl,
              sent: true,
            };
          }

          const normalizedPhone = normalizePhoneForWhatsApp(
            giver.phone,
            giver.countryCode,
          )!;
          const whatsappUrl = buildWhatsAppShareUrl({
            normalizedPhone,
            giverName: giver.name.trim(),
            secretUrl,
            eventTitle: title.trim() || undefined,
          });

          return {
            giverId: giver.id,
            giverName: giver.name.trim(),
            isOrganizer: false,
            normalizedPhone,
            secretUrl,
            whatsappUrl,
            sent: false,
          };
        }),
      );

      setAppState((prev) => ({
        ...prev,
        drawEntries: entries,
        drawnAt: new Date().toISOString(),
      }));
    } finally {
      setIsDrawing(false);
    }
  }

  function handleMarkSent(giverId: string) {
    setAppState((prev) => {
      if (!prev.drawEntries) return prev;
      return {
        ...prev,
        drawEntries: prev.drawEntries.map((entry) =>
          entry.giverId === giverId ? { ...entry, sent: true } : entry,
        ),
      };
    });
  }

  function handleBackToEdit() {
    setAppState((prev) => ({
      ...prev,
      drawEntries: null,
      drawnAt: null,
    }));
  }

  function handleExitReveal() {
    window.history.replaceState(null, '', window.location.pathname);
    setSecretToken(null);
  }

  return (
    <div className="app-shell">
      <div className="app-container">
        <header className="hero-header">
          <h1 className="hero-title">Amigo Invisible</h1>
          {!secretToken && (
            <p className="hero-subtitle">
              Pon los nombres y WhatsApp, sortea y envía a cada persona su sobre secreto
              sin ver tú el resultado.
            </p>
          )}
        </header>

        <main>
          {secretToken ? (
            <RevealView token={secretToken} onCreateNew={handleExitReveal} />
          ) : appState.drawEntries ? (
            <ShareDashboardView
              entries={appState.drawEntries}
              eventTitle={appState.eventDetails.title}
              drawnAt={appState.drawnAt}
              onMarkSent={handleMarkSent}
              onRedraw={runDraw}
              onBackToEdit={handleBackToEdit}
            />
          ) : (
            <SetupView
              participants={appState.participants}
              eventDetails={appState.eventDetails}
              isDrawing={isDrawing}
              onParticipantsChange={(participants) =>
                setAppState((prev) => ({ ...prev, participants }))
              }
              onEventDetailsChange={(eventDetails) =>
                setAppState((prev) => ({ ...prev, eventDetails }))
              }
              onSubmitDraw={runDraw}
            />
          )}
        </main>

        <footer className="app-footer">
          Privacidad total: el sorteo se cifra en tu dispositivo y ningún dato se guarda
          en servidores externos.
        </footer>
      </div>
    </div>
  );
}

export default App;
