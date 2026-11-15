import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { RevealView } from './components/RevealView';
import { SetupView } from './components/SetupView';
import { ShareDashboardView } from './components/ShareDashboardView';
import { encryptPayload } from './lib/crypto';
import { solveSecretSanta, type ExclusionMap } from './lib/draw';
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
    const active = appState.participants.filter(
      (p) =>
        p.name.trim().length > 0 &&
        normalizePhoneForWhatsApp(p.phone, p.countryCode) !== null,
    );

    if (active.length < 3) return;

    const activeIds = active.map((p) => p.id);
    const activeIdSet = new Set(activeIds);

    const scopedExclusions: ExclusionMap = {};
    for (const id of activeIds) {
      const list = (appState.exclusions[id] ?? []).filter((t) => activeIdSet.has(t));
      if (list.length > 0) scopedExclusions[id] = list;
    }

    const assignment = solveSecretSanta(activeIds, scopedExclusions);
    if (!assignment) return;

    setIsDrawing(true);
    try {
      const byId = new Map(active.map((p) => [p.id, p]));
      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      const { title, budget, date, note } = appState.eventDetails;

      const entries: DrawEntry[] = await Promise.all(
        active.map(async (giver) => {
          const receiver = byId.get(assignment[giver.id])!;
          const normalizedPhone = normalizePhoneForWhatsApp(
            giver.phone,
            giver.countryCode,
          )!;

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
          const whatsappUrl = buildWhatsAppShareUrl({
            normalizedPhone,
            giverName: giver.name.trim(),
            secretUrl,
            eventTitle: title.trim() || undefined,
          });

          return {
            giverId: giver.id,
            giverName: giver.name.trim(),
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
          <span className="hero-badge">
            <Sparkles size={14} />
            Gratis · Sin instalar nada · Sin spoilers
          </span>
          <h1 className="hero-title">Amigo Invisible</h1>
          <p className="hero-subtitle">
            {secretToken
              ? 'Alguien te ha enviado tu sobre secreto por WhatsApp.'
              : 'Pon los nombres y WhatsApp, sortea y envía a cada persona su sobre secreto sin ver tú el resultado.'}
          </p>
        </header>

        <main>
          {secretToken ? (
            <RevealView token={secretToken} onCreateNew={handleExitReveal} />
          ) : appState.drawEntries ? (
            <ShareDashboardView
              entries={appState.drawEntries}
              eventTitle={appState.eventDetails.title}
              onMarkSent={handleMarkSent}
              onRedraw={runDraw}
              onBackToEdit={handleBackToEdit}
            />
          ) : (
            <SetupView
              participants={appState.participants}
              exclusions={appState.exclusions}
              eventDetails={appState.eventDetails}
              isDrawing={isDrawing}
              onParticipantsChange={(participants) =>
                setAppState((prev) => ({ ...prev, participants }))
              }
              onExclusionsChange={(exclusions) =>
                setAppState((prev) => ({ ...prev, exclusions }))
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
