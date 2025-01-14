window.iosMobileCheck = function () {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

const version = '1.1.1.1.2.5.0'

export async function fetchWithRandom(url, options = {}) {
    const randomParam = Math.random().toString(36).substring(2);
    const separator = url.includes('?') ? '&' : '?';
    const urlWithParam = `${url}${separator}random=${randomParam}`;

    try {
        const response = await fetch(urlWithParam, options);
        return response;
    } catch (error) {
        throw error;
    }
}

export function setCache(key, value, ttl) {
    const now = new Date();
    const item = {
        value: value,
        expiry: now.getTime() + ttl,
    }
    localStorage.setItem(key, JSON.stringify(item))
}
export function getCache(key, ttl = null) {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) {
        return null
    }
    const item = JSON.parse(itemStr);
    const now = Date.now();
    if (now > item.expiry || ttl && item.expiry > now + ttl) {
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
    fetchWithRandom(photoURL).then(response => {
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
    const fetchPromise = fetchWithRandom(url, {
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
    const urls = [
        'https://ipapi.is/json/',
        'https://ipinfo.io/json',
        'https://api64.ipify.org?format=json',
        'https://ifconfig.me/all.json',
        'https://ipapi.co/json/'
    ];
    const controllers = urls.map(() => new AbortController());
    const rawData = [];

    try {
        for (let i = 0; i < urls.length; i++) {
            try {
                const data = await fetchWithTimeout(urls[i], 1000, controllers[i]);
                const sanitizedData = JSON.parse(JSON.stringify(data, (key, value) => {
                    if (['elapsed_ms', 'local_time', 'local_time_unix'].includes(key)) {
                        return undefined;
                    }
                    return value;
                }));

                rawData.push(JSON.stringify(sanitizedData));
                if (sanitizedData.ip || sanitizedData.ip_addr) {
                    controllers.slice(i + 1).forEach(controller => controller.abort());
                    const userUniqueInternetProtocolId = await createStaticIdentifier(rawData);
                    return {
                        userInternetProtocolAddress: sanitizedData.ip || sanitizedData.ip_addr,
                        isVPN: sanitizedData.is_vpn || false,
                        isProxy: sanitizedData.is_proxy || false,
                        isTOR: sanitizedData.is_tor || false,
                        isCrawler: sanitizedData.is_crawler || false,
                        userUniqueInternetProtocolId,
                        rawData
                    };
                }
            } catch (error) {
                //alert(`Error fetching from ${urls[i]}: ${error.message}`);
                console.error(`Error fetching from ${urls[i]}: ${error.message}`);
            }
        }
        throw new Error('No IP field in any response');
    } catch (error) {
        alert(
            `All attempts to fetch internet protocol data failed: ${error.message}. 
Please ensure that your ad-blocker or VPN is disabled and try again.`
        );
        return null;
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
export async function fetchServerAddresses(snapshotPromise, keepSlowServers = true, serverType = null) {
    const ttl = 1 * 60 * 60 * 1000;
    const cacheKey = `${pageName}-serverAddresses`;

    let cachedAddresses = getCache(cacheKey, ttl);
    if (cachedAddresses &&
        (
            cachedAddresses.some(address => address === undefined || address === 'undefined') ||
            cachedAddresses.length < 1 ||
            !cachedAddresses.some(address => address.includes('4090') || address.includes('3090') || address.includes('3050'))
        )
    ) {
        localStorage.removeItem(cacheKey);
        cachedAddresses = null;
    }

    if (cachedAddresses) {
        if (!keepSlowServers) {
            cachedAddresses = cachedAddresses.filter(address => !address.includes("3050"));
        }
        return cachedAddresses;
    }

    const snapshot = await snapshotPromise;
    let serverAddresses = snapshot.docs.map(doc => doc.data()[serverType ? serverType : documentID()]).filter(Boolean);
    setCache(cacheKey, serverAddresses, ttl);

    if (!keepSlowServers) {
        serverAddresses = serverAddresses.filter(address => !address.includes("3050"));
    }

    return serverAddresses;
}
export async function fetchServerAddress(snapshotPromise, fieldId) {
    const ttl = 1 * 60 * 60 * 1000;
    const cacheKey = `serverAddress-${fieldId}`;
    const cachedAddress = getCache(cacheKey, ttl);

    if (cachedAddress) {
        if (typeof cachedAddress === 'string' &&
            (cachedAddress.includes('4090') || cachedAddress.includes('3090') || cachedAddress.includes('3050'))) {
            return cachedAddress;
        } else {
            localStorage.removeItem(cacheKey);
        }
    }

    const snapshot = await snapshotPromise;
    if (snapshot && snapshot.exists()) {
        const serverAddress = snapshot.data()[`serverAdress-${fieldId}`];
        setCache(cacheKey, serverAddress || null, ttl);
        return serverAddress || null;
    }

    return null;
}
export async function fetchConversionRates() {
    const cacheKey = 'conversionRates';
    const ttl = 1 * 24 * 60 * 60 * 1000;
    const cachedRates = getCache(cacheKey, ttl);
    if (cachedRates) return cachedRates;
    try {
        const response = await fetchWithRandom('https://api.frankfurter.app/latest?from=USD');
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
    const serverResponse = await fetchWithRandom(serverAddressAPI + '/set-came-from-ad', {
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
    if (!userDoc)
        return;
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

            const serverResponse = await fetchWithRandom(serverAddressAPI + '/set-unique-browser-id', {
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
        script.src = '/libraries/evercookie/evercookie3.js?v=1.1.1.1.2.5.0';
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

function createAdblockerOverlay() {
    if (document.querySelector('.overlay')) return null;

    const overlay = document.createElement('div');
    overlay.classList.add('overlay');
    overlay.innerHTML = `
        <div class="overlay-content">
            <h2>Adblocker Detected</h2>
            <p>We don't have ads, but ad blockers or similar extensions are causing our website to not work properly. Please disable ad blockers or any similar extension that blocks cookies or resources.</p>
        </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
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
                script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
                document.head.appendChild(script);
            });
        };

        loadScript('/libraries/evercookie/jquery-1.4.2.min.js?v=1.1.1.1.2.5.0', 'jQuery')
            .then(() => loadScript('/libraries/evercookie/swfobject-2.2.min.js?v=1.1.1.1.2.5.0', 'swfobject'))
            .then(() => loadScript('/libraries/evercookie/dtjava.js?v=1.1.1.1.2.5.0', 'dtjava'))
            .then(() => loadEvercookieScript())
            .then(resolve)
            .catch((error) => {
                createAdblockerOverlay();
                reject(error);
            });
    });
}

let isGtagConfigured = false;

function configureGtag() {
    if (isGtagConfigured) {
        return;
    }

    let storedConsent;
    try {
        storedConsent = JSON.parse(localStorage.getItem(`consentPreferences_${version}`)) || null;
    } catch (error) {
        console.error("Stored consent preferences could not be parsed:", error);
    }

    const defaultConsent = {
        analytics_storage: "granted",
        ad_storage: "granted",
        functionality_storage: "granted",
        personalization_storage: "granted",
        security_storage: "granted",
        ad_user_data: "granted",
        ad_personalization: "granted",
        ads_data_redaction: "granted",
    };

    gtag('consent', 'default', storedConsent || defaultConsent);
    gtag('consent', 'update', storedConsent || defaultConsent);
    gtag('js', new Date());
    gtag('config', 'G-5C9P4GHHQ6');

    isGtagConfigured = true;
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
    setTimeout(() => {
        const container = createNotificationsContainer();
        let waitTime = 5000;
        const notification = document.createElement('div');
        notification.className = 'indicator';
        const featureChangeElement = document.createElement('p');
        featureChangeElement.innerText = `${featureChange} - ${version}`;
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
                }, 250)
            }
        }, {
            once: !0
        });
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove()
            }, 250)
        }, waitTime)
    }, 250);
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
        const response = await fetchWithRandom(processURL);
        const res = await response.json();
        return res
    } catch (error) {
        console.error(error.message);
        return null
    }
}
const STATUS_OK = 200;
const STATUS_NOTFOUND = 404;
export async function checkServerQueue(server, getSecond = false) {
    try {
        const response = await fetchWithRandom(`${server}/get-online`);
        if (response.status === STATUS_OK) {
            const data = await response.json();
            return getSecond ? data.secondServer : data.server;
        }
        return Infinity;
    } catch (error) {
        console.error(error.message);
        return Infinity;
    }
}
export function calculateMetadata(element, callback) {
    if (element.getAttribute('data-fps') > 0) {
        return;
    }

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
    if (typeof onProgress !== 'function') return fetchWithRandom(url, options);
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
                showNotification(`Request failed with status ${xhr.status}. Try again.`, 'Warning - Fetching Failed', 'warning')
            }
        };
        xhr.onerror = () => {
            reject(new Error('Request failed'));
            showNotification(`Request failed. Try again.`, 'Warning - Fetching Failed', 'warning')
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
                        if (iosMobileCheck())
                            element.innerHTML = `<video timestamp="${timestamp}" id="${id}" preload="auto" autoplay loop muted playsinline disablePictureInPicture><source src="${blobUrl}">Your browser does not support the video tag.</video><div class="delete-icon"></div>`;
                        else
                            element.innerHTML = `<video timestamp="${timestamp}" id="${id}" preload="auto" autoplay loop muted playsinline disablePictureInPicture><source src="${blobUrl}">Your browser does not support the video tag.</video><div class="delete-icon"></div>`;
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
                                    let neededCredits = removeBanner.checked ? 2 : 1;
                                    if (pageName === 'inpaint')
                                        neededCredits += 1;
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
                    if (data?.status === 'completed')
                        handleDownload({
                            db,
                            url,
                            element,
                            id,
                            timestamp,
                            active
                        }, databases);
                    else element.innerHTML = `<initial url="${url}" id="${id}" timestamp="${timestamp}" active="${active}"/></initial><div class="process-text">${data.server}</div><div class="delete-icon"></div>`
                } else {
                    if (iosMobileCheck())
                        element.innerHTML = `<video url="${url}" id="${id}" timestamp="${timestamp}" active="${active}" preload="auto" autoplay loop muted playsinline disablePictureInPicture><source src="${blobUrl}">Your browser does not support the video tag.</video><div class="process-text">Not Indexed...</div><div class="delete-icon"></div>`
                    else
                        element.innerHTML = `<video url="${url}" id="${id}" timestamp="${timestamp}" active="${active}" preload="auto" autoplay loop muted playsinline disablePictureInPicture><source src="${blobUrl}">Your browser does not support the video tag.</video><div class="process-text">Not Indexed...</div><div class="delete-icon"></div>`
                }
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
export async function getFirebaseModules(useCache = false) {
    if (firebaseModules && useCache) {
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
    try {
        const { auth } = await getFirebaseModules();
        return new Promise((resolve, reject) => {
            const unsubscribe = auth.onAuthStateChanged(async (user) => {
                unsubscribe();
                if (user) {
                    await user.reload();
                    resolve({
                        uid: user.uid,
                        email: user.email,
                        emailVerified: user.emailVerified,
                        displayName: user.displayName,
                        photoURL: user.photoURL
                    });
                } else {
                    console.error('No user is currently logged in.');
                    reject(new Error('No user is currently logged in.'));
                }
            });
        });
    } catch (error) {
        console.error('Error getting user data:', error);
        throw new Error('Failed to fetch user data');
    }
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
        const actualCredits = Number(userDoc.credits) || 0;
        const dailyCredits = Number(userDoc.dailyCredits) || 0;
        const rewardCredits = Number(userDoc.rewardCredits) || 0;

        const creditsList = [];
        if (actualCredits > 0) creditsList.push(actualCredits);
        if (dailyCredits > 0) creditsList.push(dailyCredits);
        if (rewardCredits > 0) creditsList.push(rewardCredits);
        if ((rewardCredits > 0 || dailyCredits > 0 || actualCredits > 0) && creditsList.length > 0) {
            credits.textContent = creditsList.join(' + ') + ' Credits';
        } else {
            credits.textContent = 'No Credits';
        }
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
async function loadGoogleAdScript(clientId, userData, userDoc) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
    script.setAttribute('crossorigin', 'anonymous');
    document.head.appendChild(script);

    script.onload = function () {
        const fundingChoicesScript = document.createElement('script');
        fundingChoicesScript.async = true;
        fundingChoicesScript.src = 'https://fundingchoicesmessages.google.com/i/pub-2374246406180986?ers=1';
        document.head.appendChild(fundingChoicesScript);
        fundingChoicesScript.onload = function () {
            (function () {
                function signalGooglefcPresent() {
                    if (!window.frames['googlefcPresent']) {
                        if (document.body) {
                            const iframe = document.createElement('iframe');
                            iframe.style = 'width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;';
                            iframe.style.display = 'none';
                            iframe.name = 'googlefcPresent';
                            document.body.appendChild(iframe);
                        } else {
                            setTimeout(signalGooglefcPresent, 0);
                        }
                    }
                }
                signalGooglefcPresent();
                (function () {
                    'use strict';

                    function aa(a) {
                        var b = 0;
                        return function () {
                            return b < a.length ? {
                                done: !1,
                                value: a[b++]
                            } : {
                                done: !0
                            }
                        }
                    }
                    var ba = typeof Object.defineProperties == "function" ? Object.defineProperty : function (a, b, c) {
                        if (a == Array.prototype || a == Object.prototype) return a;
                        a[b] = c.value;
                        return a
                    };

                    function ca(a) {
                        a = ["object" == typeof globalThis && globalThis, a, "object" == typeof window && window, "object" == typeof self && self, "object" == typeof global && global];
                        for (var b = 0; b < a.length; ++b) {
                            var c = a[b];
                            if (c && c.Math == Math) return c
                        }
                        throw Error("Cannot find global object");
                    }
                    var da = ca(this);

                    function l(a, b) {
                        if (b) a: {
                            var c = da; a = a.split(".");
                            for (var d = 0; d < a.length - 1; d++) {
                                var e = a[d];
                                if (!(e in c)) break a;
                                c = c[e]
                            }
                            a = a[a.length - 1]; d = c[a]; b = b(d); b != d && b != null && ba(c, a, {
                                configurable: !0,
                                writable: !0,
                                value: b
                            })
                        }
                    }

                    function ea(a) {
                        return a.raw = a
                    }

                    function n(a) {
                        var b = typeof Symbol != "undefined" && Symbol.iterator && a[Symbol.iterator];
                        if (b) return b.call(a);
                        if (typeof a.length == "number") return {
                            next: aa(a)
                        };
                        throw Error(String(a) + " is not an iterable or ArrayLike");
                    }

                    function fa(a) {
                        for (var b, c = []; !(b = a.next()).done;) c.push(b.value);
                        return c
                    }
                    var ha = typeof Object.create == "function" ? Object.create : function (a) {
                        function b() { }
                        b.prototype = a;
                        return new b
                    },
                        p;
                    if (typeof Object.setPrototypeOf == "function") p = Object.setPrototypeOf;
                    else {
                        var q;
                        a: {
                            var ja = {
                                a: !0
                            },
                                ka = {};
                            try {
                                ka.__proto__ = ja;
                                q = ka.a;
                                break a
                            } catch (a) { }
                            q = !1
                        }
                        p = q ? function (a, b) {
                            a.__proto__ = b;
                            if (a.__proto__ !== b) throw new TypeError(a + " is not extensible");
                            return a
                        } : null
                    }
                    var la = p;

                    function t(a, b) {
                        a.prototype = ha(b.prototype);
                        a.prototype.constructor = a;
                        if (la) la(a, b);
                        else
                            for (var c in b)
                                if (c != "prototype")
                                    if (Object.defineProperties) {
                                        var d = Object.getOwnPropertyDescriptor(b, c);
                                        d && Object.defineProperty(a, c, d)
                                    } else a[c] = b[c];
                        a.A = b.prototype
                    }

                    function ma() {
                        for (var a = Number(this), b = [], c = a; c < arguments.length; c++) b[c - a] = arguments[c];
                        return b
                    }
                    l("Object.is", function (a) {
                        return a ? a : function (b, c) {
                            return b === c ? b !== 0 || 1 / b === 1 / c : b !== b && c !== c
                        }
                    });
                    l("Array.prototype.includes", function (a) {
                        return a ? a : function (b, c) {
                            var d = this;
                            d instanceof String && (d = String(d));
                            var e = d.length;
                            c = c || 0;
                            for (c < 0 && (c = Math.max(c + e, 0)); c < e; c++) {
                                var f = d[c];
                                if (f === b || Object.is(f, b)) return !0
                            }
                            return !1
                        }
                    });
                    l("String.prototype.includes", function (a) {
                        return a ? a : function (b, c) {
                            if (this == null) throw new TypeError("The 'this' value for String.prototype.includes must not be null or undefined");
                            if (b instanceof RegExp) throw new TypeError("First argument to String.prototype.includes must not be a regular expression");
                            return this.indexOf(b, c || 0) !== -1
                        }
                    });
                    l("Number.MAX_SAFE_INTEGER", function () {
                        return 9007199254740991
                    });
                    l("Number.isFinite", function (a) {
                        return a ? a : function (b) {
                            return typeof b !== "number" ? !1 : !isNaN(b) && b !== Infinity && b !== -Infinity
                        }
                    });
                    l("Number.isInteger", function (a) {
                        return a ? a : function (b) {
                            return Number.isFinite(b) ? b === Math.floor(b) : !1
                        }
                    });
                    l("Number.isSafeInteger", function (a) {
                        return a ? a : function (b) {
                            return Number.isInteger(b) && Math.abs(b) <= Number.MAX_SAFE_INTEGER
                        }
                    });
                    l("Math.trunc", function (a) {
                        return a ? a : function (b) {
                            b = Number(b);
                            if (isNaN(b) || b === Infinity || b === -Infinity || b === 0) return b;
                            var c = Math.floor(Math.abs(b));
                            return b < 0 ? -c : c
                        }
                    }); /* Copyright The Closure Library Authors. SPDX-License-Identifier: Apache-2.0 */
                    var u = this || self;

                    function v(a, b) {
                        a: {
                            var c = ["CLOSURE_FLAGS"];
                            for (var d = u, e = 0; e < c.length; e++)
                                if (d = d[c[e]], d == null) {
                                    c = null;
                                    break a
                                } c = d
                        }
                        a = c && c[a];
                        return a != null ? a : b
                    }

                    function w(a) {
                        return a
                    };

                    function na(a) {
                        u.setTimeout(function () {
                            throw a;
                        }, 0)
                    };
                    var oa = v(610401301, !1),
                        pa = v(188588736, !0),
                        qa = v(645172343, v(1, !0));
                    var x, ra = u.navigator;
                    x = ra ? ra.userAgentData || null : null;

                    function z(a) {
                        return oa ? x ? x.brands.some(function (b) {
                            return (b = b.brand) && b.indexOf(a) != -1
                        }) : !1 : !1
                    }

                    function A(a) {
                        var b;
                        a: {
                            if (b = u.navigator)
                                if (b = b.userAgent) break a; b = ""
                        }
                        return b.indexOf(a) != -1
                    };

                    function B() {
                        return oa ? !!x && x.brands.length > 0 : !1
                    }

                    function C() {
                        return B() ? z("Chromium") : (A("Chrome") || A("CriOS")) && !(B() ? 0 : A("Edge")) || A("Silk")
                    };
                    var sa = B() ? !1 : A("Trident") || A("MSIE");
                    !A("Android") || C();
                    C();
                    A("Safari") && (C() || (B() ? 0 : A("Coast")) || (B() ? 0 : A("Opera")) || (B() ? 0 : A("Edge")) || (B() ? z("Microsoft Edge") : A("Edg/")) || B() && z("Opera"));
                    var ta = {},
                        D = null;
                    var ua = typeof Uint8Array !== "undefined",
                        va = !sa && typeof btoa === "function";
                    var wa;

                    function E() {
                        return typeof BigInt === "function"
                    };
                    var F = typeof Symbol === "function" && typeof Symbol() === "symbol";

                    function xa(a) {
                        return typeof Symbol === "function" && typeof Symbol() === "symbol" ? Symbol() : a
                    }
                    var G = xa(),
                        ya = xa("2ex");
                    var za = F ? function (a, b) {
                        a[G] |= b
                    } : function (a, b) {
                        a.g !== void 0 ? a.g |= b : Object.defineProperties(a, {
                            g: {
                                value: b,
                                configurable: !0,
                                writable: !0,
                                enumerable: !1
                            }
                        })
                    },
                        H = F ? function (a) {
                            return a[G] | 0
                        } : function (a) {
                            return a.g | 0
                        },
                        I = F ? function (a) {
                            return a[G]
                        } : function (a) {
                            return a.g
                        },
                        J = F ? function (a, b) {
                            a[G] = b
                        } : function (a, b) {
                            a.g !== void 0 ? a.g = b : Object.defineProperties(a, {
                                g: {
                                    value: b,
                                    configurable: !0,
                                    writable: !0,
                                    enumerable: !1
                                }
                            })
                        };

                    function Aa(a, b) {
                        J(b, (a | 0) & -14591)
                    }

                    function Ba(a, b) {
                        J(b, (a | 34) & -14557)
                    };
                    var K = {},
                        Ca = {};

                    function Da(a) {
                        return !(!a || typeof a !== "object" || a.g !== Ca)
                    }

                    function Ea(a) {
                        return a !== null && typeof a === "object" && !Array.isArray(a) && a.constructor === Object
                    }

                    function L(a, b, c) {
                        if (!Array.isArray(a) || a.length) return !1;
                        var d = H(a);
                        if (d & 1) return !0;
                        if (!(b && (Array.isArray(b) ? b.includes(c) : b.has(c)))) return !1;
                        J(a, d | 1);
                        return !0
                    };
                    var M = 0,
                        N = 0;

                    function Fa(a) {
                        var b = a >>> 0;
                        M = b;
                        N = (a - b) / 4294967296 >>> 0
                    }

                    function Ga(a) {
                        if (a < 0) {
                            Fa(-a);
                            var b = n(Ha(M, N));
                            a = b.next().value;
                            b = b.next().value;
                            M = a >>> 0;
                            N = b >>> 0
                        } else Fa(a)
                    }

                    function Ia(a, b) {
                        b >>>= 0;
                        a >>>= 0;
                        if (b <= 2097151) var c = "" + (4294967296 * b + a);
                        else E() ? c = "" + (BigInt(b) << BigInt(32) | BigInt(a)) : (c = (a >>> 24 | b << 8) & 16777215, b = b >> 16 & 65535, a = (a & 16777215) + c * 6777216 + b * 6710656, c += b * 8147497, b *= 2, a >= 1E7 && (c += a / 1E7 >>> 0, a %= 1E7), c >= 1E7 && (b += c / 1E7 >>> 0, c %= 1E7), c = b + Ja(c) + Ja(a));
                        return c
                    }

                    function Ja(a) {
                        a = String(a);
                        return "0000000".slice(a.length) + a
                    }

                    function Ha(a, b) {
                        b = ~b;
                        a ? a = ~a + 1 : b += 1;
                        return [a, b]
                    };
                    var Ka = /^-?([1-9][0-9]*|0)(\.[0-9]+)?$/;
                    var O;

                    function La(a, b) {
                        O = b;
                        a = new a(b);
                        O = void 0;
                        return a
                    }

                    function P(a, b, c) {
                        a == null && (a = O);
                        O = void 0;
                        if (a == null) {
                            var d = 96;
                            c ? (a = [c], d |= 512) : a = [];
                            b && (d = d & -16760833 | (b & 1023) << 14)
                        } else {
                            if (!Array.isArray(a)) throw Error("narr");
                            d = H(a);
                            if (d & 2048) throw Error("farr");
                            if (d & 64) return a;
                            d |= 64;
                            if (c && (d |= 512, c !== a[0])) throw Error("mid");
                            a: {
                                c = a;
                                var e = c.length;
                                if (e) {
                                    var f = e - 1;
                                    if (Ea(c[f])) {
                                        d |= 256;
                                        b = f - (+!!(d & 512) - 1);
                                        if (b >= 1024) throw Error("pvtlmt");
                                        d = d & -16760833 | (b & 1023) << 14;
                                        break a
                                    }
                                }
                                if (b) {
                                    b = Math.max(b, e - (+!!(d & 512) - 1));
                                    if (b > 1024) throw Error("spvt");
                                    d = d & -16760833 | (b & 1023) << 14
                                }
                            }
                        }
                        J(a, d);
                        return a
                    };

                    function Ma(a) {
                        switch (typeof a) {
                            case "number":
                                return isFinite(a) ? a : String(a);
                            case "boolean":
                                return a ? 1 : 0;
                            case "object":
                                if (a)
                                    if (Array.isArray(a)) {
                                        if (L(a, void 0, 0)) return
                                    } else if (ua && a != null && a instanceof Uint8Array) {
                                        if (va) {
                                            for (var b = "", c = 0, d = a.length - 10240; c < d;) b += String.fromCharCode.apply(null, a.subarray(c, c += 10240));
                                            b += String.fromCharCode.apply(null, c ? a.subarray(c) : a);
                                            a = btoa(b)
                                        } else {
                                            b === void 0 && (b = 0);
                                            if (!D) {
                                                D = {};
                                                c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split("");
                                                d = ["+/=", "+/", "-_=", "-_.", "-_"];
                                                for (var e = 0; e < 5; e++) {
                                                    var f = c.concat(d[e].split(""));
                                                    ta[e] = f;
                                                    for (var g = 0; g < f.length; g++) {
                                                        var h = f[g];
                                                        D[h] === void 0 && (D[h] = g)
                                                    }
                                                }
                                            }
                                            b = ta[b];
                                            c = Array(Math.floor(a.length / 3));
                                            d = b[64] || "";
                                            for (e = f = 0; f < a.length - 2; f += 3) {
                                                var k = a[f],
                                                    m = a[f + 1];
                                                h = a[f + 2];
                                                g = b[k >> 2];
                                                k = b[(k & 3) << 4 | m >> 4];
                                                m = b[(m & 15) << 2 | h >> 6];
                                                h = b[h & 63];
                                                c[e++] = g + k + m + h
                                            }
                                            g = 0;
                                            h = d;
                                            switch (a.length - f) {
                                                case 2:
                                                    g = a[f + 1], h = b[(g & 15) << 2] || d;
                                                case 1:
                                                    a = a[f], c[e] = b[a >> 2] + b[(a & 3) << 4 | g >> 4] + h + d
                                            }
                                            a = c.join("")
                                        }
                                        return a
                                    }
                        }
                        return a
                    };

                    function Na(a, b, c) {
                        a = Array.prototype.slice.call(a);
                        var d = a.length,
                            e = b & 256 ? a[d - 1] : void 0;
                        d += e ? -1 : 0;
                        for (b = b & 512 ? 1 : 0; b < d; b++) a[b] = c(a[b]);
                        if (e) {
                            b = a[b] = {};
                            for (var f in e) Object.prototype.hasOwnProperty.call(e, f) && (b[f] = c(e[f]))
                        }
                        return a
                    }

                    function Oa(a, b, c, d, e) {
                        if (a != null) {
                            if (Array.isArray(a)) a = L(a, void 0, 0) ? void 0 : e && H(a) & 2 ? a : Pa(a, b, c, d !== void 0, e);
                            else if (Ea(a)) {
                                var f = {},
                                    g;
                                for (g in a) Object.prototype.hasOwnProperty.call(a, g) && (f[g] = Oa(a[g], b, c, d, e));
                                a = f
                            } else a = b(a, d);
                            return a
                        }
                    }

                    function Pa(a, b, c, d, e) {
                        var f = d || c ? H(a) : 0;
                        d = d ? !!(f & 32) : void 0;
                        a = Array.prototype.slice.call(a);
                        for (var g = 0; g < a.length; g++) a[g] = Oa(a[g], b, c, d, e);
                        c && c(f, a);
                        return a
                    }

                    function Qa(a) {
                        return a.s === K ? a.toJSON() : Ma(a)
                    };

                    function Ra(a, b, c) {
                        c = c === void 0 ? Ba : c;
                        if (a != null) {
                            if (ua && a instanceof Uint8Array) return b ? a : new Uint8Array(a);
                            if (Array.isArray(a)) {
                                var d = H(a);
                                if (d & 2) return a;
                                b && (b = d === 0 || !!(d & 32) && !(d & 64 || !(d & 16)));
                                return b ? (J(a, (d | 34) & -12293), a) : Pa(a, Ra, d & 4 ? Ba : c, !0, !0)
                            }
                            a.s === K && (c = a.h, d = I(c), a = d & 2 ? a : La(a.constructor, Sa(c, d, !0)));
                            return a
                        }
                    }

                    function Sa(a, b, c) {
                        var d = c || b & 2 ? Ba : Aa,
                            e = !!(b & 32);
                        a = Na(a, b, function (f) {
                            return Ra(f, e, d)
                        });
                        za(a, 32 | (c ? 2 : 0));
                        return a
                    };

                    function Ta(a, b) {
                        a = a.h;
                        return Ua(a, I(a), b)
                    }

                    function Va(a, b, c, d) {
                        b = d + (+!!(b & 512) - 1);
                        if (!(b < 0 || b >= a.length || b >= c)) return a[b]
                    }

                    function Ua(a, b, c, d) {
                        if (c === -1) return null;
                        var e = b >> 14 & 1023 || 536870912;
                        if (c >= e) {
                            if (b & 256) return a[a.length - 1][c]
                        } else {
                            var f = a.length;
                            if (d && b & 256 && (d = a[f - 1][c], d != null)) {
                                if (Va(a, b, e, c) && ya != null) {
                                    var g;
                                    a = (g = wa) != null ? g : wa = {};
                                    g = a[ya] || 0;
                                    g >= 4 || (a[ya] = g + 1, g = Error(), g.__closure__error__context__984382 || (g.__closure__error__context__984382 = {}), g.__closure__error__context__984382.severity = "incident", na(g))
                                }
                                return d
                            }
                            return Va(a, b, e, c)
                        }
                    }

                    function Wa(a, b, c, d, e) {
                        var f = b >> 14 & 1023 || 536870912;
                        if (c >= f || e && !qa) {
                            var g = b;
                            if (b & 256) e = a[a.length - 1];
                            else {
                                if (d == null) return;
                                e = a[f + (+!!(b & 512) - 1)] = {};
                                g |= 256
                            }
                            e[c] = d;
                            c < f && (a[c + (+!!(b & 512) - 1)] = void 0);
                            g !== b && J(a, g)
                        } else a[c + (+!!(b & 512) - 1)] = d, b & 256 && (a = a[a.length - 1], c in a && delete a[c])
                    }

                    function Xa(a, b) {
                        var c = Ya;
                        var d = d === void 0 ? !1 : d;
                        var e = a.h;
                        var f = I(e),
                            g = Ua(e, f, b, d);
                        if (g != null && typeof g === "object" && g.s === K) c = g;
                        else if (Array.isArray(g)) {
                            var h = H(g),
                                k = h;
                            k === 0 && (k |= f & 32);
                            k |= f & 2;
                            k !== h && J(g, k);
                            c = new c(g)
                        } else c = void 0;
                        c !== g && c != null && Wa(e, f, b, c, d);
                        e = c;
                        if (e == null) return e;
                        a = a.h;
                        f = I(a);
                        f & 2 || (g = e, c = g.h, h = I(c), g = h & 2 ? La(g.constructor, Sa(c, h, !1)) : g, g !== e && (e = g, Wa(a, f, b, e, d)));
                        return e
                    }

                    function Za(a, b) {
                        a = Ta(a, b);
                        return a == null || typeof a === "string" ? a : void 0
                    }

                    function $a(a, b) {
                        var c = c === void 0 ? 0 : c;
                        a = Ta(a, b);
                        if (a != null)
                            if (b = typeof a, b === "number" ? Number.isFinite(a) : b !== "string" ? 0 : Ka.test(a))
                                if (typeof a === "number") {
                                    if (a = Math.trunc(a), !Number.isSafeInteger(a)) {
                                        Ga(a);
                                        b = M;
                                        var d = N;
                                        if (a = d & 2147483648) b = ~b + 1 >>> 0, d = ~d >>> 0, b == 0 && (d = d + 1 >>> 0);
                                        b = d * 4294967296 + (b >>> 0);
                                        a = a ? -b : b
                                    }
                                } else if (b = Math.trunc(Number(a)), Number.isSafeInteger(b)) a = String(b);
                                else {
                                    if (b = a.indexOf("."), b !== -1 && (a = a.substring(0, b)), !(a[0] === "-" ? a.length < 20 || a.length === 20 && Number(a.substring(0, 7)) > -922337 : a.length < 19 || a.length === 19 && Number(a.substring(0, 6)) < 922337)) {
                                        if (a.length < 16) Ga(Number(a));
                                        else if (E()) a = BigInt(a), M = Number(a & BigInt(4294967295)) >>> 0, N = Number(a >> BigInt(32) & BigInt(4294967295));
                                        else {
                                            b = +(a[0] === "-");
                                            N = M = 0;
                                            d = a.length;
                                            for (var e = b, f = (d - b) % 6 + b; f <= d; e = f, f += 6) e = Number(a.slice(e, f)), N *= 1E6, M = M * 1E6 + e, M >= 4294967296 && (N += Math.trunc(M / 4294967296), N >>>= 0, M >>>= 0);
                                            b && (b = n(Ha(M, N)), a = b.next().value, b = b.next().value, M = a, N = b)
                                        }
                                        a = M;
                                        b = N;
                                        b & 2147483648 ? E() ? a = "" + (BigInt(b | 0) << BigInt(32) | BigInt(a >>> 0)) : (b = n(Ha(a, b)), a = b.next().value, b = b.next().value, a = "-" + Ia(a, b)) : a = Ia(a, b)
                                    }
                                } else a = void 0;
                        return a != null ? a : c
                    }

                    function R(a, b) {
                        var c = c === void 0 ? "" : c;
                        a = Za(a, b);
                        return a != null ? a : c
                    };
                    var S;

                    function T(a, b, c) {
                        this.h = P(a, b, c)
                    }
                    T.prototype.toJSON = function () {
                        return ab(this)
                    };
                    T.prototype.s = K;
                    T.prototype.toString = function () {
                        try {
                            return S = !0, ab(this).toString()
                        } finally {
                            S = !1
                        }
                    };

                    function ab(a) {
                        var b = S ? a.h : Pa(a.h, Qa, void 0, void 0, !1);
                        var c = !S;
                        var d = pa ? void 0 : a.constructor.v;
                        var e = I(c ? a.h : b);
                        if (a = b.length) {
                            var f = b[a - 1],
                                g = Ea(f);
                            g ? a-- : f = void 0;
                            e = +!!(e & 512) - 1;
                            var h = b;
                            if (g) {
                                b: {
                                    var k = f;
                                    var m = {}; g = !1;
                                    if (k)
                                        for (var r in k)
                                            if (Object.prototype.hasOwnProperty.call(k, r))
                                                if (isNaN(+r)) m[r] = k[r];
                                                else {
                                                    var y = k[r];
                                                    Array.isArray(y) && (L(y, d, +r) || Da(y) && y.size === 0) && (y = null);
                                                    y == null && (g = !0);
                                                    y != null && (m[r] = y)
                                                } if (g) {
                                                    for (var Q in m) break b;
                                                    m = null
                                                } else m = k
                                }
                                k = m == null ? f != null : m !== f
                            }
                            for (var ia; a > 0; a--) {
                                Q = a - 1;
                                r = h[Q];
                                Q -= e;
                                if (!(r == null || L(r, d, Q) || Da(r) && r.size === 0)) break;
                                ia = !0
                            }
                            if (h !== b || k || ia) {
                                if (!c) h = Array.prototype.slice.call(h, 0, a);
                                else if (ia || k || m) h.length = a;
                                m && h.push(m)
                            }
                            b = h
                        }
                        return b
                    };

                    function bb(a) {
                        return function (b) {
                            if (b == null || b == "") b = new a;
                            else {
                                b = JSON.parse(b);
                                if (!Array.isArray(b)) throw Error("dnarr");
                                za(b, 32);
                                b = La(a, b)
                            }
                            return b
                        }
                    };

                    function cb(a) {
                        this.h = P(a)
                    }
                    t(cb, T);
                    var db = bb(cb);
                    var U;

                    function V(a) {
                        this.g = a
                    }
                    V.prototype.toString = function () {
                        return this.g + ""
                    };
                    var eb = {};

                    function fb(a) {
                        if (U === void 0) {
                            var b = null;
                            var c = u.trustedTypes;
                            if (c && c.createPolicy) {
                                try {
                                    b = c.createPolicy("goog#html", {
                                        createHTML: w,
                                        createScript: w,
                                        createScriptURL: w
                                    })
                                } catch (d) {
                                    u.console && u.console.error(d.message)
                                }
                                U = b
                            } else U = b
                        }
                        a = (b = U) ? b.createScriptURL(a) : a;
                        return new V(a, eb)
                    }; /* SPDX-License-Identifier: Apache-2.0 */
                    function gb(a) {
                        var b = ma.apply(1, arguments);
                        if (b.length === 0) return fb(a[0]);
                        for (var c = a[0], d = 0; d < b.length; d++) c += encodeURIComponent(b[d]) + a[d + 1];
                        return fb(c)
                    };

                    function hb(a, b) {
                        a.src = b instanceof V && b.constructor === V ? b.g : "type_error:TrustedResourceUrl";
                        var c, d;
                        (c = (b = (d = (c = (a.ownerDocument && a.ownerDocument.defaultView || window).document).querySelector) == null ? void 0 : d.call(c, "script[nonce]")) ? b.nonce || b.getAttribute("nonce") || "" : "") && a.setAttribute("nonce", c)
                    };

                    function ib() {
                        return Math.floor(Math.random() * 2147483648).toString(36) + Math.abs(Math.floor(Math.random() * 2147483648) ^ Date.now()).toString(36)
                    };

                    function jb(a, b) {
                        b = String(b);
                        a.contentType === "application/xhtml+xml" && (b = b.toLowerCase());
                        return a.createElement(b)
                    }

                    function kb(a) {
                        this.g = a || u.document || document
                    };

                    function lb(a) {
                        a = a === void 0 ? document : a;
                        return a.createElement("script")
                    };

                    function mb(a, b, c, d, e, f) {
                        try {
                            var g = a.g,
                                h = lb(g);
                            h.async = !0;
                            hb(h, b);
                            g.head.appendChild(h);
                            h.addEventListener("load", function () {
                                e();
                                d && g.head.removeChild(h)
                            });
                            h.addEventListener("error", function () {
                                c > 0 ? mb(a, b, c - 1, d, e, f) : (d && g.head.removeChild(h), f())
                            })
                        } catch (k) {
                            f()
                        }
                    };
                    var nb = u.atob("aHR0cHM6Ly93d3cuZ3N0YXRpYy5jb20vaW1hZ2VzL2ljb25zL21hdGVyaWFsL3N5c3RlbS8xeC93YXJuaW5nX2FtYmVyXzI0ZHAucG5n"),
                        ob = u.atob("WW91IGFyZSBzZWVpbmcgdGhpcyBtZXNzYWdlIGJlY2F1c2UgYWQgb3Igc2NyaXB0IGJsb2NraW5nIHNvZnR3YXJlIGlzIGludGVyZmVyaW5nIHdpdGggdGhpcyBwYWdlLg=="),
                        pb = u.atob("RGlzYWJsZSBhbnkgYWQgb3Igc2NyaXB0IGJsb2NraW5nIHNvZnR3YXJlLCB0aGVuIHJlbG9hZCB0aGlzIHBhZ2Uu");

                    function qb(a, b, c) {
                        this.i = a;
                        this.u = b;
                        this.o = c;
                        this.g = null;
                        this.j = [];
                        this.m = !1;
                        this.l = new kb(this.i)
                    }

                    function rb(a) {
                        if (a.i.body && !a.m) {
                            var b = function () {
                                sb(a);
                                u.setTimeout(function () {
                                    tb(a, 3)
                                }, 50)
                            };
                            mb(a.l, a.u, 2, !0, function () {
                                u[a.o] || b()
                            }, b);
                            a.m = !0
                        }
                    }

                    function sb(a) {
                        for (var b = W(1, 5), c = 0; c < b; c++) {
                            var d = X(a);
                            a.i.body.appendChild(d);
                            a.j.push(d)
                        }
                        b = X(a);
                        b.style.bottom = "0";
                        b.style.left = "0";
                        b.style.position = "fixed";
                        b.style.width = W(100, 110).toString() + "%";
                        b.style.zIndex = W(2147483544, 2147483644).toString();
                        b.style.backgroundColor = ub(249, 259, 242, 252, 219, 229);
                        b.style.boxShadow = "0 0 12px #888";
                        b.style.color = ub(0, 10, 0, 10, 0, 10);
                        b.style.display = "flex";
                        b.style.justifyContent = "center";
                        b.style.fontFamily = "Roboto, Arial";
                        c = X(a);
                        c.style.width = W(80, 85).toString() + "%";
                        c.style.maxWidth = W(750, 775).toString() + "px";
                        c.style.margin = "24px";
                        c.style.display = "flex";
                        c.style.alignItems = "flex-start";
                        c.style.justifyContent = "center";
                        d = jb(a.l.g, "IMG");
                        d.className = ib();
                        d.src = nb;
                        d.alt = "Warning icon";
                        d.style.height = "24px";
                        d.style.width = "24px";
                        d.style.paddingRight = "16px";
                        var e = X(a),
                            f = X(a);
                        f.style.fontWeight = "bold";
                        f.textContent = ob;
                        var g = X(a);
                        g.textContent = pb;
                        Y(a, e, f);
                        Y(a, e, g);
                        Y(a, c, d);
                        Y(a, c, e);
                        Y(a, b, c);
                        a.g = b;
                        a.i.body.appendChild(a.g);
                        b = W(1, 5);
                        for (c = 0; c < b; c++) d = X(a), a.i.body.appendChild(d), a.j.push(d)
                    }

                    function Y(a, b, c) {
                        for (var d = W(1, 5), e = 0; e < d; e++) {
                            var f = X(a);
                            b.appendChild(f)
                        }
                        b.appendChild(c);
                        c = W(1, 5);
                        for (d = 0; d < c; d++) e = X(a), b.appendChild(e)
                    }

                    function W(a, b) {
                        return Math.floor(a + Math.random() * (b - a))
                    }

                    function ub(a, b, c, d, e, f) {
                        return "rgb(" + W(Math.max(a, 0), Math.min(b, 255)).toString() + "," + W(Math.max(c, 0), Math.min(d, 255)).toString() + "," + W(Math.max(e, 0), Math.min(f, 255)).toString() + ")"
                    }

                    function X(a) {
                        a = jb(a.l.g, "DIV");
                        a.className = ib();
                        return a
                    }

                    function tb(a, b) {
                        b <= 0 || a.g != null && a.g.offsetHeight !== 0 && a.g.offsetWidth !== 0 || (vb(a), sb(a), u.setTimeout(function () {
                            tb(a, b - 1)
                        }, 50))
                    }

                    function vb(a) {
                        for (var b = n(a.j), c = b.next(); !c.done; c = b.next())(c = c.value) && c.parentNode && c.parentNode.removeChild(c);
                        a.j = [];
                        (b = a.g) && b.parentNode && b.parentNode.removeChild(b);
                        a.g = null
                    };

                    function wb(a, b, c, d, e) {
                        function f(k) {
                            document.body ? g(document.body) : k > 0 ? u.setTimeout(function () {
                                f(k - 1)
                            }, e) : b()
                        }

                        function g(k) {
                            k.appendChild(h);
                            u.setTimeout(function () {
                                h ? (h.offsetHeight !== 0 && h.offsetWidth !== 0 ? b() : a(), h.parentNode && h.parentNode.removeChild(h)) : a()
                            }, d)
                        }
                        var h = xb(c);
                        f(3)
                    }

                    function xb(a) {
                        var b = document.createElement("div");
                        b.className = a;
                        b.style.width = "1px";
                        b.style.height = "1px";
                        b.style.position = "absolute";
                        b.style.left = "-10000px";
                        b.style.top = "-10000px";
                        b.style.zIndex = "-10000";
                        return b
                    };

                    function Ya(a) {
                        this.h = P(a)
                    }
                    t(Ya, T);

                    function yb(a) {
                        this.h = P(a)
                    }
                    t(yb, T);
                    var zb = bb(yb);

                    function Ab(a) {
                        if (!a) return null;
                        a = Za(a, 4);
                        var b;
                        a === null || a === void 0 ? b = null : b = fb(a);
                        return b
                    };
                    var Bb = ea([""]),
                        Cb = ea([""]);

                    function Db(a, b) {
                        this.m = a;
                        this.o = new kb(a.document);
                        this.g = b;
                        this.j = R(this.g, 1);
                        this.u = Ab(Xa(this.g, 2)) || gb(Bb);
                        this.i = !1;
                        b = Ab(Xa(this.g, 13)) || gb(Cb);
                        this.l = new qb(a.document, b, R(this.g, 12))
                    }
                    Db.prototype.start = function () {
                        Eb(this)
                    };

                    function Eb(a) {
                        Fb(a);
                        mb(a.o, a.u, 3, !1, function () {
                            a: {
                                var b = a.j;
                                var c = u.btoa(b);
                                if (c = u[c]) {
                                    try {
                                        var d = db(u.atob(c))
                                    } catch (e) {
                                        b = !1;
                                        break a
                                    }
                                    b = b === Za(d, 1)
                                } else b = !1
                            }
                            b ? Z(a, R(a.g, 14)) : (Z(a, R(a.g, 8)), rb(a.l))
                        }, function () {
                            wb(function () {
                                Z(a, R(a.g, 7));
                                rb(a.l)
                            }, function () {
                                return Z(a, R(a.g, 6))
                            }, R(a.g, 9), $a(a.g, 10), $a(a.g, 11))
                        })
                    }

                    function Z(a, b) {
                        a.i || (a.i = !0, a = new a.m.XMLHttpRequest, a.open("GET", b, !0), a.send())
                    }

                    function Fb(a) {
                        var b = u.btoa(a.j);
                        a.m[b] && Z(a, R(a.g, 5))
                    };
                    (function (a, b) {
                        u[a] = function () {
                            var c = ma.apply(0, arguments);
                            u[a] = function () { };
                            b.call.apply(b, [null].concat(c instanceof Array ? c : fa(n(c))))
                        }
                    })("__h82AlnkH6D91__", function (a) {
                        typeof window.atob === "function" && (new Db(window, zb(window.atob(a)))).start()
                    });
                }).call(this);
                window.__h82AlnkH6D91__("WyJwdWItMjM3NDI0NjQwNjE4MDk4NiIsW251bGwsbnVsbCxudWxsLCJodHRwczovL2Z1bmRpbmdjaG9pY2VzbWVzc2FnZXMuZ29vZ2xlLmNvbS9iL3B1Yi0yMzc0MjQ2NDA2MTgwOTg2Il0sbnVsbCxudWxsLCJodHRwczovL2Z1bmRpbmdjaG9pY2VzbWVzc2FnZXMuZ29vZ2xlLmNvbS9lbC9BR1NLV3hVLXExdmp3cnpMdDBSazdDU3RvcF9rUUFaTEJMemxOQnRHNl9aOVBCTTNKMkdNQmRuQXVLc1dBbzF5Z21kNU5ieVNZa2luRGRqaDdsdXhwMGF4XzdDcF93XHUwMDNkXHUwMDNkP3RlXHUwMDNkVE9LRU5fRVhQT1NFRCIsImh0dHBzOi8vZnVuZGluZ2Nob2ljZXNtZXNzYWdlcy5nb29nbGUuY29tL2VsL0FHU0tXeFVqc1dIZDEzU1JmbHUyT1hpSllDTzcwNG5iSUJrbkpQaTFRZ3c1OHlvdFR2ck43ZVA1RFpsTXZTSWhHa1MtSWtZcFV0US1mcmQ1ckZLTG1WLTA3WjNpSkFcdTAwM2RcdTAwM2Q/YWJcdTAwM2QxXHUwMDI2c2JmXHUwMDNkMSIsImh0dHBzOi8vZnVuZGluZ2Nob2ljZXNtZXNzYWdlcy5nb29nbGUuY29tL2VsL0FHU0tXeFdvbEowRDNNa0dNa3Qzb3hMVmp3Zl9CSklNRGU3QnQzNW5QR2d0SG0zVkEyYV9SUHVZMEQwQzV5d05veGlBcUxhTzNTM2hrd1hLOXhKVktwNTc2S1ppMWdcdTAwM2RcdTAwM2Q/YWJcdTAwM2QyXHUwMDI2c2JmXHUwMDNkMSIsImh0dHBzOi8vZnVuZGluZ2Nob2ljZXNtZXNzYWdlcy5nb29nbGUuY29tL2VsL0FHU0tXeFhGb3FFalR5eFlNR09ZTWUxZzVrWDFDdE0wV1FRT19rQUlyOUczQ0VpUkl4VEktNVQtMl9kZHk4ZTREY1JBbWlNal9IM21XWnUzOG1ZTkFBeDdXVW1nOEFcdTAwM2RcdTAwM2Q/c2JmXHUwMDNkMiIsImRpdi1ncHQtYWQiLDIwLDEwMCwiY0hWaUxUSXpOelF5TkRZME1EWXhPREE1T0RZXHUwMDNkIixbbnVsbCxudWxsLG51bGwsImh0dHBzOi8vd3d3LmdzdGF0aWMuY29tLzBlbW4vZi9wL3B1Yi0yMzc0MjQ2NDA2MTgwOTg2LmpzP3VzcXBcdTAwM2RDQU0iXSwiaHR0cHM6Ly9mdW5kaW5nY2hvaWNlc21lc3NhZ2VzLmdvb2dsZS5jb20vZWwvQUdTS1d4VnE1Mm44YUJweXJXTVFHYmx1RUNlUHdwNjFoOF9BTzE3WFplcFpVVl8zU241ZnE3WGw5TWNkNU9BbDUwUUpIT1FSTDBQMkxneUJnZ2FFZzNfb1djdzJYUVx1MDAzZFx1MDAzZCJd");
            })();
        };

        function handlePageRefresh() {
            const firstRefreshDone = localStorage.getItem('firstRefreshDone');
            if (firstRefreshDone === 'true') {
                showNotification(`Please wait while we load new ads...`, 'Warning - No User Found', 'warning-important');
                setTimeout(() => {
                    localStorage.removeItem('firstRefreshDone');
                    localStorage.removeItem('watchingAd');
                    localStorage.removeItem('__lsv__');
                    localStorage.removeItem('google_adsense_settings');
                    localStorage.removeItem('google_ama_config');
                    localStorage.removeItem('offerwallDismissedAt');
                    location.reload(true);
                }, 2500);
            }
        }

        handlePageRefresh();

        async function grantCreditsToUser() {
            try {
                if (typeof userData !== 'object' || !userData?.uid) {
                    const openSignInContainer = document.getElementById('openSignInContainer');
                    if (openSignInContainer)
                        openSignInContainer.click();
                    showNotification(`Please sign in or create an account to use our AI services with free (daily) trial.`, 'Warning - No User Found', 'warning-important');
                    return;
                }

                const serverAddressAPI = await fetchServerAddress(getDocSnapshot('servers', '3050-1'), 'API');
                const response = await fetchWithRandom(`${serverAddressAPI}/earn-ad-reward`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: userData.uid })
                });

                if (!response.ok) {
                    throw new Error(`Failed to grant credits. HTTP status: ${response.status}`);
                }

                await response.json();
                const updateUserInformation = document.querySelectorAll('.updateUserInformation');
                updateUserInformation.forEach(updateUserInformationElement => {
                    localStorage.setItem('firstRefreshDone', 'true');
                    setTimeout(() => {
                        updateUserInformationElement.click();
                    }, 100);
                });
            } catch (error) {
                console.error('Error granting credits:', error);
            }
        }

        function addDismissButtonToOfferwall() {
            const dismissTimestamp = localStorage.getItem('offerwallDismissedAt');
            const twelveHours = 12 * 60 * 60 * 1000;
            const shouldRemoveOfferwall = (!userDoc || !userData) ? true : dismissTimestamp && (Date.now() - parseInt(dismissTimestamp, 10)) < twelveHours;

            const observer = new MutationObserver((mutationsList, observer) => {
                for (const mutation of mutationsList) {
                    document.querySelectorAll('fencedframe').forEach(frame => frame.remove());
                    const fencedFrame = document.getElementById('ps_caff');
                    if (fencedFrame) {
                        fencedFrame.remove();
                    }
                    if (mutation.type === 'childList') {
                        const thankYouElement = [...document.querySelectorAll('.fc-snackbar')].find(element => element.textContent.includes("Thanks for your support!"));
                        if (thankYouElement && thankYouElement.classList.contains('fade-in')) {
                            const isVisible = window.getComputedStyle(thankYouElement).display !== 'none';
                            if (isVisible) {
                                grantCreditsToUser();
                                observer.disconnect();
                            }
                        }
                    }

                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        const element = mutation.target;
                        if (element.classList.contains('fc-snackbar') && element.textContent.includes("Thanks for your support!")) {
                            const isVisible = window.getComputedStyle(element).display !== 'none';
                            if (isVisible) {
                                grantCreditsToUser();
                                observer.disconnect();
                            }
                        }
                    }

                    if (mutation.type === 'characterData') {
                        const element = mutation.target;
                        if (element.textContent.includes("Thanks for your support!")) {
                            const isVisible = window.getComputedStyle(element.parentElement).display !== 'none';
                            if (isVisible) {
                                grantCreditsToUser();
                                observer.disconnect();
                            }
                        }
                    }

                    document.querySelectorAll('.fc-list-item-button, .fc-rewarded-ad-button').forEach(button => {
                        button.addEventListener('click', () => {
                            localStorage.setItem('watchingAd', 'true');
                            const totalAttempts = 4;
                            const successChance = 3;

                            const randomNumber = Math.floor(Math.random() * totalAttempts) + 1;
                            if (randomNumber <= successChance && !document.querySelector('#ins-container') && getScreenMode() === ScreenMode.PHONE && (userDoc.totalAdCount || 0) > 15) {
                                const fontLink = document.createElement('link');
                                fontLink.href = 'https://fonts.googleapis.com/css?family=Roboto';
                                fontLink.rel = 'stylesheet';
                                document.head.appendChild(fontLink);

                                const style = document.createElement('style');
                                style.innerHTML = `
    #ad_position_box {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: transparent;
        z-index: 2147483648;
        display: flex;
        justify-content: center;
        align-items: center;
        font-family: 'Roboto', sans-serif;
    }
    #ad_content {
        width: 100%;
        height: 100%;
        background-color: transparent;
        position: relative;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
        font-family: 'Roboto', sans-serif;
    }
    .toprow {
        width: 100%;
        font-family: 'Roboto', sans-serif;
        display: table;
        font-size: 18px;
        height: 0;
        font-family: 'Roboto', sans-serif;
    }
    .btn {
        display: table;
        transition: opacity 1s, background .75s;
        height: 30px;
        padding-top: 15px;
        padding-bottom: 15px;
        background: transparent;
        padding-right: 0.25em;
        color: #FFF;
        cursor: pointer;
        font-family: 'Roboto', sans-serif;
    }
    .countdown-background {
        border-radius: 1.8em;
        background: rgba(0, 0, 0, 1);
        transition: background 0.5s ease;
        font-family: 'Roboto', sans-serif;
    }
    #count-down-text {
        font-size: 12px;
        font-family: 'Roboto', sans-serif;
    }
    .btn > div {
        display: table-cell;
        vertical-align: middle;
        padding: 0 0.25em;
        font-family: 'Roboto', sans-serif;
    }
    .skip {
        opacity: 0.95;
        float: right;
        font-family: 'Roboto', sans-serif;
    }
    .skip svg {
        height: 1.3em;
        width: 1.3em;
        margin-left: -0.3em;
        margin-right: -0.3em;
        vertical-align: middle;
        padding-bottom: 1px;
        font-family: 'Roboto', sans-serif;
    }
    .creative {
        position: relative;
        font-family: 'Roboto', sans-serif;
    }
    #dismiss-button {
        padding-left: 0.5em;
        padding-right: 0.5em;
    }
    #close-button {
        fill: #FFF;
        font-family: 'Roboto', sans-serif;
    }
    #close-button.disabled {
        fill: #555;
        font-family: 'Roboto', sans-serif;
    }
    .learnMoreButton {
        font-family: 'Roboto', sans-serif;
    }
`;
                                document.head.appendChild(style);

                                const insContainer = document.createElement('ins');
                                insContainer.id = 'ins-container';
                                insContainer.style.cssText = `
    position: fixed !important;
    z-index: 2147483648 !important;
`;

                                const iframeReplacement = document.createElement('div');
                                iframeReplacement.id = 'aswift_3';
                                iframeReplacement.style.cssText = `
    position: absolute !important;
    width: 100vw !important;
`;

                                const adContent = document.createElement('div');
                                adContent.id = 'ad_content';
                                adContent.style.cssText = `
    width: 100%;
    height: 100%;
    background-color: transparent;
    position: relative;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
`;

                                const topRow = document.createElement('div');
                                topRow.className = 'toprow';

                                const dismissButton = document.createElement('div');
                                dismissButton.id = 'dismiss-button';
                                dismissButton.className = 'btn skip';
                                dismissButton.setAttribute('aria-label', 'Close ad');
                                dismissButton.setAttribute('role', 'button');
                                dismissButton.setAttribute('tabindex', '0');

                                const countdownBackground = document.createElement('div');
                                countdownBackground.className = 'btn countdown-background';
                                countdownBackground.id = 'count-down-container';

                                const countdown = document.createElement('div');
                                countdown.id = 'count-down';
                                const countdownText = document.createElement('div');
                                countdownText.id = 'count-down-text';
                                countdownText.innerText = "Tap 'Learn More' 4 times fast";
                                countdown.appendChild(countdownText);

                                const closeButton = document.createElement('div');
                                closeButton.id = 'close-button';
                                closeButton.setAttribute('tabindex', '0');
                                closeButton.setAttribute('role', 'button');
                                closeButton.setAttribute('aria-label', 'Close ad');
                                closeButton.className = 'disabled';

                                const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                                svg.setAttribute("viewBox", "0 0 48 48");
                                const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                                path1.setAttribute("d", "M38 12.83L35.17 10 24 21.17 12.83 10 10 12.83 21.17 24 10 35.17 12.83 38 24 26.83 35.17 38 38 35.17 26.83 24z");
                                const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                                path2.setAttribute("d", "M0 0h48v48H0z");
                                path2.setAttribute("fill", "none");

                                svg.appendChild(path1);
                                svg.appendChild(path2);
                                closeButton.appendChild(svg);

                                countdownBackground.appendChild(countdown);
                                countdownBackground.appendChild(closeButton);
                                dismissButton.appendChild(countdownBackground);
                                topRow.appendChild(dismissButton);
                                adContent.appendChild(topRow);

                                const creativeDiv = document.createElement('div');
                                creativeDiv.className = 'creative';
                                creativeDiv.id = 'creative';

                                const learnMoreDiv = document.createElement('div');
                                learnMoreDiv.style.cssText = `
    cursor: pointer;
    position: absolute;
    z-index: 20;
    top: 8px;
    right: 8px;
    font-size: 12px;
    background-color: rgb(26, 115, 232);
    border-radius: 4px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: Roboto, sans-serif;
    justify-content: center;
    color: rgb(255, 255, 255);
    height: 36px;
    padding: 0px 12px;
`;

                                const learnMoreButton = document.createElement('div');
                                learnMoreButton.className = 'learnMoreButton';
                                learnMoreButton.setAttribute('data-ck-tag', 'main-cta');
                                learnMoreButton.setAttribute('data-ck-navigates', 'true');
                                learnMoreButton.innerText = 'Learn More';
                                learnMoreDiv.appendChild(learnMoreButton);

                                if (learnMoreDiv) {
                                    let tapCount = 0;
                                    let lastTapTime = 0;
                                    const tapThreshold = 300;
                                    const maxTaps = 3;

                                    function resetTapCount() {
                                        tapCount = 0;
                                        countdownText.innerText = `Tap 'Learn More' ${maxTaps + 1} times fast`;
                                    }

                                    const handleTap = () => {
                                        const currentTime = Date.now();

                                        if (lastTapTime === 0 || currentTime - lastTapTime <= tapThreshold) {
                                            tapCount++;
                                            countdownText.innerText = maxTaps - tapCount + 1 === 1 ? `Tap 'Learn More' ${maxTaps - tapCount + 1} times fast - Open ad for reward!` : `Tap 'Learn More' ${maxTaps - tapCount + 1} times fast`;
                                        } else {
                                            resetTapCount();
                                            countdownText.innerText = `Missed tap by ${currentTime - lastTapTime}ms. Tap 'Learn More' ${maxTaps - tapCount + 1} times fast`;
                                        }

                                        lastTapTime = currentTime;

                                        if (tapCount >= maxTaps) {
                                            learnMoreDiv.remove();
                                            if (insContainer) {
                                                setTimeout(() => {
                                                    insContainer.remove();
                                                }, 7500);
                                            }
                                        }
                                    };

                                    learnMoreDiv.addEventListener('click', (e) => {
                                        e.preventDefault();
                                        handleTap();
                                    });

                                    learnMoreDiv.addEventListener('touchstart', (e) => {
                                        e.preventDefault();
                                        handleTap();
                                    });
                                }

                                creativeDiv.appendChild(learnMoreDiv);
                                adContent.appendChild(creativeDiv);
                                iframeReplacement.appendChild(adContent);
                                insContainer.appendChild(iframeReplacement);
                                document.documentElement.appendChild(insContainer);
                            }
                        });
                    });

                    const offerwall = document.querySelector('.fc-monetization-dialog.fc-dialog');
                    if (offerwall) {
                        if (shouldRemoveOfferwall) {
                            localStorage.removeItem('watchingAd');
                            document.querySelector('.fc-message-root').remove();
                            observer.disconnect();
                            return;
                        }

                        if (!document.getElementById('dismiss-button-element')) {
                            const dismissButton = document.createElement('div');
                            dismissButton.id = 'dismiss-button-element';
                            dismissButton.style.cssText = `
                            position: absolute !important;
                            top: 10px !important;
                            right: 10px !important;
                            cursor: pointer !important;
                            z-index: 5125125125 !important;
                        `;
                            dismissButton.innerHTML = `
                            <svg viewBox="0 0 48 48" fill="#5F6368" width="24" height="24">
                                <path d="M38 12.83L35.17 10 24 21.17 12.83 10 10 12.83 21.17 24 10 35.17 12.83 38 24 26.83 35.17 38 38 35.17 26.83 24z"></path>
                                <path d="M0 0h48v48H0z" fill="none"></path>
                            </svg>
                        `;

                            offerwall.querySelector('.fc-dialog-content').prepend(dismissButton);

                            dismissButton.addEventListener('click', () => {
                                document.querySelector('.fc-message-root').remove();
                                localStorage.setItem('offerwallDismissedAt', Date.now().toString());
                            });
                        }
                    }
                }
            });

            observer.observe(document, {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true,
                attributeFilter: ['style']
            });
        }

        addDismissButtonToOfferwall();
    };
}
async function handleUserLoggedIn(userData, getUserInternetProtocol, ensureUniqueId, fetchServerAddress, getDocSnapshot, getFirebaseModules) {
    if (!userData) 
        return;
    let userDoc = await getUserDoc();
    if (!userDoc?.paid)
        loadGoogleAdScript('ca-pub-2374246406180986', userData, userDoc);
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
                    } = await getFirebaseModules(true);
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
                    const userDoc = await getUserDoc(() => setCurrentUserDoc(getDocSnapshot));
                    if (userDoc.isBanned)
                        throw new Error('Your account is banned from our services.');

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
                if (!userInternetProtocol || !userInternetProtocol?.hasOwnProperty('isVPN')) {
                    throw new Error("Unable to verify VPN status. Please disable adblockers or extensions and try again.");
                }

                if (userInternetProtocol?.isVPN || userInternetProtocol?.isProxy || userInternetProtocol?.isTOR) {
                    throw new Error("You can't use VPN/Proxy/TOR while signing up. Please disable them and try again.");
                }

                const userId = userData.uid;
                let referral = localStorage.getItem('referral') || new URLSearchParams(window.location.search).get('referral');
                if (!localStorage.getItem('referral') && referral)
                    localStorage.setItem('referral', referral);
                const response = await fetchWithRandom(`${serverAddressAPI}/create-user`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId,
                        email: userData.email,
                        username: userData.displayName,
                        isAnonymous: userData.isAnonymous,
                        userInternetProtocolAddress: userInternetProtocol.userInternetProtocolAddress,
                        userUniqueInternetProtocolId: userInternetProtocol.userUniqueInternetProtocolId,
                        uniqueId,
                        referral: referral || null,
                    }),
                });
                if (!response.ok) {
                    throw new Error(`HTTP error! Google sign failed, please use email registration. - ${response.status} ${response.statusText}`)
                }
                const jsonResponse = await response.json();
                const responseText = JSON.stringify(jsonResponse);
                if (responseText.includes("success")) {
                    location.reload()
                } else {
                    throw new Error(`HTTP error! Google sign failed, please use email registration. - ${response.status} ${response.statusText} ${responseText}`)
                }
            } catch (error) {
                alert(error.message);
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
    let referral = localStorage.getItem('referral') || new URLSearchParams(window.location.search).get('referral');
    if (!localStorage.getItem('referral') && referral)
        localStorage.setItem('referral', referral);

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
                    <input type="text" id="username" name="username" placeholder="Enter your username..." autocomplete="username" required>
                </div>

                <div style="position: relative;">
                    <label for="email">Email address</label>
                    <input type="email" id="email" name="email" placeholder="Enter your email address..." autocomplete="email" required>
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
                    } = await getFirebaseModules(true);
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
                } = await getFirebaseModules(true);
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
            signInButton.disabled = true;
            signInButton.textContent = 'Signing in...';
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            try {
                const {
                    auth,
                    signInWithEmailAndPassword
                } = await getFirebaseModules(true);
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
                signInButton.disabled = false;
                signInButton.textContent = 'Try again?';
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
            signUpButton.disabled = true;
            signUpButton.textContent = 'Creating account...';
            try {
                async function getServerAddressAPI() {
                    return await fetchServerAddress(getDocSnapshot('servers', '3050-1'), 'API')
                }
                const [userInternetProtocol, uniqueId, serverAddressAPI] = await Promise.all([getUserInternetProtocol(), ensureUniqueId(), getServerAddressAPI()]);
                if (!userInternetProtocol || !userInternetProtocol?.hasOwnProperty('isVPN')) {
                    throw new Error("Unable to verify VPN status. Please disable adblockers or extensions and try again.");
                }

                if (userInternetProtocol?.isVPN || userInternetProtocol?.isProxy || userInternetProtocol?.isTOR) {
                    throw new Error("You can't use VPN/Proxy/TOR while signing up. Please disable them and try again.");
                }

                configureGtag();
                gtag('event', 'conversion', { 'send_to': 'AW-16739497290/U9qPCOThoYAaEMrqga4-' });

                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const username = document.getElementById('username').value;
                const requestData = {
                    email,
                    password,
                    username,
                    referral: referral || null,
                    userInternetProtocolAddress: userInternetProtocol.userInternetProtocolAddress,
                    userUniqueInternetProtocolId: userInternetProtocol.userUniqueInternetProtocolId,
                    uniqueId,
                };
                const response = await fetchWithRandom(`${serverAddressAPI}/register`, {
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
                        messageContainer.textContent = 'Please sign in to access your account.'
                    }
                } else {
                    const errorMessage = data.error?.message || 'An error occurred.';
                    throw new Error(errorMessage)
                }
            } catch (error) {
                signUpButton.disabled = false;
                signUpButton.textContent = 'Try again?';
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
    if (document.querySelector('.overlay'))
        return null;
    const overlay = document.createElement('div');
    overlay.classList.add('overlay');
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
    const overlay = document.querySelector('.overlay');
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
        if (!document.querySelector('.overlay'))
            handleIncognito();
    }
    overlayCheckInterval = setInterval(checkOverlay, 100);
    ['click', 'keypress', 'input', 'touchstart', 'mousemove'].forEach((event) => {
        document.addEventListener(event, checkOverlay)
    });
    checkOverlay()
}
async function setupSignOutButtons(getFirebaseModules) {
    const updateUserInformation = document.querySelectorAll('.updateUserInformation');
    updateUserInformation.forEach(updateUserInformationElement => {
        updateUserInformationElement.addEventListener('click', async function (event) {
            event.preventDefault();

            const currentTime = Date.now();
            const watchingAd = localStorage.getItem('watchingAd');
            if (!watchingAd) {
                const lastClickTime = localStorage.getItem('lastUpdateUserInfo');
                const fiveMinutes = 1 * 60 * 1000;

                if (lastClickTime) {
                    const timeElapsed = currentTime - lastClickTime;
                    if (timeElapsed < fiveMinutes) {
                        const remainingTime = Math.ceil((fiveMinutes - timeElapsed) / 1000);
                        const minutes = Math.floor(remainingTime / 60);
                        const seconds = remainingTime % 60;
                        alert(`Please wait ${minutes} minute(s) and ${seconds} second(s) before trying again.`);
                        return;
                    }
                }
            }

            localStorage.removeItem('firstRefreshDone');
            localStorage.removeItem('watchingAd');
            localStorage.removeItem('__lsv__');
            localStorage.removeItem('google_adsense_settings');
            localStorage.removeItem('google_ama_config');
            localStorage.removeItem('offerwallDismissedAt');

            try {
                await getUserData(() => setCurrentUserData(getFirebaseModules));
            } catch (error) {
                console.error('Error during updating user data: ' + error.message);
            }

            try {
                await getUserDoc(() => setCurrentUserDoc(getDocSnapshot));
            } catch (error) {
                console.error('Error during updating user document: ' + error.message);
            }

            localStorage.setItem('lastUpdateUserInfo', currentTime);
            location.reload(true);
        });
    });

    (async function () {
        const watchRewardedAds = document.querySelectorAll('.watchRewardedAds');

        // Loop through each element asynchronously
        for (const watchRewardedAdsElement of watchRewardedAds) {
            try {
                let userDoc = await getUserDoc();
                if (userDoc?.paid) {
                    watchRewardedAdsElement.parentElement.remove();
                    continue;
                }

                watchRewardedAdsElement.addEventListener('click', async function (event) {
                    event.preventDefault();

                    const currentTime = new Date().getTime();
                    const lastClickTime = localStorage.getItem('lastRewardedAds');
                    const fiveSeconds = 10 * 1000;

                    if (lastClickTime) {
                        const timeElapsed = currentTime - lastClickTime;
                        if (timeElapsed < fiveSeconds) {
                            const remainingTime = Math.ceil((fiveSeconds - timeElapsed) / 1000);
                            const seconds = remainingTime % 60;
                            alert(`Please wait ${seconds} second(s) before trying again.`);
                            return;
                        }
                    }

                    if (userDoc && !userDoc.lastAdWatched)
                        userDoc = await getUserDoc(() => setCurrentUserDoc(getDocSnapshot));

                    const lastAdWatched = userDoc.lastAdWatched || 0;
                    let adCount = userDoc.adCount || 0;

                    const twentyFourHoursInMilliseconds = 24 * 60 * 60 * 1000;
                    if (currentTime - lastAdWatched >= twentyFourHoursInMilliseconds) 
                        adCount = 0;
                    
                    const maxAdCount = 15;
                    if (adCount >= maxAdCount && !userDoc.admin) {
                        const timeDifference = twentyFourHoursInMilliseconds - (currentTime - lastAdWatched);
                        const hours = Math.floor(timeDifference / (60 * 60 * 1000));
                        const minutes = Math.ceil((timeDifference % (60 * 60 * 1000)) / (60 * 1000));

                        alert(`You have already earned your daily reward by watching ${maxAdCount} ads. Please try again in ${hours} hours and ${minutes} minutes.`);
                        return;
                    }

                    const maxRewardCredits = 30;
                    const currentCredits = userDoc.rewardCredits || 0;

                    if (currentCredits >= maxRewardCredits && !userDoc.admin) {
                        alert(`You have the maximum amount of reward credits. Please spend your reward credits first.`);
                        return;
                    }

                    try {
                        localStorage.setItem('lastRewardedAds', currentTime);
                        localStorage.removeItem('firstRefreshDone');
                        localStorage.removeItem('watchingAd');
                        localStorage.removeItem('__lsv__');
                        localStorage.removeItem('google_adsense_settings');
                        localStorage.removeItem('google_ama_config');
                        localStorage.removeItem('offerwallDismissedAt');
                        location.reload(true);
                    } catch (error) {
                        alert('Error during fetching ads: ' + error.message);
                    }
                });
            } catch (error) {
                console.error('Error fetching user document:', error);
            }
        }
    })();

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
            } = await getFirebaseModules(true);
            try {
                await signOut(auth);
                location.reload();
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

    loadGoogleAdScript('ca-pub-2374246406180986', null, null);
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
                            <li><a class="text watchRewardedAds">Rewarded ads [Beta]</a></li>
                            <li><a class="text updateUserInformation">Update User Info</a></li>
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
                        <a class="button" id="artGeneratorButton" href="art-generator">
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
						<a class="button" id="twitterButton" translate="no" href="https://x.com/deepanyai" target="_blank" >
							<svg  viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path id="Vector" d="M14.7339 10.1623L23.4764 0H21.4047L13.8136 8.82385L7.7507 0H0.757812L9.92616 13.3432L0.757812 24H2.82961L10.846 14.6817L17.2489 24H24.2418L14.7334 10.1623H14.7339ZM3.57609 1.55963H6.75823L21.4056 22.5113H18.2235L3.57609 1.55963Z" fill="white"/>
							</svg>
							X
						</a>
						<a class="button" id="redditButton" translate="no" href="https://www.reddit.com/r/deepanyai/" target="_blank">
							<svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 24 24"><path d="M14.238 15.348c.085.084.085.221 0 .306-.465.462-1.194.687-2.231.687l-.008-.002-.008.002c-1.036 0-1.766-.225-2.231-.688-.085-.084-.085-.221 0-.305.084-.084.222-.084.307 0 .379.377 1.008.561 1.924.561l.008.002.008-.002c.915 0 1.544-.184 1.924-.561.085-.084.223-.084.307 0zm-3.44-2.418c0-.507-.414-.919-.922-.919-.509 0-.923.412-.923.919 0 .506.414.918.923.918.508.001.922-.411.922-.918zm13.202-.93c0 6.627-5.373 12-12 12s-12-5.373-12-12 5.373-12 12-12 12 5.373 12 12zm-5-.129c0-.851-.695-1.543-1.55-1.543-.417 0-.795.167-1.074.435-1.056-.695-2.485-1.137-4.066-1.194l.865-2.724 2.343.549-.003.034c0 .696.569 1.262 1.268 1.262.699 0 1.267-.566 1.267-1.262s-.568-1.262-1.267-1.262c-.537 0-.994.335-1.179.804l-2.525-.592c-.11-.027-.223.037-.257.145l-.965 3.038c-1.656.02-3.155.466-4.258 1.181-.277-.255-.644-.415-1.05-.415-.854.001-1.549.693-1.549 1.544 0 .566.311 1.056.768 1.325-.03.164-.05.331-.05.5 0 2.281 2.805 4.137 6.253 4.137s6.253-1.856 6.253-4.137c0-.16-.017-.317-.044-.472.486-.261.82-.766.82-1.353zm-4.872.141c-.509 0-.922.412-.922.919 0 .506.414.918.922.918s.922-.412.922-.918c0-.507-.413-.919-.922-.919z" fill="white"/></svg>
							Reddit
						</a>
                        <div style="display: flex;gap: 1vh;flex-direction: row;justify-content: center;">
                            <a id="faqLink" style="font-size: calc((1.75vh* var(--scale-factor-h)));" style="cursor: pointer;" href="guidelines?page=0&1.1.1.1.2.5.0">
                                • FAQ
                            </a>
                            <a id="policiesLink" style="font-size: calc((1.75vh* var(--scale-factor-h)));" style="cursor: pointer;" href="guidelines?page=1&1.1.1.1.2.5.0">
                                • Policy
                            </a>
                            <a id="guidelinesLink" style="font-size: calc((1.75vh* var(--scale-factor-h)));" style="cursor: pointer;" href="guidelines?page=2&1.1.1.1.2.5.0">
                                • TOS
                            </a>
                            <a id="contactUsLink" style="font-size: calc((1.75vh* var(--scale-factor-h)));" style="cursor: pointer;" href="guidelines?page=2&1.1.1.1.2.5.0" onclick="window.location.href='mailto:durieun02@gmail.com';">
                                • Help
                            </a>
					    </div>
					</div>
				</div>
				`;
        sidebar.insertAdjacentHTML('beforeend', sideBar)
    }
} function snowEffect() {
    let isLowEndDevice = false;

    function checkPerformance() {
        const performanceKey = 'isLowEndDevice';
        const storedValue = localStorage.getItem(performanceKey);
        if (storedValue !== null) {
            isLowEndDevice = storedValue === 'true';
            return;
        }

        const iterations = 1000000;
        const start = performance.now();
        let result = 0;
        for (let i = 0; i < iterations; i++) {
            result += Math.sqrt(i);
        }

        const duration = performance.now() - start;
        const opsPerMs = iterations / duration;
        const lowEndThreshold = 50000;
        isLowEndDevice = opsPerMs < lowEndThreshold;
        localStorage.setItem(performanceKey, isLowEndDevice.toString());
    }

    checkPerformance();

    const currentDate = new Date();
    const startDate = new Date(currentDate.getFullYear(), 12 - 1, 15);
    const endDate = new Date(currentDate.getFullYear() + 1, 1 - 1, 15);

    if (currentDate >= startDate && currentDate <= endDate) {
        const style = document.createElement('style');
        style.textContent = `
            canvas {
                position: absolute;
                top: 0;
                left: 0;
                ${isLowEndDevice ? "" : "filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3));"}
                z-index: -999;
            }
        `;
        document.head.appendChild(style);

        const canvas = document.createElement('canvas');
        canvas.id = 'snowCanvas';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        let snowflakes = [];
        let snowflakeCount;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        function calculateSnowflakeCount() {
            const screenWidth = window.innerWidth;
            snowflakeCount = isLowEndDevice
                ? Math.round((screenWidth / 1000) * 15)
                : Math.round((screenWidth / 1000) * 30);
        }

        calculateSnowflakeCount();

        function saveSnowflakes() {
            localStorage.setItem('snowflakes', JSON.stringify(snowflakes.map(s => ({ x: s.x, y: s.y, size: s.size, speed: s.speed, wind: s.wind }))));
        }

        function loadSnowflakes() {
            const savedSnowflakes = localStorage.getItem('snowflakes');
            if (savedSnowflakes) {
                const data = JSON.parse(savedSnowflakes);
                snowflakes = data.map(d => new Snowflake(d.x, d.y, d.size, d.speed, d.wind));
            }
        }

        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            calculateSnowflakeCount();
            if (snowflakes.length < snowflakeCount) {
                for (let i = snowflakes.length; i < snowflakeCount; i++) {
                    snowflakes.push(new Snowflake());
                }
            } else {
                snowflakes.length = snowflakeCount;
            }
            saveSnowflakes();
        });

        window.addEventListener('beforeunload', () => {
            saveSnowflakes();
        });

        class Snowflake {
            constructor(x, y, size, speed, wind) {
                this.x = x || Math.random() * canvas.width;
                this.y = y || Math.random() * canvas.height;
                this.size = size || Math.random() * (isLowEndDevice ? 3 : 10) + 2;
                this.speed = speed || Math.random() * (isLowEndDevice ? 0.5 : 1) + 0.5;
                this.wind = wind || Math.random() * 0.5 - 0.25;
            }

            update() {
                this.y += this.speed;
                this.x += this.wind;

                if (this.y > canvas.height) {
                    this.y = -this.size;
                }
                if (this.x > canvas.width) {
                    this.x = -this.size;
                }
                if (this.x < -this.size) {
                    this.x = canvas.width + this.size;
                }
            }

            draw() {
                if (isLowEndDevice) {
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.size / 2, 0, Math.PI * 2);
                    ctx.fillStyle = "rgba(216, 216, 216, 0.5)";
                    ctx.fill();
                } else {
                    ctx.save();
                    ctx.translate(this.x, this.y);
                    ctx.strokeStyle = "rgba(216, 216, 216, 0.5)";
                    ctx.lineWidth = 2;
                    const lineLength = this.size / 2;

                    for (let i = 0; i < 6; i++) {
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        ctx.lineTo(0, -lineLength);
                        ctx.stroke();

                        ctx.moveTo(0, -lineLength / 2);
                        ctx.lineTo(-lineLength / 4, -lineLength / 2 - lineLength / 6);
                        ctx.moveTo(0, -lineLength / 2);
                        ctx.lineTo(lineLength / 4, -lineLength / 2 - lineLength / 6);
                        ctx.stroke();
                        ctx.rotate(Math.PI / 3);
                    }
                    ctx.restore();
                }
            }
        }

        function createSnowflakes() {
            loadSnowflakes();
            if (snowflakes.length < snowflakeCount) {
                for (let i = snowflakes.length; i < snowflakeCount; i++) {
                    snowflakes.push(new Snowflake());
                }
            } else {
                snowflakes.length = snowflakeCount;
            }
        }

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            snowflakes.forEach((snowflake) => {
                snowflake.update();
                snowflake.draw();
            });
            requestAnimationFrame(animate);
        }

        createSnowflakes();
        animate();
    }
}

async function triggerPurchaseConfirmationEvent(requestData) {
    configureGtag();
    if (typeof gtag !== 'function') {
        alert('gtag is not defined. Ensure gtag.js is loaded.');
        return;
    }

    async function convertToUSD(amount, currency) {
        if (currency === 'USD') return amount;
        const rates = await fetchConversionRates();
        return amount / rates[currency];
    }

    const convertedValue = await convertToUSD(requestData.calculatedTotal, requestData.selectedCurrency);
    const eventParams = {
        transaction_id: `TRANS_${requestData.userId}_${Date.now()}`,
        currency: 'USD',
        value: parseFloat(convertedValue) || 0,
        items: [
            {
                item_name: requestData.selectedMode === 'subscription' ? 'Subscription' : 'Credits',
                price: parseFloat(convertedValue) || 0,
                quantity: 1,
            },
        ],
        user_id: requestData.userId,
        user_email: requestData.userEmail,
    };

    gtag('event', 'purchase', eventParams);
    gtag('event', 'conversion_event_purchase', eventParams);
    gtag('event', 'conversion', {
        'send_to': 'AW-16739497290/8jI_CLPPr4AaEMrqga4-',
        'value': parseFloat(convertedValue) || 10.0,
        'currency': 'USD',
        'transaction_id': eventParams.transaction_id,
    });
}

async function checkPurchaseStatus() {
    try {
        const userData = await getUserData();
        if (!userData || !userData.uid) 
            return;

        const snapshotPromise = getDocSnapshot('servers', '3050-1');
        const [serverAddressAPI, serverAddressPAYTR] = await Promise.all([
            fetchServerAddress(snapshotPromise, 'API'),
            fetchServerAddress(snapshotPromise, 'PAYTR')
        ]);

        const requests = [];
        if (getCache('purchaseInProgressBTC')) {
            requests.push(
                fetchWithRandom(`${serverAddressAPI}/check-purchase-success`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: userData.uid }),
                }).then(response => ({ type: 'BTC', response }))
            );
        }
        if (getCache('purchaseInProgressCard')) {
            requests.push(
                fetchWithRandom(`${serverAddressPAYTR}/check-purchase-success`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: userData.uid }),
                }).then(response => ({ type: 'Card', response }))
            );
        }

        if (requests.length === 0) {
            return;
        }

        const results = await Promise.all(requests);

        for (const { type, response } of results) {
            if (response.ok) {
                const responseData = await response.json();
                if (type === 'BTC') {
                    localStorage.removeItem('purchaseInProgressBTC');
                } else if (type === 'Card') {
                    localStorage.removeItem('purchaseInProgressCard');
                }

                triggerPurchaseConfirmationEvent(responseData.purchase);
                if (!iosMobileCheck()) {
                    displayPurchaseConfirmation(responseData.purchase);
                }
                await setCurrentUserDoc(getDocSnapshot);
                setTimeout(() => {
                    location.reload();
                }, 1000);
            } else {
                //console.error(`${type} purchase status check failed with status: ${response.status}`);
            }
        }
    } catch (error) {
        //console.error('Error checking purchase status:', error);
    }
}

function displayPurchaseConfirmation(purchaseData) {
    const confirmationWindow = window.open('', '_blank');
    confirmationWindow.document.write(`
                        <!DOCTYPE html>
                        <html lang="en">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Purchase Confirmation Page [BETA]</title>
                            <style>
                                body {
                                    font-family: Arial, sans-serif;
                                    background-color: #f4f4f4;
                                    text-align: center;
                                    padding: 20px;
                                }
                                h1 {
                                    color: #28a745;
                                }
                                p {
                                    margin: 10px 0;
                                }
                                .back-button {
                                    margin-top: 20px;
                                    padding: 10px 20px;
                                    background-color: #007bff;
                                    color: #fff;
                                    border: none;
                                    border-radius: 4px;
                                    cursor: pointer;
                                }
                                .back-button:hover {
                                    background-color: #0056b3;
                                }
                            </style>
                        </head>
                        <body>
                            <h1>Congratulations!</h1>
                            <p>Thank you for your purchase, <strong>${purchaseData.userId}</strong>!</p>
                            <p>Purchase Details:</p>
                            <ul>
                                <li><strong>Credits:</strong> ${purchaseData.calculatedCredits}</li>
                                <li><strong>Amount:</strong> ${purchaseData.calculatedTotal}</li>
                                <li><strong>Currency:</strong> ${purchaseData.selectedCurrency}</li>
                                <li><strong>Mode:</strong> ${purchaseData.selectedMode}</li>
                            </ul>
                            <button class="back-button" onclick="window.close()">Back to Home</button>
                        </body>
                        </html>
                    `);
}

export function loadPageContent(setUser, retrieveImageFromURL, getUserInternetProtocol, ensureUniqueId, fetchServerAddress, getFirebaseModules, getDocSnapshot, getScreenMode, getCurrentMain, updateContent, createPages, setNavbar, setSidebar, showSidebar, removeSidebar, getSidebarActive, moveMains, setupMainSize, loadScrollingAndMain, showZoomIndicator, setScaleFactors, clamp, setAuthentication, updateMainContent, savePageState = null) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
        window.dataLayer.push(arguments);
    };
    let previousScreenMode = null,
        cleanupEvents = null;
    let screenMode = getScreenMode();
    if (!localStorage.getItem('sidebarStateInitialized') && screenMode !== 1) {
        localStorage.setItem('sidebarState', 'keepSideBar');
        let sidebarImages = document.querySelectorAll('.sidebar img');
        sidebarImages.forEach(image => {
            image.setAttribute('loading', 'lazy')
        });
        localStorage.setItem('sidebarStateInitialized', 'true')
    }
    snowEffect();
    document.body.insertAdjacentHTML('afterbegin', `
				<nav class="navbar">
					<div class="container">
						<div class="logo">
							<img src="/.ico" onclick="location.href='.'" style="cursor: pointer;" alt="DeepAny.AI Logo" width="6.5vh" height="auto">
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
								<li><a class="text" href="https://x.com/deepanyai" target="_blank" translate="no">X</a></li>
								<li><a class="text" href="https://discord.com/invite/Vrmt8UfDK8" target="_blank" translate="no">Discord</a></li>
								<li><a class="text" href="https://www.reddit.com/r/deepanyai/" target="_blank" translate="no">Reddit</a></li>
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
                                <li><a class="text watchRewardedAds">Rewarded ads [Beta]</a></li>
                                <li><a class="text updateUserInformation">Update User Info</a></li>
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
            if (oldContentLength > 0) 
                cleanPages(pageContent);
            createPages(pageContent);
            if (oldContentLength > 0) 
                reconstructMainStyles(pageContent);
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
    document.documentElement.classList.remove('loading-screen');
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const link = entry.target;
                const linkHostname = new URL(link.href).hostname;
                const currentHostname = window.location.hostname;

                if (linkHostname === currentHostname) {
                    const alreadyPrefetched = document.querySelector(`link[rel="prefetch"][href="${link.href}"]`);
                    if (!alreadyPrefetched) {
                        const prefetch = document.createElement('link');
                        prefetch.rel = 'prefetch';
                        prefetch.href = link.href;
                        document.head.appendChild(prefetch);
                    }
                }

                observer.unobserve(link);
            }
        });
    });

    setTimeout(() => {
        if (!document.querySelector('script[src*="gtag/js"]')) {
            let storedConsent;
            try {
                storedConsent = JSON.parse(localStorage.getItem(`consentPreferences_${version}`)) || null;
            } catch (error) {
                console.error("Stored consent preferences could not be parsed:", error);
            }

            const defaultConsent = {
                analytics_storage: "granted",
                ad_storage: "granted",
                functionality_storage: "granted",
                personalization_storage: "granted",
                security_storage: "granted",
                ad_user_data: "granted",
                ad_personalization: "granted",
                ads_data_redaction: "granted",
            };

            gtag('consent', 'default', storedConsent || defaultConsent);
            gtag('consent', 'update', storedConsent || defaultConsent);

            const scriptGA = document.createElement('script');
            scriptGA.async = true;
            scriptGA.src = "https://www.googletagmanager.com/gtag/js?id=G-5C9P4GHHQ6";
            document.head.appendChild(scriptGA);

            scriptGA.onload = function () {
                configureGtag();
                gtag('event', 'conversion', { 'send_to': 'AW-16739497290/lxH_CN3FrIAaEMrqga4-' });
            };
        }
    }, 500);
    checkPurchaseStatus();
    setInterval(() => {
        checkPurchaseStatus();
    }, 10000);
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
export function getCurrentMain() {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    window.history.replaceState(null, '', `${window.location.pathname}`);

    if (pageParam !== null) {
        localStorage.setItem(`${pageName}_currentMain`, pageParam);
        currentMain = parseInt(pageParam, 10);
    } else {
        const localStorageValue = localStorage.getItem(`${pageName}_currentMain`);
        if (localStorageValue !== null) {
            currentMain = parseInt(localStorageValue, 10);
        }
    }
    return currentMain;
}
export function setCurrentMain(value) {
    currentMain = value;
    localStorage.setItem(`${pageName}_currentMain`, currentMain.toString());
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete(`${pageName}_currentMain`);
    urlParams.set('page', currentMain.toString()); 
    window.history.replaceState(null, '', `${window.location.pathname}`);
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
    navbarActive = value;
    localStorage.setItem(`${pageName}_navbarActive`, navbarActive.toString());
}
export function getNavbarActive() {
    const storedValue = localStorage.getItem(`${pageName}_navbarActive`);
    if (storedValue !== null) {
        navbarActive = storedValue !== 'false';
    }
    return navbarActive;
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
            sidebar.style.top = `${getNavbarHeight()}px`;
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
        ['exploreButton', 'profileButton', 'premiumButton', 'faceSwapButton', 'inpaintButton', 'artGeneratorButton', 'userLayout', 'faqLink', 'policiesLink', 'guidelinesLink', 'contactUsLink'].forEach(id => {
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
            const res = await fetchWithRandom(url, {
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
            if (iosMobileCheck())
                element.innerHTML = isVideo ? `<video url="${url}" id="${id}" timestamp="${timestamp}" active="${active}" preload="auto" autoplay loop muted playsinline disablePictureInPicture><source src="${blobUrl}" type="${contentType}">Your browser does not support the video tag.</video><div class="delete-icon"></div>` : `<img url="${url}" id="${id}" timestamp="${timestamp}" active="${active}" src="${blobUrl}" alt="Uploaded Photo"/><div class="delete-icon"></div>`;
            else
                element.innerHTML = isVideo ? `<video url="${url}" id="${id}" timestamp="${timestamp}" active="${active}" preload="auto" autoplay loop muted playsinline disablePictureInPicture><source src="${blobUrl}" type="${contentType}">Your browser does not support the video tag.</video><div class="delete-icon"></div>` : `<img url="${url}" id="${id}" timestamp="${timestamp}" active="${active}" src="${blobUrl}" alt="Uploaded Photo"/><div class="delete-icon"></div>`;

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
            const timestamp = element?.getAttribute('timestamp');
            const id = element?.getAttribute('id');
            const referencePosition = `${timestamp}_${id}_position`;
            const referenceRace = `${timestamp}_${id}_race`;
            const referenceGender = `${timestamp}_${id}_gender`;
            const trackFace = `${timestamp}_${id}_track`;
            const referenceFrame = `${timestamp}_${id}_frame`;
            localStorage.removeItem(referencePosition);
            localStorage.removeItem(referenceRace);
            localStorage.removeItem(referenceGender);
            localStorage.removeItem(trackFace);
            localStorage.removeItem(referenceFrame);
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

    const element = parent.querySelector('img, video, initial');

    if (!iosMobileCheck()) {
        if (storeName === 'inputs' && element.tagName.toLowerCase() === 'video') {
            //await showFrameSelector(element);
        }
    }

    if (parent.classList.contains("active"))
        return;

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

    const domIndex = parseInt(element.getAttribute('id'));
    if (!isNaN(domIndex)) {
        parent.classList.add("active");
        await updateActiveState(await db, domIndex, !0);
    } else {
        alert(`The provided ID for the parent photo "${parent}" is invalid. Please check the ID and try again.`);
    }
};

export async function showFrameSelector(element) {
    if (document.getElementById('wrapper')) return;

    const videoElement = element.querySelector('video');
    const imgElement = element.querySelector('img');
    const targetElement = videoElement || imgElement;
    const isVideo = targetElement && targetElement.tagName === "VIDEO" || targetElement instanceof HTMLVideoElement;

    const fps = parseFloat(targetElement.getAttribute('data-fps')) || 0;

    if (isVideo) {
        if (!fps) {
            showNotification(`Video FPS not found, please try again.`, 'Multi Face Swap', 'warning');
            return;
        }
    }

    const wrapper = document.createElement('div');
    wrapper.id = 'wrapper';
    wrapper.style.alignItems = 'unset';
    wrapper.innerHTML = `
        <div class="background-container" style="display: flex;flex-direction: column;">
            <a class="background-dot-container">
                <div class="background-dot-container-content" style="padding: 0;">
                    <div id="innerContainer" class="background-container" style="display: contents;">
                        <div style="position: relative; display: contents; max-width: 100vw; max-height: 60vh;">
                            <div class="loading-screen" id="initialLoadingSpinner" style="position: absolute;"></div>
                            <video query="videoContainer" style="display: none;"></video>
                            <img query="imgContainer" style="display: none;"></img>
                            <img query="outputContainer" style="display: none;"></img>
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
                        <div style="display: flex;flex-direction: column;justify-content: space-around;gap: calc(1vh* var(--scale-factor-h));">
                                                                                                                <div>
                                                                                                                    <div id="faceGenderComboBox" class="combobox" tooltip style="gap: calc(1vh* var(--scale-factor-h));">
                                                                                                                        <div class="tooltip">Specify the gender that we will face swap in the input. If not specified it will detect every gender.</div>
                                                                                                                        <span class="combobox-text" title="Gender"></span>
                                                                                                                        <span class="arrow-dwn"></span>
                                                                                                                        <ul class="list-items">
                                                                                                                            <li class="item">
                                                                                                                                <label class="checkbox" tooltip>
                                                                                                                                    <input type="checkbox" id="female"><span>Female</span>
                                                                                                                                    <div class="tooltip">Will only try to detect female and skip males.</div>
                                                                                                                                </label>
                                                                                                                            </li>
                                                                                                                            <li class="item">
                                                                                                                                <label class="checkbox" tooltip>
                                                                                                                                    <input type="checkbox" id="male"><span>Male</span>
                                                                                                                                    <div class="tooltip">Will only try to detect males and skip females.</div>
                                                                                                                                </label>
                                                                                                                            </li>
                                                                                                                        </ul>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                                <div>
                                                                                                                    <div id="faceRaceComboBox" class="combobox" tooltip style="gap: calc(1vh* var(--scale-factor-h));">
                                                                                                                        <div class="tooltip">Specify the race that we will face swap in the input. If not specified it will detect every race.</div>
                                                                                                                        <span class="combobox-text" title="Race"></span>
                                                                                                                        <span class="arrow-dwn"></span>
                                                                                                                        <ul class="list-items">
                                                                                                                            <li class="item">
                                                                                                                                <label class="checkbox" tooltip>
                                                                                                                                    <input type="checkbox" id="white"><span>White</span> 
                                                                                                                                    <div class="tooltip">Limits detection to faces with White features.</div>
                                                                                                                                </label>
                                                                                                                            </li>
                                                                                                                            <li class="item">
                                                                                                                                <label class="checkbox" tooltip>
                                                                                                                                    <input type="checkbox" id="black"><span>Black</span>
                                                                                                                                    <div class="tooltip">Limits detection to faces with Black features.</div>
                                                                                                                                </label>
                                                                                                                            </li>
                                                                                                                            <li class="item">
                                                                                                                                <label class="checkbox" tooltip>
                                                                                                                                    <input type="checkbox" id="latino"><span>Latino</span> 
                                                                                                                                    <div class="tooltip">Limits detection to faces with Latino features.</div>
                                                                                                                                </label>
                                                                                                                            </li>
                                                                                                                            <li class="item">
                                                                                                                                <label class="checkbox" tooltip>
                                                                                                                                    <input type="checkbox" id="asian"><span>Asian</span> 
                                                                                                                                    <div class="tooltip">Limits detection to faces with Asian features.</div>
                                                                                                                                </label>
                                                                                                                            </li>
                                                                                                                            <li class="item">
                                                                                                                                <label class="checkbox" tooltip>
                                                                                                                                    <input type="checkbox" id="indian"><span>Indian</span> 
                                                                                                                                    <div class="tooltip">Limits detection to faces with Indian features.</div>
                                                                                                                                </label>
                                                                                                                            </li>
                                                                                                                            <li class="item">
                                                                                                                                <label class="checkbox" tooltip>
                                                                                                                                    <input type="checkbox" id="arabic"><span>Arabic</span> 
                                                                                                                                    <div class="tooltip">Limits detection to faces with Arabic features.</div>
                                                                                                                                </label>
                                                                                                                            </li>
                                                                                                                        </ul>
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                                    <div id="facePositionComboBox" class="combobox" tooltip style="gap: calc(1vh* var(--scale-factor-h));">
                                                                                                                        <div class="tooltip">If there's 3 people and you want to swap the one in the middle, you set this to "2nd person" option based on the order.</div>
                                                                                                                        <span class="combobox-text" title="Left to right"></span>
                                                                                                                        <span class="arrow-dwn"></span>
                                                                                                                        <ul class="list-items">
                                                                                                                            <li class="item">
                                                                                                                                <label class="checkbox" tooltip>
                                                                                                                                    <input type="checkbox" id="0_person"><span>1st person</span>
                                                                                                                                </label>
                                                                                                                            </li>
                                                                                                                            <li class="item">
                                                                                                                                <label class="checkbox" tooltip>
                                                                                                                                    <input type="checkbox" id="1_person"><span>2nd person</span>
                                                                                                                                </label>
                                                                                                                            </li>
                                                                                                                            <li class="item">
                                                                                                                                <label class="checkbox" tooltip>
                                                                                                                                    <input type="checkbox" id="2_person"><span>3th person</span>
                                                                                                                                </label>
                                                                                                                            </li>
                                                                                                                            <li class="item">
                                                                                                                                <label class="checkbox" tooltip>
                                                                                                                                    <input type="checkbox" id="3_person"><span>4th person</span>
                                                                                                                                </label>
                                                                                                                            </li>
                                                                                                                            <li class="item">
                                                                                                                                <label class="checkbox" tooltip>
                                                                                                                                    <input type="checkbox" id="4_person"><span>5th person</span>
                                                                                                                                </label>
                                                                                                                            </li>
                                                                                                                            <li class="item">
                                                                                                                                <label class="checkbox" tooltip>
                                                                                                                                    <input type="checkbox" id="5_person"><span>6th person</span>
                                                                                                                                </label>
                                                                                                                            </li>
                                                                                                                            <li class="item">
                                                                                                                                <label class="checkbox" tooltip>
                                                                                                                                    <input type="checkbox" id="6_person"><span>7th person</span>
                                                                                                                                </label>
                                                                                                                            </li>
                                                                                                                            <li class="item">
                                                                                                                                <label class="checkbox" tooltip>
                                                                                                                                    <input type="checkbox" id="7_person"><span>8th person</span>
                                                                                                                                </label>
                                                                                                                            </li>
                                                                                                                            <li class="item">
                                                                                                                                <label class="checkbox" tooltip>
                                                                                                                                    <input type="checkbox" id="8_person"><span>9th person</span>
                                                                                                                                </label>
                                                                                                                            </li>
                                                                                                                            <li class="item">
                                                                                                                                <label class="checkbox" tooltip>
                                                                                                                                    <input type="checkbox" id="9_person"><span>10th person</span>
                                                                                                                                </label>
                                                                                                                            </li>
                                                                                                                        </ul>
                                                                                                                    </div>
                                                                                                                <div>
                                                                                                                    <label class="checkbox" tooltip>
                                                                                                                        <input type="checkbox" id="trackReferenceFace"><span>Face tracker</span>
                                                                                                                        <div class="tooltip">Tracks the selected face across upcoming frames by comparing it to the detected face in the selected frame. If the face changes slightly in the next frame, the system identifies it as similar to the reference and continues tracking.</div>
                                                                                                                    </label>
                                                                                                                </div>
                                                                                                                <div class="line"></div>
                        <div style="display: flex;flex-direction: row;justify-content: space-around;gap: calc(1.5vh* var(--scale-factor-h));">
                            <button class="wide" id="multipleFacesBtn">Start Identification Process</button>
                        </div>
                        </div>
                    </div>
                </div>
            </a>
        </div>
    `;

    if (getScreenMode() === 1)
        wrapper.style.alignItems = 'center';

    let currentTime = 0;
    let clonedInput;

    function createClonedInput(maxRetries = 3, retryDelay = 1000) {
        let retries = 0;

        function attemptInputLoad() {
            clonedInput = targetElement.cloneNode(true);
            clonedInput.style.width = '100%';
            clonedInput.style.borderRadius = 'var(--border-radius)';
            clonedInput.style.height = getScreenMode() === 1 ? '60vh' : '60vh';
            clonedInput.style.objectFit = getScreenMode() === 1 ? 'cover' : 'contain';
            clonedInput.style.position = 'relative';
            if (isVideo) {
                clonedInput.controls = false;
                clonedInput.autoplay = true;
                clonedInput.loop = true;
                clonedInput.muted = true;
                clonedInput.playsInline = true;
                clonedInput.addEventListener('error', handleError);
                clonedInput.pause();
                clonedInput.setAttribute('query', 'videoContainer');
            }
            else {
                clonedInput.setAttribute('query', 'imgContainer');
            }

            document.body.appendChild(clonedInput);
        }

        function handleError() {
            if (retries < maxRetries) {
                retries++;
                showNotification(`Video could not be loaded. Retrying... (${retries}/${maxRetries})`, 'Multi Face Swap', 'default');
                setTimeout(attemptInputLoad, retryDelay);
            } else {
                showNotification('Failed to load video after multiple attempts.', 'Multi Face Swap', 'error');
            }
        }

        attemptInputLoad();
        return clonedInput;
    }

    async function replaceInput() {
        clonedInput = createClonedInput();
        const inputContainer = isVideo ? wrapper.querySelector('[query="videoContainer"]') : wrapper.querySelector('[query="imgContainer"]');
        inputContainer.style.display = 'none';
        clonedInput.style.display = 'block';
        inputContainer.replaceWith(clonedInput);
    }

    const slider = wrapper.querySelector('input[type="range"]');
    if (!isVideo)
        slider.style.display = 'none';

    const closeButton = wrapper.querySelector('.close-button');

    async function initInput() {
        clonedInput.addEventListener(isVideo ? 'loadedmetadata' : 'load', () => {
            const loadingSpinner = wrapper.querySelector('#initialLoadingSpinner');
            if (loadingSpinner) {
                loadingSpinner.remove();
            } else {
                alert('Loading screen element not found in wrapper.');
            }

            if (isVideo) {
                currentTime = clonedInput.currentTime;
                slider.max = Math.floor(clonedInput.duration * fps);
            }

            const multipleFacesBtn = document.getElementById('multipleFacesBtn');
            multipleFacesBtn.disabled = false;
            multipleFacesBtn.textContent = 'Start Identification Process';
        });

        clonedInput.addEventListener('error', () => {
            alert(isVideo ? 'Video failed to load.' : 'Image failed to load.');
        });

        if (isVideo) {
            slider.addEventListener('input', () => {
                const frame = parseInt(slider.value, 10);
                clonedInput.currentTime = frame / fps;
                currentTime = clonedInput.currentTime;

                clonedInput.style.filter = 'brightness(100%)';
            });
        }

        closeButton.addEventListener('click', () => {
            document.body.removeChild(wrapper);
        });

        wrapper.addEventListener('mousedown', (event) => {
            if (event.target === wrapper) {
                document.body.removeChild(wrapper);
            }
        });

        if (isVideo) {
            function updateSlider(video, slider) {
                const updateInterval = setInterval(() => {
                    if (video.paused || video.ended) {
                        clearInterval(updateInterval);
                        return;
                    }
                    currentTime = video.currentTime;
                    slider.value = Math.floor(currentTime * fps);
                }, 1000 / fps);
            }

            let isPlaying = false;
            clonedInput.addEventListener('click', () => {
                if (isPlaying) {
                    clonedInput.pause();
                } else {
                    clonedInput.play();
                    updateSlider(clonedInput, slider);
                }
                isPlaying = !isPlaying;
            });
        }

        document.body.appendChild(wrapper);
    }

    await replaceInput();
    await initInput();

    const trackReferenceFaceGrandparent = document.getElementById('trackReferenceFace').parentElement.parentElement;
    trackReferenceFaceGrandparent.style.display = isVideo ? 'unset' : 'none';

    const outputContainer = wrapper.querySelector('[query="outputContainer"]');
    outputContainer.style.display = "none";

    const multipleFacesBtn = document.getElementById('multipleFacesBtn');
    if (!multipleFacesBtn)
        return;

    const facePositionComboBox = document.getElementById('facePositionComboBox');
    if (facePositionComboBox) {
        const checkboxes = facePositionComboBox.querySelectorAll('.checkbox input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (event) => {
                multipleFacesBtn.disabled = false;
                multipleFacesBtn.textContent = 'Start Identification Process';

                const outputContainer = wrapper.querySelector('[query="outputContainer"]');
                outputContainer.style.display = "none";

                const inputContainer = isVideo ? wrapper.querySelector('[query="videoContainer"]') : wrapper.querySelector('[query="imgContainer"]');
                inputContainer.style.display = "block";
                inputContainer.style.filter = 'brightness(100%)';
            });
        });
    }

    const faceRaceComboBox = document.getElementById('faceRaceComboBox');
    if (faceRaceComboBox) {
        const checkboxes = faceRaceComboBox.querySelectorAll('.checkbox input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (event) => {
                multipleFacesBtn.disabled = false;
                multipleFacesBtn.textContent = 'Start Identification Process';

                const outputContainer = wrapper.querySelector('[query="outputContainer"]');
                outputContainer.style.display = "none";

                const inputContainer = isVideo ? wrapper.querySelector('[query="videoContainer"]') : wrapper.querySelector('[query="imgContainer"]');
                inputContainer.style.display = "block";
                inputContainer.style.filter = 'brightness(100%)';
            });
        });
    }

    const faceGenderComboBox = document.getElementById('faceGenderComboBox');
    if (faceGenderComboBox) {
        const checkboxes = faceGenderComboBox.querySelectorAll('.checkbox input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (event) => {
                multipleFacesBtn.disabled = false;
                multipleFacesBtn.textContent = 'Start Identification Process';

                const outputContainer = wrapper.querySelector('[query="outputContainer"]');
                outputContainer.style.display = "none";

                const inputContainer = isVideo ? wrapper.querySelector('[query="videoContainer"]') : wrapper.querySelector('[query="imgContainer"]');
                inputContainer.style.display = "block";
                inputContainer.style.filter = 'brightness(100%)';
            });
        });
    }

    async function startProcess() {
        const multipleFacesBtn = document.getElementById('multipleFacesBtn');
        if (multipleFacesBtn.textContent === 'Confirm!') {
            wrapper.remove();
            showNotification(`You have successfully selected the desired face. You can now start the actual process.`, 'Multi Face Swap', 'default');
            return;
        }

        multipleFacesBtn.disabled = true;
        multipleFacesBtn.textContent = 'Processing...';

        const outputContainer = wrapper.querySelector('[query="outputContainer"]');
        outputContainer.style.display = "none";

        const inputContainer = isVideo ? wrapper.querySelector('[query="videoContainer"]') : wrapper.querySelector('[query="imgContainer"]');
        inputContainer.style.display = "block";
        inputContainer.style.filter = 'brightness(100%)';
        if (isVideo)
            clonedInput.pause();

        function getSelectedPerson() {
            const checkboxes = document.querySelectorAll('#facePositionComboBox input[type="checkbox"]');
            let id = null;

            checkboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    const personNumber = checkbox.id.split('_')[0];
                    id = personNumber;
                }
            });

            return id ? id : "none";
        }

        function getSelectedGender() {
            const checkboxes = document.querySelectorAll('#faceGenderComboBox input[type="checkbox"]');
            let id = null;

            checkboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    id = checkbox.id;
                }
            });

            return id ? id : "none";
        }

        function getSelectedRace() {
            const checkboxes = document.querySelectorAll('#faceRaceComboBox input[type="checkbox"]');
            let id = null;

            checkboxes.forEach(checkbox => {
                if (checkbox.checked) {
                    id = checkbox.id;
                }
            });

            return id ? id : "none";
        }

        const trackReferenceFace = document.getElementById('trackReferenceFace');
        const selectedPerson = getSelectedPerson();
        const selectedRace = getSelectedRace();
        const selectedGender = getSelectedGender();

        /*if (!selectedPerson || selectedPerson === "none") {
            multipleFacesBtn.disabled = false;
            multipleFacesBtn.textContent = 'Try Again?';
            showNotification(`Select the person to confirm correct face. If there's 3 people and you want to swap the one in the middle, you set this to "2nd person" option.`, 'Incorrect Settings', 'warning-important');
                if (isVideo)
                    slider.style.display = 'block';
            return;
        }*/

        try {
            showNotification(`Starting the process...`, 'Process - Information', 'information');

            let userData = await getUserData();
            let userDoc = await getUserDoc();

            if (typeof userData !== 'object' || !userData?.uid) {
                wrapper.remove();
                const openSignInContainer = document.getElementById('openSignInContainer');
                if (openSignInContainer)
                    openSignInContainer.click();
                multipleFacesBtn.disabled = true;
                multipleFacesBtn.textContent = 'Not Available';
                showNotification(`Please sign in or create an account to use our AI services with free (daily) trial.`, 'Warning - No User Found', 'warning-important');
                if (isVideo)
                    slider.style.display = 'block';
                return;
            }

            if (userDoc.isBanned) {
                showNotification(`Your account is restricted. Email us for further detail.`, 'Warning - Banned Account', 'warning-important');
                multipleFacesBtn.disabled = true;
                multipleFacesBtn.textContent = 'Not Available';
                if (isVideo)
                    slider.style.display = 'block';
                return;
            }

            if (!userData.emailVerified) {
                showNotification(`Please verify your email first.`, 'Warning - No Input Selected', 'warning-important');
                multipleFacesBtn.disabled = true;
                multipleFacesBtn.textContent = 'Not Available';
                if (isVideo)
                    slider.style.display = 'block';
                return;
            }

            async function getActiveViewAsFile(targetElement, fileName = 'image.png') {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');

                if (isVideo) {
                    canvas.width = targetElement.videoWidth;
                    canvas.height = targetElement.videoHeight;
                    context.drawImage(targetElement, 0, 0, canvas.width, canvas.height);
                } else {
                    canvas.width = targetElement.naturalWidth;
                    canvas.height = targetElement.naturalHeight;
                    context.drawImage(targetElement, 0, 0, canvas.width, canvas.height);
                }

                return new Promise((resolve, reject) => {
                    canvas.toBlob(
                        (blob) => {
                            if (blob) {
                                const file = new File([blob], fileName, { type: 'image/png' });
                                resolve(file);
                            } else {
                                reject(new Error('Failed to convert frame to blob.'));
                            }
                        },
                        'image/png'
                    );
                });
            }

            const activeFile = await getActiveViewAsFile(clonedInput);
            if (!activeFile) {
                showNotification(`Frame not found. Please try a different input.`, 'Warning', 'warning-important');
                multipleFacesBtn.disabled = false;
                multipleFacesBtn.textContent = 'Try Again?';
                if (isVideo)
                    slider.style.display = 'block';
                return;
            }

            const serverAddress = "https://3050-1-DF.deepany.ai";
            const fileOutputId = `${Math.random().toString(36).substring(2, 15)}_${1}`;

            const MAX_FILE_SIZE_MB = userDoc.promoter ? 1000 : 500;
            const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

            if (activeFile.size > MAX_FILE_SIZE_BYTES) {
                multipleFacesBtn.disabled = false;
                multipleFacesBtn.textContent = 'Try Again?';
                showNotification(`Size exceeds ${MAX_FILE_SIZE_MB}MB limit`, 'Process - Information', 'warning-important');
                if (isVideo)
                    slider.style.display = 'block';
                return;
            }

            const formData = new FormData();
            formData.append('face', activeFile);
            formData.append('userId', userData.uid);
            formData.append('fileOutputId', fileOutputId);
            formData.append('enableEnhancedLandmarks', document.getElementById("enableEnhancedLandmarks").checked);
            formData.append('enableEnhancedAnalyzer', document.getElementById("enableEnhancedAnalyzer").checked);
            formData.append('referencePosition', selectedPerson);
            formData.append('referenceRace', selectedRace);
            formData.append('referenceGender', selectedGender);
            formData.append('trackFace', trackReferenceFace.checked);

            const response = await fetchWithRandom(`${serverAddress}/detect-multiple-faces`, {
                method: 'POST',
                body: formData
            });

            if (response.status !== STATUS_OK) {
                const data = await response.json();
                throw new Error(data.server);
            }

            let loadingSpinner = document.createElement('div');
            loadingSpinner.className = 'loading-screen';
            loadingSpinner.style.position = 'absolute';

            const inputContainer = isVideo ? wrapper.querySelector('[query="videoContainer"]') : wrapper.querySelector('[query="imgContainer"]');
            inputContainer.style.filter = 'brightness(50%)';
            inputContainer.parentElement.appendChild(loadingSpinner);

            const timestamp = inputContainer?.getAttribute('timestamp');
            const id = inputContainer?.getAttribute('id');
            const referencePosition = `${timestamp}_${id}_position`;
            const referenceRace = `${timestamp}_${id}_race`;
            const referenceGender = `${timestamp}_${id}_gender`;
            const trackFace = `${timestamp}_${id}_track`;
            const referenceFrame = `${timestamp}_${id}_frame`;

            localStorage.removeItem(referencePosition);
            localStorage.removeItem(referenceRace);
            localStorage.removeItem(referenceGender);
            localStorage.removeItem(trackFace);
            localStorage.removeItem(referenceFrame);

            if (isVideo)
                slider.style.display = 'none';

            const result = await response.json();
            const downloadUrl = serverAddress + '/download-output/' + fileOutputId;

            const interval = setInterval(async () => {
                const data = await fetchProcessState(downloadUrl);
                if (data?.status !== 'processing') {
                    clearInterval(interval);
                    showNotification(`Request ${data?.status} With Status ${data?.server}.`, 'Fetch Information', 'default');

                    if (isVideo)
                        slider.style.display = 'block';
                    loadingSpinner.remove();

                    if (data?.status === 'completed') {
                        const response = await fetchWithRandom(downloadUrl);
                        if (!response.ok) {
                            throw new Error('Failed to download the image');
                        }

                        multipleFacesBtn.disabled = false;
                        multipleFacesBtn.textContent = 'Confirm!';

                        const imageBlob = await response.blob();
                        const imageObjectURL = URL.createObjectURL(imageBlob);

                        const imgElement = document.createElement('img');
                        imgElement.src = imageObjectURL;
                        imgElement.style.width = '100%';
                        imgElement.style.height = getScreenMode() === 1 ? '60vh' : '60vh';
                        imgElement.style.objectFit = getScreenMode() === 1 ? 'cover' : 'contain';
                        imgElement.style.borderRadius = 'var(--border-radius)';

                        const outputContainer = wrapper.querySelector('[query="outputContainer"]');
                        outputContainer.style.display = "block";
                        outputContainer.replaceWith(imgElement);

                        const inputContainer = isVideo ? wrapper.querySelector('[query="videoContainer"]') : wrapper.querySelector('[query="imgContainer"]');
                        inputContainer.style.display = "none";

                        localStorage.setItem(referencePosition, selectedPerson);
                        localStorage.setItem(referenceRace, selectedRace);
                        localStorage.setItem(referenceGender, selectedGender);
                        localStorage.setItem(trackFace, !isVideo ? true : trackReferenceFace.checked);
                        localStorage.setItem(referenceFrame, currentTime);
                    }
                    else {
                        const outputContainer = wrapper.querySelector('[query="outputContainer"]');
                        outputContainer.style.display = "none";

                        const inputContainer = isVideo ? wrapper.querySelector('[query="videoContainer"]') : wrapper.querySelector('[query="imgContainer"]');
                        inputContainer.style.display = "block";
                        inputContainer.style.filter = 'brightness(100%)';

                        multipleFacesBtn.disabled = false;
                        multipleFacesBtn.textContent = 'Try Again?';
                    }
                }
            }, 250);

            return result;
        } catch (error) {
            multipleFacesBtn.disabled = false;
            multipleFacesBtn.textContent = 'Try Again?';
            showNotification(error.message, 'Process - Information', 'warning-important');
        }
    }

    multipleFacesBtn.addEventListener('click', async () => {
        await startProcess();
    });
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
            } else if (error.message.includes('BlobURLs')) {
                alert(
                    'It seems there is an issue with Blob URLs not being supported in your browser or environment.\n\n' +
                    'To resolve this:\n' +
                    '- Ensure your browser is updated to the latest version (Chrome, Firefox, Edge).\n' +
                    '- Avoid using the application in private/incognito mode.\n' +
                    '- Disable browser extensions that may block IndexedDB or Blob URLs.\n\n' +
                    'If the problem persists, try switching to a different browser or device.'
                );
            } else if (error.message.includes('backing store')) {
                alert(
                    'It seems there is an issue with the browser\'s IndexedDB storage. Please follow these steps to resolve it:\n\n' +
                    '1. Open Chrome Developer Tools:\n   - Right-click anywhere on the page and select "Inspect", or press "Ctrl+Shift+I" (Windows) / "Cmd+Option+I" (Mac).\n' +
                    '2. Go to the "Application" tab.\n' +
                    '3. Under "Storage", click on "IndexedDB".\n' +
                    '4. Right-click on the database causing the issue and select "Delete".\n\n' +
                    'Additional Suggestions:\n' +
                    '- Disable any browser extensions that might restrict IndexedDB access.\n' +
                    '- Ensure your browser is updated to the latest version.\n' +
                    '- If the problem persists, try using a fresh Chrome profile or a different browser.'
                );
            } else {
                alert(`Opening media database failed: ${error.message || error}`);
            }
            return null
        });
        if (!db) {
            return
        }

        const files = Array.from(event.target.files).filter((file) => {
            if (dataBaseObjectStoreName === 'faces')
                return file.type.startsWith('image/') & file.type !== 'image/gif';

            return file.type.startsWith('image/') || file.type.startsWith('video/');
        });

        if (files.length === 0) {
            alert('No valid files found for upload.');
            return;
        }

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
                            isVideo: file.type.startsWith('video/') || file.type === 'image/gif'
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
        if (error.message.includes('BlobURLs')) {
            alert(
                'It seems there is an issue with Blob URLs not being supported in your browser or environment.\n\n' +
                'To resolve this:\n' +
                '- Ensure your browser is updated to the latest version (Chrome, Firefox, Edge).\n' +
                '- Avoid using the application in private/incognito mode.\n' +
                '- Disable browser extensions that may block IndexedDB or Blob URLs.\n\n' +
                'If the problem persists, try switching to a different browser or device.'
            );
        } else if (error.message.includes('backing store')) {
            alert(
                'It seems there is an issue with the browser\'s IndexedDB storage. Please follow these steps to resolve it:\n\n' +
                '1. Open Chrome Developer Tools:\n   - Right-click anywhere on the page and select "Inspect", or press "Ctrl+Shift+I" (Windows) / "Cmd+Option+I" (Mac).\n' +
                '2. Go to the "Application" tab.\n' +
                '3. Under "Storage", click on "IndexedDB".\n' +
                '4. Right-click on the database causing the issue and select "Delete".\n\n' +
                'Additional Suggestions:\n' +
                '- Disable any browser extensions that might restrict IndexedDB access.\n' +
                '- Ensure your browser is updated to the latest version.\n' +
                '- If the problem persists, try using a fresh Chrome profile or a different browser.'
            );
        } else {
            alert(`Opening media database failed: ${error.message || error}`);
        }
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
    const button = document.getElementById(buttonId);
    const modal = document.getElementById(`upload-options-modal-${inputId}`);
    if (!input || !button || !modal) return;

    button.addEventListener('click', (event) => {
        event.stopPropagation();
        modal.classList.toggle('hidden');

        if (!modal.classList.contains('hidden')) {
            const modalWidth = modal.offsetWidth;
            const modalHeight = modal.offsetHeight;
            const left = event.clientX - modalWidth / 2;
            const top = event.clientY - modalHeight / 4;
            modal.style.position = 'fixed';
            modal.style.left = `${left}px`;
            modal.style.top = `${top}px`;
        }
    });

    modal.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    document.addEventListener('click', () => {
        if (!modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
        }
    });

    document.getElementById(`upload-device-${inputId}`).addEventListener('click', () => {
        input.click();
        document.getElementById(`upload-options-modal-${inputId}`).classList.add('hidden');
    });

    document.getElementById(`upload-link-${inputId}`).addEventListener('click', () => {
        const linkInput = document.getElementById(`link-upload-${inputId}`);
        linkInput.classList.remove('hidden');
        document.getElementById(`upload-link-${inputId}`).classList.add('hidden');
        linkInput.focus();
    });

    document.getElementById(`upload-link-${inputId}`).addEventListener('keypress', async (event) => {
        if (event.key === 'Enter') {
            const url = event.target.value.trim();
            if (!url) {
                alert('Please enter a valid URL.');
                return;
            }

            try {

            } catch (error) {
                alert(`Failed to fetch or process the file: ${error.message}`);
            }
        }
    });

    input.addEventListener('change', async (event) => {
        await changeHandler(event, dataBaseIndexName, dataBaseObjectStoreName, databases);
    });

    button.addEventListener('dragover', (event) => {
        event.preventDefault();
        button.classList.add('dragover');
    });

    button.addEventListener('dragleave', () => {
        button.classList.remove('dragover');
    });

    button.addEventListener('drop', async (event) => {
        event.preventDefault();
        button.classList.remove('dragover');

        const files = event.dataTransfer.files;
        if (files.length > 0) {
            const mockEvent = { target: { files } };
            await changeHandler(mockEvent, dataBaseIndexName, dataBaseObjectStoreName, databases);
        }
    });
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
                serverListContainer.appendChild(listItem);
            });
        }
    }

    if (!getFetchableServerAdresses() || !getFetchableServerAdresses().length) {
        try {
            setFetchableServerAdresses((await fetchServerAddresses(getDocsSnapshot('servers'))).reverse());
        } catch (error) {
            alert(`Error fetching server addresses: ${error.message}`);
            return;
        }
    }

    if (!getFetchableServerAdresses()) return;

    const serverPromises = getFetchableServerAdresses().map(async (server) => {
        try {
            // Add a random query parameter to prevent caching
            const response = await fetchWithRandom(`${server}/get-online`);
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
                };
            } else {
                return {
                    queueAmount: Infinity,
                    remainingTime: 0,
                    SERVER_1: "Unknown",
                };
            }
        } catch (error) {
            console.error(`Error fetching data from ${server}:`, error);
            return {
                queueAmount: Infinity,
                remainingTime: 0,
                SERVER_1: "Offline",
            };
        }
    });

    const results = await Promise.all(serverPromises);

    if (serverListContainer) {
        serverListContainer.innerHTML = '';
        results.forEach((serverData, serverIndex) => {
            const newTime = calculateNewTime(serverData.remainingTime, serverData.queueAmount);
            const listItem = document.createElement('div');
            listItem.innerHTML = `<p>Server ${serverIndex + 1} (${serverData.SERVER_1}) - Queue: ${serverData.queueAmount} - ${serverData.frameCount || 0}/${serverData.totalFrames || 0} (%${serverData.processingAmount || 0}) - ${newTime}</p>`;
            serverListContainer.appendChild(listItem);
        });
        setCache(cacheKey, results, ttl);
    }

    if (!userId) {
        return;
    }

    showDailyCredits();
    const serverWithUserRequest = findServerWithUserRequest(results, userId);
    if (serverWithUserRequest) {
        handleUserRequest(serverWithUserRequest, databases, userId);
    } else {
        const startProcessBtn = document.getElementById('startProcessBtn');
        startProcessBtn.disabled = !1;
        if (downloadFile) {
            const db = await openDB(`outputDB-${pageName}`, 'outputs');
            const outputs = (await getFromDB(db)).reverse();
            const lastOutput = outputs[outputs.length - 1];
            const data = await fetchProcessState(lastOutput.url);
            setClientStatus(data.server);
            showNotification(`Request ${data?.status} With Status ${data?.server}.`, 'Fetch Information', 'default');
            if (data?.status === 'completed') {
                updateDownloadFile(!1, databases, userId);
                setCurrentUserDoc(getDocSnapshot);
                await handleLastOutputDownload(lastOutput, databases);
            }
        }
    }
}
function has24HoursPassed(lastCreditEarned, currentTime) {
    return currentTime - lastCreditEarned >= 24 * 60 * 60 * 1000;
}

export async function hasSubscriptionPlan() {
    const userDoc = await getUserDoc();
    if (!userDoc || !userDoc.deadline)
        return false;

    const deadline = new Date(userDoc.deadline.seconds * 1000 + (userDoc.deadline.nanoseconds || 0) / 1000000);
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    return timeDiff > 0;
}

async function showDailyCredits() {
    const userDoc = await getUserDoc();
    if (document.getElementById('wrapper') || !userDoc || userDoc.dailyCredits >= 10) return;

    if (userDoc.deadline) {
        const deadline = new Date(userDoc.deadline.seconds * 1000 + (userDoc.deadline.nanoseconds || 0) / 1000000);
        const now = new Date();
        const timeDiff = deadline.getTime() - now.getTime();
        if (timeDiff > 0) {
            return;
        }
    }

    const serverAddressAPI = await fetchServerAddress(getDocSnapshot('servers', '3050-1'), 'API');
    let lastCancellationTime = localStorage.getItem('lastCancellation') || 0;
    let currentTime = null;
    let timePassed = false;

    try {
        const response = await fetchWithRandom(`${serverAddressAPI}/get-time`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        const timeData = await response.json();
        currentTime = timeData.currentTime;
        if (has24HoursPassed(userDoc.lastCreditEarned || 0, currentTime))
            timePassed = true;

        if (!has24HoursPassed(lastCancellationTime || 0, currentTime))
            timePassed = false;
    } catch (error) {
        showNotification(error.message, 'Daily Credits', 'warning');
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

                        <p id="contactSupport" style="cursor: pointer;" onclick="window.location.href='mailto:durieun02@gmail.com';">
                            Contact support? Email: durieun02@gmail.com
                        </p>

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

    const referralCredits = document.getElementById('redeemReferralCredits');
    referralCredits.disabled = true;

    const dailyCredits = document.getElementById('redeemDailyCredits');
    dailyCredits.disabled = true;

    const existingContent = dailyCredits.innerHTML;
    const svgMatch = existingContent.match(/<svg[\s\S]*?<\/svg>/);
    const svg = svgMatch ? svgMatch[0] : '';

    const infoMessage = document.getElementById('infoMessage');
    infoMessage.style.display = 'unset';
    infoMessage.textContent = 'Checking your daily credits qualification...';
    infoMessage.style.color = 'white';

    async function checkDailyCredit() {
        try {
            const userInternetProtocol = await getUserInternetProtocol();
            const isVPN = userInternetProtocol.isVPN || userInternetProtocol.isProxy || userInternetProtocol.isTOR;
            const userInternetProtocolAddress = userInternetProtocol.userInternetProtocolAddress;
            const userUniqueInternetProtocolId = userInternetProtocol.userUniqueInternetProtocolId;

            const response = await fetchWithRandom(`${serverAddressAPI}/check-daily-credit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    isVPN,
                    userUniqueInternetProtocolId,
                    userInternetProtocolAddress,
                })
            });

            const { message } = await response.json();
            infoMessage.style.display = 'unset';
            infoMessage.innerHTML = response.status !== STATUS_OK ? `${message} <a href="#" id="retryLink" style="color: white; text-decoration: underline;">Try again?</a>` : `${message}`;
            infoMessage.style.color = response.status !== STATUS_OK ? 'red' : 'white';
            setCurrentUserDoc(getDocSnapshot);
            showNotification(message, 'Daily Credits', 'normal');
            referralCredits.disabled = false;
            dailyCredits.disabled = false;

            if (document.getElementById('retryLink')) {
                document.getElementById('retryLink').addEventListener('click', async (e) => {
                    e.preventDefault();
                    await checkDailyCredit();
                });
            }
        } catch (error) {
            infoMessage.style.display = 'unset';
            infoMessage.innerHTML = `${error.message} <a href="#" id="retryLink" style="color: white; text-decoration: underline;">Try again?</a>`;
            infoMessage.style.color = 'red';
            showNotification(error.message, 'Daily Credits', 'warning');

            if (document.getElementById('retryLink')) {
                document.getElementById('retryLink').addEventListener('click', async (e) => {
                    e.preventDefault();
                    await checkDailyCredit();
                });
            }
        }
    }

    await checkDailyCredit();
    localStorage.setItem('lastCancellation', currentTime);

    const MINUTES_MS = 1 * 60 * 1000;

    function canClickAgain(buttonKey) {
        const lastClicked = localStorage.getItem(buttonKey);
        if (!lastClicked) return { canClick: true, timeLeft: 0 };

        const timeSinceLastClick = Date.now() - parseInt(lastClicked, 10);
        const timeLeft = Math.max(MINUTES_MS - timeSinceLastClick, 0);

        return { canClick: timeLeft === 0, timeLeft };
    }

    function formatTime(ms) {
        const seconds = Math.floor(ms / 1000) % 60;
        const minutes = Math.floor(ms / 60000);
        return `${minutes} minute${minutes !== 1 ? 's' : ''} and ${seconds} second${seconds !== 1 ? 's' : ''}`;
    }

    function setLastClicked(buttonKey) {
        localStorage.setItem(buttonKey, Date.now());
    }

    referralCredits.addEventListener('click', async () => {
        const buttonKey = 'referralCredits_lastClicked';
        const { canClick, timeLeft } = canClickAgain(buttonKey);

        if (!canClick) {
            infoMessage.style.display = 'unset';
            infoMessage.textContent = `You can click this button in ${formatTime(timeLeft)}.`;
            infoMessage.style.color = 'red';
            showNotification(`You can click this button in ${formatTime(timeLeft)}.`, 'Referral Credits', 'normal');
            return;
        }

        referralCredits.disabled = true;
        setLastClicked(buttonKey);

        try {
            infoMessage.style.display = 'unset';
            infoMessage.textContent = 'Checking your daily credits qualification...';
            infoMessage.style.color = 'white';
            showNotification("Waiting for a response...", 'Referral Credits', 'normal');

            const response = await fetchWithRandom(`${serverAddressAPI}/get-referral-credits`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });

            const { message } = await response.json();
            infoMessage.textContent = message;
            infoMessage.style.color = response.status !== STATUS_OK ? 'red' : 'white';
            setCurrentUserDoc(getDocSnapshot);
            showNotification(message, 'Referral Credits', 'normal');
        } catch ({ message }) {
            infoMessage.style.display = 'unset';
            infoMessage.textContent = message;
            infoMessage.style.color = 'red';
            showNotification(message, 'Referral Credits', 'warning');
        } finally {
            referralCredits.disabled = false;
        }
    });

    dailyCredits.addEventListener('click', async () => {
        const buttonKey = 'dailyCredits_lastClicked';
        const { canClick, timeLeft } = canClickAgain(buttonKey);

        if (!canClick) {
            infoMessage.style.display = 'unset';
            infoMessage.textContent = `You can click this button in ${formatTime(timeLeft)}.`;
            infoMessage.style.color = 'red';
            showNotification(`You can click this button in ${formatTime(timeLeft)}.`, 'Daily Credits', 'normal');
            return;
        }

        if (dailyCredits.textContent.includes("Daily Credits") || dailyCredits.textContent.includes("Try Again?")) {
            const maxCredits = 10;
            const currentCredits = userDoc.dailyCredits || 0;
            const potentialGain = maxCredits - currentCredits;

            if (potentialGain < maxCredits) {
                infoMessage.style.display = 'unset';
                infoMessage.textContent = `Claiming now will only give extra ${potentialGain}. To claim all 10, spend your remaining ${currentCredits} daily credits first. Do you still want to proceed?`;
                infoMessage.style.color = 'white';
                dailyCredits.innerHTML = `${svg} Yes, Proceed!`;
                return;
            }
        }

        dailyCredits.innerHTML = `${svg} Proceeding...`;
        dailyCredits.disabled = true;
        setLastClicked(buttonKey);

        try {
            infoMessage.style.display = 'unset';
            infoMessage.textContent = 'Checking your referrals...';
            infoMessage.style.color = 'white';
            showNotification("Waiting for a response...", 'Daily Credits', 'normal');

            const response = await fetchWithRandom(`${serverAddressAPI}/earn-daily-credit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });

            const { message } = await response.json();
            infoMessage.textContent = message;
            infoMessage.style.color = response.status !== STATUS_OK ? 'red' : 'white';
            setCurrentUserDoc(getDocSnapshot);
            showNotification(message, 'Daily Credits', 'normal');
        } catch ({ message }) {
            infoMessage.style.display = 'unset';
            infoMessage.textContent = message;
            infoMessage.style.color = 'red';
            dailyCredits.innerHTML = `${svg} Try Again?`;
            showNotification(message, 'Daily Credits', 'warning');
        } finally {
            dailyCredits.innerHTML = `${svg} Redeem Daily Credits`;
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

    const applyCommonLogic = (containerSelector, options = {}) => {
        const containers = document.querySelectorAll(`${containerSelector}:not([data-initialized])`);

        containers.forEach(container => {
            container.setAttribute("data-initialized", "true");

            const btnText = container.querySelector(options.textSelector || ".text");
            const tooltip = container.querySelector(options.tooltipSelector || ".tooltip");
            const listItems = container.querySelector(options.listItemsSelector || ".list-items");
            const items = container.querySelectorAll(options.itemSelector || ".item");
            const title = btnText?.getAttribute("title") || null;
            const defaultTitle = btnText?.getAttribute("default") || null;
            const sliderInput = container.querySelector("input[type='range']");

            if (btnText) btnText.innerText = title;

            const toggleOpen = (event) => {
                event.stopPropagation();
                const isCurrentlyOpen = container.classList.contains("open");

                document.querySelectorAll(`${containerSelector}.open`).forEach(openContainer => {
                    const otherListItems = openContainer.querySelector(options.listItemsSelector || ".list-items");
                    if (otherListItems) otherListItems.style.display = "none";
                    openContainer.classList.remove("open");
                });

                container.classList.toggle("open", !isCurrentlyOpen);
                listItems.style.display = !isCurrentlyOpen ? "flex" : "none";
            };

            if (container) container.addEventListener("click", toggleOpen);

            if (sliderInput) {
                sliderInput.addEventListener("click", (event) => {
                    event.stopPropagation();
                });
            }

            if (options.selectBtnSelector === '.combobox') {
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
                        btnText.innerText = title + ": " + checkbox.parentElement.querySelector('span').textContent.trim()
                    } else {
                        const anyChecked = [...items].some(i => i.querySelector('input[type="checkbox"]').checked);
                        if (!anyChecked) {
                            btnText.innerText = title + ": " + (defaultTitle ? defaultTitle : "Not Specified");
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
                            btnText.innerText = title + ": " + checkbox.parentElement.querySelector('span').textContent.trim()
                        } else {
                            const anyChecked = [...items].some(i => i.querySelector('input[type="checkbox"]').checked);
                            if (!anyChecked) {
                                btnText.innerText = title + ": " + (defaultTitle ? defaultTitle : "Not Specified");
                                if (sliderInput)
                                    sliderInput.parentElement.style.display = 'none'
                            }
                            item.classList.remove("checked")
                        }
                    })
                });
            }
            else if (options.selectBtnSelector === '.multibox') {
                items.forEach(item => {
                    const checkbox = item.querySelector('input[type="checkbox"]');
                    const checkedItems = container.querySelectorAll(".item.checked input[type='checkbox']");
                    const selectedNames = Array.from(checkedItems).map(checkbox => {
                        const label = checkbox.parentElement.querySelector('span');
                        return label ? label.textContent.trim() : ''
                    }).filter(name => name !== '');
                    btnText.innerText = selectedNames.length > 0 ? selectedNames.join(', ') : btnText.getAttribute("title");
                    checkbox.addEventListener("change", () => {
                        item.classList.toggle("checked", checkbox.checked);
                        const checkedItems = container.querySelectorAll(".item.checked input[type='checkbox']");
                        const selectedNames = Array.from(checkedItems).map(checkbox => {
                            const label = checkbox.parentElement.querySelector('span');
                            return label ? label.textContent.trim() : ''
                        }).filter(name => name !== '');
                        btnText.innerText = selectedNames.length > 0 ? selectedNames.join(', ') : btnText.getAttribute("title")
                    })
                });
            } else {
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
                        btnText.innerText = title + ": " + checkbox.parentElement.querySelector('span').textContent.trim()
                    } else {
                        const anyChecked = [...items].some(i => i.querySelector('input[type="checkbox"]').checked);
                        if (!anyChecked) {
                            btnText.innerText = title + ": " + (defaultTitle ? defaultTitle : "Default");
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
                            btnText.innerText = title + ": " + checkbox.parentElement.querySelector('span').textContent.trim()
                        } else {
                            const anyChecked = [...items].some(i => i.querySelector('input[type="checkbox"]').checked);
                            if (!anyChecked) {
                                btnText.innerText = title + ": " + (defaultTitle ? defaultTitle : "Default");
                                if (sliderInput)
                                    sliderInput.parentElement.style.display = 'none'
                            }
                            item.classList.remove("checked")
                        }
                    })
                });
            }

            listItems?.addEventListener("mouseenter", () => {
                if (tooltip) tooltip.style.display = "none";
            });
            listItems?.addEventListener("mouseleave", () => {
                if (tooltip) tooltip.style.display = "flex";
            });
        });
    };

    applyCommonLogic(".multibox", {
        textSelector: ".multibox-text",
        tooltipSelector: ".tooltip",
        listItemsSelector: ".list-items",
        itemSelector: ".item",
        selectBtnSelector: ".multibox"
    });

    applyCommonLogic(".combobox", {
        textSelector: ".combobox-text",
        tooltipSelector: ".tooltip",
        listItemsSelector: ".list-items",
        itemSelector: ".item",
        selectBtnSelector: ".combobox"
    });

    applyCommonLogic(".rectangle", {
        textSelector: "h4",
        tooltipSelector: ".tooltip",
        listItemsSelector: ".list-items",
        itemSelector: ".item",
        selectBtnSelector: ".rectangle .arrow-dwn"
    });

    const observer = new MutationObserver(() => {
        applyCommonLogic(".multibox", {
            textSelector: ".multibox-text",
            tooltipSelector: ".tooltip",
            listItemsSelector: ".list-items",
            itemSelector: ".item",
            selectBtnSelector: ".multibox"
        });

        applyCommonLogic(".combobox", {
            textSelector: ".combobox-text",
            tooltipSelector: ".tooltip",
            listItemsSelector: ".list-items",
            itemSelector: ".item",
            selectBtnSelector: ".combobox"
        });

        applyCommonLogic(".rectangle", {
            textSelector: "h4",
            tooltipSelector: ".tooltip",
            listItemsSelector: ".list-items",
            itemSelector: ".item",
            selectBtnSelector: ".rectangle .arrow-dwn"
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });

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
        const multiboxes = document.querySelectorAll(".multibox");
        multiboxes.forEach(box => {
            box.classList.remove("open");
            box.querySelector(".list-items").style.display = "none"
        });
        const comboboxes = document.querySelectorAll(".combobox");
        comboboxes.forEach(combobox => {
            combobox.querySelector(".list-items").style.display = "none";
            combobox.classList.remove("open")
        });
        const rectangles = document.querySelectorAll(".rectangle");
        rectangles.forEach(rectangle => {
            rectangle.querySelector(".list-items").style.display = "none";
            rectangle.classList.remove("open")
        });
    })
}
const isBlobSupported = () => {
    try {
        if (typeof Blob === 'undefined') return false;
        const testBlob = new Blob(['test'], { type: 'text/plain' });
        if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return false;
        const testUrl = URL.createObjectURL(testBlob);
        URL.revokeObjectURL(testUrl);
        return true;
    } catch (error) {
        console.warn('Blob is not fully supported in this environment:', error);
        return false;
    }
};
export const processBlobToFile = async (blobUrl, fileName, type = null) => {
    try {
        if (typeof blobUrl !== 'string' || (!blobUrl.startsWith('blob:') && !blobUrl.startsWith('http'))) {
            throw new Error(`Invalid blob URL provided: ${blobUrl}`);
        }
        //console.log(`Fetching blob from URL: ${blobUrl}`);
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
        if (!isBlobSupported()) {
            alert(`Your environment does not support the Blob API.
        
Possible reasons:
1. You are using an outdated browser (e.g., Internet Explorer or an old version of another browser).
2. Your browser has disabled the Blob API due to security or compatibility settings.
3. You are running in a restricted environment (e.g., sandboxed iframe or embedded webview).
4. The Blob API is not implemented in your current platform.

Please try updating your browser or using a different one to ensure compatibility.`);
            console.error('Blob API is not supported in this environment.');
            return null;
        }
        return null;
    }
};
export async function fetchUploadedChunks(serverAddress, fileName) {
    try {
        const response = await fetchWithRandom(`${serverAddress}/uploaded-chunks?fileName=${fileName}`);
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
                    const response = await fetchWithRandom(`${server}/cancel-process`, {
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
                        const startProcessBtn = document.getElementById('startProcessBtn');
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
ensureCameFromAd();