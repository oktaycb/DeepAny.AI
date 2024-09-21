import { getFirebaseModules, getDocSnapshot } from './initialiseFirebase.js';
import { retrieveImageFromURL, getUserIpAddress, ensureUniqueId, fetchServerAddress } from '../functions.js';

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
        function setUser(userData) {
            const credits = document.getElementById('creditsAmount');
            credits.textContent = credits.textContent.replace(/\d+/, userData.credits);

            const usernames = document.getElementsByClassName('username');
            for (let username of usernames) {
                console.log(username);
                username.textContent = userData.username;
                username.value = userData.username;
            }
        }

        const cachedUserDocument = localStorage.getItem('cachedUserDocument');
        if (cachedUserDocument) {
            const userData = JSON.parse(cachedUserDocument);
            setUser(userData);
        } else {
            const userDocSnap = await getDocSnapshot('users', userId);
            if (userDocSnap && userDocSnap.exists()) {
                const userData = userDocSnap.data();
                localStorage.setItem(`cachedUserDocument`, JSON.stringify(userData));
                setUser(userData);
            } else {
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

async function handleLoggedOutState() {
    const userLayout = document.getElementById("userLayout");
    if (userLayout) userLayout.remove();

    const loginButton = document.getElementById("loginButton");
    const registerButton = document.getElementById("registerButton");

    if (loginButton) {
        loginButton.addEventListener('click', async (event) => {
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
            } catch (error) { console.error("Google sign-in error:", error); }
        });
    }

    if (registerButton) {
        registerButton.addEventListener('click', async (event) => {
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