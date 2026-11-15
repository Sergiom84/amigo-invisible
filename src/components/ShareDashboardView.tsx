import { useState } from 'react';
import {
  Check,
  Copy,
  Edit3,
  Lock,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';
import type { DrawEntry } from '../types';

interface ShareDashboardViewProps {
  entries: DrawEntry[];
  eventTitle: string;
  onMarkSent: (giverId: string) => void;
  onRedraw: () => void;
  onBackToEdit: () => void;
}

export function ShareDashboardView({
  entries,
  eventTitle,
  onMarkSent,
  onRedraw,
  onBackToEdit,
}: ShareDashboardViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sentCount = entries.filter((e) => e.sent).length;
  const totalCount = entries.length;
  const progressPct = totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0;

  async function handleCopyLink(entry: DrawEntry) {
    try {
      await navigator.clipboard.writeText(entry.secretUrl);
      setCopiedId(entry.giverId);
      setTimeout(() => {
        setCopiedId((curr) => (curr === entry.giverId ? null : curr));
      }, 2200);
    } catch {
      // Fallback prompt if clipboard API is restricted
      window.prompt(
        `Copia el sobre secreto de ${entry.giverName} (no lo abras si no es el tuyo):`,
        entry.secretUrl,
      );
    }
  }

  function handleRedrawClick() {
    if (sentCount > 0) {
      const ok = window.confirm(
        'Ya has enviado algún sobre. Si vuelves a sortear, los enlaces anteriores dejarán de coincidir con los nuevos. ¿Seguro que quieres volver a sortear?',
      );
      if (!ok) return;
    }
    onRedraw();
  }

  function handleEditClick() {
    if (sentCount > 0) {
      const ok = window.confirm(
        'Ya has enviado algún sobre. Si editas la lista se descartará este sorteo. ¿Quieres continuar?',
      );
      if (!ok) return;
    }
    onBackToEdit();
  }

  return (
    <div className="card">
      <div className="section-header">
        <h2 className="section-title">
          <Lock size={19} />
          {eventTitle.trim() || 'Sobres listos'}
        </h2>
        <span className="count-pill">
          {sentCount}/{totalCount} enviados
        </span>
      </div>

      <div className="alert alert--info" style={{ marginTop: 0 }}>
        <Lock size={18} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          <strong>Sorteo secreto completado.</strong> Cada botón abre WhatsApp con el
          enlace cifrado de esa persona, sin mostrar quién le ha tocado. No abras los
          enlaces de los demás si tú también juegas.
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
        {entries.map((entry) => (
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
              <div className="share-phone">+{entry.normalizedPhone}</div>
            </div>

            <div className="share-actions">
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
