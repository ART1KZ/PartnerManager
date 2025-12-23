import { regions, RegionKey, RegionsType, SheetConfig } from "../config/regions.js";
import { DgisFirmData } from "../types.js";

export class RegionConfigService {
    static readonly regions: RegionsType = regions;
    constructor() {}

    static getRegion(cityName: string) {
        for (const region of Object.values(this.regions)) {
            for (const cityData of region.cities) {
                if (cityData.name !== cityName) continue;
                return region;
            }
        }
        return null;
    }

    static getCitySlug(cityName: string) {
        const region = this.getRegion(cityName);

        if (!region) {
            return null;
        }

        for (const cityData of region.cities) {
            if (cityData.name !== cityName) continue;
            return cityData.dgisSlug;
        }
        return null;
    }

    /**
     * Возвращает конфигурацию листа партнёров по имени города.
     *      Если город не найден в config/regions.js, то возвращает null.
     *
     * @param {string} cityName - имя города
     * @returns - конфигурация листа партнёров или null, если город не найден
     */
    static getPartnersSheetByCityName(cityName: string): SheetConfig | null {
        const region = this.getRegion(cityName);

        if (!region) {
            return null;
        }

        for (const cityData of region.cities) {
            if (cityData.name !== cityName) continue;
            return region.sheet;
        }
        return null;
    }

    /**
     * Возвращает конфигурацию листа и имя города, если данные о фирме из 2ГИС
     * соответствуют какому-либо из городов в config/regions.js.
     *
     * @param dgisFirmData - данные о фирме из 2ГИС
     * @returns Объект с конфигом и именем города или null, если совпадений нет
     */
    static getPartnersSheetByFirmData(
        firmData: DgisFirmData
    ): { sheetConfig: SheetConfig; cityName: string } | null {
        let sheetConfig: SheetConfig | null = null;
        let cityName: string | null = null;

        for (const key in this.regions) {
            if (sheetConfig) break;
            const regionKey = key as RegionKey;
            const region = this.regions[regionKey];
            for (const cityData of region.cities) {
                if (cityData.dgisSlug !== firmData.citySlug) continue;

                sheetConfig = region.sheet;
                cityName = cityData.name;
                break;
            }
        }

        if (!sheetConfig || !cityName) return null;

        return { sheetConfig, cityName };
    }

    static getRegionMessage(cityName: string) {
        const region = this.getRegion(cityName);

        if (!region?.message) {
            return null;
        }

        return region.message;
    }
}
