import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  AlertTriangle,
  Calendar,
  EyeOff,
  Gift,
  Mail,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { decryptPayload } from '../lib/crypto';
import type { SecretPayload } from '../types';

interface RevealViewProps {
  token: string;
  onCreateNew: () => void;
}

export function RevealView({ token, onCreateNew }: RevealViewProps) {
  const [payload, setPayload] = useState<SecretPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setRevealed(false);

    decryptPayload(token).then((result) => {
      if (!active) return;
      setPayload(result);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [token]);

  function handleReveal() {
    setRevealed(true);
    try {
      confetti({
        particleCount: 75,
        spread: 68,
        origin: { y: 0.6 },
        colors: ['#6b1d2f', '#d4a353', '#fbf7f0', '#e7c683', '#128c4a'],
      });
    } catch {
      // Ignore confetti errors in headless/restricted environments
    }
  }

  if (loading) {
    return (
      <div className="card reveal-card">
        <div className="envelope-illustration">
          <Mail size={40} />
        </div>
        <h2 className="reveal-greeting">Abriendo tu sobre…</h2>
        <p className="reveal-copy">Descifrando tu resultado de forma segura.</p>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="card reveal-card">
        <div className="envelope-illustration">
          <AlertTriangle size={38} />
        </div>
        <h2 className="reveal-greeting">Enlace no válido</h2>
        <p className="reveal-copy">
          Parece que este enlace está incompleto o se ha cortado al copiarlo. Pídele a
          quien organizó el sorteo que te lo reenvíe.
        </p>
        <button type="button" className="primary-btn" onClick={onCreateNew}>
          <Gift size={18} />
          Organizar un nuevo sorteo
        </button>
      </div>
    );
  }

  return (
    <div className="card reveal-card">
      <div className="envelope-illustration" aria-hidden="true">
        <Mail size={42} />
        <span className="envelope-seal">
          <Gift size={16} />
        </span>
      </div>

      <h2 className="reveal-greeting">¡Hola, {payload.g}!</h2>
      {payload.t && <span className="reveal-event-tag">{payload.t}</span>}

      {!revealed ? (
        <>
          <p className="reveal-copy">
            Tu sobre secreto está listo. Asegúrate de que nadie esté mirando tu pantalla
            antes de abrirlo.
          </p>
          <button type="button" className="primary-btn" onClick={handleReveal}>
            <Sparkles size={19} />
            Abrir mi sobre secreto
          </button>
        </>
      ) : (
        <>
          <div className="reveal-result-box" role="region" aria-live="polite">
            <div className="reveal-label">Te ha tocado regalar a</div>
            <h3 className="reveal-target-name">{payload.r}</h3>

            {(payload.b || payload.d || payload.n) && (
              <div className="reveal-meta-list">
                {payload.b && (
                  <div className="reveal-meta-item">
                    <Wallet size={15} />
                    <span>Presupuesto: {payload.b}</span>
                  </div>
                )}
                {payload.d && (
                  <div className="reveal-meta-item">
                    <Calendar size={15} />
                    <span>Fecha: {payload.d}</span>
                  </div>
                )}
                {payload.n && <div className="reveal-note">“{payload.n}”</div>}
              </div>
            )}
          </div>

          <p className="reveal-copy" style={{ marginTop: 16 }}>
            Guarda el mensaje de WhatsApp por si necesitas volver a consultarlo más
            adelante.
          </p>

          <button
            type="button"
            className="secondary-btn"
            style={{ marginTop: 16, width: '100%' }}
            onClick={() => setRevealed(false)}
          >
            <EyeOff size={16} />
            Ocultar resultado
          </button>
        </>
      )}

      <div>
        <button type="button" className="ghost-link-btn" onClick={onCreateNew}>
          ¿Quieres organizar tu propio Amigo Invisible? Créalo gratis aquí
        </button>
      </div>
    </div>
  );
}
