import { DgisClient } from "./clients/dgisClient.js";
import { GoogleSheetsClient } from "./clients/googleSheetsClient.js";
import { VkClient } from "./clients/vkClient.js";
import { MailClient } from "./clients/mailClient.js";
import { env } from "./config/env.js";
import { regions } from "./config/regions.js";

// const cities = ["perm", "glazov", "sarapul", "berezniki"];


(async () => {
    const categories = ["Кафе", "Ресторан", "Автосервис", "Салон красоты"];
    console.log("started")
    const dgis = new DgisClient();
    const googleSheet = new GoogleSheetsClient();
    const mail = new MailClient(env.mail.user, env.mail.password);
    // const vk = new VkClient();
    // await vk.init(env.vk.username, env.vk.password);

    const result = await mail.send("artemkiselev18072k6@gmail.com", "Сотрудничество", "Привет мяу))))");
    // const city = regions.PK.cities[0]?.dgisName
    // const category = categories[0]/

    // const firms = await dgis.fetchFirmsFromSearch(city!, category!, 1, 5);
    // console.log("пропарсил");
    
    console.log(result)
    // const vk = new VkClient();
    
    // const result = await vk.sendBulkMessages(firms, (f) => `Здравствуйте, ${f.name}`);
    // console.log(result)
    
    // await googleSheet.appendPartnerRows(firms);
    // const test = await googleSheet.getAllHeaderRows("Пермский край новые партнеры", "Партнер название")
    // console.log(test)


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
