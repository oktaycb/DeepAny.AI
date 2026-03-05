export const pageName = '8123-5412-5123-5123';

// Theme Persistence
export function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

export function setupThemeToggle(buttonId) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    const icon = btn.querySelector('.material-symbols-outlined');
    const isDark = document.documentElement.classList.contains('dark');
    if (icon) icon.textContent = isDark ? 'light_mode' : 'dark_mode';

    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const html = document.documentElement;
        const willBeDark = !html.classList.contains('dark');

        willBeDark ? html.classList.add('dark') : html.classList.remove('dark');
        localStorage.setItem('theme', willBeDark ? 'dark' : 'light');

        if (icon) icon.textContent = willBeDark ? 'light_mode' : 'dark_mode';
    });
}

export function addSystemAlert(title, message, iconType = 'info', color = 'primary') {
    const raw = localStorage.getItem('tensomar_mock_alerts');
    const alerts = raw ? JSON.parse(raw) : [];

    const iconMap = {
        'info': 'info',
        'success': 'check_circle',
        'warning': 'warning',
        'error': 'error',
        'device': 'bluetooth',
        'phone': 'smartphone',
        'link': 'link',
        'unlink': 'link_off'
    };

    alerts.unshift({
        id: Date.now(),
        deviceId: 'system',
        type: color, // For badge coloring in UI
        icon: iconMap[iconType] || iconMap['info'],
        title: title,
        message: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    if (alerts.length > 20) alerts.pop();
    localStorage.setItem('tensomar_mock_alerts', JSON.stringify(alerts));

    window.dispatchEvent(new CustomEvent('device_alert'));

    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(`Tensomar: ${title}`, {
            body: message,
            icon: '/assets/images/tensomar-logo.png'
        });
    }
}

export function setupNotificationsDropdown(buttonId, dropdownId) {
    const btn = document.getElementById(buttonId);
    const dropdown = document.getElementById(dropdownId);
    if (!btn || !dropdown) return;

    const renderAlerts = () => {
        const raw = localStorage.getItem('tensomar_mock_alerts');
        const alerts = raw ? JSON.parse(raw) : [];
        const contentContainer = dropdown.querySelector('.p-6') || dropdown.querySelector('.alerts-list-container') || dropdown;

        // Remove old content completely for generic container injection
        let listContainer = dropdown.querySelector('.alerts-list-container');
        if (!listContainer) {
            // Dropdown might only have the header and empty state initialized.
            // Let's sweep the inner HTML (except header)
            dropdown.innerHTML = `
                <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <span class="font-bold text-sm">Notifications</span>
                    <button id="btn-notifications-clear" class="text-[10px] uppercase font-bold text-primary hover:underline">Mark all read</button>
                </div>
                <div class="alerts-list-container max-h-[350px] overflow-y-auto"></div>
            `;
            listContainer = dropdown.querySelector('.alerts-list-container');

            document.getElementById('btn-notifications-clear').addEventListener('click', (e) => {
                e.stopPropagation();
                localStorage.removeItem('tensomar_mock_alerts');
                btn.classList.remove('animate-pulse', 'text-primary'); // Clear badge state
                renderAlerts();
            });
        }

        if (alerts.length === 0) {
            listContainer.innerHTML = `
                <div class="p-6 text-center flex flex-col items-center justify-center">
                    <div class="size-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                        <span class="material-symbols-outlined text-slate-400 dark:text-slate-500">notifications_paused</span>
                    </div>
                    <p class="text-sm font-medium text-slate-900 dark:text-white">You're all caught up</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">Check back later for new alerts.</p>
                </div>
            `;
            btn.classList.remove('animate-pulse', 'text-primary');
        } else {
            listContainer.innerHTML = alerts.map(a => `
                <div class="px-4 py-3 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors flex gap-3 items-start select-none">
                    <div class="shrink-0 size-8 rounded-full bg-${a.type}-500/10 text-${a.type}-500 flex items-center justify-center mt-0.5">
                        <span class="material-symbols-outlined text-[16px]">${a.icon}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between gap-2">
                            <h4 class="text-sm font-bold text-slate-900 dark:text-white truncate">${a.title}</h4>
                            <span class="text-[10px] text-slate-400 whitespace-nowrap">${a.time}</span>
                        </div>
                        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">${a.message}</p>
                    </div>
                </div>
            `).join('');

            // Add notification alert unread badge dynamically to the button icon
            btn.classList.add('animate-pulse', 'text-primary');
        }
    };

    // Render initially
    renderAlerts();

    // Listen to global changes from the simulator or system
    window.addEventListener('device_alert', () => {
        renderAlerts();
    });

    // Toggle dropdown
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent document click from immediately closing it
        const isHidden = dropdown.classList.contains('opacity-0');

        if (isHidden) {
            // Show
            dropdown.classList.remove('opacity-0', 'invisible', 'scale-95', 'pointer-events-none');
            dropdown.classList.add('opacity-100', 'visible', 'scale-100', 'pointer-events-auto');
            btn.classList.remove('animate-pulse', 'text-primary'); // Clear badge state visually once opened
        } else {
            // Hide
            dropdown.classList.add('opacity-0', 'invisible', 'scale-95', 'pointer-events-none');
            dropdown.classList.remove('opacity-100', 'visible', 'scale-100', 'pointer-events-auto');
        }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
            dropdown.classList.add('opacity-0', 'invisible', 'scale-95', 'pointer-events-none');
            dropdown.classList.remove('opacity-100', 'visible', 'scale-100', 'pointer-events-auto');
        }
    });
}

export function setupAvatarDropdown(avatarBtnId, dropdownId, signOutBtnId) {
    const btn = document.getElementById(avatarBtnId);
    const dropdown = document.getElementById(dropdownId);
    const signOutBtn = document.getElementById(signOutBtnId);

    if (btn && dropdown) {
        // Toggle dropdown
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isHidden = dropdown.classList.contains('opacity-0');

            if (isHidden) {
                dropdown.classList.remove('opacity-0', 'invisible', 'scale-95', 'pointer-events-none');
                dropdown.classList.add('opacity-100', 'visible', 'scale-100', 'pointer-events-auto');
            } else {
                dropdown.classList.add('opacity-0', 'invisible', 'scale-95', 'pointer-events-none');
                dropdown.classList.remove('opacity-100', 'visible', 'scale-100', 'pointer-events-auto');
            }
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
                dropdown.classList.add('opacity-0', 'invisible', 'scale-95', 'pointer-events-none');
                dropdown.classList.remove('opacity-100', 'visible', 'scale-100', 'pointer-events-auto');
            }
        });
    }

    if (signOutBtn) {
        signOutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await signOutUser();
                window.location.href = '../index.html';
            } catch (err) {
                console.error("Failed to sign out via header:", err);
            }
        });
    }
}

export function setupLogoRouting() {
    const logos = document.querySelectorAll('.nav-logo-link');
    if (!logos.length) return;

    logos.forEach(logo => {
        // Change cursor to pointer if not already an anchor
        logo.style.cursor = 'pointer';

        logo.addEventListener('click', async (e) => {
            e.preventDefault();
            const user = await getUserDoc();
            if (user) {
                window.location.href = '/dashboard/panel';
            } else {
                window.location.href = '/';
            }
        });
    });
}

export function showToast(title, message, type = 'info') {
    const containerId = 'tensomar-toast-container';
    let container = document.getElementById(containerId);

    // Inject the fixed container if it doesn't already exist on the DOM
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.className = 'fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-[9999] flex flex-col gap-3 pointer-events-none';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');

    // Configs map
    const configs = {
        'info': { icon: 'info', color: 'blue' },
        'success': { icon: 'check_circle', color: 'emerald' },
        'warning': { icon: 'warning', color: 'amber' },
        'error': { icon: 'error', color: 'red' }
    };
    const c = configs[type] || configs['info'];

    toast.className = `glass-panel pointer-events-auto w-[320px] sm:w-[380px] p-4 rounded-xl shadow-2xl flex items-start gap-4 border-l-4 border-l-${c.color}-500 transform transition-all duration-300 translate-y-8 opacity-0`;

    toast.innerHTML = `
        <span class="material-symbols-outlined text-${c.color}-500 shrink-0 mt-0.5">${c.icon}</span>
        <div class="flex-1 min-w-0">
            <h4 class="text-sm font-bold text-slate-900 dark:text-white truncate">${title}</h4>
            <p class="text-xs text-slate-500 mt-1 break-words">${message}</p>
        </div>
        <button class="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" onclick="this.parentElement.remove()">
            <span class="material-symbols-outlined text-[18px]">close</span>
        </button>
    `;

    container.appendChild(toast);

    // Trigger enter animation smoothly
    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-8', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    });

    // Auto dispose mechanism
    setTimeout(() => {
        if (!toast.parentElement) return; // already closed manually
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-8', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

let firebaseModules = null;

export async function getFirebaseModules(useCache = false) {
    if (firebaseModules && useCache) {
        return firebaseModules;
    }

    const firebaseAppModule = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js');
    const firebaseAuthModule = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js');
    const firebaseFirestoreModule = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');

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
        onIdTokenChanged,
        signOut,
        RecaptchaVerifier,
        signInWithPhoneNumber,
        linkWithPhoneNumber,
        unlink,
        PhoneAuthProvider
    } = firebaseAuthModule;

    const {
        getFirestore,
        collection,
        doc,
        getDoc,
        getDocs,
        updateDoc,
        setDoc,
        increment,
        query,
        where
    } = firebaseFirestoreModule;

    const firebaseConfig = {
        apiKey: "AIzaSyBWS56gjip6CIpo-0Nw-gz8ecktp-j2lK4",
        authDomain: "tensormar.firebaseapp.com",
        projectId: "tensormar",
        storageBucket: "tensormar.firebasestorage.app",
        messagingSenderId: "548569538098",
        appId: "1:548569538098:web:dfe207f9f2c9786573662b"
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
        signInWithRedirect,
        signInWithCredential,
        signInWithEmailAndPassword,
        signInWithCustomToken,
        createUserWithEmailAndPassword,
        onAuthStateChanged,
        onIdTokenChanged,
        signOut,
        doc,
        getDoc,
        getDocs,
        collection,
        updateDoc,
        setDoc,
        increment,
        query,
        where,
        RecaptchaVerifier,
        signInWithPhoneNumber,
        linkWithPhoneNumber,
        unlink,
        PhoneAuthProvider
    };

    return firebaseModules;
}

export async function getCurrentUserData(getFirebaseModules) {
    try {
        const { auth, onAuthStateChanged } = await getFirebaseModules(true);

        return new Promise((resolve, reject) => {
            const unsubscribe = onAuthStateChanged(auth, async (user) => {
                unsubscribe();
                if (user) {
                    await user.reload();
                    resolve({
                        uid: user.uid,
                        email: user.email,
                        emailVerified: user.emailVerified,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        phoneNumber: user.phoneNumber
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
    const { db, doc, getDoc, collection } = await getFirebaseModules(true);
    console.log(`[getDocSnapshot] Fetching document '${documentId}' from collection '${collectionId}'`);
    const snapshot = await getDoc(doc(collection(db, collectionId), documentId));
    if (snapshot.exists()) {
        console.log(`[getDocSnapshot] Document '${documentId}' fetched successfully`);
    } else {
        console.warn(`[getDocSnapshot] Document '${documentId}' does not exist`);
    }
    return snapshot;
}

export async function getDocSnapshotByField(collectionId, fieldName, value) {
    const { db, collection, getDocs, query, where } = await getFirebaseModules(true);
    console.log(`[getDocSnapshotByField] Searching '${collectionId}' where ${fieldName} == '${value}'`);

    const q = query(collection(db, collectionId), where(fieldName, '==', value));
    const snap = await getDocs(q);

    if (snap.empty) {
        console.warn(`[getDocSnapshotByField] No document found`);
        return null;
    }

    return snap.docs[0];
}

export async function getDocsSnapshot(collectionId) {
    const { db, getDocs, collection } = await getFirebaseModules(true);
    const snapshot = await getDocs(collection(db, collectionId));
    return snapshot;
}

export const getUserData = async (setCurrentUserDataPromise) => {
    if (setCurrentUserDataPromise) {
        await setCurrentUserDataPromise();
    }
    const cachedUserData = localStorage.getItem(`${pageName}_cachedUserData`);
    return cachedUserData ? JSON.parse(cachedUserData) : null;
};

export const getUserDoc = async (setCurrentUserDocPromise = null) => {
    if (setCurrentUserDocPromise) {
        await setCurrentUserDocPromise();
    }
    const cachedUserDocument = localStorage.getItem(`${pageName}_cachedUserDocument`);
    if (!cachedUserDocument) return null;

    try {
        const parsedData = JSON.parse(cachedUserDocument);
        return parsedData.data || null;
    } catch (error) {
        console.error('Error parsing cached user document:', error);
        return null;
    }
};

export async function setCurrentUserData(getFirebaseModules) {
    const cachedUserData = await getCurrentUserData(getFirebaseModules);
    localStorage.setItem(`${pageName}_cachedUserData`, JSON.stringify(cachedUserData));
}

const CACHE_EXPIRATION_TIME = 12 * 60 * 60 * 1000;

async function waitForAuthUser() {
    const { auth, onAuthStateChanged } = await getFirebaseModules(true);
    if (auth.currentUser) return Promise.resolve(auth.currentUser);

    return new Promise(resolve => {
        const unsub = onAuthStateChanged(auth, user => {
            unsub();
            resolve(user);
        });
    });
}

export async function setCurrentUserDoc(useCache = false) {
    if (useCache) {
        let cachedUserDoc = localStorage.getItem(`${pageName}_cachedUserDocument`);
        if (cachedUserDoc) {
            cachedUserDoc = JSON.parse(cachedUserDoc);
            if (Date.now() - cachedUserDoc.timestamp < CACHE_EXPIRATION_TIME) {
                return true;
            }
        }
    }

    let userData = await getUserData();
    let userDoc = await getUserDoc();

    if (!userDoc) {
        userData = await waitForAuthUser();
    }

    if (!userData?.uid) {
        return false;
    }

    let userDocSnap;
    try {
        userDocSnap = await getDocSnapshot('users', userData.uid);
    } catch (err) {
        console.error('[setCurrentUserDoc] Firestore error', err);
        return false;
    }

    if (!userDocSnap || !userDocSnap.exists()) {
        return false;
    }

    const userDocData = userDocSnap.data();
    localStorage.setItem(`${pageName}_cachedUserDocument`, JSON.stringify({
        data: userDocData,
        timestamp: Date.now(),
    }));

    return true;
}

export async function updateUserProfile(displayName, photoURL) {
    const { auth, getAuth } = await getFirebaseModules(true);
    const { updateProfile } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js');

    if (!auth.currentUser) throw new Error("No user logged in to update profile.");

    try {
        await updateProfile(auth.currentUser, {
            displayName: displayName,
            photoURL: photoURL
        });

        // Refresh local cache to reflect new auth data immediately
        await setCurrentUserDoc(false);
        return true;
    } catch (error) {
        console.error("Error updating profile:", error);
        throw error;
    }
}

export async function updateUserDocData(uid, dataObj) {
    const { db, doc, updateDoc } = await initAuth();

    try {
        const userRef = doc(db, 'users', uid);
        await updateDoc(userRef, dataObj);

        // Refresh local cache to reflect new firestore data immediately
        await setCurrentUserDoc(false);
        return true;
    } catch (error) {
        console.error("Error updating user document:", error);
        throw error;
    }
}

let authModules = null;

export async function initAuth() {
    if (!authModules) {
        authModules = await getFirebaseModules(true);
    }
    return authModules;
}

export async function signUpWithEmail(email, password, additionalData = {}) {
    const { auth, db, doc, setDoc, createUserWithEmailAndPassword } = await initAuth();

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Save additional user info to Firestore
        await setDoc(doc(db, 'users', user.uid), {
            email: user.email,
            createdAt: new Date().toISOString(),
            ...additionalData
        });

        return user;
    } catch (error) {
        console.error("Sign up error:", error);
        throw error;
    }
}

export async function signInWithEmail(email, password) {
    const { auth, signInWithEmailAndPassword } = await initAuth();

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Sign in error:", error);
        throw error;
    }
}

export async function resetPassword(email) {
    const { auth, sendPasswordResetEmail } = await initAuth();

    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error) {
        console.error("Password reset error:", error);
        throw error;
    }
}

export async function signOutUser() {
    const { auth, signOut } = await initAuth();

    try {
        localStorage.removeItem(`${pageName}_cachedUserData`);
        localStorage.removeItem(`${pageName}_cachedUserDocument`);
        await signOut(auth);
    } catch (error) {
        console.error("Sign out error:", error);
        throw error;
    }
}

export async function checkAuthState(onAuthenticated, onUnauthenticated) {
    const { auth, onAuthStateChanged } = await initAuth();

    return onAuthStateChanged(auth, (user) => {
        if (user) {
            onAuthenticated(user);
        } else {
            console.log("Not user logic ran");
            if (onUnauthenticated) onUnauthenticated();
        }
    });
}

// ReCAPTCHA and Phone Auth
let confirmationResult = null;

export async function setupRecaptcha(buttonId) {
    const { auth, RecaptchaVerifier } = await initAuth();

    // Bypass real reCAPTCHA validation when using "Test phone numbers" in Firebase console
    auth.settings.appVerificationDisabledForTesting = true;

    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(buttonId, {
            'size': 'invisible',
            'callback': (response) => {
                // reCAPTCHA solved
                console.log("reCAPTCHA solved", response);
            },
            'error-callback': (error) => {
                console.error("reCAPTCHA error", error);
            }
        }, auth);

        try {
            await window.recaptchaVerifier.render();
        } catch (err) {
            console.error("reCAPTCHA render error", err);
        }
    }
}

export async function sendPhoneCode(phoneNumber, buttonId) {
    const { auth, signInWithPhoneNumber } = await initAuth();

    try {
        await setupRecaptcha(buttonId);
        const appVerifier = window.recaptchaVerifier;
        confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        return true;
    } catch (error) {
        console.error("SMS sending error:", error);
        throw error;
    }
}

export async function sendPhoneLinkCode(phoneNumber, buttonId) {
    const { auth, linkWithPhoneNumber } = await initAuth();

    try {
        await setupRecaptcha(buttonId);
        const appVerifier = window.recaptchaVerifier;
        if (!auth.currentUser) throw new Error("No user logged in to link phone to.");
        confirmationResult = await linkWithPhoneNumber(auth.currentUser, phoneNumber, appVerifier);
        return true;
    } catch (error) {
        console.error("SMS link sending error:", error);
        throw error;
    }
}

export async function verifyPhoneCode(code) {
    if (!confirmationResult) throw new Error("No confirmation result. Call sendPhoneCode first.");

    try {
        const result = await confirmationResult.confirm(code);
        return result.user;
    } catch (error) {
        console.error("Code verification error:", error);
        throw error;
    }
}

export async function removePhoneLink() {
    const { auth, unlink, PhoneAuthProvider } = await initAuth();
    if (!auth.currentUser) throw new Error("No user logged in to unlink phone from.");

    try {
        await unlink(auth.currentUser, PhoneAuthProvider.PROVIDER_ID);
        return true;
    } catch (error) {
        console.error("Phone unlinking error:", error);
        throw error;
    }
}

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
                if ('Notification' in window && Notification.permission === 'default') {
                    Notification.requestPermission();
                }
            })
            .catch(err => {
                console.error('ServiceWorker registration failed: ', err);
            });
    });
}
// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
                // Optionally request notification permission for Push after successful registration
                if ('Notification' in window && Notification.permission === 'default') {
                    Notification.requestPermission();
                }
            })
            .catch(err => {
                console.error('ServiceWorker registration failed: ', err);
            });
    });
}
