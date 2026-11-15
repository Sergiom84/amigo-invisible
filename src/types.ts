export interface Participant {
  id: string;
  name: string;
  phone: string;
  countryCode: string;
}

export interface EventDetails {
  title: string;
  budget: string;
  date: string;
  note: string;
}

export interface SecretPayload {
  v: 1;
  g: string; // giver name
  r: string; // receiver name
  t?: string; // event title
  b?: string; // budget
  d?: string; // date
  n?: string; // note
}

export interface DrawEntry {
  giverId: string;
  giverName: string;
  isOrganizer?: boolean;
  normalizedPhone?: string;
  secretUrl: string;
  whatsappUrl?: string;
  sent: boolean;
}

export interface PersistedAppState {
  participants: Participant[];
  exclusions: Record<string, string[]>;
  eventDetails: EventDetails;
  drawEntries: DrawEntry[] | null;
  drawnAt: string | null;
}
