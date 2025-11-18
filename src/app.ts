import { DgisClient } from "./clients/dgisClient.ts"
import { google } from 'googleapis';
import "dotenv/config"

const cities = ["perm", "glazov", "sarapul", "berezniki"];
const categories = ["Кафе", "Ресторан", "Автосервис", "Салон красоты"];

const dgis = new DgisClient();

// // Пример использования
// (async () => {
//     const city = "perm";
//     const category = "Кафе";

//     const firms = await dgis.fetchFirmsFromSearch(city, category, 1, 5);
//     console.log(JSON.stringify(firms, null, 2));
// })();

async function listServiceAccountSheets() {
  const clientEmail = process.env.GOOGLE_SERVICE_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_KEY!.replace(/\\n/gm, '\n');;

  if (!clientEmail || !privateKey) {
    throw new Error('GOOGLE_CLIENT_EMAIL или GOOGLE_PRIVATE_KEY не заданы в .env');
  }

  // Важно: вернуть реальные переводы строк в ключе
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  const drive = google.drive({ version: 'v3', auth });

  const res = await drive.files.list({
    q: "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
    fields: 'files(id, name, owners(emailAddress))',
    pageSize: 100,
  });

  console.log('Sheets доступные сервисному аккаунту:');
  for (const file of res.data.files ?? []) {
    console.log(`- ${file.name} (${file.id})`);
  }
}

listServiceAccountSheets().catch((err) => {
  console.error(err);
  process.exit(1);
});
