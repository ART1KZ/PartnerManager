export const regions = {
    PK: {
        name: "Пермский край",
        shortName: "ПК",
        sheet: {
            name: "Пермский край новые партнеры", // Название листа в гугл таблице с партнерами из Удмуртской Республики
            headers: { // Название ключей таблицы (ячейки в первом столбце)
                number: "П/П",
                city: "Город",
                partnerName: "Партнер название",
                phone: "тел. для связи",
                messenger: "Мессенджер",
                email: "эл. почта",
                social: "Соц.сеть",
                caller: "Кто звонил",
                info: "Информация",
            },
        },
        cities: [
            { name: "Пермь", dgisName: "perm" },
            { name: "Березники", dgisName: "berezniki" },
        ],
    },
    UR: {
        name: "Удмуртская Республика",
        shortName: "УР",
        sheet: {
            name: "Удмуртия новые", // Название листа в гугл таблице с партнерами из Пермского Края
            headers: { // Название ключей таблицы (ячейки в первом столбце)
                number: "П/П",
                city: "Город",
                partnerName: "Партнер название",
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
            { name: "Глазов", dgisName: "glazov" },
            { name: "Сарапул", dgisName: "sarapul" },
        ],
    },
};