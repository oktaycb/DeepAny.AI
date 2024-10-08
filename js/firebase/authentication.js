import { getFirebaseModules, getDocSnapshot } from './initialiseFirebase.js';
import { retrieveImageFromURL, getUserIpAddress, ensureUniqueId, fetchServerAddress } from '../functions.js';

export const getCachedUserData = () => {
    const cachedUserData = localStorage.getItem('cachedUserData');
    return cachedUserData ? JSON.parse(cachedUserData) : null;
};

export const getCachedUserDoc = () => {
    const cachedUserData = localStorage.getItem('cachedUserDocument');
    return cachedUserData ? JSON.parse(cachedUserData) : null;
};

export async function setUserData() {
    const userData = getCachedUserData();
    const userDocSnap = await getDocSnapshot('users', userData.uid);
    if (!userDocSnap || !userDocSnap.exists())
        return false;

    const userDoc = userDocSnap.data();
    localStorage.setItem(`cachedUserDocument`, JSON.stringify(userDoc));
    setUser(userDoc);
    return true;
}

function setUser(userDoc) {
    const credits = document.getElementById('creditsAmount');
    if (credits)
        credits.textContent = credits.textContent.replace(/\d+/, userDoc.credits);

    const usernames = document.getElementsByClassName('username');
    if (usernames && usernames.length) {
        for (let username of usernames) {
            username.textContent = userDoc.username;
            username.value = userDoc.username;
        }
    }
}

async function handleUserLoggedIn(user) {
    if (!user) return;

    const loginButton = document.getElementById("loginButton");
    const registerButton = document.getElementById("registerButton");

    if (loginButton) loginButton.remove();
    if (registerButton) registerButton.remove();

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

    const userId = user.uid;

    try {
        const userData = getCachedUserDoc();
        if (userData) {
            setUser(userData);
        } else {
            const setUserDataSuccess = await setUserData();
            if (!setUserDataSuccess) {
                async function registerUser() {
                    try {
                        async function getServerAddressAPI() {
                            return await fetchServerAddress(getDocSnapshot('servers', '3050-1'), 'API');
                        }

                        const [userIpAddress, uniqueId, serverAddressAPI] = await Promise.all([
                            getUserIpAddress(),
                            ensureUniqueId(),
                            getServerAddressAPI()
                        ]);

                        const url = new URL(window.location.href);
                        const referral = url.searchParams.get('referral');

                        const response = await fetch(`${serverAddressAPI}/create-user`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId,
                                email: user.email,
                                username: user.displayName,
                                phoneNumber: user.phoneNumber,
                                emailVerified: user.emailVerified,
                                isAnonymous: user.isAnonymous,
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
                }

                await registerUser();
                location.reload();
            }
        }
    } catch (error) {
        console.error("Error getting user document:", error);
    }
}

export async function loginUser() {
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
    } catch (error) { console.error("Google sign-in error:", error); }
}

export async function registerUser() {
    try {
        const { auth, createUserWithEmailAndPassword } = await getFirebaseModules();
        const email = prompt("Enter your email:");
        const password = prompt("Enter your password:");
        const result = await createUserWithEmailAndPassword(auth, email, password);
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
        localStorage.setItem('cachedUserData', JSON.stringify(userCopy));
        location.reload();
    } catch (error) { console.error("Registration error:", error); }
}

async function handleLoggedOutState() {
    const userLayout = document.getElementById("userLayout");
    if (userLayout) userLayout.remove();

    const loginButton = document.getElementById("loginButton");
    const registerButton = document.getElementById("registerButton");

    if (loginButton) {
        loginButton.addEventListener('click', async (event) => {
            event.preventDefault();

            try {
                await loginUser();
            } catch (error) { console.error("Google sign-in error:", error); }
        });
    }

    if (registerButton) {
        registerButton.addEventListener('click', async (event) => {
            event.preventDefault();

            try {
                await registerUser();
            } catch (error) { console.error("Registration error:", error); }
        });
    }
}

export function setAuthentication() {
    const cachedUserData = localStorage.getItem('cachedUserData');
    if (cachedUserData) handleUserLoggedIn(JSON.parse(cachedUserData));
    else handleLoggedOutState();
}