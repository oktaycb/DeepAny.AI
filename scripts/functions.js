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
        const fetchPromises = urls.map((url, index) => fetchWithTimeout(url, 1000, controllers[index]));
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
    setCache(cacheKey, serverAddresses, 7 * 24 * 60 * 60 * 1000);
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

export const addToDB = (db, data, saveCountIndex, isActive = false) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([db.objectStoreNames[0]], 'readwrite');
        const objectStore = transaction.objectStore(db.objectStoreNames[0]);

        let currentIndex = localStorage.getItem(`${db.objectStoreNames[0]}-index`);
        currentIndex = currentIndex === null ? 0 : parseInt(currentIndex, 10);
        currentIndex += 1;
        localStorage.setItem(`${db.objectStoreNames[0]}-index`, currentIndex);

        const timestamp = new Date().getTime(); // Capture the current timestamp

        // Create the entry object with active state
        let entry = {
            timestamp, // Add the timestamp here
            index: currentIndex,
            isActive // Set the isActive state
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
            await saveCountIndex();
            resolve({ index: currentIndex, timestamp });
        };

        request.onerror = (event) => {
            currentIndex -= 1;
            localStorage.setItem(`${db.objectStoreNames[0]}-index`, currentIndex);
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
            results = results.sort((a, b) => b.index - a.index);
            if (limit !== null) {
                results = results.slice(offset, offset + limit);
            }

            resolve(results.map(item => ({
                blob: item.blob || null,
                url: item.url || null,
                index: item.index || null,
                id: item.id || null,
                timestamp: item.timestamp || null,
                isActive: item.isActive || false
            })));
        };

        request.onerror = (event) => {
            reject(`Error retrieving data from database: ${event.target.error}`);
        };
    });
};

export const updateActiveState = async (db, index, isActive) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([db.objectStoreNames[0]], 'readwrite');
        const objectStore = transaction.objectStore(db.objectStoreNames[0]);
        const request = objectStore.get(index);

        request.onsuccess = (event) => {
            const item = event.target.result;
            if (item) {
                item.isActive = isActive; // Set active state based on parameter

                const updateRequest = objectStore.put(item); // Update the object

                updateRequest.onsuccess = () => {
                    console.log(`Item ${isActive ? 'activated' : 'inactivated'}:`, item); // Log the item
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

            for (const [indexInBatch, { blob, url, index, timestamp, isActive }] of mediaItems.entries()) {
                let content = `<initial index="${index}" timestamp="${timestamp}"/></initial>`;

                if (blob && (blob.type.startsWith('video') || blob.type.startsWith('image'))) {
                    const blobUrl = URL.createObjectURL(blob);
                    content = blob.type.startsWith('video')
                        ? `<video index="${index}" timestamp="${timestamp}" playsinline preload="auto" disablePictureInPicture loop muted autoplay><source src="${blobUrl}" type="${blob.type}">Your browser does not support the video tag.</video>`
                        : `<img index="${index}" timestamp="${timestamp}" src="${blobUrl}" alt="Uploaded Photo"/>`;
                } else if (url) {
                    handleDownload({ db, url, element: inputElements[indexInBatch], index });
                }

                inputElements[indexInBatch].innerHTML = `${content}<div class="process-text"></div><div class="delete-icon"></div>`;

                if (isActive) {
                    inputElements[indexInBatch].classList.add('active');
                }
            }

            mediaContainer.style.display = mediaCount > 0 ? 'flex' : 'none';
        }
    } catch (error) {
        console.error(`Database initialization failed: ${error.message}`);
    }
};


export const updateInDB = (db, url, blob, saveCountIndex) => {
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
                    updateRequest.onsuccess = async () => {
                        resolve();
                        await saveCountIndex();
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

export const deleteFromDB = async (db, index, saveCountIndex) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([db.objectStoreNames[0]], 'readwrite');
        const photosObjectStore = transaction.objectStore(db.objectStoreNames[0]);
        const deleteRequest = photosObjectStore.delete(index);

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
                <span class="close-button" style="position: absolute; top: 10px; right: 10px; cursor: pointer;">X</span>
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
                const urlParams = new URLSearchParams(window.location.search);
                const referral = urlParams.get('referral');

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
                        referral,
                    }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                return await response.json();
            } catch (error) {
                console.error('Error during user registration:', error);
                return null;
            }

            location.reload();
        }

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
                <span class="close-button" style="position: absolute; top: 10px; right: 10px; cursor: pointer;">X</span>
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
                <span class="close-button" style="position: absolute; top: 10px; right: 10px; cursor: pointer;">X</span>
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
                const url = new URL(window.location.href);
                const referral = url.searchParams.get('referral') || null;

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
                        messageContainer.textContent = 'Registration successful! Please sign in now.';
                    }
                } else {
                    throw new Error(data);
                }
            } catch (error) {
                messageContainer.style.display = 'block';
                messageContainer.textContent = error.message;

                console.error('Error during user registration:', error);
            }
        });
    }

    const passwordInput = document.getElementById('password');
    const showPasswordIcon = document.querySelector('.input_password_show');

    showPasswordIcon.addEventListener('click', () => {
        const isPasswordVisible = passwordInput.type === 'text';
        passwordInput.type = isPasswordVisible ? 'password' : 'text';
        showPasswordIcon.innerHTML = isPasswordVisible ? `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye">
                    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
            ` : `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-off">
                    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"></path>
                    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"></path>
                    <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.749 10.749 0 0 1 15.417 5.151 1 1 0 0 1 0 .696 10.749 10.749 0 0 1-2.687 3.415"></path>
                    <path d="M6.66 17.623l1.136-1.136"></path>
                    <path d="M16.5 7.5L17.636 6.364"></path>
                    <path d="M6.5 17.5L4.883 19.117"></path>
                    <path d="M19.117 4.883L17.5 6.5"></path>
                </svg>
            `;
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
    const userProfileLayout = document.getElementById("userProfileLayout");
    if (userProfileLayout) userProfileLayout.remove();

    const openSignInContainer = document.getElementById("openSignInContainer");
    if (openSignInContainer) {
        openSignInContainer.addEventListener('click', async (event) => {
            event.preventDefault();
            const createFormSection = createSignFormSection.bind(null, false, retrieveImageFromURL, getFirebaseModules);
            createForm(createFormSection);
        });
    }

    const openSignUpContainer = document.getElementById("openSignUpContainer");
    if (openSignUpContainer) {
        openSignUpContainer.addEventListener('click', async (event) => {
            event.preventDefault();
            const createFormSection = createSignFormSection.bind(null, true, retrieveImageFromURL, getFirebaseModules);
            createForm(createFormSection);
        });
    }
}

export function setAuthentication(retrieveImageFromURL, getUserIpAddress, ensureUniqueId, fetchServerAddress, getFirebaseModules, getDocSnapshot) {
    const signOut = document.getElementById('signOut');
    if (signOut) {
        signOut.addEventListener('click', async function () {
            const { auth, signOut } = await getFirebaseModules();

            localStorage.removeItem('cachedUserData');
            localStorage.removeItem(`cachedUserDocument`);
            localStorage.removeItem('profileImageBase64');

            try {
                await signOut(auth);
                location.reload();
            } catch (error) {
                console.error('Error during sign out:', error);
            }
        });
    }

    const userData = getCachedStaticUserData();
    if (userData) handleUserLoggedIn(userData, getUserIpAddress, ensureUniqueId, fetchServerAddress, getDocSnapshot, getFirebaseModules);
    else handleLoggedOutState(retrieveImageFromURL, getFirebaseModules);
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
							<img onclick="location.href='.'" style="cursor: pointer;" alt="DeepAny.AI Logo" width="calc((6vh * var(--scale-factor-h) + 12vw / 2 * var(--scale-factor-w)))" height="auto" loading="eager">
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
						<li id="userProfileLayout">
							<a id="userLayout" style="display: flex;gap: calc(1vh * var(--scale-factor-h));align-items: center;">
								<img alt="Profile Image" class="profile-image" style="width: calc((6vh* var(--scale-factor-h) + 14vw / 2 * var(--scale-factor-w)));height: calc((6vh* var(--scale-factor-h) + 14vw / 2 * var(--scale-factor-w)));" src="assets/profile.webp">
								<div>
									<p>Hello, <span class="username">Username</span></p>
									<div class="line" style="margin: unset;"></div>
									<p id="creditsAmount">0 Credits</p>
								</div>
							</a>
							<ul class="dropdown-menu">
								<li><a class="text" href="profile">Profile</a></li>
								<li><a class="text" id="signOut">Log Out</a></li>
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
        setAuthentication(retrieveImageFromURL, getUserIpAddress, ensureUniqueId, fetchServerAddress, getFirebaseModules, getDocSnapshot);

        mainQuery = document.querySelectorAll('main');
        sidebar = document.querySelector('.sidebar');
        navbar = document.querySelector('.navbar');
        hamburgerMenu = document.querySelector('.hamburger-menu');

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

    window.gtag = function () {
        if (!window.dataLayer)
            window.dataLayer = window.dataLayer || [];

        if (window.dataLayer)
            window.dataLayer.push(arguments);
    };

    const script = document.createElement('script');
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-BFR70Q5VX1';
    script.defer = true;
    document.head.appendChild(script);

    script.onload = function () {
        gtag('js', new Date());
        gtag('config', 'G-BFR70Q5VX1');
    };
}

let currentMain = 0;
let windowHeight = window.innerHeight;
let windowWidth = window.innerWidth;
let aspectRatio = windowHeight / windowWidth;
let sidebarActive = true;
let navbarActive = true;
let actualNavbarHeight = 0;
let navbarHeight = 0;

export const ScreenMode = Object.freeze({
    PHONE: 3,
    PC: 1,
});

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

        let sideBar = `
				<div style="flex: 1; justify-content: space-between;">
                    <div style="display: flex;gap: 1vh;">
                        <a class="button" id="exploreButton" href=".">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 0C5.38318 0 0 5.38318 0 12C0 18.6168 5.38318 24 12 24C18.6164 24 23.9992 18.6168 23.9992 12C23.9992 5.38318 18.6164 0 12 0ZM17.9313 6.83591L14.1309 13.8977C14.0788 13.9945 13.9995 14.0742 13.9023 14.1264L6.84094 17.9263C6.75694 17.9714 6.66559 17.9932 6.57463 17.9932C6.42889 17.9932 6.28489 17.9369 6.1767 17.8285C6.00097 17.653 5.96129 17.3828 6.07896 17.1641L9.87858 10.1029C9.93084 10.0059 10.0104 9.9262 10.1074 9.87413L17.1695 6.07413C17.3882 5.95626 17.658 5.99613 17.8339 6.17167C18.0093 6.34741 18.0494 6.61721 17.9313 6.83591Z" fill="white"/>
                                <path d="M12.0136 10.6924C11.2898 10.6924 10.7031 11.2784 10.7031 12.0023C10.7031 12.7259 11.2899 13.3129 12.0136 13.3129C12.7367 13.3129 13.3235 12.7259 13.3235 12.0023C13.3235 11.2784 12.7367 10.6924 12.0136 10.6924Z" fill="white"/>
                            </svg>
                            Explore
                        </a>
                        <a class="button" id="profileButton" href="profile">
                            <svg width="24" height="24" viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M6.95279 0.554203C7.03413 0.600771 7.09797 0.674016 7.13412 0.762255C7.17027 0.850494 7.17664 0.948642 7.15223 1.04104L6.04556 5.21405H10.0834C10.1646 5.21405 10.244 5.23846 10.3119 5.28427C10.3798 5.33008 10.4332 5.3953 10.4655 5.47191C10.4979 5.54851 10.5077 5.63317 10.4939 5.71547C10.4801 5.79778 10.4432 5.87414 10.3878 5.93516L4.55444 12.3635C4.4909 12.4337 4.40632 12.4799 4.31423 12.4948C4.22214 12.5097 4.12785 12.4924 4.04645 12.4457C3.96504 12.3989 3.90123 12.3255 3.86521 12.237C3.82919 12.1486 3.82305 12.0503 3.84777 11.9578L4.95444 7.78539H0.916643C0.835442 7.78538 0.756011 7.76097 0.688116 7.71516C0.620221 7.66935 0.56682 7.60413 0.534478 7.52752C0.502135 7.45092 0.492261 7.36626 0.506068 7.28396C0.519876 7.20166 0.556763 7.1253 0.612197 7.06427L6.44556 0.635914C6.5091 0.566 6.59356 0.519971 6.68548 0.505163C6.77741 0.490354 6.87151 0.507618 6.95279 0.554203Z" fill="white"/>
                            </svg>
                            Profile
                        </a>
                        <a class="button important disabled" id="premiumButton" href="pricing">
                            <svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path id="Vector" d="M15.8533 5.76333L12.1773 2.08733C12.0843 1.99433 11.9588 1.94183 11.8278 1.94083L4.23825 1.88283C4.10425 1.88183 3.97575 1.93433 3.88075 2.02933L0.14625 5.76383C-0.04875 5.95933 -0.04875 6.27533 0.14625 6.47083L7.64625 13.9708C7.84175 14.1663 8.15825 14.1663 8.35325 13.9708L15.8533 6.47083C16.0488 6.27533 16.0488 5.95883 15.8533 5.76333ZM12.9533 6.47433L9.37725 10.0858C9.18275 10.2823 8.86625 10.2838 8.66975 10.0893C8.47325 9.89483 8.47175 9.57833 8.66625 9.38183L11.9038 6.11333L10.8098 4.94733C10.6183 4.74883 10.6243 4.43183 10.8233 4.24033C10.9203 4.14633 11.0513 4.09683 11.1858 4.10083C11.3208 4.10483 11.4483 4.16333 11.5393 4.26283L12.9633 5.78133C13.1463 5.97733 13.1423 6.28333 12.9533 6.47433Z" fill="white"/>
                            </svg>
                            Premium
                        </a>
                    </div>
                    <div class="line" style="margin: 0;"></div>
                    <div style="display: flex;gap: 1vh;">
                        <a class="button" id="faceSwapButton" href="face-swap">
                            <svg class="svg-icon" width="24" height="24" style="fill: currentColor;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M848 64h-84c-7.2 0-14.3 2.7-19.8 8.2-5.5 5.5-8.2 12.6-8.2 19.8 0 7.2 2.7 14.3 8.2 19.8 5.5 5.5 12.6 8.2 19.8 8.2h84v84c0 7.2 2.7 14.3 8.2 19.8 5.5 5.5 12.6 8.2 19.8 8.2s14.3-2.7 19.8-8.2c5.5-5.5 8.2-12.6 8.2-19.8v-84c0-30.9-25.1-56-56-56zM876 512c-7.2 0-14.3 2.7-19.8 8.2-5.5 5.5-8.2 12.6-8.2 19.8v84h-84c-7.2 0-14.3 2.7-19.8 8.2-1.5 1.5-2.3 3.4-3.4 5.2-31.6-30.4-67.1-55.4-106.4-72C714.2 517.7 764.7 426 749.2 323c-14.6-96.7-89.6-177.5-185.3-197.5-17.6-3.7-35-5.4-51.9-5.4-132.6 0-240 107.4-240 240 0 87.6 47.5 163.5 117.6 205.4-39.2 16.6-74.8 41.6-106.4 72-1.1-1.8-1.9-3.7-3.4-5.2-5.5-5.5-12.6-8.2-19.8-8.2h-84v-84c0-7.2-2.7-14.3-8.2-19.8-5.5-5.5-12.6-8.2-19.8-8.2s-14.3 2.7-19.8 8.2c-5.5 5.5-8.2 12.6-8.2 19.8v84c0 30.9 25.1 56 56 56h69c-46.8 60.6-79.3 136.5-89.5 221.3-3.8 31.2 21.1 58.7 52.5 58.7h608c31.4 0 56.2-27.6 52.5-58.7-10.2-84.9-42.7-160.8-89.5-221.4h69c30.9 0 56-25.1 56-56v-84c0-7.2-2.7-14.3-8.2-19.8-5.5-5.5-12.6-8.2-19.8-8.2zM211.5 905c16.9-132.8 93.3-242.9 199.9-288 19.4-8.2 32.6-26.7 34.1-47.7 1.5-21.1-9-41.1-27.2-52C361.8 483.6 328 424.7 328 360c0-101.5 82.5-184 184-184 13.4 0 27 1.4 40.4 4.3 72.1 15.1 130.3 77.2 141.4 151.1 11.4 75.5-22.4 146.8-88.2 186-18.1 10.8-28.6 30.9-27.2 52 1.5 21.1 14.6 39.5 34.1 47.7C719 661.9 795.3 771.7 812.4 904l-600.9 1zM148 232c7.2 0 14.3-2.7 19.8-8.2 5.5-5.5 8.2-12.6 8.2-19.8v-84h84c7.2 0 14.3-2.7 19.8-8.2 5.5-5.5 8.2-12.6 8.2-19.8 0-7.2-2.7-14.3-8.2-19.8-5.5-5.5-12.6-8.2-19.8-8.2h-84c-30.9 0-56 25.1-56 56v84c0 7.2 2.7 14.3 8.2 19.8 5.5 5.5 12.6 8.2 19.8 8.2z" fill="white"/></svg>
                            Face Swap
                        </a>
                        <a class="button disabled" id="inpaintButton" href="inpaint">
                            <svg class="svg-icon" width="24" height="24" style="fill: currentColor;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M991.776 535.2c0-25.632-9.984-49.76-28.064-67.872L588.992 92.128c-36.256-36.288-99.488-36.288-135.744-0.032L317.408 227.808c-37.408 37.408-37.44 98.336-0.032 135.776l374.656 375.136c18.144 18.144 42.24 28.128 67.936 28.128 25.632 0 49.728-9.984 67.84-28.096l35.328-35.296 26.112 26.144c12.512 12.512 12.512 32.768 1.856 43.584l-95.904 82.048c-12.448 12.544-32.736 12.48-45.248 0l-245.536-245.824 0 0-3.2-3.2c-37.44-37.408-98.336-37.472-135.744-0.096l-9.632 9.632L294.4 554.336c-6.24-6.24-14.432-9.376-22.624-9.376-8.192 0-16.384 3.136-22.656 9.376 0 0 0 0.032-0.032 0.032l-22.56 22.56c0 0 0 0 0 0l-135.872 135.712c-37.408 37.408-37.44 98.304-0.032 135.776l113.12 113.184c18.688 18.688 43.296 28.064 67.872 28.064 24.576 0 49.152-9.344 67.904-28.032l135.808-135.712c0.032-0.032 0.032-0.096 0.064-0.128l22.528-22.496c6.016-6.016 9.376-14.112 9.376-22.624 0-8.48-3.36-16.64-9.344-22.624l-96.896-96.96 9.6-9.6c12.48-12.544 32.768-12.48 45.248 0.032l0-0.032 3.2 3.2 0 0.032 245.568 245.856c18.944 18.912 43.872 28.256 68.544 28.256 24.032 0 47.808-8.896 65.376-26.56l95.904-82.048c37.44-37.408 37.472-98.336 0.032-135.808l-26.112-26.112 55.232-55.168C981.76 584.928 991.776 560.832 991.776 535.2zM362.144 848.544c-0.032 0.032-0.032 0.096-0.064 0.128l-67.776 67.712c-12.48 12.416-32.864 12.448-45.312 0L135.904 803.2c-12.48-12.48-12.48-32.768 0-45.28l67.904-67.84 0 0 67.936-67.84 158.336 158.432L362.144 848.544zM918.368 557.824l-135.808 135.68c-12.064 12.096-33.152 12.096-45.216-0.032L362.656 318.368c-12.48-12.512-12.48-32.8 0-45.28l135.84-135.712C504.544 131.328 512.576 128 521.12 128s16.608 3.328 22.624 9.344l374.688 375.2c6.016 6.016 9.344 14.048 9.344 22.592C927.776 543.712 924.448 551.744 918.368 557.824z" fill="white"/><path d="M544.448 186.72c-12.352-12.672-32.64-12.832-45.248-0.48-12.64 12.384-12.832 32.64-0.48 45.248l322.592 329.216c6.24 6.368 14.528 9.6 22.848 9.6 8.096 0 16.16-3.04 22.4-9.152 12.64-12.352 12.8-32.608 0.448-45.248L544.448 186.72z" fill="white"/></svg>
                            Inpaint
                        </a>
                        <a class="button disabled" id="artGeneratorButton" href="art-generator">
                            <svg class="svg-icon"  width="24" height="24" style="fill: currentColor;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M512 1024C229.888 1024 0 794.112 0 512S229.888 0 512 0s512 229.888 512 512c0 104.96-44.544 180.736-132.096 225.28-52.736 26.624-109.056 29.696-159.232 31.744-60.928 3.072-99.328 6.144-117.76 37.376-13.312 22.528-3.584 41.984 12.8 71.68 15.36 27.136 36.352 65.024 7.168 100.352-33.28 40.448-82.944 45.568-122.88 45.568z m0-970.24c-252.928 0-458.24 205.824-458.24 458.24s205.824 458.24 458.24 458.24c41.984 0 66.56-7.68 81.408-26.112 5.12-6.144 2.56-13.312-12.288-40.448-16.384-29.696-41.472-74.752-12.288-124.928 33.792-57.856 98.304-60.928 161.28-63.488 46.592-2.048 94.72-4.608 137.216-26.112 69.12-35.328 102.912-93.184 102.912-177.664 0-252.416-205.312-457.728-458.24-457.728z" fill="white" /><path d="M214.016 455.68m-70.144 0a70.144 70.144 0 1 0 140.288 0 70.144 70.144 0 1 0-140.288 0Z" fill="white" /><path d="M384 244.736m-70.144 0a70.144 70.144 0 1 0 140.288 0 70.144 70.144 0 1 0-140.288 0Z" fill="white" /><path d="M645.12 229.376m-70.144 0a70.144 70.144 0 1 0 140.288 0 70.144 70.144 0 1 0-140.288 0Z" fill="white" /><path d="M804.352 426.496m-70.144 0a70.144 70.144 0 1 0 140.288 0 70.144 70.144 0 1 0-140.288 0Z" fill="white"/></svg>
                            Art Generator
                        </a>
                    </div>
                    <div class="line" style="margin: 0;"></div>
                    <div style="display: flex;gap: 1vh;">
						<a class="button" id="discordButton" translate="no" href="https://discord.gg/VvHAj2eBCS" target="_blank">
							<svg width="24" height="24" viewBox="0 0 127.14 96.36" xmlns="http://www.w3.org/2000/svg">
								<path class="cls-1" d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" fill="white"/>
							</svg>
							Discord
						</a>
						<a class="button" id="twitterButton" translate="no" href="https://x.com/zeroduri" target="_blank" >
							<svg width="24" height="24" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path id="Vector" d="M14.7339 10.1623L23.4764 0H21.4047L13.8136 8.82385L7.7507 0H0.757812L9.92616 13.3432L0.757812 24H2.82961L10.846 14.6817L17.2489 24H24.2418L14.7334 10.1623H14.7339ZM3.57609 1.55963H6.75823L21.4056 22.5113H18.2235L3.57609 1.55963Z" fill="white"/>
							</svg>
							X
						</a>
						<a class="button" id="redditButton" translate="no" href="https://www.reddit.com/r/bodyswapai/" target="_blank">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M14.238 15.348c.085.084.085.221 0 .306-.465.462-1.194.687-2.231.687l-.008-.002-.008.002c-1.036 0-1.766-.225-2.231-.688-.085-.084-.085-.221 0-.305.084-.084.222-.084.307 0 .379.377 1.008.561 1.924.561l.008.002.008-.002c.915 0 1.544-.184 1.924-.561.085-.084.223-.084.307 0zm-3.44-2.418c0-.507-.414-.919-.922-.919-.509 0-.923.412-.923.919 0 .506.414.918.923.918.508.001.922-.411.922-.918zm13.202-.93c0 6.627-5.373 12-12 12s-12-5.373-12-12 5.373-12 12-12 12 5.373 12 12zm-5-.129c0-.851-.695-1.543-1.55-1.543-.417 0-.795.167-1.074.435-1.056-.695-2.485-1.137-4.066-1.194l.865-2.724 2.343.549-.003.034c0 .696.569 1.262 1.268 1.262.699 0 1.267-.566 1.267-1.262s-.568-1.262-1.267-1.262c-.537 0-.994.335-1.179.804l-2.525-.592c-.11-.027-.223.037-.257.145l-.965 3.038c-1.656.02-3.155.466-4.258 1.181-.277-.255-.644-.415-1.05-.415-.854.001-1.549.693-1.549 1.544 0 .566.311 1.056.768 1.325-.03.164-.05.331-.05.5 0 2.281 2.805 4.137 6.253 4.137s6.253-1.856 6.253-4.137c0-.16-.017-.317-.044-.472.486-.261.82-.766.82-1.353zm-4.872.141c-.509 0-.922.412-.922.919 0 .506.414.918.922.918s.922-.412.922-.918c0-.507-.413-.919-.922-.919z" fill="white"/></svg>
							Reddit
						</a>
					</div>
                    <div class="line" style="margin: 0;"></div>
                    <div style="display: flex;gap: 1vh;">
						<button id="contactButton" href="mailto:durieun02@gmail.com">
							<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
							<g id="contact">
							<path id="Vector" fill-rule="evenodd" clip-rule="evenodd" d="M8.8717 5.01934H22.1952L14.2817 10.4443L8.89889 6.75418C9.10383 6.20542 9.10556 5.58512 8.8717 5.01934ZM5.38716 8.16803L7.32919 6.98556C7.90552 6.63465 8.09681 5.88596 7.75941 5.30157L6.00614 2.26482C5.82628 1.95324 5.55403 1.75281 5.20312 1.67359C4.85217 1.59432 4.5203 1.65831 4.22395 1.86235L1.02652 4.06379C-0.495469 9.42648 6.34402 21.0365 11.5895 22.3594L15.0947 20.6911C15.4196 20.5365 15.641 20.281 15.7478 19.9374C15.8546 19.5939 15.8172 19.2579 15.6373 18.9464L13.884 15.9096C13.5466 15.3252 12.8026 15.1165 12.2105 15.4402L10.2155 16.5308C8.2425 14.7761 5.92031 10.754 5.38716 8.16803ZM23.1629 5.71703L14.5981 11.5885C14.3977 11.7253 14.1403 11.7146 13.954 11.5808L8.26809 7.68287C8.16037 7.77995 8.04239 7.86845 7.91423 7.94649L6.68592 8.69434C7.33125 10.777 8.92805 13.5427 10.409 15.1429L11.6708 14.4531C12.7983 13.8368 14.2158 14.2344 14.8582 15.3471L15.9455 17.2304H22.2787C22.7788 17.2304 23.1879 16.8212 23.1879 16.3212V5.92853C23.1879 5.85578 23.1792 5.78495 23.1629 5.71703Z" fill="#D1D1D1"/>
							</g>
							</svg>
							Contact
						</button>
						<a class="button disabled" href=".">
							<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
							<g id="Layer 2">
							<path id="Vector" d="M7.15112 10.9938L3.47837 10.5042C2.75859 10.4061 2.09857 10.051 1.62009 9.50438C1.14162 8.95779 0.876977 8.25658 0.875 7.53016V3.5C0.875397 3.1023 1.03356 2.721 1.31478 2.43978C1.596 2.15856 1.9773 2.0004 2.375 2H5.375C5.54228 1.99988 5.7048 2.05573 5.83666 2.15866C5.96853 2.26159 6.06217 2.40568 6.10266 2.56799L7.97766 10.068C8.00524 10.1786 8.00728 10.294 7.98361 10.4055C7.95994 10.5169 7.91119 10.6216 7.84105 10.7114C7.77092 10.8012 7.68124 10.8739 7.57883 10.9239C7.47642 10.9739 7.36397 10.9999 7.25 11L7.15112 10.9938ZM2.375 7.53016C2.37601 7.89334 2.50838 8.24389 2.74766 8.5171C2.98695 8.79031 3.317 8.96773 3.67688 9.0166L6.25427 9.36085L4.78943 3.5H2.37537L2.375 7.53016Z" fill="#D1D1D1"/>
							<path id="Vector_2" d="M14.7499 11C14.6359 11 14.5234 10.9741 14.4209 10.9241C14.3184 10.8741 14.2287 10.8013 14.1586 10.7114C14.0884 10.6215 14.0397 10.5168 14.0162 10.4052C13.9926 10.2937 13.9948 10.1782 14.0226 10.0676L15.8976 2.56799C15.9378 2.4056 16.0313 2.26139 16.1632 2.15842C16.295 2.05545 16.4576 1.99967 16.6249 2H19.6249C20.0226 2.00046 20.4039 2.15864 20.6851 2.43984C20.9663 2.72105 21.1245 3.10232 21.1249 3.5V7.53016C21.1229 8.25649 20.8583 8.95761 20.3799 9.50414C19.9015 10.0507 19.2416 10.4057 18.5219 10.5038L14.8363 10.9952L14.7499 11ZM15.7453 9.36084L18.3234 9.01697C18.6832 8.96788 19.0132 8.79034 19.2523 8.51709C19.4915 8.24384 19.6239 7.89331 19.6249 7.53016V3.5H17.2108L15.7453 9.36084Z" fill="#D1D1D1"/>
							<path id="Vector_3" d="M17.1875 8.31494V1.25C17.1865 1.10114 17.1269 0.958688 17.0216 0.853429C16.9163 0.748169 16.7739 0.688564 16.625 0.6875H5.37503C5.22619 0.688595 5.08375 0.74821 4.9785 0.853463C4.87324 0.958716 4.81363 1.10115 4.81253 1.25V8.31494C4.80833 9.53444 5.21209 10.7203 5.95956 11.6839C6.70703 12.6475 7.75528 13.3334 8.93753 13.6325V17.9375H6.90503C6.68825 17.9362 6.47458 17.989 6.28337 18.0912C6.09217 18.1933 5.92947 18.3416 5.81003 18.5225L5.30759 19.2725C5.17665 19.4705 5.10178 19.7003 5.09091 19.9375C5.08005 20.1747 5.1336 20.4103 5.24588 20.6195C5.35816 20.8287 5.52498 21.0036 5.72863 21.1256C5.93229 21.2476 6.16518 21.3122 6.40259 21.3125H15.1926C15.4519 21.3114 15.7051 21.2335 15.9203 21.0887C16.1354 20.9439 16.3028 20.7386 16.4015 20.4988C16.5002 20.259 16.5256 19.9953 16.4746 19.741C16.4237 19.4868 16.2986 19.2533 16.1151 19.07L15.3651 18.32C15.1197 18.0765 14.7884 17.9391 14.4426 17.9375H13.0625V13.6325C14.2448 13.3334 15.293 12.6475 16.0405 11.6839C16.788 10.7203 17.1917 9.53444 17.1875 8.31494ZM12.6202 7.2425L12.9652 8.6375C12.9847 8.71168 12.9818 8.78997 12.9568 8.86251C12.9319 8.93504 12.8861 8.99858 12.8251 9.0451C12.7641 9.09162 12.6907 9.11905 12.6142 9.12392C12.5376 9.1288 12.4613 9.11091 12.395 9.0725L11.195 8.39C11.1366 8.35322 11.069 8.3337 11 8.3337C10.931 8.3337 10.8634 8.35322 10.805 8.39L9.60514 9.07243C9.53875 9.11084 9.46248 9.12873 9.38593 9.12386C9.30939 9.11898 9.236 9.09155 9.17502 9.04503C9.11404 8.99851 9.0682 8.93498 9.04327 8.86244C9.01835 8.7899 9.01545 8.71161 9.03495 8.63743L9.38011 7.24243C9.39863 7.17689 9.39935 7.1076 9.38219 7.04169C9.36504 6.97578 9.33063 6.91563 9.28251 6.86743L8.54001 6.13243C8.48559 6.07756 8.44862 6.00781 8.43375 5.93197C8.41888 5.85612 8.42678 5.77758 8.45646 5.70622C8.48614 5.63486 8.53626 5.57387 8.60052 5.53094C8.66479 5.488 8.74031 5.46504 8.8176 5.46493H9.80765C9.88404 5.46239 9.9582 5.43858 10.0218 5.39618C10.0854 5.35379 10.1359 5.2945 10.1677 5.22497L10.6401 4.11497C10.6692 4.04344 10.7191 3.98222 10.7832 3.93913C10.8473 3.89604 10.9228 3.87302 11.0001 3.87302C11.0773 3.87302 11.1528 3.89604 11.2169 3.93913C11.2811 3.98222 11.3309 4.04344 11.3601 4.11497L11.8325 5.22497C11.8642 5.29452 11.9148 5.35383 11.9784 5.39622C12.042 5.43861 12.1162 5.46241 12.1926 5.46493H13.1827C13.26 5.46507 13.3355 5.48805 13.3997 5.531C13.464 5.57395 13.5141 5.63494 13.5437 5.7063C13.5734 5.77765 13.5812 5.85618 13.5664 5.93201C13.5515 6.00784 13.5145 6.07757 13.4601 6.13243L12.7176 6.86743C12.6695 6.91565 12.6351 6.97581 12.618 7.04174C12.6008 7.10766 12.6016 7.17696 12.6202 7.2425Z" fill="#D1D1D1"/>
							</g>
							</svg>
							Affiliation
						</a>
						<a class="button disabled" href="settings">
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
							<g clip-path="url(#clip0_3128_4961)">
							<path d="M18.975 8.95L17.0812 7.05625V4.375C17.0805 3.98567 16.9256 3.61247 16.6503 3.33717C16.375 3.06187 16.0018 2.90691 15.6125 2.90625H12.9312L11.0375 1.0125C10.7613 0.739223 10.3885 0.585937 9.99995 0.585938C9.61143 0.585938 9.23861 0.739223 8.96245 1.0125L7.0687 2.90625H4.38745C3.99812 2.90691 3.62492 3.06187 3.34962 3.33717C3.07432 3.61247 2.91936 3.98567 2.9187 4.375V7.05625L1.02495 8.95C0.888287 9.08601 0.779841 9.24769 0.705842 9.42573C0.631843 9.60378 0.59375 9.79469 0.59375 9.9875C0.59375 10.1803 0.631843 10.3712 0.705842 10.5493C0.779841 10.7273 0.888287 10.889 1.02495 11.025L2.9187 12.925V15.6C2.91845 15.7929 2.95628 15.9841 3.03 16.1624C3.10372 16.3407 3.2119 16.5027 3.34834 16.6391C3.48477 16.7755 3.64678 16.8837 3.82509 16.9575C4.0034 17.0312 4.1945 17.069 4.38745 17.0688H7.0687L8.96245 18.9625C9.09846 19.0992 9.26013 19.2076 9.43818 19.2816C9.61623 19.3556 9.80714 19.3937 9.99995 19.3937C10.1928 19.3937 10.3837 19.3556 10.5617 19.2816C10.7398 19.2076 10.9014 19.0992 11.0375 18.9625L12.9312 17.0688H15.6125C15.8054 17.069 15.9965 17.0312 16.1748 16.9575C16.3531 16.8837 16.5151 16.7755 16.6516 16.6391C16.788 16.5027 16.8962 16.3407 16.9699 16.1624C17.0436 15.9841 17.0814 15.7929 17.0812 15.6V12.925L18.975 11.025C19.1116 10.889 19.2201 10.7273 19.2941 10.5493C19.3681 10.3712 19.4062 10.1803 19.4062 9.9875C19.4062 9.79469 19.3681 9.60378 19.2941 9.42573C19.2201 9.24769 19.1116 9.08601 18.975 8.95ZM9.99995 13.125C9.38188 13.125 8.7777 12.9417 8.26379 12.5983C7.74989 12.255 7.34935 11.7669 7.11283 11.1959C6.8763 10.6249 6.81442 9.99653 6.935 9.39034C7.05558 8.78415 7.3532 8.22733 7.79024 7.79029C8.22728 7.35325 8.7841 7.05563 9.39029 6.93505C9.99648 6.81447 10.6248 6.87635 11.1958 7.11288C11.7669 7.3494 12.2549 7.74994 12.5983 8.26384C12.9417 8.77775 13.125 9.38193 13.125 10C13.125 10.8288 12.7957 11.6237 12.2097 12.2097C11.6236 12.7958 10.8288 13.125 9.99995 13.125Z" fill="white"/>
							</g>
							</svg>
							Settings
						</a>
					</div>
				</div>
				`;

        if (screenMode === ScreenMode.PHONE) {
            sideBar = `
                <a href="profile" id="userLayout" style="display: flex; gap: calc(1vh * var(--scale-factor-h)); align-items: center;">
                    <img alt="Profile Image" class="profile-image" style="width: calc((6vh * var(--scale-factor-h) + 14vw / 2 * var(--scale-factor-w))); height: calc((6vh * var(--scale-factor-h) + 14vw / 2 * var(--scale-factor-w)));">
                    <div>
                        <p>Hello, <span class="username">Username</span></p>
                        <div class="line" style="margin: unset;"></div>
                        <p id="creditsAmount">0 Credits</p>
                    </div>
                </a>
                <div class="line"></div>
            ` + sideBar;
        }

        sidebar.innerHTML = sideBar;

        if (screenMode === ScreenMode.PHONE)
            setUser();

        ['exploreButton', 'profileButton', 'premiumButton', 'faceSwapButton', 'inpaintButton', 'artGeneratorButton', 'userLayout'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', () => localStorage.setItem('sidebarState', 'removeSidebar'));
            }
        });
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

    for (let index = 0; index < numberOfPages; index++) {
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

    mainQuery.forEach((main, index) => {
        main.style.display = 'grid';
        main.style.top = `${index * getWindowHeight() + getNavbarHeight()}px`;
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
    let scrollAttemptedOnce = false; // Track if the user has scrolled once
    let lastScrollTime = 0; // Track the last scroll event time
    let lastScrollDirection = ''; // Track the last scroll direction ('up' or 'down')

    function getCurrentMainElement() {
        const currentIndex = getCurrentMain();
        return mainQuery[currentIndex]; // Return the current main element based on the index
    }

    function showMain(index, transitionDuration = 250) {
        if (mainQuery.length > 1 && index >= 0 && index < mainQuery.length && !scrolling) {
            if (sidebarActive && getScreenMode() !== ScreenMode.PC) return;

            scrolling = true;
            const wentDown = index >= getCurrentMain();
            setCurrentMain(index);
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
        if (event.ctrlKey) {
            console.log('Wheel event ignored due to ctrlKey:', event.ctrlKey);
            return;
        }
        handleScroll(event.deltaY > 0 ? 'down' : 'up');
    };

    const handleScroll = (direction) => {
        const currentTime = Date.now();

        const currentMainElement = getCurrentMainElement();
        if (!currentMainElement) return;

        const atTop = currentMainElement.scrollTop === 0;
        const atBottom = currentMainElement.scrollTop + currentMainElement.clientHeight >= currentMainElement.scrollHeight;
        const isMainScrollable = currentMainElement.scrollHeight > currentMainElement.clientHeight;

        // Check the time since the last scroll attempt
        if (scrollAttemptedOnce && (currentTime - lastScrollTime < 500 / 2)) {
            console.log('Scroll attempt ignored due to time constraint:', currentTime - lastScrollTime);
            return; // Ignore the scroll attempt
        }

        // Update last scroll time
        lastScrollTime = currentTime;

        // Reset the scroll attempt if the direction is different
        if (scrollAttemptedOnce && direction !== lastScrollDirection) {
            console.log('Scroll attempt reset due to direction change:', direction);
            scrollAttemptedOnce = false; // Reset for the next use
        }

        // Update last scroll direction
        lastScrollDirection = direction;

        // If the main is not scrollable, directly use custom scrolling
        if (!isMainScrollable) {
            if (direction === 'down') {
                showMain(getCurrentMain() + 1);
            } else {
                showMain(getCurrentMain() - 1);
            }
            return; // Exit after handling the custom scrolling
        }

        // For scrollable main, check top/bottom state for second scroll attempt
        if (atTop || atBottom) {
            if (scrollAttemptedOnce) {
                console.log('Second scroll attempt:', direction);
                if (direction === 'down') {
                    showMain(getCurrentMain() + 1);
                } else {
                    showMain(getCurrentMain() - 1);
                }
                scrollAttemptedOnce = false; // Reset for next use
            } else {
                console.log('First scroll attempt, waiting for second:', direction);
                scrollAttemptedOnce = true; // Set to true for the next scroll
            }
        } else {
            console.log('Main is scrollable, normal scrolling allowed.');
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
    mainContainers.forEach((mainContainer, index) => {
        if (contents[index]) {
            mainContainer.innerHTML = '';
            mainContainer.insertAdjacentHTML('beforeend', contents[index]);
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