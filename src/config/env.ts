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
        username: requireEnv("VK_USERNAME"),
        password: requireEnv("VK_PASSWORD"),
    },
    mail: {
        user: requireEnv("MAIL_USER"),
        password: requireEnv("MAIL_PASSWORD"),
    }
};
