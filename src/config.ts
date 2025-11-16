function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

export const config = {
  dgis: {
    apiKey: requireEnv("DGIS_API_KEY"),
    // region: requireEnv("DGIS_REGION")
  },
  // vk: {
  //   token: requireEnv("VK_TOKEN"),
  // },
  // email: {
  //   host: process.env.EMAIL_HOST ?? "smtp.gmail.com",
  //   port: Number(process.env.EMAIL_PORT ?? 465),
  //   secure: process.env.EMAIL_SECURE !== "false",
  //   user: requireEnv("EMAIL_USER"),
  //   pass: requireEnv("EMAIL_PASS"),
  // },
  // sheets: {
  //   spreadsheetId: requireEnv("GOOGLE_SHEETS_ID"),
  //   serviceEmail: requireEnv("GOOGLE_SERVICE_EMAIL"),
  //   serviceKey: requireEnv("GOOGLE_SERVICE_KEY").replace(/\\n/g, "\n"),
  // },
  // mistral: {
  //   apiKey: requireEnv("MISTRAL_API_KEY"),
  // },
};
