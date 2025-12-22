import type { DgisFirmData, ExistingPartnerDatasInSheet, WrittenFirmData } from "../types.js";
import { DgisClient } from "../clients/dgisClient.js";
import { GoogleSheetsClient } from "../clients/googleSheetsClient.js";
import { VkClient } from "../clients/vkClient.js";
import { MailClient } from "../clients/mailClient.js";
import { RegionConfigService } from "./regionConfigService.js";

export class PartnerOutreachService {
    private readonly dgisClient: DgisClient;
    private readonly googleSheetsClient: GoogleSheetsClient;
    private readonly mailClient: MailClient;
    private readonly vkClient: VkClient;

    constructor(
        dgisClient: DgisClient,
        googleSheetsClient: GoogleSheetsClient,
        mailClient: MailClient,
        vkClient: VkClient
    ) {
        this.dgisClient = dgisClient;
        this.googleSheetsClient = googleSheetsClient;
        this.mailClient = mailClient;
        this.vkClient = vkClient;
    }

    async findPartners(cityName: string, categoryName: string) {
        const sheet = RegionConfigService.getPartnersSheetByCityName(cityName);

        if (!sheet)
            throw new Error(`Лист региона для города "${cityName}" не найден`);

        const existingFirms = await this.googleSheetsClient.getExistingPartners(
            sheet.name,
            sheet.headers
        );

        const dgisCitySlug = RegionConfigService.getCitySlug(cityName);
        if (!dgisCitySlug) {
            throw new Error(`Slug города "${cityName}" не найден`);
        }

        const isDupliсateCandidate = (candidate: Partial<DgisFirmData>) => {
            return this.isExistingFirm(existingFirms, candidate);
        };

        const parsedFirms = await this.dgisClient.fetchFirmsFromSearch(
            dgisCitySlug,
            categoryName,
            2,
            3,
            isDupliсateCandidate
        );

        const processedFirms: WrittenFirmData[] = [];

        // TODO: доделать логику обработки отправки сообщений с последующей записью в таблицу
            

    }

    /**
     * Проверяет, существует ли заведение с указанными данными
     *      в листе (таблице) Google Sheets.
     *      Имена заведений нормализуются, чтобы сравнивать
     *      их в разных регистрах и с учетом дефисов и кавычек.
     * @param {ExistingPartnerDatasInSheet} partnerUniqueDatas - уникальные данные партнёров
     *      в листе (таблице) Google Sheets
     * @param {DgisFirmData} dgisFirmData - данные о заведении из 2ГИС
     * @returns {boolean} true, если заведение существует, false - иначе
     */
    isExistingFirm(
        existingFirms: ExistingPartnerDatasInSheet,
        candidateFirm: Partial<DgisFirmData>
    ) {
        // Приведение имени заведение к общему формату
        const normalizedFirmName = candidateFirm.name
            ? this.normalizeFirmName(candidateFirm.name)
            : null;

        // Существует ли заведение с указанным 2гис id в листе (таблице)
        if (candidateFirm.id && candidateFirm.id in existingFirms.dgisIds)
            return true;

        // Существует ли заведение с указанной ссылкой на ВК в листе (таблице)
        if (
            candidateFirm.vkLink &&
            existingFirms.vks.includes(candidateFirm.vkLink)
        )
            return true;

        // Существует ли заведение с указанными почтами в листе (таблице)
        if (
            candidateFirm.emails &&
            candidateFirm.emails.some((email) =>
                existingFirms.emails.includes(email)
            )
        )
            return true;

        if (
            candidateFirm.name &&
            normalizedFirmName &&
            existingFirms.names.some((firmName) =>
                this.normalizeFirmName(firmName).includes(normalizedFirmName)
            )
        )
            return true;

        return false;
    }

    /**
     * Нормализует имя заведения, чтобы оно было
     *      возможным сравнивать с другими именами
     *      в разных регистрах и с учетом
     *      дефисов и кавычек
     * @param {string} name - имя заведения
     * @returns {string} нормализованное имя заведения
     */
    private normalizeFirmName(name: string): string {
        return name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, " ") // множественные пробелы в один
            .replace(/[«»"']/g, "") // убираем кавычки разных типов
            .replace(/[‐–—-]/g, "-"); // нормализуем дефисы
    }
}
