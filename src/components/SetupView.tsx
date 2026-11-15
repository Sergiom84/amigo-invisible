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
  X,
} from 'lucide-react';
import type { EventDetails, Participant } from '../types';
import { canSolveDraw, type ExclusionMap } from '../lib/draw';
import { COUNTRY_PREFIXES, normalizePhoneForWhatsApp } from '../lib/phone';
import { createParticipant } from '../lib/storage';

interface SetupViewProps {
  participants: Participant[];
  exclusions: ExclusionMap;
  eventDetails: EventDetails;
  isDrawing: boolean;
  onParticipantsChange: (next: Participant[]) => void;
  onExclusionsChange: (next: ExclusionMap) => void;
  onEventDetailsChange: (next: EventDetails) => void;
  onSubmitDraw: () => void;
}

export function SetupView({
  participants,
  exclusions,
  eventDetails,
  isDrawing,
  onParticipantsChange,
  onExclusionsChange,
  onEventDetailsChange,
  onSubmitDraw,
}: SetupViewProps) {
  const [showExtras, setShowExtras] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [exclA, setExclA] = useState('');
  const [exclB, setExclB] = useState('');
  const [exclMutual, setExclMutual] = useState(true);

  const namedParticipants = useMemo(
    () => participants.filter((p) => p.name.trim().length > 0),
    [participants],
  );

  // Validate rows for inline feedback
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

    for (const p of participants) {
      const hasName = p.name.trim().length > 0;
      const hasPhone = p.phone.trim().length > 0;
      const normalized = hasPhone
        ? normalizePhoneForWhatsApp(p.phone, p.countryCode)
        : null;

      if (!hasName && !hasPhone) {
        continue; // Completely empty slot is ignored
      }

      if (!hasName) {
        rowErrors[p.id] = 'Falta el nombre de este participante.';
        continue;
      }

      if ((nameCounts.get(p.name.trim().toLowerCase()) ?? 0) > 1) {
        rowErrors[p.id] = 'Nombre repetido; añade un apellido o inicial para distinguir.';
        continue;
      }

      if (!hasPhone) {
        rowErrors[p.id] = 'Falta su número de WhatsApp.';
        continue;
      }

      if (!normalized) {
        rowErrors[p.id] = 'Número de WhatsApp no válido (revisa las cifras).';
        continue;
      }

      activeParticipants.push(p);
    }

    const activeIds = activeParticipants.map((p) => p.id);
    const activeIdSet = new Set(activeIds);

    // Filter exclusions to active participants only for feasibility check
    const scopedExclusions: ExclusionMap = {};
    for (const id of activeIds) {
      const list = (exclusions[id] ?? []).filter((target) => activeIdSet.has(target));
      if (list.length > 0) {
        scopedExclusions[id] = list;
      }
    }

    const feasible =
      activeIds.length >= 3 ? canSolveDraw(activeIds, scopedExclusions) : true;

    let formError: string | null = null;
    if (Object.keys(rowErrors).length > 0) {
      formError = 'Revisa los campos marcados antes de hacer el sorteo.';
    } else if (activeParticipants.length < 3) {
      formError = 'Necesitas al menos 3 participantes con nombre y WhatsApp.';
    } else if (!feasible) {
      formError =
        'Con las exclusiones actuales es imposible hacer el sorteo. Elimina alguna restricción.';
    }

    return {
      rowErrors,
      activeCount: activeParticipants.length,
      feasible,
      formError,
    };
  }, [participants, exclusions]);

  const exclusionPairs = useMemo(() => {
    const byId = new Map(participants.map((p) => [p.id, p]));
    const seen = new Set<string>();
    const pairs: Array<{ aId: string; bId: string; aName: string; bName: string; mutual: boolean }> =
      [];

    for (const [aId, targets] of Object.entries(exclusions)) {
      const a = byId.get(aId);
      if (!a || !a.name.trim()) continue;
      for (const bId of targets) {
        const b = byId.get(bId);
        if (!b || !b.name.trim()) continue;
        const isMutual = (exclusions[bId] ?? []).includes(aId);
        const key = isMutual
          ? [aId, bId].sort().join('::')
          : `${aId}->${bId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        pairs.push({
          aId,
          bId,
          aName: a.name.trim(),
          bName: b.name.trim(),
          mutual: isMutual,
        });
      }
    }
    return pairs;
  }, [exclusions, participants]);

  function updateParticipant(id: string, patch: Partial<Participant>) {
    onParticipantsChange(
      participants.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  }

  function removeParticipant(id: string) {
    if (participants.length <= 3) return;
    onParticipantsChange(participants.filter((p) => p.id !== id));

    const nextExcl: ExclusionMap = {};
    for (const [k, list] of Object.entries(exclusions)) {
      if (k === id) continue;
      const filtered = list.filter((target) => target !== id);
      if (filtered.length > 0) nextExcl[k] = filtered;
    }
    onExclusionsChange(nextExcl);
  }

  function addParticipant() {
    onParticipantsChange([...participants, createParticipant()]);
  }

  function addExclusion() {
    if (!exclA || !exclB || exclA === exclB) return;
    const next: ExclusionMap = { ...exclusions };
    const listA = new Set(next[exclA] ?? []);
    listA.add(exclB);
    next[exclA] = [...listA];

    if (exclMutual) {
      const listB = new Set(next[exclB] ?? []);
      listB.add(exclA);
      next[exclB] = [...listB];
    }

    onExclusionsChange(next);
    setExclA('');
    setExclB('');
  }

  function removeExclusion(aId: string, bId: string, mutual: boolean) {
    const next: ExclusionMap = { ...exclusions };
    next[aId] = (next[aId] ?? []).filter((id) => id !== bId);
    if (next[aId].length === 0) delete next[aId];

    if (mutual) {
      next[bId] = (next[bId] ?? []).filter((id) => id !== aId);
      if (next[bId].length === 0) delete next[bId];
    }
    onExclusionsChange(next);
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
          const errorMsg = attemptedSubmit ? validation.rowErrors[p.id] : undefined;
          return (
            <div
              key={p.id}
              className={`participant-row ${errorMsg ? 'participant-row--error' : ''}`}
            >
              <div className="row-index" aria-hidden="true">
                {index + 1}
              </div>
              <div className="row-fields">
                <input
                  type="text"
                  className="input"
                  placeholder={`Nombre ${index + 1} (ej. Marta)`}
                  aria-label={`Nombre del participante ${index + 1}`}
                  value={p.name}
                  onChange={(e) => updateParticipant(p.id, { name: e.target.value })}
                />

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
                    onChange={(e) => updateParticipant(p.id, { phone: e.target.value })}
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
            Opciones extra (presupuesto, fecha y exclusiones)
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
                  placeholder="Amigo Invisible Familiar"
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

            <div className="exclusions-box">
              <p className="exclusions-title">Exclusiones (parejas o vetos)</p>
              <p className="exclusions-hint">
                Evita que dos personas se regalen entre sí.
              </p>

              {namedParticipants.length < 3 ? (
                <p className="exclusions-hint" style={{ marginBottom: 0 }}>
                  Escribe al menos 3 nombres arriba para configurar exclusiones.
                </p>
              ) : (
                <>
                  <div className="exclusion-builder">
                    <select
                      className="select"
                      aria-label="Primera persona de la exclusión"
                      value={exclA}
                      onChange={(e) => setExclA(e.target.value)}
                    >
                      <option value="">Persona 1…</option>
                      {namedParticipants.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name.trim()}
                        </option>
                      ))}
                    </select>

                    <select
                      className="select"
                      aria-label="Segunda persona de la exclusión"
                      value={exclB}
                      onChange={(e) => setExclB(e.target.value)}
                    >
                      <option value="">Persona 2…</option>
                      {namedParticipants
                        .filter((p) => p.id !== exclA)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name.trim()}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="exclusion-options">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={exclMutual}
                        onChange={(e) => setExclMutual(e.target.checked)}
                      />
                      En ambos sentidos (pareja)
                    </label>

                    <button
                      type="button"
                      className="small-btn"
                      disabled={!exclA || !exclB || exclA === exclB}
                      onClick={addExclusion}
                    >
                      <Plus size={15} />
                      Añadir regla
                    </button>
                  </div>

                  {exclusionPairs.length > 0 && (
                    <div className="exclusion-chips">
                      {exclusionPairs.map((pair) => (
                        <span
                          key={`${pair.aId}-${pair.bId}-${pair.mutual}`}
                          className="exclusion-chip"
                        >
                          {pair.aName} {pair.mutual ? '↔' : '↛'} {pair.bName}
                          <button
                            type="button"
                            aria-label={`Quitar exclusión entre ${pair.aName} y ${pair.bName}`}
                            onClick={() =>
                              removeExclusion(pair.aId, pair.bId, pair.mutual)
                            }
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {!validation.feasible && (
        <div className="alert alert--error" role="alert">
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{validation.formError}</span>
        </div>
      )}

      {attemptedSubmit && validation.formError && validation.feasible && (
        <div className="alert alert--error" role="alert">
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{validation.formError}</span>
        </div>
      )}

      <button
        type="submit"
        className="primary-btn"
        disabled={isDrawing || !validation.feasible}
      >
        {isDrawing ? (
          <>
            <Shuffle size={19} />
            Generando sobres secretos…
          </>
        ) : (
          <>
            <Gift size={19} />
            Hacer sorteo y generar sobres
          </>
        )}
      </button>
    </form>
  );
}
