import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { env } from "../config/env.js";
import { regions } from "../config/regions.js";
import type { DgisFirmData, UniquePartnerDatasInSheet } from "../types.js";

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
                if (cityData.dgisName !== dgisFirmData.citySlug) continue;

                sheetConfig = region.sheet;
                cityName = cityData.name;
                break;
            }
        }

        if (!sheetConfig || !cityName) return null;

        return { sheetConfig, cityName };
    }

    /**
     * Массовое добавление партнёров
     * Группирует по листам и добавляет батчами
     */
    async appendPartnerRows(firms: DgisFirmData[]): Promise<void> {
        // Группируем фирмы по листам
        const firmsBySheet = new Map<string, DgisFirmData[]>();

        for (const firm of firms) {
            const mapping = this.getPartnersSheetByFirmData(firm);
            if (!mapping) {
                console.warn(
                    `Пропуск: лист не найден для citySlug="${firm.citySlug}"`
                );
                continue;
            }

            const sheetName = mapping.sheetConfig.name;

            // Если по названию листа ничего не записано, то записывается пустой массив
            if (!firmsBySheet.has(sheetName)) {
                firmsBySheet.set(sheetName, []);
            }

            // Добавление обьекта заведения в массив по названию листа
            firmsBySheet.get(sheetName)!.push(firm);
        }

        for (const [sheetName, sheetFirms] of firmsBySheet) {
            const mapping = this.getPartnersSheetByFirmData(sheetFirms[0]);
            if (!mapping) continue;

            const rows = sheetFirms.map((firm) =>
                this.convertFirmToRow(firm, mapping)
            );

            await this.appendRows(rows, sheetName);
            console.log(
                `✓ Добавлено ${rows.length} партнёров в "${sheetName}"`
            );
        }
    }

    /**
     * Преобразование DgisFirmData в строку таблицы
     */
    private convertFirmToRow(
        dgisFirmData: DgisFirmData,
        mapping: { sheetConfig: any; cityName: string }
    ): Record<string, Cell> {
        const { sheetConfig, cityName } = mapping;
        const headers = sheetConfig.headers;

        // Телефоны
        const phonesStr =
            dgisFirmData.phones && dgisFirmData.phones.length > 0
                ? `'${dgisFirmData.phones.join(", ")}`
                : "";

        // Email'ы
        const emailsStr =
            dgisFirmData.emails && dgisFirmData.emails.length > 0
                ? dgisFirmData.emails.join(", ")
                : "";

        const messenger = dgisFirmData.vkLink ? "ВК" : "";

        const social = dgisFirmData.vkLink || "";

        const hasDateColumn = Boolean(headers.date);
        const dateStr = new Date().toLocaleDateString("ru-RU");

        let infoStr = "";

        dgisFirmData.vkLink ? (infoStr += "в вк") : null;
        dgisFirmData.emails.length > 0
            ? (infoStr += infoStr.length > 0 ? " и на почту" : "на почту")
            : null;

        infoStr = "Написал " + infoStr;

        if (!hasDateColumn) {
            infoStr += ` ${dateStr}`;
        }

        const row: Record<string, Cell> = {};

        // Маппинг на реальные заголовки таблицы
        row[headers.city] = cityName;
        row[headers.partnerName] = dgisFirmData.category
            ? `${dgisFirmData.name}, ${dgisFirmData.category}`
            : dgisFirmData.name || "";
        row[headers.phone] = phonesStr;
        row[headers.messenger] = messenger;
        row[headers.email] = emailsStr;
        row[headers.social] = social;
        row[headers.info] = infoStr;
        row[headers.caller] = "Бот-менеджер";
        row[headers.dgisId] = dgisFirmData.id ? dgisFirmData.id : "";

        if (hasDateColumn) {
            row[headers.date] = dateStr;
        }

        return row;
    }

    /**
     * Добавление одного партнёра (для единичных случаев)
     */
    async appendPartnerRow(dgisFirmData: DgisFirmData): Promise<void> {
        const mapping = this.getPartnersSheetByFirmData(dgisFirmData);

        if (!mapping) {
            throw new Error(
                `Не удалось найти лист для citySlug="${dgisFirmData.citySlug}"`
            );
        }

        const row = this.convertFirmToRow(dgisFirmData, mapping);
        await this.appendRow(row, mapping.sheetConfig.name);
    }

    async getAllHeaderRows(sheetName: string, headerName: string) {
        const sheet = await this.getSheet(sheetName);
        const rows = await sheet.getRows();

        return rows.map((row) => row.get(headerName));
    }

    private normalizeFirmName(name: string): string {
        return name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ") // множественные пробелы в один
            .replace(/[«»"']/g, "") // убираем кавычки разных типов
            .replace(/[‐–—-]/g, "-"); // нормализуем дефисы
    }

    /**
     * Получить уникальные данные партнёров из листа для проверки дубликатов
     * @param sheetName - название листа (например, "Пермский край новые партнеры")
     * @param headers - объект headers из sheetConfig (например, regions.PK.sheet.headers)
     */
    async getUniquePartnerDatasInSheet(
        sheetName: string,
        headers: Record<string, string>
    ): Promise<UniquePartnerDatasInSheet> {
        const rows = await this.getAllRows(sheetName);

        const names = new Set<string>();
        const vks = new Set<string>();
        const dgisIds = new Set<string>();
        const emails = new Set<string>();

        for (const row of rows) {
            // Собираем имена
            const name = row[headers.partnerName];
            if (name && typeof name === "string" && name.trim()) {
                names.add(name.trim());
            }

            // Собираем VK ссылки
            const vk = row[headers.social];
            if (vk && typeof vk === "string" && vk.trim()) {
                vks.add(vk.trim());
            }

            // Собираем 2GIS ID
            const dgisId = row[headers.dgisId];
            if (dgisId && typeof dgisId === "string" && dgisId.trim()) {
                dgisIds.add(dgisId.trim());
            }

            // Собираем emails (может быть несколько через запятую)
            const emailStr = row[headers.email];
            if (emailStr && typeof emailStr === "string" && emailStr.trim()) {
                const emailList = emailStr
                    .split(",")
                    .map((e) => e.trim())
                    .filter(Boolean);
                emailList.forEach((email) => emails.add(email));
            }
        }

        return {
            names: Array.from(names),
            vks: Array.from(vks),
            dgisIds: Array.from(dgisIds),
            emails: Array.from(emails),
        };
    }
}
