import { DgisClient } from "./clients/dgisClient.ts"

const cities = ["perm", "glazov", "sarapul", "berezniki"];
const categories = ["Кафе", "Ресторан", "Автосервис", "Салон красоты"];

const dgis = new DgisClient();

// Пример использования
(async () => {
    const city = "perm";
    const category = "Кафе";

    const firms = await dgis.fetchFirmsFromSearch(city, category, 1, 5);
    console.log(JSON.stringify(firms, null, 2));
})();
