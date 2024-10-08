export const openDB = (dataBaseIndexName, dataBaseObjectStoreName) => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dataBaseIndexName, 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore(dataBaseObjectStoreName, { keyPath: 'id', autoIncrement: true });
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            reject(`Error opening database: ${event.target.error}`);
        };
    });
};

export const addToDB = (db, data) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([db.objectStoreNames[0]], 'readwrite');
        const objectStore = transaction.objectStore(db.objectStoreNames[0]);

        let currentIndex = localStorage.getItem(`${db.objectStoreNames[0]}-index`);
        currentIndex = currentIndex === null ? 0 : parseInt(currentIndex, 10);
        currentIndex += 1;
        localStorage.setItem(`${db.objectStoreNames[0]}-index`, currentIndex);

        let entry = {
            timestamp: new Date().getTime(),
            index: currentIndex
        };

        if (data instanceof Blob) {
            entry.blob = data;
        } else if (Array.isArray(data)) {
            if (data[0] !== null) entry.blob = data[0];
            if (data[1] !== null) entry.url = data[1];
        }

        entry = Object.fromEntries(Object.entries(entry).filter(([_, v]) => v != null));

        const request = objectStore.add(entry);
        request.onsuccess = () => {
            resolve(currentIndex);
        };

        request.onerror = (event) => {
            currentIndex -= 1;
            localStorage.setItem(`${db.objectStoreNames[0]}-index`, currentIndex);
            alert('Error adding data to database: ' + event);
            reject(`Error adding data to database: ${event.target.error ? event.target.error.message : 'Unknown error'}`);
        };
    });
};

export const countInDB = (db) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([db.objectStoreNames[0]], 'readonly');
        const objectStore = transaction.objectStore(db.objectStoreNames[0]);
        const request = objectStore.count();

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(`Error counting entries in database: ${event.target.error}`);
        };
    });
};

export const getFromDB = (db, limit = null, offset = 0) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([db.objectStoreNames[0]], 'readonly');
        const objectStore = transaction.objectStore(db.objectStoreNames[0]);
        const request = objectStore.getAll();

        request.onsuccess = (event) => {
            let results = event.target.result;
            results = results.sort((a, b) => b.index - a.index);
            if (limit !== null) {
                results = results.slice(offset, offset + limit);
            }

            resolve(results.map(item => ({ blob: item.blob || null, url: item.url || null, index: item.index || null, id: item.id || null })));
        };

        request.onerror = (event) => {
            reject(`Error retrieving data from database: ${event.target.error}`);
        };
    });
};

export const initDB = async (dataBaseIndexName, dataBaseObjectStoreName, handleDownload) => {
    try {
        let db = openDB(dataBaseIndexName, dataBaseObjectStoreName);
        let mediaCount = localStorage.getItem(`${dataBaseObjectStoreName}-count`);

        if (!mediaCount) {
            mediaCount = await countInDB(await db);
            localStorage.setItem(`${dataBaseObjectStoreName}-count`, mediaCount);
        } else {
            mediaCount = parseInt(mediaCount, 10);
        }

        const mediaContainer = document.querySelector(`.${dataBaseObjectStoreName}`);
        const fragment = document.createDocumentFragment();

        if (mediaCount > 0) {
            mediaContainer.style.display = mediaCount > 0 ? 'flex' : 'none';
            for (let i = 0; i < mediaCount; i++) {
                const div = document.createElement('div');
                div.className = 'data-container';
                div.innerHTML = `<div class="process-text"></div><div class="delete-icon"></div>`;
                fragment.appendChild(div);
            }
        }
        mediaContainer.appendChild(fragment);
        db = await db;
        mediaCount = await countInDB(db);
        localStorage.setItem(`${dataBaseObjectStoreName}-count`, mediaCount);

        if (mediaCount > 0) {
            const mediaItems = await getFromDB(db);
            const inputElements = mediaContainer.querySelectorAll('.data-container');

            for (const [indexInBatch, { blob, url, index }] of mediaItems.entries()) {
                if (blob) {
                    const blobUrl = URL.createObjectURL(blob);
                    let mediaElement;

                    if (blob.type.startsWith('video')) {
                        mediaElement = document.createElement('video');
                        mediaElement.src = blobUrl;
                        mediaElement.muted = true;
                        mediaElement.autoplay = true;
                        mediaElement.loop = true;
                        mediaElement.addEventListener('click', () => {
                            mediaElement.play();
                        });
                        setTimeout(() => { mediaElement.play(); }, 100);
                        mediaElement.playsInline = true;
                        mediaElement.setAttribute('playsinline', 'true');
                        mediaElement.preload = 'auto';
                        mediaElement.disablePictureInPicture = true;
                        mediaElement.innerHTML = `Your browser does not support the video tag.`;
                    } else {
                        mediaElement = document.createElement('img');
                        mediaElement.src = blobUrl;
                    }

                    mediaElement.setAttribute('index', index);
                    inputElements[indexInBatch].insertBefore(mediaElement, inputElements[indexInBatch].firstChild);
                } else {
                    const selectedOutputInfo = { db, url, element: inputElements[indexInBatch], index };
                    handleDownload(selectedOutputInfo);
                }
            }

            mediaContainer.style.display = mediaCount > 0 ? 'flex' : 'none';
        }
    } catch (error) {
        console.error(`Database initialization failed: ${error.message}`);
    }
};

export const updateInDB = (db, url, blob) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([db.objectStoreNames[0]], 'readwrite');
        const objectStore = transaction.objectStore(db.objectStoreNames[0]);

        const request = objectStore.openCursor();
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                if (cursor.value.url === url) {
                    cursor.value.blob = blob;

                    const updateRequest = cursor.update(cursor.value);
                    updateRequest.onsuccess = () => {
                        resolve();
                    };

                    updateRequest.onerror = (event) => {
                        reject(`Error updating photo in database: ${event.target.error}`);
                    };
                } else {
                    cursor.continue();
                }
            } else {
                reject(`No record found with url: ${url}`);
            }
        };

        request.onerror = (event) => {
            reject(`Error opening cursor in database: ${event.target.error}`);
        };
    });
};

export const deleteFromDB = async (db, index) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([db.objectStoreNames[0]], 'readwrite');
        const photosObjectStore = transaction.objectStore(db.objectStoreNames[0]);
        const deleteRequest = photosObjectStore.delete(index);

        deleteRequest.onsuccess = async () => {
            resolve();

            for (const dbConfig of databases) {
                const db = await openDB(dbConfig.indexName, dbConfig.objectStore);
                const photoCount = await countInDB(db, dbConfig.objectStore);
                localStorage.setItem(`${dbConfig.objectStore}-count`, photoCount);
            }
        };

        deleteRequest.onerror = (event) => {
            reject(`Error deleting photo from database: ${event.target.error}`);
        };
    });
};