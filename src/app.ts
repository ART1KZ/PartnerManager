import { DgisClient } from "./clients/dgisClient.js";
import { GoogleSheetsClient } from "./clients/googleSheetsClient.js";

const cities = ["perm", "glazov", "sarapul", "berezniki"];
const categories = ["Кафе", "Ресторан", "Автосервис", "Салон красоты"];

const dgis = new DgisClient();
const googleSheet = new GoogleSheetsClient();

(async () => {
    const city = cities[0];
    const category = categories[0];

    const firms = await dgis.fetchFirmsFromSearch(city, category, 1, 5);
    await googleSheet.appendPartnerRows(firms);

    // const test = await googleSheet.getAllHeaderRows("Пермский край новые партнеры", "Партнер название")
    // console.log(test)
})();
