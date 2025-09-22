window.isMobileDevice = function () {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
function encodeValue(email) {
    return btoa(unescape(encodeURIComponent(email)));
}
const storedVersion = localStorage.getItem('version') || '5.3.5';
const urlVersion = new URLSearchParams(window.location.search).get('version');
const version = urlVersion || storedVersion;

let referral = localStorage.getItem('referral') || new URLSearchParams(window.location.search).get('referral');

if (!localStorage.getItem('referral') && referral)
    localStorage.setItem('referral', referral);

let currentMain = 0;
let windowHeight = window.innerHeight;
let windowWidth = window.innerWidth;
let aspectRatio = windowHeight / windowWidth;
let sidebarActive = !0;
let navbarActive = !0;
let actualNavbarHeight = 0;
let navbarHeight = 0;

export function getPageName() {
    const url = window.location.pathname;
    const pathArray = url.split('/');
    return pathArray[pathArray.length - 1] || 'default'
}
export const pageName = getPageName();

export function dispatchEvent(event) {
    window.dispatchEvent(new Event(event))
}
export function getScreenMode() {
    const aspectRatio = getAspectRatio();
    if (aspectRatio < 4 / 4) return ScreenMode.PHONE;
    return ScreenMode.PC
}
export function getCurrentMain() {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');

    if (pageParam !== null) {
        localStorage.setItem(`${pageName}_currentMain`, pageParam);
        currentMain = parseInt(pageParam, 10);

        // Remove only the "page" param from the URL
        urlParams.delete('page');
        const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
        window.history.replaceState(null, '', newUrl);
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
    urlParams.set('page', currentMain.toString());

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.replaceState(null, '', newUrl);
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
    sidebarActive = value;
    localStorage.setItem(`${pageName}_sidebarActive`, sidebarActive.toString());
}

export function getSidebarActive() {
    const storedValue = localStorage.getItem(`${pageName}_sidebarActive`);
    if (storedValue !== null) {
        sidebarActive = storedValue !== 'false';
    }
    return sidebarActive;
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
        ['exploreButton', 'profileButton', 'premiumButton', 'faceSwapButton', 'inpaintButton', 'artGeneratorButton', 'videoGeneratorButton', 'userLayout', 'faqLink', 'policiesLink', 'guidelinesLink', 'contactUsLink'].forEach(id => {
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

const wasSidebarActive = getSidebarActive();
const isFirstVisit = !localStorage.getItem("firstVisit");
if (isFirstVisit)
    localStorage.setItem("firstVisit", "1");

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
        return mainQuery[currentIndex];
    }

    function showMain(id, transitionDuration = 250) {
        if (mainQuery.length > 1 && id >= 0 && id < mainQuery.length && !scrolling) {
            if (sidebarActive && getScreenMode() !== ScreenMode.PC) {
                return;
            }
            scrolling = !0;
            const wentDown = id >= getCurrentMain();
            setCurrentMain(id);
            if (wentDown) {
                removeNavbar(navbar, mainQuery, sidebar);
            } else {
                showNavbar(navbar, mainQuery, sidebar);
            }
            setTimeout(() => {
                scrolling = !1;
            }, transitionDuration);
        }
    }

    const handleKeydown = (event) => {
        const tag = document.activeElement.tagName.toLowerCase();
        const isTyping = (
            tag === 'input' ||
            tag === 'textarea' ||
            document.activeElement.isContentEditable
        );

        if (!scrolling && !isTyping) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                handleScroll('down');
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                handleScroll('up');
            }
        }
    };

    const handleWheel = (event) => {
        if (event.ctrlKey) return;
        const direction = event.deltaY > 0 ? 'down' : 'up';
        handleScroll(direction);
    };

    const handleScroll = (direction) => {
        const currentTime = Date.now();
        const currentMainElement = getCurrentMainElement();
        if (!currentMainElement) {
            return;
        }

        const atTop = currentMainElement.scrollTop === 0;
        const atBottom = currentMainElement.scrollTop + currentMainElement.clientHeight >= currentMainElement.scrollHeight;
        const isMainScrollable = currentMainElement.scrollHeight > currentMainElement.clientHeight;

        if (scrollAttemptedOnce && (currentTime - lastScrollTime < 250)) {
            return;
        }

        lastScrollTime = currentTime;

        if (scrollAttemptedOnce && direction !== lastScrollDirection) {
            scrollAttemptedOnce = !1;
        }

        lastScrollDirection = direction;

        if (!isMainScrollable) {
            showMain(getCurrentMain() + (direction === 'down' ? 1 : -1));
            return;
        }

        if (atTop || atBottom) {
            if (scrollAttemptedOnce) {
                showMain(getCurrentMain() + (direction === 'down' ? 1 : -1));
                scrollAttemptedOnce = !1;
            } else {
                scrollAttemptedOnce = !0;
            }
        }
    };

    const handleEvent = (e) => {
        if (!e) return;
        const { clientY, clientX } = e.type === 'touchstart' ? e.touches[0] : e;
        if (clientY > navbar.offsetHeight) {
            if (!clientX) {
                return showSidebar(sidebar, hamburgerMenu, setUser, setAuthentication, retrieveImageFromURL, getUserInternetProtocol, ensureUniqueId, fetchServerAddress, getFirebaseModules, getDocSnapshot);
            }
            if (e.type === 'click' && clientX > sidebar.offsetWidth && !e.target.closest('a')) {
                removeSidebar(sidebar, hamburgerMenu);
            }
        } else {
            showNavbar(navbar, mainQuery, sidebar);
        }
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

let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

export async function fetchWithRandom(url, options = {}) {
    //console.log("fetching ", url);
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
let firebaseModules = null;
export async function getFirebaseModules(useCache = false) {
    if (firebaseModules && useCache) {
        return firebaseModules;
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
        signInWithRedirect,
        signInWithCredential,
        signInWithEmailAndPassword,
        signInWithCustomToken,
        createUserWithEmailAndPassword,
        onAuthStateChanged,
        signOut
    } = firebaseAuthModule;

    const {
        getFirestore,
        collection,
        doc,
        getDoc,
        getDocs,
        //setLogLevel
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
    //setLogLevel('debug');

    firebaseModules = {
        auth,
        db,
        GoogleAuthProvider,
        sendEmailVerification,
        sendPasswordResetEmail,
        signInWithPopup,
        signInWithRedirect,
        signInWithCredential,
        signInWithEmailAndPassword,
        signInWithCustomToken,
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
    const { db, doc, getDoc, collection } = await getFirebaseModules();
    console.log(`[getDocSnapshot] Start fetching document '${documentId}' from collection '${collectionId}'`);
    const snapshot = await getDoc(doc(collection(db, collectionId), documentId));
    if (snapshot.exists()) {
        console.log(`[getDocSnapshot] Document '${documentId}' fetched successfully`, snapshot.data());
    } else {
        console.warn(`[getDocSnapshot] Document '${documentId}' does not exist`);
    }
    return snapshot;
}
export async function getDocSnapshotByField(collectionId, fieldName, value) {
    const { db, collection, getDocs, query, where } = await getFirebaseModules();
    console.log(`[getDocSnapshotByField] Searching '${collectionId}' where ${fieldName} == '${value}'`);

    const q = query(collection(db, collectionId), where(fieldName, '==', value));
    const snap = await getDocs(q);

    if (snap.empty) {
        console.warn(`[getDocSnapshotByField] No document found for ${fieldName}=${value}`);
        return null;
    }

    const firstDoc = snap.docs[0];
    console.log(`[getDocSnapshotByField] Found document '${firstDoc.id}'`, firstDoc.data());
    return firstDoc;
}
export async function getDocsSnapshot(collectionId) {
    const { db, getDocs, collection } = await getFirebaseModules();
    console.log(`[getDocsSnapshot] Start fetching all documents from collection '${collectionId}'`);
    const snapshot = await getDocs(collection(db, collectionId));
    console.log(`[getDocsSnapshot] Fetched ${snapshot.size} document(s) from collection '${collectionId}'`);
    return snapshot;
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
const CACHE_EXPIRATION_TIME = 12 * 60 * 60 * 1000;
export async function setCurrentUserDoc(getDocSnapshot, useCache = false) {
    if (useCache) {
        let cachedUserDoc = localStorage.getItem('cachedUserDocument');
        if (cachedUserDoc) {
            cachedUserDoc = JSON.parse(cachedUserDoc);
            const currentTime = Date.now();
            if (currentTime - cachedUserDoc.timestamp < CACHE_EXPIRATION_TIME) {
                setUser(cachedUserDoc.data);
                return true;
            } else {
                console.log('[setCurrentUserDoc] Cached user document expired');
            }
        } else {
            console.log('[setCurrentUserDoc] No cached user document found');
        }
    }
    const userData = await getUserData();
    console.log(`[setCurrentUserDoc] Fetching user document for uid: ${userData?.uid}`);
    const userDocSnap = await getDocSnapshot('users', userData.uid);
    if (!userDocSnap || !userDocSnap.exists()) {
        console.warn('[setCurrentUserDoc] User document not found');
        return false;
    }
    const userDoc = userDocSnap.data();
    localStorage.setItem('cachedUserDocument', JSON.stringify({
        data: userDoc,
        timestamp: Date.now(),
    }));
    console.log('[setCurrentUserDoc] User document cached and set');
    setUser(userDoc);
    return true;
}
export function simulateFullClick(target) {
    if (!target) return;

    try {
        if (typeof target.click === 'function') {
            target.click();
        }
    } catch (e) { }
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

        const deadlines = [userDoc.deadline, userDoc.deadlineDF, userDoc.deadlineDV, userDoc.deadlineDA, userDoc.deadlineDN].filter(Boolean);

        if (deadlines.length) {
            const getDeadlineDate = d => new Date(d.seconds * 1000 + (d.nanoseconds || 0) / 1000000);
            const now = new Date();

            let maxDeadline = null;
            let maxTimeDiff = -Infinity;

            for (const d of deadlines) {
                const deadlineDate = getDeadlineDate(d);
                const timeDiff = deadlineDate.getTime() - now.getTime();
                if (timeDiff > maxTimeDiff) {
                    maxTimeDiff = timeDiff;
                    maxDeadline = deadlineDate;
                }
            }

            if (maxTimeDiff > 0) {
                const minuteInMs = 1000 * 60;
                const hourInMs = minuteInMs * 60;
                const dayInMs = hourInMs * 24;
                const yearInMs = dayInMs * 365;
                const monthInMs = dayInMs * 30;

                const years = Math.floor(maxTimeDiff / yearInMs);
                const months = Math.floor((maxTimeDiff % yearInMs) / monthInMs);
                const days = Math.floor((maxTimeDiff % monthInMs) / dayInMs);
                const hours = Math.floor((maxTimeDiff % dayInMs) / hourInMs);
                const minutes = Math.floor((maxTimeDiff % hourInMs) / minuteInMs);

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
        username.value = userDoc.username
    }
    return !0
}
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
    if (!imgElement)
        return;

    imgElement.addEventListener('click', function () {
        const inputElement = document.createElement("input");
        inputElement.type = "file";
        inputElement.accept = "image/*";
        inputElement.style.display = "none";
        document.body.appendChild(inputElement);
        simulateFullClick(inputElement);
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
        'https://api.ipapi.is/',
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

export function serverID() {
    if (pageName.includes('face-swap')) return 'DF';
    if (pageName.includes('inpaint')) return 'DN';
    if (pageName.includes('art-generator')) return 'DA';
    if (pageName.includes('video-generator')) return 'DV';
    return null;
}

export function documentID() {
    const serverId = serverID();
    if (!serverId)
        return null;

    return 'serverAdress-' + serverId;
}

export async function fetchServerAddresses(snapshotPromise, filter = true, serverType = null) {
    const ttl = 6 * 60 * 60 * 1000;
    const cacheKey = `${pageName}-serverAddresses-${version}`;

    let cachedAddresses = getCache(cacheKey, ttl);
    if (cachedAddresses && (
            cachedAddresses.some(address => address === undefined || address === 'undefined') ||
            cachedAddresses.length < 1))
    {
        localStorage.removeItem(cacheKey);
        cachedAddresses = null;
    }

    if (cachedAddresses) 
        return cachedAddresses;

    console.log('[fetchServerAddresses] cache miss → fetching snapshot');
    const snapshot = await snapshotPromise();

    let serverAddresses = snapshot.docs
        .map(doc => {
            console.log('[fetchServerAddresses] fetched doc:', doc.id);
            return doc.data()[serverType ? serverType : documentID()];
        })
        .filter(Boolean);

    if (!filter)
        serverAddresses = snapshot.docs.map(doc => {
            console.log('[fetchServerAddresses] fetched doc:', doc.id);
            return doc.data()[serverType ? serverType : documentID()];
        });

    console.log('[fetchServerAddresses] fetched addresses:', serverAddresses);
    setCache(cacheKey, serverAddresses, ttl);
    return serverAddresses;
}

export async function fetchServerAddress(snapshotPromise, fieldId) {
    const ttl = 6 * 60 * 60 * 1000;
    const cacheKey = `serverAddress-${fieldId}-${version}`;
    const cachedAddress = getCache(cacheKey, ttl);

    if (cachedAddress) {
        console.log(`[fetchServerAddress] Cache hit for ${cacheKey}:`, cachedAddress);
        if (typeof cachedAddress === 'string' &&
            (cachedAddress.includes('6000') || cachedAddress.includes('5090') || cachedAddress.includes('4090') || cachedAddress.includes('3090') || cachedAddress.includes('3050'))) {
            return cachedAddress;
        } else {
            console.log(`[fetchServerAddress] Cache invalid for ${cacheKey}, removing.`);
            localStorage.removeItem(cacheKey);
        }
    } else {
        console.log(`[fetchServerAddress] Cache miss for ${cacheKey}`);
    }

    const snapshot = await snapshotPromise();
    if (snapshot && snapshot.exists()) {
        const serverAddress = snapshot.data()[`serverAdress-${fieldId}`];
        console.log(`[fetchServerAddress] Fetched from snapshot and setting cache for ${cacheKey}:`, serverAddress);
        setCache(cacheKey, serverAddress || null, ttl);
        return serverAddress || null;
    }

    console.log(`[fetchServerAddress] Snapshot missing or does not exist for ${cacheKey}`);
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
function checkIfCameFromAd() {
    const urlParams = new URLSearchParams(window.location.search);
    const adParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'gclid', 'fbclid', 'gad_source', 'gbraid', 'utm_id', 'adgroup', 'ref', 'affid',
        'ttclid', 'li_fat_id', 'wbraid', 'ads', 'via'
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
        localStorage.setItem('cameFromAd', checkIfCameFromAd());

    if (!cameFromAd || cameFromAd === 'false' || !isValidString(cameFromAd)) 
        return;

    const userData = await getUserData();
    if (!userData || !userData.uid) return;
    if (!userDoc || userDoc.cameFromAd) return;

    const serverDocSnapshot = () => getDocSnapshot('servers', '3090-1');
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
function normalizeUniqueId(uniqueId) {
    if (Array.isArray(uniqueId)) {
        return uniqueId;
    }
    if (typeof uniqueId === 'string') {
        return [uniqueId];
    }
    throw new Error('Invalid uniqueId format');
}

async function getServerAddressAPI() {
    const serverDocSnapshot = () => getDocSnapshot('servers', '3090-1');
    return await fetchServerAddress(serverDocSnapshot, 'API')
}

async function logServers() {
    console.log('Log started...');
    const serverDocSnapshot = await getDocSnapshot('servers', '3090-1');
    console.log(serverDocSnapshot.exists() ? serverDocSnapshot.data() : 'Document does not exist');
}

//logServers();

export async function ensureUniqueId() {
    let storedUniqueId = localStorage.getItem('userUniqueBrowserId');
    let uniqueIdArray;

    if (storedUniqueId && storedUniqueId.length > 0) {
        try {
            storedUniqueId = JSON.parse(storedUniqueId);
        } catch (e) {
            console.error('Error parsing storedUniqueId:', e);
            storedUniqueId = null;
        }
    }

    if (storedUniqueId && storedUniqueId.length > 0) {
        uniqueIdArray = normalizeUniqueId(storedUniqueId);
    }

    window.addEventListener('storage', (event) => {
        if (event.key === 'userUniqueBrowserId' && event.newValue === null) {
            localStorage.setItem('userUniqueBrowserId', JSON.stringify(uniqueIdArray));
        }
    });

    if (!uniqueIdArray || uniqueIdArray.length <= 0 || uniqueIdArray.some(id => id.length !== 24)) {
        uniqueIdArray = await loadEvercookieUserUniqueBrowserId();

        if (storedUniqueId && storedUniqueId.length > 0) {
            uniqueIdArray = normalizeUniqueId(storedUniqueId);
        }

        try {
            const userData = await getUserData();
            if (!userData || !userData.uid) {
                throw new Error('User data is unavailable or incomplete.');
            }

            const userId = userData.uid;
            const serverDocSnapshot = () => getDocSnapshot('servers', '3090-1');
            const serverAddressAPI = await fetchServerAddress(serverDocSnapshot, 'API');

            const serverResponse = await fetchWithRandom(serverAddressAPI + '/set-unique-browser-id', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId,
                    uniqueId: uniqueIdArray,
                    storedUniqueId: storedUniqueId && storedUniqueId.length > 0 ? storedUniqueId : null
                }),
            });

            if (!serverResponse.ok) {
                throw new Error(`Server error: ${serverResponse.statusText}`);
            }

            await setCurrentUserDoc(getDocSnapshot);
        } catch (error) {
            console.error('Error in ensureUniqueId:', error);
        }
    }

    return uniqueIdArray;
}

export function generateUID() {
    //console.log('generateUID called');
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789%^&*()_-+=';
    let uniqueId = '';
    for (let i = 0; i < 24; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        uniqueId += characters.charAt(randomIndex);
    }
    return uniqueId;
}

async function loadEvercookieUserUniqueBrowserId() {
    console.log('[loadEvercookieUserUniqueBrowserId] called');
    const generatedId = generateUID();

    await loadJQueryAndEvercookie();
    const ec = new evercookie();

    const storeUniqueId = (uniqueIdArray) => {
        ec.set('userUniqueBrowserId', JSON.stringify(uniqueIdArray));
    };

    return new Promise((resolve) => {
        ec.get('userUniqueBrowserId', async (storedUniqueId, all) => {
            if (storedUniqueId && storedUniqueId.length > 0) {
                try {
                    storedUniqueId = JSON.parse(storedUniqueId);
                } catch (e) {
                    console.error('Error parsing storedUniqueId:', e);
                    storedUniqueId = null;
                }
            }

            if (storedUniqueId && storedUniqueId.length > 0) {
                let uniqueIdArray = normalizeUniqueId(storedUniqueId);
                if (uniqueIdArray && Array.isArray(uniqueIdArray) && uniqueIdArray.length > 0) {
                    const allValid = uniqueIdArray.every(element => element.length === 24);
                    if (allValid) {
                        storeUniqueId(uniqueIdArray);
                        resolve(uniqueIdArray);
                        return;
                    }
                }
            }

            try {
                const userDoc = await getUserDoc();

                let newUniqueId;

                if (userDoc && userDoc.uniqueId) {
                    if (Array.isArray(userDoc.uniqueId)) {
                        newUniqueId = userDoc.uniqueId.length !== 0 ? userDoc.uniqueId : generatedId;
                    } else if (userDoc.uniqueId.length === 24) {
                        newUniqueId = [userDoc.uniqueId];
                    } else {
                        newUniqueId = Array.isArray(generatedId) ? generatedId : [generatedId];
                    }
                } else {
                    newUniqueId = Array.isArray(generatedId) ? generatedId : [generatedId];
                }

                if (!newUniqueId || !newUniqueId.length) {
                    newUniqueId = Array.isArray(generatedId) ? generatedId : [generatedId];
                }

                if (newUniqueId) {
                    let uniqueIdArray = normalizeUniqueId(newUniqueId);
                    if (uniqueIdArray && Array.isArray(uniqueIdArray) && uniqueIdArray.length > 0) {
                        storeUniqueId(uniqueIdArray);
                        resolve(uniqueIdArray);
                    } else {
                        resolve(null);
                    }
                } else {
                    resolve(null);
                }
            } catch (error) {
                console.error('Error in loadEvercookieUserUniqueBrowserId:', error);
                resolve(null);
            }
        });
    });
}

function loadEvercookieScript() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `/libraries/evercookie/evercookie.js?v=${version}`;
        script.onload = () => {
            resolve();
        };
        script.onerror = (error) => {
            console.error('[loadEvercookieScript] Failed to load Evercookie script:', error);
            reject(error + " & Close ad-blockers or any extensions");
        };
        document.head.appendChild(script);
    });
}

function createAdblockerOverlay() {
    // Check if overlay should be skipped based on localStorage
    if (localStorage.getItem('skipAdblockerOverlay')) return null;

    // Remove existing overlay if it exists
    const existingOverlay = document.querySelector('.overlay');
    if (existingOverlay) existingOverlay.remove();

    // Create new overlay
    const overlay = document.createElement('div');
    overlay.classList.add('overlay');
    overlay.style.zIndex = '1003';
    overlay.innerHTML = `
        <div class="overlay-content">
            <h2>About Extensions</h2>
            <p>Some extensions are causing our website to not work properly. Please disable ad-blockers or any similar extension that blocks cookies or resources. They cause script loading issues or restricts us from saving important cookies to the browser.</p>
            <p class="skip-button" style="cursor: pointer;">As a last resort, you can skip this by clicking this text or the button at the bottom of the page, but it is NOT RECOMMENDED as it may result in your account being restricted and various errors.</p>
            <button class="skip-button important" style="width: auto;position: fixed;bottom: 20px;left: 50%;transform: translateX(-50%);border-color: #cf1111;">Skip warning</button>
        </div>
    `;

    // Add overlay to the document body
    document.body.appendChild(overlay);

    // Add click event listener to the skip button
    const skipElements = overlay.querySelectorAll('.skip-button');
    skipElements.forEach(element => {
        element.addEventListener('click', () => {
            // Set localStorage variable to skip the overlay in the future
            localStorage.setItem('skipAdblockerOverlay', 'true');
            // Remove the overlay
            overlay.remove();
        });
    });

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
                script.onerror = () => reject(new Error(`Failed to load script & Close ad-blockers or any extensions: ${src}`));
                document.head.appendChild(script);
            });
        };

        loadScript(`/libraries/evercookie/jquery-1.4.2.min.js?v=${version}`, 'jQuery')
            .then(() => loadScript(`/libraries/evercookie/swfobject-2.2.min.js?v=${version}`, 'swfobject'))
            .then(() => loadScript(`/libraries/evercookie/dtjava.js?v=${version}`, 'dtjava'))
            .then(() => loadEvercookieScript())
            .then(resolve)
            .catch((error) => {
                createAdblockerOverlay();
                reject(error);
            });
    });
}

let isGtagConfigured = false;

export function configureGtag() {
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
const dbCache = {};

export const openDB = (databaseName, objectStoreName) => {
    if (dbCache[databaseName]) return Promise.resolve(dbCache[databaseName]);

    return new Promise((resolve, reject) => {
        if (!window.indexedDB) return reject("IndexedDB is not supported.");

        const openRequest = indexedDB.open(databaseName, 1);

        openRequest.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(objectStoreName)) {
                db.createObjectStore(objectStoreName, { keyPath: "id", autoIncrement: true });
            }
        };

        openRequest.onsuccess = (event) => {
            const db = event.target.result;
            dbCache[databaseName] = db;

            // Handle version change (other tab updated DB)
            db.onversionchange = () => {
                db.close();
                delete dbCache[databaseName];
                alert(
                    "The database has been updated in another tab. This tab will reload to ensure consistency."
                );
                window.location.reload();
            };

            // Optional: auto-close DB on page unload
            window.addEventListener("beforeunload", () => db.close());

            resolve(db);
        };

        openRequest.onerror = async (event) => {
            const error = event.target.error;

            // Corrupted database handling
            if (error?.message?.includes("backing store")) {
                try {
                    await new Promise((res, rej) => {
                        const deleteReq = indexedDB.deleteDatabase(databaseName);
                        deleteReq.onsuccess = res;
                        deleteReq.onerror = rej;
                        deleteReq.onblocked = rej;
                    });
                    const retryDb = await openDB(databaseName, objectStoreName);
                    resolve(retryDb);
                } catch (e) {
                    reject("Database corrupted and could not be cleared.");
                }
            }
            // Quota exceeded
            else if (error?.name === "QuotaExceededError") {
                reject("Storage quota exceeded. Clear space and try again.");
            }
            // Security restrictions
            else if (error?.name === "SecurityError") {
                reject(
                    "Security error: IndexedDB might be disabled due to incognito mode or browser restrictions."
                );
            } else {
                reject(error.message || error);
            }
        };
    });
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
export const addToDB = (db, data, active = false) => {
    return new Promise((resolve, reject) => {
        const storeName = db.objectStoreNames[0];
        const tx = db.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        const timestamp = Date.now();

        const entry = { timestamp, active };

        if (typeof data === 'string') {
            if (data.startsWith('http')) entry.url = data;
            else if (data.startsWith('data:')) entry.base64 = data;
            else return reject('addToDB: unsupported string format');
        }
        else if (data instanceof Blob) entry.blob = data;
        else if (Array.isArray(data)) {
            const [maybeBlob, maybeUrlOrBase64] = data;
            if (maybeBlob != null) entry.blob = maybeBlob;
            if (typeof maybeUrlOrBase64 === 'string') {
                if (maybeUrlOrBase64.startsWith('http')) entry.url = maybeUrlOrBase64;
                else if (maybeUrlOrBase64.startsWith('data:')) entry.base64 = maybeUrlOrBase64;
                else return reject('addToDB: unsupported array string format');
            }
        }
        else return reject('addToDB: unsupported data type');

        const record = Object.fromEntries(
            Object.entries(entry).filter(([_, v]) => v != null)
        );

        const req = store.add(record);
        req.onsuccess = async () => {
            const id = req.result;

            // Mobile-safe fallback for blobs
            if (record.blob instanceof Blob) {
                try {
                    const verifyTx = db.transaction([storeName], 'readonly');
                    const verifyStore = verifyTx.objectStore(storeName);
                    const getReq = verifyStore.get(id);
                    getReq.onsuccess = async () => {
                        const stored = getReq.result;
                        const storedBlob = stored && stored.blob;

                        const blobIsGood = storedBlob instanceof Blob;
                        if (blobIsGood) resolve({ id, timestamp });
                        else {
                            try {
                                const b64 = await blobToDataURL(record.blob);
                                const updateTx = db.transaction([storeName], 'readwrite');
                                const updateStore = updateTx.objectStore(storeName);
                                const updatedRecord = Object.assign({}, stored || {}, { base64: b64 });
                                updateStore.put(updatedRecord, id);
                                updateTx.oncomplete = () => resolve({ id, timestamp });
                                updateTx.onerror = () => resolve({ id, timestamp });
                            } catch (e) {
                                resolve({ id, timestamp });
                            }
                        }
                    };
                    getReq.onerror = () => resolve({ id, timestamp });
                } catch (e) {
                    resolve({ id, timestamp });
                }
            } else {
                resolve({ id, timestamp });
            }
        };
        req.onerror = e => {
            alert('Error adding to DB: ' + e.target.error);
            reject(e.target.error?.message || 'Unknown IDB error');
        };

        function blobToDataURL(blob) {
            return new Promise((resolve, reject) => {
                try {
                    const fr = new FileReader();
                    fr.onload = () => {
                        const result = fr.result;
                        if (typeof result === 'string') resolve(result);
                        else reject(new Error('Unexpected FileReader result'));
                    };
                    fr.onerror = (err) => reject(err);
                    fr.readAsDataURL(blob);
                } catch (err) {
                    reject(err);
                }
            });
        }
    });
};
export const getFromDB = (db, limit = null, offset = 0) => {
    return new Promise((resolve, reject) => {
        try {
            const store = db.transaction([db.objectStoreNames[0]], 'readonly')
                .objectStore(db.objectStoreNames[0]);
            const request = store.getAll();

            request.onsuccess = (event) => {
                let results = event.target.result;
                results.sort((a, b) => (b.id || 0) - (a.id || 0));
                if (limit !== null) {
                    results = results.slice(offset, offset + limit);
                }
                const mappedResults = results.map(item => ({
                    blob: item.blob || null,
                    url: item.url || null,
                    base64: item.base64 || null,
                    id: item.id || null,
                    chunks: Array.isArray(item.chunks) ? item.chunks : [],
                    timestamp: item.timestamp || null,
                    active: !!item.active
                }));

                resolve(mappedResults);
            };

            request.onerror = (event) => {
                reject(`Error retrieving data from database: ${event.target.error}`);
            };
        } catch (err) {
            reject(`getFromDB failed: ${err.message || err}`);
        }
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
                    resolve()
                    updateGenerateButtonText()
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
export function calculateMetadata(element, metadataCallback) {
    return new Promise((resolve, reject) => {
        if (!(element instanceof HTMLVideoElement || element instanceof HTMLImageElement)) {
            reject(new Error('Element is not a video or image.'));
            return;
        }

        function getVideoIdentifier(videoElement) {
            return videoElement.getAttribute('timestamp') + "_" + videoElement.getAttribute('id');
        }

        if (element instanceof HTMLVideoElement) {
            const videoIdentifier = getVideoIdentifier(element);
            const localStorageKey = videoIdentifier ? videoIdentifier + '_fps' : null;

            // Use stored FPS if available.
            if (localStorageKey) {
                const storedFps = localStorage.getItem(localStorageKey);
                if (storedFps && parseInt(storedFps, 10) > 0) {
                    element.setAttribute('data-fps', storedFps);
                    metadataCallback(parseInt(storedFps, 10), element.duration);
                    resolve(parseInt(storedFps, 10));
                    return;
                }
            }

            if (element.getAttribute('data-fps') > 0) {
                const fpsVal = parseInt(element.getAttribute('data-fps'), 10);
                if (localStorageKey) {
                    localStorage.setItem(localStorageKey, fpsVal);
                }
                metadataCallback(fpsVal, element.duration);
                resolve(fpsVal);
                return;
            }

            let lastMediaTime = 0;
            let lastFrameNum = 0;
            const fpsBuffer = [];
            const BUFFER_SIZE = 30;
            let frameNotSeeked = true;
            let lastFps = 0;
            let stableFrameCount = 0;
            const STABLE_THRESHOLD = 30;
            let callbackId = null;

            function getFpsAverage() {
                if (fpsBuffer.length === 0) return 0;
                const averageInterval = fpsBuffer.reduce((a, b) => a + b, 0) / fpsBuffer.length;
                return Math.round(1 / averageInterval);
            }

            function calculateFps(metadata) {
                const mediaTimeDiff = Math.abs(metadata.mediaTime - lastMediaTime);
                const frameNumDiff = metadata.presentedFrames - lastFrameNum;
                if (frameNumDiff > 0 && mediaTimeDiff > 0) {
                    const frameDuration = mediaTimeDiff / frameNumDiff;
                    if (element.playbackRate === 1 && frameNotSeeked) {
                        if (fpsBuffer.length >= BUFFER_SIZE) {
                            fpsBuffer.shift();
                        }
                        fpsBuffer.push(frameDuration);
                    }
                }
                lastMediaTime = metadata.mediaTime;
                lastFrameNum = metadata.presentedFrames;
                frameNotSeeked = true;
            }

            function ticker(_, metadata) {
                calculateFps(metadata);
                const fps = getFpsAverage();
                if (fps > 0) {
                    element.setAttribute('data-fps', fps);
                    metadataCallback(fps, element.duration);
                }
                if (fps === lastFps && fps !== 0) {
                    stableFrameCount++;
                } else {
                    stableFrameCount = 0;
                }
                lastFps = fps;
                if (stableFrameCount >= STABLE_THRESHOLD) {
                    if (localStorageKey) {
                        localStorage.setItem(localStorageKey, fps);
                    }
                    resolve(fps);
                    return;
                }
                callbackId = element.requestVideoFrameCallback(ticker);
            }

            function cleanup() {
                if (callbackId) {
                    element.cancelVideoFrameCallback(callbackId);
                }
                element.removeEventListener('seeked', onSeek);
                element.onloadedmetadata = null;
                element.onerror = null;
            }

            function onSeek() {
                if (element.getAttribute('data-fps') > 0) return;
                fpsBuffer.length = 0;
                stableFrameCount = 0;
                frameNotSeeked = false;
            }

            element.addEventListener('seeked', onSeek);

            element.onloadedmetadata = function () {
                if (element.getAttribute('data-fps') > 0) {
                    const fpsVal = parseInt(element.getAttribute('data-fps'), 10);
                    if (localStorageKey) {
                        localStorage.setItem(localStorageKey, fpsVal);
                    }
                    metadataCallback(fpsVal, element.duration);
                    resolve(fpsVal);
                    return;
                }
                callbackId = element.requestVideoFrameCallback(ticker);
                element.play().catch(error =>
                    reject(new Error('Playback failed: ' + error.message))
                );
            };

            element.onerror = function () {
                cleanup();
                reject(new Error('An error occurred during video playback.'));
            };
        } else if (element instanceof HTMLImageElement) {
            element.onload = function () {
                const result = {
                    resolution: {
                        width: element.naturalWidth,
                        height: element.naturalHeight
                    },
                    src: element.src,
                };
                if (metadataCallback)
                    metadataCallback(result);
                resolve(result);
            };
            element.onerror = function () {
                reject(new Error('An error occurred while loading the image.'));
            };
        }
    });
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

async function displayStoredData(element, dataBaseObjectStoreName) {
    if (pageName !== 'face-swap' && pageName !== 'video-generator' && pageName !== 'inpaint')
        return;

    if (!element) {
        const existingTimeline = document.querySelector(`.${dataBaseObjectStoreName}_timelineContainer`);
        if (existingTimeline)
            existingTimeline.remove();

        [`${dataBaseObjectStoreName}_leftClampHandle`, `${dataBaseObjectStoreName}_midHandle`, `${dataBaseObjectStoreName}_rightClampHandle`].forEach((handle) => {
            const existingHandle = document.querySelector(`[data-frame][data-handle="${handle}"]`);
            if (existingHandle) {
                existingHandle.remove();
            }
        });

        const beforeInputInit = document.getElementById(`${dataBaseObjectStoreName}_beforeInit`);
        if (beforeInputInit) 
            beforeInputInit.style.display = 'flex';

        const afterInitContainer = document.getElementById(`${dataBaseObjectStoreName}_afterInit`);
        if (afterInitContainer) {
            afterInitContainer.innerHTML = '';
            afterInitContainer.style.display = 'none';
        }
        return;
    }

    const frameElement = element.querySelector('iframe');
    const videoElement = element.querySelector('video');
    const imgElement = element.querySelector('img');
    const videoOrImg = videoElement || imgElement;
    const targetElement = videoOrImg || frameElement;
    const isVideo = !!videoElement;
    let fps = 0;
    if (isVideo)
        fps = videoElement.getAttribute('data-fps');
    let container, fgClone, bgClone;
    function createClonedInput(maxRetries = 3, retryDelay = 1000) {
        let retries = 0;

        function attemptInputLoad() {
            container = document.createElement('div');
            container.style.position = 'relative';
            container.style.width = '100%';
            container.style.height = '100%';
            container.style.overflow = 'hidden';

            // Create foreground clone (object-fit: contain)
            fgClone = targetElement.cloneNode(true);
            fgClone.style.position = 'absolute';
            fgClone.style.top = '0';
            fgClone.style.left = '0';
            fgClone.style.width = '100%';
            fgClone.style.height = '100%';
            fgClone.style.objectFit = 'contain';
            fgClone.style.display = 'block';
            fgClone.style.borderRadius = 'var(--border-radius)';
            fgClone.style.zIndex = '2';

            if (isVideo) {
                fgClone.preload = 'auto';
                fgClone.controls = false;
                fgClone.autoplay = true;
                fgClone.playsInline = true;
                fgClone.muted = true;
                fgClone.keepMuted = true;
                fgClone.removeAttribute('keepmuted');
                fgClone.addEventListener('error', handleError);
                fgClone.load();
                fgClone.play();

                /*const unmuteOnInteraction = () => {
                    fgClone.muted = false;
                    fgClone.setAttribute('muted', false);

                    document.removeEventListener('click', unmuteOnInteraction);
                    document.removeEventListener('touchend', unmuteOnInteraction);
                };

                document.addEventListener('click', unmuteOnInteraction, { once: true });
                document.addEventListener('touchend', unmuteOnInteraction, { once: true });*/

                fgClone.setAttribute('query', `${dataBaseObjectStoreName}_videoContainer`);
            } else {
                fgClone.setAttribute('query', `${dataBaseObjectStoreName}_imgContainer`);
            }

            // Create background clone (blurred fill)
            if (!frameElement) {
                bgClone = targetElement.cloneNode(true);
                bgClone.style.position = 'absolute';
                bgClone.style.top = '0';
                bgClone.style.left = '0';
                bgClone.style.width = '100%';
                bgClone.style.height = '100%';
                bgClone.style.objectFit = 'cover';
                bgClone.style.filter = 'blur(20px)';
                bgClone.style.transform = 'scale(1.1)';
                bgClone.style.zIndex = '1';

                if (isVideo) {
                    bgClone.preload = 'auto';
                    bgClone.controls = false;
                    bgClone.autoplay = true;
                    bgClone.muted = true;
                    bgClone.keepmuted = true;
                    bgClone.playsInline = true;
                    bgClone.addEventListener('error', handleError);
                    bgClone.load();
                    bgClone.play();
                }

                container.appendChild(bgClone);
            }

            container.appendChild(fgClone);

            if (isVideo) {
                const isPlaying = video =>
                    !!(video.currentTime > 0 && !video.paused && !video.ended && video.readyState >= 2);

                if (isPlaying(fgClone)) {
                    bgClone.currentTime = fgClone.currentTime;
                    bgClone.play();
                } else {
                    bgClone.pause();
                }

                fgClone.addEventListener('play', () => {
                    bgClone.currentTime = fgClone.currentTime;
                    bgClone.play();
                });

                fgClone.addEventListener('pause', () => {
                    bgClone.pause();
                });

                fgClone.addEventListener('seeking', () => {
                    bgClone.currentTime = fgClone.currentTime;
                });

                fgClone.addEventListener('timeupdate', () => {
                    const timeDifference = Math.abs(fgClone.currentTime - bgClone.currentTime);
                    if (timeDifference > 0.1) {
                        bgClone.currentTime = fgClone.currentTime;
                    }
                });
            }
        }

        function handleError() {
            if (retries < maxRetries) {
                retries++;
                showNotification(
                    `Media could not be loaded. Retrying... (${retries}/${maxRetries})`,
                    'Error',
                    'default'
                );
                setTimeout(attemptInputLoad, retryDelay);
            } else {
                showNotification(
                    'Failed to load media after multiple attempts.',
                    'Error',
                    'error'
                );
            }
        }

        attemptInputLoad();
        return container;
    }

    async function replaceInput() {
        const existingTimeline = document.querySelector(`.${dataBaseObjectStoreName}_timelineContainer`);
        if (existingTimeline) 
            existingTimeline.remove();
        
        // Remove clamp handles
        [`${dataBaseObjectStoreName}_leftClampHandle`, `${dataBaseObjectStoreName}_midHandle`, `${dataBaseObjectStoreName}_rightClampHandle`].forEach((handle) => {
            const existingHandle = document.querySelector(`[data-frame][data-handle="${handle}"]`);
            if (existingHandle) {
                existingHandle.remove();
            }
        });

        const beforeInputInit = document.getElementById(`${dataBaseObjectStoreName}_beforeInit`);
        if (beforeInputInit) 
            beforeInputInit.style.display = 'none';
        
        // Create a new cloned input container
        container = createClonedInput();

        const afterInitContainer = document.getElementById(`${dataBaseObjectStoreName}_afterInit`);
        if (afterInitContainer) {
            afterInitContainer.innerHTML = '';
            afterInitContainer.appendChild(container);
            afterInitContainer.style.display = 'flex';
        }
    }

    async function initInput() {
        fgClone.addEventListener('error', (e) => {
            const src = fgClone.currentSrc || fgClone.src || 'unknown source';
            alert((isVideo ? 'Video' : 'Image') + ` failed to load. Source: ${src}`);
            console.error('Media error event:', e, 'Source:', src);
        });

        if (isVideo) {
            function updateSlider(video) {
                const updateInterval = setInterval(() => {
                    if (video.paused || video.ended) {
                        clearInterval(updateInterval);
                        return;
                    }
                }, 1000 / fps);
            }

            let isPlaying = false;
            fgClone.addEventListener('click', () => {
                if (isPlaying) {
                    fgClone.pause();
                } else {
                    fgClone.play();
                    updateSlider(fgClone);
                }
                isPlaying = !isPlaying;
            });
        }
    }

    // Replace the input and initialize the clones.
    await replaceInput();
    await initInput();

    // If this is a video, create the timeline with a draggable handle.
    if (isVideo) {
        function generateTimeline() {
            function formatTime(seconds) {
                const m = Math.floor(seconds / 60).toString().padStart(2, "0");
                const s = Math.floor(seconds % 60).toString().padStart(2, "0");
                return `${m}:${s}`;
            }

            const frameRate = typeof fps !== "undefined" ? fps : 30;

            const timelineContainer = document.createElement("div");
            timelineContainer.classList.add(`${dataBaseObjectStoreName}_timelineContainer`);
            timelineContainer.style.position = "absolute";
            timelineContainer.style.bottom = "2vh";
            timelineContainer.style.left = "2vh";
            timelineContainer.style.right = "2vh";
            timelineContainer.style.height = "4vh";
            timelineContainer.style.background = "rgba(0,0,0,0.5)";
            timelineContainer.style.zIndex = "3";
            timelineContainer.style.border = "var(--border) solid";
            timelineContainer.style.borderColor = "rgba(var(--white),255)";
            timelineContainer.style.borderRadius = "4vh";
            timelineContainer.style.overflow = "hidden";
            timelineContainer.style.display = "flex";
            timelineContainer.style.alignItems = "center";
            timelineContainer.style.padding = "0 0.5vh";
            timelineContainer.style.boxSizing = "border-box";
            container.appendChild(timelineContainer);

            const rail = document.createElement("div");
            rail.style.position = "relative";
            rail.style.height = "100%";
            rail.style.flex = "1 1 auto";
            rail.style.display = "flex";
            rail.style.alignItems = "center";
            rail.style.userSelect = "none";
            timelineContainer.appendChild(rail);

            const handle = document.createElement("div");
            handle.className = `${dataBaseObjectStoreName}_timelineHandle`;
            handle.style.position = "absolute";
            handle.style.top = "50%";
            handle.style.left = "0px";
            handle.style.transform = "translate(-50%, -50%)";
            handle.style.width = "1.2vh";
            handle.style.height = "3vh";
            handle.style.borderRadius = "2vh";
            handle.style.background = "rgba(0,200,0,1)";
            handle.style.zIndex = "4";
            handle.style.cursor = "pointer";
            handle.style.display = "flex";
            handle.style.alignItems = "center";
            handle.style.justifyContent = "center";
            handle.style.pointerEvents = "auto";

            const tooltip = document.createElement("div");
            tooltip.className = "tooltip tooltip-fast";
            tooltip.innerText = "00:00 / 00:00";
            tooltip.style.position = "absolute";
            tooltip.style.bottom = "calc(100% + 6px)";
            tooltip.style.whiteSpace = "nowrap";
            tooltip.style.transform = "translateX(-50%)";
            tooltip.style.left = "50%";
            tooltip.style.pointerEvents = "none";
            handle.appendChild(tooltip);

            rail.appendChild(handle);

            let videoDuration = 0;
            function setDuration(d) {
                videoDuration = isFinite(d) && d > 0 ? d : 0;
                tooltip.innerText = `00:00 / ${formatTime(videoDuration)}`;
            }

            if (fgClone.readyState >= 1 && fgClone.duration && isFinite(fgClone.duration)) {
                setDuration(fgClone.duration);
            } else {
                fgClone.addEventListener("loadedmetadata", () => setDuration(fgClone.duration), { once: true });
            }

            function clientXToPx(clientX) {
                const rect = rail.getBoundingClientRect();
                return Math.max(0, Math.min(clientX - rect.left, rect.width));
            }

            function updateHandleFromPx(px, seekVideo) {
                const rect = rail.getBoundingClientRect();
                handle.style.left = `${px}px`;
                const t = videoDuration > 0 && rect.width > 0 ? (px / rect.width) * videoDuration : 0;
                tooltip.innerText = `${formatTime(t)} / ${formatTime(videoDuration)}`;
                if (seekVideo && isFinite(videoDuration) && videoDuration > 0) fgClone.currentTime = t;
            }

            function updateHandleFromTime(t) {
                const rect = rail.getBoundingClientRect();
                const px = videoDuration > 0 && rect.width > 0 ? (t / videoDuration) * rect.width : 0;
                handle.style.left = `${px}px`;
                tooltip.innerText = `${formatTime(t)} / ${formatTime(videoDuration)}`;
            }

            let dragging = false;
            function onPointerMove(e) {
                if (!dragging) return;
                const px = clientXToPx(e.clientX);
                updateHandleFromPx(px, true);
                e.preventDefault();
            }
            function onPointerUp(e) {
                if (!dragging) return;
                dragging = false;
                window.removeEventListener("pointermove", onPointerMove);
                window.removeEventListener("pointerup", onPointerUp);
                document.body.style.userSelect = "";
                try { handle.releasePointerCapture && handle.releasePointerCapture(e.pointerId); } catch (err) { }
            }

            handle.addEventListener("pointerdown", function (e) {
                dragging = true;
                handle.setPointerCapture && handle.setPointerCapture(e.pointerId);
                window.addEventListener("pointermove", onPointerMove, { passive: false });
                window.addEventListener("pointerup", onPointerUp, { passive: false });
                document.body.style.userSelect = "none";
                e.preventDefault();
            });

            rail.addEventListener("pointerdown", function (e) {
                if (e.target === handle) return;
                const px = clientXToPx(e.clientX);
                updateHandleFromPx(px, true);
            });

            fgClone.addEventListener("timeupdate", function () {
                if (dragging) return;
                if (!isFinite(videoDuration) || videoDuration === 0) return;
                updateHandleFromTime(fgClone.currentTime || 0);
            });

            window.addEventListener("resize", () => updateHandleFromTime(fgClone.currentTime || 0));
        }
        generateTimeline();
    }
}
export function handleContextMenu(div) {
    // Create custom context menu
    const contextMenu = document.createElement('div');
    contextMenu.className = 'background-container background-container-absolute';
    contextMenu.innerHTML = `
  <div class="background-dot-container overflow-hidden">
    <div class="background-dot-container-content" style='overflow: auto;justify-content: space-between;padding-right: calc(1vh * var(--scale-factor-h));'>
      <div class="small-box unreversed" data-action="display">
        <span class="menu-icon">↗</span>
        <span>Display</span>
      </div>
      <div class="small-box unreversed" data-action="open">
        <span class="menu-icon">↗</span>
        <span>Open</span>
      </div>
      <div class="small-box unreversed" data-action="delete">
        <span class="menu-icon">×</span>
        <span>Delete</span>
      </div>
      <div class="small-box unreversed" data-action="save">
        <span class="menu-icon">↓</span>
        <span>Save</span>
      </div>
      <div class="small-box unreversed" data-action="download-browser">
        <span class="menu-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </span>
        <span>Download</span>
      </div>
      <div class="small-box unreversed" data-action="download-server">
        <span class="menu-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </span>
        <span>Fetch</span>
      </div>
      <div class="small-box unreversed" data-action="copy-browser-url">
        <span class="menu-icon">⎘</span>
        <span>Copy URL</span>
      </div>
      <div class="small-box unreversed" data-action="copy-download-url">
        <span class="menu-icon">⎘</span>
        <span>Copy Download URL</span>
      </div>
      <div class="small-box unreversed" data-action="use-generation-data">
        <span class="menu-icon">⚙</span>
        <span>Use Generation Data</span>
      </div>
    </div>
  </div>
`;
    document.body.appendChild(contextMenu);

    // Add mobile-friendly styles
    const style = document.createElement('style');
    style.textContent = `
  .background-container-absolute {
    position: absolute;
    width: auto !important;
    height: calc(34vh * var(--scale-factor-h)) !important;
    z-index: 1000;
    display: none;
    overflow: hidden;
  }

  .small-box .menu-icon {
    font-size: calc(3vh * var(--scale-factor-h));
    opacity: 0.8;
    width: calc(3vh * var(--scale-factor-h));
    display: inline-block;
    text-align: center;
  }
`;
    document.head.appendChild(style);

    // Menu logic
    let currentTarget = null;
    let activeInput = null;
    let touchTimer = null;
    let isTouchInteraction = false;

    // Touch device detection
    const isTouchDevice = false;

    // Close all context menus
    function closeAllContextMenus() {
        contextMenu.style.display = 'none';
    }

    // Show context menu at position
    function showContextMenu(e) {
        currentTarget = div;
        activeInput = currentTarget.querySelector('img, video, initial');

        const downloadUrl = activeInput?.getAttribute('url');
        if (!downloadUrl || downloadUrl === 'null') {
            contextMenu.querySelector('.small-box[data-action="use-generation-data"]').style.display = 'none';
            contextMenu.querySelector('.small-box[data-action="copy-download-url"]').style.display = 'none';
            contextMenu.querySelector('.small-box[data-action="download-server"]').style.display = 'none';
        }
        else {
            const raw = localStorage.getItem(`${downloadUrl}_formData`);
            if (!raw) {
                contextMenu.querySelector('.small-box[data-action="use-generation-data"]').style.display = 'none';
            }
        }

        closeAllContextMenus();

        // Get position (works for both mouse and touch)
        const posX = e.pageX || e.touches?.[0]?.pageX;
        const posY = e.pageY || e.touches?.[0]?.pageY;

        contextMenu.style.display = 'block';
        contextMenu.style.left = `${Math.min(posX, window.innerWidth - contextMenu.offsetWidth - 10)}px`;
        contextMenu.style.top = `${Math.min(posY, window.innerHeight - contextMenu.offsetHeight - 10)}px`;

        // Prevent default for touch events
        if (e.touches) {
            e.preventDefault();
        }
    }

    // Event handlers for desktop
    div.addEventListener('contextmenu', (e) => {
        if (isTouchDevice) return;
        e.preventDefault();
        showContextMenu(e);
    });

    div.addEventListener('touchstart', (e) => {
        isTouchInteraction = true;
        touchTimer = setTimeout(() => {
            showContextMenu(e);
        }, 250); // 500ms long press
    });

    div.addEventListener('touchend', () => {
        clearTimeout(touchTimer);
    });

    div.addEventListener('touchmove', () => {
        clearTimeout(touchTimer);
    });

    // Prevent scrolling when menu is open
    contextMenu.addEventListener('touchmove', (e) => {
        if (contextMenu.style.display === 'block') {
            e.preventDefault();
        }
    }, { passive: false });

    // Close menu when clicking elsewhere
    document.addEventListener('click', (e) => {
        if (!contextMenu.contains(e.target)) {
            closeAllContextMenus();
        }
    });

    // Handle menu actions (keep your existing action handler)
    contextMenu.addEventListener('click', async (e) => {
        const menuItem = e.target.closest('.small-box');
        if (!menuItem) return;

        const action = menuItem.getAttribute('data-action');
        const url = activeInput?.querySelector('source')?.src || activeInput?.src;
        const downloadUrl = activeInput?.getAttribute('url');

        // Your existing switch case for actions remains exactly the same
        switch (action) {
            case 'open':
                window.open(url, '_blank');
                break;
            case 'display':
                const existingWrapper = document.getElementById('wrapper');
                if (existingWrapper) return;

                const wrapper = document.createElement('div');
                wrapper.id = 'wrapper';

                const backgroundContainer = document.createElement('div');
                backgroundContainer.className = 'background-container';

                const backgroundDotContainer = document.createElement('a');
                backgroundDotContainer.className = 'background-dot-container';

                const backgroundDotContent = document.createElement('div');
                backgroundDotContent.className = 'background-dot-container-content';
                backgroundDotContent.style.padding = '0';

                const innerContainer = document.createElement('div');
                innerContainer.className = 'background-container';
                innerContainer.style.display = 'contents';
                innerContainer.id = 'innerContainer';

                let mediaElement;

                if (activeInput.tagName === 'VIDEO') {
                    mediaElement = document.createElement('video');
                    mediaElement.controls = true;
                    mediaElement.src = activeInput?.querySelector('source')?.src || activeInput?.src;
                    mediaElement.style.maxWidth = '100vw';
                    mediaElement.style.maxHeight = '94vh';
                    mediaElement.style.borderRadius = 'var(--border-radius)';
                    mediaElement.style.objectFit = 'cover';
                } else if (activeInput.tagName === 'IMG') {
                    mediaElement = document.createElement('img');
                    mediaElement.src = activeInput.src;
                    mediaElement.style.maxWidth = '100vw';
                    mediaElement.style.maxHeight = '94vh';
                    mediaElement.style.borderRadius = 'var(--border-radius)';
                    mediaElement.style.objectFit = 'cover';
                }

                if (!mediaElement.src) {
                    wrapper.remove();
                    alert('Media source not found.');
                    return;
                }

                // Close Button
                const closeButton = document.createElement('button');
                closeButton.className = 'close-button';
                closeButton.style.position = 'absolute';
                closeButton.style.top = '1vh';
                closeButton.style.right = '1vh';
                closeButton.style.cursor = 'pointer';
                closeButton.style.width = '4vh';
                closeButton.style.height = '4vh';
                closeButton.style.padding = '0';
                closeButton.style.margin = '0';

                const closeButtonIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                closeButtonIcon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                closeButtonIcon.setAttribute('viewBox', '0 0 24 24');
                closeButtonIcon.setAttribute('fill', 'none');
                closeButtonIcon.setAttribute('stroke', 'currentColor');
                closeButtonIcon.setAttribute('stroke-width', '2');
                closeButtonIcon.setAttribute('stroke-linecap', 'round');
                closeButtonIcon.setAttribute('stroke-linejoin', 'round');
                closeButtonIcon.style.margin = '0';
                closeButtonIcon.style.width = 'calc((3.5vh * var(--scale-factor-h)))';
                closeButtonIcon.classList.add('lucide', 'lucide-x');

                const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path1.setAttribute('d', 'M18 6 6 18');
                const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path2.setAttribute('d', 'm6 6 12 12');

                closeButtonIcon.appendChild(path1);
                closeButtonIcon.appendChild(path2);

                closeButton.appendChild(closeButtonIcon);
                closeButton.addEventListener('click', () => {
                    wrapper.remove();
                });

                const reportButton = document.createElement('button');
                reportButton.className = 'report-button';
                reportButton.style.position = 'absolute';
                reportButton.style.bottom = '1vh';
                reportButton.style.right = '1vh';

                reportButton.innerHTML = 'Report Content';
                reportButton.addEventListener('click', () => {
                    showNotification(
                        `Thank you for reporting inappropriate content. Our moderation team will review the report and take appropriate action.`,
                        'Reported Content',
                        'warning-important'
                    );
                    wrapper.remove();
                    const deleteIconParent = activeDataContainer.querySelector('.delete-icon');
                    if (deleteIconParent) {
                        simulateFullClick(deleteIconParent);
                    }
                });

                innerContainer.appendChild(mediaElement);
                innerContainer.appendChild(closeButton);
                //innerContainer.appendChild(reportButton);

                backgroundDotContent.appendChild(innerContainer);
                backgroundDotContainer.appendChild(backgroundDotContent);
                backgroundContainer.appendChild(backgroundDotContainer);
                wrapper.appendChild(backgroundContainer);
                document.body.appendChild(wrapper);
                break;
            case 'save':
                if (activeInput) {
                    const id = activeInput.getAttribute('id');
                    const fileName = 'output_' + `${id}.${activeInput.tagName === 'VIDEO' ? 'mp4' : 'png'}`;

                    const domIndex = parseInt(activeInput.getAttribute('id'));
                    const db = await openDB(`outputDB-${pageName}`, 'outputs');
                    const items = await getFromDB(db);
                    const item = items.find(item => item.id === domIndex);
                    if (!item || !item.blob) {
                        throw new Error(`No blob found for ID: ${domIndex}`);
                    }

                    let type = '';
                    if (activeInput) {
                        if (activeInput.tagName === 'IMG') {
                            type = 'image/png';
                        } else if (activeInput.tagName === 'VIDEO') {
                            type = 'video/mp4';
                        } else {
                            showNotification('Error: Unsupported element type for download.', 'Error - Download', 'error');
                            return;
                        }
                    }
                    let methodUsed = 0;
                    try {
                        if (window.showSaveFilePicker) {
                            methodUsed = 1;
                            showNotification('Attempting to use showSaveFilePicker...', 'Download - Info', 'info');

                            const fileHandle = await window.showSaveFilePicker({
                                suggestedName: fileName,
                                types: [
                                    { description: 'Video Files', accept: { 'video/mp4': ['.mp4'], 'video/webm': ['.webm'] } },
                                    { description: 'Image Files', accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg'] } },
                                ],
                            });

                            const writableStream = await fileHandle.createWritable();
                            await writableStream.write(item.blob);
                            await writableStream.close();
                            showNotification(`File saved successfully: ${fileName}`, 'Download - Success', 'success');
                        } else if (navigator.share) {
                            methodUsed = 2;
                            showNotification('Attempting to use navigator.share...', 'Download - Info', 'info');

                            const fileToShare = new File([item.blob], fileName, { type });
                            await navigator.share({ title: fileName, files: [fileToShare] });
                            showNotification(`File shared successfully: ${fileName}`, 'Download - Shared', 'success');
                        } else {
                            methodUsed = 3;
                            showNotification('Attempting to use <a> tag for download...', 'Download - Info', 'info');

                            const objectURL = URL.createObjectURL(item.blob);
                            const a = document.createElement('a');
                            a.href = objectURL;
                            a.download = fileName;
                            document.body.appendChild(a);
                            simulateFullClick(a);
                            document.body.removeChild(a);
                            URL.revokeObjectURL(objectURL);
                            showNotification(`File downloaded successfully: ${fileName}`, 'Download - Success', 'success');
                        }
                    } catch (error) {
                        if (error.name === 'AbortError') {
                            showNotification(`Download was aborted for: ${fileName}`, 'Error - Aborted', 'error');
                            return;
                        }

                        showNotification(`First method failed (Error: ${error.message} - Method: ${methodUsed}), retrying in 1000ms for file: ${fileName}...`, 'Error - Download', 'error');
                        setTimeout(() => {
                            const objectURL = URL.createObjectURL(item.blob);
                            const a = document.createElement('a');
                            a.href = objectURL;
                            a.download = fileName;

                            if (!iosMobileCheck()) {  // Only execute this on non-iOS devices
                                try {
                                    document.body.appendChild(a);
                                    simulateFullClick(a);
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(objectURL);
                                    showNotification(`File downloaded successfully: ${fileName}`, 'Download - Success', 'success');
                                } catch (error) {
                                    showNotification(`Failed to download the file (Error: ${error.message})`, 'Error - Download', 'error');
                                }
                            } else {
                                showNotification(`Skipping download method for iOS devices: ${fileName}`, 'Download - Info', 'info');
                                try {
                                    const newTab = window.open(objectURL, '_blank');
                                    if (!newTab) {
                                        showNotification(`Failed to open the file in a new tab for: ${fileName}`, 'Error - Open Tab', 'error');
                                    } else {
                                        setTimeout(() => {
                                            URL.revokeObjectURL(objectURL);
                                        }, 1000);
                                    }
                                } catch (tabError) {
                                    showNotification(`Failed to open in a new tab (Error: ${tabError.message})`, 'Error - Tab Open', 'error');
                                }
                            }
                        }, 1000);
                    }
                } else {
                    showNotification(`No output is selected.`, 'Warning - Download', 'warning');
                }
                break;
            case 'download-browser':
                const browser = document.createElement('a');
                browser.href = url;
                browser.download = 'output';
                simulateFullClick(browser);
                break;
            case 'download-server':
                async function safeDownload(downloadUrl, filename = 'output') {
                    try {
                        // First check if URL is reachable
                        const response = await fetch(downloadUrl, {
                            method: 'HEAD', // Only fetch headers, not full content
                            cache: 'no-store' // Avoid cached responses
                        });

                        if (!response.ok) {
                            throw new Error(`Server returned ${response.status}`);
                        }

                        // Check if response appears to be a file
                        const contentLength = response.headers.get('Content-Length');
                        const contentType = response.headers.get('Content-Type');

                        if (!contentLength || contentLength === '0') {
                            throw new Error('Empty file (0 bytes)');
                        }

                        // Proceed with download
                        const server = document.createElement('a');
                        server.href = downloadUrl;
                        server.download = filename;
                        document.body.appendChild(server);
                        simulateFullClick(server);
                        document.body.removeChild(server);

                    } catch (error) {
                        console.error('Download failed:', error);
                        // Show user-friendly error message
                        alert(`Download failed: ${error.message}\n\nThe file no longer exists or the server is offline.`);
                        return false;
                    }
                    return true;
                }

                safeDownload(downloadUrl, 'output');
                break;
            case 'delete':
                const deleteIconParent = currentTarget.querySelector('.delete-icon');
                if (deleteIconParent) {
                    simulateFullClick(deleteIconParent);
                }
                break;
            case 'copy-browser-url':
                navigator.clipboard.writeText(url);
                // Add visual feedback here
                break;
            case 'copy-download-url':
                navigator.clipboard.writeText(downloadUrl);
                // Add visual feedback here
                break;
            case 'use-generation-data':
                if (!downloadUrl) break;

                const raw = localStorage.getItem(`${downloadUrl}_formData`);
                if (!raw) break;

                const config = JSON.parse(raw);
                console.log(config);

                // 1) Comboboxes
                document.querySelectorAll('.combobox').forEach(cb => {
                    const key = cb.id;
                    const val = config[key];

                    const display = cb.querySelector('.combobox-text');
                    const prefix = display?.getAttribute('title') || '';
                    const defaultText = display?.getAttribute('default') || 'Disabled';
                    const input = cb.querySelector(`input[id="${val}"]`);

                    if (!display) return;

                    if (!input) {
                        cb.querySelectorAll('input[type="checkbox"]').forEach(box => {
                            box.checked = false;
                            box.dispatchEvent(new Event('change', { bubbles: true }));
                        });

                        display.textContent = `${prefix}: ${defaultText}`;
                        return;
                    }

                    cb.querySelectorAll('input[type="checkbox"]').forEach(box => {
                        box.checked = box === input;
                        box.dispatchEvent(new Event('change', { bubbles: true }));
                    });
                });

                // 2) Stand‑alone Checkboxes
                document.querySelectorAll('input[type="checkbox"][id]').forEach(box => {
                    const key = box.id;
                    if (!(key in config)) return;

                    // stored as "true"/"false"
                    const shouldCheck = config[key] === 'true' || config[key] === true;
                    box.checked = shouldCheck;
                    box.dispatchEvent(new Event('change', { bubbles: true }));
                });

                // 3) Textareas
                document.querySelectorAll('textarea[id]').forEach(ta => {
                    const key = ta.id;
                    const val = config[key];
                    if (typeof val !== 'string') return;

                    ta.value = val;
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                });

                // 4) Start + Last frame images
                const parseId = filename => filename.split('_')[3];

                // START FRAMES
                if (typeof config.startFrameFileName === 'string') {
                    const startId = parseId(config.startFrameFileName);
                    document
                        .querySelectorAll('.start-frames .data-container')
                        .forEach(dc => {
                            const img = dc.querySelector('img');
                            const id = img?.getAttribute('id');
                            const active = id === startId;
                            dc.classList.toggle('active', active);
                            if (img) img.setAttribute('active', active.toString());
                        });
                }

                // LAST FRAMES
                if (typeof config.lastFrameFileName === 'string') {
                    const lastId = parseId(config.lastFrameFileName);
                    document
                        .querySelectorAll('.last-frames .data-container')
                        .forEach(dc => {
                            const img = dc.querySelector('img');
                            const id = img?.getAttribute('id');
                            const active = id === lastId;
                            dc.classList.toggle('active', active);
                            if (img) img.setAttribute('active', active.toString());
                        });
                }

                break;

        }

        closeAllContextMenus();
    });
}
export const initDB = async (dataBaseIndexName, dataBaseObjectStoreName, handleDownload, databases) => {
    try {
        console.log('[initDB] called: ', dataBaseIndexName);
        let db = openDB(dataBaseIndexName, dataBaseObjectStoreName);
        let mediaCount = localStorage.getItem(`${pageName}_${dataBaseObjectStoreName}-count`);
        if (!mediaCount) {
            mediaCount = await countInDB(await db);
            localStorage.setItem(`${pageName}_${dataBaseObjectStoreName}-count`, mediaCount);
        } else mediaCount = parseInt(mediaCount, 10);

        const mediaContainer = document.querySelector(`.${dataBaseObjectStoreName}`);
        if (!mediaContainer) return;

        let loadingSpinner = document.createElement('div');
        loadingSpinner.className = 'loading-screen';
        loadingSpinner.style.position = 'absolute';

        const wrapper = document.createDocumentFragment();

        if (mediaCount > 0) {
            mediaContainer.style.display = mediaCount > 0 ? 'flex' : 'none';
            for (let i = 0; i < mediaCount; i++) {
                const div = document.createElement('div');
                div.className = 'data-container';
                div.setAttribute('tooltip', '');
                div.setAttribute('oncontextmenu', 'return false;');
                div.innerHTML = `<div class="process-text">Loading...</div><div class="delete-icon"></div>`;
                wrapper.appendChild(div);
                handleContextMenu(div);
            }

            document.querySelectorAll('body main').forEach(main => {
                if (main)
                    main.style.filter = 'brightness(50%)';
            });

            document.documentElement.appendChild(loadingSpinner);
        }
        mediaContainer.appendChild(wrapper);

        db = await db;
        mediaCount = await countInDB(db);
        localStorage.setItem(`${pageName}_${dataBaseObjectStoreName}-count`, mediaCount);

        // helper: read first bytes of a blob and detect common mime types
        const detectMimeFromBlob = (blob) => {
            return new Promise((resolve) => {
                try {
                    const slice = blob.slice ? blob.slice(0, 64) : blob;
                    const fr = new FileReader();
                    fr.onload = () => {
                        const arr = new Uint8Array(fr.result);
                        // GIF: "GIF8"
                        if (arr.length >= 4 && arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x38) {
                            return resolve('image/gif');
                        }
                        // PNG: "\x89PNG"
                        if (arr.length >= 4 && arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) {
                            return resolve('image/png');
                        }
                        // JPEG: 0xFF 0xD8
                        if (arr.length >= 2 && arr[0] === 0xFF && arr[1] === 0xD8) {
                            return resolve('image/jpeg');
                        }
                        // check for "ftyp" (mp4/iso media)
                        try {
                            const text = new TextDecoder().decode(arr);
                            if (text.indexOf('ftyp') !== -1) {
                                // MP4/ISO BMFF family (mp4, mov, etc.)
                                return resolve('video/mp4');
                            }
                        } catch (e) { /* ignore decode errors */ }
                        // WEBP: "RIFF" + "WEBP" later
                        if (arr.length >= 12 && arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46) {
                            // check for "WEBP" inside
                            const subText = new TextDecoder().decode(arr);
                            if (subText.indexOf('WEBP') !== -1) return resolve('image/webp');
                        }
                        // Matroska/WebM signature (0x1A45DFA3)
                        if (arr.length >= 4 && arr[0] === 0x1A && arr[1] === 0x45 && arr[2] === 0xDF && arr[3] === 0xA3) {
                            return resolve('video/webm');
                        }
                        // fallback unknown
                        resolve(null);
                    };
                    fr.onerror = () => resolve(null);
                    fr.readAsArrayBuffer(slice);
                } catch (e) {
                    resolve(null);
                }
            });
        };

        // helper: convert blob to base64 (return only base64 string without data: prefix)
        const blobToBase64 = (blob) => {
            return new Promise((resolve, reject) => {
                try {
                    const fr = new FileReader();
                    fr.onload = () => {
                        const result = fr.result; // data:*/*;base64,AAAA...
                        if (typeof result === 'string') {
                            const idx = result.indexOf(',');
                            if (idx !== -1) resolve(result.slice(idx + 1));
                            else resolve(result);
                        } else {
                            reject(new Error('Unexpected FileReader result'));
                        }
                    };
                    fr.onerror = (err) => reject(err);
                    fr.readAsDataURL(blob);
                } catch (e) {
                    reject(e);
                }
            });
        };

        if (mediaCount > 0) {
            const mediaItems = await getFromDB(db);
            const inputElements = mediaContainer.querySelectorAll('.data-container');

            for (const [indexInBatch, item] of mediaItems.entries()) {
                const { blob, base64, url, id, timestamp, active } = item;
                let element = inputElements[indexInBatch];
                if (!element) {
                    element = document.createElement('div');
                    element.className = 'data-container';
                    element.setAttribute('tooltip', '');
                    element.setAttribute('oncontextmenu', 'return false;');
                    handleContextMenu(element);
                    mediaContainer.appendChild(element);
                }
                element.innerHTML = '';

                // determine src and mime robustly
                let src = null;
                let mime = null;
                try {
                    if (blob) {
                        // prefer blob.type if present
                        mime = blob.type || null;
                        if (!mime) {
                            // try to detect from bytes
                            const detected = await detectMimeFromBlob(blob);
                            if (detected) mime = detected;
                        }

                        // try createObjectURL (some mobile environments may fail)
                        try {
                            src = URL.createObjectURL(blob);
                        } catch (e) {
                            src = null;
                        }

                        // if createObjectURL failed, fallback to data URL
                        if (!src) {
                            try {
                                const b64 = await blobToBase64(blob);
                                const fallbackMime = mime || 'application/octet-stream';
                                src = `data:${fallbackMime};base64,${b64}`;
                                // ensure mime is set
                                mime = mime || fallbackMime;
                            } catch (e) {
                                // leave src null, we'll handle later
                                src = null;
                            }
                        }
                    } else if (base64 && typeof base64 === 'string' && base64.startsWith('data:')) {
                        src = base64;
                        const idx = base64.indexOf(';');
                        if (idx > 5) mime = base64.slice(5, idx);
                    } else if (url) {
                        src = url;
                        mime = null;
                    }
                } catch (e) {
                    src = null;
                    mime = null;
                }

                // If mime still null but src exists, try to guess from src extension (best-effort)
                if (!mime && src && typeof src === 'string' && src.startsWith('http')) {
                    const extMatch = src.split('?')[0].match(/\.([a-zA-Z0-9]+)$/);
                    if (extMatch) {
                        const ext = extMatch[1].toLowerCase();
                        if (ext === 'gif') mime = 'image/gif';
                        else if (ext === 'png') mime = 'image/png';
                        else if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
                        else if (ext === 'webp') mime = 'image/webp';
                        else if (ext === 'mp4' || ext === 'mov') mime = 'video/mp4';
                        else if (ext === 'webm') mime = 'video/webm';
                    }
                }

                const isGif = mime === 'image/gif' || (blob && blob.type === 'image/gif');
                const isVideo = (mime && mime.startsWith('video')) || (blob && blob.type && blob.type.startsWith('video'));
                const isImage = (mime && mime.startsWith('image')) || (blob && blob.type && blob.type.startsWith('image'));

                // if src is null but blob exists, set src to objectURL as a last attempt
                if (!src && blob) {
                    try {
                        src = URL.createObjectURL(blob);
                    } catch (e) {
                        // ignore; already tried fallback above
                    }
                }

                if (src && (isVideo || isImage || isGif)) {
                    // If it's video and not gif
                    if (isVideo && !isGif) {
                        if (dataBaseObjectStoreName === 'inputs') {
                            const tooltip = document.createElement('div');
                            tooltip.className = 'tooltip tooltip-fast cursor';
                            tooltip.textContent = 'Loading...';
                            tooltip.style.display = 'none';
                            tooltip.style.position = 'fixed';
                            function updateTooltipPosition(event) {
                                tooltip.style.left = `${event.clientX}px`;
                                tooltip.style.top = `${event.clientY - 15}px`;
                            }
                            element.addEventListener('mouseenter', () => document.addEventListener('mousemove', updateTooltipPosition));
                            element.addEventListener('mouseleave', () => document.removeEventListener('mousemove', updateTooltipPosition));
                            element.appendChild(tooltip);
                        }

                        const video = document.createElement('video');
                        video.setAttribute('url', url || '');
                        video.setAttribute('timestamp', timestamp || '');
                        video.id = id;
                        video.preload = 'auto';
                        video.autoplay = true;
                        video.muted = true;
                        video.playsInline = true;
                        try { video.disablePictureInPicture = true; } catch (e) { }
                        if (src) video.src = src;

                        const del = document.createElement('div');
                        del.className = 'delete-icon';

                        element.appendChild(video);
                        element.appendChild(del);

                        if (dataBaseObjectStoreName === 'inputs' && pageName === 'face-swap') {
                            const keepFPS = document.getElementById('keepFPS');
                            const fpsSlider = document.getElementById("fps-slider");
                            const removeBanner = document.getElementById("removeBanner");

                            function handleMetadataUpdate(dataFps, dataDuration) {
                                const tooltip = element.querySelector('.tooltip');
                                if (tooltip && dataFps) {
                                    tooltip.style.display = 'flex';
                                    const fpsSliderValue = keepFPS && !keepFPS.checked ? fpsSlider.value : 60;
                                    const fps = Math.min(fpsSliderValue, dataFps);
                                    const videoDurationTotalFrames = Math.floor(dataDuration * fps);
                                    const singleCreditForTotalFrameAmount = 120;
                                    const removeBannerStateMultiplier = removeBanner && removeBanner.checked ? 2 : 1;
                                    const neededCredits = Math.floor(
                                        Math.max(1, videoDurationTotalFrames / singleCreditForTotalFrameAmount) *
                                        removeBannerStateMultiplier
                                    );
                                    tooltip.textContent = `${neededCredits} Credits`;
                                }
                            }

                            calculateMetadata(video, handleMetadataUpdate);

                            video.addEventListener('loadedmetadata', async () => {
                                await calculateMetadata(video, handleMetadataUpdate);
                            });

                            [keepFPS, fpsSlider, removeBanner].forEach(el => {
                                if (el) {
                                    el.addEventListener('change', async () => {
                                        const dataFps = video.getAttribute('data-fps');
                                        handleMetadataUpdate(dataFps, video.duration);
                                    });
                                }
                            });
                        }

                        if (pageName !== 'face-swap') {
                            try {
                                video.load();
                                const playPromise = video.play();
                                if (playPromise && typeof playPromise.then === 'function') {
                                    playPromise.catch(() => { });
                                }
                            } catch (e) { }
                        }
                    } else {
                        // image or GIF
                        const img = document.createElement('img');
                        img.setAttribute('url', url || '');
                        img.id = id;
                        img.setAttribute('timestamp', timestamp || '');
                        img.setAttribute('active', active ? 'true' : 'false');
                        img.alt = isGif ? 'Uploaded GIF' : 'Uploaded Photo';
                        if (src) img.src = src;

                        const del = document.createElement('div');
                        del.className = 'delete-icon';

                        if (dataBaseObjectStoreName === 'inputs') {
                            const tooltip = document.createElement('div');
                            tooltip.className = 'tooltip tooltip-fast cursor';
                            tooltip.textContent = 'Loading...';
                            tooltip.style.display = 'none';
                            tooltip.style.position = 'fixed';

                            function updateTooltipPosition(event) {
                                tooltip.style.left = `${event.clientX}px`;
                                tooltip.style.top = `${event.clientY - 15}px`;
                            }

                            element.addEventListener('mouseenter', () => document.addEventListener('mousemove', updateTooltipPosition));
                            element.addEventListener('mouseleave', () => document.removeEventListener('mousemove', updateTooltipPosition));
                            element.appendChild(tooltip);

                            if (pageName === 'face-swap') {
                                const removeBanner = document.getElementById("removeBanner");
                                function handleMetadataUpdate() {
                                    const t = element.querySelector('.tooltip');
                                    if (t && pageName !== 'video-generator' && pageName !== 'inpaint') {
                                        t.style.display = 'flex';
                                        let neededCredits = removeBanner && removeBanner.checked ? 2 : 1;
                                        t.textContent = `${neededCredits} Credits`;
                                    }
                                }
                                handleMetadataUpdate();
                                if (removeBanner) {
                                    removeBanner.addEventListener('change', () => handleMetadataUpdate());
                                }
                                calculateMetadata(img, null);
                            }
                        }

                        element.appendChild(img);
                        element.appendChild(del);
                    }

                    if (active) {
                        element.classList.add('active');
                        if (pageName === 'face-swap' || dataBaseObjectStoreName === 'outputs')
                            displayStoredData(element, dataBaseObjectStoreName);
                    }
                } else if (url) {
                    element.innerHTML = `<initial url="${url}" id="${id}" timestamp="${timestamp}" active="${active}"/></initial><div class="process-text">Fetching...</div><div class="delete-icon"></div>`;
                    const data = await fetchProcessState(url);
                    if (data?.status === 'completed') {
                        await handleDownload({ db, url, element, id, timestamp, active }, databases);
                    } else {
                        element.innerHTML = `<initial url="${url}" id="${id}" timestamp="${timestamp}" active="${active}"/></initial><div class="process-text">${data?.server || 'Queued'}</div><div class="delete-icon"></div>`;
                    }
                } else {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'missing-media';
                    placeholder.textContent = 'Media unavailable';
                    const del = document.createElement('div');
                    del.className = 'delete-icon';
                    element.appendChild(placeholder);
                    element.appendChild(del);
                }
            }

            mediaContainer.style.display = mediaCount > 0 ? 'flex' : 'none';
            updateGenerateButtonText();
        }

        loadingSpinner.remove();
        document.querySelectorAll('body main').forEach(main => {
            if (main)
                main.style.filter = 'none';
        });
    } catch (error) {
        console.error(`Database initialization failed: ${error.message}`);
    }
};

/*else if (url) {
                    const isEmbedPath = /\/embed\//.test(url);
                    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
                    const tiktokMatch = url.match(/(?:tiktok\.com\/@[^/]+\/video\/(\d+))/);
                    const igMatch = url.match(/(?:instagram\.com\/(?:p|reel|tv)\/([^/?#]+))/);
                    const twitterMatch = url.match(/(?:twitter\.com|x\.com)\/[^/]+\/status\/(\d+)/);
                    const deepanyMatch = url.match(/pornhub\.com\/view_video\.php\?viewkey=([\w]+)/);
                    const videoExtensions = /\.(mp4|webm|ogg|mov|mkv|avi)(\?.*)?$/i;
                    const isDirectVideo = videoExtensions.test(url);

                    if (isDirectVideo) {
                        element.innerHTML =
                            `<video
            timestamp="${timestamp}"
            id="${id}"
            src="${url}"
            preload="auto" autoplay muted keepmuted playsinline disablePictureInPicture
            style="
              width: calc(var(--input-size) - 2px);
              height: calc(var(--input-size) - 2px);
              border-radius: 50%;
              position: relative;
            ">
         </video>` +
                            `<div class="delete-icon"></div>`;
                    }
                    else if (isEmbedPath || ytMatch || tiktokMatch || igMatch || twitterMatch || deepanyMatch) {
                        let embedSrc = '';
                        if (isEmbedPath) {
                            embedSrc = url;
                        } else if (ytMatch) {
                            embedSrc = `https://www.youtube.com/embed/${ytMatch[1]}`;
                        } else if (tiktokMatch) {
                            embedSrc = `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`;
                        } else if (igMatch) {
                            embedSrc = `https://www.instagram.com/p/${igMatch[1]}/embed`;
                        } else if (twitterMatch) {
                            embedSrc = `https://twitframe.com/show?url=https://twitter.com/i/status/${twitterMatch[1]}`;
                        } else if (deepanyMatch) {
                            embedSrc = `https://www.deepany.ai/embed/${deepanyMatch[1]}`;
                        }

                        element.innerHTML =
                            `<iframe
            timestamp="${timestamp}"
            id="${id}"
            src="${embedSrc}"
            frameborder="0"
            scrolling="no"
            allowfullscreen
            style="
              width: calc(var(--input-size) - 2px);
              height: calc(var(--input-size) - 2px);
              border-radius: 50%;
              position: relative;
            ">
         </iframe>` +
                            `<div class="delete-icon"></div>`;
                    } else {
                        element.innerHTML =
                            `<initial url="${url}" id="${id}" timestamp="${timestamp}" active="${active}"/>` +
                            `<div class="process-text">Broken URL...</div>` +
                            `<div class="delete-icon"></div>`;
                    }


                    if (active) {
                        element.classList.add('active');
                        displayStoredData(element, dataBaseObjectStoreName);
                    }
                }*/
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
export const appendChunkToDB = (db, url, chunk) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([db.objectStoreNames[0]], 'readwrite');
        const objectStore = transaction.objectStore(db.objectStoreNames[0]);
        const request = objectStore.openCursor();
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (!cursor) return resolve();
            const value = cursor.value;
            if (value.url === url) {
                if (!value.chunks) value.chunks = [];
                value.chunks.push(chunk);
                const updateRequest = objectStore.put(value);
                updateRequest.onsuccess = () => resolve();
                updateRequest.onerror = () => reject('Error appending chunk.');
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

const _0x2c8895 = Math.floor(Math.random() * 0xA) + 0x1;
const _0x2c8896 = _0x2c8895 <= 0;

async function loadGoogleAdScript(_0x18b7dc, userData, userDoc, hideAds) {
    //if (pageName !== 'rewarded-ads' && pageName !== 'test')
        //return;

    const _0x2e82a2 = document.createElement("script");
    _0x2e82a2.async = true;
    _0x2e82a2.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + _0x18b7dc;
    _0x2e82a2.setAttribute("crossorigin", 'anonymous');
    document.head.appendChild(_0x2e82a2);
    _0x2e82a2.onload = function () {
        function _0x3db7be() {
            const _0x14e285 = localStorage.getItem("firstRefreshDone");
            if (_0x14e285 === "true") {
                showNotification("Please wait while we load new ads...", "Warning - No User Found", "warning-important");
                setTimeout(() => {
                    localStorage.removeItem('firstRefreshDone');
                    localStorage.removeItem("watchingAd");
                    localStorage.removeItem("__lsv__");
                    localStorage.removeItem("google_adsense_settings");
                    localStorage.removeItem("google_ama_config");
                    localStorage.removeItem("offerwallDismissedAt");
                    location.reload(true);
                }, 0x9c4);
            }
        }
        _0x3db7be();
        async function _0xa3b3e0() {
            let _0x589fef = await getUserDoc();
            if (!_0x589fef || _0x589fef?.['paid']) {
                watchRewardedAdsElement.parentElement.remove();
                return;
            }
            try {
                if (_0x589fef && !_0x589fef.lastAdWatched) {
                    _0x589fef = await getUserDoc(() => setCurrentUserDoc(getDocSnapshot));
                }
                const _0xcfb145 = _0x589fef.lastAdWatched || 0x0;
                let _0x45bba1 = _0x589fef.adCount || 0x0;
                const _0xae3469 = new Date().getTime();
                if (_0xae3469 - _0xcfb145 >= 43200000) {
                    _0x45bba1 = 0x0;
                }
                if (_0x45bba1 >= 0xa && !_0x589fef.admin) {
                    const _0x5b22b5 = 43200000 - (_0xae3469 - _0xcfb145);
                    const _0x2cedb3 = Math.floor(_0x5b22b5 / 3600000);
                    const _0x49d8f5 = Math.ceil(_0x5b22b5 % 3600000 / 60000);
                    alert("You have already earned your daily reward by watching 10 ads. Please try again in " + _0x2cedb3 + " hours and " + _0x49d8f5 + " minutes.");
                    return;
                }
                const _0x24e70c = _0x589fef.rewardCredits || 0x0;
                if (_0x24e70c >= 0xa && !_0x589fef.admin) {
                    alert("You have the maximum amount of reward credits. Please spend your reward credits first.");
                    return;
                }
                if (typeof userData !== "object" || !userData?.['uid']) {
                    const _0x3aa8cb = document.getElementById("openSignInContainer");
                    if (_0x3aa8cb) {
                        simulateFullClick(_0x3aa8cb);
                    }
                    showNotification("Please sign in or create an account to use our AI services with free (daily) trial.", "Warning - No User Found", "warning-important");
                    return;
                }
                const serverDocSnapshot = () => getDocSnapshot('servers', '3090-1');
                const _0x2cd97a = await fetchServerAddress(serverDocSnapshot, "API");
                const _0x32123b = await fetchWithRandom(_0x2cd97a + "/fetch-google-data", {
                    'method': 'POST',
                    'headers': {
                        'Content-Type': "application/json"
                    },
                    'body': JSON.stringify({
                        'userId': userData.uid
                    })
                });
                if (!_0x32123b.ok) {
                    throw new Error("Failed to grant credits. HTTP status: " + _0x32123b.status);
                }
                await _0x32123b.json();
                const _0x28bf2a = document.querySelectorAll(".updateUserInformation");
                _0x28bf2a.forEach(_0x4f4967 => {
                    localStorage.setItem('firstRefreshDone', 'true');
                    setTimeout(() => {
                        simulateFullClick(_0x4f4967);
                    }, 0x64);
                });
            } catch (_0x31a529) {
                console.error("Error granting credits:", _0x31a529);
            }
        }
        async function _0x5d1449() {
            const _0x430ed7 = localStorage.getItem('offerwallDismissedAt');
            const _0x28d5ae = !userDoc || !userData ? true : _0x430ed7 && Date.now() - parseInt(_0x430ed7, 0xa) < 43200000;
            const _0xb220ce = new MutationObserver(async (_0xe77d5d, _0x342926) => {
                for (const _0x2cf0dc of _0xe77d5d) {
                    document.querySelectorAll("fencedframe").forEach(_0x2a9f9a => _0x2a9f9a.remove());
                    const _0x302e65 = document.getElementById("ps_caff");
                    if (_0x302e65) {
                        _0x302e65.remove();
                    }
                    if (_0x2cf0dc.type === 'childList') {
                        const _0x4b94b3 = document.querySelector(".fc-thank-you-snackbar");
                        if (_0x4b94b3 && _0x4b94b3.classList.contains("fade-in")) {
                            const _0x304b74 = window.getComputedStyle(_0x4b94b3).display !== "none";
                            if (_0x304b74) {
                                _0xa3b3e0(); 
                                _0x342926.disconnect();
                            }
                        }
                    }
                    if (_0x2cf0dc.type === "attributes" && _0x2cf0dc.attributeName === 'style') {
                        const _0x3caeba = _0x2cf0dc.target;
                        if (_0x3caeba.classList.contains('fc-thank-you-snackbar')) {
                            const _0x2a964a = window.getComputedStyle(_0x3caeba).display !== "none";
                            if (_0x2a964a) {
                                _0xa3b3e0();
                                _0x342926.disconnect();
                            }
                        }
                    }
                    if (_0x2cf0dc.type === "characterData") {
                        const _0x240820 = _0x2cf0dc.target;
                        const _0x2b6e89 = _0x240820?.parentElement;
                        if (_0x2b6e89 && _0x2b6e89.classList.contains("fc-thank-you-snackbar")) {
                            const _0xe20bc9 = window.getComputedStyle(_0x2b6e89).display !== 'none';
                            if (_0xe20bc9) {
                                _0xa3b3e0();
                                _0x342926.disconnect();
                            }
                        }
                    }
                    document.querySelectorAll(".fc-list-item-button, .fc-rewarded-ad-button").forEach(_0x1e6657 => {
                        _0x1e6657.addEventListener("click", () => {
                            localStorage.setItem("watchingAd", "true");
                            if (_0x2c8896 && !document.querySelector('#ins-container') && getScreenMode() === ScreenMode.PHONE && (userDoc.totalAdCount || 0x0) > 0xA) {
                                const _0x3f3bf0 = document.createElement("link");
                                _0x3f3bf0.href = "https://fonts.googleapis.com/css?family=Roboto";
                                _0x3f3bf0.rel = 'stylesheet';
                                document.head.appendChild(_0x3f3bf0);
                                const _0x2c612b = document.createElement("style");
                                _0x2c612b.innerHTML = "\n    #ad_position_box {\n        position: fixed;\n        top: 0;\n        left: 0;\n        width: 100vw;\n        height: 100vh;\n        background: transparent;\n        z-index: 2147483648;\n        display: flex;\n        justify-content: center;\n        align-items: center;\n        font-family: 'Roboto', sans-serif;\n    }\n    #ad_content {\n        width: 100%;\n        height: 100%;\n        background-color: transparent;\n        position: relative;\n        box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);\n        font-family: 'Roboto', sans-serif;\n    }\n    .toprow {\n        width: 100%;\n        font-family: 'Roboto', sans-serif;\n        display: table;\n        font-size: 18px;\n        height: 0;\n        font-family: 'Roboto', sans-serif;\n    }\n    .btn {\n        display: table;\n        transition: opacity 1s, background .75s;\n        height: 30px;\n        padding-top: 15px;\n        padding-bottom: 15px;\n        background: transparent;\n        padding-right: 0.25em;\n        color: #FFF;\n        cursor: pointer;\n        font-family: 'Roboto', sans-serif;\n    }\n    .countdown-background {\n        border-radius: 1.8em;\n        background: rgba(0, 0, 0, 1);\n        transition: background 0.5s ease;\n        font-family: 'Roboto', sans-serif;\n    }\n    #count-down-text {\n        font-size: 12px;\n        font-family: 'Roboto', sans-serif;\n    }\n    .btn > div {\n        display: table-cell;\n        vertical-align: middle;\n        padding: 0 0.25em;\n        font-family: 'Roboto', sans-serif;\n    }\n    .skip {\n        opacity: 0.95;\n        float: right;\n        font-family: 'Roboto', sans-serif;\n    }\n    .skip svg {\n        height: 1.3em;\n        width: 1.3em;\n        margin-left: -0.3em;\n        margin-right: -0.3em;\n        vertical-align: middle;\n        padding-bottom: 1px;\n        font-family: 'Roboto', sans-serif;\n    }\n    .creative {\n        position: relative;\n        font-family: 'Roboto', sans-serif;\n    }\n    #dismiss-button {\n        padding-left: 0.5em;\n        padding-right: 0.5em;\n    }\n    #close-button {\n        fill: #FFF;\n        font-family: 'Roboto', sans-serif;\n    }\n    #close-button.disabled {\n        fill: #555;\n        font-family: 'Roboto', sans-serif;\n    }\n    .learnMoreButton {\n        font-family: 'Roboto', sans-serif;\n    }\n";
                                document.head.appendChild(_0x2c612b);
                                const _0x3b9fa0 = document.createElement("ins");
                                _0x3b9fa0.id = 'ins-container';
                                _0x3b9fa0.style.cssText = "\n    position: fixed !important;\n    z-index: 2147483648 !important;\n";
                                const _0x1484bd = document.createElement("div");
                                _0x1484bd.id = 'aswift_3';
                                _0x1484bd.style.cssText = "\n    position: absolute !important;\n    width: 100vw !important;\n";
                                const _0x158850 = document.createElement("div");
                                _0x158850.id = "ad_content";
                                _0x158850.style.cssText = "\n    width: 100%;\n    height: 100%;\n    background-color: transparent;\n    position: relative;\n    box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);\n";
                                const _0x591279 = document.createElement("div");
                                _0x591279.className = 'toprow';
                                const _0x36b3db = document.createElement("div");
                                _0x36b3db.id = 'dismiss-button';
                                _0x36b3db.className = "btn skip";
                                _0x36b3db.setAttribute("aria-label", "Close ad");
                                _0x36b3db.setAttribute("role", "button");
                                _0x36b3db.setAttribute("tabindex", '0');
                                const _0x465af8 = document.createElement("div");
                                _0x465af8.className = "btn countdown-background";
                                _0x465af8.id = 'count-down-container';
                                const _0x5b50f0 = document.createElement("div");
                                _0x5b50f0.id = 'count-down';
                                const _0x32908b = document.createElement("div");
                                _0x32908b.id = "count-down-text";
                                _0x32908b.innerText = "Tap 'Learn More' 4 times fast";
                                _0x5b50f0.appendChild(_0x32908b);
                                const _0x23b0a2 = document.createElement("div");
                                _0x23b0a2.id = "close-button";
                                _0x23b0a2.setAttribute("tabindex", '0');
                                _0x23b0a2.setAttribute('role', 'button');
                                _0x23b0a2.setAttribute("aria-label", "Close ad");
                                _0x23b0a2.className = "disabled";
                                const _0x5f49fe = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                                _0x5f49fe.setAttribute("viewBox", "0 0 48 48");
                                const _0x4c58b6 = document.createElementNS('http://www.w3.org/2000/svg', "path");
                                _0x4c58b6.setAttribute('d', "M38 12.83L35.17 10 24 21.17 12.83 10 10 12.83 21.17 24 10 35.17 12.83 38 24 26.83 35.17 38 38 35.17 26.83 24z");
                                const _0x4fcd93 = document.createElementNS("http://www.w3.org/2000/svg", "path");
                                _0x4fcd93.setAttribute('d', "M0 0h48v48H0z");
                                _0x4fcd93.setAttribute("fill", "none");
                                _0x5f49fe.appendChild(_0x4c58b6);
                                _0x5f49fe.appendChild(_0x4fcd93);
                                _0x23b0a2.appendChild(_0x5f49fe);
                                _0x465af8.appendChild(_0x5b50f0);
                                _0x465af8.appendChild(_0x23b0a2);
                                _0x36b3db.appendChild(_0x465af8);
                                _0x591279.appendChild(_0x36b3db);
                                _0x158850.appendChild(_0x591279);
                                const _0x3577d4 = document.createElement('div');
                                _0x3577d4.className = "creative";
                                _0x3577d4.id = "creative";
                                const _0x397dd4 = document.createElement('div');
                                _0x397dd4.style.cssText = "\n    cursor: pointer;\n    position: absolute;\n    z-index: 20;\n    top: 8px;\n    right: 8px;\n    font-size: 12px;\n    background-color: rgb(26, 115, 232);\n    border-radius: 4px;\n    box-sizing: border-box;\n    display: flex;\n    flex-direction: column;\n    align-items: center;\n    font-family: Roboto, sans-serif;\n    justify-content: center;\n    color: rgb(255, 255, 255);\n    height: 36px;\n    padding: 0px 12px;\n";
                                const _0x59d28e = document.createElement("div");
                                _0x59d28e.className = "learnMoreButton";
                                _0x59d28e.setAttribute("data-ck-tag", 'main-cta');
                                _0x59d28e.setAttribute('data-ck-navigates', "true");
                                _0x59d28e.innerText = "Learn More";
                                _0x397dd4.appendChild(_0x59d28e);
                                if (_0x397dd4) {
                                    let _0x59b555 = 0x0;
                                    let _0x18287f = 0x0;
                                    function _0x2da429() {
                                        _0x59b555 = 0x0;
                                        _0x32908b.innerText = "Tap 'Learn More' 4 times fast";
                                    }
                                    const _0x5ca293 = () => {
                                        const _0x398dbe = Date.now();
                                        if (_0x18287f === 0x0 || _0x398dbe - _0x18287f <= 0x12c) {
                                            _0x59b555++;
                                            _0x32908b.innerText = 0x3 - _0x59b555 + 0x1 === 0x1 ? "Tap 'Learn More' " + (0x3 - _0x59b555 + 0x1) + " times fast - Open ad for reward!" : "Tap 'Learn More' " + (0x3 - _0x59b555 + 0x1) + " times fast";
                                        } else {
                                            _0x2da429();
                                            _0x32908b.innerText = "Missed tap by " + (_0x398dbe - _0x18287f) + "ms. Tap 'Learn More' " + (0x3 - _0x59b555 + 0x1) + " times fast";
                                        }
                                        _0x18287f = _0x398dbe;
                                        if (_0x59b555 >= 0x3) {
                                            _0x397dd4.remove();
                                            if (_0x3b9fa0) {
                                                setTimeout(() => {
                                                    _0x3b9fa0.remove();
                                                }, 0x1d4c);
                                            }
                                        }
                                    };
                                    _0x397dd4.addEventListener("click", _0x51fe1e => {
                                        _0x51fe1e.preventDefault();
                                        _0x5ca293();
                                    });
                                    _0x397dd4.addEventListener("touchstart", _0x515613 => {
                                        _0x515613.preventDefault();
                                        _0x5ca293();
                                    });
                                }
                                _0x3577d4.appendChild(_0x397dd4);
                                _0x158850.appendChild(_0x3577d4);
                                _0x1484bd.appendChild(_0x158850);
                                _0x3b9fa0.appendChild(_0x1484bd);
                                document.documentElement.appendChild(_0x3b9fa0);
                            }
                        });
                    });
                    const _0x2dbcdd = document.querySelector(".fc-monetization-dialog.fc-dialog");
                    if (_0x2dbcdd) {
                        let _0x4b2e3f = await getUserDoc();
                        if (!_0x4b2e3f || _0x4b2e3f?.["paid"] || hideAds) {
                            localStorage.removeItem("watchingAd");
                            if (document.querySelector(".fc-message-root"))
                                document.querySelector(".fc-message-root").remove();
                            _0x342926.disconnect();
                            return;
                        }
                        if (_0x4b2e3f && !_0x4b2e3f.lastAdWatched) {
                            _0x4b2e3f = await getUserDoc(() => setCurrentUserDoc(getDocSnapshot));
                        }
                        const _0x31eb86 = _0x4b2e3f.lastAdWatched || 0x0;
                        let _0x10e937 = _0x4b2e3f.adCount || 0x0;
                        const _0x25a85a = new Date().getTime();
                        if (_0x25a85a - _0x31eb86 >= 43200000) {
                            _0x10e937 = 0x0;
                        }
                        if (_0x10e937 >= 0xa && !_0x4b2e3f.admin) {
                            localStorage.removeItem("watchingAd");
                            if (document.querySelector(".fc-message-root"))
                                document.querySelector(".fc-message-root").remove();
                            _0x342926.disconnect();
                            return;
                        }
                        const _0x211e78 = _0x4b2e3f.rewardCredits || 0x0;
                        if (_0x211e78 >= 0xa && !_0x4b2e3f.admin) {
                            localStorage.removeItem("watchingAd");
                            if (document.querySelector(".fc-message-root"))
                                document.querySelector(".fc-message-root").remove();
                            _0x342926.disconnect();
                            return;
                        }
                        if (_0x28d5ae) {
                            localStorage.removeItem('watchingAd');
                            if (document.querySelector(".fc-message-root"))
                                document.querySelector(".fc-message-root").remove();
                            _0x342926.disconnect();
                            return;
                        }
                    }
                }
            });
            _0xb220ce.observe(document, {
                'childList': true,
                'subtree': true,
                'attributes': true,
                'characterData': true,
                'attributeFilter': ["style"]
            });

            const observerDismissAd = new MutationObserver(() => {
                const dialogContent = document.querySelector('.fc-dialog-content');
                if (dialogContent && !document.getElementById('dismiss-button-element')) {
                    addDismissButton(dialogContent);
                }
                addOverlayClickListener();
            });
            observerDismissAd.observe(document.body, { childList: true, subtree: true });

            function addDismissButton(parent) {
                const btn = document.createElement("div");
                btn.id = "dismiss-button-element";
                btn.style.cssText = "position: absolute !important; top: 10px !important; right: 10px !important; cursor: pointer !important; z-index: 9999 !important;";
                btn.innerHTML = `<svg viewBox="0 0 48 48" fill="#5F6368" width="24" height="24">
        <path d="M38 12.83L35.17 10 24 21.17 12.83 10 10 12.83 21.17 24 10 35.17 12.83 38 24 26.83 35.17 38 38 35.17 26.83 24z"></path>
        <path d="M0 0h48v48H0z" fill="none"></path></svg>`;
                parent.prepend(btn);
                btn.addEventListener("click", removeOfferWall);
            }

            function addOverlayClickListener() {
                const overlay = document.querySelector(".fc-dialog-overlay");
                if (overlay && !overlay.dataset.listenerAdded) {
                    overlay.dataset.listenerAdded = "true";
                    overlay.addEventListener("click", removeOfferWall);
                }
            }

            function removeOfferWall() {
                const root = document.querySelector(".fc-message-root");
                const dialog = document.querySelector(".fc-monetization-dialog-container");
                const snackbar = document.querySelector(".fc-thank-you-snackbar");

                if (!root) alert("Error: fc-message-root not found");
                if (!dialog) alert("Error: fc-monetization-dialog-container not found");
                if (!snackbar) alert("Error: fc-thank-you-snackbar not found");

                root?.remove();
                dialog?.remove();
                snackbar?.parentElement?.remove();

                localStorage.setItem("offerwallDismissedAt", Date.now().toString());
            }
            if (userDoc === null || userDoc?.paid || userData === null || !userData?.emailVerified || hideAds) {
                function wrapAdElement(node) {
                    if (!node.parentElement || !node.parentElement.classList.contains('adsense-wrapper')) {
                        const wrapper = document.createElement('div');
                        wrapper.className = 'adsense-wrapper';
                        node.parentNode.insertBefore(wrapper, node);
                        wrapper.appendChild(node);
                    }
                }

                document.querySelectorAll(
                    '.adsbygoogle.adsbygoogle-noablate, .google-anno-skip.google-anno-sc, #google-anno-sa'
                ).forEach(wrapAdElement);

                const observer = new MutationObserver(mutations => {
                    mutations.forEach(mutation => {
                        if (mutation.type === 'childList') {
                            mutation.addedNodes.forEach(node => {
                                if (node.nodeType !== Node.ELEMENT_NODE) return;

                                const classList = node.classList || [];

                                const isAdSenseIframe = node.tagName === 'IFRAME' && node.src.includes('googleads');
                                const isAdSenseDiv = classList.contains('adsbygoogle') && classList.contains('adsbygoogle-noablate');
                                const isAnnoAd = classList.contains('google-anno-skip') && classList.contains('google-anno-sc');
                                const isAnnoSa = node.id === 'google-anno-sa';

                                if (isAdSenseIframe || isAdSenseDiv || isAnnoAd || isAnnoSa) {
                                    wrapAdElement(node);
                                }

                                if (classList.contains('fc-button') &&
                                    classList.contains('fc-cta-consent') &&
                                    classList.contains('fc-primary-button')) {
                                    simulateFullClick(node);
                                }
                            });
                        }
                    });
                });

                observer.observe(document.documentElement, { childList: true, subtree: true });
            }
        }
        _0x5d1449();
    };
}

(async () => {
    const params = new URLSearchParams(window.location.search);
    const verificationUid = params.get('verification');

    if (!verificationUid) return;

    // Inject styles for loading screen + fade animations + message container
    if (!document.getElementById('loading-screen-important-style')) {
        const style = document.createElement('style');
        style.id = 'loading-screen-important-style';
        style.textContent = `
      .loading-screen-important::before {
        content: "";
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(24, 24, 24, 1);
        z-index: 9999999;
      }
      .loading-screen-important::after {
        content: "";
        position: fixed;
        top: 50%; left: 50%;
        width: 50px; height: 50px;
        margin-top: -25px;
        margin-left: -25px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #ff7300;
        border-radius: 50%;
        animation: spin 2s linear infinite;
        z-index: 10000000;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      #loading-message {
        position: fixed;
        top: 60%;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        font-size: calc(3.6vh * var(--scale-factor-h));
        z-index: 10000001;
        opacity: 0;
        transition: opacity 1.5s ease;
        max-width: 90vw;
        text-align: center;
        font-family: sans-serif;
        user-select: none;
      }
      #loading-message.visible {
        opacity: 1;
      }
    `;
        document.head.appendChild(style);
    }

    // Add loading class and message container
    document.documentElement.classList.add('loading-screen-important');
    let msg = document.createElement('div');
    msg.id = 'loading-message';
    document.body.appendChild(msg);

    // Helper to change message with fade out/in
    async function setMessage(text) {
        msg.classList.remove('visible');
        await new Promise(r => setTimeout(r, 500)); // fade out
        msg.textContent = text;
        msg.classList.add('visible');
        await new Promise(r => setTimeout(r, 1000)); // fade in + pause
    }

    try {
        let userData = await getUserData();
        if (!userData) {
            await setMessage('Account not found...');
            return;
        }

        if (userData?.emailVerified) {
            await setMessage('Email not confirmed...');
            return;
        }

        await setMessage('Confirming Verification Code...');

        const userId = userData.uid;
        const server = await getServerAddressAPI();
        const response = await fetchWithRandom(`${server}/check-verification-status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: userId, token: verificationUid }),
        });
        const data = await response.json();

        if (!data.valid) {
            await setMessage(data.message || 'Verification link is invalid or expired.');
            return;
        }

        await setMessage('Almost Finished...');

        const userDoc = await getUserDoc(() => setCurrentUserDoc(getDocSnapshot));
        if (userDoc.isBanned) throw new Error('Your account is banned from our services.');

        userData = await getUserData(() => setCurrentUserData(getFirebaseModules));
        if (!userData.emailVerified) throw new Error('Your email is still not verified.');

        await setMessage('Verification Successful!');

        const innerContainer = document.getElementById('innerContainer');
        if (innerContainer) innerContainer.remove();
        msg.classList.remove('visible');

        await new Promise(r => setTimeout(r, 1000));
        document.documentElement.classList.remove('loading-screen-important');
        msg.remove();
    } catch (err) {
        console.error('Verification check failed:', err);
        const errorMessage = err?.message || String(err) || 'Something went wrong while verifying your email.';
        await setMessage(errorMessage);
        msg.classList.remove('visible');
        await new Promise(r => setTimeout(r, 2500));
        document.documentElement.classList.remove('loading-screen-important');
        msg.remove();
    } finally {
        const url = new URL(location.href);
        url.searchParams.delete('verification');
        location.href = url.toString();
    }
})();

(async () => {
    const params = new URLSearchParams(window.location.search);
    const paymentSuccess = params.has('payment-redirect');
    const orderId = params.get('orderId');

    if (!paymentSuccess || !orderId) return;

    let userData = await getUserData();
    if (!userData) {
        return;
    }

    const storageKey = `payment-verified-${orderId}`;
    const alreadyVerified = localStorage.getItem(storageKey);

    if (alreadyVerified === 'true') {
        const url = new URL(location.href);
        url.searchParams.delete('payment-redirect');
        url.searchParams.delete('orderId');
        location.href = url.toString();
        return;
    }

    if (!document.getElementById('loading-screen-important-style')) {
        const style = document.createElement('style');
        style.id = 'loading-screen-important-style';
        style.textContent = `
      .loading-screen-important::before {
        content: "";
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(24, 24, 24, 1);
        z-index: 9999999;
      }
      .loading-screen-important::after {
        content: "";
        position: fixed;
        top: 50%; left: 50%;
        width: 50px; height: 50px;
        margin-top: -25px;
        margin-left: -25px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #ff7300;
        border-radius: 50%;
        animation: spin 2s linear infinite;
        z-index: 10000000;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      #loading-message {
        position: fixed;
        top: 60%;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        font-size: calc(3.6vh * var(--scale-factor-h));
        z-index: 10000001;
        opacity: 0;
        transition: opacity 1.5s ease;
        max-width: 90vw;
        text-align: center;
        font-family: sans-serif;
        user-select: none;
      }
      #loading-message.visible {
        opacity: 1;
      }
    `;
        document.head.appendChild(style);
    }

    document.documentElement.classList.add('loading-screen-important');
    let msg = document.createElement('div');
    msg.id = 'loading-message';
    document.body.appendChild(msg);

    async function setMessage(text) {
        msg.classList.remove('visible');
        await new Promise(r => setTimeout(r, 1000));
        msg.textContent = text;
        msg.classList.add('visible');
        await new Promise(r => setTimeout(r, 2000));
    }

    try {
        await setMessage('Confirming payment...');

        let snapshot = await getDocSnapshot('payments', orderId);
        const order = snapshot.data();
        if (!order) {
            await setMessage('Order not found.');
            return;
        }

        if (order.status === 'pending') {
            showNotification(
                'Payment is in pending state. Keep this page open until its verified. Also you will soon recieve a confirmation email.',
                'No need to worry!',
                'normal'
            );
            const maxRetries = 15;
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                const remaining = (maxRetries - attempt) * 5;
                await setMessage(`Payment not completed yet. Retrying in ${remaining} seconds...`);
                await new Promise(r => setTimeout(r, 60000));
                order = await getDocSnapshot('servers', orderId);
                if (!order) {
                    await setMessage('Order not found. Please contact support.');
                    return;
                }
                if (order.status === 'success') {
                    break;
                }
                if (attempt === maxRetries) {
                    msg.innerHTML = 'Payment still in pending state. Please <a href="#" id="retryLink" style="color: #ff7300; text-decoration: underline;">click here</a> after you receive the payment confirmation email.';
                    msg.classList.add('visible');

                    document.getElementById('retryLink').addEventListener('click', (e) => {
                        e.preventDefault();
                        location.reload();
                    });
                    return;
                }

            }
        }

        if (order.status !== 'success') {
            await setMessage('Your payment was unsuccessful.');
            await new Promise(r => setTimeout(r, 200000));
            return;
        }

        await triggerPurchaseConfirmationEvent(order);
        await setMessage('Thanks for your purchase!');
        await updateUserInformation(getFirebaseModules, false);
        localStorage.setItem(storageKey, 'true');
    } catch (err) {
        console.error('Payment verification failed:', err);
        const errorMessage = err?.message || String(err) || 'Something went wrong while verifying payment.';
        await setMessage(errorMessage);
        msg.classList.remove('visible');
        await new Promise(r => setTimeout(r, 2500));
        document.documentElement.classList.remove('loading-screen-important');
        msg.remove();
    } finally {
        const url = new URL(location.href);
        url.searchParams.delete('payment-redirect');
        url.searchParams.delete('orderId');
        location.href = url.toString();
    }
})();

async function restoreAccount(
    userData,
    userDoc,
    getUserInternetProtocol,
    ensureUniqueId,
    getDocSnapshot,
    getFirebaseModules
) {
    console.log('[restoreAccount] begin');

    let accountNeedsRestoration = false;

    let storedEmail = userData.email;
    if (!isValidEmail(storedEmail)) {
        storedEmail = await getStoredEmail();
        console.log('[restoreAccount] fetched storedEmail:', storedEmail);
    }

    let userId = userData.uid;
    if (!userId) {
        const { auth } = await getFirebaseModules(true);
        userId = auth.currentUser.uid;
    }

    if (!userDoc || !userDoc.email || !userDoc.username) {
        console.log('[restoreAccount] local userDoc incomplete');
        accountNeedsRestoration = true;
    } else if (!userId) {
        console.log('[restoreAccount] UID mismatch');
        console.log('userId: ', userId);
        accountNeedsRestoration = true;
    } else {
        try {
            if (storedEmail !== userData.email) {
                console.log('[restoreAccount] storedEmail != userData.email');
                accountNeedsRestoration = true;
            } else {
                const { email: localEmail, username: localUsername } = userDoc;

                let uidSnapshot = null,
                    emailSnapshot = null,
                    usernameSnapshot = null;

                try {
                    uidSnapshot = await getDocSnapshot('users', userId);
                } catch (e) {
                    console.warn(`[restoreAccount] Failed to fetch UID doc for ${userId}:`, e);
                }
                try {
                    if (storedEmail) {
                        emailSnapshot = await getDocSnapshotByField('users', 'email', storedEmail.toLowerCase());
                    }
                } catch (e) {
                    console.warn(`[restoreAccount] Failed to fetch email doc for ${storedEmail}:`, e);
                }
                try {
                    if (localUsername) {
                        usernameSnapshot = await getDocSnapshotByField('users', 'username', localUsername);
                    }
                } catch (e) {
                    console.warn(`[restoreAccount] Failed to fetch username doc for ${localUsername}:`, e);
                }

                const snapshotsExist =
                    uidSnapshot?.exists() && emailSnapshot?.exists() && usernameSnapshot?.exists();

                if (!snapshotsExist) {
                    console.log('[restoreAccount] One or more remote documents missing');
                    accountNeedsRestoration = true;
                } else {
                    const uidData = uidSnapshot.data();
                    const emailData = emailSnapshot.data();
                    const usernameData = usernameSnapshot.data();

                    if (
                        uidData.email?.toLowerCase() !== emailData.email?.toLowerCase() ||
                        uidData.email?.toLowerCase() !== usernameData.email?.toLowerCase() ||
                        uidData.username !== emailData.username ||
                        uidData.username !== usernameData.username ||
                        emailData.username !== usernameData.username
                    ) {
                        console.log('[restoreAccount] Remote documents mismatch detected');
                        accountNeedsRestoration = true;
                    }

                    // Log and check UID snapshot
                    {
                        const remoteEmail = uidData?.email?.toLowerCase();
                        const remoteUsername = uidData?.username;
                        console.log('[restoreAccount] uidSnapshot remoteData:', uidData);
                        if (remoteEmail !== localEmail?.toLowerCase() || remoteUsername !== localUsername) {
                            console.log('[restoreAccount] uidSnapshot remote mismatch detected');
                            accountNeedsRestoration = true;
                        }
                    }

                    // Log and check Email snapshot
                    {
                        const remoteEmail = emailData?.email?.toLowerCase();
                        const remoteUsername = emailData?.username;
                        console.log('[restoreAccount] emailSnapshot remoteData:', emailData);
                        if (remoteEmail !== localEmail?.toLowerCase() || remoteUsername !== localUsername) {
                            console.log('[restoreAccount] emailSnapshot remote mismatch detected');
                            accountNeedsRestoration = true;
                        }
                    }

                    // Log and check Username snapshot
                    {
                        const remoteEmail = usernameData?.email?.toLowerCase();
                        const remoteUsername = usernameData?.username;
                        console.log('[restoreAccount] usernameSnapshot remoteData:', usernameData);
                        if (remoteEmail !== localEmail?.toLowerCase() || remoteUsername !== localUsername) {
                            console.log('[restoreAccount] usernameSnapshot remote mismatch detected');
                            accountNeedsRestoration = true;
                        }
                    }
                }
            }
        } catch (err) {
            console.warn('[restoreAccount] validation error:', err);
            accountNeedsRestoration = true;
        }
    }

    console.log('[restoreAccount] accountNeedsRestoration:', accountNeedsRestoration);

    if (accountNeedsRestoration) {
        const [userInternetProtocol, uniqueId, serverAddressAPI] = await Promise.all([
            getUserInternetProtocol(),
            ensureUniqueId(),
            getServerAddressAPI(),
        ]);

        console.log('[restoreAccount] protocol info:', userInternetProtocol);
        console.log('[restoreAccount] uniqueId:', uniqueId);
        console.log('[restoreAccount] serverAddressAPI:', serverAddressAPI);

        if (!userInternetProtocol || !userInternetProtocol?.hasOwnProperty('isVPN')) {
            throw new Error(
                'Unable to verify VPN status. Please disable adblockers or extensions and try again.'
            );
        }

        let username = userDoc?.username ? userDoc.username : storedEmail.split('@')[0];

        const requestData = {
            uid: userId || null,
            email: storedEmail,
            username,
            referral: null,
            userInternetProtocolAddress: userInternetProtocol.userInternetProtocolAddress,
            userUniqueInternetProtocolId: userInternetProtocol.userUniqueInternetProtocolId,
            uniqueId,
        };

        console.log('[restoreAccount] sending restore request:', requestData);

        const response = await fetchWithRandom(`${serverAddressAPI}/restore-account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData),
        });

        let result;
        try {
            result = await response.json();
        } catch (e) {
            result = { error: 'Invalid JSON response', status: response.status };
        }

        console.log('[restoreAccount] restore response:', result);
        alert(result.message);

        if (result.success === true) {
            signOutUser(getFirebaseModules, false);

            const { auth, signInWithCustomToken } = await getFirebaseModules(true);
            const userCredential = await signInWithCustomToken(auth, result.customToken);

            let userCopy = { ...userCredential.user };
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

            if (!localStorage.getItem('profileImageBase64') && userCopy.photoURL) {
                const base64Image = await retrieveImageFromURL(userCopy.photoURL, 2, 1000, true);
                if (base64Image) {
                    localStorage.setItem('profileImageBase64', base64Image);
                }
            }

            localStorage.setItem('cachedUserData', JSON.stringify(userCopy));

            try {
                await getUserDoc(() => setCurrentUserDoc(getDocSnapshot, false));
            } catch (err) {
                console.error('Error updating user document:', err.message);
            }

            const cachedUserData = JSON.parse(localStorage.getItem('cachedUserData'));

            if (cachedUserData) {
                cachedUserData.emailVerified = false;
                localStorage.setItem('cachedUserData', JSON.stringify(cachedUserData));
            }

            location.reload();
        }
    }

    console.log('[restoreAccount] end');
}

export async function createVerificationFormSection(getFirebaseModules) {
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
        sendVerificationEmail.disabled = true;

        const isResend = !(/receive/i.test(sendVerificationEmail.textContent));

        try {
            if (isResend) {
                const server = await getServerAddressAPI();
                const { auth } = await getFirebaseModules(true);
                const user = auth.currentUser;
                if (!user) throw new Error('No authenticated user found. Please log in first.');

                const token = await user.getIdToken();
                const response = await fetchWithRandom(`${server}/resend-verification-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ uid: user.uid, displayName: user.displayName, email: user.email, token: token })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData?.error || `Request failed with status ${response.status}`;
                    throw new Error(errorMessage);
                }

                document.getElementById('verificationMessage').style.display = 'unset';
                document.getElementById('verificationMessage').style.color = 'unset';
                document.getElementById('verificationMessage').textContent = 'Verification email resent! Please check your inbox.';
            } else {
                const { auth, sendEmailVerification } = await getFirebaseModules(true);
                const user = auth.currentUser;
                if (user) {
                    await sendEmailVerification(user);
                    document.getElementById('verificationMessage').style.display = 'unset';
                    document.getElementById('verificationMessage').style.color = 'unset';
                    document.getElementById('verificationMessage').textContent = 'Verification email sent! Please check your inbox.';
                } else {
                    throw new Error('No authenticated user found. Please log in first.');
                }
            }
        } catch (error) {
            document.getElementById('verificationMessage').style.display = 'unset';
            document.getElementById('verificationMessage').style.color = 'red';
            document.getElementById('verificationMessage').textContent = error.message;

            if (error.message === 'A verification link has already been sent. Please check your email and spam folders.') {
                sendVerificationEmail.disabled = true;
                return;
            }
        }

        let countdown = 10;
        sendVerificationEmail.textContent = `Didn't receive? (${countdown})`;

        const interval = setInterval(() => {
            countdown--;
            if (countdown > 0) {
                sendVerificationEmail.textContent = `Didn't receive? (${countdown})`;
            } else {
                clearInterval(interval);
                sendVerificationEmail.textContent = `Didn't receive?`;
                sendVerificationEmail.disabled = false;
            }
        }, 1000);
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

async function handleUserLoggedIn(userData, getUserInternetProtocol, ensureUniqueId, fetchServerAddress, getDocSnapshot, getFirebaseModules) {
    if (!userData)
        return;

    const userLayoutContainer = document.getElementById("userLayoutContainer");
    if (userLayoutContainer)
        userLayoutContainer.style.display = 'unset';
    let userDoc = await getUserDoc();
    /*const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const lastRun = localStorage.getItem('lastRestoreAccountRun');
    const now = Date.now();

    if (!lastRun || now - lastRun > ONE_WEEK_MS) {
        try {
            restoreAccount(userData, userDoc, getUserInternetProtocol, ensureUniqueId, getDocSnapshot, getFirebaseModules);
            localStorage.setItem('lastRestoreAccountRun', now);
            console.log('restoreAccount ran successfully.');
        } catch (err) {
            console.error('restoreAccount error:', err);
        }
    } else {
        console.log('restoreAccount skipped: ran less than a week ago.');
    }*/

    const restoreAccountClass = document.querySelectorAll('.restoreAccount');
    restoreAccountClass.forEach(restoreAccountElement => {
        restoreAccountElement.addEventListener('click', async function (event) {
            event.preventDefault();
            await restoreAccount(userData, userDoc, getUserInternetProtocol, ensureUniqueId, getDocSnapshot, getFirebaseModules);
        });
    });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        // DOM is ready
        loadGoogleAdScript('ca-pub-2374246406180986', userData, userDoc, pageName === 'rewarded-ads' ? false : true);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            loadGoogleAdScript('ca-pub-2374246406180986', userData, userDoc, pageName === 'rewarded-ads' ? false : true);
        });
    }

    const openSignInContainer = document.getElementById("openSignInContainer");
    const openSignUpContainer = document.getElementById("openSignUpContainer");
    if (openSignInContainer) openSignInContainer.remove();
    if (openSignUpContainer) openSignUpContainer.remove();
    if (!userData.emailVerified) {
        const createFormSection = createVerificationFormSection.bind(null, getFirebaseModules);
        createForm(createFormSection)
    }
    const canSetUserData = setUser(userDoc);
    if (!canSetUserData) {
        const setUserDataSuccess = await setCurrentUserDoc(getDocSnapshot);
        if (!setUserDataSuccess) {
            createAdblockerOverlay();
            // won't work anymore.
            const storedEmail = await getStoredEmail();
            if (!storedEmail)
                alert(`It seems like we had trouble creating your accounts credentials. Try disabling extensions (such as ad blockers) if you have in your browser. If you are not able to solve this please contact us about this matter via email (official@deepany.ai) or discord. We will log you out and you can try to log in or register again. Thank you!`);
            else
                alert(`Please login to ${storedEmail}. Multiple accounting are not allowed. Try disabling extensions (such as ad blockers) if you have in your browser. We will log you out and you can try to log in or register again. If you are having trouble logging to ${storedEmail}, please email us about this matter (official@deepany.ai) or reach us in discord community server. Thank you!`);
            signOutUser(getFirebaseModules);
            /*try {
                const [userInternetProtocol, uniqueId, serverAddressAPI] = await Promise.all([getUserInternetProtocol(), ensureUniqueId(), getServerAddressAPI()]);
                if (!userInternetProtocol || !userInternetProtocol?.hasOwnProperty('isVPN')) {
                    throw new Error("Unable to verify VPN status. Please disable adblockers or extensions and try again.");
                }

                if (userInternetProtocol?.isVPN || userInternetProtocol?.isProxy || userInternetProtocol?.isTOR) {
                    throw new Error("You can't use VPN/Proxy/TOR while signing up. Please disable them and try again.");
                }

                const userId = userData.uid;
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
                    try {
                        const userData = await getUserData(() => setCurrentUserData(getFirebaseModules));
                        console.log(userData);
                    } catch (error) {
                        console.error('Error during updating user data: ' + error.message);
                    }

                    try {
                        const userDoc = await getUserDoc(() => setCurrentUserDoc(getDocSnapshot, !0));
                        console.log(userDoc);
                    } catch (error) {
                        console.error('Error during updating user document: ' + error.message);
                    }

                    location.reload()
                } else {
                    throw new Error(`HTTP error! Google sign failed, please use email registration. - ${response.status} ${response.statusText} ${responseText}`)
                }
            } catch (error) {
                alert(error.message);
                console.error('Error during user registration:', error);
                return null
            }*/
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

    if (userData.emailVerified) {
        const email = userDoc?.email;
        localStorage.setItem('email', email);

        if (isValidEmail(email)) {
            window.addEventListener('storage', (event) => {
                if (event.key === 'email' && event.newValue === null) {
                    localStorage.setItem('email', email);
                }
            });

            if (!localStorage.getItem('conversionSignUpSent')) {
                gtag('event', 'conversion', {
                    'send_to': 'AW-17205210368/8dLPCP206twaEIDaioxA'
                });
                localStorage.setItem('conversionSignUpSent', 'true');
            }
        }

        try {
            console.log('[loadJQueryAndEvercookie] called');
            await loadJQueryAndEvercookie();
            const ec = new evercookie();

            return new Promise((resolve) => {
                ec.get('email', (recieved) => {
                    if (recieved === email) {
                        resolve(recieved);
                        return;
                    }

                    if (recieved && isValidEmail(recieved)) {
                        alert(`Multiple or duplicate accounts are not allowed. Please sign in with ${recieved}. You will now be signed out.`);
                        signOutUser(getFirebaseModules);
                        resolve(recieved);
                        return;
                    }

                    if (email && isValidEmail(email)) {
                        ec.set('email', email);
                        resolve(email);
                        return;
                    }

                    resolve(null);
                });
            });
        } catch (error) {
            console.error("Error retrieving email via Evercookie:", error);
            return null;
        }
    }
}

let storedEmail = null;
async function createSignFormSection(registerForm, retrieveImageFromURL, getFirebaseModules) {
    const innerContainer = document.getElementById('innerContainer');
    if (!innerContainer)
        return;
    if (!registerForm) {
        innerContainer.innerHTML = `
                <h2 id="signInText">Sign in</h2>
                <div id="signInSectionReferralText"><p>Don't have an account? <span id="openSignUpForm" class="text-gradient" style="cursor: pointer;">Sign up</span> | Free trial available!</p></div>
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
                    <label for="code">Referral Code (Optional)</label>
                    <input type="text" id="referral_code" name="referral_code" placeholder="Enter your referral code..." autocomplete="referral_code" required>
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

    async function waitForStoredEmailValid(timeout = 10000) {
        const start = Date.now();
        while (!isValidEmail(storedEmail)) {
            if (Date.now() - start > timeout) break;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    async function loadEmailCheck() {
        const openSignInContainerPrevious = signInButton ? signInButton.textContent : '';
        const openSignUpContainerPrevious = signUpButton ? signUpButton.textContent : '';

        if (signInButton) {
            signInButton.disabled = true;
            signInButton.textContent += ' (Loading...)';
        }
        if (signUpButton) {
            signUpButton.disabled = true;
            signUpButton.textContent += ' (Loading...)';
        }

        const localStorageEmail = localStorage.getItem('email');

        if (localStorageEmail !== encodeValue('Not Found')) {
            await waitForStoredEmailValid();

            const valueToRestore = isValidEmail(storedEmail) ? storedEmail : encodeValue('Not Found');
            localStorage.setItem('email', valueToRestore);
            window.addEventListener('storage', (event) => {
                if (event.key === 'email' && event.newValue === null) {
                    localStorage.setItem('email', valueToRestore);
                }
            });
        }

        if (signInButton) {
            signInButton.disabled = false;
            signInButton.textContent = openSignInContainerPrevious;
        }
        if (signUpButton) {
            signUpButton.disabled = false;
            signUpButton.textContent = openSignUpContainerPrevious;
        }
    }

    loadEmailCheck();

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

    function loadGoogleOAuth2Library() {
        return new Promise((resolve, reject) => {
            if (window.google && window.google.accounts && window.google.accounts.oauth2) return resolve();
            const script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    if (googleSignInButton) {
        googleSignInButton.addEventListener('click', async (event) => {
            event.preventDefault();
            try {
                await loadGoogleOAuth2Library();

                const accessToken = await new Promise((resolve, reject) => {
                    const client = google.accounts.oauth2.initTokenClient({
                        client_id: '385732753036-imup4601voei0v3l61jdr8niokml2a0g.apps.googleusercontent.com',
                        scope: 'openid email profile',
                        callback: (response) => {
                            if (response.access_token) resolve(response.access_token);
                            else reject('Failed to get access token');
                        }
                    });
                    client.requestAccessToken();
                });

                const [userInternetProtocol, uniqueId, serverAddressAPI] = await Promise.all([
                    getUserInternetProtocol(),
                    ensureUniqueId(),
                    getServerAddressAPI()
                ]);

                //if (!userInternetProtocol || !userInternetProtocol?.hasOwnProperty('isVPN')) {
                    //throw new Error("Unable to verify VPN status. Please disable adblockers or extensions and try again.");
                //}

                //if (userInternetProtocol?.isVPN || userInternetProtocol?.isProxy || userInternetProtocol?.isTOR) {
                    //throw new Error("You can't use VPN/Proxy/TOR while signing up. Please disable them and try again.");
                //}

                const response = await fetchWithRandom(`${serverAddressAPI}/create-user`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        googleAccessToken: accessToken,
                        userInternetProtocolAddress: userInternetProtocol.userInternetProtocolAddress,
                        userUniqueInternetProtocolId: userInternetProtocol.userUniqueInternetProtocolId,
                        isVPN: userInternetProtocol.isVPN,
                        isProxy: userInternetProtocol.isProxy,
                        isTOR: userInternetProtocol.isTOR,
                        uniqueId,
                        referral: referral || null,
                    })
                });

                if (!response.ok) {
                    throw new Error(`Google sign failed, please use email registration. - ${response.status} ${response.statusText}`);
                }

                const { token } = await response.json();
                const { auth, signInWithCustomToken } = await getFirebaseModules(true);
                const userCredential = await signInWithCustomToken(auth, token);

                let userCopy = { ...userCredential.user };
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

                if (!localStorage.getItem('profileImageBase64') && userCopy.photoURL) {
                    const base64Image = await retrieveImageFromURL(userCopy.photoURL, 2, 1000, true);
                    if (base64Image) {
                        localStorage.setItem('profileImageBase64', base64Image);
                    }
                }

                localStorage.setItem('cachedUserData', JSON.stringify(userCopy));

                try {
                    const userData = await getUserData(() => setCurrentUserData(getFirebaseModules));
                } catch (err) {
                    console.error('Error updating user data:', err.message);
                }

                try {
                    const userDoc = await getUserDoc(() => setCurrentUserDoc(getDocSnapshot, true));
                } catch (err) {
                    console.error('Error updating user document:', err.message);
                }

                location.reload();
            } catch (err) {
                console.error("Google sign-in error:", err);
            }
        });
    }

    if (signInButton) {
        signInButton.addEventListener('click', async (event) => {
            event.preventDefault();
            if (storedEmail && isValidEmail(storedEmail)) {
                async function signInToRestoredAccount() {
                    signInButton.disabled = true;
                    signInButton.textContent = 'Restoring account...';
                    const password = document.getElementById('password').value;
                    try {
                        const {
                            auth,
                            signInWithEmailAndPassword
                        } = await getFirebaseModules(true);
                        const result = await signInWithEmailAndPassword(auth, storedEmail, password);
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
                }

                signInButton.disabled = true;
                signInButton.textContent = 'Restoring account...';
                try {
                    const [userInternetProtocol, uniqueId, serverAddressAPI] = await Promise.all([getUserInternetProtocol(), ensureUniqueId(), getServerAddressAPI()]);
                    //if (!userInternetProtocol || !userInternetProtocol?.hasOwnProperty('isVPN')) {
                        //throw new Error("Unable to verify VPN status. Please disable adblockers or extensions and try again.");
                    //}

                    //if (userInternetProtocol?.isVPN || userInternetProtocol?.isProxy || userInternetProtocol?.isTOR) {
                        //throw new Error("You can't use VPN/Proxy/TOR while signing up. Please disable them and try again.");
                    //}

                    configureGtag();

                    const password = document.getElementById('password').value;
                    let username = document.getElementById('username')?.value;

                    if (!username) {
                        username = storedEmail.split('@')[0];
                    }

                    const requestData = {
                        email: storedEmail,
                        password,
                        username,
                        referral: referral || null,
                        userInternetProtocolAddress: userInternetProtocol.userInternetProtocolAddress,
                        userUniqueInternetProtocolId: userInternetProtocol.userUniqueInternetProtocolId,
                        isVPN: userInternetProtocol.isVPN,
                        isProxy: userInternetProtocol.isProxy,
                        isTOR: userInternetProtocol.isTOR,
                        uniqueId: uniqueId,
                    };

                    const response = await fetchWithRandom(`${serverAddressAPI}/register`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestData),
                    });

                    const data = await response.json();
                    if (data.message && (data.message.includes("User registered successfully") || data.message.includes("already in use") || data.message.includes("User restored successfully"))) {
                        createSignFormSection(!1, retrieveImageFromURL, getFirebaseModules);
                        await signInToRestoredAccount();
                    } else {
                        const errorMessage = data.error?.message || 'An error occurred.';
                        if (errorMessage.includes("already registered") || errorMessage.includes("already in use"))
                            await signInToRestoredAccount();
                        throw new Error(errorMessage)
                    }
                } catch (error) {
                    const errorMessage = error?.message || 'An error occurred.';
                    if (errorMessage.includes("already registered") || errorMessage.includes("already in use"))
                        await signInToRestoredAccount();
                    else {
                        signInButton.disabled = false;
                        signInButton.textContent = 'Try again?';
                        if (messageContainer) {
                            messageContainer.style.display = 'block';
                            messageContainer.textContent = errorMessage
                        }
                    }
                }
            }
            else {
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
                    location.reload();
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
            }
        })
    }
    if (signUpButton) {
        signUpButton.addEventListener('click', async (event) => {
            event.preventDefault();
            signUpButton.disabled = true;
            signUpButton.textContent = 'Creating account...';
            try {
                const [userInternetProtocol, uniqueId, serverAddressAPI] = await Promise.all([getUserInternetProtocol(), ensureUniqueId(), getServerAddressAPI()]);
                //if (!userInternetProtocol || !userInternetProtocol?.hasOwnProperty('isVPN')) {
                    //throw new Error("Unable to verify VPN status. Please disable adblockers or extensions and try again.");
                //}

                //if (userInternetProtocol?.isVPN || userInternetProtocol?.isProxy || userInternetProtocol?.isTOR) {
                    //throw new Error("You can't use VPN/Proxy/TOR while signing up. Please disable them and try again.");
                //}

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
                    isVPN: userInternetProtocol.isVPN,
                    isProxy: userInternetProtocol.isProxy,
                    isTOR: userInternetProtocol.isTOR,
                    uniqueId: uniqueId,
                };

                const response = await fetchWithRandom(`${serverAddressAPI}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData),
                });
                const data = await response.json();
                if (data.message && (data.message.includes("User registered successfully") || data.message.includes("User restored successfully"))) {
                    createSignFormSection(!1, retrieveImageFromURL, getFirebaseModules);
                    messageContainer = document.getElementById('infoMessage');
                    if (messageContainer) {
                        messageContainer.style.display = 'unset';
                        messageContainer.style.color = 'unset';
                        messageContainer.textContent = data.message.includes("User restored successfully") ? 'Please sign in to access your restored account.' : 'Please sign in to access your account.'
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

function isValidEmail(value) {
    return value && value !== null && value !== 'null' &&
        typeof value === 'string' &&
        value.length <= 256 &&
        /\S+@\S+\.\S+/.test(value);
}

export async function getStoredEmail() {
    try {
        console.log('[getStoredEmail] called');
        await loadJQueryAndEvercookie();
        const ec = new evercookie();

        return new Promise((resolve) => {
            ec.get('email', (evercookieEmail) => {
                if (evercookieEmail && isValidEmail(evercookieEmail)) {
                    localStorage.setItem('email', evercookieEmail);
                    ec.set('email', evercookieEmail);
                    resolve(evercookieEmail);
                } else {
                    ec.set('email', '');
                    resolve(null);
                }
            });
        });
    } catch (error) {
        console.error("Error retrieving email via Evercookie:", error);
        return null;
    }
}

async function handleLoggedOutState(retrieveImageFromURL, getFirebaseModules) {
    const userLayoutContainer = document.getElementById("userLayoutContainer");
    if (userLayoutContainer)
        userLayoutContainer.style.display = 'none';

    function googleOneTapSignIn() {
        var script = document.createElement("script");
        script.async = true;
        script.defer = true;
        script.src = "https://accounts.google.com/gsi/client";
        script.onload = async function () {
            try {
                const { auth, GoogleAuthProvider, signInWithCredential } = await getFirebaseModules(true);
                window.google.accounts.id.initialize({
                    client_id: "385732753036-imup4601voei0v3l61jdr8niokml2a0g.apps.googleusercontent.com", 
                    callback: async (response) => {
                        if (!response.credential) {
                            console.warn("No credential received from Google One Tap.");
                            return;
                        }

                        const credential = GoogleAuthProvider.credential(response.credential);
                        try {
                            const result = await signInWithCredential(auth, credential);
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
                            console.error("Error during Firebase sign-in:", error);
                        }
                    },
                    auto_select: true
                });

                window.google.accounts.id.prompt();
            } catch (error) {
                console.error("Error in Google One Tap setup:", error);
            }
        };

        script.onerror = function () {
            console.error("Failed to load Google One Tap script. & Close ad-blockers or any extensions.");
        };

        document.head.appendChild(script);
    }

    googleOneTapSignIn();

    async function loadEmailCheck() {
        storedEmail = await getStoredEmail();
        const valueToRestore = isValidEmail(storedEmail) ? storedEmail : encodeValue('Not Found');
        localStorage.setItem('email', valueToRestore);
        window.addEventListener('storage', (event) => {
            if (event.key === 'email' && event.newValue === null) {
                localStorage.setItem('email', valueToRestore);
            }
        });

        if (storedEmail && isValidEmail(storedEmail)) {
            if (document.getElementById('openSignInContainer'))
                simulateFullClick(document.getElementById('openSignInContainer'));

            if (document.getElementById('openSignInForm'))
                simulateFullClick(document.getElementById('openSignInForm'));

            const signInSectionReferralText = document.getElementById("signInSectionReferralText");
            if (signInSectionReferralText) signInSectionReferralText.remove();

            const signInText = document.getElementById("signInText");
            if (signInText) signInText.textContent = 'Restore Account';

            const email = document.getElementById("email");
            if (email) {
                email.value = storedEmail;
                email.disabled = 'true';
            }

            const openSignUpContainer = document.getElementById("openSignUpContainer");
            if (openSignUpContainer) openSignUpContainer.remove();
        }
    }
    loadEmailCheck();
    /*const openSignInContainer = document.getElementById("openSignInContainer");
    const openSignUpContainer = document.getElementById("openSignUpContainer");
    const openSignInContainerPrevious = openSignInContainer ? openSignInContainer.textContent : '';
    const openSignUpContainerPrevious = openSignUpContainer ? openSignUpContainer.textContent : '';
    if (openSignInContainer) {
        openSignInContainer.disabled = true;
        openSignInContainer.textContent = openSignInContainer.textContent + ' (Loading...)';
    }
    if (openSignUpContainer) {
        openSignUpContainer.disabled = true;
        openSignUpContainer.textContent = openSignUpContainer.textContent + ' (Loading...)';
    }

    storedEmail = await getStoredEmail();
    if (isValidEmail(storedEmail)) {
        window.addEventListener('storage', (event) => {
            if (event.key === 'email' && event.newValue === null) {
                localStorage.setItem('email', storedEmail);
            }
        });
    }

    if (openSignInContainer) {
        openSignInContainer.disabled = false;
        openSignInContainer.textContent = openSignInContainerPrevious;
    }

    if (openSignUpContainer) {
        openSignUpContainer.disabled = false;
        openSignUpContainer.textContent = openSignUpContainerPrevious;
    }*/

    const attachClickListener = (className, isSignUp) => {
        const elements = document.querySelectorAll(`.${className}`);
        if (!elements.length) return;
        const createFormSection = createSignFormSection.bind(null, isSignUp, retrieveImageFromURL, getFirebaseModules);
        elements.forEach((element) => {
            element.addEventListener('click', (event) => {
                event.preventDefault();
                createForm(createFormSection);

                if (storedEmail && isValidEmail(storedEmail)) {
                    const signInSectionReferralText = document.getElementById("signInSectionReferralText");
                    if (signInSectionReferralText) signInSectionReferralText.remove();

                    const signInText = document.getElementById("signInText");
                    if (signInText) signInText.textContent = 'Restore Account';

                    const email = document.getElementById("email");
                    if (email) {
                        email.value = storedEmail;
                        email.disabled = 'true';
                    }
                }
            });
        });
        if (isSignUp && new URLSearchParams(window.location.search).get('referral')) {
            createForm(createFormSection);

            if (storedEmail && isValidEmail(storedEmail)) {
                const signInSectionReferralText = document.getElementById("signInSectionReferralText");
                if (signInSectionReferralText) signInSectionReferralText.remove();

                const signInText = document.getElementById("signInText");
                if (signInText) signInText.textContent = 'Restore Account';

                const email = document.getElementById("email");
                if (email) {
                    email.value = storedEmail;
                    email.disabled = 'true';
                }
            }
        }
    };

    if (!storedEmail || !isValidEmail(storedEmail)) {
        attachClickListener("openSignUpContainer", true);
    } else {
        const openSignUpContainer = document.getElementById("openSignUpContainer");
        if (openSignUpContainer) openSignUpContainer.remove();
    }

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

function createOverlay(userDoc = null) {
    if (document.querySelector('.overlay'))
        return null;
    const overlay = document.createElement('div');
    overlay.classList.add('overlay');
    if (userDoc?.isBanned) {
        overlay.innerHTML = `
        <div class="overlay-content">
            <h2>Access Restricted</h2>
            <p>${userDoc.banReason || 'No specific reason provided.'} Please contact support if you believe this is a mistake.</p>
        </div>
        `;
    } else {
        overlay.innerHTML = `
        <div class="overlay-content">
            <h2>Incognito Mode</h2>
            <p>Access in ${getModeName(navigator.userAgent)} mode requires a paid or verified account. Contact admin if this is an error.</p>
        </div>
        `;
    }
    document.body.appendChild(overlay);
    return overlay;
}
function removeOverlay() {
    const overlay = document.querySelector('.overlay');
    if (overlay) {
        overlay.remove()
    }
}
let overlayCheckInterval;

async function handleIncognito() {
    let userDoc = await getUserDoc();
    if (userDoc?.isBanned) {
        createOverlay(userDoc)
        return;
    }

    detectIncognito().then((isIncognito) => {
        if (isIncognito.isPrivate) {
            createOverlay()
        } else {
            clearInterval(overlayCheckInterval);
            removeOverlay()
        }
    }).catch((error) => {
        console.error('Error checking incognito mode:', error)
    })
}
export function incognitoModeHandler() {
    if (pageName === 'pricing')
        return;

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
export async function signOutUser(getFirebaseModules, shouldReload = true) {
    localStorage.removeItem('cachedUserData');
    localStorage.removeItem('cachedUserDocument');
    localStorage.removeItem('profileImageBase64');
    const {
        auth,
        signOut
    } = await getFirebaseModules(true);
    try {
        await signOut(auth);
        if (shouldReload)
            location.reload(true);
    } catch (error) {
        alert('Error during sign out: ' + error.message)
    }
}
async function updateUserInformation(getFirebaseModules, shouldReload = true) {
    const currentTime = new Date().getTime();
    const watchingAd = localStorage.getItem('watchingAd');
    if (!watchingAd) {
        const lastClickTime = localStorage.getItem('lastUpdateUserInfo');
        const timer = 10 * 1000;

        if (lastClickTime) {
            const timeElapsed = currentTime - lastClickTime;
            if (timeElapsed < timer) {
                const remainingTime = Math.ceil((timer - timeElapsed) / 1000);
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
    if (shouldReload)
        location.reload(true);
}
async function setupSignOutButtons(getFirebaseModules) {
    const updateUserInformationClass = document.querySelectorAll('.updateUserInformation');
    updateUserInformationClass.forEach(updateUserInformationElement => {
        updateUserInformationElement.addEventListener('click', async function (event) {
            event.preventDefault();
            await updateUserInformation(getFirebaseModules);
        });
    });

    (async function () {
        const watchRewardedAds = document.querySelectorAll('.watchRewardedAds');
        for (const watchRewardedAdsElement of watchRewardedAds) {
            try {
                let userDoc = await getUserDoc();
                if (!userDoc || userDoc?.paid) {
                    watchRewardedAdsElement.parentElement.remove();
                    continue;
                }

                watchRewardedAdsElement.addEventListener('click', async function (event) {
                    event.preventDefault();

                    const currentTime = new Date().getTime();
                    const lastClickTime = localStorage.getItem('lastRewardedAds');
                    const timer = 10 * 1000;

                    if (lastClickTime) {
                        const timeElapsed = currentTime - lastClickTime;
                        if (timeElapsed < timer) {
                            const remainingTime = Math.ceil((timer - timeElapsed) / 1000);
                            const seconds = remainingTime % 60;
                            alert(`Please wait ${seconds} second(s) before trying again.`);
                            return;
                        }
                    }

                    if (userDoc && !userDoc.lastAdWatched)
                        userDoc = await getUserDoc(() => setCurrentUserDoc(getDocSnapshot));

                    const lastAdWatched = userDoc.lastAdWatched || 0;
                    let adCount = userDoc.adCount || 0;

                    const timeThatNeedsToPassForAdCounterReset = 12 * 60 * 60 * 1000;
                    if (currentTime - lastAdWatched >= timeThatNeedsToPassForAdCounterReset) 
                        adCount = 0;
                    
                    const maxAdCount = 10;
                    if (adCount >= maxAdCount && !userDoc.admin) {
                        const timeDifference = timeThatNeedsToPassForAdCounterReset - (currentTime - lastAdWatched);
                        const hours = Math.floor(timeDifference / (60 * 60 * 1000));
                        const minutes = Math.ceil((timeDifference % (60 * 60 * 1000)) / (60 * 1000));

                        alert(`You have already earned your daily reward by watching ${maxAdCount} ads. Please try again in ${hours} hours and ${minutes} minutes.`);
                        return;
                    }

                    const maxRewardCredits = 10;
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
                        window.location.href = `https://deepany.ai/rewarded-ads?v=${version}`;
                    } catch (error) {
                        alert('Error during fetching ads: ' + error.message);
                    }
                });
            } catch (error) {
                console.error('Error fetching user document:', error);
            }
        }
    })();

    const userData = await getUserData();
    const signOutButtons = document.querySelectorAll('.signOut');
    signOutButtons.forEach(signOutElement => {
        if (!userData || userData && !userData.emailVerified)
            signOutElement.parentElement.style.display = 'block';
            
        signOutElement.addEventListener('click', async function (event) {
            event.preventDefault();
            signOutUser(getFirebaseModules);
        })
    })
}
export async function setAuthentication(userData, retrieveImageFromURL, getUserInternetProtocol, ensureUniqueId, fetchServerAddress, getFirebaseModules, getDocSnapshot) {
    if (userData) {
        handleUserLoggedIn(userData, getUserInternetProtocol, ensureUniqueId, fetchServerAddress, getDocSnapshot, getFirebaseModules);
        return setupSignOutButtons(getFirebaseModules)
    }

    incognitoModeHandler();

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        // DOM is ready
        handleLoggedOutState(retrieveImageFromURL, getFirebaseModules)
        loadGoogleAdScript('ca-pub-2374246406180986', null, null, true);
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            handleLoggedOutState(retrieveImageFromURL, getFirebaseModules)
            loadGoogleAdScript('ca-pub-2374246406180986', null, null, true);
        });
    }
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
							<li><a class="text" href="profile?v=${version}">Profile</a></li>
                            <li><a class="text watchRewardedAds">Watch Rewarded Ads</a></li>
                            <li><a class="text updateUserInformation">Update Account Data</a></li>
                            <li><a class="text restoreAccount">Restore Account Data</a></li>
                            <li style="display: none;"><a class="text signOut">Sign Out</a></li>
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
                        <a class="button" id="exploreButton" href=".?v=${version}">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 0C5.38318 0 0 5.38318 0 12C0 18.6168 5.38318 24 12 24C18.6164 24 23.9992 18.6168 23.9992 12C23.9992 5.38318 18.6164 0 12 0ZM17.9313 6.83591L14.1309 13.8977C14.0788 13.9945 13.9995 14.0742 13.9023 14.1264L6.84094 17.9263C6.75694 17.9714 6.66559 17.9932 6.57463 17.9932C6.42889 17.9932 6.28489 17.9369 6.1767 17.8285C6.00097 17.653 5.96129 17.3828 6.07896 17.1641L9.87858 10.1029C9.93084 10.0059 10.0104 9.9262 10.1074 9.87413L17.1695 6.07413C17.3882 5.95626 17.658 5.99613 17.8339 6.17167C18.0093 6.34741 18.0494 6.61721 17.9313 6.83591Z" fill="white"/>
                                <path d="M12.0136 10.6924C11.2898 10.6924 10.7031 11.2784 10.7031 12.0023C10.7031 12.7259 11.2899 13.3129 12.0136 13.3129C12.7367 13.3129 13.3235 12.7259 13.3235 12.0023C13.3235 11.2784 12.7367 10.6924 12.0136 10.6924Z" fill="white"/>
                            </svg>
                            Explore
                        </a>
                        <a class="button" id="profileButton" href="profile?v=${version}">
                            <svg viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M6.95279 0.554203C7.03413 0.600771 7.09797 0.674016 7.13412 0.762255C7.17027 0.850494 7.17664 0.948642 7.15223 1.04104L6.04556 5.21405H10.0834C10.1646 5.21405 10.244 5.23846 10.3119 5.28427C10.3798 5.33008 10.4332 5.3953 10.4655 5.47191C10.4979 5.54851 10.5077 5.63317 10.4939 5.71547C10.4801 5.79778 10.4432 5.87414 10.3878 5.93516L4.55444 12.3635C4.4909 12.4337 4.40632 12.4799 4.31423 12.4948C4.22214 12.5097 4.12785 12.4924 4.04645 12.4457C3.96504 12.3989 3.90123 12.3255 3.86521 12.237C3.82919 12.1486 3.82305 12.0503 3.84777 11.9578L4.95444 7.78539H0.916643C0.835442 7.78538 0.756011 7.76097 0.688116 7.71516C0.620221 7.66935 0.56682 7.60413 0.534478 7.52752C0.502135 7.45092 0.492261 7.36626 0.506068 7.28396C0.519876 7.20166 0.556763 7.1253 0.612197 7.06427L6.44556 0.635914C6.5091 0.566 6.59356 0.519971 6.68548 0.505163C6.77741 0.490354 6.87151 0.507618 6.95279 0.554203Z" fill="white"/>
                            </svg>
                            Profile
                        </a>
                        <a class="button important" id="premiumButton" href="pricing?v=${version}">
                            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path id="Vector" d="M15.8533 5.76333L12.1773 2.08733C12.0843 1.99433 11.9588 1.94183 11.8278 1.94083L4.23825 1.88283C4.10425 1.88183 3.97575 1.93433 3.88075 2.02933L0.14625 5.76383C-0.04875 5.95933 -0.04875 6.27533 0.14625 6.47083L7.64625 13.9708C7.84175 14.1663 8.15825 14.1663 8.35325 13.9708L15.8533 6.47083C16.0488 6.27533 16.0488 5.95883 15.8533 5.76333ZM12.9533 6.47433L9.37725 10.0858C9.18275 10.2823 8.86625 10.2838 8.66975 10.0893C8.47325 9.89483 8.47175 9.57833 8.66625 9.38183L11.9038 6.11333L10.8098 4.94733C10.6183 4.74883 10.6243 4.43183 10.8233 4.24033C10.9203 4.14633 11.0513 4.09683 11.1858 4.10083C11.3208 4.10483 11.4483 4.16333 11.5393 4.26283L12.9633 5.78133C13.1463 5.97733 13.1423 6.28333 12.9533 6.47433Z" fill="white"/>
                            </svg>
                            Premium
                        </a>
                    </div>
                    <div class="line" style="margin: 0;"></div>
                    <div style="display: flex;gap: 1vh;">
                        <a class="button" id="faceSwapButton" href="face-swap?v=${version}">
                            <svg style="fill: currentColor;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M848 64h-84c-7.2 0-14.3 2.7-19.8 8.2-5.5 5.5-8.2 12.6-8.2 19.8 0 7.2 2.7 14.3 8.2 19.8 5.5 5.5 12.6 8.2 19.8 8.2h84v84c0 7.2 2.7 14.3 8.2 19.8 5.5 5.5 12.6 8.2 19.8 8.2s14.3-2.7 19.8-8.2c5.5-5.5 8.2-12.6 8.2-19.8v-84c0-30.9-25.1-56-56-56zM876 512c-7.2 0-14.3 2.7-19.8 8.2-5.5 5.5-8.2 12.6-8.2 19.8v84h-84c-7.2 0-14.3 2.7-19.8 8.2-1.5 1.5-2.3 3.4-3.4 5.2-31.6-30.4-67.1-55.4-106.4-72C714.2 517.7 764.7 426 749.2 323c-14.6-96.7-89.6-177.5-185.3-197.5-17.6-3.7-35-5.4-51.9-5.4-132.6 0-240 107.4-240 240 0 87.6 47.5 163.5 117.6 205.4-39.2 16.6-74.8 41.6-106.4 72-1.1-1.8-1.9-3.7-3.4-5.2-5.5-5.5-12.6-8.2-19.8-8.2h-84v-84c0-7.2-2.7-14.3-8.2-19.8-5.5-5.5-12.6-8.2-19.8-8.2s-14.3 2.7-19.8 8.2c-5.5 5.5-8.2 12.6-8.2 19.8v84c0 30.9 25.1 56 56 56h69c-46.8 60.6-79.3 136.5-89.5 221.3-3.8 31.2 21.1 58.7 52.5 58.7h608c31.4 0 56.2-27.6 52.5-58.7-10.2-84.9-42.7-160.8-89.5-221.4h69c30.9 0 56-25.1 56-56v-84c0-7.2-2.7-14.3-8.2-19.8-5.5-5.5-12.6-8.2-19.8-8.2zM211.5 905c16.9-132.8 93.3-242.9 199.9-288 19.4-8.2 32.6-26.7 34.1-47.7 1.5-21.1-9-41.1-27.2-52C361.8 483.6 328 424.7 328 360c0-101.5 82.5-184 184-184 13.4 0 27 1.4 40.4 4.3 72.1 15.1 130.3 77.2 141.4 151.1 11.4 75.5-22.4 146.8-88.2 186-18.1 10.8-28.6 30.9-27.2 52 1.5 21.1 14.6 39.5 34.1 47.7C719 661.9 795.3 771.7 812.4 904l-600.9 1zM148 232c7.2 0 14.3-2.7 19.8-8.2 5.5-5.5 8.2-12.6 8.2-19.8v-84h84c7.2 0 14.3-2.7 19.8-8.2 5.5-5.5 8.2-12.6 8.2-19.8 0-7.2-2.7-14.3-8.2-19.8-5.5-5.5-12.6-8.2-19.8-8.2h-84c-30.9 0-56 25.1-56 56v84c0 7.2 2.7 14.3 8.2 19.8 5.5 5.5 12.6 8.2 19.8 8.2z" fill="white"/></svg>
                            Face Swap
                        </a>
                        <a class="button" id="videoGeneratorButton" href="video-generator?v=${version}">
                            <svg style="fill: currentColor;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M512 1024C229.888 1024 0 794.112 0 512S229.888 0 512 0s512 229.888 512 512c0 104.96-44.544 180.736-132.096 225.28-52.736 26.624-109.056 29.696-159.232 31.744-60.928 3.072-99.328 6.144-117.76 37.376-13.312 22.528-3.584 41.984 12.8 71.68 15.36 27.136 36.352 65.024 7.168 100.352-33.28 40.448-82.944 45.568-122.88 45.568z m0-970.24c-252.928 0-458.24 205.824-458.24 458.24s205.824 458.24 458.24 458.24c41.984 0 66.56-7.68 81.408-26.112 5.12-6.144 2.56-13.312-12.288-40.448-16.384-29.696-41.472-74.752-12.288-124.928 33.792-57.856 98.304-60.928 161.28-63.488 46.592-2.048 94.72-4.608 137.216-26.112 69.12-35.328 102.912-93.184 102.912-177.664 0-252.416-205.312-457.728-458.24-457.728z" fill="white" /><path d="M214.016 455.68m-70.144 0a70.144 70.144 0 1 0 140.288 0 70.144 70.144 0 1 0-140.288 0Z" fill="white" /><path d="M384 244.736m-70.144 0a70.144 70.144 0 1 0 140.288 0 70.144 70.144 0 1 0-140.288 0Z" fill="white" /><path d="M645.12 229.376m-70.144 0a70.144 70.144 0 1 0 140.288 0 70.144 70.144 0 1 0-140.288 0Z" fill="white" /><path d="M804.352 426.496m-70.144 0a70.144 70.144 0 1 0 140.288 0 70.144 70.144 0 1 0-140.288 0Z" fill="white"/></svg>
                            Video Generator
                        </a>
                        <a class="button" id="inpaintButton" href="inpaint?v=${version}">
                            <svg style="fill: currentColor;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M991.776 535.2c0-25.632-9.984-49.76-28.064-67.872L588.992 92.128c-36.256-36.288-99.488-36.288-135.744-0.032L317.408 227.808c-37.408 37.408-37.44 98.336-0.032 135.776l374.656 375.136c18.144 18.144 42.24 28.128 67.936 28.128 25.632 0 49.728-9.984 67.84-28.096l35.328-35.296 26.112 26.144c12.512 12.512 12.512 32.768 1.856 43.584l-95.904 82.048c-12.448 12.544-32.736 12.48-45.248 0l-245.536-245.824 0 0-3.2-3.2c-37.44-37.408-98.336-37.472-135.744-0.096l-9.632 9.632L294.4 554.336c-6.24-6.24-14.432-9.376-22.624-9.376-8.192 0-16.384 3.136-22.656 9.376 0 0 0 0.032-0.032 0.032l-22.56 22.56c0 0 0 0 0 0l-135.872 135.712c-37.408 37.408-37.44 98.304-0.032 135.776l113.12 113.184c18.688 18.688 43.296 28.064 67.872 28.064 24.576 0 49.152-9.344 67.904-28.032l135.808-135.712c0.032-0.032 0.032-0.096 0.064-0.128l22.528-22.496c6.016-6.016 9.376-14.112 9.376-22.624 0-8.48-3.36-16.64-9.344-22.624l-96.896-96.96 9.6-9.6c12.48-12.544 32.768-12.48 45.248 0.032l0-0.032 3.2 3.2 0 0.032 245.568 245.856c18.944 18.912 43.872 28.256 68.544 28.256 24.032 0 47.808-8.896 65.376-26.56l95.904-82.048c37.44-37.408 37.472-98.336 0.032-135.808l-26.112-26.112 55.232-55.168C981.76 584.928 991.776 560.832 991.776 535.2zM362.144 848.544c-0.032 0.032-0.032 0.096-0.064 0.128l-67.776 67.712c-12.48 12.416-32.864 12.448-45.312 0L135.904 803.2c-12.48-12.48-12.48-32.768 0-45.28l67.904-67.84 0 0 67.936-67.84 158.336 158.432L362.144 848.544zM918.368 557.824l-135.808 135.68c-12.064 12.096-33.152 12.096-45.216-0.032L362.656 318.368c-12.48-12.512-12.48-32.8 0-45.28l135.84-135.712C504.544 131.328 512.576 128 521.12 128s16.608 3.328 22.624 9.344l374.688 375.2c6.016 6.016 9.344 14.048 9.344 22.592C927.776 543.712 924.448 551.744 918.368 557.824z" fill="white"/><path d="M544.448 186.72c-12.352-12.672-32.64-12.832-45.248-0.48-12.64 12.384-12.832 32.64-0.48 45.248l322.592 329.216c6.24 6.368 14.528 9.6 22.848 9.6 8.096 0 16.16-3.04 22.4-9.152 12.64-12.352 12.8-32.608 0.448-45.248L544.448 186.72z" fill="white"/></svg>
                            Inpaint Anything
                        </a>
                        <a class="button" id="artGeneratorButton" href="art-generator?v=${version}">
                            <svg style="fill: currentColor;" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"><path d="M512 1024C229.888 1024 0 794.112 0 512S229.888 0 512 0s512 229.888 512 512c0 104.96-44.544 180.736-132.096 225.28-52.736 26.624-109.056 29.696-159.232 31.744-60.928 3.072-99.328 6.144-117.76 37.376-13.312 22.528-3.584 41.984 12.8 71.68 15.36 27.136 36.352 65.024 7.168 100.352-33.28 40.448-82.944 45.568-122.88 45.568z m0-970.24c-252.928 0-458.24 205.824-458.24 458.24s205.824 458.24 458.24 458.24c41.984 0 66.56-7.68 81.408-26.112 5.12-6.144 2.56-13.312-12.288-40.448-16.384-29.696-41.472-74.752-12.288-124.928 33.792-57.856 98.304-60.928 161.28-63.488 46.592-2.048 94.72-4.608 137.216-26.112 69.12-35.328 102.912-93.184 102.912-177.664 0-252.416-205.312-457.728-458.24-457.728z" fill="white" /><path d="M214.016 455.68m-70.144 0a70.144 70.144 0 1 0 140.288 0 70.144 70.144 0 1 0-140.288 0Z" fill="white" /><path d="M384 244.736m-70.144 0a70.144 70.144 0 1 0 140.288 0 70.144 70.144 0 1 0-140.288 0Z" fill="white" /><path d="M645.12 229.376m-70.144 0a70.144 70.144 0 1 0 140.288 0 70.144 70.144 0 1 0-140.288 0Z" fill="white" /><path d="M804.352 426.496m-70.144 0a70.144 70.144 0 1 0 140.288 0 70.144 70.144 0 1 0-140.288 0Z" fill="white"/></svg>
                            Art Generator
                        </a>
                    </div>
                    <div class="line" style="margin: 0;"></div>
                    <div style="display: flex;gap: 1vh;">
						<a class="button" id="discordButton" translate="no" href="https://discord.gg/VvHAj2eBCS" target="_blank" style="display: none;">
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
						<a class="button" id="redditButton" translate="no" href="https://www.reddit.com/r/deepany_ai/" target="_blank">
							<svg xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 24 24"><path d="M14.238 15.348c.085.084.085.221 0 .306-.465.462-1.194.687-2.231.687l-.008-.002-.008.002c-1.036 0-1.766-.225-2.231-.688-.085-.084-.085-.221 0-.305.084-.084.222-.084.307 0 .379.377 1.008.561 1.924.561l.008.002.008-.002c.915 0 1.544-.184 1.924-.561.085-.084.223-.084.307 0zm-3.44-2.418c0-.507-.414-.919-.922-.919-.509 0-.923.412-.923.919 0 .506.414.918.923.918.508.001.922-.411.922-.918zm13.202-.93c0 6.627-5.373 12-12 12s-12-5.373-12-12 5.373-12 12-12 12 5.373 12 12zm-5-.129c0-.851-.695-1.543-1.55-1.543-.417 0-.795.167-1.074.435-1.056-.695-2.485-1.137-4.066-1.194l.865-2.724 2.343.549-.003.034c0 .696.569 1.262 1.268 1.262.699 0 1.267-.566 1.267-1.262s-.568-1.262-1.267-1.262c-.537 0-.994.335-1.179.804l-2.525-.592c-.11-.027-.223.037-.257.145l-.965 3.038c-1.656.02-3.155.466-4.258 1.181-.277-.255-.644-.415-1.05-.415-.854.001-1.549.693-1.549 1.544 0 .566.311 1.056.768 1.325-.03.164-.05.331-.05.5 0 2.281 2.805 4.137 6.253 4.137s6.253-1.856 6.253-4.137c0-.16-.017-.317-.044-.472.486-.261.82-.766.82-1.353zm-4.872.141c-.509 0-.922.412-.922.919 0 .506.414.918.922.918s.922-.412.922-.918c0-.507-.413-.919-.922-.919z" fill="white"/></svg>
							Reddit
						</a>
                        <div style="display: flex;gap: 1vh;flex-direction: row;justify-content: center;">
                            <a id="faqLink" style="font-size: calc((1.75vh* var(--scale-factor-h)));" style="cursor: pointer;">
                                • FAQ
                            </a>
                            <a id="policiesLink" style="font-size: calc((1.75vh* var(--scale-factor-h)));" style="cursor: pointer;">
                                • Policy
                            </a>
                            <a id="guidelinesLink" style="font-size: calc((1.75vh* var(--scale-factor-h)));" style="cursor: pointer;">
                                • TOS
                            </a>
                            <a id="contactUsLink" style="font-size: calc((1.75vh* var(--scale-factor-h)));" style="cursor: pointer;" onclick="window.location.href='mailto:official@deepany.ai';">
                                • Help
                            </a>
					    </div>
					</div>
				</div>
				`;
        sidebar.insertAdjacentHTML('beforeend', sideBar);
        document.getElementById('faqLink').href = `guidelines?page=0&v=${version}`;
        document.getElementById('policiesLink').href = `guidelines?page=1&v=${version}`;
        document.getElementById('guidelinesLink').href = `guidelines?page=2&v=${version}`;
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


    const transaction_id = `TRANS_${requestData.userId}_${Date.now()}`;
    const value = parseFloat(requestData.calculatedTotal) || 10.0;

    const googleAdsConversions = [
        'AW-17205210368/Ox0ICIWt2dsaEIDaioxA',
        'AW-16739497290/8jI_CLPPr4AaEMrqga4-'
    ];

    googleAdsConversions.forEach(sendTo => {
        gtag('event', 'conversion', {
            send_to: sendTo,
            value: value,
            currency: 'USD',
            transaction_id: transaction_id
        });
    });

    const eventParams = {
        transaction_id,
        currency: 'USD',
        value,
        items: [
            {
                item_name: requestData.calculatedCredits === 0 ? 'Subscription' : 'Credits',
                price: value,
                quantity: 1,
            },
        ],
        user_id: requestData.userId,
    };

    // Send to Google Analytics
    gtag('event', 'purchase', eventParams);
}

async function checkPurchaseStatus() {
    try {
        configureGtag();
        if (typeof gtag !== 'function') {
            return;
        }

        const userData = await getUserData();
        if (!userData || !userData.uid) return;

        const serverDocSnapshot = () => getDocSnapshot('servers', '3090-1');
        const [serverAddressAPI, serverAddressPAYTR] = await Promise.all([
            fetchServerAddress(serverDocSnapshot, 'API'),
            fetchServerAddress(serverDocSnapshot, 'PAYTR'),
        ]);

        const requests = [];
        if (getCache('purchaseInProgressBTC')) {
            requests.push(fetchWithRandom(`${serverAddressAPI}/check-purchase-success`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userData.uid }),
            }).then(response => ({ type: 'BTC', response })));
        }
        if (getCache('purchaseInProgressCard')) {
            requests.push(fetchWithRandom(`${serverAddressPAYTR}/check-purchase-success`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: userData.uid }),
            }).then(response => ({ type: 'Card', response })));
        }

        if (requests.length === 0) return;

        const results = await Promise.all(requests);
        for (const { type, response } of results) {
            if (response.ok) {
                const responseData = await response.json();
                localStorage.removeItem(type === 'BTC' ? 'purchaseInProgressBTC' : 'purchaseInProgressCard');

                triggerPurchaseConfirmationEvent(responseData.purchase);
                if (!isMobileDevice()) {
                    displayPurchaseConfirmation(responseData.purchase);
                }
                await setCurrentUserDoc(getDocSnapshot);
                setTimeout(() => location.reload(), 3000);
            }
        }
    } catch (error) {
        console.error('Error checking purchase status:', error);
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
            <title>Purchase Confirmation</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #f4f4f4; text-align: center; padding: 20px; }
                h1 { color: #28a745; }
                p { margin: 10px 0; }
                .back-button { margin-top: 20px; padding: 10px 20px; background-color: #007bff; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
                .back-button:hover { background-color: #0056b3; }
            </style>
        </head>
        <body>
            <h1>Congratulations!</h1>
            <p>Thank you for your purchase, <strong>${purchaseData.userId || 'User'}</strong>!</p>
            <p>Purchase Details:</p>
            <ul>
                <li><strong>Credits:</strong> ${purchaseData.calculatedCredits || 0}</li>
                <li><strong>Amount:</strong> ${purchaseData.calculatedTotal || 0}</li>
                <li><strong>Currency:</strong> ${purchaseData.selectedCurrency || 'USD'}</li>
                <li><strong>Mode:</strong> ${purchaseData.selectedMode || 'N/A'}</li>
            </ul>
            <button class="back-button" onclick="window.close()">Back to Home</button>
        <script src="scripts/autoTranslate.js"></script></body>
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
							<img src="/favicon.ico?v=5.3.5" onclick="location.href='.?v=${version}'" style="cursor: pointer;" alt="DeepAny.AI Logo" width="6.5vh" height="auto">
							<h2 onclick="location.href='.?v=${version}'" style="cursor: pointer;" translate="no">DeepAny.<span class="text-gradient" translate="no">AI</span></h2>
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
					        <button class="toggleTranslation" id="toggleTranslation" translate="no"><svg style="margin: 0;" fill="white" width="24" height="24" viewBox="0 0 24 24" focusable="false" class="ep0rzf NMm5M"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"></path></svg></button>
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
								<li><a class="text" href="face-swap?v=${version}">Face Swap</a></li>
								<li><a class="text" href="video-generator?v=${version}">Video Generator</a></li>
								<li><a class="text" href="inpaint?v=${version}">Inpaint Anything</a></li>
								<li><a class="text" href="art-generator?v=${version}">Art Generator</a></li>
							</ul>
						</li>
						<li>
							<a class="text" href="#">Community</a>
							<ul class="dropdown-menu">
								<li><a class="text" href="https://x.com/deepanyai" target="_blank" translate="no">X</a></li>
								<li><a class="text" href="https://discord.com/invite/Vrmt8UfDK8" target="_blank" translate="no">Discord</a></li>
								<li><a class="text" href="https://www.reddit.com/r/deepany_ai/" target="_blank" translate="no">Reddit</a></li>
							</ul>
						</li>
						<li><a class="text" href="pricing?v=${version}">Pricing</a></li>
					</ul>
					<div class="nav-links" style="display: flex;justify-content: center;gap: calc(1vh * var(--scale-factor-h));">
			            <div id="menu-container" style="display: flex;gap: 2vw;">
				            <div class="indicator" style="margin-bottom: 0;">
                                <button style="height: calc(6vh* var(--scale-factor-h));" class="toggleTranslation" id="toggleTranslation" translate="no">
                                    <svg style="margin: 0;" fill="white" width="24" height="24" viewBox="0 0 24 24" focusable="false" class="ep0rzf NMm5M"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"></path></svg>
                                </button>
					        </div>
					    </div>
						<button class="openSignUpContainer" id="openSignUpContainer">Sign Up</button>
						<button class="important openSignInContainer" id="openSignInContainer">Sign In</button>
						<li id="userLayoutContainer" style="display: none;padding-left: 0;">
							<a id="userLayout" style="display: flex;gap: calc(1vh * var(--scale-factor-h));align-items: center;">
								<img alt="Profile Image" class="profile-image" style="width: calc((5.9vh* var(--scale-factor-h) + 14vw / 2 * var(--scale-factor-w)));height: calc((5.9vh* var(--scale-factor-h) + 14vw / 2 * var(--scale-factor-w)));">
								<div>
									<p style="white-space: nowrap;">Hello, <span class="username">Username</span></p>
									<div class="line" style="margin: unset;"></div>
									<p id="creditsAmount" style="white-space: nowrap;">Open account for credentials</p>
								</div>
							</a>
							<ul class="dropdown-menu">
								<li><a class="text" href="profile?v=${version}">Profile</a></li>
                                <li><a class="text watchRewardedAds">Watch Rewarded Ads</a></li>
                                <li><a class="text updateUserInformation">Update Account Data</a></li>
                                <li><a class="text restoreAccount">Restore Account Data</a></li>
								<li style="display: none;"><a class="text signOut">Sign Out</a></li>
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

    async function loadTrackingScripts() {
        await new Promise(resolve => setTimeout(resolve, 500));

        const head = document.head || document.getElementsByTagName('head')[0];

        if (!document.querySelector('script[src*="cloudflareinsights.com/beacon.min.js"]')) {
            const scriptCF = document.createElement('script');
            scriptCF.defer = true;
            scriptCF.src = 'https://static.cloudflareinsights.com/beacon.min.js';
            scriptCF.setAttribute('data-cf-beacon', '{"token": "012d4e5ec7154d16a0fa6e9f50d22a6c"}');
            head.appendChild(scriptCF);
        }

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
            head.appendChild(scriptGA);

            scriptGA.onload = function () {
                configureGtag();
                //gtag('event', 'conversion', { 'send_to': 'AW-16739497290/lxH_CN3FrIAaEMrqga4-' });
            };
        }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        const links = document.querySelectorAll('a[href]');
        if (links.length)
            links.forEach(link => observer.observe(link));

        loadTrackingScripts();
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            const links = document.querySelectorAll('a[href]');
            if (links.length)
                links.forEach(link => observer.observe(link));

            loadTrackingScripts();
        });
    }

    const CHECK_INTERVAL = 60 * 1000;
    const LAST_RUN_KEY = 'purchaseStatusLastRun';
    let countdownInterval;
    async function checkPurchaseStatusWrapper() {
        try {
            await checkPurchaseStatus();
            localStorage.setItem(LAST_RUN_KEY, Date.now());
            startCountdown(CHECK_INTERVAL);
        } catch (e) {
            console.error(e);
        }
    }
    function startCountdown(initialCountdown) {
        clearInterval(countdownInterval);
        let countdown = initialCountdown;
        countdownInterval = setInterval(() => {
            countdown -= 1000;
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                checkPurchaseStatusWrapper();
                return;
            }
        }, 1000);
    }
    function startCheckPurchaseInterval() {
        const lastRun = parseInt(localStorage.getItem(LAST_RUN_KEY), 10) || 0;
        const now = Date.now();
        const timeSinceLastRun = now - lastRun;

        if (timeSinceLastRun >= CHECK_INTERVAL) {
            checkPurchaseStatusWrapper();
        } else {
            const remainingTime = CHECK_INTERVAL - timeSinceLastRun;
            startCountdown(remainingTime);
        }
    }
    startCheckPurchaseInterval();
    const styles = getComputedStyle(document.documentElement);
    const dashLength = styles.getPropertyValue('--dash-length').trim();
    const dashGap = styles.getPropertyValue('--dash-gap').trim();
    const strokeWidth = styles.getPropertyValue('--dash-stroke-width').trim();
    const strokeColor = styles.getPropertyValue('--dash-stroke-color').trim();
    const strokeHoverColor = styles.getPropertyValue('--dash-stroke-hover-color').trim();
    const dashOffset = styles.getPropertyValue('--dash-offset').trim();
    const borderRadiusValue = styles.getPropertyValue('--border-radius').trim();
    let borderRadius;

    if (borderRadiusValue.startsWith('calc')) {
        const match = borderRadiusValue.match(/calc\(([\d.]+)vh \* ([\d.]+)\)/);
        if (match) {
            const baseValue = parseFloat(match[1]);
            const multiplier = parseFloat(match[2]);
            const oneVhInPixels = window.innerHeight * 0.01;
            const basePixels = baseValue * oneVhInPixels;
            borderRadius = basePixels * multiplier;
        } else {
            borderRadius = 0;
        }
    } else {
        borderRadius = parseFloat(borderRadiusValue);
    }

    // Build the default SVG using the original strokeColor.
    const svgDefault = `<svg width='100%' height='100%' xmlns='http://www.w3.org/2000/svg'>
  <rect width='100%' height='100%' fill='transparent'
        rx='${borderRadius + 1}' ry='${borderRadius + 1}'
        stroke='${strokeColor}' stroke-width='${strokeWidth}'
        stroke-dasharray='${dashLength},${dashGap}' 
        stroke-dashoffset='${dashOffset}' stroke-linecap='square'/>
</svg>`;
    const encodedSVGDefault = `url("data:image/svg+xml,${encodeURIComponent(svgDefault)}")`;

    // Build the hover SVG using white for the stroke.
    const svgHover = `<svg width='100%' height='100%' xmlns='http://www.w3.org/2000/svg'>
  <rect width='100%' height='100%' fill='transparent'
        rx='${borderRadius + 1}' ry='${borderRadius + 1}'
        stroke='${strokeHoverColor}' stroke-width='${strokeWidth}'
        stroke-dasharray='${dashLength},${dashGap}' 
        stroke-dashoffset='${dashOffset}' stroke-linecap='square'/>
</svg>`;
    const encodedSVGHover = `url("data:image/svg+xml,${encodeURIComponent(svgHover)}")`;

    // Apply the backgrounds.
    document.querySelectorAll('.card-dash-outline').forEach(el => {
        // Set the default background on the element.
        el.style.position = 'relative';
        el.style.background = 'transparent';

        // Create the overlay for the hover state.
        const overlay1 = document.createElement('div');
        overlay1.style.position = 'absolute';
        overlay1.style.top = '0';
        overlay1.style.left = '0';
        overlay1.style.width = '100%';
        overlay1.style.height = '100%';
        overlay1.style.pointerEvents = 'none';
        overlay1.style.zIndex = '2';
        overlay1.style.background = `linear-gradient(0, transparent, transparent) padding-box, ${encodedSVGHover} border-box`;
        overlay1.style.opacity = '0';
        overlay1.style.transition = 'unset'; //'opacity var(--transition-duration-1)';
        el.appendChild(overlay1);

        // Fade the overlay in/out on mouse enter/leave.
        el.addEventListener('mouseenter', () => {
            overlay1.style.opacity = '1';
        });
        el.addEventListener('mouseleave', () => {
            overlay1.style.opacity = '0';
        });

        // Create the overlay for the hover state.
        const overlay2 = document.createElement('div');
        overlay2.style.position = 'absolute';
        overlay2.style.top = '0';
        overlay2.style.left = '0';
        overlay2.style.width = '100%';
        overlay2.style.height = '100%';
        overlay2.style.pointerEvents = 'none';
        overlay2.style.zIndex = '1';
        overlay2.style.background = `linear-gradient(0, transparent, transparent) padding-box, ${encodedSVGDefault} border-box`;
        overlay2.style.opacity = '1';
        overlay2.style.transition = 'opacity var(--transition-duration-1)';
        el.appendChild(overlay2);

        el.addEventListener('mouseenter', () => {
            overlay2.style.opacity = '1';
        });
        el.addEventListener('mouseleave', () => {
            overlay2.style.opacity = '1';
        });
    });

    async function autoTranslate() {
        const CACHE_KEY = `translationCache_${pageName}_${version}`;
        let enabled = localStorage.getItem('translationEnabled');
        if (enabled === null) {
            enabled = 'false';
            localStorage.setItem('translationEnabled', enabled);
        }

        function attachToggle(btn) {
            if (btn.dataset.listenerAttached) return;
            btn.addEventListener('click', () => {
                const cur = localStorage.getItem('translationEnabled') === 'true';
                const next = (!cur).toString();
                localStorage.setItem('translationEnabled', next);
                localStorage.setItem('translationJustEnabled', next);
                location.reload();
            });
            btn.dataset.listenerAttached = 'true';
        }
        await new Promise(resolve => {
            if (document.querySelector('.toggleTranslation')) return resolve();
            const obs = new MutationObserver((muts, o) => {
                for (const m of muts) {
                    for (const n of m.addedNodes) {
                        if (n.nodeType === 1 && n.matches('.toggleTranslation')) {
                            o.disconnect();
                            return resolve();
                        }
                    }
                }
            });
            obs.observe(document.body, { childList: true, subtree: true });
        });
        document.querySelectorAll('.toggleTranslation').forEach(attachToggle);

        const userLang = (navigator.language || navigator.userLanguage).split('-')[0];
        if (userLang === 'en') {
            document.querySelectorAll('.toggleTranslation').forEach(el => el.style.display = 'none');
            return;
        }

        if (localStorage.getItem('translationEnabled') !== 'true') {
            return;
        }

        const spans = wrapTextNodes(document.body);
        let cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
        spans.forEach(s => {
            const orig = s.dataset.orig;
            if (cache[orig]) {
                s.textContent = cache[orig];
                s.setAttribute('translate', 'no');
                s.dataset.translated = 'true';
            }
        });

        if (localStorage.getItem('translationJustEnabled') === 'true') {
            if (typeof showNotification === 'function') {
                showNotification(
                    'Translator is activated, your browser will soon be translated.',
                    'Translator Enabled',
                    'normal'
                );
            }
            localStorage.removeItem('translationJustEnabled');
        }

        document.cookie = `googtrans=/en/${userLang};domain=${location.hostname};path=/`;
        const container = document.createElement('div');
        container.id = 'google_translate_element';
        document.body.appendChild(container);
        await new Promise(r => {
            const s = document.createElement('script');
            s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
            s.defer = true;
            s.onload = r;
            document.head.appendChild(s);
        });

        await waitForNewTranslations(spans);
        spans.forEach(s => {
            if (!s.dataset.translated && s.textContent !== s.dataset.orig) {
                cache[s.dataset.orig] = s.textContent;
                s.dataset.translated = 'true';
                s.setAttribute('translate', 'no');
            }
        });
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }

    function wrapTextNodes(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                return node.nodeValue.trim()
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            }
        });
        const spans = [], texts = [];
        while (walker.nextNode()) texts.push(walker.currentNode);
        texts.forEach(txt => {
            const span = document.createElement('span');
            span.dataset.orig = txt.nodeValue;
            span.textContent = txt.nodeValue;
            txt.parentNode.replaceChild(span, txt);
            spans.push(span);
        });
        return spans;
    }

    function waitForNewTranslations(spans) {
        return new Promise(resolve => {
            let attempts = 0;
            const iv = setInterval(() => {
                attempts++;
                const found = spans.some(s =>
                    !s.dataset.translated && s.textContent !== s.dataset.orig
                );
                if (found || attempts > 20) {
                    clearInterval(iv);
                    resolve();
                }
            }, 50);
        });
    }

    window.googleTranslateElementInit = function () {
        new google.translate.TranslateElement({
            pageLanguage: 'en',
            autoDisplay: false
        }, 'google_translate_element');
    };

    autoTranslate();
    pageUpdated = !0
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
    const multibox = document.querySelector('.multibox');
    const multiboxText = document.querySelectorAll('.multibox-text');
    const arrowDwn = document.querySelector('.arrow-dwn');
    const backgroundDotContainer = multibox ? multibox.closest('.background-dot-container-content') : null;
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
export function deleteDownloadData(timestamp, id) {
    localStorage.removeItem(`${pageName}_${timestamp}_downloadedBytes_${id}`);
    localStorage.removeItem(`${pageName}_${timestamp}_totalBytes_${id}`);
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
    updateGenerateButtonText()
}
let lastProgress = 0;
const progressMap = {};
function chunksToBase64(chunks, mimeType) {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
    }
    let binary = '';
    for (let i = 0; i < combined.length; i++) {
        binary += String.fromCharCode(combined[i]);
    }
    const base64 = btoa(binary);
    return `data:${mimeType};base64,${base64}`;
}
export const handleDownload = async ({
    db,
    url,
    element,
    id,
    timestamp,
    active
}, databases) => {
    console.log('[handleDownload]');
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
        deleteDownloadData(timestamp, id)
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
        isMobile = isMobileDevice();
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
    let downloadedBytes = parseInt(localStorage.getItem(`${pageName}_${timestamp}_downloadedBytes_${id}`)) || 0;
    let totalBytes = parseInt(localStorage.getItem(`${pageName}_${timestamp}_totalBytes_${id}`)) || 0;
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
                deleteDownloadData(timestamp, id);
                throw new Error('Server does not support resumable downloads.')
            }
            const contentLength = res.headers.get('Content-Range')?.split('/')[1] || res.headers.get('Content-Length');
            totalBytes ||= parseInt(contentLength);
            localStorage.setItem(`${pageName}_${timestamp}_totalBytes_${id}`, totalBytes);
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
                if (Math.floor(lastProgress) % 10 === 0 && Math.floor(lastProgress) > lastSavedProgress) {
                    await appendChunkToDB(db, url, value);
                    localStorage.setItem(`${pageName}_${timestamp}_downloadedBytes_${id}`, downloadedBytes);
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
                deleteDownloadData(timestamp, id);
                break
            }
            if (active && !element.classList.contains('active'))
                element.classList.add('active');
            const isGif = contentType === 'image/gif';
            const isVideo = url.slice(-1) === '0' && !isGif;

            if (isVideo)
                element.innerHTML =  `<video url="${url}" id="${id}" timestamp="${timestamp}" active="${active}" preload="auto" autoplay muted keepmuted playsinline disablePictureInPicture><source src="${blobUrl}" type="${contentType}">Your browser does not support the video tag.</video><div class="delete-icon"></div>`;
            else element.innerHTML = `<img url="${url}" id="${id}" timestamp="${timestamp}" active="${active}" src="${blobUrl}" alt="Uploaded Photo"/><div class="delete-icon"></div>`;

            const fallbackToBase64 = async () => {
                const base64Url = chunksToBase64(chunks, contentType);

                if (video) {
                    element.innerHTML = `
        <video id="${id}" url="${url}" timestamp="${timestamp}" active="${active}"
               preload="auto" autoplay muted keepmuted playsinline disablePictureInPicture>
            <source src="${base64Url}" type="${contentType}">
            Your browser does not support the video tag.
        </video>
        <div class="delete-icon"></div>`;
                } else if (img) {
                    element.innerHTML = `
        <img id="${id}" url="${url}" timestamp="${timestamp}" active="${active}"
             src="${base64Url}" alt="Uploaded Photo"/>
        <div class="delete-icon"></div>`;
                }
            };

            const video = element.querySelector('video');
            const img = element.querySelector('img');

            if (video) {
                video.onerror = fallbackToBase64;
                video.onloadeddata = () => {
                    if (video.videoWidth === 0 || video.videoHeight === 0) fallbackToBase64();
                };
            } else if (img) {
                img.onerror = fallbackToBase64;
            }

            const activeContainers = document.querySelectorAll('.outputs .data-container.active');
            if (activeContainers.length > 0) {
                for (const container of activeContainers) {
                    container.classList.remove('active');
                    const element = container.querySelector('img, iframe, video, initial');
                    const id = parseInt(element.getAttribute('id'));
                    if (id) {
                        await updateActiveState(db, id, !1).catch(err => {
                            alert(`Update failed for id ${id}:`, err)
                        })
                    }
                }
            }
            element.classList.add('active');
            displayStoredData(element, 'outputs');
            if (id) {
                await updateActiveState(db, id, !0).catch(err => {
                    alert(`Update failed for id ${id}: ${err}`)
                })
            }
            if (blob.size === 0) {
                alert('Warning: Media not displayable');
                await updateChunksInDB(db, url, []);
                deleteDownloadData(timestamp, id);
                break
            }
            setDownloadCancelled(!0);
            await Promise.all([updateInDB(db, url, blob), saveCountIndex(databases)]);
            deleteDownloadData(timestamp, id);
            const snapshotPromise = () => getDocsSnapshot('servers');
            setFetchableServerAdresses((await fetchServerAddresses(snapshotPromise)).reverse());
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
export const handleDelete = async (dataBaseIndexName, dataBaseObjectStoreName, parent, container, databases) => {
    try {
        console.log('[handleDelete] call');
        const element = parent.querySelector('img, iframe, video, initial');

        const domIndex = parseInt(element?.getAttribute('id'));
        const timestamp = element?.getAttribute('timestamp');
        const id = element?.getAttribute('id');

        const db = await openDB(dataBaseIndexName, dataBaseObjectStoreName);
        const items = await getFromDB(db);
        let itemToDelete = element ? items.find(item => item.id === domIndex) : null;

        if (!itemToDelete) {
            const domTimestamp = parseInt(timestamp);
            const keys = [
                `${timestamp}_${id}_position`,
                `${timestamp}_${id}_race`,
                `${timestamp}_${id}_gender`,
                `${timestamp}_${id}_track`,
                `${timestamp}_${id}_frame`,
                `${timestamp}_${id}_fps`,
                `canvas_${id}`
            ];
            keys.forEach(key => localStorage.removeItem(key));
            itemToDelete = items.find(item => item.timestamp === domTimestamp);
        }

        if (!itemToDelete) {
            const containers = Array.from(container.querySelectorAll('.data-container'));
            const fallbackIndex = containers.indexOf(parent);
            if (fallbackIndex !== -1) {
                items.sort((a, b) => a.timestamp - b.timestamp);
                const dbIndex = items.length - 1 - fallbackIndex;
                itemToDelete = items[dbIndex];
            }
        }

        if (itemToDelete) {
            if (itemToDelete.active) {
                displayStoredData(null, dataBaseObjectStoreName);
            }

            if (element?.src?.startsWith('blob:')) {
                URL.revokeObjectURL(element?.src);
            }

            await deleteFromDB(db, itemToDelete.id);
            await saveCountIndex(databases);
        }

        parent.remove();
        updateGenerateButtonText()
    } catch (error) {
        alert('Error during delete operation: ' + error.message);
    }
};

let lastClickTime = 0;

export const handleFileContainerEvents = async (event, dataBaseIndexName, dataBaseObjectStoreName, container, databases) => {
    const now = Date.now();
    if (now - lastClickTime < 100) return;
    lastClickTime = now;

    console.log('[handleFileContainerEvents] call');
    const parent = event.target.closest('.data-container');
    if (!parent) return;

    if (event.target.classList.contains('delete-icon')) {
        return await handleDelete(dataBaseIndexName, dataBaseObjectStoreName, parent, container, databases);
    }

    if (dataBaseObjectStoreName === 'outputs') {
        const viewOutput = document.getElementById('viewOutput');
        if (viewOutput) viewOutput.disabled = false;

        const downloadOutput = document.getElementById('downloadOutput');
        if (downloadOutput) downloadOutput.disabled = false;
    }

    const element = parent.querySelector('img, video, iframe, initial');
    if (!element) return;

    let db = openDB(dataBaseIndexName, dataBaseObjectStoreName);

    // Deactivate if already active
    if (parent.classList.contains('active')) {
        parent.classList.remove('active');

        if (element.tagName.toLowerCase() === 'iframe') {
            element.style.width = 'calc(var(--input-size))';
            element.style.height = 'calc(var(--input-size))';
        }

        const idx = parseInt(element.getAttribute('id'));
        if (!isNaN(idx)) {
            displayStoredData(null, dataBaseObjectStoreName);
            db = await db;
            await updateActiveState(db, idx, false);
        }

        return;
    }

    db = await db;

    for (const activeEl of container.querySelectorAll('.data-container.active')) {
        activeEl.classList.remove('active');

        const el = activeEl.querySelector('img, video, iframe, initial');
        if (el?.tagName.toLowerCase() === 'iframe') {
            el.style.width = 'calc(var(--input-size))';
            el.style.height = 'calc(var(--input-size))';
        }

        const idx = parseInt(el?.getAttribute('id'));
        if (!isNaN(idx)) {
            await updateActiveState(db, idx, false);
        }
    }

    // Activate the clicked item
    const idx = parseInt(element.getAttribute('id'));
    parent.classList.add('active');

    if (element.tagName.toLowerCase() === 'iframe') {
        element.style.width = 'calc(var(--input-size) - 2px)';
        element.style.height = 'calc(var(--input-size) - 2px)';
    }

    if (!isNaN(idx))
        await updateActiveState(db, idx, true);

    if (pageName === 'face-swap' || dataBaseObjectStoreName === 'outputs')
        displayStoredData(parent, dataBaseObjectStoreName);
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
            showNotification(`Video FPS not found, please try again.`, 'Error', 'warning');
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
            clonedInput.style.objectFit = getScreenMode() === 1 ? 'contain' : 'contain';
            clonedInput.style.position = 'relative';
            if (isVideo) {
                clonedInput.controls = false;
                clonedInput.autoplay = true;
                clonedInput.muted = true;
                clonedInput.keepMuted = true;
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
                showNotification(`Video could not be loaded. Retrying... (${retries}/${maxRetries})`, 'Error', 'default');
                setTimeout(attemptInputLoad, retryDelay);
            } else {
                showNotification('Failed to load video after multiple attempts.', 'Error', 'error');
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
            if (checkbox) checkbox.addEventListener('change', (event) => {
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
            if (checkbox) checkbox.addEventListener('change', (event) => {
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
            if (checkbox) checkbox.addEventListener('change', (event) => {
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

    async function handleProcess() {
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
                if (checkbox && checkbox.checked) {
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
                if (checkbox && checkbox.checked) {
                    id = checkbox.id;
                }
            });

            return id ? id : "none";
        }

        function getSelectedRace() {
            const checkboxes = document.querySelectorAll('#faceRaceComboBox input[type="checkbox"]');
            let id = null;

            checkboxes.forEach(checkbox => {
                if (checkbox && checkbox.checked) {
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
                    simulateFullClick(openSignInContainer);
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

            async function getServerAddresses() {
                try {
                    const snapshotPromise = () => getDocsSnapshot('servers');
                    return await fetchServerAddresses(snapshotPromise, true);
                } catch (error) {
                    showNotification(`Failed to get server addresses.`, 'Warning', 'warning');
                    return null;
                }
            }

            let serverAddresses;

            const timeoutDuration = 15000;
            let remainingTime = timeoutDuration / 1000;

            const countdownInterval = setInterval(() => {
                remainingTime--;
            }, 1000);

            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Process took longer than 15 seconds.')), timeoutDuration)
            );

            try {
                [serverAddresses] = await Promise.race([
                    Promise.all([
                        getServerAddresses()
                    ]),
                    timeout
                ]);
            } catch (error) {
                showNotification(
                    `Failed to fetch servers. Consider disabling extensions, Adblockers or VPN's. ${error.message}`,
                    'Warning',
                    'warning'
                );
                return;
            } finally {
                clearInterval(countdownInterval);
            }

            const suffixOrder = ["s", "d", "f", "g", "h", "j", "k", "l"];
            const serverId = serverID().toLowerCase();

            const parsedServers = serverAddresses.map(addr => {
                const regex = new RegExp(`https:\/\/([^/]+)-(\\d+)-${serverId}\\.deepany\\.top`, "i");
                const match = addr.match(regex);
                if (!match) {
                    return { addr, major: 0, minor: 0, index: Infinity, suffix: "" };
                }
                const [, model, indexStr] = match;
                const index = parseInt(indexStr, 10);
                const parts = model.split('-');
                const gpuNumber = parseInt(parts[0], 10);
                const suffix = parts[1] ? parts[1].toLowerCase() : "";

                const major = Math.floor(gpuNumber / 100);
                const minor = gpuNumber % 100;

                return { addr, major, minor, index, suffix };
            });

            function getSuffixRank(s) {
                if (!s) return -1;
                const pos = suffixOrder.indexOf(s);
                return pos === -1 ? -1 : (suffixOrder.length - pos);
            }

            parsedServers.sort((a, b) => {
                if (a.index !== b.index) return a.index - b.index;
                if (a.major !== b.major) return b.major - a.major;
                if (a.minor !== b.minor) return b.minor - a.minor;
                return getSuffixRank(b.suffix) - getSuffixRank(a.suffix);
            });

            let sortedServerAddresses = parsedServers.map(p => p.addr.toLowerCase());
            let serverQueueResults = await Promise.all(
                sortedServerAddresses.map(server => checkServerQueue(server))
            );

            function getGroupKey(addr) {
                const match = addr.match(/https:\/\/(\d+)(?:-([a-z]+))?-/i);
                if (!match) return '';
                const gpu = match[1];
                const suffix = match[2] ? match[2].toLowerCase() : "";
                return suffix ? `${gpu}-${suffix}` : gpu;
            }

            const groupAggregates = {};
            const isolatedServers = new Set([
                "https://4090-4-df.deepany.top",
                //"https://3050-1-df.deepany.top"
            ].map(s => s.toLowerCase()));

            sortedServerAddresses.forEach((server, i) => {
                if (isolatedServers.has(server)) return;

                const key = getGroupKey(server);
                if (!groupAggregates[key]) groupAggregates[key] = 0;
                if (serverQueueResults[i])
                    groupAggregates[key] += 1;
            });

            function effectiveQueue(server) {
                const key = getGroupKey(server);
                const groupQ = (groupAggregates[key] || 0) - (isolatedServers.has(server) ? 0.01 : 0);
                return groupQ;
            }

            const adjustQueue = (server) => {
                return serverQueueResults[sortedServerAddresses.indexOf(server)] + (effectiveQueue(server) / 2);
            };

            const adjustedQueues = sortedServerAddresses.map(server => adjustQueue(server));

            const minQueueIndex = adjustedQueues.reduce((minIndex, queue, id, arr) =>
                queue < arr[minIndex] ? id : minIndex,
                0
            );

            if (adjustedQueues[minQueueIndex] === Infinity) {
                setClientStatus("Offline");
                showNotification(
                    `Cannot fetch the server. A VPN could cause this or our server is currently offline. Contact an admin for more information.`,
                    "Warning - Process Failed",
                    "warning-important"
                );
                return;
            }

            function pickRandomServerFromSameGroupWithLowestQueue(seedServerAddr) {
                if (isolatedServers.has(seedServerAddr)) {
                    return seedServerAddr;
                }

                const groupKey = getGroupKey(seedServerAddr);
                const groupServers = sortedServerAddresses.filter(addr => {
                    return getGroupKey(addr) === groupKey && !isolatedServers.has(addr);
                });

                if (groupServers.length === 0) return null;

                const serversWithQueues = groupServers.map(server => ({
                    server,
                    queue: adjustQueue(server)
                }));

                const minQueue = Math.min(...serversWithQueues.map(s => s.queue));
                const bestCandidates = serversWithQueues.filter(s => s.queue === minQueue);
                const chosen = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
                return chosen.server;
            }

            const serverAddress = pickRandomServerFromSameGroupWithLowestQueue(sortedServerAddresses[minQueueIndex]);
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
                        imgElement.style.objectFit = getScreenMode() === 1 ? 'contain' : 'contain';
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
        await handleProcess();
    });
}

export async function showCanvas(imgElement) {
    // Wrap the whole logic in a promise.
    return new Promise(async (resolve) => {
        if (document.getElementById('wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.id = 'wrapper';
        wrapper.style.alignItems = 'unset';
        wrapper.innerHTML = `
    <div class="background-container" style="display: flex; flex-direction: column;">
        <div class="background-container" style="width: 100%;">
            <p class="background-dot-container-option" canvas-mode="canvasMode" translate="yes">Canvas</p>
            <p class="background-dot-container-option" canvas-mode="fillingMode" translate="yes">Fill</p>
            <p class="background-dot-container-option" canvas-mode="colorMatching" translate="yes">Segmentation</p>
        </div>

        <a class="background-dot-container">
            <div class="background-dot-container-content" style="padding: 0;">
                <div id="innerContainer" class="background-container" style="display: contents;">
                    <div id="mainContainerCanvas" style="position: relative;">
                        <div class="loading-screen" id="initialLoadingSpinner" style="position: absolute; z-index: 99999;"></div>
                        
                        <div id="imgContainerWrapper" style="position: relative;">
                            <img query="imgContainer" style="display: none;">
                            <canvas id="maskCanvas" style="position: absolute; top: 0; left: 0; z-index: 40; cursor: none;"></canvas>
                        </div>

                        <input type="range" min="0" max="200" value="20" id="brushRange"
                            style="position: absolute; top: 1vh; left: 1vh; width: 40%; z-index: 50;">
                        <input type="range" min="0" max="360" value="0" id="colorRange"
                            style="position: absolute; top: 3vh; left: 1vh; width: 40%; z-index: 50;">
                        <input type="color" id="colorPicker" style="display: none;" readonly>
                    </div>
                    <button class="close-button"
                        style="position: absolute; top: 1vh; right: 1vh; cursor: pointer; width: 4vh; height: 4vh; padding: 0; margin: 0; z-index: 99999;">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round"
                            stroke-linejoin="round"
                            style="margin: 0; width: 3.5vh;"
                            class="lucide lucide-x">
                            <path d="M18 6 6 18"></path>
                            <path d="m6 6 12 12"></path>
                        </svg>
                    </button>
                    <button class="ctrl-z-button" style="position: absolute;top: 1vh;right: 6vh;cursor: pointer;width: 4vh;height: 4vh;padding: 0;z-index: 99999;">
                        <svg style="margin: 0; width: 2.75vh;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="white" version="1.1" viewBox="0 0 489.533 489.533" xml:space="preserve"><g><path d="M268.175,488.161c98.2-11,176.9-89.5,188.1-187.7c14.7-128.4-85.1-237.7-210.2-239.1v-57.6c0-3.2-4-4.9-6.7-2.9   l-118.6,87.1c-2,1.5-2,4.4,0,5.9l118.6,87.1c2.7,2,6.7,0.2,6.7-2.9v-57.5c87.9,1.4,158.3,76.2,152.3,165.6   c-5.1,76.9-67.8,139.3-144.7,144.2c-81.5,5.2-150.8-53-163.2-130c-2.3-14.3-14.8-24.7-29.2-24.7c-17.9,0-31.9,15.9-29.1,33.6   C49.575,418.961,150.875,501.261,268.175,488.161z"/></g></svg>
                    </button>
                    <button class="clear-button" style="position: absolute;top: 1vh;right: 11vh;cursor: pointer;width: 4vh;height: 4vh;padding: 0;z-index: 99999;">
                        <svg style="margin: 0; width: 3.4vh;" xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 32 32" id="icon">
                          <defs>
                            <style>
                              .cls-1 {
                                fill: none;
                              }
                            </style>
                          </defs>
                          <title>clean</title>
                          <rect x="20" y="18" width="6" height="2" transform="translate(46 38) rotate(-180)"/>
                          <rect x="24" y="26" width="6" height="2" transform="translate(54 54) rotate(-180)"/>
                          <rect x="22" y="22" width="6" height="2" transform="translate(50 46) rotate(-180)"/>
                          <path d="M17.0029,20a4.8952,4.8952,0,0,0-2.4044-4.1729L22,3,20.2691,2,12.6933,15.126A5.6988,5.6988,0,0,0,7.45,16.6289C3.7064,20.24,3.9963,28.6821,4.01,29.04a1,1,0,0,0,1,.96H20.0012a1,1,0,0,0,.6-1.8C17.0615,25.5439,17.0029,20.0537,17.0029,20ZM11.93,16.9971A3.11,3.11,0,0,1,15.0041,20c0,.0381.0019.208.0168.4688L9.1215,17.8452A3.8,3.8,0,0,1,11.93,16.9971ZM15.4494,28A5.2,5.2,0,0,1,14,25H12a6.4993,6.4993,0,0,0,.9684,3H10.7451A16.6166,16.6166,0,0,1,10,24H8a17.3424,17.3424,0,0,0,.6652,4H6c.031-1.8364.29-5.8921,1.8027-8.5527l7.533,3.35A13.0253,13.0253,0,0,0,17.5968,28Z"/>
                          <rect id="_Transparent_Rectangle_" data-name="&lt;Transparent Rectangle&gt;" class="cls-1" width="32" height="32"/>
                        </svg>
                    </button>
                    <button class="save-button" style="position: absolute;top: 1vh;right: 16vh;cursor: pointer;width: 4vh;height: 4vh;padding: 0;z-index: 99999;">
                        <svg style="margin: 0; width: 2.75vh;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="white" version="1.1" id="Layer_1" viewBox="0 0 512 512" xml:space="preserve"><g><g><path d="M440.125,0H0v512h512V71.875L440.125,0z M281.6,31.347h31.347v94.041H281.6V31.347z M136.359,31.347h113.894v125.388    h94.041V31.347h32.392v156.735H136.359V31.347z M417.959,480.653H94.041V344.816h323.918V480.653z M417.959,313.469H94.041    v-31.347h323.918V313.469z M480.653,480.653h-31.347V250.775H62.694v229.878H31.347V31.347h73.665v188.082h303.02V31.347h19.108    l53.512,53.512V480.653z"/></g></g></svg>
                    </button>
                </div>
            </div>
        </a>

        <a class="background-dot-container">
            <div class="background-dot-container-content">
                <div id="innerContainer" class="background-container" style="display: contents;">
                    <div style="display: flex; flex-direction: column; justify-content: space-around; gap: 1vh;">
                         <div style="display: flex;flex-direction: row;justify-content: space-around;gap: calc(1.5vh* var(--scale-factor-h));">
                            <button class="wide" id="startProcessCanvas">Save Canvas & Start Process</button>
                         </div>
                         <div id="colorMatchingSettings" style="display: flex !important; flex-direction: column !important; justify-content: space-around !important; gap: 1vh; !important">
                             <div class="line"></div>
                             <div>
                                <!-- Updated combobox HTML -->
                                <div id="objectDetectionMethodComboBox" class="combobox" tooltip style="gap: 1vh;">
                                  <!-- Updated tooltip text -->
                                  <div class="tooltip">Select the object detection method (only one can be active at a time).</div>
                                  <!-- This span will display the currently selected method -->
                                  <span class="combobox-text" title="Object detection">HSV Thresholding</span>
                                  <span class="arrow-dwn"></span>
                                  <ul class="list-items">
                                    <li class="item">
                                      <label class="checkbox" tooltip>
                                        <input type="checkbox" id="0_stateObjectDetection">
                                        <span>HSV Thresholding</span>
                                      </label>
                                    </li>
                                    <li class="item">
                                      <label class="checkbox" tooltip>
                                        <input type="checkbox" id="1_stateObjectDetection">
                                        <span>RBG sorting</span>
                                      </label>
                                    </li>
                                    <li class="item">
                                      <label class="checkbox" tooltip>
                                        <input type="checkbox" id="2_stateObjectDetection">
                                        <span>Edge Detection</span>
                                      </label>
                                    </li>
                                    <li class="item">
                                      <label class="checkbox" tooltip>
                                        <input type="checkbox" id="3_stateObjectDetection">
                                        <span>Hybrid</span>
                                      </label>
                                    </li>
                                  </ul>
                                </div>
                            </div>
                            <div style="display: flex;gap: 1vh;">
                                <label class="checkbox" style="display: flex; align-items: center; gap: calc(1vh); justify-content: space-between;">
                                    <div style="display: flex; flex-direction: row; gap: calc(1vh); width: 100%; align-items: center;">
                                        <input type="range" min="1" max="100" step="1" value="25" class="slider" id="tolerance-slider">
                                        <div class="slider-value" id="tolerance-value">25% Tolerance</div>
                                    </div>
                                </label>
                            </div>
                            <div>
                                <label class="checkbox" style="display: flex; align-items: center; gap: calc(1vh); justify-content: space-between;">
                                    <div style="display: flex; flex-direction: row; gap: calc(1vh); width: 100%; align-items: center;">
                                        <input type="range" min="0" max="100" step="5" value="5" class="slider" id="optimization-slider">
                                        <div class="slider-value" id="optimization-value">10% Dilation</div>
                                    </div>
                                </label>
                            </div>
                            <div style="display: none;">
                                <label class="checkbox" style="display: flex; align-items: center; gap: calc(1vh); justify-content: space-between;">
                                    <div style="display: flex; flex-direction: row; gap: calc(1vh); width: 100%; align-items: center;">
                                        <input type="range" min="0" max="100" step="5" value="25" class="slider" id="accumulation-slider">
                                        <div class="slider-value" id="accumulation-value">25% Accumulation</div>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </a>
    </div>
`;

        const id = imgElement.getAttribute('id');
        let clonedInput;

        // Global variables for object detection
        let offscreenCanvas, offscreenCtx; // used to hold the image pixel data
        let detectionOverlay, detectionCtx;  // used for drawing the detected object

        // --- Drawing state ---
        const undoStack = [];
        const redoStack = [];
        let drawing = false, isErasing = false;
        let lastX = 0, lastY = 0;
        let firstX = 0, firstY = 0;
        let path = [];

        let cachedImageData = null;

        let loadingSpinner = document.createElement('div');
        loadingSpinner.className = 'loading-screen';
        loadingSpinner.style.position = 'absolute';
        loadingSpinner.style.display = "none";

        let inputContainer = wrapper.querySelector('[query="imgContainer"]');
        inputContainer.style.filter = 'brightness(100%)';
        inputContainer.parentElement.appendChild(loadingSpinner);

        let imageData;

        // Create a custom cursor element for the brush.
        const customCursor = document.createElement('div');
        customCursor.id = 'customCursor';
        customCursor.style.position = 'fixed';
        customCursor.style.pointerEvents = 'none';
        customCursor.style.borderRadius = '50%';
        customCursor.style.border = '2px solid #fff';
        customCursor.style.width = '20px';
        customCursor.style.height = '20px';
        customCursor.style.zIndex = '999999';
        customCursor.style.display = 'none';
        document.body.appendChild(customCursor);

        // Initialize the cursor position
        function setCustomCursorPosition(x, y) {
            customCursor.style.left = `${x - customCursor.offsetWidth / 2}px`;
            customCursor.style.top = `${y - customCursor.offsetHeight / 2}px`;
        }

        function createClonedInput() {
            clonedInput = imgElement.cloneNode(true);
            clonedInput.style.width = '100%';
            clonedInput.style.borderRadius = 'var(--border-radius)';
            clonedInput.style.objectFit = getScreenMode() === 1 ? 'contain' : 'contain';
            clonedInput.style.position = 'relative';
            clonedInput.setAttribute('query', 'imgContainer');
            document.body.appendChild(clonedInput);
            return clonedInput;
        }

        async function replaceInput() {
            clonedInput = createClonedInput();
            const imgContainerWrapper = wrapper.querySelector('#imgContainerWrapper');
            const inputContainer = imgContainerWrapper.querySelector('[query="imgContainer"]');
            inputContainer.style.display = 'none';
            clonedInput.style.display = 'block';
            imgContainerWrapper.replaceChild(clonedInput, inputContainer);
            if (document.body.contains(clonedInput)) {
                document.body.removeChild(clonedInput);
            }
        }

        async function initInput() {
            clonedInput.addEventListener('load', () => {
                const loadingSpinner = wrapper.querySelector('#initialLoadingSpinner');
                if (loadingSpinner) {
                    loadingSpinner.remove();
                } else {
                    alert('Loading screen element not found in wrapper.');
                }

                const mainContainerCanvas = document.getElementById('mainContainerCanvas');
                const { width, height } = mainContainerCanvas.getBoundingClientRect();

                const imgContainerWrapper = document.getElementById('imgContainerWrapper');
                imgContainerWrapper.style.width = `${width}px`;
                imgContainerWrapper.style.height = `${height}px`;

                const canvas = document.getElementById('maskCanvas');
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;

                canvas.width = width;
                canvas.height = height;

                setCustomCursorPosition(mouseX, mouseY);
                customCursor.style.display = 'block';
                undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));

                offscreenCanvas = document.createElement('canvas');
                offscreenCanvas.width = clonedInput.clientWidth;
                offscreenCanvas.height = clonedInput.clientHeight;
                offscreenCtx = offscreenCanvas.getContext('2d');
                offscreenCtx.drawImage(clonedInput, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

                detectionOverlay = document.createElement('canvas');
                detectionOverlay.id = 'detectionOverlay';
                detectionOverlay.style.position = 'absolute';
                detectionOverlay.style.top = '0';
                detectionOverlay.style.left = '0';
                detectionOverlay.width = canvas.width;
                detectionOverlay.height = canvas.height;
                detectionOverlay.style.pointerEvents = 'none';
                detectionOverlay.style.zIndex = '30';
                imgContainerWrapper.appendChild(detectionOverlay);
                detectionCtx = detectionOverlay.getContext('2d');
            });

            clonedInput.addEventListener('error', () => {
                alert('Image failed to load.');
            });

            document.body.appendChild(wrapper);
        }

        await replaceInput();
        await initInput();

        showNotification(`Draw on the object you want to change.`, 'Canvas', 'information');

        const brushRangeInput = document.getElementById("brushRange"),
            colorRangeInput = document.getElementById("colorRange"),
            colorPickerInput = document.getElementById("colorPicker"),
            canvas = document.getElementById("maskCanvas"),
            ctx = canvas.getContext('2d', { willReadFrequently: true });

        setTimeout(async () => {
            const savedCanvasData = localStorage.getItem(`canvas_${id}`);
            if (savedCanvasData) {
                const img = new Image();
                await new Promise((resolve, reject) => {
                    img.onload = () => {
                        const mainContainerCanvas = document.getElementById('mainContainerCanvas');
                        const { width, height } = mainContainerCanvas.getBoundingClientRect();

                        const imgContainerWrapper = document.getElementById('imgContainerWrapper');
                        imgContainerWrapper.style.width = `${width}px`;
                        imgContainerWrapper.style.height = `${height}px`;

                        const canvas = document.getElementById('maskCanvas');
                        canvas.style.width = `${width}px`;
                        canvas.style.height = `${height}px`;

                        canvas.width = width;
                        canvas.height = height;

                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0);
                        resolve();
                    };

                    img.onerror = (error) => {
                        reject(`Error loading image: ${error}`);
                    };

                    img.src = savedCanvasData;
                });
            }
        }, 0);

        const hslToRgb = (h, s, l) => {
            const c = (1 - Math.abs(2 * l - 1)) * s,
                x = c * (1 - Math.abs((h / 60) % 2 - 1)),
                m = l - c / 2;
            let [r, g, b] =
                h < 60 ? [c, x, 0] :
                    h < 120 ? [x, c, 0] :
                        h < 180 ? [0, c, x] :
                            h < 240 ? [0, x, c] :
                                h < 300 ? [x, 0, c] : [c, 0, x];
            return [Math.round((r + m) * 255),
            Math.round((g + m) * 255),
            Math.round((b + m) * 255)];
        };

        const rgbToHex = ([r, g, b]) =>
            `#${((1 << 24) + (r << 16) + (g << 8) + b)
                .toString(16)
                .slice(1)}`;

        const getComplementaryColor = hue => {
            const compHue = (parseInt(hue, 10) + 180) % 360;
            return rgbToHex(hslToRgb(compHue, 1, 0.5));
        };

        function isCanvasEmpty(canvas) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;

            for (let i = 0; i < pixels.length; i += 4) {
                if (pixels[i] !== 0 || pixels[i + 1] !== 0 || pixels[i + 2] !== 0 || pixels[i + 3] !== 0) {
                    return false;
                }
            }

            return true;
        }

        function saveCanvas(canvas) {
            const dataUrl = canvas.toDataURL('image/png');
            const dataSize = (dataUrl.length * 3 / 4) - (dataUrl.indexOf('base64,') + 7);
            const sizeInBytes = dataSize;
            const MAX_SIZE_LS = 5 * 1024 * 1024;

            // Check if the size exceeds the 5MB limit
            if (sizeInBytes > MAX_SIZE_LS) {
                alert('Canvas data exceeds 5MB size limit and cannot be saved.');
                return; // Do not save the canvas
            }

            const imgContainerId = imgElement ? imgElement.getAttribute('id') : null;
            if (!imgContainerId) return;

            // Store the canvas data URL in localStorage
            try {
                localStorage.setItem(`canvas_${imgContainerId}`, dataUrl);
                showNotification(`Your canvas has been saved.`, 'Canvas Update', 'default');
                console.log(`Canvas for ${imgContainerId} saved successfully.`);
            } catch (e) {
                console.error('Failed to save canvas to localStorage:', e);
            }
        }

        // Load settings from localStorage and update UI elements.
        function loadSettings() {
            const settingsStr = localStorage.getItem("objectDetectionSettings");
            let settings = {};
            if (settingsStr) {
                try {
                    settings = JSON.parse(settingsStr);
                } catch (e) {
                    console.error("Error parsing settings", e);
                    settings = {};
                }
            }

            // Set the detection method (if saved)
            if (settings.detectionMethod !== undefined) {
                const methodId = settings.detectionMethod + "_stateObjectDetection";
                const checkbox = document.getElementById(methodId);
                if (checkbox) {
                    checkbox.checked = true;
                    // Update the combobox text with the method's name.
                    const methodName = checkbox.parentElement.querySelector("span").textContent;
                    const comboboxText = document.querySelector("#objectDetectionMethodComboBox .combobox-text");
                    if (comboboxText) {
                        comboboxText.textContent = methodName;
                    }
                }
            }

            // Set the slider values and update the display texts.
            const tolSlider = document.getElementById("tolerance-slider");
            if (tolSlider && settings.tolerance !== undefined) {
                tolSlider.value = settings.tolerance;
                const tolDisplay = document.getElementById("tolerance-value");
                if (tolDisplay) {
                    tolDisplay.textContent = settings.tolerance + "% Tolerance";
                }
            }

            const accumSlider = document.getElementById("accumulation-slider");
            if (accumSlider && settings.accumulation !== undefined) {
                accumSlider.value = settings.accumulation;
                const accumDisplay = document.getElementById("accumulation-value");
                if (accumDisplay) {
                    accumDisplay.textContent = settings.accumulation + "% Accumulation";
                }
            }

            const dilationSlider = document.getElementById("optimization-slider");
            if (dilationSlider && settings.dilation !== undefined) {
                dilationSlider.value = settings.dilation;
                const dilationDisplay = document.getElementById("optimization-value");
                if (dilationDisplay) {
                    dilationDisplay.textContent = settings.dilation + "% Dilation";
                }
            }

            if (localStorage.getItem("brushSize")) {
                brushRangeInput.value = localStorage.getItem("brushSize");
                brushRangeInput.dispatchEvent(new Event("input"));
            }
            if (localStorage.getItem("colorHue")) {
                colorRangeInput.value = localStorage.getItem("colorHue");
                colorRangeInput.dispatchEvent(new Event("input"));
            }
            if (localStorage.getItem("colorPicker")) {
                colorPickerInput.value = localStorage.getItem("colorPicker");
            }

            const hue = colorRangeInput.value;
            customCursor.style.borderColor = getComplementaryColor(hue);

            const diameter = parseInt(brushRangeInput.value, 10);
            customCursor.style.width = `${diameter}px`;
            customCursor.style.height = `${diameter}px`;
        }

        // Save the current settings into localStorage.
        function saveSettings() {
            const settings = {};

            // Save the currently selected detection method.
            const checkboxes = document.querySelectorAll('#objectDetectionMethodComboBox input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                if (checkbox && checkbox.checked) {
                    // Extract the number from an id like "0_stateObjectDetection"
                    const match = checkbox.id.match(/^(\d+)/);
                    if (match) {
                        settings.detectionMethod = parseInt(match[1], 10);
                    }
                }
            });

            // Save slider values.
            const tolSlider = document.getElementById("tolerance-slider");
            if (tolSlider) {
                settings.tolerance = tolSlider.value;
            }
            const accumSlider = document.getElementById("accumulation-slider");
            if (accumSlider) {
                settings.accumulation = accumSlider.value;
            }
            const dilationSlider = document.getElementById("optimization-slider");
            if (dilationSlider) {
                settings.dilation = dilationSlider.value;
            }

            localStorage.setItem("brushSize", brushRangeInput.value);
            localStorage.setItem("colorHue", colorRangeInput.value);
            localStorage.setItem("colorPicker", colorPickerInput.value);
            localStorage.setItem("objectDetectionSettings", JSON.stringify(settings));
        }

        // First, load any stored settings.
        loadSettings();

        // --- Slider Event Listeners ---
        const tolSlider = document.getElementById("tolerance-slider");
        if (tolSlider) {
            tolSlider.addEventListener("input", function () {
                const tolDisplay = document.getElementById("tolerance-value");
                if (tolDisplay) {
                    tolDisplay.textContent = tolSlider.value + "% Tolerance";
                }
                saveSettings();
                // Simulate a mousemove event
                //canvas.dispatchEvent(new Event('mousemove'));
            });
        }

        const accumSlider = document.getElementById("accumulation-slider");
        if (accumSlider) {
            accumSlider.addEventListener("input", function () {
                const accumDisplay = document.getElementById("accumulation-value");
                if (accumDisplay) {
                    accumDisplay.textContent = accumSlider.value + "% Accumulation";
                }
                saveSettings();
                // Simulate a mousemove event
                //canvas.dispatchEvent(new Event('mousemove'));
            });
        }

        const dilationSlider = document.getElementById("optimization-slider");
        if (dilationSlider) {
            dilationSlider.addEventListener("input", function () {
                const dilationDisplay = document.getElementById("optimization-value");
                if (dilationDisplay) {
                    dilationDisplay.textContent = dilationSlider.value + "% Dilation";
                }
                saveSettings();
                // Simulate a mousemove event
                //canvas.dispatchEvent(new Event('mousemove'));
            });
        }

        // --- Object Detection Method Combobox ---
        const comboBox = document.getElementById("objectDetectionMethodComboBox");
        const comboboxText = comboBox.querySelector(".combobox-text");
        const checkboxes = comboBox.querySelectorAll("input[type='checkbox']");

        // Function to uncheck all except the selected one.
        function clearOtherCheckboxes(selected) {
            checkboxes.forEach(box => {
                if (box !== selected) {
                    box.checked = false;
                }
            });
        }

        checkboxes.forEach(checkbox => {
            if (checkbox) checkbox.addEventListener("change", function () {
                if (checkbox && checkbox.checked) {
                    clearOtherCheckboxes(checkbox);
                    // Update combobox text with the selected method's name.
                    const methodName = checkbox.parentNode.querySelector("span").textContent;
                    comboboxText.textContent = methodName;
                } else {
                    // If no checkbox is selected, reset the text.
                    let anyChecked = Array.from(checkboxes).some(box => box.checked);
                    if (!anyChecked) {
                        comboboxText.textContent = "HSV Thresholding";
                    }
                }
                saveSettings();
                // Simulate a mousemove event
                //canvas.dispatchEvent(new Event('mousemove'));
            });
        });

        const isClosedShape = (start, end) => {
            if (!start || !end) return false;
            const dx = end.x - start.x, dy = end.y - start.y;
            return Math.hypot(dx, dy) <= 10;
        };

        const colorMatchingSettings = document.getElementById('colorMatchingSettings');
        const savedCanvasMode = localStorage.getItem('selectedCanvasMode');
        const canvasModeSelector = document.querySelector(`.background-dot-container-option[canvas-mode="${savedCanvasMode}"].selected`);
        let selectedCanvasMode = savedCanvasMode || (canvasModeSelector ? savedCanvasMode : 'canvasMode');
        colorMatchingSettings.style.display = selectedCanvasMode === "colorMatching" ? "flex" : "none";

        const canvasOptions = document.querySelectorAll(".background-dot-container-option[canvas-mode]");
        [...canvasOptions].forEach(option => {
            if (option.getAttribute("canvas-mode") === selectedCanvasMode) {
                // Remove "selected" class from all options
                canvasOptions.forEach(opt => opt.classList.remove("selected"));
                // Add "selected" class to clicked option
                option.classList.add("selected");
                // Update selectedCanvasMode
                selectedCanvasMode = option.getAttribute("canvas-mode");
                colorMatchingSettings.style.display = selectedCanvasMode === "colorMatching" ? "flex" : "none";

                // Save the selected mode to localStorage
                localStorage.setItem('selectedCanvasMode', selectedCanvasMode);

                // Clear the detection context if available
                if (detectionCtx) {
                    detectionCtx.clearRect(0, 0, detectionOverlay.width, detectionOverlay.height);
                }
            }

            option.addEventListener('click', () => {
                if (option.getAttribute("canvas-mode") !== selectedCanvasMode) {
                    // Remove "selected" class from all options
                    canvasOptions.forEach(opt => opt.classList.remove("selected"));
                    // Add "selected" class to clicked option
                    option.classList.add("selected");
                    // Update selectedCanvasMode
                    selectedCanvasMode = option.getAttribute("canvas-mode");
                    colorMatchingSettings.style.display = selectedCanvasMode === "colorMatching" ? "flex" : "none";

                    // Save the selected mode to localStorage
                    localStorage.setItem('selectedCanvasMode', selectedCanvasMode);

                    // Clear the detection context if available
                    if (detectionCtx) {
                        detectionCtx.clearRect(0, 0, detectionOverlay.width, detectionOverlay.height);
                    }
                }
            });
        });

        // Set the initial selected mode if none is selected
        if (![...canvasOptions].some(opt => opt.classList.contains("selected")) && canvasOptions.length) {
            canvasOptions[0].classList.add("selected");
            selectedCanvasMode = canvasOptions[0].getAttribute("canvas-mode");
            colorMatchingSettings.style.display = selectedCanvasMode === "colorMatching" ? "flex" : "none";
            // Save the initial selected mode
            localStorage.setItem('selectedCanvasMode', selectedCanvasMode);
        }

        colorRangeInput.addEventListener("input", function () {
            const hue = this.value;
            colorPickerInput.value = rgbToHex(hslToRgb(hue, 1, 0.5));
            customCursor.style.borderColor = getComplementaryColor(hue);
            saveSettings();
        });

        brushRangeInput.addEventListener("input", function () {
            const diameter = parseInt(this.value, 10);
            customCursor.style.width = `${diameter}px`;
            customCursor.style.height = `${diameter}px`;
            saveSettings();
        });

        function getCachedImageData() {
            if (!offscreenCanvas || !offscreenCtx) {
                console.error('Offscreen canvas or context not initialized');
                return [];
            }

            if (!cachedImageData) {
                const imgData = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
                cachedImageData = imgData.data;
            }

            return cachedImageData;
        }

        function getColorOrder(rgb) {
            const { r, g, b } = rgb;
            if (r >= g && g >= b) return "rgb";
            if (r >= b && b >= g) return "rbg";
            if (g >= r && r >= b) return "grb";
            if (g >= b && b >= r) return "gbr";
            if (b >= r && r >= g) return "brg";
            if (b >= g && g >= r) return "bgr";
            return "";
        }

        function getPixelRGB(x, y) {
            const index = (y * offscreenCanvas.width + x) * 4;
            return {
                r: imageData[index],
                g: imageData[index + 1],
                b: imageData[index + 2]
            };
        }

        function getAverageSurroundingRGB(x, y, depth, visitedPixels = new Set()) {
            let totalR = 0, totalG = 0, totalB = 0, totalWeight = 0;
            if (depth > 0) {
                for (let d = 1; d <= depth; d++) {
                    const weight = 1 / d;
                    for (let i = -d; i <= d; i++) {
                        for (let j = -d; j <= d; j++) {
                            if (Math.abs(i) !== d && Math.abs(j) !== d) continue;
                            let nx = x + i, ny = y + j;
                            if (nx < 0 || nx >= offscreenCanvas.width || ny < 0 || ny >= offscreenCanvas.height) continue;
                            const key = `${nx},${ny}`;
                            if (visitedPixels.has(key)) continue;
                            visitedPixels.add(key);
                            const rgb = getPixelRGB(nx, ny);
                            totalR += rgb.r * weight;
                            totalG += rgb.g * weight;
                            totalB += rgb.b * weight;
                            totalWeight += weight;
                        }
                    }
                }
            } else {
                const key = `${x},${y}`;
                if (visitedPixels.has(key)) return { r: 0, g: 0, b: 0 };
                visitedPixels.add(key);
                return getPixelRGB(x, y);
            }
            if (totalWeight) {
                return {
                    r: totalR / totalWeight,
                    g: totalG / totalWeight,
                    b: totalB / totalWeight
                };
            }
            return { r: 0, g: 0, b: 0 };
        }

        function hexToRGB(hex) {
            hex = hex.replace(/^#/, '');
            if (hex.length === 3) {
                hex = hex.split('').map(c => c + c).join('');
            }
            return {
                r: parseInt(hex.substring(0, 2), 16),
                g: parseInt(hex.substring(2, 4), 16),
                b: parseInt(hex.substring(4, 6), 16),
            };
        }

        function rgbToHsv(r, g, b) {
            r /= 255; g /= 255; b /= 255;
            let max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h, s, v = max;
            let d = max - min;
            s = max === 0 ? 0 : d / max;
            if (max === min) {
                h = 0; // achromatic
            } else {
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h *= 60;
            }
            return { h, s, v };
        }

        function computeEdgeMap() {
            const width = offscreenCanvas.width;
            const height = offscreenCanvas.height;
            const edgeMap = new Float32Array(width * height);
            const gxKernel = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
            const gyKernel = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    let gx = 0, gy = 0, k = 0;
                    for (let j = -1; j <= 1; j++) {
                        for (let i = -1; i <= 1; i++) {
                            const pixel = getPixelRGB(x + i, y + j);
                            const lum = 0.299 * pixel.r + 0.587 * pixel.g + 0.114 * pixel.b;
                            gx += gxKernel[k] * lum;
                            gy += gyKernel[k] * lum;
                            k++;
                        }
                    }
                    edgeMap[y * width + x] = Math.sqrt(gx * gx + gy * gy);
                }
            }
            return edgeMap;
        }

        let isDetecting = false;

        function detectObjectRGBColorSorting(canvasX, canvasY, skipLevel) {
            if (isDetecting) return [];
            isDetecting = true;
            if (!offscreenCanvas || !offscreenCtx) { isDetecting = false; return []; }
            imageData = getCachedImageData();
            const scaleX = offscreenCanvas.width / canvas.width;
            const scaleY = offscreenCanvas.height / canvas.height;
            const startX = Math.floor(canvasX * scaleX);
            const startY = Math.floor(canvasY * scaleY);
            const skipOffset = skipLevel + 1;
            let visitedPixels = new Set();
            const accumulatePixelAmount = parseInt(accumSlider.value / 3.125, 10);
            const runNonAvg = true;
            const startRGBNonAvg = runNonAvg ? getAverageSurroundingRGB(startX, startY, 0, visitedPixels) : { r: 0, g: 0, b: 0 };
            const startRGBAvg = accumulatePixelAmount === 0 ? { r: 0, g: 0, b: 0 } : getAverageSurroundingRGB(startX, startY, accumulatePixelAmount, visitedPixels);
            const tolerance = tolSlider.value / 100;
            const visited = new Uint8Array(offscreenCanvas.width * offscreenCanvas.height);
            const samplePixels = [];
            const queue = [[startX, startY]];
            visited[startY * offscreenCanvas.width + startX] = 1;
            const startOrderAvg = getColorOrder(startRGBAvg);
            const startOrderNonAvg = getColorOrder(startRGBNonAvg);
            while (queue.length) {
                const [x, y] = queue.shift();
                const neighbors = [
                    [x - skipOffset, y],
                    [x + skipOffset, y],
                    [x, y - skipOffset],
                    [x, y + skipOffset]
                ];
                for (const [nx, ny] of neighbors) {
                    if (nx < 0 || nx >= offscreenCanvas.width || ny < 0 || ny >= offscreenCanvas.height) continue;
                    const idx = ny * offscreenCanvas.width + nx;
                    if (visited[idx]) continue;
                    visitedPixels = new Set();
                    const rgbNonAvg = runNonAvg ? getAverageSurroundingRGB(nx, ny, 0, visitedPixels) : { r: 0, g: 0, b: 0 };
                    const rgbAvg = accumulatePixelAmount === 0 ? { r: 0, g: 0, b: 0 } : getAverageSurroundingRGB(nx, ny, accumulatePixelAmount, visitedPixels);
                    if ((runNonAvg ? getColorOrder(rgbNonAvg) !== startOrderNonAvg : true) &&
                        (accumulatePixelAmount !== 0 ? getColorOrder(rgbAvg) !== startOrderAvg : true))
                        continue;
                    const ratioRNonAvg = startRGBNonAvg.r / rgbNonAvg.r;
                    const ratioGNonAvg = startRGBNonAvg.g / rgbNonAvg.g;
                    const ratioBNonAvg = startRGBNonAvg.b / rgbNonAvg.b;
                    const maxRatioNonAvg = Math.max(ratioRNonAvg, ratioGNonAvg, ratioBNonAvg);
                    const minRatioNonAvg = Math.min(ratioRNonAvg, ratioGNonAvg, ratioBNonAvg);
                    const ratioRAvg = startRGBAvg.r / rgbAvg.r;
                    const ratioGAvg = startRGBAvg.g / rgbAvg.g;
                    const ratioBAvg = startRGBAvg.b / rgbAvg.b;
                    const maxRatioAvg = Math.max(ratioRAvg, ratioGAvg, ratioBAvg);
                    const minRatioAvg = Math.min(ratioRAvg, ratioGAvg, ratioBAvg);
                    if ((accumulatePixelAmount !== 0 && Math.abs(maxRatioAvg - minRatioAvg) <= tolerance) ||
                        (runNonAvg && Math.abs(maxRatioNonAvg - minRatioNonAvg) <= tolerance)) {
                        visited[idx] = 1;
                        queue.push([nx, ny]);
                        samplePixels.push({ x: nx, y: ny });
                    }
                }
            }
            isDetecting = false;
            return samplePixels;
        }

        function detectObjectHSV(canvasX, canvasY, skipLevel) {
            if (isDetecting) return [];
            isDetecting = true;
            if (!offscreenCanvas || !offscreenCtx) { isDetecting = false; return []; }
            imageData = getCachedImageData();
            const scaleX = offscreenCanvas.width / canvas.width;
            const scaleY = offscreenCanvas.height / canvas.height;
            const startX = Math.floor(canvasX * scaleX);
            const startY = Math.floor(canvasY * scaleY);
            const skipOffset = skipLevel + 1;
            const refColor = getPixelRGB(startX, startY);
            const refHSV = rgbToHsv(refColor.r, refColor.g, refColor.b);
            const hueTolerance = tolSlider.value; // degrees
            const satTolerance = tolSlider.value / 150; // fraction
            const valTolerance = tolSlider.value / 150; // fraction
            const visited = new Uint8Array(offscreenCanvas.width * offscreenCanvas.height);
            const samplePixels = [];
            const queue = [[startX, startY]];
            visited[startY * offscreenCanvas.width + startX] = 1;
            while (queue.length) {
                const [x, y] = queue.shift();
                samplePixels.push({ x, y });
                const neighbors = [
                    [x - skipOffset, y],
                    [x + skipOffset, y],
                    [x, y - skipOffset],
                    [x, y + skipOffset]
                ];
                for (const [nx, ny] of neighbors) {
                    if (nx < 0 || nx >= offscreenCanvas.width || ny < 0 || ny >= offscreenCanvas.height) continue;
                    const idx = ny * offscreenCanvas.width + nx;
                    if (visited[idx]) continue;
                    const currColor = getPixelRGB(nx, ny);
                    const currHSV = rgbToHsv(currColor.r, currColor.g, currColor.b);
                    let hueDiff = Math.abs(refHSV.h - currHSV.h);
                    if (hueDiff > 180) hueDiff = 360 - hueDiff;
                    const satDiff = Math.abs(refHSV.s - currHSV.s);
                    const valDiff = Math.abs(refHSV.v - currHSV.v);
                    if (hueDiff <= hueTolerance && satDiff <= satTolerance && valDiff <= valTolerance) {
                        visited[idx] = 1;
                        queue.push([nx, ny]);
                    }
                }
            }
            isDetecting = false;
            return samplePixels;
        }

        function detectObjectEdgeDetection(canvasX, canvasY, skipLevel) {
            if (isDetecting) return [];
            isDetecting = true;
            if (!offscreenCanvas || !offscreenCtx) { isDetecting = false; return []; }
            imageData = getCachedImageData();
            const width = offscreenCanvas.width, height = offscreenCanvas.height;
            const scaleX = width / canvas.width, scaleY = height / canvas.height;
            const startX = Math.floor(canvasX * scaleX), startY = Math.floor(canvasY * scaleY);
            const skipOffset = skipLevel + 1;
            const edgeMap = computeEdgeMap();
            const edgeThreshold = tolSlider.value;
            const visited = new Uint8Array(width * height);
            const samplePixels = [];
            const queue = [[startX, startY]];
            visited[startY * width + startX] = 1;
            while (queue.length) {
                const [x, y] = queue.shift();
                if (edgeMap[y * width + x] < edgeThreshold) {
                    samplePixels.push({ x, y });
                    const neighbors = [
                        [x - skipOffset, y],
                        [x + skipOffset, y],
                        [x, y - skipOffset],
                        [x, y + skipOffset]
                    ];
                    for (const [nx, ny] of neighbors) {
                        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                        const idx = ny * width + nx;
                        if (visited[idx]) continue;
                        if (edgeMap[idx] < edgeThreshold) {
                            visited[idx] = 1;
                            queue.push([nx, ny]);
                        }
                    }
                }
            }
            isDetecting = false;
            return samplePixels;
        }

        function detectObject(state, canvasX, canvasY, skipLevel) {
            switch (state) {
                case 1:
                    return detectObjectRGBColorSorting(canvasX, canvasY, skipLevel);
                case 2:
                    return detectObjectEdgeDetection(canvasX, canvasY, skipLevel);
                default:
                    return detectObjectHSV(canvasX, canvasY, skipLevel);
            }
        }

        const getDiameter = () => parseInt(brushRangeInput.value, 10);
        const drawDot = (x, y) => {
            ctx.beginPath();
            ctx.arc(x, y, getDiameter() / 2, 0, Math.PI * 2);
            ctx.fillStyle = colorPickerInput.value || "#FF0000";
            ctx.fill();
        };

        const eraseDot = (x, y) => {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            ctx.arc(x, y, getDiameter() / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        };

        const drawLine = (x1, y1, x2, y2, action) => {
            const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
            for (let i = 0; i <= steps; i++) {
                const x = x1 + ((x2 - x1) * i) / steps;
                const y = y1 + ((y2 - y1) * i) / steps;
                action(x, y);
            }
        };

        const fillPath = (clearPath = false) => {
            if (!path.length) return;
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            path.forEach(point => ctx.lineTo(point.x, point.y));
            ctx.closePath();
            ctx.fillStyle = colorPickerInput.value || "#FF0000";
            ctx.fill();
            if (clearPath) path = [];
        };

        const saveState = () => {
            undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
            redoStack.length = 0;
        };

        canvas.addEventListener('mousedown', e => {
            const rect = canvas.getBoundingClientRect();
            const canvasX = e.clientX - rect.left;
            const canvasY = e.clientY - rect.top;
            lastX = canvasX;
            lastY = canvasY;
            firstX = canvasX;
            firstY = canvasY;
            path = [{ x: canvasX, y: canvasY }];
            drawing = true;
            setCustomCursorPosition(e.clientX, e.clientY);
            isErasing = (e.button === 2);
            if (selectedCanvasMode !== 'colorMatching') {
                isErasing ? eraseDot(canvasX, canvasY) : drawDot(canvasX, canvasY);
            }

            if (!isErasing && selectedCanvasMode === 'fillingMode') {
                // Draw a marker for the first point (e.g., a slightly larger red dot)
                ctx.beginPath();
                ctx.arc(canvasX, canvasY, 6, 0, 2 * Math.PI); // Adjust radius as needed
                ctx.fillStyle = customCursor.style.borderColor || 'red'; // Change color for visibility
                ctx.fill();
            }
        });

        const handleDrawing = (clientX, clientY) => {
            const rect = canvas.getBoundingClientRect();
            const canvasX = clientX - rect.left;
            const canvasY = clientY - rect.top;
            path.push({ x: canvasX, y: canvasY });
            if (isErasing) {
                drawLine(lastX, lastY, canvasX, canvasY, eraseDot);
            } else {
                if (selectedCanvasMode === 'fillingMode' && isClosedShape(path[0], { x: canvasX, y: canvasY })) {
                    fillPath(false);
                }
                if (selectedCanvasMode !== 'colorMatching') {
                    drawLine(lastX, lastY, canvasX, canvasY, drawDot);
                }
            }
            lastX = canvasX;
            lastY = canvasY;
        };

        let mouseMoveTimeout;

        canvas.addEventListener('mousemove', e => {
            setCustomCursorPosition(e.clientX, e.clientY);

            if (drawing && selectedCanvasMode !== 'colorMatching') {
                handleDrawing(e.clientX, e.clientY);
            }

            // Re-draw the marker on top
            if (selectedCanvasMode === 'fillingMode' && firstX && firstY) {
                ctx.beginPath();
                ctx.arc(firstX, firstY, 6, 0, 2 * Math.PI); // Keep marker at the start point
                ctx.fillStyle = customCursor.style.borderColor || 'red';
                ctx.fill();
            }

            if (selectedCanvasMode === 'colorMatching') {
                loadingSpinner.style.display = 'block';
                inputContainer.style.filter = 'brightness(50%)';
            }

            clearTimeout(mouseMoveTimeout);
            mouseMoveTimeout = setTimeout(() => {
                detectedObject(e);
            }, 50); // Adjust delay as needed
        });

        let processedPoints = [];

        function detectedObject(e) {
            if (selectedCanvasMode === 'colorMatching') {
                const rect = canvas.getBoundingClientRect();
                const canvasX = e.clientX - rect.left;
                const canvasY = e.clientY - rect.top;

                function getSelectedState() {
                    const checkboxes = document.querySelectorAll('#objectDetectionMethodComboBox input[type="checkbox"]');
                    let selectedNumber = null;

                    checkboxes.forEach(checkbox => {
                        if (checkbox && checkbox.checked) {
                            const parts = checkbox.id.split('_');
                            selectedNumber = parseInt(parts[0], 10);
                        }
                    });

                    return selectedNumber !== null ? selectedNumber : 0;
                }

                const selectedState = getSelectedState();
                const skipLevel = parseInt(dilationSlider.value / 3.125, 10);
                const detectedPoints = detectObject(selectedState, canvasX, canvasY, skipLevel);
                processedPoints = []; // Reset processed points

                if (detectedPoints.length) {
                    const originalPixels = new Set(detectedPoints.map(p => `${p.x},${p.y}`));
                    const dilateAmount = skipLevel * parseInt(1 + (brushRangeInput.value / 100));
                    const scaleX = offscreenCanvas.width / canvas.width;
                    const scaleY = offscreenCanvas.height / canvas.height;

                    if (detectionCtx) {
                        detectionCtx.clearRect(0, 0, detectionOverlay.width, detectionOverlay.height);
                        const imageData = detectionCtx.createImageData(detectionOverlay.width, detectionOverlay.height);
                        const data = imageData.data;

                        const processPixel = (x, y) => {
                            if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
                                const dispX = Math.floor(x / scaleX);
                                const dispY = Math.floor(y / scaleY);
                                const index = (dispY * detectionOverlay.width + dispX) * 4;

                                const isOriginal = originalPixels.has(`${x},${y}`);
                                data[index] = 255;
                                data[index + 1] = 0;
                                data[index + 2] = 0;
                                data[index + 3] = isOriginal ? 255 : 128;

                                processedPoints.push({ x, y }); // Save exact points
                            }
                        };

                        detectedPoints.forEach(p => {
                            if (dilateAmount === 0) {
                                processPixel(p.x, p.y);
                            } else {
                                for (let dx = -dilateAmount - 1; dx <= dilateAmount + 1; dx++) {
                                    for (let dy = -dilateAmount - 1; dy <= dilateAmount + 1; dy++) {
                                        processPixel(p.x + dx, p.y + dy);
                                    }
                                }
                            }
                        });

                        detectionCtx.putImageData(imageData, 0, 0);
                    }
                }

                loadingSpinner.style.display = 'none';
                inputContainer.style.display = 'block';
                inputContainer.style.filter = 'brightness(100%)';
            }
        }

        const finishDrawing = (e) => {
            if (!drawing) return;

            if (selectedCanvasMode === 'fillingMode' && isClosedShape(path[0], path[path.length - 1])) {
                fillPath(true);
            }

            if (selectedCanvasMode === 'colorMatching' && processedPoints.length) {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                processedPoints.forEach(p => {
                    if (p.x >= 0 && p.x < canvas.width && p.y >= 0 && p.y < canvas.height) {
                        const index = (p.y * canvas.width + p.x) * 4;
                        const color = hexToRGB(colorPickerInput.value || "#FF0000");

                        data[index] = color.r;
                        data[index + 1] = color.g;
                        data[index + 2] = color.b;
                        data[index + 3] = 255;
                    }
                });

                ctx.putImageData(imageData, 0, 0);
            }

            saveState();
            drawing = false;
            firstX = null;
            firstY = null;
        };

        canvas.addEventListener('mouseup', finishDrawing);
        canvas.addEventListener('mouseout', finishDrawing);

        const getTouchPos = (touch) => {
            const rect = canvas.getBoundingClientRect();
            return {
                x: touch.clientX - rect.left,
                y: touch.clientY - rect.top
            };
        };

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const { x, y } = getTouchPos(touch);
            lastX = x;
            lastY = y;
            firstX = x;
            firstY = y;
            path = [{ x, y }];
            drawing = true;
            setCustomCursorPosition(touch.clientX, touch.clientY);
            isErasing = false; // No right-click on touchscreens
            if (selectedCanvasMode !== 'colorMatching') {
                drawDot(x, y);
            }

            if (selectedCanvasMode === 'colorMatching') {
                loadingSpinner.style.display = 'block';
                inputContainer.style.filter = 'brightness(50%)';
            }

            detectedObject(touch);
        });

        let lastDetectionTime = 0;

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            setCustomCursorPosition(touch.clientX, touch.clientY);

            const now = Date.now();
            if (now - lastDetectionTime >= 25) {
                lastDetectionTime = now;
                detectedObject(touch);
            }

            if (!drawing) return;

            if (selectedCanvasMode !== 'colorMatching') {
                handleDrawing(touch.clientX, touch.clientY);
            }

            // Re-draw the marker on top
            if (selectedCanvasMode === 'fillingMode') {
                ctx.beginPath();
                ctx.arc(firstX, firstY, 6, 0, 2 * Math.PI); // Keep marker at the start point
                ctx.fillStyle = customCursor.style.borderColor || 'red';
                ctx.fill();
            }
        });


        canvas.addEventListener('touchend', finishDrawing);
        canvas.addEventListener('touchcancel', finishDrawing);
        canvas.addEventListener('contextmenu', e => e.preventDefault());

        canvas.addEventListener('wheel', e => {
            e.preventDefault();
            const sensitivity = 5;
            let newSize = Math.max(1, Math.min(200, parseInt(brushRangeInput.value, 10) - Math.sign(e.deltaY) * sensitivity));
            brushRangeInput.value = newSize;
            customCursor.style.width = `${newSize}px`;
            customCursor.style.height = `${newSize}px`;
            customCursor.style.left = `${e.clientX - newSize / 2}px`;
            customCursor.style.top = `${e.clientY - newSize / 2}px`;
            detectedObject(e);
        }, { passive: false });

        const clearButton = document.querySelector('.clear-button');
        const saveButton = document.querySelector('.save-button');
        const ctrlZButton = document.querySelector('.ctrl-z-button');

        clearButton.addEventListener('click', () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            showNotification(`Your canvas has been cleared.`, 'Canvas Update', 'default');
        });

        saveButton.addEventListener('click', () => {
            saveCanvas(canvas);
        });

        ctrlZButton.addEventListener('click', () => {
            if (undoStack.length > 1) {
                redoStack.push(undoStack.pop());
                ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
                showNotification(`Undo successful.`, 'Canvas Update', 'default');
            }
            else {
                showNotification(`No undo found.`, 'Canvas Update', 'Canvas Alert');
            }
        });

        document.addEventListener('keydown', e => {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
            if (e.ctrlKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (undoStack.length > 1) {
                    redoStack.push(undoStack.pop());
                    ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
                }
            } else if (e.ctrlKey && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                if (redoStack.length) {
                    const state = redoStack.pop();
                    undoStack.push(state);
                    ctx.putImageData(state, 0, 0);
                }
            }
        });

        const closeButton = wrapper.querySelector('.close-button');
        const startProcessButton = document.getElementById('startProcessCanvas');

        startProcessButton.addEventListener('click', () => {
            saveCanvas(canvas);
            document.body.removeChild(wrapper);
            document.body.removeChild(customCursor);
            resolve({ canvas, ctx, image: localStorage.getItem(`canvas_${id}`) }); 
        });

        closeButton.addEventListener('click', () => {
            document.body.removeChild(wrapper);
            document.body.removeChild(customCursor);
            showNotification(`Process cancelled.`, 'Canvas Alert', 'warning');
            resolve({ didFail: 'true' }); 

        });

        wrapper.addEventListener('mousedown', (event) => {
            if (event.target === wrapper) {
                if (!isCanvasEmpty(canvas)) {
                    saveCanvas(canvas);
                    document.body.removeChild(wrapper);
                    document.body.removeChild(customCursor);
                    resolve({ canvas, ctx, image: localStorage.getItem(`canvas_${id}`) }); 
                } else {
                    showNotification(`No drawing detected.`, 'Canvas Alert', 'warning');
                    resolve({ didFail: 'true' }); 
                }
            }
        });
    });
}
function testBlobUrl(blobUrl, mimeType) {
    return new Promise((resolve) => {
        let media;
        const isVideo = mimeType.startsWith('video/');
        const isImage = mimeType.startsWith('image/');

        if (isVideo) {
            media = document.createElement('video');
            media.preload = 'auto';
        } else if (isImage) {
            media = document.createElement('img');
        } else {
            resolve(false);
            return;
        }

        media.src = blobUrl;
        media.onloadeddata = () => resolve(true);
        media.onload = () => resolve(true);
        media.onerror = () => resolve(false);
        setTimeout(() => resolve(false), 5000);
    });
}
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}
export const handleUpload = async (event, dataBaseIndexName, dataBaseObjectStoreName, databases) => {
    try {
        if (!window.indexedDB) {
            alert('Your browser does not support IndexedDB.');
            return;
        }

        const db = await openDB(dataBaseIndexName, dataBaseObjectStoreName).catch((error) => {
            if (error.name === 'QuotaExceededError') {
                alert('Storage limit exceeded. Please free up space or clear cache.');
            } else if (error.name === 'SecurityError') {
                alert('Database access is restricted. Please check browser settings or disable private mode.');
            } else if (error.message && error.message.includes('BlobURLs')) {
                alert(
                    'It seems there is an issue with Blob URLs not being supported in your browser or environment.\n\n' +
                    'To resolve this:\n' +
                    '- Ensure your browser is updated to the latest version (Chrome, Firefox, Edge).\n' +
                    '- Avoid using the application in private/incognito mode.\n' +
                    '- Disable browser extensions that may block IndexedDB or Blob URLs.\n\n' +
                    'If the problem persists, try switching to a different browser or device.'
                );
            } else if (error.message && error.message.includes('backing store')) {
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
            return null;
        });
        if (!db) return;

        const files = Array.from(event.target.files).filter((file) => {
            if (dataBaseObjectStoreName === 'faces')
                return file.type.startsWith('image/') && file.type !== 'image/gif';
            return file.type.startsWith('image/') || file.type.startsWith('video/');
        });

        if (files.length === 0) {
            alert('No valid files found for upload.');
            return;
        }

        const mediaContainer = document.querySelector(`.${dataBaseObjectStoreName}`);
        const wrapper = document.createDocumentFragment();
        const newMedia = [];

        const processFile = async (file) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const arrayBuffer = e.target.result;
                        const blob = new Blob([arrayBuffer], { type: file.type });
                        const tempUrl = URL.createObjectURL(blob);
                        const canDisplay = await testBlobUrl(tempUrl, file.type).catch(() => false);
                        URL.revokeObjectURL(tempUrl);

                        let id, timestamp;
                        let base64Data = null;

                        if (canDisplay) {
                            ({ id, timestamp } = await addToDB(db, blob));
                        } else {
                            base64Data = `data:${file.type};base64,${arrayBufferToBase64(arrayBuffer)}`;
                            ({ id, timestamp } = await addToDB(db, base64Data));
                        }

                        await saveCountIndex(databases);

                        newMedia.push({
                            id,
                            timestamp,
                            blob,
                            base64Data,
                            isVideo: file.type.startsWith('video/') && file.type !== 'image/gif',
                        });

                        resolve({ id, timestamp });
                    } catch (error) {
                        alert(`Processing media failed: ${error.message || error}`);
                        reject(error);
                    }
                };

                reader.onerror = (err) => reject(err);
                reader.readAsArrayBuffer(file);
            });
        };

        let loadingSpinner = document.createElement('div');
        loadingSpinner.className = 'loading-screen';
        loadingSpinner.style.position = 'absolute';

        document.querySelectorAll('body main').forEach(main => {
            if (main)
                main.style.filter = 'brightness(50%)';
        });

        document.documentElement.appendChild(loadingSpinner);

        await Promise.all(files.map(processFile));

        loadingSpinner.remove();
        document.querySelectorAll('body main').forEach(main => {
            if (main)
                main.style.filter = 'none';
        });

        // deactivate currently active containers
        const activeContainers = mediaContainer.querySelectorAll('.data-container.active');
        if (activeContainers.length > 0) {
            for (const container of activeContainers) {
                container.classList.remove('active');
                const element = container.querySelector('img, iframe, video, initial');
                const id = element ? parseInt(element.getAttribute('id'), 10) : null;
                if (id) {
                    await updateActiveState(db, id, false).catch(err => {
                        alert(`Update failed for id ${id}: ${err}`);
                    });
                }
            }
        }

        newMedia.reverse();
        const videosToPlay = [];

        for (const { id, timestamp, blob, base64Data, isVideo } of newMedia) {
            const element = document.createElement('div');
            element.className = 'data-container';
            element.setAttribute('tooltip', '');
            element.setAttribute('oncontextmenu', 'return false;');
            handleContextMenu(element);

            if (isVideo) {
                // tooltip logic for inputs
                let tooltip = null;
                if (dataBaseObjectStoreName === 'inputs') {
                    tooltip = document.createElement('div');
                    tooltip.className = 'tooltip tooltip-fast cursor';
                    tooltip.textContent = 'Loading...';
                    tooltip.style.display = 'none';
                    tooltip.style.position = 'fixed';
                    function updateTooltipPosition(event) {
                        tooltip.style.left = `${event.clientX}px`;
                        tooltip.style.top = `${event.clientY - 15}px`;
                    }
                    element.addEventListener('mouseenter', () => document.addEventListener('mousemove', updateTooltipPosition));
                    element.addEventListener('mouseleave', () => document.removeEventListener('mousemove', updateTooltipPosition));
                    element.appendChild(tooltip);
                }

                const video = document.createElement('video');
                video.controls = false;
                video.setAttribute('timestamp', timestamp);
                video.id = id;
                video.preload = 'auto';
                video.autoplay = true;
                video.muted = true;
                video.playsInline = true;
                try { video.disablePictureInPicture = true; } catch (e) { }

                const playbackSrc = blob ? URL.createObjectURL(blob) : (base64Data != null ? base64Data : '');
                if (playbackSrc) video.src = playbackSrc;

                const del = document.createElement('div');
                del.className = 'delete-icon';

                element.appendChild(video);
                element.appendChild(del);

                // store for later play call
                videosToPlay.push({ video, objectUrl: playbackSrc, id });

                // page-specific metadata
                if (dataBaseObjectStoreName === 'inputs' && pageName === 'face-swap') {
                    const keepFPS = document.getElementById('keepFPS');
                    const fpsSlider = document.getElementById('fps-slider');
                    const removeBanner = document.getElementById('removeBanner');

                    function handleMetadataUpdate(dataFps, dataDuration) {
                        const t = element.querySelector('.tooltip');
                        if (t && dataFps) {
                            t.style.display = 'flex';
                            const fpsSliderValue = keepFPS && !keepFPS.checked ? fpsSlider.value : 60;
                            const fps = Math.min(fpsSliderValue, dataFps);
                            const videoDurationTotalFrames = Math.floor(dataDuration * fps);
                            const singleCreditForTotalFrameAmount = 120;
                            const removeBannerStateMultiplier = removeBanner && removeBanner.checked ? 2 : 1;
                            const neededCredits = Math.floor(
                                Math.max(1, videoDurationTotalFrames / singleCreditForTotalFrameAmount) *
                                removeBannerStateMultiplier
                            );
                            t.textContent = `${neededCredits} Credits`;
                        }
                    }

                    calculateMetadata(video, handleMetadataUpdate);
                    video.addEventListener('loadedmetadata', async () => await calculateMetadata(video, handleMetadataUpdate));

                    [keepFPS, fpsSlider, removeBanner].forEach(el => {
                        if (el) el.addEventListener('change', () => {
                            const dataFps = video.getAttribute('data-fps');
                            handleMetadataUpdate(dataFps, video.duration);
                        });
                    });
                }

            } else {
                // image logic
                const img = document.createElement('img');
                img.setAttribute('timestamp', timestamp);
                img.id = id;
                img.src = blob ? URL.createObjectURL(blob) : (base64Data != null ? base64Data : '');
                img.alt = 'Uploaded Photo';

                const del = document.createElement('div');
                del.className = 'delete-icon';

                if (dataBaseObjectStoreName === 'inputs') {
                    const tooltip = document.createElement('div');
                    tooltip.className = 'tooltip tooltip-fast cursor';
                    tooltip.textContent = 'Loading...';
                    tooltip.style.display = 'none';
                    tooltip.style.position = 'fixed';
                    function updateTooltipPosition(event) {
                        tooltip.style.left = `${event.clientX}px`;
                        tooltip.style.top = `${event.clientY - 15}px`;
                    }
                    element.addEventListener('mouseenter', () => document.addEventListener('mousemove', updateTooltipPosition));
                    element.addEventListener('mouseleave', () => document.removeEventListener('mousemove', updateTooltipPosition));
                    element.appendChild(tooltip);

                    if (pageName === 'face-swap') {
                        const removeBanner = document.getElementById("removeBanner");
                        function handleMetadataUpdate() {
                            const t = element.querySelector('.tooltip');
                            if (t) {
                                t.style.display = 'flex';
                                let neededCredits = removeBanner && removeBanner.checked ? 2 : 1;
                                t.textContent = `${neededCredits} Credits`;
                            }
                        }
                        handleMetadataUpdate();
                        if (removeBanner) removeBanner.addEventListener('change', () => handleMetadataUpdate());
                        calculateMetadata(img, null);
                    }
                }

                element.appendChild(img);
                element.appendChild(del);
            }

            wrapper.appendChild(element);

            if (id === newMedia[newMedia.length - 1].id) {
                element.classList.add('active');
                if (id) {
                    if (pageName === 'face-swap') displayStoredData(element, dataBaseObjectStoreName);
                    await updateActiveState(db, id, true).catch(err => {
                        alert(`Update failed for id ${id}: ${err}`);
                    });
                }
            }
        }

        mediaContainer.insertBefore(wrapper, mediaContainer.firstChild);
        localStorage.setItem(`${pageName}_${dataBaseObjectStoreName}-count`, await countInDB(db));

        // play videos
        videosToPlay.forEach(({ video, objectUrl }) => {
            video.load();
            video.play().catch(() => { });
        });

    } catch (error) {
        alert(`Upload failed: ${error.message || error}`);
    }
};

export const setupFileUpload = async ({
    buttonId,
    inputId,
    dataBaseIndexName,
    dataBaseObjectStoreName,
    databases,
    changeHandler
}) => {
    const input = document.getElementById(inputId);
    const buttons = document.getElementsByClassName(buttonId);
    const modal = document.getElementById(`upload-options-modal-${inputId}`);
    if (!input || !buttons.length || !modal) return;

    [...buttons].forEach(button => {
        button.addEventListener('click', e => {
            console.log(modal);
            e.stopPropagation();
            modal.classList.toggle('hidden');
            if (!modal.classList.contains('hidden')) {
                const w = modal.offsetWidth, h = modal.offsetHeight;
                const l = Math.min(Math.max(0, e.clientX - w / 2), window.innerWidth - w);
                const t = Math.min(Math.max(0, e.clientY - h / 4), window.innerHeight - h);
                modal.style.position = 'fixed';
                modal.style.left = `${l}px`;
                modal.style.top = `${t}px`;
            }
        });

        button.addEventListener('dragover', e => {
            e.preventDefault();
            button.classList.add('dragover');
        });

        button.addEventListener('dragleave', () => {
            button.classList.remove('dragover');
        });

        button.addEventListener('drop', async e => {
            e.preventDefault();
            button.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length) {
                const mockEvent = { target: { files } };
                await changeHandler(mockEvent, dataBaseIndexName, dataBaseObjectStoreName, databases);
            }
        });
    });

    modal.addEventListener('click', e => e.stopPropagation());
    document.addEventListener('click', () => modal.classList.add('hidden'));

    document.getElementById(`upload-device-${inputId}`)
        .addEventListener('click', async () => {
            simulateFullClick(input);
            modal.classList.add('hidden');
        });

    document.getElementById(`upload-link-${inputId}`)
        .addEventListener('click', () => {
            const linkInput = document.getElementById(`link-upload-${inputId}`);
            linkInput.classList.remove('hidden');
            document.getElementById(`upload-link-${inputId}`).classList.add('hidden');
            linkInput.focus();
        });
    const linkInput = document.getElementById(`link-upload-${inputId}`);
    linkInput.addEventListener('keydown', async e => {
        if (e.key !== 'Enter') return;
        const urlRaw = e.target.value.trim();
        if (!urlRaw) {
            alert('Please enter a valid URL.');
            return;
        }

        const url = urlRaw.startsWith('http') ? urlRaw : `${location.origin}${urlRaw}`;
        const isDirectVideo = /\.(mp4|webm|ogg|mov|mkv)(\?.*)?$/i.test(url);
        const isEmbedPath = /\/embed\//.test(url);

        const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
        const tiktokMatch = url.match(/tiktok\.com\/(?:@[\w.-]+\/video\/|embed\/)(\d+)/);
        const igMatch = /instagram\.com\/(p|reel|tv)\//.test(url);
        const twitterMatch = /(?:twitter\.com|x\.com)\/[^\/]+\/status\/(\d+)/.test(url);
        const deepanyMatch = url.match(/deepany\.com\/view_video\.php\?viewkey=([\w]+)/);

        const db = await openDB(dataBaseIndexName, dataBaseObjectStoreName);
        const { id, timestamp } = await addToDB(db, url);
        saveCountIndex(databases);

        const mediaContainer = document.querySelector(`.${dataBaseObjectStoreName}`);
        const wrapper = document.createElement('div');
        wrapper.className = 'data-container';
        wrapper.setAttribute('tooltip', '');
        wrapper.setAttribute('oncontextmenu', 'return false;');
        handleContextMenu(wrapper);

        if (isDirectVideo) {
            wrapper.innerHTML =
                `<video timestamp="${timestamp}" id="${id}" preload="auto" autoplay muted playsinline disablePictureInPicture>` +
                `<source src="${url}">Your browser does not support the video tag.</video>` +
                `<div class="delete-icon"></div>`;
        } else if (isEmbedPath || ytMatch || tiktokMatch || igMatch || twitterMatch || deepanyMatch) {
            let embedSrc = url;
            if (ytMatch) {
                embedSrc = `https://www.youtube.com/embed/${ytMatch[1]}`;
            } else if (tiktokMatch) {
                embedSrc = `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`;
            } else if (igMatch) {
                embedSrc = `https://www.instagram.com/embed${new URL(url).pathname}`;
            } else if (twitterMatch) {
                embedSrc = `https://twitframe.com/show?url=${encodeURIComponent(url)}`;
            } else if (deepanyMatch) {
                embedSrc = `https://www.deepany.com/embed/${deepanyMatch[1]}`;
            }

            wrapper.innerHTML =
                `<iframe
                timestamp="${timestamp}"
                id="${id}"
                src="${embedSrc}"
                frameborder="0"
                scrolling="no"
                allowfullscreen
                style="
                  width: calc(var(--input-size) - 2px);
                  height: calc(var(--input-size) - 2px);
                  border-radius: 50%;
                  position: relative;
                ">
             </iframe>` +
                `<div class="delete-icon"></div>`;
        } else {
            alert('Unsupported link type.');
            return;
        }

        mediaContainer.insertBefore(wrapper, mediaContainer.firstChild);
        linkInput.value = '';
        modal.classList.add('hidden');

        for (const old of mediaContainer.querySelectorAll('.data-container.active')) {
            old.classList.remove('active');
            const el = old.querySelector('img, video, iframe, initial');
            const idx = parseInt(el?.getAttribute('id'));
            if (!isNaN(idx)) await updateActiveState(db, idx, false);
        }

        wrapper.classList.add('active');
        await updateActiveState(db, id, true);

        if (pageName === 'face-swap')
            displayStoredData(wrapper, dataBaseObjectStoreName);

        localStorage.setItem(
            `${pageName}_${dataBaseObjectStoreName}-count`,
            await countInDB(db)
        );
    });

    input.addEventListener('change', async e => {
        await changeHandler(e, dataBaseIndexName, dataBaseObjectStoreName, databases);
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
let downloadFile = false;
export function getFetchableServerAdresses() {
    return [...fetchableServerAddresses]
}
export function setFetchableServerAdresses(newValue) {
    fetchableServerAddresses.length = 0;
    fetchableServerAddresses.push(...newValue)
}

function updateGenerateButtonText() {
    let handleProcessBtn = document.getElementById('handleProcessBtn');
    let handleProcessText = handleProcessBtn.querySelector('span');

    if (handleProcessBtn.getAttribute('processing') === 'true') {
        handleProcessBtn.disabled = false;
    }

    if (pageName === 'video-generator' || pageName === 'inpaint') {
        const quality = getCheckedCheckboxIdFromCombobox('quality', 3);
        const duration = getCheckedCheckboxIdFromCombobox('duration', 3);
        const model = getCheckedCheckboxIdFromCombobox('model', '1.5');
        const removeBanner = document.getElementById('removeBanner').checked;
        const audioContainer = document.getElementById('audioContainer');
        if (audioContainer) {
            const generateAudio = document.getElementById('generateAudio').checked;
            audioContainer.style.display = !generateAudio ? 'none' : 'unset';
        }

        let neededCredits = 1;

        const activeVideoInput = document.querySelector(".inputs .data-container.active video");
        const referenceImageCheckbox = document.getElementById('referenceImageMethod');
        if (referenceImageCheckbox) {
            /*const promptMethodCheckbox = document.getElementById('promptMethod');
            if (!activeVideoInput) {
                if (promptMethodCheckbox && referenceImageCheckbox) {
                    promptMethodCheckbox.checked = true;
                    promptMethodCheckbox.dispatchEvent(new Event('change', { bubbles: true }));

                    referenceImageCheckbox.disabled = true;
                    referenceImageCheckbox.checked = false;
                    referenceImageCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                }
            } else  referenceImageCheckbox.disabled = false;*/

            referenceImageCheckbox.disabled = true;
            referenceImageCheckbox.checked = false;
        }

        if (pageName === 'video-generator' || activeVideoInput) {
            neededCredits *= Number(duration);
            neededCredits *= 1 + (Number(quality) - 1) * 0.5;
        }

        if (removeBanner) neededCredits *= 2;

        if (pageName === 'video-generator')
            neededCredits /= 2;
        neededCredits = Math.max(1, Math.round(neededCredits));

        if (handleProcessText) {
            handleProcessText.textContent = `Generate (${neededCredits} Credit${neededCredits > 1 ? 's' : ''})`;
            handleProcessBtn.setAttribute('processing', 'false');
        }
    }
    else {
        if (handleProcessText) {
            handleProcessText.textContent = `Generate`;
            handleProcessBtn.setAttribute('processing', 'false');
        }
    }
}

let isProcessing = false;

function setProcessingState(state) {
    let handleProcessBtn = document.getElementById('handleProcessBtn');
    let handleProcessText = handleProcessBtn.querySelector('span');

    isProcessing = state;
    if (!isProcessing) {
        updateGenerateButtonText();
    }
    else {
        handleProcessBtn.disabled = false;
        handleProcessText.textContent = 'Cancel';
        handleProcessBtn.setAttribute('processing', 'true');
    }
}

function getProcessingState() {
    return isProcessing;
}

export async function checkServerStatus(databases, userId) {
    const cacheKey = `${pageName}-serverData-${version}`;
    const ttl = 6 * 60 * 60 * 1000;
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
            const snapshotPromise = () => getDocsSnapshot('servers');
            setFetchableServerAdresses((await fetchServerAddresses(snapshotPromise)).reverse());
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

    updateGenerateButtonText();

    if (pageName === 'video-generator' || pageName === 'inpaint') {
        ['removeBanner', 'enhanceResolution', 'enhanceDetails', 'generateAudio'].forEach(id => {
            if (id) {
                const el = document.getElementById(id);
                if (el) el.addEventListener('change', updateGenerateButtonText);
            }
        });

        ['quality', 'duration', 'aspectRatio', 'language', 'model', 'resolution'].forEach(id => {
            if (id) {
                const box = document.getElementById(id);
                if (box) {
                    box.addEventListener('click', e => {
                        if (e.target.closest('li.item')) {
                            setTimeout(updateGenerateButtonText, 0);
                        }
                    });
                }
            }
        });
    }

    showDailyCredits();
    const serverWithUserRequest = findServerWithUserRequest(results, userId);
    if (serverWithUserRequest) {
        setProcessingState(true);
        handleUserRequest(serverWithUserRequest, databases, userId);
    } else {
        setProcessingState(false);
        if (downloadFile) {
            const db = await openDB(`outputDB-${pageName}`, 'outputs');
            const outputs = (await getFromDB(db)).reverse();
            const lastOutput = outputs[outputs.length - 1];

            if (!lastOutput.url) {
                console.error("URL not found in output.");
                return;
            }

            const data = await fetchProcessState(lastOutput.url);
            setClientStatus(data.server);
            showNotification(`Request ${data?.status} With Status ${data?.server}.`, 'Fetch Information', 'default');

            if (data?.status === 'completed') {
                updateDownloadFile(false, databases, userId);
                setCurrentUserDoc(getDocSnapshot);
                await handleLastOutputDownload(lastOutput, databases);
            }
        }
    }
}
function has24HoursPassed(lastCreditEarned, currentTime) {
    return currentTime - lastCreditEarned >= 24 * 60 * 60 * 1000;
}

export function getCheckedCheckboxIdFromCombobox(comboboxId, callback) {
    const container = document.getElementById(comboboxId);
    if (!container) return callback;

    const checkedItem = container.querySelector('li.item.checked');
    if (!checkedItem) return callback;

    const checkbox = checkedItem.querySelector('input[type="checkbox"]');
    return checkbox ? checkbox.id : callback;
} 

export function cannotBeBanned(userDoc) {
    if (!userDoc)
        return true;

    return userDoc?.paid >= 1;
}

export function hasSubscriptionPlan(userDoc) {
    if (!userDoc)
        return false;

    const deadlines = [userDoc.deadline, userDoc.deadlineDF, userDoc.deadlineDV, userDoc.deadlineDA, userDoc.deadlineDN].filter(Boolean);
    const now = new Date();

    for (const d of deadlines) {
        const deadline = new Date(d.seconds * 1000 + (d.nanoseconds || 0) / 1000000);
        if (deadline.getTime() > now.getTime()) {
            return true;
        }
    }

    return false;
}

async function showDailyCredits() {
    const userDoc = await getUserDoc();
    if (document.getElementById('wrapper') || !userDoc || !userDoc || userDoc.dailyCredits > 5) return;

    if (hasSubscriptionPlan(userDoc))
        return;

    const serverTimeAtLastFetch = Number(localStorage.getItem('serverTimeAtLastFetch')) || 0;
    const localTimeAtLastFetch = Number(localStorage.getItem('localTimeAtLastFetch')) || 0;
    const nextCreditTime = Number(localStorage.getItem('nextCreditTime')) || 0;
    const simulatedServerTime = serverTimeAtLastFetch + (Date.now() - localTimeAtLastFetch);
    if (simulatedServerTime < nextCreditTime) {
        const diffMs = nextCreditTime - simulatedServerTime;
        const diffHours = diffMs / (1000 * 60 * 60);
        return;
    }

    const serverDocSnapshot = () => getDocSnapshot('servers', '3090-1');
    const serverAddressAPI = await fetchServerAddress(serverDocSnapshot, 'API');
    let lastCancellationTime = Number(localStorage.getItem('lastCancellation')) || 0;
    let currentTime = null;
    let timePassed = false;

    try {
        const response = await fetchWithRandom(`${serverAddressAPI}/get-time`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        const timeData = await response.json();
        currentTime = timeData.currentTime;

        localStorage.setItem('serverTimeAtLastFetch', currentTime);
        localStorage.setItem('localTimeAtLastFetch', Date.now());

        const diffInMs = currentTime - lastCancellationTime;
        const diffInHours = diffInMs / (1000 * 60 * 60);

        const lastCreditEarned = userDoc.lastCreditEarned || 0;
        const newNextCreditTime = lastCreditEarned + 24 * 60 * 60 * 1000;
        localStorage.setItem('nextCreditTime', newNextCreditTime);

        if (has24HoursPassed(lastCreditEarned, currentTime))
            timePassed = true;

        if (!has24HoursPassed(lastCancellationTime, currentTime))
            timePassed = false;
    } catch (error) {
        console.error(error.message);
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

                        <p id="contactSupport" style="cursor: pointer;" onclick="window.location.href='mailto:official@deepany.ai';">
                            Contact support? Email: official@deepany.ai
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
        wrapper.remove();
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
    if (!linkElement || !userDoc.referral) {
        wrapper.remove();
        return;
    }

    linkElement.value = `https://deepany.ai/?referral=${encodeURIComponent(userDoc.referral)}`;
    if (!linkElement.value) {
        wrapper.remove();
        return;
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
            const [userInternetProtocol, uniqueId] = await Promise.all([getUserInternetProtocol(), ensureUniqueId()]);
            const isVPN = userInternetProtocol ? (userInternetProtocol?.isVPN || userInternetProtocol?.isProxy || userInternetProtocol?.isTOR) : false;
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
                    uniqueId,
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

    const MINUTES_MS = 30 * 1000;

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
                infoMessage.textContent = `Daily credits won't stack up. To claim all, spend your remaining ${currentCredits} daily credits first. Do you still want to proceed?`;
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
    intervalId = setInterval(() => checkServerStatus(databases, userId), downloadFile ? 1000 : 10000)
};
export function updateDownloadFile(newValue, databases, userId) {
    downloadFile = newValue;
    setDynamicInterval(databases, userId)
}
export function calculateNewTime(remainingTime, queueAmount) {
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
    updateDownloadFile(true, databases, userId)
}
export function getSelectedInputId(checkboxes) {
    for (let checkbox of checkboxes) {
        if (!checkbox)
            return null;

        if (checkbox && checkbox.checked) {
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
            if (container.classList.contains("searchable")) {
                let searchInput = document.createElement("input");
                searchInput.type = "text";
                searchInput.classList.add("search-input");
                searchInput.placeholder = "Search...";
                listItems.insertBefore(searchInput, listItems.firstChild);
                searchInput.addEventListener("pointerup", (event) => {
                    event.stopPropagation();
                });

                const normalizeText = (text) => {
                    const normalized = text
                        .replace(/([a-z])([A-Z])/g, '$1 $2')
                        .toLowerCase()
                        .replace(/ya/g, "") // remove "ya"
                        .replace(/[^a-z0-9\s]/g, "")
                        .replace(/\s+/g, " ")
                        .trim();

                    console.log(`Normalized "${text}" -> "${normalized}"`);
                    return normalized;
                };

                searchInput.addEventListener("input", (e) => {
                    const searchTerm = normalizeText(e.target.value);
                    const searchWords = searchTerm.split(" ").filter(word => word);
                    const matchingItems = [];

                    items.forEach(item => {
                        const label = item.querySelector("label span");
                        const normalizedItemText = label ? normalizeText(label.textContent) : "";
                        const allWordsMatch = searchWords.every(word => normalizedItemText.includes(word));

                        if (allWordsMatch) {
                            item.style.display = "flex";
                            const matchIndex = Math.min(...searchWords.map(word => normalizedItemText.indexOf(word)).filter(i => i !== -1));
                            console.log(`Match found at index ${matchIndex}`);
                            matchingItems.push({ item, index: matchIndex });
                        } else {
                            item.style.display = "none";
                        }
                    });

                    matchingItems.sort((a, b) => a.index - b.index);
                    Array.from(listItems.children).forEach(child => {
                        if (!child.classList.contains("search-input")) {
                            listItems.removeChild(child);
                        }
                    });

                    matchingItems.forEach(match => {
                        listItems.appendChild(match.item);
                    });
                });
            }

            if (sliderInput) {
                sliderInput.addEventListener("pointerup", (event) => {
                    event.stopPropagation();
                });
            }
            if (options.selectBtnSelector === '.combobox') {
                const hasTextarea = !!container.querySelector('textarea');
                if (!hasTextarea) {
                    items.forEach(item => {
                        const checkbox = item.querySelector('input[type="checkbox"]');
                        if (checkbox && checkbox.checked) {
                            items.forEach(i => {
                                const cb = i.querySelector('input[type="checkbox"]');
                                cb.checked = false;
                                i.classList.remove("checked");
                            });
                            if (sliderInput)
                                sliderInput.parentElement.style.display = 'flex';
                            checkbox.checked = true;
                            item.classList.add("checked");
                            btnText.innerText = title + ": " + checkbox.parentElement.querySelector('span').textContent.trim();
                        } else {
                            const anyChecked = [...items].some(i => {
                                const cb = i.querySelector('input[type="checkbox"]');
                                return cb ? cb.checked : false;
                            });
                            if (!anyChecked) {
                                btnText.innerText = title + ": " + (defaultTitle ? defaultTitle : "Not Specified");
                                if (sliderInput)
                                    sliderInput.parentElement.style.display = 'none';
                            }
                            item.classList.remove("checked");
                        }

                        if (checkbox) checkbox.addEventListener("change", () => {
                            if (checkbox && checkbox.checked) {
                                items.forEach(i => {
                                    const cb = i.querySelector('input[type="checkbox"]');
                                    cb.checked = false;
                                    i.classList.remove("checked");
                                });
                                if (sliderInput)
                                    sliderInput.parentElement.style.display = 'flex';
                                checkbox.checked = true;
                                item.classList.add("checked");
                                btnText.innerText = title + ": " + checkbox.parentElement.querySelector('span').textContent.trim();
                            } else {
                                const anyChecked = [...items].some(i => i.querySelector('input[type="checkbox"]').checked);
                                if (!anyChecked) {
                                    btnText.innerText = title + ": " + (defaultTitle ? defaultTitle : "Not Specified");
                                    if (sliderInput)
                                        sliderInput.parentElement.style.display = 'none';
                                }
                                item.classList.remove("checked");
                            }
                        });
                    });
                } else {
                    items.forEach(item => {
                        const checkbox = item.querySelector('input[type="checkbox"]');
                        const textarea = item.querySelector('textarea');

                        const updateDisplay = () => {
                            // find the checked checkbox
                            const checkedCheckboxItem = [...items].find(i => i.querySelector('input[type="checkbox"]')?.checked);
                            const selectedCheckboxId = checkedCheckboxItem
                                ? checkedCheckboxItem.querySelector('span')?.textContent.trim()
                                : defaultTitle;

                            // find the textarea (if any)
                            const textareaItem = [...items].find(i => i.querySelector('textarea'));
                            const value = textareaItem?.querySelector('textarea')?.value.trim() || '';
                            const keyCount = value.replace(/[, ]/g, '').length;

                            let displayText = selectedCheckboxId;
                            if (keyCount > 1) {
                                displayText = checkedCheckboxItem && selectedCheckboxId ? selectedCheckboxId + ', ' + value : value;
                            }

                            btnText.innerText = title + ": " + displayText;
                        };


                        updateDisplay();

                        if (checkbox) {
                            checkbox.addEventListener('change', () => {
                                if (checkbox.checked) {
                                    items.forEach(i => {
                                        const cb = i.querySelector('input[type="checkbox"]');
                                        if (cb) {
                                            cb.checked = false;
                                            i.classList.remove('checked');
                                        }
                                    });
                                    checkbox.checked = true;
                                    item.classList.add('checked');
                                } else {
                                    item.classList.remove('checked');
                                }
                                updateDisplay();
                            });
                        }

                        if (textarea) {
                            textarea.addEventListener('input', updateDisplay);
                        }
                    });
                }
            }
            else if (options.selectBtnSelector === '.multibox') {
                items.forEach(item => {
                    const checkbox = item.querySelector('input[type="checkbox"]');
                    if (checkbox) {
                        const checkedItems = container.querySelectorAll(".item.checked input[type='checkbox']");
                        const selectedNames = Array.from(checkedItems).map(checkbox => {
                            const label = checkbox.parentElement.querySelector('span');
                            return label ? label.textContent.trim() : '';
                        }).filter(name => name !== '');
                        btnText.innerText = selectedNames.length > 0 ? selectedNames.join(', ') : btnText.getAttribute("title");
                        if (checkbox) checkbox.addEventListener("change", () => {
                            item.classList.toggle("checked", checkbox.checked);
                            const checkedItems = container.querySelectorAll(".item.checked input[type='checkbox']");
                            const selectedNames = Array.from(checkedItems).map(checkbox => {
                                const label = checkbox.parentElement.querySelector('span');
                                return label ? label.textContent.trim() : '';
                            }).filter(name => name !== '');
                            btnText.innerText = selectedNames.length > 0 ? selectedNames.join(', ') : btnText.getAttribute("title");
                        });
                    }
                });
            } else {
                items.forEach(item => {
                    const checkbox = item.querySelector('input[type="checkbox"]');
                    if (checkbox && checkbox.checked) {
                        items.forEach(i => {
                            const cb = i.querySelector('input[type="checkbox"]');
                            cb.checked = false;
                            i.classList.remove("checked");
                        });
                        if (sliderInput)
                            sliderInput.parentElement.style.display = 'flex';
                        checkbox.checked = true;
                        item.classList.add("checked");
                        btnText.innerText = title + ": " + checkbox.parentElement.querySelector('span').textContent.trim();
                    } else {
                        const anyChecked = [...items].some(i => i.querySelector('input[type="checkbox"]').checked);
                        if (!anyChecked) {
                            btnText.innerText = title + ": " + (defaultTitle ? defaultTitle : "Default");
                            if (sliderInput)
                                sliderInput.parentElement.style.display = 'none';
                        }
                        item.classList.remove("checked");
                    }
                    if (checkbox) checkbox.addEventListener("change", () => {
                        if (checkbox && checkbox.checked) {
                            items.forEach(i => {
                                const cb = i.querySelector('input[type="checkbox"]');
                                cb.checked = false;
                                i.classList.remove("checked");
                            });
                            if (sliderInput)
                                sliderInput.parentElement.style.display = 'flex';
                            checkbox.checked = true;
                            item.classList.add("checked");
                            btnText.innerText = title + ": " + checkbox.parentElement.querySelector('span').textContent.trim();
                        } else {
                            const anyChecked = [...items].some(i => i.querySelector('input[type="checkbox"]').checked);
                            if (!anyChecked) {
                                btnText.innerText = title + ": " + (defaultTitle ? defaultTitle : "Default");
                                if (sliderInput)
                                    sliderInput.parentElement.style.display = 'none';
                            }
                            item.classList.remove("checked");
                        }
                    });
                });
            }

            if (listItems) {
                listItems?.addEventListener("mouseenter", () => {
                    if (tooltip) tooltip.style.display = "none";
                });
                listItems?.addEventListener("mouseleave", () => {
                    if (tooltip) tooltip.style.display = "flex";
                });
            }

            const toggleOpen = (event) => {
                event.stopPropagation();
                const isCurrentlyOpen = container.classList.contains("open");

                if (isCurrentlyOpen) {
                    if (listItems) 
                    if (!listItems.contains(event.target)) {
                        container.classList.remove("open");
                        listItems.style.display = "none";
                    }
                    return;
                }

                document.querySelectorAll(`${containerSelector}.open`).forEach(openContainer => {
                    const otherListItems = openContainer.querySelector(options.listItemsSelector || ".list-items");
                    if (otherListItems) otherListItems.style.display = "none";
                    openContainer.classList.remove("open");
                });

                container.classList.add("open");
                if (listItems) 
                listItems.style.display = "flex";
            };

            if (container) {
                container.addEventListener("pointerup", toggleOpen);
            }

            const closeOnOutsideClick = (event) => {
                if (!container.contains(event.target)) {
                    container.classList.remove("open");
                    if (listItems) 
                    listItems.style.display = "none";
                }
            };

            document.addEventListener("pointerup", closeOnOutsideClick);
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
        const title = btnText.getAttribute("title");
        const defaultTitle = btnText.getAttribute("default");
        btnText.innerText = defaultTitle;
        const listItems = rectangle.querySelector(".list-items");
        const selectBtn = rectangle;
        const arrowDown = rectangle.querySelector('.arrow-dwn');
        const sliderInput = rectangle.querySelector('input[type="range"]');
        if (sliderInput) {
            sliderInput.addEventListener("pointerup", (event) => {
                event.stopPropagation()
            })
        }
        if (arrowDown)
            arrowDown.addEventListener("pointerup", (event) => {
                event.stopPropagation();
                rectangles.forEach(cbx => {
                    if (cbx !== rectangle) {
                        const otherListItems = cbx.querySelector(".list-items");
                        otherListItems.style.display = "none";
                        cbx.classList.remove("open")
                    }
                });
                selectBtn.classList.toggle("open");
                if (listItems) 
                listItems.style.display = selectBtn.classList.contains("open") ? "flex" : "none"
            });
        const items = rectangle.querySelectorAll(".item");
        items.forEach(item => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked) {
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
            if (checkbox) checkbox.addEventListener("change", () => {
                if (checkbox && checkbox.checked) {
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
        if (listItems && tooltip) {
            listItems.addEventListener("mouseenter", () => {
                tooltip.style.display = "none"
            });
            listItems.addEventListener("mouseleave", () => {
                tooltip.style.display = "flex"
            })
        }
    });
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
export const processDataToFile = async (recieved, fileName, type = null) => {
    try {
        if (typeof recieved !== 'string' || (!recieved.startsWith('blob:') && !recieved.startsWith('http') && !recieved.startsWith('data:'))) {
            throw new Error(`Invalid blob URL provided: ${recieved}`);
        }

        if (recieved.startsWith('data:') && recieved.includes(';base64,')) {
            return processBase64ToFile(recieved, fileName);
        }

        let blob;

        if (recieved.startsWith('blob:')) {
            blob = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', recieved);
                xhr.responseType = 'blob';
                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(xhr.response);
                    } else {
                        reject(new Error(`XHR failed: ${xhr.status} ${xhr.statusText}`));
                    }
                };
                xhr.onerror = () => reject(new Error('XHR network error'));
                xhr.send();
            });
        } else {
            const response = await fetch(recieved);
            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
            }
            blob = await response.blob();
        }

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

export const processBase64ToFile = (base64, fileName = "file") => {
    try {
        if (typeof base64 !== "string" || !base64.startsWith("data:")) {
            throw new Error("Invalid or missing base64 data");
        }

        const [metadata, data] = base64.split(",");
        const mimeMatch = metadata.match(/^data:(.*?);base64$/);

        if (!mimeMatch) {
            throw new Error("Invalid base64 format or missing MIME type");
        }

        const mimeType = mimeMatch[1];
        const extension = mimeType.split("/")[1] || "bin";
        const byteString = atob(data);
        const byteArray = new Uint8Array(byteString.length);

        for (let i = 0; i < byteString.length; i++) {
            byteArray[i] = byteString.charCodeAt(i);
        }

        if (!fileName.includes(".")) {
            fileName += `.${extension}`;
        }

        return new File([byteArray], fileName, { type: mimeType });
    } catch (error) {
        console.error(`Error processing base64 to file: ${error.message}`);
        alert(`Error processing base64 to file: ${error.message}`);
        return null;
    }
};

export async function fetchUploadedChunks(serverAddress, fileName) {
    try {
        const response = await fetchWithRandom(`${serverAddress}/uploaded-chunks?fileName=${encodeURIComponent(fileName)}`);
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
    const userData = await getUserData();
    if (!userData)
        return;

    try {
        const processToken = localStorage.getItem('processToken');

        let serverWithUserRequest = getProcessingState();
        if (!serverWithUserRequest) {
            const userDoc = await getUserDoc(() => setCurrentUserDoc(getDocSnapshot));
            serverWithUserRequest = userDoc.isProcessing;
        }

        if (serverWithUserRequest) {
            await Promise.all(getFetchableServerAdresses().map(async (server) => {
                try {
                    const response = await fetchWithRandom(`${server}/cancel-process`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            userId: userData.uid,
                            processToken
                        })
                    });
                    if (showAlertion) {
                        if (response.ok) {
                            await response.json();
                            setClientStatus('Request Cancelled')
                        } else {
                            setClientStatus('Cancel Denied')
                        }
                    }
                } catch (error) {
                    showNotification(error.message, 'Warning - Process Cancellation', 'warning');
                    console.error(`Error on server ${server}:`, error)
                }
            }))
        } else if (showAlertion) {
            showNotification(`User is not processing. No cancellation request sent.`, 'Warning - Process Cancellation', 'warning')
        }
    } catch (error) {
        showNotification(error.message, 'Warning - Process Cancellation', 'warning');
        console.error('Error checking processes:', error)
    }
}
ensureCameFromAd();