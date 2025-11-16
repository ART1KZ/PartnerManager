// 

// src/getPlacesToEatInPerm.ts
import axios from 'axios';
// import { DGIS_API_KEY } from './config.js';
// import { DgisPlacesResponse, PlaceToEat } from './dgisTypes.js';

// Координаты Перми (центр города, примерно)
const PERM_LOCATION = '56.316666,58.000000'; // lon,lat [web:94][web:95]

// Базовый URL Places API
const DGIS_BASE_URL = 'https://catalog.api.2gis.com/3.0/items';


interface DgisContact {
  type: string;
  value?: string;
  text?: string;
  url?: string;
  comment?: string;
}

interface DgisContactGroup {
  contacts?: DgisContact[];
}

interface DgisItem {
  id: string;
  name: string;
  type: string;
  address_name?: string;
  address_comment?: string;
  contact_groups?: DgisContactGroup[];
  // address можно детализировать, если нужно
}

interface DgisPlacesResponse {
  meta: { code: number };
  result: { items: DgisItem[]; total: number };
}

export interface PlaceWithContacts {
  id: string;
  name: string;
  fullAddress: string;
  phone?: string;
  email?: string;
  vk?: string;
}

export async function getPlacesToEatInPermWithContacts(
  page = 1,
  pageSize = 10,
) {
  const params = {
    q: 'кафе',
    location: PERM_LOCATION,
    key: process.env.DGIS_API_KEY,
    page: String(page),
    page_size: String(pageSize),
    fields: 'items.contact_groups,items.address',
  };

  const resp = await axios.get(DGIS_BASE_URL, { params });

  if (resp.data.meta.code !== 200) {
    throw new Error(`2GIS API error: code=${resp.data.meta.code}`);
  }

  return resp.data.result.items.map((item: any) => {
    const contacts = (item.contact_groups ?? []).flatMap(
      (g: any) => g.contacts ?? [],
    );

    const phone = pickFirst(contacts, ['phone']);
    const email = pickFirst(contacts, ['email']);
    const vk = pickVk(contacts);

    const fullAddress = buildFullAddress(item);

    return {
      id: item.id,
      name: item.name,
      fullAddress,
      phone,
      email,
      vk,
    };
  });
}

// берём первый контакт нужного типа
function pickFirst(contacts: DgisContact[], types: string[]): string | undefined {
  const c = contacts.find((c) => types.includes(c.type));
  return c?.value || c?.text || c?.url;
}

// ищем VK по типу или по ссылке
function pickVk(contacts: DgisContact[]): string | undefined {
  const vkType = contacts.find((c) => c.type.toLowerCase() === 'vk');
  if (vkType?.url || vkType?.value || vkType?.text) {
    return vkType.url || vkType.value || vkType.text;
  }

  const vkUrl = contacts.find(
    (c) =>
      (c.url && c.url.includes('vk.com')) ||
      (c.value && c.value.includes('vk.com')) ||
      (c.text && c.text.includes('vk.com')),
  );
  return vkUrl?.url || vkUrl?.value || vkUrl?.text;
}

// простой вариант полного адреса
function buildFullAddress(item: DgisItem): string {
  const parts = [item.address_name, item.address_comment].filter(Boolean);
  return parts.join(', ');
}
console.log(await getPlacesToEatInPermWithContacts())
