import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import type { HeadersType, OldHeadersType } from "../config/regions.js";
import type { ExistingPartnerDatasInSheet, WrittenFirmData } from "../types.js";
import { RegionConfigService } from "../services/regionConfigService.js";

type Cell = string | number | boolean | null;

export class GoogleSheetsClient {
    private readonly doc: GoogleSpreadsheet;
    private initialized = false;

    constructor(email: string, serviceKey: string, spreadsheetId: string) {
        const auth = new JWT({
            email,
            key: serviceKey.includes("\\n")
                ? serviceKey.replace(/\\n/g, "\n")
                : serviceKey,
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });

        this.doc = new GoogleSpreadsheet(spreadsheetId, auth);
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
     * Добавление партнёров в Google Sheets
     *          по данным о фирмах из 2ГИС
     * @param {DgisFirmData[]} firms - данные о фирмах из 2ГИС
     * @returns Promise, который резолвится,
     *          когда все партнёры добавлены
     */
    async appendPartnerRows(firms: WrittenFirmData[]): Promise<void> {
        // Группируем фирмы по листам
        const firmsBySheet = new Map<string, WrittenFirmData[]>();

        for (const firm of firms) {
            const mapping =
                RegionConfigService.getPartnersSheetByFirmData(firm);
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
            const mapping = RegionConfigService.getPartnersSheetByFirmData(
                sheetFirms[0]
            );
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

    private convertFirmToRow(
        firmData: WrittenFirmData,
        mapping: { sheetConfig: any; cityName: string }
    ): Record<string, Cell> {
        const { sheetConfig, cityName } = mapping;
        const headers = sheetConfig.headers;

        // Телефоны
        const phonesStr =
            firmData.phones && firmData.phones.length > 0
                ? `'${firmData.phones.join(", ")}`
                : "";

        // Email'ы
        const emailsStr =
            firmData.emails && firmData.emails.length > 0
                ? firmData.emails.join(", ")
                : "";

        const messenger = firmData.vkLink ? "ВК" : "";

        const social = firmData.vkLink || "";

        const hasDateColumn = Boolean(headers.date);
        const dateStr = new Date().toLocaleDateString("ru-RU");

        const hasDirectionColumn = Boolean(headers.direction);
        const directionStr = firmData.category
            ? firmData.category[0]?.toUpperCase() + firmData.category.slice(1)
            : "";

        const actions = [];

        if (firmData.writtenData.isSendVkMessage) actions.push("в ВК");
        if (firmData.writtenData.isSendMailMessage) actions.push("на почту");

        const infoParts = [
            actions.length > 0
                ? `Написал ${actions.join(" и ")}`
                : "Не удалось написать: почта не валидна или группа в ВК не принимает сообщения",
        ];

        if (!hasDateColumn) infoParts.push(dateStr);

        const infoStr = infoParts.join(" ");

        const row: Record<string, Cell> = {};

        // Маппинг на реальные заголовки таблицы
        row[headers.city] = cityName;
        row[headers.partnerName] = hasDirectionColumn
            ? firmData.name
            : `${firmData.name}, ${directionStr.toLowerCase()}`;
        row[headers.phone] = phonesStr;
        row[headers.messenger] = messenger;
        row[headers.email] = emailsStr;
        row[headers.social] = social;
        row[headers.info] = infoStr;
        row[headers.caller] = "Бот-менеджер";
        row[headers.dgisId] = firmData.id ? firmData.id : "";

        if (hasDateColumn) row[headers.date] = dateStr;
        if (hasDirectionColumn) row[headers.direction] = directionStr;

        return row;
    }

    /**
     * Добавляет строку в таблицу партнёров с данными фирмы из 2ГИС
     * @param {DgisFirmData} dgisFirmData - данные фирмы из 2ГИС
     * @returns {Promise<void>} - пустой Promise, который выполнится после добавления строки
     * @throws {Error} - если не удалось найти лист для citySlug="${dgisFirmData.citySlug}"
     */
    async appendPartnerRow(dgisFirmData: WrittenFirmData): Promise<void> {
        const mapping =
            RegionConfigService.getPartnersSheetByFirmData(dgisFirmData);

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

    /**
     * Возвращает уникальные данные партнёров из таблицы партнёров по названию листа.
     *      Уникальные данные: имена, VK-ссылки, 2GIS ID, emails.
     *      Если в таблице нет данных по какому-либо из столбцов, то соответствующий массив будет пустым.
     *
     * @param {string} sheetName - имя листа
     * @param {Record<string, string>} headers - объект, где ключ - имя столбца,
     *      а значение - имя столбца в таблице партнёров
     * @returns Promise, который резолвится,
     *      когда все уникальные данные партнёров собраны
     */

    async getExistingPartners(
        sheetName: string,
        headers: HeadersType | OldHeadersType
    ): Promise<ExistingPartnerDatasInSheet> {
        const rows = await this.getAllRows(sheetName);

        const names = new Set<string>();
        const vks = new Set<string>();
        const dgisIds = new Set<string>();
        const emails = new Set<string>();

        for (const row of rows) {
            // Собираем 2GIS ID
            const dgisId = row[headers?.dgisId];
            if (dgisId && typeof dgisId === "string" && dgisId.trim()) {
                dgisIds.add(dgisId.trim());
            }

            // Сбор имен
            const name = row[headers?.partnerName];
            if (name && typeof name === "string" && name.trim()) {
                names.add(name.trim());
            }

            // Сбор ссылок на группы в VK
            const vk = row[headers?.social];
            if (vk && typeof vk === "string" && vk.trim()) {
                vks.add(vk.trim());
            }

            // Собираем emails (может быть несколько через запятую)
            const emailStr = row[headers?.email];
            if (emailStr && typeof emailStr === "string" && emailStr.trim()) {
                const emailList = emailStr
                    .split(",")
                    .map((e) => e.trim())
                    .filter(Boolean);
                emailList.forEach((email) => emails.add(email));
            }
        }

        return {
            dgisIds: Array.from(dgisIds),
            names: Array.from(names),
            vks: Array.from(vks),
            emails: Array.from(emails),
        };
    }
}
