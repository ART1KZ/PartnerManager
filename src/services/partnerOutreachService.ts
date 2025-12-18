import type { DgisFirmData, UniquePartnerDatasInSheet } from "../types.js";
import { regions } from "../config/regions.js";
import { DgisClient } from "../clients/dgisClient.js";
import { GoogleSheetsClient } from "../clients/googleSheetsClient.js";
import { VkClient } from "../clients/vkClient.js";
import { MailClient } from "../clients/mailClient.js";

type EmailTemplate = (firm: DgisFirmData) => { subject: string; html: string };
type VkTemplate = (firm: DgisFirmData) => string;

export interface PartnerOutreachOptions {
  citySlug: string;        // например "glazov"
  category: string;        // например "Салон красоты"
  pages?: number;          // страницы поиска 2ГИС
  concurrency?: number;    // параллельность при загрузке карточек
  dryRun?: boolean;        // ничего не отправляем и не пишем в таблицу
  sendEmail?: boolean;
  sendVk?: boolean;
  emailTo?: "first" | "all"; // отправлять на первый email или на все
}

export interface PartnerOutreachReport {
  citySlug: string;
  category: string;
  foundFirmUrls: number;
  skippedByDgisId: number;
  fetchedFirmCards: number;
  afterContactsFilter: number;
  afterDuplicatesFilter: number;
  emailed: number;
  vkAttempted: number;
  vkSuccess: number;
  addedToSheet: number;
}

export class PartnerOutreachService {
  constructor(
    private dgis: DgisClient,
    private sheets: GoogleSheetsClient,
    private vk: VkClient,
    private mail: MailClient
  ) {}

  async run(
    opts: PartnerOutreachOptions,
    templates: { vk: VkTemplate; email: EmailTemplate }
  ): Promise<PartnerOutreachReport> {
    const pages = opts.pages ?? 1;
    const concurrency = opts.concurrency ?? 3;
    const dryRun = Boolean(opts.dryRun);
    const sendEmail = opts.sendEmail ?? true;
    const sendVk = opts.sendVk ?? true;
    const emailTo = opts.emailTo ?? "first";

    const mapping = this.getSheetMappingByCitySlug(opts.citySlug);
    const unique = await this.sheets.getUniquePartnerDatasInSheet(
      mapping.sheetName,
      mapping.headers
    );

    // 1) Забираем urls фирм из поиска (без карточек)
    const firmUrls = await this.collectFirmUrlsFromSearch(
      opts.citySlug,
      opts.category,
      pages
    );

    // 2) Сразу отбрасываем те, кто уже есть по dgisId (firmId берём из url)
    const existingDgisIds = new Set(unique.dgisIds.map(String));
    const urlsToFetch: string[] = [];
    let skippedByDgisId = 0;

    for (const url of firmUrls) {
      const firmId = this.dgis.getFirmIdFromUrl(url);
      if (existingDgisIds.has(String(firmId))) {
        skippedByDgisId++;
        continue;
      }
      urlsToFetch.push(url);
    }

    // 3) Качаем карточки параллельно, но уже только по тем, кого нет в таблице по dgisId
    const fetched = await this.fetchFirmCardsPool(urlsToFetch, concurrency);

    // 4) Фильтр “есть VK или email” (как у тебя)
    const withContacts = fetched.filter(
      (f) => Boolean(f.vkLink) || (Array.isArray(f.emails) && f.emails.length > 0)
    );

    // 5) Дедупликация: name/vk/email/id по логике GoogleSheetsClient.isExistingFirm
    const newFirms = withContacts.filter(
      (f) => !this.sheets.isExistingFirm(unique, f)
    );

    // Если dryRun — только репорт
    if (dryRun) {
      return {
        citySlug: opts.citySlug,
        category: opts.category,
        foundFirmUrls: firmUrls.length,
        skippedByDgisId,
        fetchedFirmCards: fetched.length,
        afterContactsFilter: withContacts.length,
        afterDuplicatesFilter: newFirms.length,
        emailed: 0,
        vkAttempted: 0,
        vkSuccess: 0,
        addedToSheet: 0,
      };
    }

    // 6) Email
    let emailed = 0;
    if (sendEmail) {
      for (const firm of newFirms) {
        const emails = Array.isArray(firm.emails) ? firm.emails.filter(Boolean) : [];
        if (!emails.length) continue;

        const targets = emailTo === "all" ? emails : [emails[0]];
        const { subject, html } = templates.email(firm);

        for (const to of targets) {
          const ok = await this.mail.send(to, subject, html);
          if (ok) emailed++;
        }
      }
    }

    // 7) VK
    let vkAttempted = 0;
    let vkSuccess = 0;
    if (sendVk) {
      const firmsWithVk = newFirms.filter((f) => Boolean(f.vkLink));
      vkAttempted = firmsWithVk.length;

      const results = await this.vk.sendBulkMessages(
        firmsWithVk,
        (f) => templates.vk(f)
      );

      vkSuccess = results.filter((r) => r.status === "success").length;
    }

    // 8) Запись в таблицу (можно писать только тех, кому реально отправили — но у тебя формат “написал в вк/на почту”
    await this.sheets.appendPartnerRows(newFirms);

    return {
      citySlug: opts.citySlug,
      category: opts.category,
      foundFirmUrls: firmUrls.length,
      skippedByDgisId,
      fetchedFirmCards: fetched.length,
      afterContactsFilter: withContacts.length,
      afterDuplicatesFilter: newFirms.length,
      emailed,
      vkAttempted,
      vkSuccess,
      addedToSheet: newFirms.length,
    };
  }

  private getSheetMappingByCitySlug(citySlug: string): {
    sheetName: string;
    headers: Record<string, string>;
    cityName: string;
  } {
    for (const regionKey of Object.keys(regions)) {
      const region = (regions as any)[regionKey];
      for (const city of region.cities) {
        if (city.dgisName === citySlug) {
          return {
            sheetName: region.sheet.name,
            headers: region.sheet.headers,
            cityName: city.name,
          };
        }
      }
    }
    throw new Error(`Не найден citySlug="${citySlug}" в regions.ts`);
  }

  private async collectFirmUrlsFromSearch(
    city: string,
    category: string,
    pages: number
  ): Promise<string[]> {
    const all = new Set<string>();

    for (let page = 1; page <= pages; page++) {
      const html = await this.dgis.extractEstablishmentsHTML(city, category, page);
      const urls = this.dgis.extractFirmUrlsFromSearchHtml(html);
      urls.forEach((u) => all.add(u));
    }

    return [...all];
  }

  private async fetchFirmCardsPool(urls: string[], concurrency: number): Promise<DgisFirmData[]> {
    const queue = [...urls];
    const results: DgisFirmData[] = [];

    const worker = async () => {
      while (queue.length) {
        const firmUrl = queue.shift();
        if (!firmUrl) break;
        try {
          const firm = await this.dgis.fetchFirmData(firmUrl);
          results.push(firm);
        } catch (e: any) {
          console.error("FAIL firm card:", firmUrl, e?.message || e);
        }
      }
    };

    const workers: Promise<void>[] = [];
    for (let i = 0; i < Math.max(1, concurrency); i++) workers.push(worker());
    await Promise.all(workers);

    return results;
  }
}
