const baseOffer = (opts: {
    regionLabel: string; // "Перми и Пермского края"
    extraPromoLine: string; // "опубликуем в Telegram ... и VK ..."
    newsLink: string;
}) => `Здравствуйте! Меня зовут Артем, я представляю профсоюзную платформу Союз Преимуществ и у меня есть для вас крайне выгодное предложение. Все бесплатно :)

Продвижение ваших товаров и услуг среди 10 000+ членов профсоюзов ${opts.regionLabel} через нашу платформу profprivelegies.ru.

Мы разместим ваше заведение в каталоге с описанием, ссылками и эксклюзивной скидкой, выделим в подборках,
разошлем email по 250+ председателям (охват 150 000+), ${opts.extraPromoLine}

Взамен предоставьте скидку для нашей лояльной аудитории — это шанс привлечь тысячи организованных клиентов

Подробнее о нас: partners.profprivelegies.ru.
Новость о нас: ${opts.newsLink}

Буду рад обсудить размещение и дальнейшее сотрудничество :)`;

export const regions = {
    PK: {
        name: "Пермский край",
        shortName: "ПК",
        sheet: {
            name: "Пермский край новые партнеры", // Название листа в гугл таблице с партнерами из Пермского края
            headers: {
                // Название ключей таблицы (ячейки в первом столбце)
                number: "П/П",
                city: "Город",
                partnerName: "Партнер название",
                phone: "тел. для связи",
                messenger: "Мессенджер",
                email: "эл. почта",
                social: "Соц.сеть",
                caller: "Кто звонил",
                info: "Информация",
                dgisId: "2гис id",
            },
        },
        cities: [
            { name: "Пермь", dgisSlug: "perm" },
            { name: "Березники", dgisSlug: "berezniki" },
        ],
        message: {
            vk: {
                text: baseOffer({
                    regionLabel: "Перми и Пермского края",
                    extraPromoLine:
                        "опубликуем в Telegram (t.me/profprivelegies) и ленте нашего сайта (https://www.profprivelegies.ru/posts).",
                    newsLink:
                        "https://permsovprof.ru/dejatelnost/profsojuznaja-cifrovaja-platforma-skidok-sojuz-preimuwestv/?ysclid=mewrdvp2r1527632821",
                }),
            },
            mail: {
                subject: "Сотрудничество",
                text: baseOffer({
                    regionLabel: "Перми и Пермского края",
                    extraPromoLine:
                        "опубликуем в Telegram (t.me/profprivelegies) и ленте нашего сайта (https://www.profprivelegies.ru/posts).",
                    newsLink:
                        "https://permsovprof.ru/dejatelnost/profsojuznaja-cifrovaja-platforma-skidok-sojuz-preimuwestv/?ysclid=mewrdvp2r1527632821",
                }),
            },
        },
    },
    UR: {
        name: "Удмуртская Республика",
        shortName: "УР",
        sheet: {
            name: "Удмуртия новые", // Название листа в гугл таблице с партнерами из Удмуртии
            headers: {
                // Название ключей таблицы (ячейки в первом столбце)
                number: "П/П",
                city: "Город",
                direction: "Направление",
                partnerName: "Партнер название",
                phone: "тел. для связи",
                messenger: "Мессенджер",
                email: "эл. почта",
                social: "Соц.сеть",
                caller: "Кто звонил",
                info: "Информация",
                date: "Дата",
                dgisId: "2гис id",
            },
        },
        cities: [
            { name: "Глазов", dgisSlug: "glazov" },
            { name: "Сарапул", dgisSlug: "sarapul" },
        ],
        message: {
            vk: {
                text: baseOffer({
                    regionLabel: "Ижевска и Удмуртии",
                    extraPromoLine:
                        "опубликуем в Telegram (t.me/profprivelegies) и VK (https://vk.com/prudm).",
                    newsLink:
                        "https://fpur.ru/news/profsojuznaja_cifrovaja_platforma_sojuz_preimushhestv/2025-02-18-2534",
                }),
            },
            mail: {
                subject: "Сотрудничество",
                text: baseOffer({
                    regionLabel: "Ижевска и Удмуртии",
                    extraPromoLine:
                        "опубликуем в Telegram (t.me/profprivelegies) и VK (https://vk.com/prudm).",
                    newsLink:
                        "https://fpur.ru/news/profsojuznaja_cifrovaja_platforma_sojuz_preimushhestv/2025-02-18-2534",
                }),
            },
        },
    },
} as const;

export type RegionsType = typeof regions;
export type RegionKey = keyof typeof regions; 
export type SheetConfig = RegionsType[RegionKey]['sheet'];
export type HeadersType = SheetConfig['headers'];