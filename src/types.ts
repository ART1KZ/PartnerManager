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
    id: string;
    url: string;
    name: string;
    category: string | null;
    address: string;
    phones: string[];
    emails: string[];
    website: string | null;
    vkLink: string | null;
    rubrics: string[];
    citySlug?: string;
}

export interface WrittenFirmData extends DgisFirmData {
    writtenData: {
        isSendMailMessage: boolean;
        isSendVkMessage: boolean;
    };
}

export interface ExistingPartnerDatasInSheet {
    dgisIds: string[];
    names: string[];
    vks: string[];
    emails: string[];
}

export interface SheetConfig {
    name: string;
    headers: Record<string, string>;
}

export interface RegionCity {
    name: string;
    dgisName: string;
}

export interface Region {
    name: string;
    shortName: string;
    sheet: SheetConfig;
    cities: RegionCity[];
}
