import { DgisClient } from "./clients/dgisClient.js";
import { GoogleSheetsClient } from "./clients/googleSheetsClient.js";
import { VkClient } from "./clients/vkClient.js";
import { env } from "./config/env.js";

const cities = ["perm", "glazov", "sarapul", "berezniki"];
const categories = ["Кафе", "Ресторан", "Автосервис", "Салон красоты"];

const dgis = new DgisClient();
const googleSheet = new GoogleSheetsClient();

(async () => {
    console.log("started")
    const city = cities[1];
    const category = categories[3];

    const firms = await dgis.fetchFirmsFromSearch(city, category, 1, 5);
    console.log("пропарсил");
    
    const vk = new VkClient();
    
    await vk.init(env.vk.username, env.vk.password);
    const result = await vk.sendBulkMessages(firms, (f) => `Здравствуйте, ${f.name}`);
    console.log(result)
    
    await googleSheet.appendPartnerRows(firms);
    // const test = await googleSheet.getAllHeaderRows("Пермский край новые партнеры", "Партнер название")
    // console.log(test)


    /* 
    Основная логика:
    1. Получение списка всех партнеров в указанном городе
    1. Поиск заведений в ДГИС по городу и категории (сразу же отбраковка заведений с отсутсвующией почтой либо группой в вк)
    2. Отбраковка партнеров, которым уже написал (сверка по таблице)
    3. Отправка сообщения на почту
    4. Отправка сообщений в группу вк
    5. Добавление в таблицу
    */
})();
