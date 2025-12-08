import { DgisClient } from "./clients/dgisClient.ts";
import { GoogleSheetsClient } from "./clients/googleSheetsClient.ts";
import { regions } from "./config/regions.ts";

const cities = ["perm", "glazov", "sarapul", "berezniki"];
const categories = ["Кафе", "Ресторан", "Автосервис", "Салон красоты"];

const dgis = new DgisClient();
const googleSheet = new GoogleSheetsClient;

(async () => {
    const city = cities[0]
    const category = categories[0];

    const firms = await dgis.fetchFirmsFromSearch(city, category, 1, 5);
    for(const firm of firms){
        await googleSheet.appendPartnerRow(firm)
    }

})();
