function requireEnv(name: string) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Отсутствует переменная окружения с именем "${name}"`);
    }
    return value;
}

export const env = {
    spreadsheets: {
        serviceEmail: requireEnv("GOOGLE_SERVICE_EMAIL"),
        serviceKey: requireEnv("GOOGLE_SERVICE_KEY").replace(/\\n/g, "\n"),
        spreadsheetId: requireEnv("GOOGLE_SPREADSHEET_ID"),
    },
    vk: {
        login: requireEnv("VK_LOGIN"),
        password: requireEnv("VK_PASSWORD"),
    },
    mail: {
        login: requireEnv("MAIL_LOGIN"),
        password: requireEnv("MAIL_PASSWORD"),
    }
} as const;

export type EnvType = typeof env;