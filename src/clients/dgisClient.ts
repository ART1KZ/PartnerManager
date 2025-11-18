import axios from "axios";
import { URL } from "url";

export class DgisClient {
    // Базовый домен 2ГИС (ПК-версия)
    readonly baseUrl = "https://2gis.ru";

    // Юзер‑агент, чтобы мимикрировать под браузер и не светиться как скрипт
    readonly userAgent =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

    constructor() {}

    // Забираем HTML страницы поиска по городу/категории и номеру страницы
    async extractEstablishmentsHTML(city: string, category: string, page = 1) {
        const encodedCategory = encodeURIComponent(category);
        const pageSuffix = page === 1 ? "" : `/page/${page}`;
        const url = `${this.baseUrl}/${city}/search/${encodedCategory}${pageSuffix}`;

        const response = await axios.get(url, {
            headers: {
                "User-Agent": this.userAgent,
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "ru,en;q=0.9",
            },
            responseType: "text",
        });

        return response.data as string;
    }

    // Из HTML поиска достаём все ссылки на карточки заведений
    extractFirmUrlsFromSearchHtml(html: string) {
        const regex =
            /href="(?:https?:\/\/2gis\.ru)?(\/[a-z-]+\/firm\/[0-9]+)"/g;

        const urls = new Set<string>();
        let match: RegExpExecArray | null;

        while ((match = regex.exec(html)) !== null) {
            const pathPart = match[1];
            urls.add(`${this.baseUrl}${pathPart}`);
        }

        return [...urls];
    }

    // Вытаскиваем JSON‑состояние из HTML карточки (старый и новый формат)
    extractStateFromHtml(html: string) {
        const legacyMatch = html.match(
            /__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*;<\/script>/
        );

        if (legacyMatch && legacyMatch[1]) {
            return JSON.parse(legacyMatch[1]);
        }

        const initialMatch = html.match(
            /var\s+initialState\s*=\s*JSON\.parse\('([\s\S]*?)'\);/
        );

        if (!initialMatch || !initialMatch[1]) {
            throw new Error("initialState/INITIAL_STATE не найден в HTML");
        }

        const jsonStr = initialMatch[1].replace(/\\"/g, '"');
        return JSON.parse(jsonStr);
    }

    // Достаём ID фирмы из URL карточки
    getFirmIdFromUrl(firmUrl: string) {
        const u = new URL(firmUrl);
        const parts = u.pathname.split("/").filter(Boolean);

        return parts[parts.length - 1];
    }

    // Нормализуем сайт: режем обвязку link.2gis.ru и оставляем реальный домен заведения
    private normalizeWebsite(raw: string) {
        const trimmed = raw.trim();

        if (
            trimmed.startsWith("http://link.2gis.ru") ||
            trimmed.startsWith("https://link.2gis.ru")
        ) {
            const idx = trimmed.lastIndexOf("?");
            if (idx !== -1 && idx + 1 < trimmed.length) {
                const candidate = trimmed.substring(idx + 1);
                if (
                    candidate.startsWith("http://") ||
                    candidate.startsWith("https://")
                ) {
                    return candidate;
                }
            }
        }

        return trimmed;
    }

    // Парсим HTML карточки заведения в удобный плоский объект
    parseFirmFromHtml(html: string, firmUrl: string) {
        const firmId = this.getFirmIdFromUrl(firmUrl);
        const state = this.extractStateFromHtml(html);

        // Берём профиль заведения из initialState по ID
        const entity =
            state.data &&
            state.data.entity &&
            state.data.entity.profile &&
            state.data.entity.profile[firmId] &&
            state.data.entity.profile[firmId].data;

        if (!entity) {
            throw new Error(
                `Данные фирмы ${firmId} не найдены в state.data.entity.profile`
            );
        }

        // Название заведения
        const name =
            (entity.name_ex && entity.name_ex.primary) ||
            entity.name ||
            (entity.name_ex && entity.name_ex.short_name) ||
            null;

        // Адрес и город (из address_name + adm_div)
        const addressName = entity.address_name || null;
        const admDiv = Array.isArray(entity.adm_div) ? entity.adm_div : [];
        const cityObj = admDiv.find((d: any) => d.type === "city");
        const cityName = cityObj ? cityObj.name : null;
        const addressFull =
            cityName && addressName
                ? `${addressName}, ${cityName}`
                : addressName || null;

        // Контакты: телефоны, почта, сайт, соцсети
        const contactGroups = Array.isArray(entity.contact_groups)
            ? entity.contact_groups
            : [];

        const flatContacts = contactGroups.flatMap((g: any) =>
            Array.isArray(g.contacts) ? g.contacts : []
        );

        const phones = flatContacts
            .filter((c: any) => c.type === "phone" && (c.value || c.text))
            .map((c: any) => c.value || c.text);

        const emails = flatContacts
            .filter((c: any) => c.type === "email" && (c.value || c.text))
            .map((c: any) => c.value || c.text);

        // Все сайты из контактов (может быть несколько, в т.ч. с редиректом через link.2gis.ru)
        const rawWebsites = flatContacts
            .filter(
                (c: any) => c.type === "website" && (c.value || c.url || c.text)
            )
            .map((c: any) => c.value || c.url || c.text);

        // Чистим редирект‑обёртку и убираем дубликаты
        const normalizedWebsites = Array.from(
            new Set(
                rawWebsites
                    .map((w: string) => this.normalizeWebsite(w))
                    .filter(Boolean)
            )
        );

        // Берём первый нормализованный сайт как основной
        const website: string | null =
            normalizedWebsites.length > 0 ? normalizedWebsites[0] : null;

        const social = flatContacts
            .filter((c: any) =>
                [
                    "vkontakte",
                    "telegram",
                    "instagram",
                    "vk",
                    "facebook",
                    "ok",
                    "youtube",
                    "whatsapp",
                ].includes(c.type)
            )
            .map((c: any) => ({
                type: c.type,
                url: c.value || c.url || c.text,
            }));

        const rubrics = Array.isArray(entity.rubrics)
            ? entity.rubrics.map((r: any) => r.name)
            : [];

        return {
            id: firmId,
            url: firmUrl,
            name,
            address: addressFull,
            phones,
            emails,
            website,
            social,
            rubrics,
        };
    }

    // HTTP‑запрос за HTML карточки заведения
    async fetchFirmHtml(firmUrl: string) {
        const resp = await axios.get(firmUrl, {
            headers: {
                "User-Agent": this.userAgent,
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "ru,en;q=0.9",
            },
            responseType: "text",
        });

        return resp.data as string;
    }

    // Обёртка: url карточки -> готовый объект заведения
    async fetchFirmData(firmUrl: string) {
        const html = await this.fetchFirmHtml(firmUrl);
        return this.parseFirmFromHtml(html, firmUrl);
    }

    // Полный цикл: поиск -> ссылки карточек -> параллельный сбор объектов
    async fetchFirmsFromSearch(
        city: string,
        category: string,
        pages = 1,
        concurrency = 3
    ) {
        const allFirmUrls = new Set<string>();

        // Собираем ссылки заведений с N страниц поиска
        for (let page = 1; page <= pages; page++) {
            const html = await this.extractEstablishmentsHTML(
                city,
                category,
                page
            );
            const urls = this.extractFirmUrlsFromSearchHtml(html);
            urls.forEach((u) => allFirmUrls.add(u));
        }

        const queue = [...allFirmUrls];
        const results: any[] = [];

        // Простой пул воркеров для параллельных запросов карточек
        const worker = async () => {
            while (queue.length) {
                const firmUrl = queue.shift();
                if (!firmUrl) break;

                try {
                    const firmObj = await this.fetchFirmData(firmUrl);
                    results.push(firmObj);
                    console.log("OK:", firmObj.name, "->", firmUrl);
                } catch (e: any) {
                    console.error("FAIL:", firmUrl, e.message);
                }
            }
        };

        const workers: Promise<void>[] = [];
        for (let i = 0; i < concurrency; i++) {
            workers.push(worker());
        }

        await Promise.all(workers);
        return results;
    }
}
