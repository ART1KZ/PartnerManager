export const regions = {
    PK: {
        name: "Пермский край",
        short_name: "ПК",
        sheet: {
            name: "Пермский край новые партнеры", // Название листа в гугл таблице с партнерами из Удмуртской Республики
            headers: { // Название ключей таблицы (ячейки в первом столбце)
                number: "П/П",
                city: "Город",
                partner_name: "Партнер название",
                phone: "тел. для связи",
                messenger: "Мессенджер",
                email: "эл. почта",
                social: "Соц.сеть",
                caller: "Кто звонил",
                info: "Информация",
            },
        },
        cities: [
            { name: "Пермь", dgis_name: "perm" },
            { name: "Березники", dgis_name: "berezniki" },
        ],
    },
    UR: {
        name: "Удмуртская Республика",
        short_name: "УР",
        sheet: {
            name: "Удмуртия новые", // Название листа в гугл таблице с партнерами из Пермского Края
            headers: { // Название ключей таблицы (ячейки в первом столбце)
                number: "П/П",
                city: "Город",
                partner_name: "Партнер название",
                phone: "тел. для связи",
                messenger: "Мессенджер",
                email: "эл. почта",
                social: "Соц.сеть",
                caller: "Кто звонил",
                info: "Информация",
                date: "Дата"
            },
        },
        cities: [
            { name: "Глазов", dgis_name: "glazov" },
            { name: "Сарапул", dgis_name: "sarapul" },
        ],
    },
};