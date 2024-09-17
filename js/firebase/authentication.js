import { getFirebaseModules, getDocSnapshot } from './initialiseFirebase.js';
import { cacheImage, getUserIpAddress, ensureUniqueId, fetchServerAddress } from '../functions.js';

async function handleUserLoggedIn(user) {
    if (!user) return;

    const loginButton = document.getElementById("loginButton");
    const registerButton = document.getElementById("registerButton");

    if (loginButton) loginButton.remove();
    if (registerButton) registerButton.remove();

    const userId = user.uid;

    try {
        const userDocSnap = await getDocSnapshot('users', userId);
        if (userDocSnap && userDocSnap.exists()) {
            console.log("User document:", docSnap.data());
        } else {
            console.log("No user document found.");
            console.log("Document doesn't exist, creating a new one: ", user.displayName);

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

            const data = await registerUser();
        }
    } catch (error) {
        console.error("Error getting user document:", error);
    }
}

async function handleLoggedOutState() {
    const loginButton = document.getElementById("loginButton");
    const registerButton = document.getElementById("registerButton");

    if (loginButton) {
        loginButton.addEventListener("click", async (event) => {
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

                let cachedImage = localStorage.getItem('profileImageBase64');
                if (!cachedImage) {
                    cacheImage(userCopy.photoURL, function (base64Image) {
                        localStorage.setItem('profileImageBase64', base64Image);
                    }, 2, 1000, true);
                }

                const cachedUserData = JSON.stringify(userCopy);
                localStorage.setItem('cachedUserData', cachedUserData);
                handleUserLoggedIn(userCopy);
                location.reload();
            } catch (error) { console.error("Google sign-in error:", error); }
        });
    }

    if (registerButton) {
        registerButton.addEventListener("click", async (event) => {
            event.preventDefault();

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
                handleUserLoggedIn(userCopy);
                location.reload();
            } catch (error) { console.error("Registration error:", error); }
        });
    }
}

export function setAuthentication() {
    const cachedUserData = localStorage.getItem('cachedUserData');
    if (cachedUserData) handleUserLoggedIn(JSON.parse(cachedUserData));
    else handleLoggedOutState();
}