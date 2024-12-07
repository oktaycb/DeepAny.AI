export function setCache(key, value, ttl) {
    const now = new Date();
    const item = {
        value: value,
        expiry: now.getTime() + ttl,
    }
    localStorage.setItem(key, JSON.stringify(item))
}
export function getCache(key, ttl) {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) {
        return null
    }
    const item = JSON.parse(itemStr);
    const now = Date.now();
    if (now > item.expiry || item.expiry > now + ttl) {
        localStorage.removeItem(key);
        return null
    }
    return item.value
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
            resolve(canvas.toDataURL())
        };
        img.onerror = (error) => {
            reject(`Image resizing failed: ${error}`)
        }
    })
};
export function retrieveImageFromURL(photoURL, callback, retries = 2, delay = 1000, createBase64 = !1) {
    fetch(photoURL).then(response => {
        if (response.ok) {
            return response.blob()
        } else if (response.status === 429 && retries > 0) {
            setTimeout(() => {
                retrieveImageFromURL(photoURL, callback, retries - 1, delay * 2, createBase64)
            }, delay)
        } else {
            throw new Error(`Failed to fetch image: ${response.status}`)
        }
    }).then(blob => {
        if (blob) {
            if (createBase64) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    callback(reader.result)
                };
                reader.readAsDataURL(blob)
            } else callback(URL.createObjectURL(blob))
        }
    }).catch(error => {
        console.error('Error fetching the image:', error)
    })
}
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
                        localStorage.setItem(storageKey, resizedBase64Image)
                    }
                };
                reader.readAsDataURL(file)
            }
            inputElement.remove()
        })
    })
}
async function fetchWithTimeout(url, timeout, controller) {
    const signal = controller.signal;
    const fetchPromise = fetch(url, {
        signal
    }).then(response => response.json());
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
            controller.abort();
            reject(new Error('Request timed out'))
        }, timeout)
    });
    return Promise.race([fetchPromise, timeoutPromise])
}
export async function getUserInternetProtocol() {
    const urls = ['https://ipapi.is/json/', 'https://ipinfo.io/json', 'https://api64.ipify.org?format=json', 'https://ifconfig.me/all.json', 'https://ipapi.co/json/',];
    const controllers = urls.map(() => new AbortController());
    const rawData = [];
    try {
        for (let i = 0; i < urls.length; i++) {
            try {
                const data = await fetchWithTimeout(urls[i], 1000, controllers[i]);
                if ('elapsed_ms' in data) {
                    delete data.elapsed_ms
                }
                rawData.push(JSON.stringify(data));
                if (data.ip || data.ip_addr) {
                    controllers.slice(i + 1).forEach(controller => controller.abort());
                    const UID = await createStaticIdentifier(rawData);
                    return {
                        publicAdress: data.ip || data.ip_addr,
                        isVPN: data.is_vpn || !1,
                        isProxy: data.is_proxy || !1,
                        isTOR: data.is_tor || !1,
                        isCrawler: data.is_crawler || !1,
                        UID,
                        rawData
                    }
                }
            } catch (error) {
                console.error(`Error fetching from ${urls[i]}: ${error.message}`)
            }
        }
        throw new Error('No IP field in any response')
    } catch (error) {
        alert('All attempts to fetch internet protocol data failed: ' + error.message);
        return null
    }
}
export async function createStaticIdentifier(jsonData) {
    try {
        if (!Array.isArray(jsonData)) {
            throw new Error('Input must be an array')
        }
        const combinedData = jsonData.map(item => JSON.stringify(item)).join('');
        const encoder = new TextEncoder();
        const data = encoder.encode(combinedData);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');
        return hashHex
    } catch (error) {
        alert('Failed to create static identifier.');
        return null
    }
}
export function getPageName() {
    const url = window.location.pathname;
    const pathArray = url.split('/');
    return pathArray[pathArray.length - 1] || 'default'
}
export const pageName = getPageName();

function documentID() {
    switch (pageName) {
        case 'face-swap':
            return 'serverAdress-DF';
        case 'inpaint':
            return 'serverAdress-DN';
        case 'art-generator':
            return 'serverAdress-DA';
        default:
            return null
    }
}
export async function fetchServerAddresses(snapshotPromise, keepSlowServers = !0, serverType = null) {
    const ttl = 1 * 60 * 60 * 1000;
    const cacheKey = pageName + '-serverAddresses';
    let cachedAddresses = getCache(cacheKey, ttl);
    if (!keepSlowServers) cachedAddresses = cachedAddresses.filter(address => !address.includes("3050"));
    if (cachedAddresses) return cachedAddresses;
    const snapshot = await snapshotPromise;
    let serverAddresses = snapshot.docs.map((doc) => doc.data()[serverType ? serverType : documentID()]).filter(Boolean);
    setCache(cacheKey, serverAddresses, ttl);
    if (!keepSlowServers) serverAddresses = serverAddresses.filter(address => !address.includes("3050"));
    return serverAddresses
}
export async function fetchServerAddress(snapshotPromise, fieldId) {
    const ttl = 1 * 60 * 60 * 1000;
    const cacheKey = `serverAddress-${fieldId}`;
    const cachedAddress = getCache(cacheKey, ttl);
    if (cachedAddress) return cachedAddress;
    const snapshot = await snapshotPromise;
    if (snapshot && snapshot.exists()) {
        const serverAddress = snapshot.data()[`serverAdress-${fieldId}`];
        setCache(cacheKey, serverAddress || null, ttl);
        return serverAddress || null
    }
    return null
}
export async function fetchConversionRates() {
    const cacheKey = 'conversionRates';
    const ttl = 1 * 24 * 60 * 60 * 1000;
    const cachedRates = getCache(cacheKey, ttl);
    if (cachedRates) return cachedRates;
    try {
        const response = await fetch('https://api.frankfurter.app/latest?from=USD');
        if (!response.ok) {
            throw new Error('API request failed')
        }
        const data = await response.json();
        setCache(cacheKey, data.rates, ttl);
        return data.rates
    } catch (error) {
        console.error("Error fetching conversion rates:", error);
        return {
            EUR: 0.9,
            GBP: 0.8,
            TRY: 35.00
        }
    }
}

export function generateUID() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789%^&*()_-+=';
    let uniqueId = '';
    for (let i = 0; i < 24; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        uniqueId += characters.charAt(randomIndex);
    }
    //console.log('[generateUID] Generated UID:', uniqueId);
    return uniqueId;
}

function checkIfCameFromAd() {
    const urlParams = new URLSearchParams(window.location.search);
    const adParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'gclid', 'fbclid', 'gad_source', 'gbraid', 'utm_id', 'adgroup', 'ref', 'affid',
        'ttclid', 'li_fat_id', 'wbraid', 'ads'
    ];

    const adData = [];
    adParams.forEach(param => {
        const value = urlParams.get(param);
        if (value) {
            adData.push(value);
        }
    });

    if (adData.length === 0) {
        return false;
    }

    return adData.join('_');
}

function isValidString(value) {
    return value && typeof value === 'string' && value.length <= 256 && value !== 'false' && /^[a-zA-Z0-9_\-]+$/.test(value);
}

export async function ensureCameFromAd() {
    const userDoc = await getUserDoc();
    let cameFromAd = localStorage.getItem('cameFromAd');
    if (!cameFromAd || cameFromAd === 'false' || !isValidString(cameFromAd)) 
        cameFromAd = await loadEvercookieCameFromAd(userDoc);

    if (!cameFromAd || cameFromAd === 'false' || !isValidString(cameFromAd)) 
        return;

    const userData = await getUserData();
    if (!userData || !userData.uid) return;
    if (!userDoc || userDoc.cameFromAd)  return;
    
    const serverDocSnapshot = await getDocSnapshot('servers', '3050-1');
    const serverAddressAPI = await fetchServerAddress(serverDocSnapshot, 'API');

    const userId = userData.uid;
    const serverResponse = await fetch(serverAddressAPI + '/set-came-from-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            userId,
            cameFromAd
        }),
    });

    if (serverResponse.ok) 
        await setCurrentUserDoc(getDocSnapshot);
}

async function loadEvercookieCameFromAd(userDoc) {
    localStorage.setItem('cameFromAd', checkIfCameFromAd());
    try {
        await loadJQueryAndEvercookie();
        const ec = new evercookie();

        return new Promise((resolve) => {
            ec.get('cameFromAd', async (storedCameFromAd) => {
                if (storedCameFromAd && isValidString(storedCameFromAd)) {
                    resolve(storedCameFromAd);
                    return;
                }

                const cameFromAd = userDoc && isValidString(userDoc.cameFromAd) ? userDoc.cameFromAd : checkIfCameFromAd();
                ec.set('cameFromAd', cameFromAd);
                resolve(cameFromAd);
            });
        });
    } catch (error) {
        console.error("[loadEvercookieCameFromAd] Error while processing cameFromAd:", error);
        resolve(null);
    }
}

export async function ensureUniqueId() {
    const storedUniqueId = localStorage.getItem('userUniqueBrowserId');
    if (!storedUniqueId || storedUniqueId.length !== 24) {
        //console.log('[ensureUniqueId] No valid ID found in localStorage. Loading from evercookie...');
        const uniqueId = await loadEvercookieUserUniqueBrowserId();
        //console.log('[ensureUniqueId] New Unique ID from evercookie:', uniqueId);

        try {
            const userData = await getUserData();

            if (!userData || !userData.uid) {
                //console.error('[ensureUniqueId] User data is missing or invalid:', userData);
                throw new Error('User data is unavailable or incomplete.');
            }

            const userId = userData.uid;
            //console.log('[ensureUniqueId] userId:', userId);

            const serverDocSnapshot = await getDocSnapshot('servers', '3050-1');
            const serverAddressAPI = await fetchServerAddress(serverDocSnapshot, 'API');
            //console.log('[ensureUniqueId] Server Address API:', serverAddressAPI);

            const serverResponse = await fetch(serverAddressAPI + '/set-unique-browser-id', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId,
                    uniqueId,
                    storedUniqueId
                }),
            });

            if (!serverResponse.ok) {
                //console.error('[ensureUniqueId] Failed to send unique ID to server:', serverResponse.status);
                throw new Error(`Server error: ${serverResponse.statusText}`);
            }

            //console.log('[ensureUniqueId] Unique ID successfully sent to server.');
            await setCurrentUserDoc(getDocSnapshot);
        } catch (error) {
            //console.error('[ensureUniqueId] Error sending unique ID to server:', error);
        }

        return uniqueId;
    }

    return storedUniqueId;
}

async function loadEvercookieUserUniqueBrowserId() {
    const generatedId = generateUID();
    //console.log('[loadEvercookieUserUniqueBrowserId] Initializing...');
    await loadJQueryAndEvercookie();
    const ec = new evercookie();

    return new Promise((resolve) => {
        ec.get('userUniqueBrowserId', async (storedUniqueId, all) => {
            //console.log('[evercookie.get] Retrieved Unique ID:', storedUniqueId);

            const isValidId = storedUniqueId && storedUniqueId.length === 24;
            if (isValidId) {
                //console.log('[evercookie.get] Valid stored ID found:', storedUniqueId);
                resolve(storedUniqueId);
                return;
            }

            //console.log('[evercookie.get] No valid ID found. Generating new ID...');

            try {
                const userDoc = await getUserDoc();
                //console.log('[evercookie.get] User document retrieved:', userDoc);

                //console.log('[evercookie.get] generatedId:', generatedId);

                const newUniqueId = userDoc && userDoc.uniqueId && userDoc.uniqueId.length === 24
                    ? userDoc.uniqueId
                    : generatedId;

                //console.log('[evercookie.get] Setting new Unique ID in evercookie:', newUniqueId);

                //localStorage.setItem('userUniqueBrowserId', newUniqueId);
                ec.set('userUniqueBrowserId', newUniqueId);
                resolve(newUniqueId);
            } catch (error) {
                //console.error('[evercookie.get] Error while generating or setting a new ID:', error);
                resolve(null);
            }
        });
    });
}

function loadEvercookieScript() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/libraries/evercookie/evercookie3.js?v=1.3.8.7';
        script.onload = () => {
            //console.log('[loadEvercookieScript] Evercookie script loaded successfully.');
            resolve();
        };
        script.onerror = (error) => {
            //console.error('[loadEvercookieScript] Failed to load Evercookie script:', error);
            reject(error);
        };
        document.head.appendChild(script);
    });
}

function loadJQueryAndEvercookie() {
    return new Promise((resolve, reject) => {
        if (window.jQuery && window.swfobject && window.dtjava && window.evercookie) {
            resolve();
            return;
        }

        const loadScript = (src, checkVar) => {
            return new Promise((resolve, reject) => {
                if (checkVar in window) {
                    resolve();
                    return;
                }

                const script = document.createElement('script');
                script.src = src;

                script.onload = () => resolve();
                script.onerror = (error) => reject(error);
                document.head.appendChild(script);
            });
        };

        loadScript('/libraries/evercookie/jquery-1.4.2.min.js?v=1.3.8.7', 'jQuery')
            .then(() => loadScript('/libraries/evercookie/swfobject-2.2.min.js?v=1.3.8.7', 'swfobject'))
            .then(() => loadScript('/libraries/evercookie/dtjava.js?v=1.3.8.7', 'dtjava'))
            .then(() => loadEvercookieScript())
            .then(resolve)
            .catch(reject);
    });
}

function createNotificationsContainer() {
    let container = document.getElementById('notification');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification';
        container.className = 'indicator-container';
        document.body.appendChild(container)
    }
    const indicators = container.getElementsByClassName('indicator');
    if (indicators.length > 0) {
        for (let i = 0; i < indicators.length; i++) {
            const notification = indicators[i];
            if (!notification.classList.contains('notification-warning-important')) {
                notification.style.opacity = '0';
                notification.remove()
            }
        }
    }
    return container
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
        waitTime = 60000
    } else if (type === 'warning-important') {
        notification.classList.add('notification-warning-important');
        featureChangeElement.classList.add('feature-change-warning-important');
        waitTime = 60000
    }
    const messageElement = document.createElement('p');
    messageElement.innerText = message;
    messageElement.className = 'notification-explanation';
    notification.appendChild(featureChangeElement);
    notification.appendChild(messageElement);
    container.appendChild(notification);
    document.addEventListener('click', (event) => {
        if (!notification.contains(event.target) && container.contains(notification)) {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove()
            }, 300)
        }
    }, {
        once: !0
    });
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove()
        }, 300)
    }, waitTime)
}
export const openDB = (dataBaseIndexName, dataBaseObjectStoreName) => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dataBaseIndexName, 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            db.createObjectStore(dataBaseObjectStoreName, {
                keyPath: 'id',
                autoIncrement: !0
            })
        };
        request.onsuccess = (event) => {
            const db = event.target.result;
            resolve(db)
        };
        request.onerror = (event) => {
            reject(`Error opening database: ${event.target.error}`)
        }
    })
};
export const countInDB = (db) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([db.objectStoreNames[0]], 'readonly');
        const objectStore = transaction.objectStore(db.objectStoreNames[0]);
        const request = objectStore.count();
        request.onsuccess = (event) => {
            resolve(event.target.result)
        };
        request.onerror = (event) => {
            reject(`Error counting entries in database: ${event.target.error}`)
        }
    })
};
export const addToDB = (db, data, active = !1) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([db.objectStoreNames[0]], 'readwrite');
        const objectStore = transaction.objectStore(db.objectStoreNames[0]);
        const timestamp = new Date().getTime();
        let entry = {
            timestamp,
            active
        };
        if (data instanceof Blob) {
            entry.blob = data
        } else if (Array.isArray(data)) {
            if (data[0] !== null) entry.blob = data[0];
            if (data[1] !== null) entry.url = data[1]
        }
        entry = Object.fromEntries(Object.entries(entry).filter(([_, v]) => v != null));
        const request = objectStore.add(entry);
        request.onsuccess = async () => {
            resolve({
                id: request.result,
                timestamp
            })
        };
        request.onerror = (event) => {
            alert('Error adding data to database: ' + event);
            reject(`Error adding data to database: ${event.target.error ? event.target.error.message : 'Unknown error'}`)
        }
    })
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
                results = results.slice(offset, offset + limit)
            }
            const mappedResults = results.map(item => {
                return {
                    blob: item.blob || null,
                    url: item.url || null,
                    id: item.id || null,
                    chunks: item.chunks || [],
                    timestamp: item.timestamp || null,
                    active: item.active || !1
                }
            });
            resolve(mappedResults)
        };
        request.onerror = (event) => {
            reject(`Error retrieving data from database: ${event.target.error}`)
        }
    })
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
                    resolve()
                };
                updateRequest.onerror = (event) => reject(`Error updating active state: ${event.target.error}`)
            } else {
                reject('Item not found for update')
            }
        };
        request.onerror = (event) => {
            reject(`Error retrieving item for active state update: ${event.target.error}`)
        }
    })
};
export async function fetchProcessState(url) {
    try {
        const processURL = url.replace('download-output', 'get-process-state');
        const response = await fetch(processURL);
        const res = await response.json();
        return res
    } catch (error) {
        alert(error.message);
        return null
    }
}
const STATUS_OK = 200;
const STATUS_NOTFOUND = 404;
export async function checkServerQueue(server) {
    try {
        const response = await fetch(`${server}/get-online`);
        if (response.status === STATUS_OK) {
            const data = await response.json();
            return data.server
        }
        return Infinity
    } catch (error) {
        return Infinity
    }
}
export function calculateMetadata(element, callback) {
    if (element instanceof HTMLVideoElement) {
        let lastMediaTime = 0;
        let lastFrameNum = 0;
        let fps = 0;
        const fpsBuffer = [];
        let frameNotSeeked = true;
        let lastFps = 0;

        function ticker(useless, metadata) {
            const mediaTimeDiff = Math.abs(metadata.mediaTime - lastMediaTime);
            const frameNumDiff = metadata.presentedFrames - lastFrameNum;
            if (frameNumDiff > 0 && mediaTimeDiff > 0) {
                const diff = mediaTimeDiff / frameNumDiff;
                if (element.playbackRate === 1 && frameNotSeeked) {
                    fpsBuffer.push(diff);
                    fps = Math.round(1 / getFpsAverage());
                    if (fps === lastFps) {
                        fpsBuffer.pop();
                        return callback({
                            fps,
                            resolution: {
                                width: element.videoWidth,
                                height: element.videoHeight
                            },
                            duration: element.duration,
                            currentTime: element.currentTime,
                            playbackRate: element.playbackRate,
                            volume: element.volume,
                            muted: element.muted,
                            paused: element.paused,
                            ended: element.ended,
                            buffered: element.buffered,
                            seekable: element.seekable,
                            networkState: element.networkState,
                            readyState: element.readyState,
                            src: element.src,
                            mediaTime: metadata.mediaTime,
                            presentedFrames: metadata.presentedFrames
                        });
                    }
                    lastFps = fps;
                    if (lastFps > 0) {
                        element.setAttribute('data-fps', lastFps);
                    }
                }
            }
            lastMediaTime = metadata.mediaTime;
            lastFrameNum = metadata.presentedFrames;
            frameNotSeeked = true;
            element.requestVideoFrameCallback(ticker);
        }

        function getFpsAverage() {
            if (fpsBuffer.length === 0) return 1;
            return fpsBuffer.reduce((a, b) => a + b, 0) / fpsBuffer.length;
        }

        element.addEventListener('seeked', function () {
            fpsBuffer.pop();
            frameNotSeeked = false;
        });
        element.onloadedmetadata = function () {
            element.requestVideoFrameCallback(ticker);
            element.play().catch(error => {
                alert('Playback failed: ' + error.message);
            });
        };
        element.onerror = function () {
            alert('An error occurred during video playback.');
        };
    } else if (element instanceof HTMLImageElement) {
        element.onload = function () {
            callback({
                resolution: {
                    width: element.naturalWidth,
                    height: element.naturalHeight
                },
                src: element.src,
            });
        };
        element.onerror = function () {
            alert('An error occurred while loading the image.');
        };
    } else {
        alert('Element is not a video or image.');
    }
}

export async function customFetch(url, options, onProgress) {
    if (typeof onProgress !== 'function') return fetch(url, options);
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(options.method || 'GET', url);
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const progress = (event.loaded / event.total) * 100;
                onProgress(progress)
            }
        };
        xhr.onload = () => {
            if (xhr.status >= STATUS_OK && xhr.status < STATUS_NOTFOUND) {
                resolve(new Response(xhr.responseText, {
                    status: xhr.status
                }))
            } else {
                reject(new Error(`Request failed with status ${xhr.status}`));
                showNotification(`Request failed with status ${xhr.status}. Try Again.`, 'Warning - Fetching Failed', 'warning')
            }
        };
        xhr.onerror = () => {
            reject(new Error('Request failed'));
            showNotification(`Request failed. Try Again.`, 'Warning - Fetching Failed', 'warning')
        };
        Object.entries(options.headers || {}).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value)
        });
        xhr.send(options.body)
    })
}
export const initDB = async (dataBaseIndexName, dataBaseObjectStoreName, handleDownload, databases) => {
    try {
        let db = openDB(dataBaseIndexName, dataBaseObjectStoreName);
        let mediaCount = localStorage.getItem(`${pageName}_${dataBaseObjectStoreName}-count`);
        if (!mediaCount) {
            mediaCount = await countInDB(await db);
            localStorage.setItem(`${pageName}_${dataBaseObjectStoreName}-count`, mediaCount)
        } else mediaCount = parseInt(mediaCount, 10);
        const mediaContainer = document.querySelector(`.${dataBaseObjectStoreName}`);
        const fragment = document.createDocumentFragment();
        if (mediaCount > 0) {
            mediaContainer.style.display = mediaCount > 0 ? 'flex' : 'none';
            for (let i = 0; i < mediaCount; i++) {
                const div = document.createElement('div');
                div.className = 'data-container';
                div.setAttribute('tooltip', '');
                div.innerHTML = `<div class="process-text">Loading...</div><div class="delete-icon"></div>`;
                fragment.appendChild(div)
            }
        }
        mediaContainer.appendChild(fragment);
        db = await db;
        mediaCount = await countInDB(db);
        localStorage.setItem(`${pageName}_${dataBaseObjectStoreName}-count`, mediaCount);
        if (mediaCount > 0) {
            const mediaItems = await getFromDB(db);
            const inputElements = mediaContainer.querySelectorAll('.data-container');
            for (const [indexInBatch, {
                blob,
                url,
                id,
                timestamp,
                active
            }] of mediaItems.entries()) {
                let element = inputElements[indexInBatch];
                element.innerHTML = `<initial url="${url}" id="${id}" timestamp="${timestamp}" active="${active}"/></initial><div class="process-text">Initializing</div><div class="delete-icon"></div>`;
                if (blob && (blob.type.startsWith('video') || blob.type.startsWith('image'))) {
                    const blobUrl = URL.createObjectURL(blob);
                    if (blob.type.startsWith('video')) {
                        element.innerHTML = `<video url="${url}" id="${id}" timestamp="${timestamp}" active="${active}" playsinline preload="auto" disablePictureInPicture loop muted autoplay><source src="${blobUrl}">Your browser does not support the video tag.</video><div class="delete-icon"></div>`;
                        if (dataBaseObjectStoreName === 'inputs') {
                            element.innerHTML = `<div class="tooltip cursor">Loading...</div>` + element.innerHTML;
                            const tooltip = element.querySelector('.tooltip');
                            if (tooltip && tooltip.classList.contains('cursor')) {
                                function updateTooltipPosition(event) {
                                    tooltip.style.position = 'fixed';
                                    tooltip.style.left = `${event.clientX}px`;
                                    tooltip.style.top = `${event.clientY - 15}px`
                                }
                                element.addEventListener('mouseenter', () => {
                                    document.addEventListener('mousemove', updateTooltipPosition)
                                });
                                element.addEventListener('mouseleave', () => {
                                    document.removeEventListener('mousemove', updateTooltipPosition)
                                })
                            }
                            const keepFPS = document.getElementById('keepFPS');
                            const fpsSlider = document.getElementById("fps-slider");
                            const removeBanner = document.getElementById("removeBanner");
                            let lastMetadata = null;

                            function handleMetadataUpdate(metadata) {
                                lastMetadata = metadata;
                                const tooltip = element.querySelector('.tooltip');
                                if (tooltip && metadata.fps) {
                                    const fpsSliderValue = !keepFPS.checked ? fpsSlider.value : 60;
                                    const fps = Math.min(fpsSliderValue, metadata.fps);
                                    const videoDurationTotalFrames = Math.floor(metadata.duration * fps);
                                    const singleCreditForTotalFrameAmount = 120;
                                    const removeBannerStateMultiplier = removeBanner && removeBanner.checked ? 2 : 1;
                                    const neededCredits = Math.floor(Math.max(1, videoDurationTotalFrames / singleCreditForTotalFrameAmount) * removeBannerStateMultiplier);
                                    tooltip.textContent = `${neededCredits} Credits`
                                }
                            } [keepFPS, fpsSlider, removeBanner].forEach(element => {
                                element.addEventListener('change', () => {
                                    if (lastMetadata) handleMetadataUpdate(lastMetadata);
                                })
                            });
                            calculateMetadata(element.querySelector('video'), handleMetadataUpdate)
                        }
                    } else if (blob.type.startsWith('image')) {
                        element.innerHTML = `<img url="${url}" id="${id}" timestamp="${timestamp}" active="${active}" src="${blobUrl}" alt="Uploaded Photo"/><div class="delete-icon"></div>`;
                        if (dataBaseObjectStoreName === 'inputs') {
                            element.innerHTML = `<div class="tooltip cursor">Loading...</div>` + element.innerHTML;
                            const tooltip = element.querySelector('.tooltip');
                            if (tooltip && tooltip.classList.contains('cursor')) {
                                function updateTooltipPosition(event) {
                                    tooltip.style.position = 'fixed';
                                    tooltip.style.left = `${event.clientX}px`;
                                    tooltip.style.top = `${event.clientY - 15}px`
                                }
                                element.addEventListener('mouseenter', () => {
                                    document.addEventListener('mousemove', updateTooltipPosition)
                                });
                                element.addEventListener('mouseleave', () => {
                                    document.removeEventListener('mousemove', updateTooltipPosition)
                                })
                            }
                            const removeBanner = document.getElementById("removeBanner");
                            let lastMetadata = null;

                            function handleMetadataUpdate(metadata) {
                                lastMetadata = metadata;
                                const tooltip = element.querySelector('.tooltip');
                                if (tooltip) {
                                    const neededCredits = removeBanner.checked ? 2 : 1;
                                    tooltip.textContent = `${neededCredits} Credits`
                                }
                            }
                            removeBanner.addEventListener('change', () => {
                                if (lastMetadata) handleMetadataUpdate(lastMetadata);
                            });
                            calculateMetadata(element.querySelector('img'), handleMetadataUpdate)
                        }
                    }
                    if (active) element.classList.add('active');
                } else if (url) {
                    element.innerHTML = `<initial url="${url}" id="${id}" timestamp="${timestamp}" active="${active}"/></initial><div class="process-text">Fetching...</div><div class="delete-icon"></div>`;
                    const data = await fetchProcessState(url);
                    if (data.status === 'completed')
                        handleDownload({
                            db,
                            url,
                            element,
                            id,
                            timestamp,
                            active
                        }, databases);
                    else element.innerHTML = `<initial url="${url}" id="${id}" timestamp="${timestamp}" active="${active}"/></initial><div class="process-text">${data.server}</div><div class="delete-icon"></div>`
                } else element.innerHTML = `<video url="${url}" id="${id}" timestamp="${timestamp}" active="${active}" playsinline preload="auto" disablePictureInPicture loop muted autoplay><source src="${blobUrl}">Your browser does not support the video tag.</video><div class="process-text">Not Indexed...</div><div class="delete-icon"></div>`
            }
            mediaContainer.style.display = mediaCount > 0 ? 'flex' : 'none'
        }
    } catch (error) {
        console.error(`Database initialization failed: ${error.message}`)
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
                return resolve()
            }
            const {
                value
            } = cursor;
            if (value.url === url) {
                value.chunks = chunks;
                const updateRequest = objectStore.put(value);
                updateRequest.onsuccess = () => resolve();
                updateRequest.onerror = () => reject('Error updating chunks.')
            } else {
                cursor.continue()
            }
        };
        request.onerror = () => reject('Error accessing cursor.')
    })
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
                        resolve()
                    };
                    updateRequest.onerror = (event) => {
                        reject(`Error updating photo in database: ${event.target.error}`)
                    }
                } else {
                    cursor.continue()
                }
            } else {
                reject(`No record found with url: ${url}`)
            }
        };
        request.onerror = (event) => {
            reject(`Error opening cursor in database: ${event.target.error}`)
        }
    })
};
export const deleteFromDB = async (db, id) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([db.objectStoreNames[0]], 'readwrite');
        const photosObjectStore = transaction.objectStore(db.objectStoreNames[0]);
        const deleteRequest = photosObjectStore.delete(id);
        deleteRequest.onsuccess = async () => {
            resolve()
        };
        deleteRequest.onerror = (event) => {
            reject(`Error deleting photo from database: ${event.target.error}`)
        }
    })
};
let firebaseModules = null;
export async function getFirebaseModules() {
    if (firebaseModules) {
        return firebaseModules
    }
    const firebaseAppModule = await import('https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js');
    const firebaseAuthModule = await import('https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js');
    const firebaseFirestoreModule = await import('https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js');
    const {
        initializeApp
    } = firebaseAppModule;
    const {
        getAuth,
        GoogleAuthProvider,
        sendEmailVerification,
        sendPasswordResetEmail,
        signInWithPopup,
        signInWithEmailAndPassword,
        createUserWithEmailAndPassword,
        onAuthStateChanged,
        signOut
    } = firebaseAuthModule;
    const {
        getFirestore,
        collection,
        doc,
        getDoc,
        getDocs
    } = firebaseFirestoreModule;
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
    return firebaseModules
}
export async function getCurrentUserData(getFirebaseModules) {
    const {
        auth
    } = await getFirebaseModules();
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
                })
            } else {
                reject(new Error('No user is currently logged in.'))
            }
        })
    })
}
export async function getDocSnapshot(collectionId, documentId) {
    const {
        db,
        doc,
        getDoc,
        collection
    } = await getFirebaseModules();
    return await getDoc(doc(collection(db, collectionId), documentId))
}
export async function getDocsSnapshot(collectionId) {
    const {
        db,
        getDocs,
        collection
    } = await getFirebaseModules();
    return await getDocs(collection(db, collectionId))
}

export const getUserData = async (setCurrentUserDataPromise) => {
    if (setCurrentUserDataPromise) {
        await setCurrentUserDataPromise();
    }

    const cachedUserData = localStorage.getItem('cachedUserData');
    return cachedUserData ? JSON.parse(cachedUserData) : null;
};

export const getUserDoc = async (setCurrentUserDocPromise = null) => {
    if (setCurrentUserDocPromise) {
        await setCurrentUserDocPromise();
    }

    const cachedUserDocument = localStorage.getItem('cachedUserDocument');
    if (!cachedUserDocument) {
        //console.log('[getUserDoc] No cached user document found.');
        return null;
    }

    try {
        const parsedData = JSON.parse(cachedUserDocument);
        return parsedData.data || null;
    } catch (error) {
        alert("Error parsing cached user document: " + error.message);
        //console.error('[getUserDoc] Error parsing cached user document:', error);
        return null;
    }
};

export async function setCurrentUserData(getFirebaseModules) {
    const cachedUserData = await getCurrentUserData(getFirebaseModules);
    localStorage.setItem('cachedUserData', JSON.stringify(cachedUserData));
}

const CACHE_EXPIRATION_TIME = 6 * 60 * 60 * 1000;
export async function setCurrentUserDoc(getDocSnapshot, useCache = !1) {
    if (useCache) {
        let cachedUserDoc = localStorage.getItem('cachedUserDocument');
        if (cachedUserDoc) {
            cachedUserDoc = JSON.parse(cachedUserDoc);
            const currentTime = new Date().getTime();
            if (currentTime - cachedUserDoc.timestamp < CACHE_EXPIRATION_TIME) {
                setUser(cachedUserDoc.data);
                return !0
            }
        }
    }
    const userData = await getUserData();
    const userDocSnap = await getDocSnapshot('users', userData.uid);
    if (!userDocSnap || !userDocSnap.exists()) {
        return !1
    }
    const userDoc = userDocSnap.data();
    localStorage.setItem('cachedUserDocument', JSON.stringify({
        data: userDoc,
        timestamp: new Date().getTime(),
    }));
    setUser(userDoc);
    return !0
}
export function setUser(userDoc) {
    if (!userDoc) return !1;
    function setCachedImageForElements(className, storageKey) {
        const imgElements = document.getElementsByClassName(className);
        const cachedImage = localStorage.getItem(storageKey);
        if (cachedImage) {
            for (let imgElement of imgElements) {
                imgElement.src = cachedImage
            }
        } else {
            for (let imgElement of imgElements) {
                imgElement.src = 'assets/profile.webp'
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
                    remainingTime = 'lifetime'
                } else {
                    if (years > 0) remainingTime += `${years} year${years > 1 ? 's' : ''} `;
                    if (months > 0) remainingTime += `${months} month${months > 1 ? 's' : ''} `;
                    if (days > 0) remainingTime += `${days} day${days > 1 ? 's' : ''} `;
                    if (days === 0 && hours > 0) remainingTime += `${hours} hour${hours > 1 ? 's' : ''} `;
                    if (days === 0 && hours === 0 && minutes > 0) remainingTime += `${minutes} minute${minutes > 1 ? 's' : ''}`;
                    remainingTime = remainingTime.trim() + ' remaining'
                }
                credits.textContent += ` (${remainingTime})`
            }
        }
    }
    const usernames = document.getElementsByClassName('username');
    for (let username of usernames) {
        username.textContent = userDoc.username;
        username.value = userDoc.username
    }
    return !0
}
async function handleUserLoggedIn(userData, getUserInternetProtocol, ensureUniqueId, fetchServerAddress, getDocSnapshot, getFirebaseModules) {
    if (!userData) return;
    let userDoc = await getUserDoc();
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
                <button class="close-button" style="position: absolute;top: 1vh;right: 1vh;cursor: pointer;width: 4vh;height: 4vh;padding: 0;">
                    <svg style="margin: 0;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x">
                        <path d="M18 6 6 18"></path>
                        <path d="m6 6 12 12"></path>
                    </svg>
                </button>
            `;
            const sendVerificationEmail = document.getElementById("sendVerificationEmail");
            sendVerificationEmail.addEventListener('click', async () => {
                try {
                    const {
                        auth,
                        sendEmailVerification
                    } = await getFirebaseModules();
                    const user = auth.currentUser;
                    if (user) {
                        await sendEmailVerification(user);
                        document.getElementById('verificationMessage').style.display = 'unset';
                        document.getElementById('verificationMessage').style.color = 'unset';
                        document.getElementById('verificationMessage').textContent = 'Verification email sent! Please check your inbox.'
                    } else {
                        throw new Error('No authenticated user found. Please log in first.')
                    }
                } catch (error) {
                    document.getElementById('verificationMessage').style.display = 'unset';
                    document.getElementById('verificationMessage').style.color = 'red';
                    document.getElementById('verificationMessage').textContent = error.message
                }
            });
            const validateVerification = document.getElementById("validateVerification");
            validateVerification.addEventListener('click', async () => {
                try {
                    const userData = await getUserData(() => setCurrentUserData(getFirebaseModules));
                    if (!userData.emailVerified)
                        throw new Error('Your email is still not verified.');
                    else {
                        location.reload()
                    }
                } catch (error) {
                    document.getElementById('verificationMessage').style.display = 'unset';
                    document.getElementById('verificationMessage').style.color = 'red';
                    document.getElementById('verificationMessage').textContent = error.message
                }
            });
            const closeButton = wrapper.querySelector('.close-button');
            closeButton.addEventListener('click', () => {
                document.body.removeChild(wrapper)
            })
        }
        const createFormSection = createVerificationFormSection.bind(null, getFirebaseModules);
        createForm(createFormSection)
    }
    const canSetUserData = setUser(userDoc);
    if (!canSetUserData) {
        const setUserDataSuccess = await setCurrentUserDoc(getDocSnapshot);
        if (!setUserDataSuccess) {
            try {
                async function getServerAddressAPI() {
                    return await fetchServerAddress(getDocSnapshot('servers', '3050-1'), 'API')
                }
                const [userInternetProtocol, uniqueId, serverAddressAPI] = await Promise.all([getUserInternetProtocol(), ensureUniqueId(), getServerAddressAPI()]);
                const userId = userData.uid;
                const referral = new URLSearchParams(window.location.search).get('referral');
                const response = await fetch(`${serverAddressAPI}/create-user`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId,
                        email: userData.email,
                        username: userData.displayName,
                        isAnonymous: userData.isAnonymous,
                        userInternetProtocolAddress: userInternetProtocol.publicAdress,
                        userUniqueInternetProtocolId: userInternetProtocol.UID,
                        uniqueId,
                        referral: referral || null,
                    }),
                });
                if (!response.ok) {
                    alert('HTTP error! Google sign failed, please use email registration.');
                    throw new Error(`HTTP error! Status: ${response.status}`)
                }
                const jsonResponse = await response.json();
                const responseText = JSON.stringify(jsonResponse);
                if (responseText.includes("success")) {
                    location.reload()
                } else {
                    alert('HTTP error! Google sign failed, please use email registration.')
                }
            } catch (error) {
                console.error('Error during user registration:', error);
                return null
            }
        } else location.reload();
        return
    }
    ensureUniqueId();
    await setCurrentUserDoc(getDocSnapshot, !0);
    userDoc = await getUserDoc();
    if (!userData.emailVerified || userDoc?.isBanned || (!userDoc?.paid && userDoc?.invitedHowManyPeople <= 200 && !userDoc?.admin)) {
        userDoc = await getUserDoc(() => setCurrentUserDoc(getDocSnapshot));
        if (!userData.emailVerified || userDoc?.isBanned || (!userDoc?.paid && userDoc?.invitedHowManyPeople <= 200 && !userDoc?.admin)) {
            incognitoModeHandler()
        }
    }
}
async function createSignFormSection(registerForm, retrieveImageFromURL, getFirebaseModules) {
    const innerContainer = document.getElementById('innerContainer');
    if (!innerContainer)
        return;
    if (!registerForm) {
        innerContainer.innerHTML = `
                <h2>Sign in</h2>
                <p>Don't have an account? <span id="openSignUpForm" class="text-gradient" style="cursor: pointer;">Sign up</span> | Free trial available!</p>
                <button class="wide" id="googleSignInButton" type="button">
                    <svg style="width: 2.8vh;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48px" height="48px"><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/></svg>
                    Google
                </button>

                <div style="display: flex; justify-content: center; width: 100%; align-items: center;">
                    <div class="line"></div>
                    <p style="padding: 0 calc(1vh * var(--scale-factor-h)); white-space: nowrap;">or use email</p>
                    <div class="line"></div>
                </div>

                <div id="infoMessage" style="color: red; display: none;"></div>

                <div style="position: relative;">
                    <label for="email">Email address</label>
                    <input type="email" id="email" name="email" placeholder="Enter your email address..." required>
                    <ul class="list-items" id="suggestions"></ul>
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

                <button class="close-button" style="position: absolute;top: 1vh;right: 1vh;cursor: pointer;width: 4vh;height: 4vh;padding: 0;">
                    <svg style="margin: 0;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x">
                        <path d="M18 6 6 18"></path>
                        <path d="m6 6 12 12"></path>
                    </svg>
                </button>
            `;
        document.getElementById('openSignUpForm').addEventListener('click', () => {
            createSignFormSection(!0, retrieveImageFromURL, getFirebaseModules)
        })
    } else {
        innerContainer.innerHTML = `
                <h2>Sign up</h2>
                <p>Already have an account? <span id="openSignInForm" class="text-gradient" style="cursor: pointer;">Sign in</span> | No multiple accounts!</p>
                <div id="infoMessage" style="color: red; display: none;"></div>

                <div>
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" placeholder="Enter your username..." required>
                </div>

                <div style="position: relative;">
                    <label for="email">Email address</label>
                    <input type="email" id="email" name="email" placeholder="Enter your email address..." required>
                    <ul class="list-items" id="suggestions"></ul>
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

                <button class="close-button" style="position: absolute;top: 1vh;right: 1vh;cursor: pointer;width: 4vh;height: 4vh;padding: 0;">
                    <svg style="margin: 0;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x">
                        <path d="M18 6 6 18"></path>
                        <path d="m6 6 12 12"></path>
                    </svg>
                </button>
            `;
        document.getElementById('openSignInForm').addEventListener('click', () => {
            createSignFormSection(!1, retrieveImageFromURL, getFirebaseModules)
        })
    }
    const closeButton = wrapper.querySelector('.close-button');
    closeButton.addEventListener('click', () => {
        document.body.removeChild(wrapper)
    });
    wrapper.addEventListener('mousedown', (event) => {
        if (event.target === wrapper) {
            document.body.removeChild(wrapper)
        }
    });
    let messageContainer = document.getElementById('infoMessage');
    let forgotPassword = document.getElementById('forgotPassword');
    let googleSignInButton = document.getElementById('googleSignInButton');
    let signInButton = document.getElementById('signInButton');
    let signUpButton = document.getElementById('signUpButton');
    const emailInput = document.getElementById('email');
    const suggestionsBox = document.getElementById('suggestions');
    const emailProviders = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
    let selectedIndex = -1;
    emailInput.addEventListener('input', (event) => {
        const inputValue = event.target.value;
        const atIndex = inputValue.indexOf('@');
        selectedIndex = -1;
        if (atIndex !== -1) {
            const enteredDomain = inputValue.slice(atIndex + 1);
            const matchingProviders = emailProviders.filter(provider => provider.startsWith(enteredDomain));
            showSuggestions(matchingProviders, inputValue.slice(0, atIndex + 1))
        } else {
            clearSuggestions()
        }
    });
    emailInput.addEventListener('keydown', (event) => {
        const suggestions = suggestionsBox.querySelectorAll('.item');
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            selectedIndex = (selectedIndex + 1) % suggestions.length;
            updateHighlight(suggestions)
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            selectedIndex = (selectedIndex - 1 + suggestions.length) % suggestions.length;
            updateHighlight(suggestions)
        } else if (event.key === 'Enter' && selectedIndex > -1) {
            event.preventDefault();
            emailInput.value = suggestions[selectedIndex].textContent;
            clearSuggestions()
        }
    });
    emailInput.addEventListener('blur', clearSuggestions);

    function showSuggestions(providers, baseText) {
        clearSuggestions();
        if (providers.length === 0) return;
        providers.forEach(provider => {
            const suggestionItem = document.createElement('li');
            suggestionItem.classList.add('item');
            suggestionItem.textContent = `${baseText}${provider}`;
            suggestionItem.addEventListener('mousedown', () => {
                emailInput.value = suggestionItem.textContent;
                clearSuggestions()
            });
            suggestionsBox.appendChild(suggestionItem)
        });
        suggestionsBox.style.display = 'block'
    }

    function clearSuggestions() {
        suggestionsBox.innerHTML = '';
        suggestionsBox.style.display = 'none';
        selectedIndex = -1
    }

    function updateHighlight(suggestions) {
        suggestions.forEach((suggestion, index) => {
            suggestion.style.backgroundColor = (index === selectedIndex) ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
        })
    }
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            const emailField = document.getElementById('email');
            const passwordField = document.getElementById('password');
            const isFormFilled = emailField.value.trim() !== '' && passwordField.value.trim() !== '';
            if (isFormFilled) {
                if (!registerForm && signInButton) {
                    signInButton.click()
                } else if (registerForm && signUpButton) {
                    signUpButton.click()
                }
            }
        }
    });
    if (forgotPassword) {
        forgotPassword.style.display = 'none';
        forgotPassword.addEventListener('click', async () => {
            let emailValue = document.getElementById('email').value;
            if (!emailValue)
                emailValue = prompt('Please enter your email address to reset your password:');
            if (emailValue) {
                try {
                    const {
                        auth,
                        sendPasswordResetEmail
                    } = await getFirebaseModules();
                    await sendPasswordResetEmail(auth, emailValue);
                    if (messageContainer) {
                        messageContainer.style.display = 'unset';
                        messageContainer.style.color = 'red';
                        messageContainer.textContent = 'Password reset email sent! Please check your inbox.'
                    }
                } catch (error) {
                    console.error("Error sending password reset email:", error);
                    alert('An error occurred while sending the password reset email. Please try again.')
                }
            }
        })
    }
    if (googleSignInButton) {
        googleSignInButton.addEventListener('click', async (event) => {
            event.preventDefault();
            try {
                const {
                    auth,
                    GoogleAuthProvider,
                    signInWithPopup
                } = await getFirebaseModules();
                const provider = new GoogleAuthProvider();
                const result = await signInWithPopup(auth, provider);
                let userCopy = {
                    ...result.user
                };
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
                    const base64Image = await retrieveImageFromURL(userCopy.photoURL, 2, 1000, !0);
                    if (base64Image) {
                        localStorage.setItem('profileImageBase64', base64Image)
                    }
                }
                const cachedUserData = JSON.stringify(userCopy);
                localStorage.setItem('cachedUserData', cachedUserData);
                location.reload()
            } catch (error) {
                console.error("Google sign-in error:", error)
            }
        })
    }
    if (signInButton) {
        signInButton.addEventListener('click', async (event) => {
            event.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            try {
                const {
                    auth,
                    signInWithEmailAndPassword
                } = await getFirebaseModules();
                const result = await signInWithEmailAndPassword(auth, email, password);
                let userCopy = {
                    ...result.user
                };
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
                location.reload()
            } catch (error) {
                if (forgotPassword) {
                    forgotPassword.style.display = 'unset'
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
                            messageContainer.textContent = 'An error occurred. Please try again.'
                    }
                }
                console.error("Email/password sign-in error:", error)
            }
        })
    }
    if (signUpButton) {
        signUpButton.addEventListener('click', async (event) => {
            event.preventDefault();
            try {
                async function getServerAddressAPI() {
                    return await fetchServerAddress(getDocSnapshot('servers', '3050-1'), 'API')
                }
                const [userInternetProtocol, uniqueId, serverAddressAPI] = await Promise.all([getUserInternetProtocol(), ensureUniqueId(), getServerAddressAPI()]);
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const username = document.getElementById('username').value;
                const referral = new URLSearchParams(window.location.search).get('referral');
                const requestData = {
                    email,
                    password,
                    username,
                    referral: referral || null,
                    userInternetProtocolAddress: userInternetProtocol.publicAdress || null,
                    userUniqueInternetProtocolId: userInternetProtocol.UID || null,
                    uniqueId,
                };
                const response = await fetch(`${serverAddressAPI}/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData),
                });
                const data = await response.json();
                if (data.message && data.message.includes("User registered successfully")) {
                    createSignFormSection(!1, retrieveImageFromURL, getFirebaseModules);
                    messageContainer = document.getElementById('infoMessage');
                    if (messageContainer) {
                        messageContainer.style.display = 'unset';
                        messageContainer.style.color = 'unset';
                        messageContainer.textContent = 'Sign in with your credentials.'
                    }
                } else {
                    const errorMessage = data.error?.message || 'An error occurred.';
                    throw new Error(errorMessage)
                }
            } catch (error) {
                if (messageContainer) {
                    messageContainer.style.display = 'block';
                    messageContainer.textContent = error.message
                }
            }
        })
    }
    const passwordInput = document.getElementById('password');
    const showPasswordIcon = document.querySelector('.input_password_show');
    showPasswordIcon.addEventListener('click', () => {
        const isPasswordVisible = passwordInput.type === 'text';
        passwordInput.type = isPasswordVisible ? 'password' : 'text';
        showPasswordIcon.innerHTML = isPasswordVisible ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-off"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"></path><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"></path><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"></path><path d="m2 2 20 20"></path></svg>`
    })
}
async function createForm(createFormSection) {
    const existingFormWrapper = document.getElementById('wrapper');
    if (existingFormWrapper) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'wrapper';
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
    wrapper.appendChild(backgroundContainer);
    document.body.appendChild(wrapper);
    createFormSection()
}
async function handleLoggedOutState(retrieveImageFromURL, getFirebaseModules) {
    incognitoModeHandler();
    const userLayoutContainer = document.getElementById("userLayoutContainer");
    if (userLayoutContainer)
        userLayoutContainer.remove();
    const attachClickListener = (className, isSignUp) => {
        const elements = document.querySelectorAll(`.${className}`);
        if (!elements.length) return;
        const createFormSection = createSignFormSection.bind(null, isSignUp, retrieveImageFromURL, getFirebaseModules);
        elements.forEach((element) => {
            element.addEventListener('click', (event) => {
                event.preventDefault();
                createForm(createFormSection);
            });
        });
        if (isSignUp && new URLSearchParams(window.location.search).get('referral')) {
            createForm(createFormSection);
        }
    };
    attachClickListener("openSignUpContainer", true);
    attachClickListener("openSignInContainer", false);
}
var exports = {};
! function (e, t) {
    "object" == typeof exports && "object" == typeof module ? module.exports = t() : "function" == typeof define && define.amd ? define([], t) : "object" == typeof exports ? exports.detectIncognito = t() : e.detectIncognito = t()
}(this, (function () {
    return function () {
        "use strict";
        var e = {};
        return {
            598: function (e, t) {
                var n = this && this.__awaiter || function (e, t, n, o) {
                    return new (n || (n = Promise))((function (r, i) {
                        function a(e) {
                            try {
                                u(o.next(e))
                            } catch (e) {
                                i(e)
                            }
                        }

                        function c(e) {
                            try {
                                u(o.throw(e))
                            } catch (e) {
                                i(e)
                            }
                        }

                        function u(e) {
                            var t;
                            e.done ? r(e.value) : (t = e.value, t instanceof n ? t : new n((function (e) {
                                e(t)
                            }))).then(a, c)
                        }
                        u((o = o.apply(e, t || [])).next())
                    }))
                },
                    o = this && this.__generator || function (e, t) {
                        var n, o, r, i, a = {
                            label: 0,
                            sent: function () {
                                if (1 & r[0]) throw r[1];
                                return r[1]
                            },
                            trys: [],
                            ops: []
                        };
                        return i = {
                            next: c(0),
                            throw: c(1),
                            return: c(2)
                        }, "function" == typeof Symbol && (i[Symbol.iterator] = function () {
                            return this
                        }), i;

                        function c(c) {
                            return function (u) {
                                return function (c) {
                                    if (n) throw new TypeError("Generator is already executing.");
                                    for (; i && (i = 0, c[0] && (a = 0)), a;) try {
                                        if (n = 1, o && (r = 2 & c[0] ? o.return : c[0] ? o.throw || ((r = o.return) && r.call(o), 0) : o.next) && !(r = r.call(o, c[1])).done) return r;
                                        switch (o = 0, r && (c = [2 & c[0], r.value]), c[0]) {
                                            case 0:
                                            case 1:
                                                r = c;
                                                break;
                                            case 4:
                                                return a.label++, {
                                                    value: c[1],
                                                    done: !1
                                                };
                                            case 5:
                                                a.label++, o = c[1], c = [0];
                                                continue;
                                            case 7:
                                                c = a.ops.pop(), a.trys.pop();
                                                continue;
                                            default:
                                                if (!(r = a.trys, (r = r.length > 0 && r[r.length - 1]) || 6 !== c[0] && 2 !== c[0])) {
                                                    a = 0;
                                                    continue
                                                }
                                                if (3 === c[0] && (!r || c[1] > r[0] && c[1] < r[3])) {
                                                    a.label = c[1];
                                                    break
                                                }
                                                if (6 === c[0] && a.label < r[1]) {
                                                    a.label = r[1], r = c;
                                                    break
                                                }
                                                if (r && a.label < r[2]) {
                                                    a.label = r[2], a.ops.push(c);
                                                    break
                                                }
                                                r[2] && a.ops.pop(), a.trys.pop();
                                                continue
                                        }
                                        c = t.call(e, a)
                                    } catch (e) {
                                        c = [6, e], o = 0
                                    } finally {
                                            n = r = 0
                                        }
                                    if (5 & c[0]) throw c[1];
                                    return {
                                        value: c[0] ? c[1] : void 0,
                                        done: !0
                                    }
                                }([c, u])
                            }
                        }
                    };

                function r() {
                    return n(this, void 0, Promise, (function () {
                        return o(this, (function (e) {
                            switch (e.label) {
                                case 0:
                                    return [4, new Promise((function (e, t) {
                                        var n, o, r = "Unknown";

                                        function i(t) {
                                            e({
                                                isPrivate: t,
                                                browserName: r
                                            })
                                        }

                                        function a(e) {
                                            return e === eval.toString().length
                                        }

                                        function c() {
                                            void 0 !== navigator.maxTouchPoints ? function () {
                                                var e = String(Math.random());
                                                try {
                                                    window.indexedDB.open(e, 1).onupgradeneeded = function (t) {
                                                        var n, o, r = null === (n = t.target) || void 0 === n ? void 0 : n.result;
                                                        try {
                                                            r.createObjectStore("test", {
                                                                autoIncrement: !0
                                                            }).put(new Blob), i(!1)
                                                        } catch (e) {
                                                            var a = e;
                                                            return e instanceof Error && (a = null !== (o = e.message) && void 0 !== o ? o : e), "string" != typeof a ? void i(!1) : void i(a.includes("BlobURLs are not yet supported"))
                                                        } finally {
                                                            r.close(), window.indexedDB.deleteDatabase(e)
                                                        }
                                                    }
                                                } catch (e) {
                                                    i(!1)
                                                }
                                            }() : function () {
                                                var e = window.openDatabase,
                                                    t = window.localStorage;
                                                try {
                                                    e(null, null, null, null)
                                                } catch (e) {
                                                    return void i(!0)
                                                }
                                                try {
                                                    t.setItem("test", "1"), t.removeItem("test")
                                                } catch (e) {
                                                    return void i(!0)
                                                }
                                                i(!1)
                                            }()
                                        }

                                        function u() {
                                            navigator.webkitTemporaryStorage.queryUsageAndQuota((function (e, t) {
                                                var n;
                                                i(Math.round(t / 1048576) < 2 * Math.round((void 0 !== (n = window).performance && void 0 !== n.performance.memory && void 0 !== n.performance.memory.jsHeapSizeLimit ? performance.memory.jsHeapSizeLimit : 1073741824) / 1048576))
                                            }), (function (e) {
                                                t(new Error("detectIncognito somehow failed to query storage quota: " + e.message))
                                            }))
                                        }

                                        function d() {
                                            void 0 !== self.Promise && void 0 !== self.Promise.allSettled ? u() : (0, window.webkitRequestFileSystem)(0, 1, (function () {
                                                i(!1)
                                            }), (function () {
                                                i(!0)
                                            }))
                                        }
                                        void 0 !== (o = navigator.vendor) && 0 === o.indexOf("Apple") && a(37) ? (r = "Safari", c()) : function () {
                                            var e = navigator.vendor;
                                            return void 0 !== e && 0 === e.indexOf("Google") && a(33)
                                        }() ? (n = navigator.userAgent, r = n.match(/Chrome/) ? void 0 !== navigator.brave ? "Brave" : n.match(/Edg/) ? "Edge" : n.match(/OPR/) ? "Opera" : "Chrome" : "Chromium", d()) : void 0 !== document.documentElement && void 0 !== document.documentElement.style.MozAppearance && a(37) ? (r = "Firefox", i(void 0 === navigator.serviceWorker)) : void 0 !== navigator.msSaveBlob && a(39) ? (r = "Internet Explorer", i(void 0 === window.indexedDB)) : t(new Error("detectIncognito cannot determine the browser"))
                                    }))];
                                case 1:
                                    return [2, e.sent()]
                            }
                        }))
                    }))
                }
                Object.defineProperty(t, "__esModule", {
                    value: !0
                }), t.detectIncognito = void 0, t.detectIncognito = r, "undefined" != typeof window && (window.detectIncognito = r), t.default = r
            }
        }[598](0, e), e = e.default
    }()
}));

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
            return mode
        }
    }
    return "a Private Window"
}

function createOverlay() {
    if (document.querySelector('.incognito-overlay'))
        return null;
    const overlay = document.createElement('div');
    overlay.classList.add('incognito-overlay');
    overlay.innerHTML = `
        <div class="overlay-content">
            <h2>Incognito Mode</h2>
            <p>Access in ${getModeName(navigator.userAgent)} mode requires a verified account. Contact admin if this is an error.</p>
        </div>
    `;
    document.body.appendChild(overlay);
    return overlay
}

function removeOverlay() {
    const overlay = document.querySelector('.incognito-overlay');
    if (overlay) {
        overlay.remove()
    }
}
let overlayCheckInterval;

function handleIncognito() {
    detectIncognito().then((isIncognito) => {
        if (isIncognito.isPrivate) {
            createOverlay()
        } else {
            clearInterval(overlayCheckInterval);
            removeOverlay()
        }
    }).catch((error) => {
        alert('Error checking incognito mode:', error)
    })
}
export function incognitoModeHandler() {
    function checkOverlay() {
        if (!document.querySelector('.incognito-overlay'))
            handleIncognito();
    }
    overlayCheckInterval = setInterval(checkOverlay, 100);
    ['click', 'keypress', 'input', 'touchstart', 'mousemove'].forEach((event) => {
        document.addEventListener(event, checkOverlay)
    });
    checkOverlay()
}
async function setupSignOutButtons(getFirebaseModules) {
    const signOutButtons = document.querySelectorAll('.signOut');
    signOutButtons.forEach(signOutElement => {
        signOutElement.addEventListener('click', async function (event) {
            event.preventDefault();
            localStorage.removeItem('cachedUserData');
            localStorage.removeItem('cachedUserDocument');
            localStorage.removeItem('profileImageBase64');
            const {
                auth,
                signOut
            } = await getFirebaseModules();
            try {
                await signOut(auth);
                location.reload()
            } catch (error) {
                alert('Error during sign out: ' + error.message)
            }
        })
    })
}
export async function setAuthentication(userData, retrieveImageFromURL, getUserInternetProtocol, ensureUniqueId, fetchServerAddress, getFirebaseModules, getDocSnapshot) {
    if (userData) {
        handleUserLoggedIn(userData, getUserInternetProtocol, ensureUniqueId, fetchServerAddress, getDocSnapshot, getFirebaseModules);
        return setupSignOutButtons(getFirebaseModules)
    }
    handleLoggedOutState(retrieveImageFromURL, getFirebaseModules)
}
export const ScreenMode = Object.freeze({
    PHONE: 3,
    PC: 1,
});
export async function createUserData(sidebar, screenMode, setAuthentication, retrieveImageFromURL, getUserInternetProtocol, ensureUniqueId, fetchServerAddress, getFirebaseModules, getDocSnapshot) {
    const userData = await getUserData();
    const userDoc = await getUserDoc();
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
    if (setAuthentication)
        setAuthentication(userData, retrieveImageFromURL, getUserInternetProtocol, ensureUniqueId, fetchServerAddress, getFirebaseModules, getDocSnapshot);
    if (screenMode === ScreenMode.PHONE) {
        if (hasUserData) {
            if (userLayoutSideContainer) {
                userLayoutSideContainer.style.display = 'flex';
                return
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
                `)
        } else {
            if (signContainer) {
                signContainer.style.display = 'flex';
                return
            }
            sidebar.insertAdjacentHTML('afterbegin', `
                    <div id="signContainer" style="display: flex; gap: 1vh; flex-direction: row;">
                        <button style="justify-content: center;" class="openSignUpContainer" id="openSignUpContainer">
                            <svg style="width: 3vh;margin-right: 0.3vh;vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M296.591495 650.911274c-12.739762 0-23.555429 10.629793-23.555429 23.766886 0 13.226033 10.558841 23.757892 23.555429 23.757892l428.151713 0c12.764346 0 23.579013-10.620799 23.579013-23.757892 0-13.232029-10.531859-23.766886-23.579013-23.766886L296.591495 650.911274zM724.743208 532.090235l-428.151713 0c-12.739762 0-23.555429 10.630792-23.555429 23.768885 0 13.222035 10.558841 23.757892 23.555429 23.757892l428.151713 0c12.764346 0 23.579013-10.629793 23.579013-23.757892C748.322222 542.627091 737.790362 532.090235 724.743208 532.090235zM296.728402 460.793774l166.485723 0c13.090125 0 23.694935-10.646781 23.694935-23.771883 0-13.218438-10.60481-23.762889-23.694935-23.762889l-166.485723 0c-13.086128 0-23.692337 10.642784-23.692337 23.762889C273.036066 450.240929 283.642474 460.793774 296.728402 460.793774zM655.311483 270.894925c0 12.820708 10.630792 23.545036 23.741903 23.545036l19.717631 0c13.206046 0 23.741903-10.535857 23.741903-23.545036L722.51292 175.40047c0-12.823306-10.629793-23.545036-23.741903-23.545036l-19.717631 0c-13.205047 0-23.741903 10.537256-23.741903 23.545036L655.311483 270.894925zM298.847565 270.894925c0 12.820708 10.629793 23.545036 23.738905 23.545036l19.718031 0c13.229031 0 23.741303-10.535857 23.741303-23.545036L366.045805 175.40047c0-12.823306-10.629793-23.545036-23.741303-23.545036l-19.718031 0c-13.226432 0-23.738905 10.537256-23.738905 23.545036L298.847565 270.894925zM843.331405 199.38361l-71.242498 0 0 61.060401 57.759839 0 0 543.285253L191.512139 803.729264 191.512139 260.444011l57.760638 0L249.272777 199.38361 178.028681 199.38361c-26.433078 0-47.577143 21.186635-47.577143 37.087255l0 570.740038c0 36.173474 21.280972 57.574764 47.577143 57.574764l665.302725 0c26.458061 0 47.576543-21.207421 47.576543-57.574764L890.907948 236.470865C890.908148 220.767112 869.601594 199.38361 843.331405 199.38361zM415.616996 199.38361 605.739293 199.38361l0 61.060401-190.122097 0L415.617196 199.38361zM744.23899 346.039777c-9.332672-9.342066-24.297526-9.294698-33.553251-0.042971l-83.874933 83.856945-34.807401-34.845775c-9.286704-9.273113-24.276541-9.342066-33.609213 0.007995-9.278709 9.273113-9.373645 24.250958-0.017988 33.605615l49.010571 48.99778c0.72251 1.000722 1.531961 1.951677 2.43435 2.859461 9.334671 9.327676 24.299525 9.286104 33.558048 0.042971l100.907385-100.923774C753.42776 370.466216 753.520697 355.321484 744.23899 346.039777z"/></svg>
                            Sign Up
                        </button>
                        <button style="justify-content: center;" class="important openSignInContainer" id="openSignInContainer">
                            <svg style="width: 3vh;margin-right: 0.1vh;vertical-align: middle;fill: currentColor;overflow: hidden;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M426.666667 736V597.333333H128v-170.666666h298.666667V288L650.666667 512 426.666667 736M341.333333 85.333333h384a85.333333 85.333333 0 0 1 85.333334 85.333334v682.666666a85.333333 85.333333 0 0 1-85.333334 85.333334H341.333333a85.333333 85.333333 0 0 1-85.333333-85.333334v-170.666666h85.333333v170.666666h384V170.666667H341.333333v170.666666H256V170.666667a85.333333 85.333333 0 0 1 85.333333-85.333334z" fill="" /></svg>
                            Sign In
                        </button>
                    </div>
                    <div class="line" id="profileLine"></div>
                `)
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
                        <a class="button important" id="premiumButton" href="pricing">
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
                        <a class="button" id="inpaintButton" href="inpaint">
                            <svg style="fill: currentColor;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M991.776 535.2c0-25.632-9.984-49.76-28.064-67.872L588.992 92.128c-36.256-36.288-99.488-36.288-135.744-0.032L317.408 227.808c-37.408 37.408-37.44 98.336-0.032 135.776l374.656 375.136c18.144 18.144 42.24 28.128 67.936 28.128 25.632 0 49.728-9.984 67.84-28.096l35.328-35.296 26.112 26.144c12.512 12.512 12.512 32.768 1.856 43.584l-95.904 82.048c-12.448 12.544-32.736 12.48-45.248 0l-245.536-245.824 0 0-3.2-3.2c-37.44-37.408-98.336-37.472-135.744-0.096l-9.632 9.632L294.4 554.336c-6.24-6.24-14.432-9.376-22.624-9.376-8.192 0-16.384 3.136-22.656 9.376 0 0 0 0.032-0.032 0.032l-22.56 22.56c0 0 0 0 0 0l-135.872 135.712c-37.408 37.408-37.44 98.304-0.032 135.776l113.12 113.184c18.688 18.688 43.296 28.064 67.872 28.064 24.576 0 49.152-9.344 67.904-28.032l135.808-135.712c0.032-0.032 0.032-0.096 0.064-0.128l22.528-22.496c6.016-6.016 9.376-14.112 9.376-22.624 0-8.48-3.36-16.64-9.344-22.624l-96.896-96.96 9.6-9.6c12.48-12.544 32.768-12.48 45.248 0.032l0-0.032 3.2 3.2 0 0.032 245.568 245.856c18.944 18.912 43.872 28.256 68.544 28.256 24.032 0 47.808-8.896 65.376-26.56l95.904-82.048c37.44-37.408 37.472-98.336 0.032-135.808l-26.112-26.112 55.232-55.168C981.76 584.928 991.776 560.832 991.776 535.2zM362.144 848.544c-0.032 0.032-0.032 0.096-0.064 0.128l-67.776 67.712c-12.48 12.416-32.864 12.448-45.312 0L135.904 803.2c-12.48-12.48-12.48-32.768 0-45.28l67.904-67.84 0 0 67.936-67.84 158.336 158.432L362.144 848.544zM918.368 557.824l-135.808 135.68c-12.064 12.096-33.152 12.096-45.216-0.032L362.656 318.368c-12.48-12.512-12.48-32.8 0-45.28l135.84-135.712C504.544 131.328 512.576 128 521.12 128s16.608 3.328 22.624 9.344l374.688 375.2c6.016 6.016 9.344 14.048 9.344 22.592C927.776 543.712 924.448 551.744 918.368 557.824z" fill="white"/><path d="M544.448 186.72c-12.352-12.672-32.64-12.832-45.248-0.48-12.64 12.384-12.832 32.64-0.48 45.248l322.592 329.216c6.24 6.368 14.528 9.6 22.848 9.6 8.096 0 16.16-3.04 22.4-9.152 12.64-12.352 12.8-32.608 0.448-45.248L544.448 186.72z" fill="white"/></svg>
                            Cloth Inpainting
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
        sidebar.insertAdjacentHTML('beforeend', sideBar)
    }
}
export function loadPageContent(setUser, retrieveImageFromURL, getUserInternetProtocol, ensureUniqueId, fetchServerAddress, getFirebaseModules, getDocSnapshot, getScreenMode, getCurrentMain, updateContent, createPages, setNavbar, setSidebar, showSidebar, removeSidebar, getSidebarActive, moveMains, setupMainSize, loadScrollingAndMain, showZoomIndicator, setScaleFactors, clamp, setAuthentication, updateMainContent, savePageState = null) {
    let previousScreenMode = null,
        cleanupEvents = null,
        cleanPages = null,
        reconstructMainStyles = null;
    let screenMode = getScreenMode();
    if (!localStorage.getItem('sidebarStateInitialized') && screenMode !== 1) {
        localStorage.setItem('sidebarState', 'keepSideBar');
        let sidebarImages = document.querySelectorAll('.sidebar img');
        sidebarImages.forEach(image => {
            image.setAttribute('loading', 'lazy')
        });
        localStorage.setItem('sidebarStateInitialized', 'true')
    }
    document.body.insertAdjacentHTML('afterbegin', `
				<nav class="navbar">
					<div class="container">
						<div class="logo">
							<img loading="eager" src="/.ico" onclick="location.href='.'" style="cursor: pointer;" alt="DeepAny.AI Logo" width="6.5vh" height="auto">
							<h2 onclick="location.href='.'" style="cursor: pointer;" translate="no">DeepAny.<span class="text-gradient" translate="no">AI</span></h2>
						</div>
					</div>
				</nav>
				<nav class="sidebar"></nav>
			`);

    function updateAspectRatio(screenMode) {
        document.documentElement.classList.toggle('ar-4-3', screenMode !== 1)
    }
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
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'))
            }, 100)
        }
    }, {
        passive: !1
    });
    let pageUpdated = !1;
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
            moveMains(mainQuery, getCurrentMain())
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
                    element.style.transition = oldTransition
                }, 1)
            })
        }
        updateAspectRatio(screenMode);
        if (screenMode !== 1) {
            if (navLinks && navLinks.length > 0) {
                navLinks.forEach(navLink => navLink.remove());
                navLinks = null
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
                    getSidebarActive() ? removeSidebar(sidebar, hamburgerMenu) : showSidebar(sidebar, hamburgerMenu, setUser, setAuthentication, retrieveImageFromURL, getUserInternetProtocol, ensureUniqueId, fetchServerAddress, getFirebaseModules, getDocSnapshot)
                });
                menuContainer.querySelector('.zoom-minus').onclick = () => {
                    scaleFactorHeight = clamp((scaleFactorHeight || 1) - 0.05, 0.1, 1);
                    scaleFactorWidth = clamp((scaleFactorWidth || 1) - 0.05, 0.1, 1);
                    setScaleFactors(scaleFactorHeight, scaleFactorWidth);
                    localStorage.setItem('scaleFactorHeight', scaleFactorHeight);
                    localStorage.setItem('scaleFactorWidth', scaleFactorWidth);
                    showZoomIndicator(`${Math.round(scaleFactorHeight * 100)}%`, scaleFactorHeight, scaleFactorWidth);
                    setTimeout(() => {
                        window.dispatchEvent(new Event('resize'))
                    }, 100)
                };
                menuContainer.querySelector('.zoom-plus').onclick = () => {
                    scaleFactorHeight = clamp((scaleFactorHeight || 1) + 0.05, 0.1, 1);
                    scaleFactorWidth = clamp((scaleFactorWidth || 1) + 0.05, 0.1, 1);
                    setScaleFactors(scaleFactorHeight, scaleFactorWidth);
                    localStorage.setItem('scaleFactorHeight', scaleFactorHeight);
                    localStorage.setItem('scaleFactorWidth', scaleFactorWidth);
                    showZoomIndicator(`${Math.round(scaleFactorHeight * 100)}%`, scaleFactorHeight, scaleFactorWidth);
                    setTimeout(() => {
                        window.dispatchEvent(new Event('resize'))
                    }, 100)
                }
            }
        } else {
            const menuContainer = document.getElementById('menu-container');
            if (menuContainer) {
                menuContainer.remove()
            }
            if (!navLinks || navLinks.length === 0) {
                navContainer.insertAdjacentHTML('beforeend', `
					<ul class="nav-links" style="display: grid;grid-template-columns: 2fr 1fr 2fr;justify-items: center;">
						<li>
							<a class="text" href="#">Services</a>
							<ul class="dropdown-menu">
								<li><a class="text" href="face-swap">Face Swap</a></li>
								<li><a class="text" href="inpaint">Cloth Inpainting</a></li>
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
						<li><a class="text" href="pricing">Pricing</a></li>
					</ul>
					<div class="nav-links" style="display: flex;justify-content: center;gap: calc(1vh * var(--scale-factor-h));">
						<button class="openSignUpContainer" id="openSignUpContainer">Sign Up</button>
						<button class="important openSignInContainer" id="openSignInContainer">Sign In</button>
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
                navLinks = document.querySelectorAll('.navbar .nav-links')
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
                    const {
                        cleanPages
                    } = await import('../defaultPageLoads/accessVariables.js');
                    cleanPages(pageContent)
                } else cleanPages(pageContent)
            }
            createPages(pageContent);
            if (oldContentLength > 0) {
                if (!reconstructMainStyles) {
                    const {
                        reconstructMainStyles
                    } = await import('../defaultPageLoads/accessVariables.js');
                    reconstructMainStyles(pageContent)
                } else reconstructMainStyles(pageContent)
            }
        }
        updateContent(pageContent);
        mainQuery = document.querySelectorAll('main');
        sidebar = document.querySelector('.sidebar');
        navbar = document.querySelector('.navbar');
        hamburgerMenu = document.querySelector('.hamburger-menu');
        createUserData(sidebar, screenMode, setAuthentication, retrieveImageFromURL, getUserInternetProtocol, ensureUniqueId, fetchServerAddress, getFirebaseModules, getDocSnapshot);
        setNavbar(navbar, mainQuery, sidebar);
        setSidebar(sidebar);
        setupMainSize(mainQuery);
        moveMains(mainQuery, getCurrentMain());
        if (cleanupEvents)
            cleanupEvents();
        cleanupEvents = loadScrollingAndMain(navbar, mainQuery, sidebar, hamburgerMenu, setUser)
    }
    const sidebarState = localStorage.getItem('sidebarState');
    if (sidebarState === 'keepSideBar')
        removeSidebar(sidebar, hamburgerMenu);
    else {
        if (screenMode !== 1) {
            setNavbar(navbar, mainQuery, sidebar);
            setSidebar(sidebar)
        }
        showSidebar(sidebar, hamburgerMenu, setUser)
    }
    sizeBasedElements();
    window.addEventListener('resize', sizeBasedElements);
    if (sidebarState === 'removeSidebar') {
        removeSidebar(sidebar, hamburgerMenu);
        localStorage.setItem('sidebarState', 'keepSideBar')
    }

    function handleButtonClick(event) {
        const button = event.currentTarget;
        button.classList.add('button-click-animation');
        if (button.textContent.trim() === 'Copy')
            button.textContent = 'Copied';
        setTimeout(() => {
            button.classList.remove('button-click-animation');
            if (button.textContent.trim() === 'Copied')
                button.textContent = 'Copy'
        }, 500)
    }
    const buttons = document.querySelectorAll('button, a.button');
    buttons.forEach(button => {
        button.addEventListener('click', handleButtonClick)
    });
    document.body.classList.add('no-animation');
    setTimeout(() => {
        document.body.classList.remove('no-animation')
    }, 0);
    const link = document.getElementById('loading-stylesheet');
    if (link)
        link.parentNode.removeChild(link);
    document.documentElement.classList.remove('loading-screen');
    pageUpdated = !0
}
let currentMain = 0;
let windowHeight = window.innerHeight;
let windowWidth = window.innerWidth;
let aspectRatio = windowHeight / windowWidth;
let sidebarActive = !0;
let navbarActive = !0;
let actualNavbarHeight = 0;
let navbarHeight = 0;
export function dispatchEvent(event) {
    window.dispatchEvent(new Event(event))
}
export function getScreenMode() {
    const aspectRatio = getAspectRatio();
    if (aspectRatio < 4 / 5) return ScreenMode.PHONE;
    if (aspectRatio <= 4 / 3) return ScreenMode.PC;
    return ScreenMode.PC
}
export function setCurrentMain(value) {
    currentMain = value
}
export function getCurrentMain() {
    return currentMain
}
export function setWindowHeight(value) {
    windowHeight = value
}
export function getWindowHeight() {
    return windowHeight
}
export function setWindowWidth(value) {
    windowWidth = value
}
export function getWindowWidth() {
    return windowWidth
}
export function setAspectRatio() {
    if (windowHeight != window.innerHeight || windowWidth != window.innerWidth || aspectRatio != window.innerWidth / window.innerHeight) {
        setWindowHeight(window.innerHeight);
        setWindowWidth(window.innerWidth);
        aspectRatio = getWindowWidth() / getWindowHeight()
    }
}
export function getAspectRatio() {
    setAspectRatio();
    return aspectRatio
}
export function setSidebarActive(value) {
    sidebarActive = value
}
export function getSidebarActive() {
    return sidebarActive
}
export function setNavbarActive(value) {
    navbarActive = value
}
export function getNavbarActive() {
    return navbarActive
}
export function setActualNavbarHeight(value) {
    actualNavbarHeight = value
}
export function getActualNavbarHeight() {
    return actualNavbarHeight
}
export function setNavbarHeight(value) {
    navbarHeight = value
}
export function getNavbarHeight() {
    return navbarHeight
}
export function setSidebar(sidebar) {
    const type = getScreenMode() !== 1 ? 2 : 0;
    if (type === 2) {
        if (getSidebarActive()) {
            sidebar.style.right = '0';
            sidebar.style.left = '0';
            sidebar.style.top = navbarHeight + "px";
            return
        }
        if (sidebar) {
            sidebar.style.right = '0';
            sidebar.style.left = '0';
            sidebar.style.top = -getWindowHeight() + "px"
        }
    } else if (type === 1) {
        if (getSidebarActive()) {
            sidebar.style.right = '0';
            return
        }
        if (sidebar)
            sidebar.style.right = -sidebar.offsetWidth + "px"
    } else if (type === 0) {
        if (getSidebarActive()) {
            sidebar.style.left = '0';
            return
        }
        if (sidebar)
            sidebar.style.left = -sidebar.offsetWidth + 'px'
    }
}
export function moveMains(mains, currentMain) {
    if (mains && mains.length > 0) {
        mains.forEach((main, i) => {
            const offset = (i - Math.min(mains.length - 1, currentMain)) * getWindowHeight();
            main.style.top = `${offset + getNavbarHeight()}px`;
            main.style.height = `${getWindowHeight() - getNavbarHeight()}px`;
            main.style.width = `${getWindowWidth()}px`
        })
    }
}
export function reconstructMainStyles() {
    let mains = document.querySelectorAll('main');
    if (mains && mains.length > 0) {
        mains.forEach((main, i) => {
            main.style.display = 'grid';
            main.style.top = `${i * getWindowHeight() + getNavbarHeight()}px`;
            main.style.height = `${getWindowHeight() - getNavbarHeight()}px`;
            main.style.width = `${getWindowWidth()}px`
        })
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
            sidebar.style.height = `${getWindowHeight() - getNavbarHeight()}px`
        }
    } else {
        if (navbar) {
            navbar.style.top = -navbar.offsetHeight + "px"
        }
        if (sidebar) {
            sidebar.style.height = '100vh'
        }
    }
}
let previousScreenMode = 0;
export function showSidebar(sidebar, hamburgerMenu, setUser = null, setAuthentication = null, retrieveImageFromURL = null, getUserInternetProtocol = null, ensureUniqueId = null, fetchServerAddress = null, getFirebaseModules = null, getDocSnapshot = null) {
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
        createUserData(sidebar, screenMode, setAuthentication, retrieveImageFromURL, getUserInternetProtocol, ensureUniqueId, fetchServerAddress, getFirebaseModules, getDocSnapshot);
        createSideBarData(sidebar);
        ['exploreButton', 'profileButton', 'premiumButton', 'faceSwapButton', 'inpaintButton', 'artGeneratorButton', 'userLayout'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', () => localStorage.setItem('sidebarState', 'removeSidebar'))
            }
        });
        if (setUser && screenMode === ScreenMode.PHONE)
            setUser();
    }
    loadSideBar();
    if (!window.hasResizeEventListener) {
        window.addEventListener('resize', loadSideBar);
        window.hasResizeEventListener = !0
    }
}
export function showNavbar(navbar, mains, sidebar) {
    setNavbarActive(navbar);
    setNavbar(navbar, mains, sidebar);
    setSidebar(sidebar)
}
export function removeSidebar(sidebar, hamburgerMenu) {
    setSidebarActive(!1);
    setSidebar(sidebar);
    if (hamburgerMenu)
        hamburgerMenu.classList.remove('open');
    localStorage.setItem('sidebarState', 'keepSideBar')
}
export function removeNavbar(navbar, mains, sidebar) {
    setNavbarActive(!1);
    setNavbar(navbar, mains, sidebar);
    setSidebar(sidebar)
}
export function cleanPages() {
    document.querySelectorAll('main').forEach(main => main.remove());
    document.querySelectorAll('.faded-content').forEach(fadedContent => fadedContent.remove())
}
export function createPages(contents) {
    const numberOfPages = contents.length;
    if (numberOfPages <= 0) return;
    for (let id = 0; id < numberOfPages; id++) {
        const mainElement = document.createElement('main');
        const mainContainer = document.createElement('div');
        mainContainer.classList.add('main-container');
        mainElement.appendChild(mainContainer);
        document.body.appendChild(mainElement)
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
        offsetText.appendChild(offsetH1)
    }
    firstText.appendChild(h1Element);
    firstText.appendChild(h2Element);
    firstText.appendChild(offsetText);
    fadedContent.appendChild(firstText);
    document.body.appendChild(fadedContent)
}
export function clamp(value, min, max) {
    return Math.max(min, Math.min(value, max))
}
export function setupMainSize(mainQuery) {
    if (!mainQuery || !mainQuery.length)
        return;
    mainQuery.forEach((main, id) => {
        main.style.display = 'grid';
        main.style.top = `${id * getWindowHeight() + getNavbarHeight()}px`;
        main.style.height = `${getWindowHeight() - getNavbarHeight()}px`;
        main.style.width = `${getWindowWidth()}px`
    })
}
const swipeThreshold = 50;
export function loadScrollingAndMain(navbar, mainQuery, sidebar, hamburgerMenu, setUser, setAuthentication, retrieveImageFromURL, getUserInternetProtocol, ensureUniqueId, fetchServerAddress, getFirebaseModules, getDocSnapshot) {
    if (!mainQuery || !mainQuery.length) return;
    let scrolling = !1;
    let touchStartY = 0;
    let touchEndY = 0;
    let touchStartTime = 0;
    let scrollAttemptedOnce = !1;
    let lastScrollTime = 0;
    let lastScrollDirection = '';

    function getCurrentMainElement() {
        const currentIndex = getCurrentMain();
        return mainQuery[currentIndex]
    }

    function showMain(id, transitionDuration = 250) {
        if (mainQuery.length > 1 && id >= 0 && id < mainQuery.length && !scrolling) {
            if (sidebarActive && getScreenMode() !== ScreenMode.PC) return;
            scrolling = !0;
            const wentDown = id >= getCurrentMain();
            setCurrentMain(id);
            if (wentDown) {
                removeNavbar(navbar, mainQuery, sidebar)
            } else {
                showNavbar(navbar, mainQuery, sidebar)
            }
            setTimeout(() => {
                scrolling = !1
            }, transitionDuration)
        }
    }
    const handleKeydown = (event) => {
        if (!scrolling) {
            if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                event.preventDefault();
                handleScroll('down')
            } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                event.preventDefault();
                handleScroll('up')
            }
        }
    };
    const handleWheel = (event) => {
        if (event.ctrlKey)
            return;
        handleScroll(event.deltaY > 0 ? 'down' : 'up')
    };
    const handleScroll = (direction) => {
        const currentTime = Date.now();
        const currentMainElement = getCurrentMainElement();
        if (!currentMainElement) return;
        const atTop = currentMainElement.scrollTop === 0;
        const atBottom = currentMainElement.scrollTop + currentMainElement.clientHeight >= currentMainElement.scrollHeight;
        const isMainScrollable = currentMainElement.scrollHeight > currentMainElement.clientHeight;
        if (scrollAttemptedOnce && (currentTime - lastScrollTime < 500 / 2)) {
            return
        }
        lastScrollTime = currentTime;
        if (scrollAttemptedOnce && direction !== lastScrollDirection) {
            scrollAttemptedOnce = !1
        }
        lastScrollDirection = direction;
        if (!isMainScrollable) {
            if (direction === 'down') {
                showMain(getCurrentMain() + 1)
            } else {
                showMain(getCurrentMain() - 1)
            }
            return
        }
        if (atTop || atBottom) {
            if (scrollAttemptedOnce) {
                if (direction === 'down') {
                    showMain(getCurrentMain() + 1)
                } else {
                    showMain(getCurrentMain() - 1)
                }
                scrollAttemptedOnce = !1
            } else {
                scrollAttemptedOnce = !0
            }
        }
    };
    const handleEvent = (e) => {
        if (!e) return;
        const {
            clientY,
            clientX
        } = e.type === 'touchstart' ? e.touches[0] : e;
        if (clientY > navbar.offsetHeight) {
            if (!clientX) return showSidebar(sidebar, hamburgerMenu, setUser, setAuthentication, retrieveImageFromURL, getUserInternetProtocol, ensureUniqueId, fetchServerAddress, getFirebaseModules, getDocSnapshot);
            if (e.type === 'click' && clientX > sidebar.offsetWidth && !e.target.closest('a')) removeSidebar(sidebar, hamburgerMenu);
        } else showNavbar(navbar, mainQuery, sidebar)
    };
    const handleTouchMove = (event) => {
        touchEndY = event.changedTouches[0].clientY;
        handleSwipe()
    };
    const handleTouchStart = (event) => {
        handleEvent(event);
        touchStartY = event.touches[0].clientY;
        touchStartTime = Date.now()
    };
    const handleSwipe = () => {
        const touchDistance = touchEndY - touchStartY;
        const touchDuration = Date.now() - touchStartTime;
        if (Math.abs(touchDistance) > swipeThreshold && touchDuration < 500) {
            const direction = touchDistance < 0 ? 'down' : 'up';
            handleScroll(direction)
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
        document.removeEventListener('touchstart', handleTouchStart)
    }
}
export function updateContent(contents) {
    const mainContainers = document.querySelectorAll('.main-container');
    mainContainers.forEach((mainContainer, id) => {
        if (contents[id]) {
            mainContainer.innerHTML = '';
            mainContainer.insertAdjacentHTML('beforeend', contents[id])
        }
    })
}

function loadSizeCache() {
    const cachedData = localStorage.getItem('sizeCache');
    return cachedData ? JSON.parse(cachedData) : {}
}
const sizeCache = loadSizeCache();
export function retrieveImages(id) {
    const img = document.getElementById(id);
    if (!img) {
        return
    }
    const applyImageAttributes = (src, srcset, sizes) => {
        img.src = src;
        img.srcset = srcset;
        img.sizes = sizes
    };
    if (sizeCache[id]) {
        const {
            src,
            srcset,
            sizes
        } = sizeCache[id];
        applyImageAttributes(src, srcset, sizes)
    } else {
        const handleImageLoad = () => {
            function getClosestSize(dimension) {
                const availableSizes = [128, 256, 512, 768];
                return availableSizes.reduce((prev, curr) => Math.abs(curr - dimension) < Math.abs(prev - dimension) ? curr : prev)
            }
            const {
                width,
                height
            } = img.getBoundingClientRect();
            const largerDimension = Math.max(width, height);
            const closestSize = getClosestSize(largerDimension);
            const newSrc = `./assets/${id}-${closestSize}.webp`;
            const newSrcset = `${newSrc} ${closestSize}w`;
            const newSizes = `${closestSize}px`;
            sizeCache[id] = {
                src: newSrc,
                srcset: newSrcset,
                sizes: newSizes
            };
            localStorage.setItem('sizeCache', JSON.stringify(sizeCache));
            applyImageAttributes(newSrc, newSrcset, newSizes)
        };
        if (img.complete) {
            handleImageLoad()
        } else {
            img.addEventListener('load', handleImageLoad, {
                once: !0
            })
        }
    }
}
export function getSizeCache() {
    return sizeCache
}

function getValueBasedOnAspectRatio() {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const aspectRatio = windowWidth / windowHeight;
    const maxAspectRatio = 0.5;
    const minAspectRatio = 0.25;
    let value = Math.max(0, Math.min(1, aspectRatio / maxAspectRatio));
    if (aspectRatio < minAspectRatio) {
        value = minAspectRatio / maxAspectRatio
    }
    return Math.min(1, value)
}
document.querySelectorAll('*[tooltip]').forEach(item => {
    item.addEventListener('mouseenter', function () {
        const tooltip = this.querySelector('.tooltip');
        if (tooltip) {
            adjustTooltipPosition(tooltip)
        }
    })
});
export function setScaleFactors(scaleFactorHeight, scaleFactorWidth, scaleFactorHeightMultiplier = 3, scaleFactorWidthMultiplier = 0) {
    let value = getValueBasedOnAspectRatio();
    value = Math.pow(value, 0.5) / 2;
    scaleFactorHeightMultiplier *= value;
    scaleFactorWidthMultiplier *= value;
    document.documentElement.style.setProperty('--scale-factor-h', scaleFactorHeight * scaleFactorHeightMultiplier);
    document.documentElement.style.setProperty('--scale-factor-w', scaleFactorWidth * scaleFactorWidthMultiplier)
}
export function showZoomIndicator(event, scaleFactorHeight, scaleFactorWidth) {
    let container = document.getElementById('zoom-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'zoom-container';
        container.className = 'indicator-container';
        document.body.appendChild(container)
    }
    let notification = container.querySelector('.indicator');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'indicator';
        container.appendChild(notification)
    }
    let messageElement = notification.querySelector('p');
    if (!messageElement) {
        messageElement = document.createElement('p');
        messageElement.style.marginRight = '4vh';
        notification.appendChild(messageElement)
    }
    let minusButton = notification.querySelector('.zoom-minus');
    let plusButton = notification.querySelector('.zoom-plus');
    if (!minusButton) {
        minusButton = document.createElement('button');
        minusButton.className = 'zoom-minus';
        minusButton.innerText = '-';
        notification.appendChild(minusButton)
    }
    if (!plusButton) {
        plusButton = document.createElement('button');
        plusButton.className = 'zoom-plus';
        plusButton.innerText = '+';
        notification.appendChild(plusButton)
    }
    minusButton.onclick = () => {
        scaleFactorHeight = clamp((scaleFactorHeight || 1) - 0.05, 0.1, 1);
        scaleFactorWidth = clamp((scaleFactorWidth || 1) - 0.05, 0.1, 1);
        setScaleFactors(scaleFactorHeight, scaleFactorWidth);
        localStorage.setItem('scaleFactorHeight', scaleFactorHeight);
        localStorage.setItem('scaleFactorWidth', scaleFactorWidth);
        showZoomIndicator(`${Math.round(scaleFactorHeight * 100)}%`, scaleFactorHeight, scaleFactorWidth);
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'))
        }, 100)
    };
    plusButton.onclick = () => {
        scaleFactorHeight = clamp((scaleFactorHeight || 1) + 0.05, 0.1, 1);
        scaleFactorWidth = clamp((scaleFactorWidth || 1) + 0.05, 0.1, 1);
        setScaleFactors(scaleFactorHeight, scaleFactorWidth);
        localStorage.setItem('scaleFactorHeight', scaleFactorHeight);
        localStorage.setItem('scaleFactorWidth', scaleFactorWidth);
        showZoomIndicator(`${Math.round(scaleFactorHeight * 100)}%`, scaleFactorHeight, scaleFactorWidth);
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'))
        }, 100)
    };
    notification.style.opacity = 1;
    document.addEventListener('click', (event) => {
        if (!container.contains(event.target)) {
            notification.style.opacity = 0
        }
    });
    messageElement.innerText = `${Math.round(scaleFactorHeight * 100)}%`
}
export function setMaxWidth() {
    const backgroundDotContainer = document.querySelector('.background-dot-container-content');
    const multibox = document.querySelector('.multibox');
    const multiboxText = document.querySelectorAll('.multibox-text');
    const arrowDwn = document.querySelector('.arrow-dwn');
    if (backgroundDotContainer && multibox && multiboxText && arrowDwn) {
        const containerWidth = backgroundDotContainer.offsetWidth;
        const containerStyle = getComputedStyle(backgroundDotContainer);
        const multiboxStyle = getComputedStyle(multibox);
        const arrowDwnStyle = getComputedStyle(arrowDwn);
        const paddingLeft = parseFloat(multiboxStyle.paddingLeft) + parseFloat(containerStyle.paddingLeft) * 2;
        const paddingRight = parseFloat(multiboxStyle.paddingRight) + parseFloat(containerStyle.paddingRight);
        const arrowWidth = parseFloat(arrowDwnStyle.width);
        const maxWidth = containerWidth - paddingLeft - paddingRight - arrowWidth;
        multiboxText.forEach(text => {
            text.style.maxWidth = `${maxWidth - 2}px`
        })
    }
}
export async function saveCountIndex(databases) {
    for (const dbConfig of databases) {
        const db = await openDB(dbConfig.indexName, dbConfig.objectStore);
        const photoCount = await countInDB(db, dbConfig.objectStore);
        localStorage.setItem(`${pageName}_${dbConfig.objectStore}-count`, photoCount)
    }
}
let downloadCancelled = !1;
export function getDownloadCancelled() {
    return downloadCancelled
}
export function setDownloadCancelled(newValue) {
    downloadCancelled = newValue
}
let abortController = null;
export const getAbortController = () => {
    if (!abortController) {
        abortController = new AbortController()
    }
    return abortController
};
export const resetAbortController = () => {
    abortController = null
};
export function deleteDownloadData(id) {
    localStorage.removeItem(`${pageName}_${pageName}_downloadedBytes_${id}`);
    localStorage.removeItem(`${pageName}_${pageName}_totalBytes_${id}`);
    const activeDataContainer = document.querySelector(".outputs .data-container.active");
    const dataContainerActive = activeDataContainer ? activeDataContainer : null;
    const downloadOutput = document.getElementById('downloadOutput');
    if (downloadOutput) {
        downloadOutput.classList.remove("important");
        downloadOutput.textContent = "Download";
        downloadOutput.disabled = !dataContainerActive
    }
    const viewOutput = document.getElementById('viewOutput');
    if (viewOutput) {
        viewOutput.classList.remove("important");
        viewOutput.textContent = "View";
        viewOutput.disabled = !dataContainerActive
    }
    const abortController = getAbortController();
    if (abortController) {
        abortController.abort();
        resetAbortController()
    }
}
let lastProgress = 0;
const progressMap = {};
export const handleDownload = async ({
    db,
    url,
    element,
    id,
    timestamp,
    active
}, databases) => {
    if (!(db && url && element && id && timestamp)) {
        alert('No Output Selected');
        return
    }
    setDownloadCancelled(!1);
    const processText = msg => setProcessText(element, msg);
    if (active && !element.classList.contains('active'))
        element.classList.add('active');
    element.innerHTML = `<initial url="${url}" id="${id}" timestamp="${timestamp}" active="${active}"><div class="process-text">Downloading...</div><div class="delete-icon"></div></initial>`;
    element.querySelector('.delete-icon').addEventListener('click', async () => {
        setDownloadCancelled(!0);
        await updateChunksInDB(db, url, []);
        deleteDownloadData(id)
    });
    if (!(id in progressMap)) {
        progressMap[id] = 0
    }
    lastProgress = progressMap[id];
    let isMobile = null;
    const activeDataContainer = document.querySelector(".outputs .data-container.active");
    const dataContainerActive = activeDataContainer ? activeDataContainer : null;
    const downloadOutput = document.getElementById('downloadOutput');
    if (downloadOutput) {
        downloadOutput.textContent = "Pause";
        downloadOutput.disabled = !dataContainerActive
    }
    const viewOutput = document.getElementById('viewOutput');
    if (viewOutput) {
        viewOutput.textContent = "View";
        isMobile = iosMobileCheck();
        if (!isMobile) {
            viewOutput.textContent = "Fetch";
            viewOutput.classList.add("important");
            viewOutput.disabled = !dataContainerActive
        }
    }
    const abortController = getAbortController();
    const {
        signal
    } = abortController;
    let downloadedBytes = parseInt(localStorage.getItem(`${pageName}_${pageName}_downloadedBytes_${id}`)) || 0;
    let totalBytes = parseInt(localStorage.getItem(`${pageName}_${pageName}_totalBytes_${id}`)) || 0;
    const previousData = await getFromDB(db);
    const entry = previousData.find(item => parseInt(item.id) === parseInt(id));
    const chunks = entry ? entry.chunks : [];
    while (!downloadCancelled) {
        try {
            const headers = downloadedBytes ? {
                'Range': `bytes=${downloadedBytes}-`
            } : {};
            const res = await fetch(url, {
                headers,
                signal
            });
            if (![200, 206, 416].includes(res.status)) {
                await updateChunksInDB(db, url, []);
                deleteDownloadData(id);
                throw new Error('Server does not support resumable downloads.')
            }
            const contentLength = res.headers.get('Content-Range')?.split('/')[1] || res.headers.get('Content-Length');
            totalBytes ||= parseInt(contentLength);
            localStorage.setItem(`${pageName}_${pageName}_totalBytes_${id}`, totalBytes);
            const reader = res.body.getReader();
            const contentType = res.headers.get('Content-Type');
            let lastSavedProgress = 0;
            while (!downloadCancelled) {
                const {
                    done,
                    value
                } = await reader.read();
                if (done) break;
                downloadedBytes += value.length;
                chunks.push(value);
                if (viewOutput && isMobile) {
                    if (viewOutput.textContent !== "View")
                        viewOutput.textContent = "View";
                    if (!viewOutput.disabled)
                        viewOutput.disabled = !0
                }
                lastProgress = (downloadedBytes / totalBytes) * 100;
                if (Math.floor(lastProgress) % 1 === 0 && Math.floor(lastProgress) > lastSavedProgress) {
                    await updateChunksInDB(db, url, chunks);
                    localStorage.setItem(`${pageName}_${pageName}_downloadedBytes_${id}`, downloadedBytes);
                    lastSavedProgress = Math.floor(lastProgress);
                    progressMap[id] = lastProgress
                }
                processText(`Downloaded: ${lastProgress.toFixed(0)}%`)
            }
            if (downloadCancelled) return;
            const blob = new Blob(chunks.map(chunk => new Uint8Array(chunk)), {
                type: contentType
            });
            const blobUrl = URL.createObjectURL(blob);
            if (Math.abs(blob.size - totalBytes) > totalBytes * 0.01) {
                alert(`Warning: The downloaded file size (${blob.size} bytes) differs significantly from expected size (${totalBytes} bytes).`);
                await updateChunksInDB(db, url, []);
                deleteDownloadData(id);
                break
            }
            if (active && !element.classList.contains('active'))
                element.classList.add('active');
            const isVideo = url.slice(-1) === '0';
            element.innerHTML = isVideo ? `<video url="${url}" id="${id}" timestamp="${timestamp}" active="${active}" playsinline preload="auto" disablePictureInPicture loop muted autoplay><source src="${blobUrl}" type="${contentType}">Your browser does not support the video tag.</video><div class="delete-icon"></div>` : `<img url="${url}" id="${id}" timestamp="${timestamp}" active="${active}" src="${blobUrl}" alt="Uploaded Photo"/><div class="delete-icon"></div>`;
            const activeContainers = document.querySelectorAll('.outputs .data-container.active');
            if (activeContainers.length > 0) {
                for (const container of activeContainers) {
                    container.classList.remove('active');
                    const element = container.querySelector('img, video, initial');
                    const id = parseInt(element.getAttribute('id'));
                    if (id) {
                        await updateActiveState(db, id, !1).catch(err => {
                            alert(`Update failed for id ${id}:`, err)
                        })
                    }
                }
            }
            element.classList.add('active');
            if (id) {
                await updateActiveState(db, id, !0).catch(err => {
                    alert(`Update failed for id ${id}: ${err}`)
                })
            }
            if (blob.size === 0) {
                alert('Warning: Media not displayable');
                await updateChunksInDB(db, url, []);
                deleteDownloadData(id);
                break
            }
            setDownloadCancelled(!0);
            await Promise.all([updateInDB(db, url, blob), saveCountIndex(databases)]);
            deleteDownloadData(id);
            setFetchableServerAdresses((await fetchServerAddresses(getDocsSnapshot('servers'))).reverse());
            return
        } catch (error) {
            if (error.name === 'AbortError') {
                processText(`Paused`);
                return
            }
            processText(`Error: ${error.message}. Retrying...`)
        }
    }
};
export const handleDelete = async (dbName, storeName, parent, databases) => {
    try {
        const element = parent.querySelector('img, video, initial');
        const domIndex = parseInt(element.getAttribute('id'));
        const db = await openDB(dbName, storeName);
        const items = await getFromDB(db);
        let itemToDelete = items.find(item => item.id === domIndex);
        if (!itemToDelete) {
            const domTimestamp = parseInt(element.getAttribute('timestamp'));
            itemToDelete = items.find(item => item.timestamp === domTimestamp)
        }
        if (itemToDelete) {
            await deleteFromDB(db, itemToDelete.id);
            await saveCountIndex(databases);
            parent.remove()
        } else {
            throw new Error('Item to delete not found.')
        }
    } catch (error) {
        alert('Error during delete operation: ' + error.message)
    }
};
export const handleFileContainerEvents = async (event, dbName, storeName, container, databases) => {
    const parent = event.target.closest('.data-container');
    if (!parent) return;

    if (event.target.classList.contains('delete-icon')) {
        return await handleDelete(dbName, storeName, parent, databases);
    }

    if (storeName === 'outputs') {
        const viewOutput = document.getElementById('viewOutput');
        if (viewOutput) viewOutput.disabled = !1;

        const downloadOutput = document.getElementById('downloadOutput');
        if (downloadOutput) downloadOutput.disabled = !1;
    }

    const db = openDB(dbName, storeName);
    for (const activeElement of container.querySelectorAll(".data-container.active")) {
        activeElement.classList.remove("active");
        const element = activeElement.querySelector('img, video, initial');
        const domIndex = parseInt(element.getAttribute('id'));
        if (!isNaN(domIndex)) {
            await updateActiveState(await db, domIndex, !1);
        } else {
            alert(`Invalid id for active photo: ${activeElement}`);
        }
    }

    const element = parent.querySelector('img, video, initial');
    const domIndex = parseInt(element.getAttribute('id'));
    if (!isNaN(domIndex)) {
        if (parent.classList.contains("active")) {
            parent.classList.remove("active");
            await updateActiveState(await db, domIndex, !1);
        } else {
            parent.classList.add("active");
            await updateActiveState(await db, domIndex, !0);

            // Show video frame selector if storeName === 'inputs'
            if (storeName === 'inputs' && element.tagName.toLowerCase() === 'video') {
                showFrameSelector(element);
            }
        }
    } else {
        alert(`The provided ID for the parent photo "${parent}" is invalid. Please check the ID and try again.`);
    }
};

async function showFrameSelector(videoElement) {
    const userDoc = await getUserDoc();
    if (document.getElementById('wrapper') || (!userDoc.promoter && !userDoc.admin)) return;

    const fps = parseFloat(videoElement.getAttribute('fps')) || 30;

    const wrapper = document.createElement('div');
    wrapper.id = 'wrapper';
    wrapper.innerHTML = `
        <div class="background-container" style="display: flex;flex-direction: column;">
            <a class="background-dot-container">
                <div class="background-dot-container-content" style="padding: 0;">
                    <div id="innerContainer" class="background-container" style="display: contents;">
                        <div style="position: relative; display: contents; max-width: 100vw; max-height: 60vh;">
                            <video></video>
                            <input type="range" min="0" max="0" value="0" style=" position: absolute; bottom: calc(2vh * var(--scale-factor-h)); left: 50%; transform: translateX(-50%); width: 97%; z-index: 2;"/>
                        </div>
                        <button class="close-button" style=" position: absolute; top: 1vh; right: 1vh; cursor: pointer; width: 4vh; height: 4vh; padding: 0; margin: 0;">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0; width: calc((3.5vh * var(--scale-factor-h)));" class="lucide lucide-x">
                                <path d="M18 6 6 18"></path>
                                <path d="m6 6 12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </a>

            <a class="background-dot-container">
                <div class="background-dot-container-content">
                    <div id="innerContainer" class="background-container" style="display: contents;">
                        <div style="display: flex;justify-content: space-around;gap: calc(1.5vh* var(--scale-factor-h));">
                            <button class="wide" id="">Detect Multiple Faces [Early Access - Not Working Yet]</button>
                            <button class="wide" id="">Select Face [Early Access - Not Working Yet]</button>
                        </div>
                    </div>
                </div>
            </a>
        </div>
    `;

    let screenMode = getScreenMode();
    let firstBackgroundContainer = wrapper.getElementsByClassName('background-container')[0];
    if (firstBackgroundContainer) {
        firstBackgroundContainer.style.width = screenMode === 1 ? '75%' : '100%';
    }

    const clonedVideo = videoElement.cloneNode(true);
    clonedVideo.style.width = '100%';
    clonedVideo.style.height = '100%';
    clonedVideo.style.borderRadius = 'var(--border-radius)';
    clonedVideo.style.objectFit = 'contain';
    clonedVideo.controls = false;
    clonedVideo.autoplay = false;
    clonedVideo.loop = false;
    clonedVideo.pause();

    const slider = wrapper.querySelector('input[type="range"]');
    const closeButton = wrapper.querySelector('.close-button');

    slider.addEventListener('input', () => {
        const frame = parseInt(slider.value, 10);
        clonedVideo.currentTime = frame / fps;
    });

    clonedVideo.addEventListener('loadedmetadata', () => {
        slider.max = Math.floor(clonedVideo.duration * fps);
    });

    closeButton.addEventListener('click', () => {
        wrapper.remove();
    });

    wrapper.addEventListener('mousedown', (event) => {
        if (event.target === wrapper) {
            document.body.removeChild(wrapper);
        }
    });

    const videoContainer = wrapper.querySelector('video');
    videoContainer.replaceWith(clonedVideo);

    // Add click event listener to toggle play/pause
    let isPlaying = false;
    clonedVideo.addEventListener('click', () => {
        if (isPlaying) {
            clonedVideo.pause();
        } else {
            clonedVideo.play();
            updateSlider();
        }
        isPlaying = !isPlaying;
    });

    // Update the slider value as the video plays
    function updateSlider() {
        const updateInterval = setInterval(() => {
            if (clonedVideo.paused || clonedVideo.ended) {
                clearInterval(updateInterval);
                return;
            }
            const frame = Math.floor(clonedVideo.currentTime * fps);
            slider.value = frame;
        }, 1000 / fps); // Update the slider every frame (depending on FPS)
    }

    document.body.appendChild(wrapper);
}


export const handleUpload = async (event, dataBaseIndexName, dataBaseObjectStoreName, databases) => {
    try {
        if (!window.indexedDB) {
            alert('Your browser does not support IndexedDB.');
            return
        }
        const db = await openDB(dataBaseIndexName, dataBaseObjectStoreName).catch((error) => {
            if (error.name === 'QuotaExceededError') {
                alert('Storage limit exceeded. Please free up space or clear cache.')
            } else if (error.name === 'SecurityError') {
                alert('Database access is restricted. Please check browser settings or disable private mode.')
            } else {
                alert(`Opening media database failed: ${error.message || error}`)
            }
            return null
        });
        if (!db) {
            return
        }
        const files = Array.from(event.target.files);
        const mediaContainer = document.querySelector(`.${dataBaseObjectStoreName}`);
        const fragment = document.createDocumentFragment();
        const newMedia = [];
        const processFile = async (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const blob = new Blob([e.target.result], {
                            type: file.type
                        });
                        const {
                            id,
                            timestamp
                        } = await addToDB(db, blob);
                        saveCountIndex(databases);
                        newMedia.push({
                            id,
                            timestamp,
                            blob,
                            isVideo: file.type.startsWith('video')
                        });
                        resolve()
                    } catch (error) {
                        alert(`Processing media failed: ${error.message || error}`);
                        reject(`Processing media failed: ${error.message}`)
                    }
                };
                reader.readAsArrayBuffer(file)
            })
        };
        await Promise.all(files.map(processFile));
        const activeContainers = mediaContainer.querySelectorAll('.data-container.active');
        if (activeContainers.length > 0) {
            for (const container of activeContainers) {
                container.classList.remove('active');
                const element = container.querySelector('img, video, initial');
                const id = parseInt(element.getAttribute('id'));
                if (id) {
                    await updateActiveState(db, id, !1).catch(err => {
                        alert(`Update failed for id ${id}: ${err}`)
                    })
                }
            }
        }
        newMedia.reverse();
        for (const {
            id,
            timestamp,
            blob,
            isVideo
        }
            of newMedia) {
            const element = document.createElement('div');
            element.className = 'data-container';
            element.setAttribute('tooltip', '');
            const blobUrl = URL.createObjectURL(blob);
            if (isVideo) {
                element.innerHTML = `<video timestamp="${timestamp}" id="${id}" playsinline preload="auto" disablePictureInPicture loop muted autoplay><source src="${blobUrl}">Your browser does not support the video tag.</video><div class="delete-icon"></div>`;
                if (dataBaseObjectStoreName === 'inputs') {
                    element.innerHTML = `<div class="tooltip cursor">Loading...</div>` + element.innerHTML;
                    const tooltip = element.querySelector('.tooltip');
                    if (tooltip && tooltip.classList.contains('cursor')) {
                        function updateTooltipPosition(event) {
                            tooltip.style.position = 'fixed';
                            tooltip.style.left = `${event.clientX}px`;
                            tooltip.style.top = `${event.clientY - 15}px`
                        }
                        element.addEventListener('mouseenter', () => {
                            document.addEventListener('mousemove', updateTooltipPosition)
                        });
                        element.addEventListener('mouseleave', () => {
                            document.removeEventListener('mousemove', updateTooltipPosition)
                        })
                    }
                    const keepFPS = document.getElementById('keepFPS');
                    const fpsSlider = document.getElementById("fps-slider");
                    const removeBanner = document.getElementById("removeBanner");
                    let lastMetadata = null;

                    function handleMetadataUpdate(metadata) {
                        lastMetadata = metadata;
                        const tooltip = element.querySelector('.tooltip');
                        if (tooltip && metadata.fps) {
                            const fpsSliderValue = !keepFPS.checked ? fpsSlider.value : 60;
                            const fps = Math.min(fpsSliderValue, metadata.fps);
                            const videoDurationTotalFrames = Math.floor(metadata.duration * fps);
                            const singleCreditForTotalFrameAmount = 120;
                            const removeBannerStateMultiplier = removeBanner && removeBanner.checked ? 2 : 1;
                            const neededCredits = Math.floor(Math.max(1, videoDurationTotalFrames / singleCreditForTotalFrameAmount) * removeBannerStateMultiplier);
                            tooltip.textContent = `${neededCredits} Credits`
                        }
                    } [keepFPS, fpsSlider, removeBanner].forEach(element => {
                        element.addEventListener('change', () => {
                            if (lastMetadata) handleMetadataUpdate(lastMetadata);
                        })
                    });
                    calculateMetadata(element.querySelector('video'), handleMetadataUpdate)
                }
            } else {
                element.innerHTML = `<img timestamp="${timestamp}" id="${id}" src="${blobUrl}" alt="Uploaded Photo"/><div class="delete-icon"></div>`;
                if (dataBaseObjectStoreName === 'inputs') {
                    element.innerHTML = `<div class="tooltip cursor">Loading...</div>` + element.innerHTML;
                    const tooltip = element.querySelector('.tooltip');
                    if (tooltip && tooltip.classList.contains('cursor')) {
                        function updateTooltipPosition(event) {
                            tooltip.style.position = 'fixed';
                            tooltip.style.left = `${event.clientX}px`;
                            tooltip.style.top = `${event.clientY - 15}px`
                        }
                        element.addEventListener('mouseenter', () => {
                            document.addEventListener('mousemove', updateTooltipPosition)
                        });
                        element.addEventListener('mouseleave', () => {
                            document.removeEventListener('mousemove', updateTooltipPosition)
                        })
                    }
                    const removeBanner = document.getElementById("removeBanner");
                    let lastMetadata = null;

                    function handleMetadataUpdate(metadata) {
                        lastMetadata = metadata;
                        const tooltip = element.querySelector('.tooltip');
                        if (tooltip) {
                            const neededCredits = removeBanner.checked ? 2 : 1;
                            tooltip.textContent = `${neededCredits} Credits`
                        }
                    }
                    removeBanner.addEventListener('change', () => {
                        if (lastMetadata) handleMetadataUpdate(lastMetadata);
                    });
                    calculateMetadata(element.querySelector('img'), handleMetadataUpdate)
                }
            }
            fragment.appendChild(element);
            if (id === newMedia[newMedia.length - 1].id) {
                element.classList.add('active');
                if (id) {
                    await updateActiveState(db, id, !0).catch(err => {
                        alert(`Update failed for id ${id}: ${err}`)
                    })
                }
            }
        }
        mediaContainer.insertBefore(fragment, mediaContainer.firstChild);
        localStorage.setItem(`${pageName}_${dataBaseObjectStoreName}-count`, await countInDB(db))
    } catch (error) {
        alert(`Opening media database failed: ${error.message || error}`)
    }
};
export const setupFileUpload = ({
    buttonId,
    inputId,
    dataBaseIndexName,
    dataBaseObjectStoreName,
    databases,
    changeHandler
}) => {
    const input = document.getElementById(inputId);
    if (!input) return;
    document.getElementById(buttonId).addEventListener('click', () => input.click());
    input.addEventListener('change', async (event) => {
        await changeHandler(event, dataBaseIndexName, dataBaseObjectStoreName, databases)
    })
};
export async function setClientStatus(message) {
    const outputs = document.querySelector('.outputs');
    if (outputs && outputs.firstChild) {
        const processTextElement = outputs.firstChild.querySelector('.process-text');
        if (processTextElement) {
            processTextElement.textContent = message
        }
    }
}
export const setProcessText = (element, message) => {
    const processTextElement = element.querySelector('.process-text');
    if (processTextElement)
        processTextElement.textContent = message
};
let fetchableServerAddresses = [];
let downloadFile = !1;
export function getFetchableServerAdresses() {
    return [...fetchableServerAddresses]
}
export function setFetchableServerAdresses(newValue) {
    fetchableServerAddresses.length = 0;
    fetchableServerAddresses.push(...newValue)
}
export async function checkServerStatus(databases, userId) {
    const cacheKey = `${pageName}-serverData`;
    const ttl = 1 * 60 * 60 * 1000;
    const serverListContainer = document.getElementById('serverList');
    if (serverListContainer) {
        serverListContainer.innerHTML = '';
        const cachedData = getCache(cacheKey, ttl);
        if (cachedData) {
            cachedData.forEach((serverData, serverIndex) => {
                const newTime = calculateNewTime(serverData.remainingTime, serverData.queueAmount);
                const listItem = document.createElement('div');
                listItem.innerHTML = `<p>Server ${serverIndex + 1} (${serverData.SERVER_1}) - Queue: ${serverData.queueAmount !== null ? serverData.queueAmount : Infinity} - ${serverData.frameCount || 0}/${serverData.totalFrames || 0} (%${serverData.processingAmount || 0}) - ${newTime}</p>`;
                serverListContainer.appendChild(listItem)
            })
        }
    }
    if (!getFetchableServerAdresses() || !getFetchableServerAdresses().length) {
        try {
            setFetchableServerAdresses((await fetchServerAddresses(getDocsSnapshot('servers'))).reverse())
        } catch (error) {
            alert(`Error fetching server addresses: ${error.message}`);
            return
        }
    }
    if (!getFetchableServerAdresses()) return;
    const serverPromises = getFetchableServerAdresses().map(async (server) => {
        try {
            const response = await fetch(`${server}/get-online`);
            if (response.status === STATUS_OK) {
                const data = await response.json();
                return {
                    queueAmount: data.server,
                    remainingTime: data.remainingTime,
                    elapsedTime: data.elapsedTime,
                    frameCount: data.frameCount,
                    totalFrames: data.totalFrames,
                    requestQueue: data.requestQueue,
                    uniqueId: data.uniqueId,
                    processingAmount: data.processingAmount,
                    SERVER_1: data.SERVER_1,
                }
            } else {
                return {
                    queueAmount: Infinity,
                    remainingTime: 0,
                    SERVER_1: "Unknown"
                }
            }
        } catch (error) {
            return {
                queueAmount: Infinity,
                remainingTime: 0,
                SERVER_1: "Offline"
            }
        }
    });
    const results = await Promise.all(serverPromises);
    if (serverListContainer) {
        serverListContainer.innerHTML = '';
        results.forEach((serverData, serverIndex) => {
            const newTime = calculateNewTime(serverData.remainingTime, serverData.queueAmount);
            const listItem = document.createElement('div');
            listItem.innerHTML = `<p>Server ${serverIndex + 1} (${serverData.SERVER_1}) - Queue: ${serverData.queueAmount} - ${serverData.frameCount || 0}/${serverData.totalFrames || 0} (%${serverData.processingAmount || 0}) - ${newTime}</p>`;
            serverListContainer.appendChild(listItem)
        });
        setCache(cacheKey, results, ttl)
    }
    if (!userId) {
        return
    }
    showDailyCredits();
    const serverWithUserRequest = findServerWithUserRequest(results, userId);
    if (serverWithUserRequest) {
        handleUserRequest(serverWithUserRequest, databases, userId)
    } else {
        startProcessBtn.disabled = !1;
        if (!downloadFile) return;
        const db = await openDB(`outputDB-${pageName}`, 'outputs');
        const outputs = (await getFromDB(db)).reverse();
        const lastOutput = outputs[outputs.length - 1];
        const data = await fetchProcessState(lastOutput.url);
        setClientStatus(data.server);
        showNotification(`Request ${data.status} With Status ${data.server}.`, 'Fetch Information', 'default');
        if (data.status === 'completed') {
            updateDownloadFile(!1, databases, userId);
            setCurrentUserDoc(getDocSnapshot);
            await handleLastOutputDownload(lastOutput, databases)
        }
    }
}

function has24HoursPassed(lastCreditEarned, currentTime) {
    return currentTime - lastCreditEarned >= 24 * 60 * 60 * 1000;
}

async function showDailyCredits() {
    const userDoc = await getUserDoc();
    if (document.getElementById('wrapper') || !userDoc) return;

    const serverAddressAPI = await fetchServerAddress(getDocSnapshot('servers', '3050-1'), 'API');
    let timePassed = false;

    try {
        const response = await fetch(`${serverAddressAPI}/get-time`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        const timeData = await response.json();
        timePassed = has24HoursPassed(userDoc.lastCreditEarned || 0, timeData.currentTime);
    } catch (error) {
        showNotification(message, 'Daily Credits', 'warning');
        return;
    }

    if (!timePassed) {
        return;
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'wrapper';
    wrapper.innerHTML = `
        <div class="background-container" style="display: flex;flex-direction: column;">
            <a class="background-dot-container">
                <div class="background-dot-container-content">
                    <div id="innerContainer" class="background-container" style="display: contents;">
                        <h2 style="margin-right: 6vh;">Redeem Daily Credits!</h2>
                        <p>You can also redeem daily credits from profile section.</p>
                        <button class="wide important" id="redeemDailyCredits" type="button">
                            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path id="Vector" d="M15.8533 5.76333L12.1773 2.08733C12.0843 1.99433 11.9588 1.94183 11.8278 1.94083L4.23825 1.88283C4.10425 1.88183 3.97575 1.93433 3.88075 2.02933L0.14625 5.76383C-0.04875 5.95933 -0.04875 6.27533 0.14625 6.47083L7.64625 13.9708C7.84175 14.1663 8.15825 14.1663 8.35325 13.9708L15.8533 6.47083C16.0488 6.27533 16.0488 5.95883 15.8533 5.76333ZM12.9533 6.47433L9.37725 10.0858C9.18275 10.2823 8.86625 10.2838 8.66975 10.0893C8.47325 9.89483 8.47175 9.57833 8.66625 9.38183L11.9038 6.11333L10.8098 4.94733C10.6183 4.74883 10.6243 4.43183 10.8233 4.24033C10.9203 4.14633 11.0513 4.09683 11.1858 4.10083C11.3208 4.10483 11.4483 4.16333 11.5393 4.26283L12.9633 5.78133C13.1463 5.97733 13.1423 6.28333 12.9533 6.47433Z" fill="white"></path>
                            </svg>
                            Redeem Daily Credits
                        </button>

                        <div style="display: flex; justify-content: center; width: 100%; align-items: center;">
                            <div class="line"></div>
                            <p style="padding: 0 calc(1vh * var(--scale-factor-h)); white-space: nowrap;">or referral people</p>
                            <div class="line"></div>
                        </div>

                        <div id="infoMessage" style="color: red; display: none;"></div>

                        <div>
                            <label>Referral link</label>
                            <input id="referralLink" class="important-outline" readonly>
                        </div>

                        <div>
                            <label>Check Referral Data</label>
                            <button class="wide" id="redeemReferralCredits">
                                <svg xmlns="http://www.w3.org/2000/svg" version="1.0" viewBox="0 0 512.000000 512.000000" preserveAspectRatio="xMidYMid meet">
                                    <g transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)" fill="white" stroke="none">
                                        <path d="M2433 5106 c-251 -58 -433 -270 -450 -528 -12 -171 47 -329 165 -447 231 -230 593 -230 824 0 117 117 176 276 165 442 -16 239 -164 436 -387 513 -91 32 -227 40 -317 20z"/>
                                        <path d="M2367 3824 c-205 -32 -471 -135 -633 -245 -148 -101 -234 -298 -221 -507 8 -141 73 -235 184 -268 71 -21 1657 -21 1729 1 67 20 117 64 151 133 26 52 28 66 28 167 -1 309 -128 466 -501 618 -258 106 -498 139 -737 101z"/>
                                        <path d="M2511 2548 c-13 -7 -34 -26 -45 -41 -20 -27 -21 -41 -24 -370 l-4 -342 -270 -215 c-149 -118 -279 -228 -289 -245 -25 -40 -24 -75 4 -116 25 -38 77 -60 120 -52 14 3 144 99 288 214 144 115 265 209 269 209 4 0 125 -94 269 -209 144 -115 273 -211 288 -214 62 -12 124 30 138 92 14 63 -8 86 -298 316 l-276 220 0 328 c-1 346 -4 370 -49 410 -26 24 -90 32 -121 15z"/>
                                        <path d="M975 2324 c-219 -33 -407 -187 -479 -393 -24 -71 -33 -233 -16 -310 30 -138 131 -283 254 -362 289 -188 675 -83 830 225 114 224 73 488 -103 666 -75 76 -132 112 -229 145 -66 23 -197 38 -257 29z"/>
                                        <path d="M3973 2320 c-176 -32 -340 -155 -419 -315 -83 -169 -83 -354 2 -521 99 -197 291 -315 514 -317 167 -1 290 50 411 172 83 83 137 178 159 282 18 81 8 240 -18 313 -65 179 -211 317 -391 370 -69 20 -191 28 -258 16z"/>
                                        <path d="M906 1039 c-168 -18 -362 -81 -561 -182 -190 -97 -281 -202 -325 -373 -24 -93 -26 -229 -5 -301 20 -66 80 -134 144 -162 l51 -21 852 2 853 3 46 27 c97 57 129 130 129 292 0 300 -128 456 -496 607 -125 51 -291 94 -416 108 -108 12 -156 12 -272 0z"/><path d="M3936 1040 c-211 -26 -441 -106 -636 -220 -129 -75 -218 -191 -255 -330 -19 -69 -19 -271 -1 -321 19 -54 64 -107 115 -137 l46 -27 853 -3 852 -2 51 21 c64 28 124 96 144 162 21 72 19 208 -5 301 -27 105 -63 169 -140 247 -53 54 -88 77 -195 131 -152 77 -298 130 -434 158 -113 23 -298 32 -395 20z"/>
                                    </g>
                                </svg>
                                Redeem Referral Credits
                            </button>
                        </div>

                        <p id="contactSupport" style="cursor: pointer;">Contact support?</p>

                        <button class="close-button" style="position: absolute;top: 1vh;right: 1vh;cursor: pointer;width: 4vh;height: 4vh;padding: 0;">
                            <svg style="margin: 0;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x">
                                <path d="M18 6 6 18"></path>
                                <path d="m6 6 12 12"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </a>
        </div>
    `;

    const userData = await getUserData();
    if (!userData) {
        return;
    }

    const userId = userData.uid;

    let screenMode = getScreenMode();
    let firstBackgroundContainer = wrapper.getElementsByClassName('background-container')[0];
    if (firstBackgroundContainer) {
        firstBackgroundContainer.style.width = screenMode !== 1 ? '100%' : '70vh';
    }

    const closeButton = wrapper.querySelector('.close-button');
    closeButton.addEventListener('click', () => {
        wrapper.remove();
    });

    wrapper.addEventListener('mousedown', (event) => {
        if (event.target === wrapper) {
            document.body.removeChild(wrapper);
        }
    });

    document.body.appendChild(wrapper);

    const linkElement = document.getElementById('referralLink');
    if (linkElement && userDoc.referral) {
        linkElement.value = `https://deepany.ai/?referral=${encodeURIComponent(userDoc.referral)}`;
    }

    const infoMessage = document.getElementById('infoMessage');
    infoMessage.style.display = 'unset';
    infoMessage.textContent = 'Checking your daily credits qualification...';
    infoMessage.style.color = 'white';

    try {
        const response = await fetch(`${serverAddressAPI}/check-daily-credit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        });

        const { message } = await response.json();
        infoMessage.style.display = 'unset';
        infoMessage.textContent = message;
        infoMessage.style.color = response.status !== STATUS_OK ? 'red' : 'white';
        setCurrentUserDoc(getDocSnapshot);
        showNotification(message, 'Daily Credits', 'normal');
    } catch ({ message }) {
        infoMessage.style.display = 'unset';
        infoMessage.textContent = message;
        infoMessage.style.color = response.status !== STATUS_OK ? 'red' : 'white';
        showNotification(message, 'Daily Credits', 'warning');
    }

    const referralCredits = document.getElementById('redeemReferralCredits');
    referralCredits.addEventListener('click', async () => {
        referralCredits.disabled = true;
        infoMessage.style.display = 'unset';
        infoMessage.textContent = 'Checking your daily credits qualification...';
        infoMessage.style.color = 'white';

        try {
            showNotification("Waiting for a response...", 'Referral Credits', 'normal');
            const response = await fetch(`${serverAddressAPI}/get-referral-credits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });

            const { message } = await response.json();
            infoMessage.style.display = 'unset';
            infoMessage.textContent = message;
            infoMessage.style.color = response.status !== STATUS_OK ? 'red' : 'white';
            setCurrentUserDoc(getDocSnapshot);
            showNotification(message, 'Referral Credits', 'normal');
            await setCurrentUserDoc(getDocSnapshot, !0);
        } catch ({ message }) {
            infoMessage.style.display = 'unset';
            infoMessage.textContent = message;
            infoMessage.style.color = response.status !== STATUS_OK ? 'red' : 'white';
            showNotification(message, 'Referral Credits', 'warning');
        } finally {
            referralCredits.disabled = false;
        }
    });

    const dailyCredits = document.getElementById('redeemDailyCredits');
    dailyCredits.addEventListener('click', async () => {
        dailyCredits.disabled = true;
        infoMessage.style.display = 'unset';
        infoMessage.textContent = 'Checking your referrals...';
        infoMessage.style.color = 'white';

        try {
            showNotification("Waiting for a response...", 'Daily Credits', 'normal');
            const response = await fetch(`${serverAddressAPI}/earn-daily-credit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });

            const { message } = await response.json();
            infoMessage.style.display = 'unset';
            infoMessage.textContent = message;
            infoMessage.style.color = response.status !== STATUS_OK ? 'red' : 'white';
            setCurrentUserDoc(getDocSnapshot);
            showNotification(message, 'Daily Credits', 'normal');
            await setCurrentUserDoc(getDocSnapshot, !0);
        } catch ({ message }) {
            infoMessage.style.display = 'unset';
            infoMessage.textContent = message;
            infoMessage.style.color = response.status !== STATUS_OK ? 'red' : 'white';
            showNotification(message, 'Daily Credits', 'warning');
        } finally {
            dailyCredits.disabled = false;
        }
    });
}
let intervalId;
export const setDynamicInterval = (databases, userId) => {
    if (intervalId) {
        clearInterval(intervalId)
    }
    intervalId = setInterval(() => checkServerStatus(databases, userId), downloadFile ? 1000 : 5000)
};
export function updateDownloadFile(newValue, databases, userId) {
    downloadFile = newValue;
    setDynamicInterval(databases, userId)
}

function calculateNewTime(remainingTime, queueAmount) {
    if (!remainingTime) {
        return '00:00'
    }
    const timeAdd = Math.max(0, (queueAmount - 1) * 10);
    const [hours, minutes] = remainingTime.split(':').map(Number);
    const currentDate = new Date();
    currentDate.setHours(hours);
    currentDate.setMinutes(minutes + timeAdd);
    const newHours = ('0' + currentDate.getHours()).slice(-2);
    const newMinutes = ('0' + currentDate.getMinutes()).slice(-2);
    const newTime = `${newHours}:${newMinutes}`;
    return newTime
}
export function findServerWithUserRequest(results, userId) {
    return results.find(serverData => serverData.requestQueue?.includes(userId))
}
export function handleUserRequest(serverData, databases, userId) {
    if (!serverData)
        return;
    const {
        processingAmount,
        remainingTime,
        elapsedTime,
        requestQueue
    } = serverData;
    const userQueueIndex = requestQueue.indexOf(userId);
    if (userQueueIndex === 0) {
        updateClientStatus(processingAmount, remainingTime, elapsedTime)
    } else {
        setClientStatus(`Queue ${userQueueIndex}...`)
    }
    if (downloadFile)
        return;
    updateDownloadFile(!0, databases, userId)
}
export function getSelectedInputId(checkboxes) {
    for (let checkbox of checkboxes) {
        if (checkbox.checked) {
            return checkbox.id
        }
    }
    return null
}
export async function handleLastOutputDownload(lastOutput, databases) {
    const blobIsEmpty = !lastOutput.blob || Object.entries(lastOutput.blob).length === 0;
    if (blobIsEmpty) {
        await handleDownload({
            db: await openDB(`outputDB-${pageName}`, 'outputs'),
            url: lastOutput.url,
            timestamp: lastOutput.timestamp,
            element: document.querySelector('.outputs').firstChild,
            id: lastOutput.id,
            active: lastOutput.active,
        }, databases)
    }
}
export function updateClientStatus(processingAmount, remainingTime, elapsedTime) {
    const statusMessage = processingAmount > 0 ? `%${processingAmount} | Remaining/Elapsed: ${remainingTime}/${elapsedTime}` : 'Processing...';
    setClientStatus(statusMessage)
}
export function createSectionAndElements() {
    document.querySelectorAll('.nav-links').forEach(group => {
        const groupLinks = group.querySelectorAll('.text');
        groupLinks.forEach(link => {
            link.addEventListener('click', function () {
                const isActive = this.classList.contains('active');
                groupLinks.forEach(link => link.classList.remove('active'));
                groupLinks.forEach(link => {
                    const targetSection = document.getElementById(link.getAttribute('for'));
                    if (targetSection) targetSection.style.display = 'none'
                });
                if (!isActive) {
                    this.classList.add('active');
                    const targetSection = document.getElementById(this.getAttribute('for'));
                    if (targetSection) {
                        targetSection.style.display = 'flex'
                    }
                }
            })
        })
    });
    const multiboxes = document.querySelectorAll(".multibox");
    multiboxes.forEach(multibox => {
        const selectBtn = multibox;
        const items = multibox.querySelectorAll(".item");
        const tooltip = multibox.querySelector(".tooltip");
        const btnText = multibox.querySelector(".multibox-text");
        const listItems = multibox.querySelector(".list-items");
        selectBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            multiboxes.forEach(box => {
                if (box !== selectBtn) {
                    box.classList.remove("open");
                    box.querySelector(".list-items").style.display = "none"
                }
            });
            selectBtn.classList.toggle("open");
            listItems.style.display = selectBtn.classList.contains("open") ? "flex" : "none"
        });
        items.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const checkedItems = multibox.querySelectorAll(".item.checked input[type='checkbox']");
            const selectedNames = Array.from(checkedItems).map(checkbox => {
                const label = checkbox.parentElement.querySelector('span');
                return label ? label.textContent.trim() : ''
            }).filter(name => name !== '');
            btnText.innerText = selectedNames.length > 0 ? selectedNames.join(', ') : btnText.getAttribute("title");
            checkbox.addEventListener("change", () => {
                item.classList.toggle("checked", checkbox.checked);
                const checkedItems = multibox.querySelectorAll(".item.checked input[type='checkbox']");
                const selectedNames = Array.from(checkedItems).map(checkbox => {
                    const label = checkbox.parentElement.querySelector('span');
                    return label ? label.textContent.trim() : ''
                }).filter(name => name !== '');
                btnText.innerText = selectedNames.length > 0 ? selectedNames.join(', ') : btnText.getAttribute("title")
            })
        });
        listItems.addEventListener("mouseenter", () => {
            tooltip.style.display = "none"
        });
        listItems.addEventListener("mouseleave", () => {
            tooltip.style.display = "flex"
        })
    });
    const comboboxes = document.querySelectorAll(".combobox");
    comboboxes.forEach(combobox => {
        const btnText = combobox.querySelector(".combobox-text");
        const tooltip = combobox.querySelector(".tooltip");
        const defaultTitle = btnText.getAttribute("title");
        btnText.innerText = defaultTitle;
        const listItems = combobox.querySelector(".list-items");
        const selectBtn = combobox;
        const sliderInput = combobox.querySelector('input[type="range"]');
        if (sliderInput) {
            sliderInput.addEventListener("click", (event) => {
                event.stopPropagation()
            })
        }
        selectBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            comboboxes.forEach(cbx => {
                if (cbx !== combobox) {
                    const otherListItems = cbx.querySelector(".list-items");
                    otherListItems.style.display = "none";
                    cbx.classList.remove("open")
                }
            });
            selectBtn.classList.toggle("open");
            listItems.style.display = selectBtn.classList.contains("open") ? "flex" : "none"
        });
        const items = combobox.querySelectorAll(".item");
        items.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox.checked) {
                items.forEach(i => {
                    const cb = i.querySelector('input[type="checkbox"]');
                    cb.checked = !1;
                    i.classList.remove("checked")
                });
                if (sliderInput)
                    sliderInput.parentElement.style.display = 'flex';
                checkbox.checked = !0;
                item.classList.add("checked");
                btnText.innerText = defaultTitle + ": " + checkbox.parentElement.querySelector('span').textContent.trim()
            } else {
                const anyChecked = [...items].some(i => i.querySelector('input[type="checkbox"]').checked);
                if (!anyChecked) {
                    btnText.innerText = defaultTitle + ": " + "Unspecified";
                    if (sliderInput)
                        sliderInput.parentElement.style.display = 'none'
                }
                item.classList.remove("checked")
            }
            checkbox.addEventListener("change", () => {
                if (checkbox.checked) {
                    items.forEach(i => {
                        const cb = i.querySelector('input[type="checkbox"]');
                        cb.checked = !1;
                        i.classList.remove("checked")
                    });
                    if (sliderInput)
                        sliderInput.parentElement.style.display = 'flex';
                    checkbox.checked = !0;
                    item.classList.add("checked");
                    btnText.innerText = defaultTitle + ": " + checkbox.parentElement.querySelector('span').textContent.trim()
                } else {
                    const anyChecked = [...items].some(i => i.querySelector('input[type="checkbox"]').checked);
                    if (!anyChecked) {
                        btnText.innerText = defaultTitle + ": " + "Not specified";
                        if (sliderInput)
                            sliderInput.parentElement.style.display = 'none'
                    }
                    item.classList.remove("checked")
                }
            })
        });
        listItems.addEventListener("mouseenter", () => {
            tooltip.style.display = "none"
        });
        listItems.addEventListener("mouseleave", () => {
            tooltip.style.display = "flex"
        })
    });
    const rectangles = document.querySelectorAll(".rectangle");
    rectangles.forEach(rectangle => {
        const btnText = rectangle.querySelector("h4");
        const tooltip = rectangle.querySelector(".tooltip");
        const defaultTitle = btnText.getAttribute("title");
        btnText.innerText = defaultTitle;
        const listItems = rectangle.querySelector(".list-items");
        const selectBtn = rectangle;
        const arrowDown = rectangle.querySelector('.arrow-dwn');
        const sliderInput = rectangle.querySelector('input[type="range"]');
        if (sliderInput) {
            sliderInput.addEventListener("click", (event) => {
                event.stopPropagation()
            })
        }
        arrowDown.addEventListener("click", (event) => {
            event.stopPropagation();
            rectangles.forEach(cbx => {
                if (cbx !== rectangle) {
                    const otherListItems = cbx.querySelector(".list-items");
                    otherListItems.style.display = "none";
                    cbx.classList.remove("open")
                }
            });
            selectBtn.classList.toggle("open");
            listItems.style.display = selectBtn.classList.contains("open") ? "flex" : "none"
        });
        const items = rectangle.querySelectorAll(".item");
        items.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox.checked) {
                items.forEach(i => {
                    const cb = i.querySelector('input[type="checkbox"]');
                    cb.checked = !1;
                    i.classList.remove("checked")
                });
                if (sliderInput)
                    sliderInput.parentElement.style.display = 'flex';
                checkbox.checked = !0;
                item.classList.add("checked");
                btnText.innerText = defaultTitle + ": " + checkbox.parentElement.querySelector('span').textContent.trim()
            } else {
                const anyChecked = [...items].some(i => i.querySelector('input[type="checkbox"]').checked);
                if (!anyChecked) {
                    btnText.innerText = defaultTitle + ": " + "Default";
                    if (sliderInput)
                        sliderInput.parentElement.style.display = 'none'
                }
                item.classList.remove("checked")
            }
            checkbox.addEventListener("change", () => {
                if (checkbox.checked) {
                    items.forEach(i => {
                        const cb = i.querySelector('input[type="checkbox"]');
                        cb.checked = !1;
                        i.classList.remove("checked")
                    });
                    if (sliderInput)
                        sliderInput.parentElement.style.display = 'flex';
                    checkbox.checked = !0;
                    item.classList.add("checked");
                    btnText.innerText = defaultTitle + ": " + checkbox.parentElement.querySelector('span').textContent.trim()
                } else {
                    const anyChecked = [...items].some(i => i.querySelector('input[type="checkbox"]').checked);
                    if (!anyChecked) {
                        btnText.innerText = defaultTitle + ": " + "Default";
                        if (sliderInput)
                            sliderInput.parentElement.style.display = 'none'
                    }
                    item.classList.remove("checked")
                }
            })
        });
        listItems.addEventListener("mouseenter", () => {
            tooltip.style.display = "none"
        });
        listItems.addEventListener("mouseleave", () => {
            tooltip.style.display = "flex"
        })
    });
    document.addEventListener("click", () => {
        multiboxes.forEach(box => {
            box.classList.remove("open");
            box.querySelector(".list-items").style.display = "none"
        });
        comboboxes.forEach(combobox => {
            combobox.querySelector(".list-items").style.display = "none";
            combobox.classList.remove("open")
        });
        rectangles.forEach(rectangle => {
            rectangle.querySelector(".list-items").style.display = "none";
            rectangle.classList.remove("open")
        });
    })
}
export const processBlobToFile = async (blobUrl, fileName, type = null) => {
    try {
        console.log(`Fetching blob from URL: ${blobUrl}`);
        const response = await fetch(blobUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        let blob = await response.blob();
        if (blob.type !== 'image/png' && type === 'image/png') {
            const imageBitmap = await createImageBitmap(blob);
            const canvas = document.createElement('canvas');
            canvas.width = imageBitmap.width;
            canvas.height = imageBitmap.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imageBitmap, 0, 0);
            blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        } else if (blob.type !== 'video/mp4' && type === 'video/mp4') {
            blob = new Blob([blob], { type: 'video/mp4' });
        }
        return new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
    } catch (error) {
        console.error(`Error processing blob to file: ${error.message}`);
        alert(`Error processing blob to file: ${error.message}`);
        return null;
    }
};
export async function fetchUploadedChunks(serverAddress, fileName) {
    try {
        const response = await fetch(`${serverAddress}/uploaded-chunks?fileName=${fileName}`);
        if (!response.ok) {
            showNotification(`Failed to fetch uploaded chunks: ${response.status} ${response.statusText}.`, 'Warning - Fetching Failed', 'warning');
            throw new Error(`Failed to fetch uploaded chunks: ${response.status} ${response.statusText}`)
        }
        return await response.json()
    } catch (error) {
        showNotification(`Error fetching uploaded chunks for ${fileName}: ${error.message}.`, 'Warning - Fetching Failed', 'warning');
        return []
    }
}
export async function cancelProcess(showAlertion) {
    try {
        const userData = await getUserData();
        const userDoc = await getUserDoc(() => setCurrentUserDoc(getDocSnapshot));
        const serverAddresses = await fetchServerAddresses(getDocsSnapshot('servers'));
        const results = await Promise.all(serverAddresses.map(async (server) => {
            const queueAmount = await checkServerQueue(server);
            return {
                queueAmount,
                serverAddress: server
            }
        }));
        const userIsProcessing = userDoc.isProcessing;
        const serverWithUserRequest = results.find(server => server.queueAmount !== Infinity && server.queueAmount.requestQueue?.includes(userData.uid));
        if (userIsProcessing || serverWithUserRequest) {
            await Promise.all(serverAddresses.map(async (server) => {
                try {
                    const response = await fetch(`${server}/cancel-process`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            userId: userData.uid
                        })
                    });
                    if (showAlertion && response.ok) {
                        await response.json();
                        startProcessBtn.disabled = !1;
                        setClientStatus('Request got cancelled')
                    }
                } catch (error) {
                    console.error(`Error on server ${server}:`, error)
                }
            }))
        } else if (showAlertion) {
            showNotification(`User is not processing. No cancellation request sent.`, 'Warning - Process Cancellation', 'warning')
        }
    } catch (error) {
        console.error('Error checking processes:', error)
    }
}
window.iosMobileCheck = function () {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIOSDevice = /iPhone|iPad|iPod/i.test(userAgent);
    const hasTouchscreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    return isIOSDevice && hasTouchscreen
}
ensureCameFromAd();