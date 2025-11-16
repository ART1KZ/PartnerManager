export interface RawPlace {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  vk?: string;
  raw: unknown;
}

export interface CandidatePlace extends RawPlace {
  aiScore?: number;
  aiReason?: string;
}

export interface ContactResult {
  place: CandidatePlace;
  viaVk: boolean;
  viaEmail: boolean;
  vkSuccess: boolean;
  emailSuccess: boolean;
  error?: string;
}
