import { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Check,
  Copy,
  Edit3,
  EyeOff,
  Lock,
  MessageCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { decryptPayload } from '../lib/crypto';
import type { DrawEntry } from '../types';

interface ShareDashboardViewProps {
  entries: DrawEntry[];
  eventTitle: string;
  drawnAt: string | null;
  onMarkSent: (giverId: string) => void;
  onRedraw: () => void;
  onBackToEdit: () => void;
}

export function ShareDashboardView({
  entries,
  eventTitle,
  drawnAt,
  onMarkSent,
  onRedraw,
  onBackToEdit,
}: ShareDashboardViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [organizerTarget, setOrganizerTarget] = useState<string | null>(null);
  const [hasOpenedOwn, setHasOpenedOwn] = useState(false);

  const organizerEntry = entries.find((e) => e.isOrganizer);
  const recipientEntries = entries.filter((e) => !e.isOrganizer);

  const sentCount = recipientEntries.filter((e) => e.sent).length;
  const totalCount = recipientEntries.length;
  const progressPct = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;
  const hasStartedSharing = sentCount > 0 || hasOpenedOwn;

  const formattedTime = drawnAt
    ? new Date(drawnAt).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  async function handleToggleOrganizerReveal() {
    if (organizerTarget) {
      setOrganizerTarget(null);
      return;
    }
    if (!organizerEntry) return;
    const hashIndex = organizerEntry.secretUrl.indexOf('#s=');
    if (hashIndex === -1) return;
    const token = organizerEntry.secretUrl.slice(hashIndex + 3);
    const payload = await decryptPayload(token);
    if (!payload) return;
    setOrganizerTarget(payload.r);
    setHasOpenedOwn(true);
    try {
      confetti({
        particleCount: 65,
        spread: 65,
        origin: { y: 0.45 },
        colors: ['#6b1d2f', '#d4a353', '#fbf7f0', '#e7c683', '#128c4a'],
      });
    } catch {
      // Ignore confetti errors
    }
  }

  async function handleCopyLink(entry: DrawEntry) {
    try {
      await navigator.clipboard.writeText(entry.secretUrl);
      setCopiedId(entry.giverId);
      onMarkSent(entry.giverId);
      setTimeout(() => {
        setCopiedId((curr) => (curr === entry.giverId ? null : curr));
      }, 2200);
    } catch {
      window.prompt(
        `Copia el sobre secreto de ${entry.giverName} (no lo abras si no es el tuyo):`,
        entry.secretUrl,
      );
      onMarkSent(entry.giverId);
    }
  }

  function handleRedrawClick() {
    if (hasStartedSharing) {
      const ok = window.confirm(
        '⚠️ Ya has abierto, copiado o enviado algún sobre de este sorteo.\n\nSi vuelves a sortear, se creará un sorteo nuevo y los enlaces anteriores dejarán de valer (tendrás que reenviar TODOS los WhatsApps).\n\n¿Seguro que quieres hacer un sorteo nuevo?',
      );
      if (!ok) return;
    }
    setOrganizerTarget(null);
    setHasOpenedOwn(false);
    onRedraw();
  }

  function handleEditClick() {
    if (hasStartedSharing) {
      const ok = window.confirm(
        '⚠️ Ya has abierto, copiado o enviado algún sobre de este sorteo.\n\nSi editas la lista para añadir o cambiar participantes, tendrás que volver a sortear y reenviar TODOS los WhatsApps de nuevo.\n\n¿Quieres continuar?',
      );
      if (!ok) return;
    }
    setOrganizerTarget(null);
    setHasOpenedOwn(false);
    onBackToEdit();
  }

  return (
    <div className="card">
      <div className="section-header">
        <h2 className="section-title">
          <Lock size={19} />
          {eventTitle.trim() || 'Sobres listos'}
          {formattedTime && (
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: '0.78rem',
                fontWeight: 500,
                color: 'var(--ink-muted)',
              }}
            >
              · {formattedTime}
            </span>
          )}
        </h2>
        <span className="count-pill">
          {sentCount}/{totalCount} enviados
        </span>
      </div>

      {organizerEntry && (
        <div
          style={{
            marginBottom: 16,
            padding: 14,
            borderRadius: 'var(--radius-md)',
            background: 'var(--burgundy-soft)',
            border: '1px solid rgba(107, 29, 47, 0.2)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, color: 'var(--burgundy-dark)' }}>
                Tu sobre ({organizerEntry.giverName})
              </div>
              <div style={{ fontSize: '0.83rem', color: 'var(--ink-muted)' }}>
                {organizerTarget
                  ? 'Toca para volver a ocultarlo'
                  : 'Descubre aquí a quién te ha tocado regalar'}
              </div>
            </div>
            <button
              type="button"
              className="small-btn"
              onClick={handleToggleOrganizerReveal}
            >
              {organizerTarget ? (
                <>
                  <EyeOff size={15} />
                  Ocultar
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  Abrir mi sobre
                </>
              )}
            </button>
          </div>

          {organizerTarget && (
            <div
              className="reveal-result-box"
              style={{ marginTop: 12, padding: '16px 14px', textAlign: 'center' }}
            >
              <div className="reveal-label">Te ha tocado regalar a</div>
              <h3 className="reveal-target-name" style={{ fontSize: '1.75rem' }}>
                {organizerTarget}
              </h3>
            </div>
          )}
        </div>
      )}

      <div className="alert alert--info" style={{ marginTop: 0 }}>
        <Lock size={18} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          <strong>Sorteo secreto completado.</strong> Cada botón abre WhatsApp con el
          enlace cifrado de esa persona, sin mostrar quién le ha tocado.
        </span>
      </div>

      <div className="progress-wrap">
        <div className="progress-label">
          <span>Progreso de envío</span>
          <span>
            {sentCount === totalCount
              ? '¡Todos enviados! 🎉'
              : `Faltan ${totalCount - sentCount}`}
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="share-list">
        {recipientEntries.map((entry) => (
          <div
            key={entry.giverId}
            className={`share-item ${entry.sent ? 'share-item--sent' : ''}`}
          >
            <div className="share-person">
              <div className="share-name-row">
                <span className="share-name">{entry.giverName}</span>
                <span
                  className={`status-badge ${
                    entry.sent ? 'status-badge--sent' : 'status-badge--pending'
                  }`}
                >
                  {entry.sent ? 'Enviado ✓' : 'Pendiente'}
                </span>
              </div>
              {entry.normalizedPhone && (
                <div className="share-phone">+{entry.normalizedPhone}</div>
              )}
            </div>

            <div className="share-actions">
              {entry.whatsappUrl && (
                <a
                  href={entry.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`whatsapp-btn ${entry.sent ? 'whatsapp-btn--sent' : ''}`}
                  onClick={() => onMarkSent(entry.giverId)}
                >
                  <MessageCircle size={17} />
                  {entry.sent ? 'Reenviar' : 'Enviar WhatsApp'}
                </a>
              )}

              <button
                type="button"
                className="copy-btn"
                title={`Copiar enlace secreto de ${entry.giverName}`}
                aria-label={`Copiar enlace secreto de ${entry.giverName}`}
                onClick={() => handleCopyLink(entry)}
              >
                {copiedId === entry.giverId ? (
                  <>
                    <Check size={15} />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy size={15} />
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-footer">
        <button type="button" className="secondary-btn" onClick={handleRedrawClick}>
          <RefreshCw size={16} />
          Volver a sortear
        </button>
        <button type="button" className="secondary-btn" onClick={handleEditClick}>
          <Edit3 size={16} />
          Editar lista
        </button>
      </div>
    </div>
  );
}
