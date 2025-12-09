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
    const city = cities[0];
    const category = categories[0];

    const firms = await dgis.fetchFirmsFromSearch(city, category, 1, 5);
    await googleSheet.appendPartnerRows(firms);

    const vk = new VkClient();
    
    await vk.init(env.vk.username, env.vk.password);
    // await vk.sendBulkMessages(firms, (f) => "Здравствуйте");
    const result = await vk.sendMessage(firms[1].vkLink!, "./start");
    console.log(result)

    // const test = await googleSheet.getAllHeaderRows("Пермский край новые партнеры", "Партнер название")
    // console.log(test)
})();
