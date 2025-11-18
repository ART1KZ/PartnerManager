import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { env } from '../config/env.ts';

type Cell = string | number | boolean | null;

export class GoogleSheetsClient {
  private doc: GoogleSpreadsheet;
  private sheetName: string;
  private initialized = false;

  constructor(sheetName: string) {
    const auth = new JWT({
      email: env.spreadsheets.serviceEmail,
      key: env.spreadsheets.serviceKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.doc = new GoogleSpreadsheet(env.spreadsheets.spreadsheetId, auth);
    this.sheetName = sheetName;
  }

  private async init() {
    if (this.initialized) return;
    await this.doc.loadInfo();
    this.initialized = true;
  }

  private async getSheet() {
    await this.init();
    const sheet = this.doc.sheetsByTitle[this.sheetName]; // доступ к листу по имени 
    if (!sheet) {
      throw new Error(`Sheet "${this.sheetName}" not found`);
    }
    return sheet;
  }

  // Получить все строки как plain-объекты (по заголовкам)
  async getAllRows(): Promise<Record<string, Cell>[]> {
    const sheet = await this.getSheet();
    const rows = await sheet.getRows(); // high‑level доступ к строкам
    return rows.map((row) => row.toObject() as Record<string, Cell>); // конвертация в обычный объект
  }

  // Добавить одну строку (ключи = названия колонок в первой строке)
  async appendRow(data: Record<string, Cell>): Promise<void> {
    const sheet = await this.getSheet();
    await sheet.addRow(data); // добавление строки по объекту { header: value }
  }

  // Добавить несколько строк за один раз
  async appendRows(data: Record<string, Cell>[]): Promise<void> {
    const sheet = await this.getSheet();
    await sheet.addRows(data); // батчевое добавление строк
  }

//   async appendPartnerRow(data) // TODO: реализовать метод записывающий нового партнера в таблицу

  // Очистить все данные, кроме заголовка (первая строка)
//   async clearDataKeepHeader(): Promise<void> {
//     const sheet = await this.getSheet();
//     const rows = await sheet.getRows(); // каждая строка = GoogleSpreadsheetRow 
//     for (const row of rows) {
//       await row.delete(); // у Row есть метод delete(): Promise<void> 
//     }
//   }
}
