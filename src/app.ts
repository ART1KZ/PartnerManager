import { DgisClient } from "./clients/dgisClient.js";
import { GoogleSheetsClient } from "./clients/googleSheetsClient.js";
import { VkClient } from "./clients/vkClient.js";
import { MailClient } from "./clients/mailClient.js";
import { env } from "./config/env.js";
import { PartnerOutreachService } from "./services/partnerOutreachService.js";

(async () => {
    console.log("Поиск партнеров ");

    const dgisClient = new DgisClient();
    const googleSheetsClient = new GoogleSheetsClient(
        env.spreadsheets.serviceEmail,
        env.spreadsheets.serviceKey,
        env.spreadsheets.spreadsheetId
    );
    const mailClient = new MailClient(env.mail.login, env.mail.password);
    const vkClient = new VkClient(env.vk.login, env.vk.password);

    const partnerOutreachService = new PartnerOutreachService(
        dgisClient,
        googleSheetsClient,
        mailClient,
        vkClient
    );

    const writtenData = await partnerOutreachService.findPartners(
        "Сарапул",
        "Ресторан",
        2
    );

    console.log(`
        Количество пропаршенных заведений: ${writtenData.totalParsedFirmsCount}\n
        Количество заведений, которым удалось написать: ${writtenData.writtenFirmsCount}\n
        Количество заведений, которые не удалось написать: ${writtenData.totalParsedFirmsCount - writtenData.writtenFirmsCount}\n
        `);

    /* 
    Основная логика:
    1. Получение списка всех партнеров в указанном городе (из таблицы гугл для сверки дубликатов)
    2. Поиск заведений в ДГИС по городу и категории (сразу же отбраковка дубликатов, а также заведений с отсутсвующией почтой либо группой в вк) 
    3. Отправка сообщения на почту
    4. Отправка сообщений в группу вк
    5. Добавление в таблицу
    */
})();
