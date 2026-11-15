import { useMemo, useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Gift,
  Plus,
  Settings2,
  Shuffle,
  Trash2,
  Users,
} from 'lucide-react';
import type { EventDetails, Participant } from '../types';
import { COUNTRY_PREFIXES, normalizePhoneForWhatsApp } from '../lib/phone';
import { createParticipant } from '../lib/storage';

interface SetupViewProps {
  participants: Participant[];
  eventDetails: EventDetails;
  isDrawing: boolean;
  onParticipantsChange: (next: Participant[]) => void;
  onEventDetailsChange: (next: EventDetails) => void;
  onSubmitDraw: () => void;
}

export function SetupView({
  participants,
  eventDetails,
  isDrawing,
  onParticipantsChange,
  onEventDetailsChange,
  onSubmitDraw,
}: SetupViewProps) {
  const [showExtras, setShowExtras] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const validation = useMemo(() => {
    const rowErrors: Record<string, string> = {};
    const nameCounts = new Map<string, number>();

    for (const p of participants) {
      const cleanName = p.name.trim().toLowerCase();
      if (cleanName) {
        nameCounts.set(cleanName, (nameCounts.get(cleanName) ?? 0) + 1);
      }
    }

    const activeParticipants: Participant[] = [];

    participants.forEach((p, index) => {
      const isOrganizer = index === 0;
      const hasName = p.name.trim().length > 0;
      const hasPhone = p.phone.trim().length > 0;

      if (isOrganizer) {
        if (!hasName) {
          rowErrors[p.id] = 'Escribe tu nombre (eres quien organiza el sorteo).';
          return;
        }
        if ((nameCounts.get(p.name.trim().toLowerCase()) ?? 0) > 1) {
          rowErrors[p.id] = 'Nombre repetido; añade un apellido o inicial para distinguir.';
          return;
        }
        activeParticipants.push(p);
        return;
      }

      if (!hasName && !hasPhone) {
        return; // Completely empty slot is ignored
      }

      if (!hasName) {
        rowErrors[p.id] = 'Falta el nombre de este participante.';
        return;
      }

      if ((nameCounts.get(p.name.trim().toLowerCase()) ?? 0) > 1) {
        rowErrors[p.id] = 'Nombre repetido; añade un apellido o inicial para distinguir.';
        return;
      }

      if (!hasPhone) {
        rowErrors[p.id] = 'Falta su número de WhatsApp.';
        return;
      }

      const normalized = normalizePhoneForWhatsApp(p.phone, p.countryCode);
      if (!normalized) {
        rowErrors[p.id] = 'Número de WhatsApp no válido (revisa las cifras).';
        return;
      }

      activeParticipants.push(p);
    });

    let formError: string | null = null;
    if (Object.keys(rowErrors).length > 0) {
      formError = 'Revisa los campos marcados antes de hacer el sorteo.';
    } else if (activeParticipants.length < 3) {
      formError = 'Necesitas al menos 3 participantes en total (tú y 2 más).';
    }

    return {
      rowErrors,
      activeCount: activeParticipants.length,
      formError,
    };
  }, [participants]);

  function updateParticipant(id: string, patch: Partial<Participant>) {
    onParticipantsChange(
      participants.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  }

  function removeParticipant(id: string) {
    if (participants.length <= 3) return;
    onParticipantsChange(participants.filter((p) => p.id !== id));
  }

  function addParticipant() {
    onParticipantsChange([...participants, createParticipant()]);
  }

  function handleDrawClick(e: React.FormEvent) {
    e.preventDefault();
    setAttemptedSubmit(true);
    if (validation.formError) return;
    onSubmitDraw();
  }

  return (
    <form className="card" onSubmit={handleDrawClick} noValidate>
      <div className="section-header">
        <h2 className="section-title">
          <Users size={19} />
          Participantes
        </h2>
        <span className="count-pill">{validation.activeCount} listos</span>
      </div>

      <div className="participant-list">
        {participants.map((p, index) => {
          const isOrganizer = index === 0;
          const errorMsg = attemptedSubmit ? validation.rowErrors[p.id] : undefined;
          return (
            <div
              key={p.id}
              className={`participant-row ${errorMsg ? 'participant-row--error' : ''}`}
            >
              <div className="row-index" aria-hidden="true">
                {isOrganizer ? 'Tú' : index + 1}
              </div>
              <div className="row-fields">
                <input
                  type="text"
                  className="input"
                  placeholder={
                    isOrganizer ? 'Tu nombre (quien organiza)' : `Nombre ${index + 1}`
                  }
                  aria-label={
                    isOrganizer ? 'Tu nombre' : `Nombre del participante ${index + 1}`
                  }
                  value={p.name}
                  onChange={(e) => updateParticipant(p.id, { name: e.target.value })}
                />

                {isOrganizer ? (
                  <div
                    style={{
                      fontSize: '0.84rem',
                      color: 'var(--ink-muted)',
                      padding: '0 4px',
                    }}
                  >
                    Verás tu resultado directamente aquí
                  </div>
                ) : (
                  <>
                    <div className="phone-group">
                      <select
                        className="select select-prefix"
                        aria-label={`Prefijo de país de ${p.name || `participante ${index + 1}`}`}
                        value={p.countryCode}
                        onChange={(e) =>
                          updateParticipant(p.id, { countryCode: e.target.value })
                        }
                      >
                        {COUNTRY_PREFIXES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        inputMode="tel"
                        className="input"
                        placeholder="WhatsApp (ej. 612 345 678)"
                        aria-label={`Teléfono WhatsApp del participante ${index + 1}`}
                        value={p.phone}
                        onChange={(e) =>
                          updateParticipant(p.id, { phone: e.target.value })
                        }
                      />
                    </div>

                    <div className="row-actions-mobile">
                      <button
                        type="button"
                        className="icon-btn"
                        title="Eliminar participante"
                        aria-label={`Eliminar participante ${index + 1}`}
                        disabled={participants.length <= 3}
                        onClick={() => removeParticipant(p.id)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </>
                )}

                {errorMsg && <p className="row-error-text">{errorMsg}</p>}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="add-participant-btn"
        onClick={addParticipant}
      >
        <Plus size={18} />
        Añadir otro participante
      </button>

      {/* Collapsible Extras */}
      <div className="extras-section">
        <button
          type="button"
          className="extras-toggle"
          aria-expanded={showExtras}
          onClick={() => setShowExtras((prev) => !prev)}
        >
          <span className="extras-toggle-left">
            <Settings2 size={17} />
            Opciones extra (presupuesto, fecha y nota)
          </span>
          {showExtras ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showExtras && (
          <div className="extras-body">
            <div className="details-grid">
              <div className="full-span">
                <label className="field-label" htmlFor="event-title">
                  Nombre del sorteo
                </label>
                <input
                  id="event-title"
                  type="text"
                  className="input"
                  placeholder="ej. Cena de Navidad"
                  value={eventDetails.title}
                  onChange={(e) =>
                    onEventDetailsChange({ ...eventDetails, title: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="field-label" htmlFor="event-budget">
                  Presupuesto (opcional)
                </label>
                <input
                  id="event-budget"
                  type="text"
                  className="input"
                  placeholder="ej. Máximo 20 €"
                  value={eventDetails.budget}
                  onChange={(e) =>
                    onEventDetailsChange({ ...eventDetails, budget: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="field-label" htmlFor="event-date">
                  Fecha de entrega (opcional)
                </label>
                <input
                  id="event-date"
                  type="text"
                  className="input"
                  placeholder="ej. 24 de diciembre"
                  value={eventDetails.date}
                  onChange={(e) =>
                    onEventDetailsChange({ ...eventDetails, date: e.target.value })
                  }
                />
              </div>

              <div className="full-span">
                <label className="field-label" htmlFor="event-note">
                  Nota para todos (opcional)
                </label>
                <input
                  id="event-note"
                  type="text"
                  className="input"
                  placeholder="ej. ¡No valen calcetines!"
                  value={eventDetails.note}
                  onChange={(e) =>
                    onEventDetailsChange({ ...eventDetails, note: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {attemptedSubmit && validation.formError && (
        <div className="alert alert--error" role="alert">
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{validation.formError}</span>
        </div>
      )}

      <button type="submit" className="primary-btn" disabled={isDrawing}>
        {isDrawing ? (
          <>
            <Shuffle size={19} />
            Preparando sobres secretos…
          </>
        ) : (
          <>
            <Gift size={19} />
            Hacer sorteo y enviar sobres
          </>
        )}
      </button>
    </form>
  );
}
