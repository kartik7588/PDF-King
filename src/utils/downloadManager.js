import { openDB } from 'idb';

const DB_NAME = 'PDFKingDB';
const STORE_NAME = 'downloads';
const DB_VERSION = 1;

export const initDB = async () => {
    return openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                });
                store.createIndex('date', 'date');
            }
        },
    });
};

export const saveDownloadRecord = async (fileName, sizeStr, blob, source = 'Unknown') => {
    try {
        const db = await initDB();
        const uniqueId = Math.random().toString(36).substr(2, 9) + Date.now();

        // Store as ArrayBuffer to ensure compatibility, though Blob is often supported
        // some older IDB wrappers might prefer simple objects. 
        // But 'idb' lib handles blobs well usually. Let's store the blob directly.

        const record = {
            id: uniqueId,
            fileName,
            size: sizeStr,
            source, // "Merge", "Split", etc.
            date: new Date().toISOString(),
            blob: blob, // Store the file content
        };

        await db.add(STORE_NAME, record);
        console.log('Download saved to history:', fileName);
    } catch (error) {
        console.error('Failed to save download record:', error);
    }
};

export const getDownloadHistory = async () => {
    try {
        const db = await initDB();
        const transactions = await db.getAllFromIndex(STORE_NAME, 'date');
        // Sort by date descending (newest first)
        return transactions.reverse();
    } catch (error) {
        console.error('Failed to fetch download history:', error);
        return [];
    }
};

export const deleteDownloadRecord = async (id) => {
    try {
        const db = await initDB();
        await db.delete(STORE_NAME, id);
    } catch (error) {
        console.error('Failed to delete download record:', error);
    }
};

export const clearDownloadHistory = async () => {
    try {
        const db = await initDB();
        await db.clear(STORE_NAME);
    } catch (error) {
        console.error('Failed to clear download history:', error);
    }
};
