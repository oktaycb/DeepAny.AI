export function setCache(key, value, ttl) {
    const now = new Date();
    const item = {
        value: value,
        expiry: now.getTime() + ttl,
    }
    localStorage.setItem(key, JSON.stringify(item));
}

export function getCache(key) {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) {
        return null;
    }

    const item = JSON.parse(itemStr);
    const now = new Date();
    if (now.getTime() > item.expiry) {
        localStorage.removeItem(key);
        return null;
    }
    return item.value;
}

export const resizeImage = (base64, width, height) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = base64;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = width;
            canvas.height = height;

            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL());
        };

        img.onerror = (error) => {
            reject(`Image resizing failed: ${error}`);
        };
    });
};

export function retrieveImageFromURL(photoURL, callback, retries = 2, delay = 1000, createBase64 = false) {
    fetch(photoURL)
        .then(response => {
            if (response.ok) {
                return response.blob();
            } else if (response.status === 429 && retries > 0) {
                setTimeout(() => {
                    retrieveImageFromURL(photoURL, callback, retries - 1, delay * 2, createBase64);
                }, delay);
            } else {
                throw new Error(`Failed to fetch image: ${response.status}`);
            }
        })
        .then(blob => {
            if (blob) {
                if (createBase64) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        callback(reader.result);
                    };
                    reader.readAsDataURL(blob);
                } else callback(URL.createObjectURL(blob));
            }
        })
        .catch(error => {
            console.error('Error fetching the image:', error);
        });
}

/* Use resizeImage here!!! */
export function handleImageUpload(imgElementId, storageKey) {
    const imgElement = document.getElementById(imgElementId);
    imgElement.addEventListener('click', function () {
        const inputElement = document.createElement("input");
        inputElement.type = "file";
        inputElement.accept = "image/*";
        inputElement.style.display = "none";
        document.body.appendChild(inputElement);
        inputElement.click();
        inputElement.addEventListener("change", function (event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onloadend = function () {
                    const img = new Image();
                    img.src = reader.result;
                    img.onload = function () {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = 96; 
                        canvas.height = 96;
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                        const resizedBase64Image = canvas.toDataURL(); 
                        imgElement.src = resizedBase64Image; 
                        localStorage.setItem(storageKey, resizedBase64Image);
                    };
                };
                reader.readAsDataURL(file);
            }

            inputElement.remove();
        });
    });
}

async function fetchWithTimeout(url, timeout, controller) {
    const signal = controller.signal;

    const fetchPromise = fetch(url, { signal }).then(response => response.json());
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            controller.abort();
            reject(new Error('Request timed out'));
        }, timeout);
    });

    return Promise.race([fetchPromise, timeoutPromise]);
}

export async function getUserIpAddress() {
    const urls = [
        'https://ipinfo.io/json',
        'https://api64.ipify.org?format=json'
    ];

    const controllers = urls.map(() => new AbortController()); 
    try {
        const fetchPromises = urls.map((url, id) => fetchWithTimeout(url, 1000, controllers[id]));
        const data = await Promise.any(fetchPromises);
        controllers.forEach(controller => controller.abort());
        return data.ip;
    } catch (error) {
        console.error('All attempts to fetch IP address failed:', error);
        return null;
    }
}

export function getPageName() {
    const url = window.location.pathname;
    const pathArray = url.split('/');
    return pathArray[pathArray.length - 1] || 'default';
}

export async function fetchServerAddresses(snapshotPromise, keepSlowServers = true) {
    const cacheKey = getPageName() + '-serverAddresses';
    let cachedAddresses = getCache(cacheKey);
    if (!keepSlowServers)
        cachedAddresses = cachedAddresses.filter(address => !address.includes("3050"));
    if (cachedAddresses) return cachedAddresses;

    const snapshot = await snapshotPromise;
    let serverAddresses = snapshot.docs.map((doc) => doc.data()['serverAdress-DF']).filter(Boolean);
    setCache(cacheKey, serverAddresses, 30 * 24 * 60 * 60 * 1000);
    if (!keepSlowServers)
        serverAddresses = serverAddresses.filter(address => !address.includes("3050"));
    return serverAddresses;
}

export async function fetchServerAddress(snapshotPromise, fieldId) {
    const cacheKey = `serverAddress-${fieldId}`;
    const cachedAddress = getCache(cacheKey);
    if (cachedAddress) return cachedAddress;

    const snapshot = await snapshotPromise;
    if (snapshot && snapshot.exists()) {
        const serverAddress = snapshot.data()[`serverAdress-${fieldId}`];
        setCache(cacheKey, serverAddress || null, 30 * 24 * 60 * 60 * 1000);
        return serverAddress || null;
    }

    return null;
}

export async function fetchConversionRates() {
    const cacheKey = 'conversionRates';
    const cachedRates = getCache(cacheKey);
    if (cachedRates) return cachedRates;

    try {
        const response = await fetch('https://api.frankfurter.app/latest?from=USD');
        if (!response.ok) {
            throw new Error('API request failed');
        }
        const data = await response.json();
        setCache(cacheKey, data.rates, 1 * 24 * 60 * 60 * 1000);
        return data.rates;
    } catch (error) {
        console.error("Error fetching conversion rates:", error);
        return { EUR: 0.9, GBP: 0.8, TRY: 35.00 };
    }
}

export function generateBID() {
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789%^&*()_-+=';
    var uniqueId = '';

    for (var i = 0; i < 12; i++) {
        var randomIndex = Math.floor(Math.random() * characters.length);
        uniqueId += characters.charAt(randomIndex);
    }

    return uniqueId;
}

export async function ensureUniqueId() {
    const storedUniqueId = localStorage.getItem('uniqueUserBrowserRegisterId');
    if (storedUniqueId) {
        loadEvercookie();
        return storedUniqueId;
    }

    const newUniqueId = await loadEvercookieAndGetUniqueId();
    localStorage.setItem('uniqueUserBrowserRegisterId', newUniqueId);
    return newUniqueId;
}

async function loadEvercookieAndGetUniqueId() {
    await loadEvercookieScript();
    const ec = new evercookie();

    return new Promise((resolve) => {
        ec.get('uniqueUserBrowserRegisterId', async (storedUniqueId) => {
            if (storedUniqueId) {
                resolve(storedUniqueId);
            } else {
                const newUniqueId = await generateBID();
                ec.set('uniqueUserBrowserRegisterId', newUniqueId);
                resolve(newUniqueId);
            }
        });
    });
}

function loadEvercookieScript() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = "https://samy.pl/evercookie/evercookie.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

function loadEvercookie() {
    loadEvercookieScript().catch(() => {
        console.error('Failed to load Evercookie script.');
    });
}

function createNotificationsContainer() {
    let container = document.getElementById('notification');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification';
        container.className = 'indicator-container';
        document.body.appendChild(container);
    }

    const indicators = container.getElementsByClassName('indicator');
    if (indicators.length > 0) {
        for (let i = 0; i < indicators.length - 0; i++) {
            const notification = indicators[i];
            notification.style.opacity = '0';
            notification.remove();
        }
    }

    return container;
}

export function showNotification(message, featureChange, type) {
    const container = createNotificationsContainer();
    let waitTime = 5000;

    const notification = document.createElement('div');
    notification.className = 'indicator';

    const featureChangeElement = document.createElement('p');
    featureChangeElement.innerText = featureChange;
    featureChangeElement.className = 'feature-change';

    if (type === 'warning') {
        notification.classList.add('notification-warning');
        featureChangeElement.classList.add('feature-change-warning');
        waitTime = 10000;
    }

    const messageElement = document.createElement('p');
    messageElement.innerText = message;
    messageElement.className = 'notification-explanation';

    notification.appendChild(featureChangeElement);
    notification.appendChild(messageElement);
    container.appendChild(notification);

    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, waitTime);

    document.addEventListener('click', (event) => {
        if (!notification.contains(event.target) && container.contains(notification)) {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }
    }, { once: true })
}

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

export const addToDB = (db, data, saveCountIndex = null, active = false) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([db.objectStoreNames[0]], 'readwrite');
        const objectStore = transaction.objectStore(db.objectStoreNames[0]);

        const timestamp = new Date().getTime();

        let entry = {
            timestamp,
            active
        };

        if (data instanceof Blob) {
            entry.blob = data;
        } else if (Array.isArray(data)) {
            if (data[0] !== null) entry.blob = data[0];
            if (data[1] !== null) entry.url = data[1];
        }

        entry = Object.fromEntries(Object.entries(entry).filter(([_, v]) => v != null));

        const request = objectStore.add(entry);
        request.onsuccess = async () => {
            resolve({ id: request.result, timestamp });

            if (saveCountIndex)
                await saveCountIndex();
        };

        request.onerror = (event) => {
            alert('Error adding data to database: ' + event);
            reject(`Error adding data to database: ${event.target.error ? event.target.error.message : 'Unknown error'}`);
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
            results = results.sort((a, b) => b.id - a.id);
            if (limit !== null) {
                results = results.slice(offset, offset + limit);
            }

            const mappedResults = results.map(item => {
                return {
                    blob: item.blob || null,
                    url: item.url || null,
                    id: item.id || null,
                    chunks: item.chunks || [], // Ensure chunks is an array
                    timestamp: item.timestamp || null,
                    active: item.active || false
                };
            });

            resolve(mappedResults);
        };

        request.onerror = (event) => {
            reject(`Error retrieving data from database: ${event.target.error}`);
        };
    });
};

export const updateActiveState = async (db, id, active) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([db.objectStoreNames[0]], 'readwrite');
        const objectStore = transaction.objectStore(db.objectStoreNames[0]);
        const request = objectStore.get(id);

        request.onsuccess = (event) => {
            const item = event.target.result;
            if (item) {
                item.active = active;

                const updateRequest = objectStore.put(item);
                updateRequest.onsuccess = () => {
                    resolve();
                };
                updateRequest.onerror = (event) => reject(`Error updating active state: ${event.target.error}`);
            } else {
                reject('Item not found for update');
            }
        };

        request.onerror = (event) => {
            reject(`Error retrieving item for active state update: ${event.target.error}`);
        };
    });
};

export async function fetchProcessState(url) {
    const response = await fetch(url.replace('download-output', 'get-process-state'));
    return await response.json();
}

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
                div.innerHTML = `<div class="process-text">Loading...</div><div class="delete-icon"></div>`;
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

            for (const [indexInBatch, { blob, url, id, timestamp, active }] of mediaItems.entries()) {
                let content = `<initial url="${url}" id="${id}" timestamp="${timestamp}" active="${active}"/></initial><div class="process-text">Initializing</div><div class="delete-icon"></div>`;
                let element = inputElements[indexInBatch];
                element.innerHTML = `${content}`;

                if (blob && (blob.type.startsWith('video') || blob.type.startsWith('image'))) {
                    const blobUrl = URL.createObjectURL(blob);
                    content = blob.type.startsWith('video')
                        ? `<video url="${url}" id="${id}" timestamp="${timestamp} active="${active}" playsinline preload="auto" disablePictureInPicture loop muted autoplay><source src="${blobUrl}" type="${blob.type}">Your browser does not support the video tag.</video></div><div class="delete-icon">`
                        : `<img url="${url}" id="${id}" timestamp="${timestamp} active="${active}" src="${blobUrl}" alt="Uploaded Photo"/></div><div class="delete-icon">`;

                    element.innerHTML = `${content}`;

                    if (active)
                        element.classList.add('active');
                } else if (url) {
                    const data = await fetchProcessState(url);
                    if (data.status === 'completed') 
                        await handleDownload({ db, url, element, id, timestamp, active });                   
                    else {
                        const serverMessage = data.server ? data.server : 'Not Indexed';
                        let content = `<initial url="${url}" id="${id}" timestamp="${timestamp}" active="${active}"/></initial><div class="process-text">${serverMessage}</div><div class="delete-icon"></div>`;
                        element.innerHTML = `${content}`;
                    }
                }
                else element.innerHTML = `${content}`;
            }

            mediaContainer.style.display = mediaCount > 0 ? 'flex' : 'none';
        }
    } catch (error) {
        console.error(`Database initialization failed: ${error.message}`);
    }
};

export const updateChunksInDB = (db, url, chunks) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([db.objectStoreNames[0]], 'readwrite');
        const objectStore = transaction.objectStore(db.objectStoreNames[0]);

        const request = objectStore.openCursor();
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (!cursor) {
                return resolve();
            }

            const { value } = cursor;
            if (value.url === url) {
                value.chunks = chunks;

                const updateRequest = objectStore.put(value);
                updateRequest.onsuccess = () => resolve();
                updateRequest.onerror = () => reject('Error updating chunks.');
            } else {
                cursor.continue();
            }
        };

        request.onerror = () => reject('Error accessing cursor.');
    });
};

export const updateInDB = (db, url, blob) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([db.objectStoreNames[0]], 'readwrite');
        const objectStore = transaction.objectStore(db.objectStoreNames[0]);

        const request = objectStore.openCursor();
        request.onsuccess = async (event) => {
            const cursor = event.target.result;
            if (cursor) {
                if (cursor.value.url === url) {
                    cursor.value.blob = blob;
                    cursor.value.chunks = [];

                    const updateRequest = cursor.update(cursor.value);
                    updateRequest.onsuccess = async () => {
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


export const deleteFromDB = async (db, id, saveCountIndex) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([db.objectStoreNames[0]], 'readwrite');
        const photosObjectStore = transaction.objectStore(db.objectStoreNames[0]);
        const deleteRequest = photosObjectStore.delete(id);

        deleteRequest.onsuccess = async () => {
            resolve();
            await saveCountIndex();
        };

        deleteRequest.onerror = (event) => {
            reject(`Error deleting photo from database: ${event.target.error}`);
        };
    });
};

let firebaseModules = null;

export async function getFirebaseModules() {
    if (firebaseModules) {
        return firebaseModules;
    }

    const firebaseAppModule = await import('https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js');
    const firebaseAuthModule = await import('https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js');
    const firebaseFirestoreModule = await import('https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js');

    const { initializeApp } = firebaseAppModule;
    const { getAuth, GoogleAuthProvider, sendEmailVerification, sendPasswordResetEmail, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } = firebaseAuthModule;
    const { getFirestore, collection, doc, getDoc, getDocs } = firebaseFirestoreModule;

    const firebaseConfig = {
        apiKey: "AIzaSyB9KofLbx0_N9CKXUPJiuzRBMYizM-YPYw",
        authDomain: "bodyswap-389200.firebaseapp.com",
        projectId: "bodyswap-389200",
        storageBucket: "bodyswap-389200.appspot.com",
        messagingSenderId: "385732753036",
        appId: "1:385732753036:web:e078abf4bbf557938deda9",
        measurementId: "G-7PLJEN2Y0R"
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    firebaseModules = {
        auth,
        db,
        GoogleAuthProvider,
        sendEmailVerification,
        sendPasswordResetEmail,
        signInWithPopup,
        signInWithEmailAndPassword,
        createUserWithEmailAndPassword,
        onAuthStateChanged,
        signOut,
        doc,
        getDoc,
        getDocs,
        collection
    };

    return firebaseModules;
}

export async function getCurrentUserData(getFirebaseModules) {
    const { auth } = await getFirebaseModules();

    return new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();

            if (user) {
                resolve({
                    uid: user.uid,
                    email: user.email,
                    emailVerified: user.emailVerified,
                    displayName: user.displayName,
                    photoURL: user.photoURL
                });
            } else {
                reject(new Error('No user is currently logged in.'));
            }
        });
    });
}

export async function getDocSnapshot(collectionId, documentId) {
    const { db, doc, getDoc, collection } = await getFirebaseModules();
    return await getDoc(doc(collection(db, collectionId), documentId));
}

export async function getDocsSnapshot(collectionId) {
    const { db, getDocs, collection } = await getFirebaseModules();
    return await getDocs(collection(db, collectionId));
}

export const getCachedStaticUserData = () => {
    const cachedUserData = localStorage.getItem('cachedUserData');
    return cachedUserData ? JSON.parse(cachedUserData) : null;
};

export const getCachedDynamicUserDoc = () => {
    const cachedUserDocument = localStorage.getItem('cachedUserDocument');
    if (!cachedUserDocument) {
        return null;
    }

    const parsedData = JSON.parse(cachedUserDocument);
    return parsedData.data || null;
};

export async function setCurrentUserData(getFirebaseModules) {
    const cachedUserData = await getCurrentUserData(getFirebaseModules);
    localStorage.setItem('cachedUserData', JSON.stringify(cachedUserData));
}

const CACHE_EXPIRATION_TIME = 1 * 60 * 60 * 1000; // Update every hour.

export async function setCurrentUserDoc(getDocSnapshot, useCache = false) {
    if (useCache) {
        let cachedUserDoc = localStorage.getItem('cachedUserDocument');

        if (cachedUserDoc) {
            cachedUserDoc = JSON.parse(cachedUserDoc);
            const currentTime = new Date().getTime();

            if (currentTime - cachedUserDoc.timestamp < CACHE_EXPIRATION_TIME) {
                setUser(cachedUserDoc.data);
                return true;
            }
        }
    }

    const userData = getCachedStaticUserData();
    const userDocSnap = await getDocSnapshot('users', userData.uid);
    if (!userDocSnap || !userDocSnap.exists()) {
        return false;
    }

    const userDoc = userDocSnap.data();
    localStorage.setItem('cachedUserDocument', JSON.stringify({
        data: userDoc,
        timestamp: new Date().getTime(),
    }));

    // TODO: add loading text here for firebase update. In future only update firebase when necessary but updating every hour is fine too. make button to fetch user data incase user needs data immidiately.
    setUser(userDoc);
    return true;
}

export function setUser(userDoc = getCachedDynamicUserDoc()) {
    if (!userDoc) return false;

    function setCachedImageForElements(className, storageKey) {
        const imgElements = document.getElementsByClassName(className);
        const cachedImage = localStorage.getItem(storageKey);

        if (cachedImage) {
            for (let imgElement of imgElements) {
                imgElement.src = cachedImage;
            }
        } else {
            for (let imgElement of imgElements) {
                imgElement.src = 'assets/profile.webp';
            }
        }
    }

    setCachedImageForElements('profile-image', 'profileImageBase64');

    const credits = document.getElementById('creditsAmount');
    if (credits) {
        const totalCredits = (Number(userDoc.credits) || 0) + (Number(userDoc.dailyCredits) || 0);
        credits.textContent = '';
        credits.textContent += totalCredits;
        credits.textContent += ' Credits';

        if (userDoc.deadline) {
            const deadline = new Date(userDoc.deadline.seconds * 1000 + (userDoc.deadline.nanoseconds || 0) / 1000000);
            const now = new Date();
            const timeDiff = deadline.getTime() - now.getTime();

            if (timeDiff > 0) {
                const minuteInMs = 1000 * 60;
                const hourInMs = minuteInMs * 60;
                const dayInMs = hourInMs * 24;
                const yearInMs = dayInMs * 365;
                const monthInMs = dayInMs * 30;

                const years = Math.floor(timeDiff / yearInMs);
                const months = Math.floor((timeDiff % yearInMs) / monthInMs);
                const days = Math.floor((timeDiff % monthInMs) / dayInMs);
                const hours = Math.floor((timeDiff % dayInMs) / hourInMs);
                const minutes = Math.floor((timeDiff % hourInMs) / minuteInMs);

                let remainingTime = '';
                if (years > 5) {
                    remainingTime = 'lifetime';
                } else {
                    if (years > 0) remainingTime += `${years} year${years > 1 ? 's' : ''} `;
                    if (months > 0) remainingTime += `${months} month${months > 1 ? 's' : ''} `;
                    if (days > 0) remainingTime += `${days} day${days > 1 ? 's' : ''} `;
                    if (days === 0 && hours > 0) remainingTime += `${hours} hour${hours > 1 ? 's' : ''} `;
                    if (days === 0 && hours === 0 && minutes > 0) remainingTime += `${minutes} minute${minutes > 1 ? 's' : ''}`;
                    remainingTime = remainingTime.trim() + ' remaining';
                }

                credits.textContent += ` (${remainingTime})`;
            }
        }
    }

    const usernames = document.getElementsByClassName('username');
    for (let username of usernames) {
        username.textContent = userDoc.username;
        username.value = userDoc.username;
    }

    return true;
}

async function handleUserLoggedIn(userData, getUserIpAddress, ensureUniqueId, fetchServerAddress, getDocSnapshot, getFirebaseModules) {
    if (!userData) return;

    const openSignInContainer = document.getElementById("openSignInContainer");
    const openSignUpContainer = document.getElementById("openSignUpContainer");

    if (openSignInContainer) openSignInContainer.remove();
    if (openSignUpContainer) openSignUpContainer.remove();

    if (!userData.emailVerified) {
        async function createVerificationFormSection(getFirebaseModules) {
            const innerContainer = document.getElementById('innerContainer');
            if (!innerContainer)
                return;

            innerContainer.innerHTML = `
                <h2>Verify Your Email</h2>
                <p id="verificationMessage">Please click on the button to send verification email.</p>
                <button class="wide" id="sendVerificationEmail" type="button">Send Verification Email</button>
                <div style="display: flex; justify-content: center; width: 100%; align-items: center;">
                    <div class="line"></div>
                    <p style="padding: 0 calc(1vh * var(--scale-factor-h)); white-space: nowrap;">I have verified</p>
                    <div class="line"></div>
                </div>
                <button class="wide" id="validateVerification">Validate Verification</button>
                <span class="close-button" style="position: absolute; font-size: 2vh; top: 1vh; right: 1vh; cursor: pointer;">X</span>
            `;

            const sendVerificationEmail = document.getElementById("sendVerificationEmail");
            sendVerificationEmail.addEventListener('click', async () => {
                try {
                    const { auth, sendEmailVerification } = await getFirebaseModules();
                    const user = auth.currentUser;

                    if (user) {
                        await sendEmailVerification(user);
                        document.getElementById('verificationMessage').style.display = 'unset';
                        document.getElementById('verificationMessage').style.color = 'unset';
                        document.getElementById('verificationMessage').textContent = 'Verification email sent! Please check your inbox.';
                    } else {
                        throw new Error('No authenticated user found. Please log in first.');
                    }
                } catch (error) {
                    document.getElementById('verificationMessage').style.display = 'unset';
                    document.getElementById('verificationMessage').style.color = 'red';
                    document.getElementById('verificationMessage').textContent = error.message;
                }
            });

            const validateVerification = document.getElementById("validateVerification");
            validateVerification.addEventListener('click', async () => {
                try {
                    await setCurrentUserData(getFirebaseModules);

                    const userData = getCachedStaticUserData();
                    if (!userData.emailVerified)
                        throw new Error('Your email is still not verified.');
                    else {
                        location.reload();
                    }
                } catch (error) {
                    document.getElementById('verificationMessage').style.display = 'unset';
                    document.getElementById('verificationMessage').style.color = 'red';
                    document.getElementById('verificationMessage').textContent = error.message;
                }
            });

            const closeButton = formWrapper.querySelector('.close-button');
            closeButton.addEventListener('click', () => {
                document.body.removeChild(formWrapper);
            });
        }

        const createFormSection = createVerificationFormSection.bind(null, getFirebaseModules);
        createForm(createFormSection);
    }

    const canSetUserData = setUser();
    if (!canSetUserData) {
        const setUserDataSuccess = await setCurrentUserDoc(getDocSnapshot);
        if (!setUserDataSuccess) {
            try {
                async function getServerAddressAPI() {
                    return await fetchServerAddress(getDocSnapshot('servers', '3050-1'), 'API');
                }

                const [userIpAddress, uniqueId, serverAddressAPI] = await Promise.all([
                    getUserIpAddress(),
                    ensureUniqueId(),
                    getServerAddressAPI()
                ]);

                const userId = userData.uid;
                const referral = new URLSearchParams(window.location.search).get('referral');

                const response = await fetch(`${serverAddressAPI}/create-user`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        email: userData.email,
                        username: userData.displayName,
                        //phoneNumber: userData.phoneNumber,
                        //emailVerified: userData.emailVerified,
                        isAnonymous: userData.isAnonymous,
                        userIpAddress,
                        uniqueId,
                        referral: referral || null,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const jsonResponse = await response.json();
                const responseText = JSON.stringify(jsonResponse);
                if (responseText.includes("success")) {
                    location.reload();
                }
            } catch (error) {
                console.error('Error during user registration:', error);
                return null;
            }
        }
        else location.reload();
        return;
    }

    await setCurrentUserDoc(getDocSnapshot, true);
}

async function createSignFormSection(registerForm, retrieveImageFromURL, getFirebaseModules) {
    const innerContainer = document.getElementById('innerContainer');
    if (!innerContainer)
        return;

    if (!registerForm) {
        innerContainer.innerHTML = `
                <h2>Sign in</h2>
                <p>Don't have an account? <span id="openSignUpForm" style="cursor: pointer; color: blue;">Sign up</span></p>
                <button class="wide" id="googleSignInButton" type="button">Sign in with Google</button>

                <div style="display: flex; justify-content: center; width: 100%; align-items: center;">
                    <div class="line"></div>
                    <p style="padding: 0 calc(1vh * var(--scale-factor-h)); white-space: nowrap;">or use email</p>
                    <div class="line"></div>
                </div>

                <div id="infoMessage" style="color: red; display: none;"></div>

                <div>
                    <label for="email">Email address</label>
                    <input type="email" id="email" name="email" placeholder="Enter your email address..." required>
                </div>

                <div>
                    <label for="password">Password</label>
                    <div style="position: relative;">
                        <input type="password" id="password" name="password" placeholder="Enter your password..." required minlength="8" style="padding-right: calc(5vh * var(--scale-factor-h));">
                        <span class="input_password_show" style="position: absolute; display: flex; right: calc(1vh * var(--scale-factor-h)); top: 50%; transform: translateY(-50%); cursor: pointer; height: calc(3vh * var(--scale-factor-h)); width: calc(3vh * var(--scale-factor-h)); align-items: center; justify-content: center;">
                            <svg xmlns="http://www.w3.org/2000/svg" style="height: 100%; width: 100%;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye">
                                <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </span>
                    </div>
                    <small style="opacity: 0.75;">at least 8 characters long</small>
                </div>

                <button class="wide" id="signInButton">Sign in</button>
                <p id="forgotPassword" style="cursor: pointer;">Forgot your password?</p>
                <span class="close-button" style="position: absolute; font-size: 2vh; top: 1vh; right: 1vh; cursor: pointer;">X</span>
            `;

        document.getElementById('openSignUpForm').addEventListener('click', () => {
            createSignFormSection(true, retrieveImageFromURL, getFirebaseModules);
        });
    } else {
        innerContainer.innerHTML = `
                <h2>Sign up</h2>
                <p>Already have an account? <span id="openSignInForm" style="cursor: pointer; color: blue;">Sign in</span></p>
                <div id="infoMessage" style="color: red; display: none;"></div>

                <div>
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" placeholder="Enter your username..." required>
                </div>

                <div>
                    <label for="email">Email address</label>
                    <input type="email" id="email" name="email" placeholder="Enter your email address..." required>
                </div>

                <div>
                    <label for="password">Password</label>
                    <div style="position: relative;">
                        <input type="password" id="password" name="password" placeholder="Enter your password..." required minlength="8" style="padding-right: calc(5vh * var(--scale-factor-h));">
                        <span class="input_password_show" style="position: absolute; display: flex; right: calc(1vh * var(--scale-factor-h)); top: 50%; transform: translateY(-50%); cursor: pointer; height: calc(3vh * var(--scale-factor-h)); width: calc(3vh * var(--scale-factor-h)); align-items: center; justify-content: center;">
                            <svg xmlns="http://www.w3.org/2000/svg" style="height: 100%; width: 100%;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye">
                                <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </span>
                    </div>
                    <small style="opacity: 0.75;">at least 8 characters long</small>
                </div>
                <button class="wide" id="signUpButton">Sign Up</button>

                <button class="close-button" style="position: absolute;top: 1vh;right: 1vh;cursor: pointer;width: fit-content;">
                    <svg style="margin: 0;" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x">
                        <path d="M18 6 6 18"></path>
                        <path d="m6 6 12 12"></path>
                    </svg>
                </button>
            `;

        document.getElementById('openSignInForm').addEventListener('click', () => {
            createSignFormSection(false, retrieveImageFromURL, getFirebaseModules);
        });
    }

    const closeButton = formWrapper.querySelector('.close-button');
    closeButton.addEventListener('click', () => {
        document.body.removeChild(formWrapper);
    });

    formWrapper.addEventListener('mousedown', (event) => {
        if (event.target === formWrapper) {
            document.body.removeChild(formWrapper);
        }
    });

    let messageContainer = document.getElementById('infoMessage');
    let googleSignInButton = document.getElementById('googleSignInButton');
    let signInButton = document.getElementById('signInButton');
    let forgotPassword = document.getElementById('forgotPassword');

    let signUpButton = document.getElementById('signUpButton');

    if (forgotPassword) {
        forgotPassword.style.display = 'none';
        forgotPassword.addEventListener('click', async () => {
            let email = document.getElementById('email').value;
            if (!email)
                email = prompt('Please enter your email address to reset your password:');

            if (email) {
                try {
                    const { auth, sendPasswordResetEmail } = await getFirebaseModules();
                    await sendPasswordResetEmail(auth, email);
                    if (messageContainer) {
                        messageContainer.style.display = 'unset';
                        messageContainer.style.color = 'red';
                        messageContainer.textContent = 'Password reset email sent! Please check your inbox.';
                    }
                } catch (error) {
                    console.error("Error sending password reset email:", error);
                    alert('An error occurred while sending the password reset email. Please try again.');
                }
            }
        });
    }

    if (googleSignInButton) {
        googleSignInButton.addEventListener('click', async (event) => {
            event.preventDefault();
            try {
                const { auth, GoogleAuthProvider, signInWithPopup } = await getFirebaseModules();
                const provider = new GoogleAuthProvider();
                const result = await signInWithPopup(auth, provider);

                let userCopy = { ...result.user };
                delete userCopy.stsTokenManager;
                delete userCopy.providerData;
                delete userCopy.metadata;
                delete userCopy.accessToken;
                delete userCopy.proactiveRefresh;
                delete userCopy.providerId;
                delete userCopy.tenantId;
                delete userCopy.reloadListener;
                delete userCopy.reloadUserInfo;
                delete userCopy.auth;

                if (!localStorage.getItem('profileImageBase64')) {
                    const base64Image = await retrieveImageFromURL(userCopy.photoURL, 2, 1000, true);
                    if (base64Image) {
                        localStorage.setItem('profileImageBase64', base64Image);
                    }
                }

                const cachedUserData = JSON.stringify(userCopy);
                localStorage.setItem('cachedUserData', cachedUserData);
                location.reload();
            } catch (error) {
                console.error("Google sign-in error:", error);
            }
        });
    }

    if (signInButton) {
        signInButton.addEventListener('click', async (event) => {
            event.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const { auth, signInWithEmailAndPassword } = await getFirebaseModules();
                const result = await signInWithEmailAndPassword(auth, email, password);

                let userCopy = { ...result.user };
                delete userCopy.stsTokenManager;
                delete userCopy.providerData;
                delete userCopy.metadata;
                delete userCopy.accessToken;
                delete userCopy.proactiveRefresh;
                delete userCopy.providerId;
                delete userCopy.tenantId;
                delete userCopy.reloadListener;
                delete userCopy.reloadUserInfo;
                delete userCopy.auth;

                const cachedUserData = JSON.stringify(userCopy);
                localStorage.setItem('cachedUserData', cachedUserData);
                location.reload();
            } catch (error) {
                if (forgotPassword) {
                    forgotPassword.style.display = 'unset';
                }

                if (messageContainer) {
                    messageContainer.style.display = 'unset';
                    messageContainer.style.color = 'red';

                    switch (error.code) {
                        case 'auth/user-not-found':
                            messageContainer.textContent = 'No user found with this email.';
                            break;
                        case 'auth/wrong-password':
                            messageContainer.textContent = 'Incorrect password.';
                            break;
                        case 'auth/invalid-login-credentials':
                            messageContainer.textContent = 'Invalid credentials.';
                            break;
                        case 'auth/too-many-requests':
                            messageContainer.textContent = 'Access to this account has been temporarily disabled due to many failed login attempts. Reset your password or try again later.';
                            break;
                        default:
                            messageContainer.textContent = 'An error occurred. Please try again.';
                    }
                }

                console.error("Email/password sign-in error:", error);
            }
        });
    }

    if (signUpButton) {
        signUpButton.addEventListener('click', async (event) => {
            event.preventDefault();

            try {
                async function getServerAddressAPI() {
                    return await fetchServerAddress(getDocSnapshot('servers', '3050-1'), 'API');
                }

                const [userIpAddress, uniqueId, serverAddressAPI] = await Promise.all([
                    getUserIpAddress(),
                    ensureUniqueId(),
                    getServerAddressAPI()
                ]);

                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const username = document.getElementById('username').value;
                const referral = new URLSearchParams(window.location.search).get('referral');

                const requestData = {
                    email,
                    password,
                    username,
                    referral: referral || null,
                    userIpAddress: userIpAddress || null,
                    uniqueId,
                };

                const response = await fetch(`${serverAddressAPI}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();
                if (data.message && data.message.includes("User registered successfully")) {
                    createSignFormSection(false, retrieveImageFromURL, getFirebaseModules);

                    messageContainer = document.getElementById('infoMessage');
                    if (messageContainer) {
                        messageContainer.style.display = 'unset';
                        messageContainer.style.color = 'unset';
                        messageContainer.textContent = 'Sign in with your credentials.';
                    }
                } else throw new Error(data);
            } catch (error) {
                messageContainer.style.display = 'block';
                messageContainer.textContent = error.message;
            }
        });
    }

    const passwordInput = document.getElementById('password');
    const showPasswordIcon = document.querySelector('.input_password_show');

    showPasswordIcon.addEventListener('click', () => {
        const isPasswordVisible = passwordInput.type === 'text';
        passwordInput.type = isPasswordVisible ? 'password' : 'text';
        showPasswordIcon.innerHTML = isPasswordVisible ?
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle></svg>` :
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-off"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"></path><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"></path><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"></path><path d="m2 2 20 20"></path></svg>`;
    });
}

async function createForm(createFormSection) {
    const existingFormWrapper = document.getElementById('formWrapper');
    if (existingFormWrapper) return;

    const formWrapper = document.createElement('div');
    formWrapper.id = 'formWrapper';

    const backgroundContainer = document.createElement('div');
    backgroundContainer.className = 'background-container';

    const backgroundDotContainer = document.createElement('a');
    backgroundDotContainer.className = 'background-dot-container';

    const backgroundDotContent = document.createElement('div');
    backgroundDotContent.className = 'background-dot-container-content';
    backgroundDotContent.classList.add('custom-width');

    const innerContainer = document.createElement('div');
    innerContainer.className = 'background-container';
    innerContainer.style.display = 'contents';
    innerContainer.id = 'innerContainer';

    backgroundDotContent.appendChild(innerContainer);
    backgroundDotContainer.appendChild(backgroundDotContent);
    backgroundContainer.appendChild(backgroundDotContainer);
    formWrapper.appendChild(backgroundContainer);
    document.body.appendChild(formWrapper);

    createFormSection();
}

async function handleLoggedOutState(retrieveImageFromURL, getFirebaseModules) {
    document.getElementById("userLayoutContainer")?.remove();

    const attachClickListener = (elementId, isSignUp) => {
        const container = document.getElementById(elementId);
        if (!container) return;

        const createFormSection = createSignFormSection.bind(null, isSignUp, retrieveImageFromURL, getFirebaseModules);
        container.addEventListener('click', (event) => {
            event.preventDefault();
            createForm(createFormSection);
        });

        if (isSignUp && new URLSearchParams(window.location.search).get('referral')) {
            createForm(createFormSection);
        }
    };

    attachClickListener("openSignInContainer", false);
    attachClickListener("openSignUpContainer", true);
}

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};

var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function () { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function () { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};

function detectIncognito() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4, new Promise(function (resolve, reject) {
                    var browserName = 'Unknown';
                    function __callback(isPrivate) {
                        resolve({
                            isPrivate: isPrivate,
                            browserName: browserName
                        });
                    }
                    function identifyChromium() {
                        var ua = navigator.userAgent;
                        if (ua.match(/Chrome/)) {
                            if (navigator.brave !== undefined) {
                                return 'Brave';
                            }
                            else if (ua.match(/Edg/)) {
                                return 'Edge';
                            }
                            else if (ua.match(/OPR/)) {
                                return 'Opera';
                            }
                            return 'Chrome';
                        }
                        else {
                            return 'Chromium';
                        }
                    }
                    function assertEvalToString(value) {
                        return value === eval.toString().length;
                    }
                    function isSafari() {
                        var v = navigator.vendor;
                        return (v !== undefined && v.indexOf('Apple') === 0 && assertEvalToString(37));
                    }
                    function isChrome() {
                        var v = navigator.vendor;
                        return (v !== undefined && v.indexOf('Google') === 0 && assertEvalToString(33));
                    }
                    function isFirefox() {
                        return (document.documentElement !== undefined &&
                            document.documentElement.style.MozAppearance !== undefined &&
                            assertEvalToString(37));
                    }
                    function isMSIE() {
                        return (navigator.msSaveBlob !== undefined && assertEvalToString(39));
                    }
                    function newSafariTest() {
                        var tmp_name = String(Math.random());
                        try {
                            var db = window.indexedDB.open(tmp_name, 1);
                            db.onupgradeneeded = function (i) {
                                var _a, _b;
                                var res = (_a = i.target) === null || _a === void 0 ? void 0 : _a.result;
                                try {
                                    res.createObjectStore('test', {
                                        autoIncrement: true
                                    }).put(new Blob());
                                    __callback(false);
                                }
                                catch (e) {
                                    var message = e;
                                    if (e instanceof Error) {
                                        message = (_b = e.message) !== null && _b !== void 0 ? _b : e;
                                    }
                                    if (typeof message !== 'string') {
                                        __callback(false);
                                        return;
                                    }
                                    var matchesExpectedError = message.includes('BlobURLs are not yet supported');
                                    __callback(matchesExpectedError);
                                    return;
                                }
                                finally {
                                    res.close();
                                    window.indexedDB.deleteDatabase(tmp_name);
                                }
                            };
                        }
                        catch (e) {
                            __callback(false);
                        }
                    }
                    function oldSafariTest() {
                        var openDB = window.openDatabase;
                        var storage = window.localStorage;
                        try {
                            openDB(null, null, null, null);
                        }
                        catch (e) {
                            __callback(true);
                            return;
                        }
                        try {
                            storage.setItem('test', '1');
                            storage.removeItem('test');
                        }
                        catch (e) {
                            __callback(true);
                            return;
                        }
                        __callback(false);
                    }
                    function safariPrivateTest() {
                        if (navigator.maxTouchPoints !== undefined) {
                            newSafariTest();
                        }
                        else {
                            oldSafariTest();
                        }
                    }
                    function getQuotaLimit() {
                        var w = window;
                        if (w.performance !== undefined &&
                            w.performance.memory !== undefined &&
                            w.performance.memory.jsHeapSizeLimit !== undefined) {
                            return performance.memory.jsHeapSizeLimit;
                        }
                        return 1073741824;
                    }
                    function storageQuotaChromePrivateTest() {
                        navigator.webkitTemporaryStorage.queryUsageAndQuota(function (_, quota) {
                            var quotaInMib = Math.round(quota / (1024 * 1024));
                            var quotaLimitInMib = Math.round(getQuotaLimit() / (1024 * 1024)) * 2;
                            __callback(quotaInMib < quotaLimitInMib);
                        }, function (e) {
                            reject(new Error('detectIncognito somehow failed to query storage quota: ' +
                                e.message));
                        });
                    }
                    function oldChromePrivateTest() {
                        var fs = window.webkitRequestFileSystem;
                        var success = function () {
                            __callback(false);
                        };
                        var error = function () {
                            __callback(true);
                        };
                        fs(0, 1, success, error);
                    }
                    function chromePrivateTest() {
                        if (self.Promise !== undefined && self.Promise.allSettled !== undefined) {
                            storageQuotaChromePrivateTest();
                        }
                        else {
                            oldChromePrivateTest();
                        }
                    }
                    function firefoxPrivateTest() {
                        __callback(navigator.serviceWorker === undefined);
                    }
                    function msiePrivateTest() {
                        __callback(window.indexedDB === undefined);
                    }
                    function main() {
                        if (isSafari()) {
                            browserName = 'Safari';
                            safariPrivateTest();
                        }
                        else if (isChrome()) {
                            browserName = identifyChromium();
                            chromePrivateTest();
                        }
                        else if (isFirefox()) {
                            browserName = 'Firefox';
                            firefoxPrivateTest();
                        }
                        else if (isMSIE()) {
                            browserName = 'Internet Explorer';
                            msiePrivateTest();
                        }
                        else {
                            reject(new Error('detectIncognito cannot determine the browser'));
                        }
                    }
                    main();
                })];
                case 1: return [2, _a.sent()];
            }
        });
    });
}

function getModeName(userAgent) {
    const browserModes = {
        Chrome: "an Incognito Window",
        Chromium: "an Incognito Window",
        Safari: "a Private Window",
        Firefox: "a Private Window",
        Brave: "a Private Window",
        Opera: "a Private Window",
        Edge: "an InPrivate Window",
        MSIE: "an InPrivate Window"
    };

    for (const [browser, mode] of Object.entries(browserModes)) {
        if (new RegExp(browser).test(userAgent)) {
            return mode;
        }
    }

    return "a Private Window";
}

function createOverlay() {
    if (document.querySelector('.incognito-overlay'))
        return null;

    const overlay = document.createElement('div');
    overlay.classList.add('incognito-overlay');
    overlay.innerHTML = `
            <div class="overlay-content">
                <h2>Incognito Mode</h2>
                <p>This website is not accessible in ${getModeName(navigator.userAgent)} mode.</p>
            </div>
        `;

    document.body.appendChild(overlay);
    return overlay;
}

function removeOverlay() {
    const overlay = document.querySelector('.incognito-overlay');
    if (overlay) {
        overlay.remove();
    }
}

function showIncognitoModeForm() {
    const overlay = createOverlay();
    if (!overlay) return;

    const stopPropagation = (e) => e.stopPropagation();

    overlay.addEventListener('click', stopPropagation);
    overlay.addEventListener('touchstart', stopPropagation);
    overlay.addEventListener('contextmenu', (e) => e.preventDefault());
    overlay.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey || ['F12', 'I', 'J', 'C', 'U'].includes(e.key)) {
            e.preventDefault();
        }
    });
}

let overlayCheckInterval;

function handleIncognito() {
    detectIncognito().then((isIncognito) => {
        if (isIncognito.isPrivate) {
            showIncognitoModeForm();
        } else {
            clearInterval(overlayCheckInterval);
            removeOverlay();
        }
    }).catch((error) => {
        alert('Error checking incognito mode:', error); // Changed console.error to alert
    });
}

export function incognitoModeHandler() {
    const preventShortcuts = (e) => {
        if (!document.querySelector('.incognito-overlay'))
            return;

        if (e.ctrlKey || e.metaKey || ['F12', 'I', 'J', 'C', 'U'].includes(e.key)) {
            e.preventDefault();
        }
    };

    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('keydown', preventShortcuts);

    function checkOverlay() {
        if (!document.querySelector('.incognito-overlay'))
            handleIncognito();
    }

    overlayCheckInterval = setInterval(checkOverlay, 100);

    ['click', 'keypress', 'input', 'touchstart', 'mousemove'].forEach((event) => {
        document.addEventListener(event, checkOverlay);
    });

    checkOverlay();
}

export async function setAuthentication(retrieveImageFromURL, getUserIpAddress, ensureUniqueId, fetchServerAddress, getFirebaseModules, getDocSnapshot) {
    const signOutButtons = document.querySelectorAll('.signOut');
    signOutButtons.forEach(signOut => {
        signOut.addEventListener('click', async function () {
            const { auth, signOut } = await getFirebaseModules();

            localStorage.removeItem('cachedUserData');
            localStorage.removeItem('cachedUserDocument');
            localStorage.removeItem('profileImageBase64');

            try {
                await signOut(auth);
                location.reload();
            } catch (error) {
                console.error('Error during sign out:', error);
            }
        });
    });

    incognitoModeHandler();

    const userData = getCachedStaticUserData();
    if (userData) handleUserLoggedIn(userData, getUserIpAddress, ensureUniqueId, fetchServerAddress, getDocSnapshot, getFirebaseModules);
    else handleLoggedOutState(retrieveImageFromURL, getFirebaseModules);
}

export const ScreenMode = Object.freeze({
    PHONE: 3,
    PC: 1,
});

export function createUserData(sidebar, screenMode) {
    const userData = getCachedStaticUserData();
    const userDoc = getCachedDynamicUserDoc();
    const hasUserData = userData && userDoc;

    const profileLine = document.getElementById("profileLine");
    if (profileLine)
        profileLine.style.display = screenMode === ScreenMode.PHONE ? 'unset' : 'none';

    const userLayoutSideContainer = document.getElementById("userLayoutSideContainer");
    if (userLayoutSideContainer)
        userLayoutSideContainer.style.display = 'none';

    const signContainer = document.getElementById("signContainer");
    if (signContainer)
        signContainer.style.display = 'none';

    if (screenMode === ScreenMode.PHONE) {
        if (hasUserData) {
            if (userLayoutSideContainer) {
                userLayoutSideContainer.style.display = 'flex';
                return;
            }

            sidebar.insertAdjacentHTML('afterbegin', `
                    <li id="userLayoutSideContainer" style="padding: 0;">
                        <a id="userLayout" style="display: flex; gap: calc(1vh * var(--scale-factor-h)); align-items: center;">
                            <img alt="Profile Image" class="profile-image" style="width: calc((6vh* var(--scale-factor-h) + 14vw / 2 * var(--scale-factor-w))); height: calc((6vh* var(--scale-factor-h) + 14vw / 2 * var(--scale-factor-w)));">
                            <div>
                                <p style="white-space: nowrap;">Hello, <span class="username">Username</span></p>
                                <div class="line" style="margin: unset;"></div>
                                <p id="creditsAmount" style="white-space: nowrap;">Open account for credentials</p>
                            </div>
                        </a>
                        <ul class="dropdown-menu">
                            <li><a class="text signOut">Sign Out</a></li>
                        </ul>
                    </li>
                    <div class="line" id="profileLine"></div>
                `);
        }
        else {
            if (signContainer) {
                signContainer.style.display = 'flex';
                return;
            }

            sidebar.insertAdjacentHTML('afterbegin', `
                    <div id="signContainer" style="display: flex; gap: 1vh; flex-direction: row;">
                        <button style="justify-content: center;" id="openSignUpContainer">
                            <svg style="width: 3vh;margin-right: 0.3vh;vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M296.591495 650.911274c-12.739762 0-23.555429 10.629793-23.555429 23.766886 0 13.226033 10.558841 23.757892 23.555429 23.757892l428.151713 0c12.764346 0 23.579013-10.620799 23.579013-23.757892 0-13.232029-10.531859-23.766886-23.579013-23.766886L296.591495 650.911274zM724.743208 532.090235l-428.151713 0c-12.739762 0-23.555429 10.630792-23.555429 23.768885 0 13.222035 10.558841 23.757892 23.555429 23.757892l428.151713 0c12.764346 0 23.579013-10.629793 23.579013-23.757892C748.322222 542.627091 737.790362 532.090235 724.743208 532.090235zM296.728402 460.793774l166.485723 0c13.090125 0 23.694935-10.646781 23.694935-23.771883 0-13.218438-10.60481-23.762889-23.694935-23.762889l-166.485723 0c-13.086128 0-23.692337 10.642784-23.692337 23.762889C273.036066 450.240929 283.642474 460.793774 296.728402 460.793774zM655.311483 270.894925c0 12.820708 10.630792 23.545036 23.741903 23.545036l19.717631 0c13.206046 0 23.741903-10.535857 23.741903-23.545036L722.51292 175.40047c0-12.823306-10.629793-23.545036-23.741903-23.545036l-19.717631 0c-13.205047 0-23.741903 10.537256-23.741903 23.545036L655.311483 270.894925zM298.847565 270.894925c0 12.820708 10.629793 23.545036 23.738905 23.545036l19.718031 0c13.229031 0 23.741303-10.535857 23.741303-23.545036L366.045805 175.40047c0-12.823306-10.629793-23.545036-23.741303-23.545036l-19.718031 0c-13.226432 0-23.738905 10.537256-23.738905 23.545036L298.847565 270.894925zM843.331405 199.38361l-71.242498 0 0 61.060401 57.759839 0 0 543.285253L191.512139 803.729264 191.512139 260.444011l57.760638 0L249.272777 199.38361 178.028681 199.38361c-26.433078 0-47.577143 21.186635-47.577143 37.087255l0 570.740038c0 36.173474 21.280972 57.574764 47.577143 57.574764l665.302725 0c26.458061 0 47.576543-21.207421 47.576543-57.574764L890.907948 236.470865C890.908148 220.767112 869.601594 199.38361 843.331405 199.38361zM415.616996 199.38361 605.739293 199.38361l0 61.060401-190.122097 0L415.617196 199.38361zM744.23899 346.039777c-9.332672-9.342066-24.297526-9.294698-33.553251-0.042971l-83.874933 83.856945-34.807401-34.845775c-9.286704-9.273113-24.276541-9.342066-33.609213 0.007995-9.278709 9.273113-9.373645 24.250958-0.017988 33.605615l49.010571 48.99778c0.72251 1.000722 1.531961 1.951677 2.43435 2.859461 9.334671 9.327676 24.299525 9.286104 33.558048 0.042971l100.907385-100.923774C753.42776 370.466216 753.520697 355.321484 744.23899 346.039777z"/></svg>
                            Sign Up
                        </button>
                        <button style="justify-content: center;" class="important" id="openSignInContainer">
                            <svg style="width: 3vh;margin-right: 0.1vh;vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M426.666667 736V597.333333H128v-170.666666h298.666667V288L650.666667 512 426.666667 736M341.333333 85.333333h384a85.333333 85.333333 0 0 1 85.333334 85.333334v682.666666a85.333333 85.333333 0 0 1-85.333334 85.333334H341.333333a85.333333 85.333333 0 0 1-85.333333-85.333334v-170.666666h85.333333v170.666666h384V170.666667H341.333333v170.666666H256V170.666667a85.333333 85.333333 0 0 1 85.333333-85.333334z" fill="" /></svg>
                            Sign In
                        </button>
                    </div>
                    <div class="line" id="profileLine"></div>
                `);
        }
    }
}

function createSideBarData(sidebar) {
    const exploreButton = document.getElementById("exploreButton");
    if (!exploreButton) {
        let sideBar = `
				<div style="flex: 1; justify-content: space-between;">
                    <div style="display: flex;gap: 1vh;">
                        <a class="button" id="exploreButton" href=".">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 0C5.38318 0 0 5.38318 0 12C0 18.6168 5.38318 24 12 24C18.6164 24 23.9992 18.6168 23.9992 12C23.9992 5.38318 18.6164 0 12 0ZM17.9313 6.83591L14.1309 13.8977C14.0788 13.9945 13.9995 14.0742 13.9023 14.1264L6.84094 17.9263C6.75694 17.9714 6.66559 17.9932 6.57463 17.9932C6.42889 17.9932 6.28489 17.9369 6.1767 17.8285C6.00097 17.653 5.96129 17.3828 6.07896 17.1641L9.87858 10.1029C9.93084 10.0059 10.0104 9.9262 10.1074 9.87413L17.1695 6.07413C17.3882 5.95626 17.658 5.99613 17.8339 6.17167C18.0093 6.34741 18.0494 6.61721 17.9313 6.83591Z" fill="white"/>
                                <path d="M12.0136 10.6924C11.2898 10.6924 10.7031 11.2784 10.7031 12.0023C10.7031 12.7259 11.2899 13.3129 12.0136 13.3129C12.7367 13.3129 13.3235 12.7259 13.3235 12.0023C13.3235 11.2784 12.7367 10.6924 12.0136 10.6924Z" fill="white"/>
                            </svg>
                            Explore
                        </a>
                        <a class="button" id="profileButton" href="profile">
                            <svg viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M6.95279 0.554203C7.03413 0.600771 7.09797 0.674016 7.13412 0.762255C7.17027 0.850494 7.17664 0.948642 7.15223 1.04104L6.04556 5.21405H10.0834C10.1646 5.21405 10.244 5.23846 10.3119 5.28427C10.3798 5.33008 10.4332 5.3953 10.4655 5.47191C10.4979 5.54851 10.5077 5.63317 10.4939 5.71547C10.4801 5.79778 10.4432 5.87414 10.3878 5.93516L4.55444 12.3635C4.4909 12.4337 4.40632 12.4799 4.31423 12.4948C4.22214 12.5097 4.12785 12.4924 4.04645 12.4457C3.96504 12.3989 3.90123 12.3255 3.86521 12.237C3.82919 12.1486 3.82305 12.0503 3.84777 11.9578L4.95444 7.78539H0.916643C0.835442 7.78538 0.756011 7.76097 0.688116 7.71516C0.620221 7.66935 0.56682 7.60413 0.534478 7.52752C0.502135 7.45092 0.492261 7.36626 0.506068 7.28396C0.519876 7.20166 0.556763 7.1253 0.612197 7.06427L6.44556 0.635914C6.5091 0.566 6.59356 0.519971 6.68548 0.505163C6.77741 0.490354 6.87151 0.507618 6.95279 0.554203Z" fill="white"/>
                            </svg>
                            Profile
                        </a>
                        <a class="button important disabled" id="premiumButton" href="pricing">
                            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path id="Vector" d="M15.8533 5.76333L12.1773 2.08733C12.0843 1.99433 11.9588 1.94183 11.8278 1.94083L4.23825 1.88283C4.10425 1.88183 3.97575 1.93433 3.88075 2.02933L0.14625 5.76383C-0.04875 5.95933 -0.04875 6.27533 0.14625 6.47083L7.64625 13.9708C7.84175 14.1663 8.15825 14.1663 8.35325 13.9708L15.8533 6.47083C16.0488 6.27533 16.0488 5.95883 15.8533 5.76333ZM12.9533 6.47433L9.37725 10.0858C9.18275 10.2823 8.86625 10.2838 8.66975 10.0893C8.47325 9.89483 8.47175 9.57833 8.66625 9.38183L11.9038 6.11333L10.8098 4.94733C10.6183 4.74883 10.6243 4.43183 10.8233 4.24033C10.9203 4.14633 11.0513 4.09683 11.1858 4.10083C11.3208 4.10483 11.4483 4.16333 11.5393 4.26283L12.9633 5.78133C13.1463 5.97733 13.1423 6.28333 12.9533 6.47433Z" fill="white"/>
                            </svg>
                            Premium
                        </a>
                    </div>
                    <div class="line" style="margin: 0;"></div>
                    <div style="display: flex;gap: 1vh;">
                        <a class="button" id="faceSwapButton" href="face-swap">
                            <svg style="fill: currentColor;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M848 64h-84c-7.2 0-14.3 2.7-19.8 8.2-5.5 5.5-8.2 12.6-8.2 19.8 0 7.2 2.7 14.3 8.2 19.8 5.5 5.5 12.6 8.2 19.8 8.2h84v84c0 7.2 2.7 14.3 8.2 19.8 5.5 5.5 12.6 8.2 19.8 8.2s14.3-2.7 19.8-8.2c5.5-5.5 8.2-12.6 8.2-19.8v-84c0-30.9-25.1-56-56-56zM876 512c-7.2 0-14.3 2.7-19.8 8.2-5.5 5.5-8.2 12.6-8.2 19.8v84h-84c-7.2 0-14.3 2.7-19.8 8.2-1.5 1.5-2.3 3.4-3.4 5.2-31.6-30.4-67.1-55.4-106.4-72C714.2 517.7 764.7 426 749.2 323c-14.6-96.7-89.6-177.5-185.3-197.5-17.6-3.7-35-5.4-51.9-5.4-132.6 0-240 107.4-240 240 0 87.6 47.5 163.5 117.6 205.4-39.2 16.6-74.8 41.6-106.4 72-1.1-1.8-1.9-3.7-3.4-5.2-5.5-5.5-12.6-8.2-19.8-8.2h-84v-84c0-7.2-2.7-14.3-8.2-19.8-5.5-5.5-12.6-8.2-19.8-8.2s-14.3 2.7-19.8 8.2c-5.5 5.5-8.2 12.6-8.2 19.8v84c0 30.9 25.1 56 56 56h69c-46.8 60.6-79.3 136.5-89.5 221.3-3.8 31.2 21.1 58.7 52.5 58.7h608c31.4 0 56.2-27.6 52.5-58.7-10.2-84.9-42.7-160.8-89.5-221.4h69c30.9 0 56-25.1 56-56v-84c0-7.2-2.7-14.3-8.2-19.8-5.5-5.5-12.6-8.2-19.8-8.2zM211.5 905c16.9-132.8 93.3-242.9 199.9-288 19.4-8.2 32.6-26.7 34.1-47.7 1.5-21.1-9-41.1-27.2-52C361.8 483.6 328 424.7 328 360c0-101.5 82.5-184 184-184 13.4 0 27 1.4 40.4 4.3 72.1 15.1 130.3 77.2 141.4 151.1 11.4 75.5-22.4 146.8-88.2 186-18.1 10.8-28.6 30.9-27.2 52 1.5 21.1 14.6 39.5 34.1 47.7C719 661.9 795.3 771.7 812.4 904l-600.9 1zM148 232c7.2 0 14.3-2.7 19.8-8.2 5.5-5.5 8.2-12.6 8.2-19.8v-84h84c7.2 0 14.3-2.7 19.8-8.2 5.5-5.5 8.2-12.6 8.2-19.8 0-7.2-2.7-14.3-8.2-19.8-5.5-5.5-12.6-8.2-19.8-8.2h-84c-30.9 0-56 25.1-56 56v84c0 7.2 2.7 14.3 8.2 19.8 5.5 5.5 12.6 8.2 19.8 8.2z" fill="white"/></svg>
                            Face Swap
                        </a>
                        <a class="button disabled" id="inpaintButton" href="inpaint">
                            <svg style="fill: currentColor;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M991.776 535.2c0-25.632-9.984-49.76-28.064-67.872L588.992 92.128c-36.256-36.288-99.488-36.288-135.744-0.032L317.408 227.808c-37.408 37.408-37.44 98.336-0.032 135.776l374.656 375.136c18.144 18.144 42.24 28.128 67.936 28.128 25.632 0 49.728-9.984 67.84-28.096l35.328-35.296 26.112 26.144c12.512 12.512 12.512 32.768 1.856 43.584l-95.904 82.048c-12.448 12.544-32.736 12.48-45.248 0l-245.536-245.824 0 0-3.2-3.2c-37.44-37.408-98.336-37.472-135.744-0.096l-9.632 9.632L294.4 554.336c-6.24-6.24-14.432-9.376-22.624-9.376-8.192 0-16.384 3.136-22.656 9.376 0 0 0 0.032-0.032 0.032l-22.56 22.56c0 0 0 0 0 0l-135.872 135.712c-37.408 37.408-37.44 98.304-0.032 135.776l113.12 113.184c18.688 18.688 43.296 28.064 67.872 28.064 24.576 0 49.152-9.344 67.904-28.032l135.808-135.712c0.032-0.032 0.032-0.096 0.064-0.128l22.528-22.496c6.016-6.016 9.376-14.112 9.376-22.624 0-8.48-3.36-16.64-9.344-22.624l-96.896-96.96 9.6-9.6c12.48-12.544 32.768-12.48 45.248 0.032l0-0.032 3.2 3.2 0 0.032 245.568 245.856c18.944 18.912 43.872 28.256 68.544 28.256 24.032 0 47.808-8.896 65.376-26.56l95.904-82.048c37.44-37.408 37.472-98.336 0.032-135.808l-26.112-26.112 55.232-55.168C981.76 584.928 991.776 560.832 991.776 535.2zM362.144 848.544c-0.032 0.032-0.032 0.096-0.064 0.128l-67.776 67.712c-12.48 12.416-32.864 12.448-45.312 0L135.904 803.2c-12.48-12.48-12.48-32.768 0-45.28l67.904-67.84 0 0 67.936-67.84 158.336 158.432L362.144 848.544zM918.368 557.824l-135.808 135.68c-12.064 12.096-33.152 12.096-45.216-0.032L362.656 318.368c-12.48-12.512-12.48-32.8 0-45.28l135.84-135.712C504.544 131.328 512.576 128 521.12 128s16.608 3.328 22.624 9.344l374.688 375.2c6.016 6.016 9.344 14.048 9.344 22.592C927.776 543.712 924.448 551.744 918.368 557.824z" fill="white"/><path d="M544.448 186.72c-12.352-12.672-32.64-12.832-45.248-0.48-12.64 12.384-12.832 32.64-0.48 45.248l322.592 329.216c6.24 6.368 14.528 9.6 22.848 9.6 8.096 0 16.16-3.04 22.4-9.152 12.64-12.352 12.8-32.608 0.448-45.248L544.448 186.72z" fill="white"/></svg>
                            Inpaint
                        </a>
                        <a class="button disabled" id="artGeneratorButton" href="art-generator">
                            <svg style="fill: currentColor;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M512 1024C229.888 1024 0 794.112 0 512S229.888 0 512 0s512 229.888 512 512c0 104.96-44.544 180.736-132.096 225.28-52.736 26.624-109.056 29.696-159.232 31.744-60.928 3.072-99.328 6.144-117.76 37.376-13.312 22.528-3.584 41.984 12.8 71.68 15.36 27.136 36.352 65.024 7.168 100.352-33.28 40.448-82.944 45.568-122.88 45.568z m0-970.24c-252.928 0-458.24 205.824-458.24 458.24s205.824 458.24 458.24 458.24c41.984 0 66.56-7.68 81.408-26.112 5.12-6.144 2.56-13.312-12.288-40.448-16.384-29.696-41.472-74.752-12.288-124.928 33.792-57.856 98.304-60.928 161.28-63.488 46.592-2.048 94.72-4.608 137.216-26.112 69.12-35.328 102.912-93.184 102.912-177.664 0-252.416-205.312-457.728-458.24-457.728z" fill="white" /><path d="M214.016 455.68m-70.144 0a70.144 70.144 0 1 0 140.288 0 70.144 70.144 0 1 0-140.288 0Z" fill="white" /><path d="M384 244.736m-70.144 0a70.144 70.144 0 1 0 140.288 0 70.144 70.144 0 1 0-140.288 0Z" fill="white" /><path d="M645.12 229.376m-70.144 0a70.144 70.144 0 1 0 140.288 0 70.144 70.144 0 1 0-140.288 0Z" fill="white" /><path d="M804.352 426.496m-70.144 0a70.144 70.144 0 1 0 140.288 0 70.144 70.144 0 1 0-140.288 0Z" fill="white"/></svg>
                            Art Generator
                        </a>
                    </div>
                    <div class="line" style="margin: 0;"></div>
                    <div style="display: flex;gap: 1vh;">
						<a class="button" id="discordButton" translate="no" href="https://discord.gg/VvHAj2eBCS" target="_blank">
							<svg  viewBox="0 0 127.14 96.36" xmlns="http://www.w3.org/2000/svg">
								<path class="cls-1" d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" fill="white"/>
							</svg>
							Discord
						</a>
						<a class="button" id="twitterButton" translate="no" href="https://x.com/zeroduri" target="_blank" >
							<svg  viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path id="Vector" d="M14.7339 10.1623L23.4764 0H21.4047L13.8136 8.82385L7.7507 0H0.757812L9.92616 13.3432L0.757812 24H2.82961L10.846 14.6817L17.2489 24H24.2418L14.7334 10.1623H14.7339ZM3.57609 1.55963H6.75823L21.4056 22.5113H18.2235L3.57609 1.55963Z" fill="white"/>
							</svg>
							X
						</a>
						<a class="button" id="redditButton" translate="no" href="https://www.reddit.com/r/bodyswapai/" target="_blank">
							<svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 24 24"><path d="M14.238 15.348c.085.084.085.221 0 .306-.465.462-1.194.687-2.231.687l-.008-.002-.008.002c-1.036 0-1.766-.225-2.231-.688-.085-.084-.085-.221 0-.305.084-.084.222-.084.307 0 .379.377 1.008.561 1.924.561l.008.002.008-.002c.915 0 1.544-.184 1.924-.561.085-.084.223-.084.307 0zm-3.44-2.418c0-.507-.414-.919-.922-.919-.509 0-.923.412-.923.919 0 .506.414.918.923.918.508.001.922-.411.922-.918zm13.202-.93c0 6.627-5.373 12-12 12s-12-5.373-12-12 5.373-12 12-12 12 5.373 12 12zm-5-.129c0-.851-.695-1.543-1.55-1.543-.417 0-.795.167-1.074.435-1.056-.695-2.485-1.137-4.066-1.194l.865-2.724 2.343.549-.003.034c0 .696.569 1.262 1.268 1.262.699 0 1.267-.566 1.267-1.262s-.568-1.262-1.267-1.262c-.537 0-.994.335-1.179.804l-2.525-.592c-.11-.027-.223.037-.257.145l-.965 3.038c-1.656.02-3.155.466-4.258 1.181-.277-.255-.644-.415-1.05-.415-.854.001-1.549.693-1.549 1.544 0 .566.311 1.056.768 1.325-.03.164-.05.331-.05.5 0 2.281 2.805 4.137 6.253 4.137s6.253-1.856 6.253-4.137c0-.16-.017-.317-.044-.472.486-.261.82-.766.82-1.353zm-4.872.141c-.509 0-.922.412-.922.919 0 .506.414.918.922.918s.922-.412.922-.918c0-.507-.413-.919-.922-.919z" fill="white"/></svg>
							Reddit
						</a>
					</div>
				</div>
				`;

        sidebar.insertAdjacentHTML('beforeend', sideBar);
    }
}

export function loadPageContent(setUser, retrieveImageFromURL, getUserIpAddress, ensureUniqueId, fetchServerAddress, getFirebaseModules, getDocSnapshot, getScreenMode, getCurrentMain, updateContent, createPages, setNavbar, setSidebar, showSidebar, removeSidebar, getSidebarActive, moveMains, setupMainSize, loadScrollingAndMain, showZoomIndicator, setScaleFactors, clamp, setAuthentication, updateMainContent, savePageState = null) {
    let previousScreenMode = null, cleanupEvents = null, cleanPages = null, reconstructMainStyles = null;
    let screenMode = getScreenMode();

    if (!localStorage.getItem('sidebarStateInitialized') && screenMode !== 1) {
        localStorage.setItem('sidebarState', 'keepSideBar');

        let sidebarImages = document.querySelectorAll('.sidebar img');
        sidebarImages.forEach(image => {
            image.setAttribute('loading', 'lazy');
        });

        localStorage.setItem('sidebarStateInitialized', 'true');
    }

    document.body.insertAdjacentHTML('afterbegin', `
				<nav class="navbar">
					<div class="container">
						<div class="logo">
							<img onclick="location.href='.'" style="cursor: pointer;" alt="DeepAny.AI Logo" width="6.5vh" height="auto" loading="eager">
							<h2 onclick="location.href='.'" style="cursor: pointer;" translate="no">DeepAny.<span class="text-gradient" translate="no">AI</span></h2>
						</div>
					</div>
				</nav>
				<nav class="sidebar"></nav>
			`);

    function updateAspectRatio(screenMode) { document.documentElement.classList.toggle('ar-4-3', screenMode !== 1); }
    updateAspectRatio(screenMode);

    let hamburgerMenu = document.querySelector('.hamburger-menu');
    let navLinks = document.querySelectorAll('.navbar .nav-links');
    let navContainer = document.querySelector('.navbar .container');

    let navbar = document.querySelector('.navbar');
    let sidebar = document.querySelector('.sidebar');

    let scaleFactorHeight = parseFloat(localStorage.getItem('scaleFactorHeight')) || 0.5;
    let scaleFactorWidth = parseFloat(localStorage.getItem('scaleFactorWidth')) || 0.5;
    setScaleFactors(scaleFactorHeight, scaleFactorWidth);

    window.addEventListener('wheel', function (event) {
        if (event.ctrlKey) {
            event.preventDefault();

            scaleFactorHeight = clamp(scaleFactorHeight + (event.deltaY < 0 ? 0.05 : -0.05), 0.1, 1);
            scaleFactorWidth = clamp(scaleFactorWidth + (event.deltaY < 0 ? 0.05 : -0.05), 0.1, 1);
            setScaleFactors(scaleFactorHeight, scaleFactorWidth);
            localStorage.setItem('scaleFactorHeight', scaleFactorHeight);
            localStorage.setItem('scaleFactorWidth', scaleFactorWidth);

            showZoomIndicator(event, scaleFactorHeight, scaleFactorWidth);
            setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 100);
        }
    }, { passive: false });

    let pageUpdated = false;
    let pageContent = [];
    let mainQuery = document.querySelectorAll('main');

    async function sizeBasedElements() {
        setScaleFactors(scaleFactorHeight, scaleFactorWidth);
        mainQuery = document.querySelectorAll('main');
        sidebar = document.querySelector('.sidebar');
        navbar = document.querySelector('.navbar');
        hamburgerMenu = document.querySelector('.hamburger-menu');

        setTimeout(() => {
            setNavbar(navbar, mainQuery, sidebar);
            setSidebar(sidebar);
            setupMainSize(mainQuery);
            moveMains(mainQuery, getCurrentMain());
        }, 1);

        screenMode = getScreenMode();
        const shouldUpdate = previousScreenMode !== screenMode;
        previousScreenMode = screenMode;
        if (!shouldUpdate)
            return;

        if (pageUpdated) {
            const elements = document.querySelectorAll('*');
            elements.forEach(element => {
                const oldTransition = element.style.transition;
                element.style.transition = 'unset';

                setTimeout(() => {
                    element.style.transition = oldTransition;
                }, 1);
            });
        }

        updateAspectRatio(screenMode);

        if (screenMode !== 1) {
            if (navLinks && navLinks.length > 0) {
                navLinks.forEach(navLink => navLink.remove());
                navLinks = null;
            }
            if (!hamburgerMenu) {
                navContainer.insertAdjacentHTML('beforeend', `
			        <div id="menu-container" style="display: flex;gap: 2vw;">
				        <div class="indicator" style="margin-bottom: 0;">
					        <button class="zoom-minus" translate="no">-</button>
					        <button class="zoom-plus" translate="no">+</button>
				        </div>
				        <div class="hamburger-menu">
					        <div class="line"></div>
					        <div class="line"></div>
					        <div class="line"></div>
				        </div>
			        </div>
		        `);

                const menuContainer = document.getElementById('menu-container');
                hamburgerMenu = menuContainer.querySelector('.hamburger-menu');
                hamburgerMenu.addEventListener('click', function () {
                    getSidebarActive() ? removeSidebar(sidebar, hamburgerMenu) : showSidebar(sidebar, hamburgerMenu, setUser);
                });

                menuContainer.querySelector('.zoom-minus').onclick = () => {
                    scaleFactorHeight = clamp((scaleFactorHeight || 1) - 0.05, 0.1, 1);
                    scaleFactorWidth = clamp((scaleFactorWidth || 1) - 0.05, 0.1, 1);
                    setScaleFactors(scaleFactorHeight, scaleFactorWidth);
                    localStorage.setItem('scaleFactorHeight', scaleFactorHeight);
                    localStorage.setItem('scaleFactorWidth', scaleFactorWidth);
                    showZoomIndicator(`${Math.round(scaleFactorHeight * 100)}%`, scaleFactorHeight, scaleFactorWidth);
                    setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 100);
                };

                menuContainer.querySelector('.zoom-plus').onclick = () => {
                    scaleFactorHeight = clamp((scaleFactorHeight || 1) + 0.05, 0.1, 1);
                    scaleFactorWidth = clamp((scaleFactorWidth || 1) + 0.05, 0.1, 1);
                    setScaleFactors(scaleFactorHeight, scaleFactorWidth);
                    localStorage.setItem('scaleFactorHeight', scaleFactorHeight);
                    localStorage.setItem('scaleFactorWidth', scaleFactorWidth);
                    showZoomIndicator(`${Math.round(scaleFactorHeight * 100)}%`, scaleFactorHeight, scaleFactorWidth);
                    setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 100);
                };
            }
        } else {
            const menuContainer = document.getElementById('menu-container');
            if (menuContainer) {
                menuContainer.remove();
            }
            if (!navLinks || navLinks.length === 0) {
                navContainer.insertAdjacentHTML('beforeend', `
					<ul class="nav-links" style="display: grid;grid-template-columns: 2fr 1fr 2fr;justify-items: center;">
						<li>
							<a class="text" href="#">Services</a>
							<ul class="dropdown-menu">
								<li><a class="text" href="face-swap">Face Swap</a></li>
								<li><a class="text" href="inpaint">Inpaint</a></li>
								<li><a class="text" href="art-generator">Art Generator</a></li>
							</ul>
						</li>
						<li>
							<a class="text" href="#">Community</a>
							<ul class="dropdown-menu">
								<li><a class="text" href="https://x.com/zeroduri" target="_blank" translate="no">X</a></li>
								<li><a class="text" href="https://discord.com/invite/Vrmt8UfDK8" target="_blank" translate="no">Discord</a></li>
								<li><a class="text" href="https://www.reddit.com/r/bodyswapai/" target="_blank" translate="no">Reddit</a></li>
							</ul>
						</li>
						<li class="disabled"><a class="text disabled" href="pricing">Pricing</a></li>
					</ul>
					<div class="nav-links" style="display: flex;justify-content: center;gap: calc(1vh * var(--scale-factor-h));">
						<button id="openSignUpContainer">Sign Up</button>
						<button class="important" id="openSignInContainer">Sign In</button>
						<li id="userLayoutContainer">
							<a id="userLayout" style="display: flex;gap: calc(1vh * var(--scale-factor-h));align-items: center;">
								<img alt="Profile Image" class="profile-image" style="width: calc((6vh* var(--scale-factor-h) + 14vw / 2 * var(--scale-factor-w)));height: calc((6vh* var(--scale-factor-h) + 14vw / 2 * var(--scale-factor-w)));">
								<div>
									<p style="white-space: nowrap;">Hello, <span class="username">Username</span></p>
									<div class="line" style="margin: unset;"></div>
									<p id="creditsAmount" style="white-space: nowrap;">Open account for credentials</p>
								</div>
							</a>
							<ul class="dropdown-menu">
								<li><a class="text" href="profile">Profile</a></li>
								<li><a class="text signOut">Sign Out</a></li>
							</ul>
						</li>
					</div>
				`);
                navLinks = document.querySelectorAll('.navbar .nav-links');
            }
        }

        if (savePageState)
            savePageState();

        const oldContentLength = pageContent.length;
        updateMainContent(screenMode, pageContent);
        const currentContentLength = pageContent.length;

        if (oldContentLength !== currentContentLength) {
            if (oldContentLength > 0) {
                if (!cleanPages) {
                    const { cleanPages } = await import('../defaultPageLoads/accessVariables.js');
                    cleanPages(pageContent);
                } else cleanPages(pageContent);
            }
            createPages(pageContent);
            if (oldContentLength > 0) {
                if (!reconstructMainStyles) {
                    const { reconstructMainStyles } = await import('../defaultPageLoads/accessVariables.js');
                    reconstructMainStyles(pageContent);
                } else reconstructMainStyles(pageContent);
            }
        }

        updateContent(pageContent);

        mainQuery = document.querySelectorAll('main');
        sidebar = document.querySelector('.sidebar');
        navbar = document.querySelector('.navbar');
        hamburgerMenu = document.querySelector('.hamburger-menu');

        createUserData(sidebar, screenMode);
        setAuthentication(retrieveImageFromURL, getUserIpAddress, ensureUniqueId, fetchServerAddress, getFirebaseModules, getDocSnapshot);

        setNavbar(navbar, mainQuery, sidebar);
        setSidebar(sidebar);
        setupMainSize(mainQuery);
        moveMains(mainQuery, getCurrentMain());

        if (cleanupEvents)
            cleanupEvents();

        cleanupEvents = loadScrollingAndMain(navbar, mainQuery, sidebar, hamburgerMenu, setUser);
    }

    const sidebarState = localStorage.getItem('sidebarState');
    if (sidebarState === 'keepSideBar')
        removeSidebar(sidebar, hamburgerMenu);
    else {
        if (screenMode !== 1) {
            setNavbar(navbar, mainQuery, sidebar);
            setSidebar(sidebar);
        }

        showSidebar(sidebar, hamburgerMenu, setUser);
    }

    sizeBasedElements();

    window.addEventListener('resize', sizeBasedElements);

    if (sidebarState === 'removeSidebar') {
        removeSidebar(sidebar, hamburgerMenu);
        localStorage.setItem('sidebarState', 'keepSideBar');
    }

    function handleButtonClick(event) {
        const button = event.currentTarget;
        button.classList.add('button-click-animation');

        if (button.textContent.trim() === 'Copy')
            button.textContent = 'Copied';

        setTimeout(() => {
            button.classList.remove('button-click-animation');
            if (button.textContent.trim() === 'Copied')
                button.textContent = 'Copy';
        }, 500);
    }

    const buttons = document.querySelectorAll('button, a.button');
    buttons.forEach(button => { button.addEventListener('click', handleButtonClick); });

    document.body.classList.add('no-animation');

    setTimeout(() => {
        document.body.classList.remove('no-animation');
    }, 0);

    const link = document.getElementById('loading-stylesheet');
    if (link)
        link.parentNode.removeChild(link);

    document.documentElement.classList.remove('loading-screen');
    pageUpdated = true;
}

let currentMain = 0;
let windowHeight = window.innerHeight;
let windowWidth = window.innerWidth;
let aspectRatio = windowHeight / windowWidth;
let sidebarActive = true;
let navbarActive = true;
let actualNavbarHeight = 0;
let navbarHeight = 0;

export function dispatchEvent(event) {
    window.dispatchEvent(new Event(event));
}

export function getScreenMode() {
    const aspectRatio = getAspectRatio();
    if (aspectRatio < 4 / 5) return ScreenMode.PHONE;
    if (aspectRatio <= 4 / 3) return ScreenMode.PC;
    return ScreenMode.PC;
}

export function setCurrentMain(value) {
    currentMain = value;
}

export function getCurrentMain() {
    return currentMain;
}

export function setWindowHeight(value) {
    windowHeight = value;
}

export function getWindowHeight() {
    return windowHeight;
}

export function setWindowWidth(value) {
    windowWidth = value;
}

export function getWindowWidth() {
    return windowWidth;
}

export function setAspectRatio() {
    if (windowHeight != window.innerHeight || windowWidth != window.innerWidth || aspectRatio != window.innerWidth / window.innerHeight) {
        setWindowHeight(window.innerHeight);
        setWindowWidth(window.innerWidth);
        aspectRatio = getWindowWidth() / getWindowHeight();
    }
}

export function getAspectRatio() {
    setAspectRatio();
    return aspectRatio;
}

export function setSidebarActive(value) {
    sidebarActive = value;
}

export function getSidebarActive() {
    return sidebarActive;
}

export function setNavbarActive(value) {
    navbarActive = value;
}

export function getNavbarActive() {
    return navbarActive;
}

export function setActualNavbarHeight(value) {
    actualNavbarHeight = value;
}

export function getActualNavbarHeight() {
    return actualNavbarHeight;
}

export function setNavbarHeight(value) {
    navbarHeight = value;
}

export function getNavbarHeight() {
    return navbarHeight;
}

export function setSidebar(sidebar) {
    const type = getScreenMode() !== 1 ? 2 : 0; /* 0 = to right, 1 = to left, 2 = to bottom */
    if (type === 2) {
        if (getSidebarActive()) {
            sidebar.style.right = '0';
            sidebar.style.left = '0';
            sidebar.style.top = navbarHeight + "px";
            return;
        }

        if (sidebar) {
            sidebar.style.right = '0';
            sidebar.style.left = '0';
            sidebar.style.top = -getWindowHeight() + "px";
        }
    }
    else if (type === 1) {
        if (getSidebarActive()) {
            sidebar.style.right = '0';
            return;
        }

        if (sidebar)
            sidebar.style.right = -sidebar.offsetWidth + "px";
    }
    else if (type === 0) {
        if (getSidebarActive()) {
            sidebar.style.left = '0';
            return;
        }

        if (sidebar)
            sidebar.style.left = -sidebar.offsetWidth + 'px';
    }
}

export function moveMains(mains, currentMain) {
    if (mains && mains.length > 0) {
        mains.forEach((main, i) => {
            const offset = (i - Math.min(mains.length - 1, currentMain)) * getWindowHeight();
            main.style.top = `${offset + getNavbarHeight()}px`;
            main.style.height = `${getWindowHeight() - getNavbarHeight()}px`;
            main.style.width = `${getWindowWidth()}px`;
        });
    }
}

export function reconstructMainStyles() {
    let mains = document.querySelectorAll('main');
    if (mains && mains.length > 0) {
        mains.forEach((main, i) => {
            main.style.display = 'grid';
            main.style.top = `${i * getWindowHeight() + getNavbarHeight()}px`;
            main.style.height = `${getWindowHeight() - getNavbarHeight()}px`;
            main.style.width = `${getWindowWidth()}px`;
        });
    }
}

export function setNavbar(navbar, mains, sidebar) {
    setActualNavbarHeight(navbar ? navbar.offsetHeight : 0);
    setNavbarHeight(getNavbarActive() ? navbar.offsetHeight : 0);
    moveMains(mains, currentMain);

    if (getNavbarActive()) {
        navbar.style.top = '0';

        if (sidebar) {
            if (getScreenMode() === ScreenMode.PC)
                sidebar.style.top = `${getNavbarHeight()}px`;
            sidebar.style.height = `${getWindowHeight() - getNavbarHeight()}px`;
        }
    }
    else {
        if (navbar) {
            navbar.style.top = -navbar.offsetHeight + "px";
        }

        if (sidebar) {
            sidebar.style.height = '100vh';
        }
    }
}

let previousScreenMode = 0;

export function showSidebar(sidebar, hamburgerMenu, setUser) {
    setSidebarActive(sidebar);
    setSidebar(sidebar);

    if (hamburgerMenu)
        hamburgerMenu.classList.add('open');

    localStorage.removeItem('sidebarState');

    function loadSideBar() {
        const screenMode = getScreenMode();
        const shouldUpdate = previousScreenMode !== screenMode;
        previousScreenMode = screenMode;
        if (!shouldUpdate)
            return;

        createUserData(sidebar, screenMode);
        createSideBarData(sidebar);

        ['exploreButton', 'profileButton', 'premiumButton', 'faceSwapButton', 'inpaintButton', 'artGeneratorButton', 'userLayout'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', () => localStorage.setItem('sidebarState', 'removeSidebar'));
            }
        });

        if (screenMode === ScreenMode.PHONE)
            setUser();
    }

    loadSideBar();

    if (!window.hasResizeEventListener) {
        window.addEventListener('resize', loadSideBar);
        window.hasResizeEventListener = true;
    }
}

export function showNavbar(navbar, mains, sidebar) {
    setNavbarActive(navbar);
    setNavbar(navbar, mains, sidebar);
    setSidebar(sidebar);
}

export function removeSidebar(sidebar, hamburgerMenu) {
    setSidebarActive(false);
    setSidebar(sidebar);

    if (hamburgerMenu)
        hamburgerMenu.classList.remove('open');

    localStorage.setItem('sidebarState', 'keepSideBar');
    // TODO: Remove side bar elements when animation is over and allow recreation!
}

export function removeNavbar(navbar, mains, sidebar) {
    setNavbarActive(false);
    setNavbar(navbar, mains, sidebar);
    setSidebar(sidebar);
}

export function cleanPages() {
    document.querySelectorAll('main').forEach(main => main.remove());
    document.querySelectorAll('.faded-content').forEach(fadedContent => fadedContent.remove());
}

export function createPages(contents) {
    const numberOfPages = contents.length;
    if (numberOfPages <= 0) return;

    for (let id = 0; id < numberOfPages; id++) {
        const mainElement = document.createElement('main');
        const mainContainer = document.createElement('div');
        mainContainer.classList.add('main-container');

        mainElement.appendChild(mainContainer);
        document.body.appendChild(mainElement);
    }

    const fadedContent = document.createElement('div');
    fadedContent.classList.add('faded-content');

    const firstText = document.createElement('div');
    firstText.classList.add('first-text');

    const h1Element = document.createElement('h1');
    h1Element.setAttribute('translate', 'no');
    h1Element.innerHTML = 'DeepAny.<span class="text-gradient" translate="no">AI</span>';

    const h2Element = document.createElement('h2');
    h2Element.classList.add('text-gradient');
    h2Element.setAttribute('translate', 'no');
    h2Element.textContent = 'bring your imagination come to life.';

    const offsetText = document.createElement('div');
    offsetText.classList.add('offset-text');

    for (let j = 0; j < 3; j++) {
        const offsetH1 = document.createElement('h1');
        offsetH1.classList.add('offset');
        offsetH1.setAttribute('translate', 'no');
        offsetH1.innerHTML = 'deepany.a<span class="no-spacing" translate="no">i</span>';
        offsetText.appendChild(offsetH1);
    }

    firstText.appendChild(h1Element);
    firstText.appendChild(h2Element);
    firstText.appendChild(offsetText);
    fadedContent.appendChild(firstText);

    document.body.appendChild(fadedContent);
}

export function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max));
}

export function setupMainSize(mainQuery) {
    if (!mainQuery || !mainQuery.length)
        return;

    mainQuery.forEach((main, id) => {
        main.style.display = 'grid';
        main.style.top = `${id * getWindowHeight() + getNavbarHeight()}px`;
        main.style.height = `${getWindowHeight() - getNavbarHeight()}px`;
        main.style.width = `${getWindowWidth()}px`;
    });
}

const swipeThreshold = 50;

export function loadScrollingAndMain(navbar, mainQuery, sidebar, hamburgerMenu, setUser) {
    if (!mainQuery || !mainQuery.length) return;

    let scrolling = false;
    let touchStartY = 0;
    let touchEndY = 0;
    let touchStartTime = 0;
    let scrollAttemptedOnce = false;
    let lastScrollTime = 0;
    let lastScrollDirection = '';

    function getCurrentMainElement() {
        const currentIndex = getCurrentMain();
        return mainQuery[currentIndex];
    }

    function showMain(id, transitionDuration = 250) {
        if (mainQuery.length > 1 && id >= 0 && id < mainQuery.length && !scrolling) {
            if (sidebarActive && getScreenMode() !== ScreenMode.PC) return;

            scrolling = true;
            const wentDown = id >= getCurrentMain();
            setCurrentMain(id);
            if (wentDown) {
                removeNavbar(navbar, mainQuery, sidebar);
            } else {
                showNavbar(navbar, mainQuery, sidebar);
            }
            setTimeout(() => {
                scrolling = false;
            }, transitionDuration);
        }
    }

    const handleKeydown = (event) => {
        if (!scrolling) {
            if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                event.preventDefault();
                handleScroll('down');
            } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                event.preventDefault();
                handleScroll('up');
            }
        }
    };

    const handleWheel = (event) => {
        if (event.ctrlKey) 
            return;
        
        handleScroll(event.deltaY > 0 ? 'down' : 'up');
    };

    const handleScroll = (direction) => {
        const currentTime = Date.now();

        const currentMainElement = getCurrentMainElement();
        if (!currentMainElement) return;

        const atTop = currentMainElement.scrollTop === 0;
        const atBottom = currentMainElement.scrollTop + currentMainElement.clientHeight >= currentMainElement.scrollHeight;
        const isMainScrollable = currentMainElement.scrollHeight > currentMainElement.clientHeight;

        if (scrollAttemptedOnce && (currentTime - lastScrollTime < 500 / 2)) {
            return;
        }

        lastScrollTime = currentTime;

        if (scrollAttemptedOnce && direction !== lastScrollDirection) {
            scrollAttemptedOnce = false;
        }

        lastScrollDirection = direction;
        if (!isMainScrollable) {
            if (direction === 'down') {
                showMain(getCurrentMain() + 1);
            } else {
                showMain(getCurrentMain() - 1);
            }
            return;
        }

        if (atTop || atBottom) {
            if (scrollAttemptedOnce) {
                if (direction === 'down') {
                    showMain(getCurrentMain() + 1);
                } else {
                    showMain(getCurrentMain() - 1);
                }
                scrollAttemptedOnce = false;
            } else {
                scrollAttemptedOnce = true;
            }
        }
    };

    const handleEvent = (e) => {
        if (!e) return;
        const { clientY, clientX } = e.type === 'touchstart' ? e.touches[0] : e;
        if (clientY > navbar.offsetHeight) {
            if (!clientX) return showSidebar(sidebar, hamburgerMenu, setUser);
            if (e.type === 'click' && clientX > sidebar.offsetWidth && !e.target.closest('a')) removeSidebar(sidebar, hamburgerMenu);
        } else showNavbar(navbar, mainQuery, sidebar);
    };

    const handleTouchMove = (event) => {
        touchEndY = event.changedTouches[0].clientY;
        handleSwipe();
    };

    const handleTouchStart = (event) => {
        handleEvent(event);
        touchStartY = event.touches[0].clientY;
        touchStartTime = Date.now();
    };

    const handleSwipe = () => {
        const touchDistance = touchEndY - touchStartY;
        const touchDuration = Date.now() - touchStartTime;
        if (Math.abs(touchDistance) > swipeThreshold && touchDuration < 500) {
            const direction = touchDistance < 0 ? 'down' : 'up';
            handleScroll(direction);
        }
    };

    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('wheel', handleWheel);
    document.addEventListener('click', handleEvent);
    document.addEventListener('mousemove', handleEvent);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchstart', handleTouchStart);

    return function cleanup() {
        document.removeEventListener('keydown', handleKeydown);
        document.removeEventListener('wheel', handleWheel);
        document.removeEventListener('click', handleEvent);
        document.removeEventListener('mousemove', handleEvent);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchstart', handleTouchStart);
    };
}

export function updateContent(contents) {
    const mainContainers = document.querySelectorAll('.main-container');
    mainContainers.forEach((mainContainer, id) => {
        if (contents[id]) {
            mainContainer.innerHTML = '';
            mainContainer.insertAdjacentHTML('beforeend', contents[id]);
        }
    });
}

function loadSizeCache() {
    const cachedData = localStorage.getItem('sizeCache');
    return cachedData ? JSON.parse(cachedData) : {};
}

const sizeCache = loadSizeCache();

export function retrieveImages(id) {
    const img = document.getElementById(id);
    if (!img) {
        return;
    }

    const applyImageAttributes = (src, srcset, sizes) => {
        img.src = src;
        img.srcset = srcset;
        img.sizes = sizes;
    };

    if (sizeCache[id]) {
        const { src, srcset, sizes } = sizeCache[id];
        applyImageAttributes(src, srcset, sizes);
    } else {
        const handleImageLoad = () => {
            function getClosestSize(dimension) {
                const availableSizes = [128, 256, 512, 768];
                return availableSizes.reduce((prev, curr) =>
                    Math.abs(curr - dimension) < Math.abs(prev - dimension) ? curr : prev
                );
            }

            const { width, height } = img.getBoundingClientRect();
            const largerDimension = Math.max(width, height);
            const closestSize = getClosestSize(largerDimension);

            const newSrc = `./assets/${id}-${closestSize}.webp`;
            const newSrcset = `${newSrc} ${closestSize}w`;
            const newSizes = `${closestSize}px`;

            sizeCache[id] = { src: newSrc, srcset: newSrcset, sizes: newSizes };
            localStorage.setItem('sizeCache', JSON.stringify(sizeCache));
            applyImageAttributes(newSrc, newSrcset, newSizes);
        };

        if (img.complete) {
            handleImageLoad();
        } else {
            img.addEventListener('load', handleImageLoad, { once: true });
        }
    }
}

export function getSizeCache() {
    return sizeCache;
}

function getValueBasedOnAspectRatio() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const aspectRatio = windowWidth / windowHeight;
    const maxAspectRatio = 0.5;
    const minAspectRatio = 0.25;

    let value = Math.max(0, Math.min(1, aspectRatio / maxAspectRatio));
    if (aspectRatio < minAspectRatio) {
        value = minAspectRatio / maxAspectRatio;
    }

    return Math.min(1, value);
}

// Attach event listeners for each element with the tooltip
document.querySelectorAll('*[tooltip]').forEach(item => {
    item.addEventListener('mouseenter', function () {
        const tooltip = this.querySelector('.tooltip');
        if (tooltip) {
            adjustTooltipPosition(tooltip);
        }
    });
});

export function setScaleFactors(scaleFactorHeight, scaleFactorWidth, scaleFactorHeightMultiplier = 3, scaleFactorWidthMultiplier = 0) {
    let value = getValueBasedOnAspectRatio();
    value = Math.pow(value, 0.5) / 2;
    scaleFactorHeightMultiplier *= value;
    scaleFactorWidthMultiplier *= value;
    document.documentElement.style.setProperty('--scale-factor-h', scaleFactorHeight * scaleFactorHeightMultiplier);
    document.documentElement.style.setProperty('--scale-factor-w', scaleFactorWidth * scaleFactorWidthMultiplier);
}

export function showZoomIndicator(event, scaleFactorHeight, scaleFactorWidth) {
    let container = document.getElementById('zoom-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'zoom-container';
        container.className = 'indicator-container';
        document.body.appendChild(container);
    }

    let notification = container.querySelector('.indicator');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'indicator';
        container.appendChild(notification);
    }

    let messageElement = notification.querySelector('p');
    if (!messageElement) {
        messageElement = document.createElement('p');
        messageElement.style.marginRight = '4vh';
        notification.appendChild(messageElement);
    }

    let minusButton = notification.querySelector('.zoom-minus');
    let plusButton = notification.querySelector('.zoom-plus');

    if (!minusButton) {
        minusButton = document.createElement('button');
        minusButton.className = 'zoom-minus';
        minusButton.innerText = '-';
        notification.appendChild(minusButton);
    }

    if (!plusButton) {
        plusButton = document.createElement('button');
        plusButton.className = 'zoom-plus';
        plusButton.innerText = '+';
        notification.appendChild(plusButton);
    }

    minusButton.onclick = () => {
        scaleFactorHeight = clamp((scaleFactorHeight || 1) - 0.05, 0.1, 1);
        scaleFactorWidth = clamp((scaleFactorWidth || 1) - 0.05, 0.1, 1);
        setScaleFactors(scaleFactorHeight, scaleFactorWidth);
        localStorage.setItem('scaleFactorHeight', scaleFactorHeight);
        localStorage.setItem('scaleFactorWidth', scaleFactorWidth);
        showZoomIndicator(`${Math.round(scaleFactorHeight * 100)}%`, scaleFactorHeight, scaleFactorWidth);
        setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 100);
    };

    plusButton.onclick = () => {
        scaleFactorHeight = clamp((scaleFactorHeight || 1) + 0.05, 0.1, 1);
        scaleFactorWidth = clamp((scaleFactorWidth || 1) + 0.05, 0.1, 1);
        setScaleFactors(scaleFactorHeight, scaleFactorWidth);
        localStorage.setItem('scaleFactorHeight', scaleFactorHeight);
        localStorage.setItem('scaleFactorWidth', scaleFactorWidth);
        showZoomIndicator(`${Math.round(scaleFactorHeight * 100)}%`, scaleFactorHeight, scaleFactorWidth);
        setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 100);
    };

    notification.style.opacity = 1;

    document.addEventListener('click', (event) => {
        if (!container.contains(event.target)) {
            notification.style.opacity = 0;
        }
    });

    messageElement.innerText = `${Math.round(scaleFactorHeight * 100)}%`;
}

window.iosMobileCheck = function () {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIOSDevice = /iPhone|iPad|iPod/i.test(userAgent);
    const hasTouchscreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    return isIOSDevice && hasTouchscreen;
};