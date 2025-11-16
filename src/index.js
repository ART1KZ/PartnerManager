// firm-scraper.js
import axios from "axios"
import { URL } from "url";

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function getFirmIdFromUrl(firmUrl) {
  const u = new URL(firmUrl);
  const parts = u.pathname.split('/').filter(Boolean);
  return parts[parts.length - 1]; // 70000001080403982
}

// Достаём JSON состояния из HTML (новый формат: var initialState = JSON.parse('...'))
function extractStateFromHtml(html) {
  // 1) Пытаемся старый вариант (__INITIAL_STATE__), вдруг на каких-то страницах он есть
  const legacyMatch = html.match(/__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*;<\/script>/);
  if (legacyMatch) {
    return JSON.parse(legacyMatch[1]);
  }

  // 2) Новый вариант: var initialState = JSON.parse('...json...');
  const initialMatch = html.match(
    /var\s+initialState\s*=\s*JSON\.parse\('([\s\S]*?)'\);/
  );
  if (!initialMatch) {
    throw new Error('initialState/INITIAL_STATE не найден в HTML');
  }

  // Внутри строки кавычки экранированы как \"
  const jsonStr = initialMatch[1].replace(/\\"/g, '"');
  return JSON.parse(jsonStr);
}

function parseFirmFromHtml(html, firmId) {
  const state = extractStateFromHtml(html); // тут уже полноценный объект initialState [file:37]

  // В твоём дампе данные фирмы лежат в data.entity.profile[id].data [file:37]
  const entity =
    state.data &&
    state.data.entity &&
    state.data.entity.profile &&
    state.data.entity.profile[firmId] &&
    state.data.entity.profile[firmId].data;

  if (!entity) {
    throw new Error(`Данные фирмы ${firmId} не найдены в state.data.entity.profile`);
  }

  // Название [file:37]
  const name =
    (entity.name_ex && entity.name_ex.primary) ||
    entity.name ||
    (entity.name_ex && entity.name_ex.short_name) ||
    null;

  // Адрес + город из address_name и adm_div (type === "city") [file:37]
  const addressName = entity.address_name || null;
  const admDiv = Array.isArray(entity.adm_div) ? entity.adm_div : [];
  const cityObj = admDiv.find(d => d.type === 'city');
  const cityName = cityObj ? cityObj.name : null;
  const addressFull = cityName && addressName
    ? `${addressName}, ${cityName}`
    : addressName || null;

  // Контакты: в дампе они лежат в contact_groups[].contacts[] [file:37]
  const contactGroups = Array.isArray(entity.contact_groups)
    ? entity.contact_groups
    : [];

  const flatContacts = contactGroups.flatMap(g =>
    Array.isArray(g.contacts) ? g.contacts : []
  );

  const phones = flatContacts
    .filter(c => c.type === 'phone' && (c.value || c.text))
    .map(c => c.value || c.text);

  const emails = flatContacts
    .filter(c => c.type === 'email' && (c.value || c.text))
    .map(c => c.value || c.text);

  const websites = flatContacts
    .filter(c => c.type === 'website' && (c.value || c.url || c.text))
    .map(c => c.value || c.url || c.text);

  const social = flatContacts
    .filter(c =>
      ['vkontakte', 'telegram', 'instagram', 'vk', 'facebook', 'ok', 'youtube', 'whatsapp'].includes(
        c.type
      )
    )
    .map(c => ({
      type: c.type,
      url: c.value || c.url || c.text,
    }));

  // Координаты, рейтинг и т.д. (если нужны) [file:37]
  const point = entity.point || null;
  const rating = entity.reviews && entity.reviews.general_rating
    ? entity.reviews.general_rating
    : null;
  const reviewCount = entity.reviews && entity.reviews.general_review_count
    ? entity.reviews.general_review_count
    : null;

  const rubrics = Array.isArray(entity.rubrics)
    ? entity.rubrics.map(r => r.name)
    : [];

  return {
    url: `https://2gis.ru/perm/firm/${firmId}`,
    name,
    address: addressFull,
    // city: cityName,
    // address_raw: entity.address || null, // тут есть postcode, components и т.д. [file:37]
    phones,
    emails,
    websites,
    social,
    point
  };
}

async function fetchFirmsData(firmUrls, concurrency = 3) {
  const results = [];
  const queue = [...firmUrls];

  async function worker() {
    while (queue.length) {
      const firmUrl = queue.shift();
      const firmId = getFirmIdFromUrl(firmUrl);

      try {
        const resp = await axios.get(firmUrl, {
          headers: {
            'User-Agent': USER_AGENT,
            'Accept':
              'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ru,en;q=0.9',
          },
          responseType: 'text',
        });

        const firmObj = parseFirmFromHtml(resp.data, firmId);
        results.push(firmObj);
        console.log('OK:', firmObj.name, '->', firmUrl);
      } catch (e) {
        console.error('FAIL:', firmUrl, e.message);
      }
    }
  }

  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  return results;
}


// Пример использования:
(async () => {
  const firmUrls = [
    'https://2gis.ru/perm/firm/70000001080403982',
    // сюда добавляешь остальные ссылки, которые уже спарсил со страницы поиска
  ];

  const data = await fetchFirmsData(firmUrls, 3);
  console.log(JSON.stringify(data, null, 2));
})();
