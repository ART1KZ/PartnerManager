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

export interface DgisFirmData {
    id?: string;
    url: string;
    name: string;
    address: string; 
    phones: string[];
    emails: string[];
    website: string | null;
    social: DgisSocialObj[];
    rubrics: string[]; 
    citySlug?: string;
}

export interface DgisSocialObj {
    type: string;
    url: string;
}
