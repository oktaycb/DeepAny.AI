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

export function retrieveImageFromURL(photoURL, callback, retries = 2, delay = 1000, createBase64 = false) {
    fetch(photoURL)
        .then(response => {
            if (response.ok) {
                return response.blob();
            } else if (response.status === 429 && retries > 0) {
                setTimeout(() => {
                    console.log(`Retrying... Attempts left: ${retries}`);
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
        const fetchPromises = urls.map((url, index) => fetchWithTimeout(url, 1000, controllers[index]));
        const data = await Promise.any(fetchPromises);
        controllers.forEach(controller => controller.abort());
        return data.ip;
    } catch (error) {
        console.error('All attempts to fetch IP address failed:', error);
        return null;
    }
}

export async function fetchServerAddress(snapshotPromise, fieldId) {
    const cacheKey = `serverAddress-${fieldId}`;
    const cachedAddress = getCache(cacheKey);
    if (cachedAddress) return cachedAddress;

    const snapshot = await snapshotPromise;
    if (snapshot && snapshot.exists()) {
        const serverAddress = snapshot.data()[`serverAdress-${fieldId}`];
        setCache(cacheKey, serverAddress || null, 7 * 24 * 60 * 60 * 1000);
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
    if (!storedUniqueId) {
        const newUniqueId = await generateBID();
        localStorage.setItem('uniqueUserBrowserRegisterId', newUniqueId);
        return newUniqueId;
    }

    return storedUniqueId;
}
