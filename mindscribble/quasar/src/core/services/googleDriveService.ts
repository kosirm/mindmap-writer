/**
 * Google Drive Service
 *
 * Handles all Google Drive API operations:
 * - App folder management
 * - File CRUD operations (create, read, update, delete)
 * - File listing and search
 *
 * Uses the gapi.client.drive API after authentication.
 */

// App folder name in Google Drive
const APP_FOLDER_NAME = 'MindPad'

// File extension for mindmap files
const FILE_EXTENSION = '.mindpad'

// MIME types
const MIME_TYPE_FOLDER = 'application/vnd.google-apps.folder'
const MIME_TYPE_JSON = 'application/json'

/**
 * File metadata returned from Google Drive
 */
export interface DriveFileMetadata {
  id: string
  name: string
  mimeType: string
  createdTime: string
  modifiedTime: string
  parents?: string[] | undefined
  size?: string | undefined
}

/**
 * Result of a file list operation
 */
export interface DriveFileListResult {
  files: DriveFileMetadata[]
  nextPageToken?: string | undefined
}

// ============================================================
// APP FOLDER MANAGEMENT
// ============================================================

/**
 * Find the MindPad app folder in Google Drive
 */
export async function findAppFolder(): Promise<string | null> {
  try {
    const response = await gapi.client.drive.files.list({
      q: `name='${APP_FOLDER_NAME}' and mimeType='${MIME_TYPE_FOLDER}' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    })

    const files = response.result.files
    if (files && files.length > 0 && files[0]) {
      return files[0].id ?? null
    }
    return null
  } catch (error) {
    console.error('❌ Error finding app folder:', error)
    throw error
  }
}

/**
 * Create the MindPad app folder in Google Drive
 */
export async function createAppFolder(): Promise<string> {
  try {
    const response = await gapi.client.drive.files.create({
      resource: {
        name: APP_FOLDER_NAME,
        mimeType: MIME_TYPE_FOLDER
      },
      fields: 'id'
    })

    const folderId = response.result.id
    if (!folderId) {
      throw new Error('Failed to create app folder - no ID returned')
    }

    console.log('✅ App folder created:', folderId)
    return folderId
  } catch (error) {
    console.error('❌ Error creating app folder:', error)
    throw error
  }
}

/**
 * Get or create the app folder
 */
export async function getOrCreateAppFolder(): Promise<string> {
  const existingFolder = await findAppFolder()
  if (existingFolder) {
    console.log('📁 Found existing app folder:', existingFolder)
    return existingFolder
  }
  return createAppFolder()
}

// ============================================================
// FILE OPERATIONS
// ============================================================

/**
 * List all mindmap files in the app folder
 */
export async function listMindmapFiles(
  folderId: string,
  pageToken?: string
): Promise<DriveFileListResult> {
  try {
    const response = await gapi.client.drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'nextPageToken, files(id, name, mimeType, createdTime, modifiedTime, size)',
      orderBy: 'modifiedTime desc',
      pageSize: 50,
      ...(pageToken ? { pageToken } : {})
    })

    const files: DriveFileMetadata[] = (response.result.files || []).map(f => ({
      id: f.id!,
      name: f.name!,
      mimeType: f.mimeType!,
      createdTime: f.createdTime!,
      modifiedTime: f.modifiedTime!,
      size: f.size ?? undefined
    }))

    return {
      files,
      nextPageToken: response.result.nextPageToken ?? undefined
    }
  } catch (error) {
    console.error('❌ Error listing files:', error)
    throw error
  }
}

/**
 * Create a new mindmap file in Google Drive
 */
export async function createMindmapFile(
  folderId: string,
  fileName: string,
  content: object
): Promise<DriveFileMetadata> {
  // Ensure filename has extension
  const fullName = fileName.endsWith(FILE_EXTENSION) ? fileName : `${fileName}${FILE_EXTENSION}`

  try {
    // Create file metadata
    const metadata = {
      name: fullName,
      mimeType: MIME_TYPE_JSON,
      parents: [folderId]
    }

    // Create multipart request body
    const boundary = '-------mindpad_boundary'
    const delimiter = `\r\n--${boundary}\r\n`
    const closeDelimiter = `\r\n--${boundary}--`

    const body =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(content) +
      closeDelimiter

    const response = await gapi.client.request({
      path: '/upload/drive/v3/files',
      method: 'POST',
      params: { uploadType: 'multipart', fields: 'id, name, mimeType, createdTime, modifiedTime' },
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    })

    console.log('✅ File created:', response.result.name)
    return {
      id: response.result.id,
      name: response.result.name,
      mimeType: response.result.mimeType,
      createdTime: response.result.createdTime,
      modifiedTime: response.result.modifiedTime,
      parents: [folderId]
    }
  } catch (error) {
    console.error('❌ Error creating file:', error)
    throw error
  }
}

/**
 * Update an existing mindmap file in Google Drive
 */
export async function updateMindmapFile(
  fileId: string,
  content: object,
  newName?: string
): Promise<DriveFileMetadata> {
  try {
    // Build metadata update if name changed
    const metadata: { name?: string } = {}
    if (newName) {
      metadata.name = newName.endsWith(FILE_EXTENSION) ? newName : `${newName}${FILE_EXTENSION}`
    }

    // Create multipart request body
    const boundary = '-------mindpad_boundary'
    const delimiter = `\r\n--${boundary}\r\n`
    const closeDelimiter = `\r\n--${boundary}--`

    const body =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(content) +
      closeDelimiter

    const response = await gapi.client.request({
      path: `/upload/drive/v3/files/${fileId}`,
      method: 'PATCH',
      params: { uploadType: 'multipart', fields: 'id, name, mimeType, createdTime, modifiedTime' },
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    })

    console.log('✅ File updated:', response.result.name)
    return {
      id: response.result.id,
      name: response.result.name,
      mimeType: response.result.mimeType,
      createdTime: response.result.createdTime,
      modifiedTime: response.result.modifiedTime
    }
  } catch (error) {
    console.error('❌ Error updating file:', error)
    throw error
  }
}

/**
 * Load a mindmap file from Google Drive
 */
export async function loadMindmapFile(fileId: string): Promise<object> {
  try {
    const response = await gapi.client.drive.files.get({
      fileId,
      alt: 'media'
    })

    console.log('✅ File loaded:', fileId)
    return response.result as object
  } catch (error) {
    console.error('❌ Error loading file:', error)
    throw error
  }
}

/**
 * Delete a mindmap file from Google Drive (moves to trash)
 */
export async function deleteMindmapFile(fileId: string): Promise<void> {
  try {
    await gapi.client.drive.files.update({
      fileId,
      resource: { trashed: true }
    })
    console.log('✅ File deleted (moved to trash):', fileId)
  } catch (error) {
    console.error('❌ Error deleting file:', error)
    throw error
  }
}

/**
 * Find the central index file (.mindpad) in the app folder
 */
export async function findCentralIndexFile(folderId: string): Promise<DriveFileMetadata | null> {
  try {
    const response = await gapi.client.drive.files.list({
      q: `name='.mindpad' and mimeType='${MIME_TYPE_JSON}' and trashed=false and '${folderId}' in parents`,
      fields: 'files(id, name)',
      spaces: 'drive'
    })

    const files = response.result.files
    if (files && files.length > 0 && files[0]) {
      return {
        id: files[0].id ?? '',
        name: files[0].name ?? '',
        mimeType: MIME_TYPE_JSON,
        createdTime: '',
        modifiedTime: ''
      }
    }
    return null
  } catch (error) {
    console.error('❌ Error finding central index file:', error)
    throw error
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(fileId: string): Promise<DriveFileMetadata> {
  try {
    const response = await gapi.client.drive.files.get({
      fileId,
      fields: 'id, name, mimeType, createdTime, modifiedTime, parents, size'
    })

    return {
      id: response.result.id!,
      name: response.result.name!,
      mimeType: response.result.mimeType!,
      createdTime: response.result.createdTime!,
      modifiedTime: response.result.modifiedTime!,
      parents: response.result.parents ?? undefined,
      size: response.result.size ?? undefined
    }
  } catch (error) {
    console.error('❌ Error getting file metadata:', error)
    throw error
  }
}
