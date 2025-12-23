import { DgisClient } from "./clients/dgisClient.js";
import { GoogleSheetsClient } from "./clients/googleSheetsClient.js";
import { VkClient } from "./clients/vkClient.js";
import { MailClient } from "./clients/mailClient.js";
import { env } from "./config/env.js";
import { regions } from "./config/regions.js";
import { PartnerOutreachService } from "./services/partnerOutreachService.js";
// const cities = ["perm", "glazov", "sarapul", "berezniki"];


(async () => {
    console.log("started")

    const dgisClient = new DgisClient();
    const googleSheetsClient = new GoogleSheetsClient(env.spreadsheets.serviceEmail, env.spreadsheets.serviceKey, env.spreadsheets.spreadsheetId, regions);
    const mailClient = new MailClient(env.mail.login, env.mail.password);
    const vkClient = new VkClient(env.vk.login, env.vk.password);

    const partnerOutreachService = new PartnerOutreachService(
        dgisClient, googleSheetsClient, mailClient, vkClient
    )

    const writtenData = await partnerOutreachService.findPartners("Пермь", "Ресторан");

    console.log(writtenData)

    /* 
    Основная логика:
    1. Получение списка всех партнеров в указанном городе (из таблицы гугл)
    1. Поиск заведений в ДГИС по городу и категории (сразу же отбраковка заведений с отсутсвующией почтой либо группой в вк) / не делать запрос на полную информацию о заведении в 2гис если dgisId / группа в вк, название уже есть в таблице 
    2. Отбраковка партнеров, которым уже написал (сверка по таблице) 
    3. Отправка сообщения на почту
    4. Отправка сообщений в группу вк
    5. Добавление в таблицу
    */
})();
