import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { env } from "../config/env.ts";
import { regions } from "../config/regions.ts";
import type { DgisFirmData } from "../types.ts";

type Cell = string | number | boolean | null;

export class GoogleSheetsClient {
    private doc: GoogleSpreadsheet;
    private initialized = false;

    constructor() {
        const auth = new JWT({
            email: env.spreadsheets.serviceEmail,
            key: env.spreadsheets.serviceKey.replace(/\\n/g, "\n"),
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });

        this.doc = new GoogleSpreadsheet(env.spreadsheets.spreadsheetId, auth);
    }

    private async init() {
        if (this.initialized) return;
        await this.doc.loadInfo();
        this.initialized = true;
    }

    private async getSheet(sheetName: string) {
        await this.init();
        const sheet = this.doc.sheetsByTitle[sheetName];
        if (!sheet) {
            throw new Error(`Sheet "${sheetName}" not found`);
        }
        return sheet;
    }

    async getAllRows(sheetName: string): Promise<Record<string, Cell>[]> {
        const sheet = await this.getSheet(sheetName);
        const rows = await sheet.getRows();
        return rows.map((row) => row.toObject() as Record<string, Cell>);
    }

    async appendRow(
        data: Record<string, Cell>,
        sheetName: string
    ): Promise<void> {
        const sheet = await this.getSheet(sheetName);
        await sheet.addRow(data);
    }

    async appendRows(
        data: Record<string, Cell>[],
        sheetName: string
    ): Promise<void> {
        const sheet = await this.getSheet(sheetName);
        await sheet.addRows(data);
    }

    // --------- Хелперы для поиска листа / города ---------

    /**
     * Находит конфиг листа и русское имя города по slug из dgisFirmData.
     * Возвращает null, если подходящий город не найден.
     */
    getPartnersSheetByFirmData(
        dgisFirmData: DgisFirmData
    ): { sheetConfig: any; cityName: string } | null {
        let sheetConfig: any | null = null;
        let cityName: string | null = null;

        for (const regionKey in regions) {
            if (sheetConfig) break;

            const region = regions[regionKey];
            for (const cityData of region.cities) {
                // dgisName / citySlug — camelCase-версия того, что у тебя было dgis_name / city_slug
                if (cityData.dgisName !== dgisFirmData.citySlug) continue;

                sheetConfig = region.sheet;
                cityName = cityData.name;
                break;
            }
        }

        if (!sheetConfig || !cityName) return null;

        return { sheetConfig, cityName };
    }

    // --------- Хелперы по соцсетям ---------

    /**
     * Выбрать главную соцсеть (URL):
     * - если есть vkontakte/vk — вернуть её URL
     * - иначе вернуть URL первой соцсети в массиве
     */
    private pickPrimarySocial(social: { type: string; url: string }[]): string {
        if (!social || social.length === 0) return "";

        const vk = social.find(
            (s) => s.type === "vkontakte" || s.type === "vk"
        );
        const target = vk ?? social[0];

        return target.url || "";
    }

    /**
     * Выбрать название мессенджера:
     * - сначала vkontakte
     * - потом telegram
     * - потом whatsapp
     * - если нет — пусто
     */
    private pickMessenger(social: { type: string; url: string }[]): string {
        if (!social || social.length === 0) return "";

        const vk = social.find(
            (s) => s.type === "vkontakte" || s.type === "vk"
        );
        if (vk) return "ВК";

        const tg = social.find((s) => s.type === "telegram");
        if (tg) return "Телеграм";

        const wa = social.find((s) => s.type === "whatsapp");
        if (wa) return "Ватсап";

        return "";
    }

    // --------- Основной метод записи партнёра ---------

    async appendPartnerRow(dgisFirmData: DgisFirmData): Promise<void> {
        // Находим конфиг листа и русское имя города по citySlug
        const mapping = this.getPartnersSheetByFirmData(dgisFirmData);
        if (!mapping) {
            throw new Error(
                `Не удалось найти лист для citySlug="${dgisFirmData.citySlug}"`
            );
        }

        const { sheetConfig, cityName } = mapping;
        const headers = sheetConfig.headers;

        // Телефоны
        const phonesStr =
            dgisFirmData.phones && dgisFirmData.phones.length > 0
                ? dgisFirmData.phones
                      .map((phone, index) => {
                          phone.startsWith(",") || index > 0 ? phone : `'${phone}`;
                      })
                      .join(", ")
                : "";

        // Email'ы
        const emailsStr =
            dgisFirmData.emails && dgisFirmData.emails.length > 0
                ? dgisFirmData.emails.join(", ")
                : "";

        // Главная соцсеть (URL: приоритет vkontakte/vk, иначе первая)
        const primarySocial = this.pickPrimarySocial(dgisFirmData.social || []);

        // Мессенджер (название: ВК / Телеграм / Ватсап, иначе пусто)
        const messenger = this.pickMessenger(dgisFirmData.social || []);

        const writeData =
            messenger === "ВК"
                ? "в вк"
                : dgisFirmData.emails[0]
                ? "на почту"
                : "не написал";

        const dateStr = new Date().toLocaleDateString("ru-RU");
        const infoStr =
            writeData === "не написал"
                ? writeData
                : `Написал ${writeData}, ${dateStr}`;

        // Дата (если колонка есть в headers)
        const hasDateColumn = Boolean(headers.date);

        const row: Record<string, Cell> = {};

        // Маппинг на реальные заголовки таблицы
        row[headers.city] = cityName; // "Город"
        row[headers.partnerName] = dgisFirmData.name; // "Партнер название"
        row[headers.phone] = phonesStr; // "тел. для связи"
        row[headers.messenger] = messenger; // "Мессенджер" (НАЗВАНИЕ)
        row[headers.email] = emailsStr; // "эл. почта"
        row[headers.social] = primarySocial; // "Соц.сеть" (ССЫЛКА)
        row[headers.caller] = "Бот-менеджер"; // "Кто звонил"
        row[headers.info] = infoStr; // "Информация"
        if (hasDateColumn) {
            row[headers.date] = dateStr; // "Дата"
        }

        await this.appendRow(row, sheetConfig.name);
    }
}
