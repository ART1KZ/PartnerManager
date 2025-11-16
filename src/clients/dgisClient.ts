import axios from 'axios';
import { config } from '../config.js';
// import { RawPlace } from '../types';

interface DgisItem {
  id: string;
  name: string;
  address_name?: string;
  contact_groups?: Array<{
    contacts: Array<{
      type: 'phone' | 'email' | 'vk' | string;
      text: string;
      value?: string;
    }>;
  }>;
}

interface DgisResponse {
  result: {
    items: DgisItem[];
  };
}

export class DgisClient {
  private readonly baseUrl = 'https://catalog.api.2gis.com/3.0';

  async searchPlaces(query: string, page = 1, pageSize = 50) {
    const url = `${this.baseUrl}/items`;
    const res = await axios.get<DgisResponse>(url, {
      params: {
        q: query,
        sort: 'relevance',
        page,
        page_size: pageSize,
        key: config.dgis.apiKey,
        fields: 'items.contact_groups,items.address_name',
      },
    });
    console.log(res)
    const items = res.data.result.items ?? [];

    return items.map((item) => {
      const contacts = (item.contact_groups ?? []).flatMap((g) => g.contacts ?? []);
      const phone = contacts.find((c) => c.type === 'phone')?.value ?? contacts.find((c) => c.type === 'phone')?.text;
      const email = contacts.find((c) => c.type === 'email')?.value ?? contacts.find((c) => c.type === 'email')?.text;
      const vk = contacts.find((c) => c.type === 'vk')?.value ?? contacts.find((c) => c.type === 'vk')?.text;

      return {
        id: item.id,
        name: item.name,
        address: item.address_name ?? '',
        phone,
        email,
        vk,
        raw: item,
      };
    });
  }
}

