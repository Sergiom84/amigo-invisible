import type { Participant, PersistedAppState } from '../types';

const STORAGE_KEY = 'amigo_invisible_state_v3';

export function createParticipant(): Participant {
  const id =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    name: '',
    phone: '',
    countryCode: '34',
  };
}

export function createDefaultState(): PersistedAppState {
  // Pre-load 7 rows matching the friend's family size, ready to fill
  const participants = Array.from({ length: 7 }, () => createParticipant());
  return {
    participants,
    exclusions: {},
    eventDetails: {
      title: '',
      budget: '',
      date: '',
      note: '',
    },
    drawEntries: null,
    drawnAt: null,
  };
}

export function loadPersistedState(): PersistedAppState {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();

    const parsed = JSON.parse(raw) as Partial<PersistedAppState>;
    if (!Array.isArray(parsed.participants) || parsed.participants.length < 3) {
      return createDefaultState();
    }

    return {
      participants: parsed.participants.map((p) => ({
        id: String(p.id || createParticipant().id),
        name: String(p.name ?? ''),
        phone: String(p.phone ?? ''),
        countryCode: String(p.countryCode || '34'),
      })),
      exclusions: parsed.exclusions && typeof parsed.exclusions === 'object' ? parsed.exclusions : {},
      eventDetails: {
        title: String(parsed.eventDetails?.title ?? ''),
        budget: String(parsed.eventDetails?.budget ?? ''),
        date: String(parsed.eventDetails?.date ?? ''),
        note: String(parsed.eventDetails?.note ?? ''),
      },
      drawEntries: Array.isArray(parsed.drawEntries) ? parsed.drawEntries : null,
      drawnAt: typeof parsed.drawnAt === 'string' ? parsed.drawnAt : null,
    };
  } catch {
    return createDefaultState();
  }
}

export function savePersistedState(state: PersistedAppState): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota or private-mode errors gracefully
  }
}
