import { google } from 'googleapis';
import * as fs from 'fs';
import 'dotenv/config';

function buildDriveClient() {
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyFile) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not set');

  const credentials = JSON.parse(fs.readFileSync(keyFile, 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return google.drive({ version: 'v3', auth });
}

export const drive = buildDriveClient();

export async function copyTemplateFolder(params: {
  name: string;
  templateFolderId: string;
  parentFolderId: string;
}): Promise<string> {
  const { name, templateFolderId, parentFolderId } = params;

  // List all files/folders inside the template folder
  const listRes = await drive.files.list({
    q: `'${templateFolderId}' in parents and trashed = false`,
    fields: 'files(id, name, mimeType)',
  });
  const templateChildren = listRes.data.files ?? [];

  // Create root folder
  const rootRes = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    },
    fields: 'id',
  });
  const newFolderId = rootRes.data.id;
  if (!newFolderId) throw new Error('Drive did not return folder ID');

  // Copy each child into the new folder
  await Promise.all(
    templateChildren.map(async (child) => {
      if (!child.id) return;
      if (child.mimeType === 'application/vnd.google-apps.folder') {
        // Recursively copy sub-folders
        await copyTemplateFolder({
          name: child.name ?? 'Untitled',
          templateFolderId: child.id,
          parentFolderId: newFolderId,
        });
      } else {
        await drive.files.copy({
          fileId: child.id,
          requestBody: { name: child.name ?? 'Untitled', parents: [newFolderId] },
          fields: 'id',
        });
      }
    })
  );

  return newFolderId;
}

export async function shareFolderWithWriter(
  folderId: string,
  email: string
): Promise<void> {
  await drive.permissions.create({
    fileId: folderId,
    requestBody: {
      type: 'user',
      role: 'writer',
      emailAddress: email,
    },
    sendNotificationEmail: false,
  });
}
