import { getFirebaseModules } from './initialiseFirebase.js';

document.addEventListener('DOMContentLoaded', async function () {
    async function handleUserLoggedIn(user) {
        if (!user) return;

        const loginButton = document.getElementById("loginButton");
        const registerButton = document.getElementById("registerButton");

        if (loginButton) loginButton.remove();
        if (registerButton) registerButton.remove();

        const userId = user.uid;

        try {
            const { db, doc, getDoc } = await getFirebaseModules();
            const userDocRef = doc(db, "users", userId);
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                // console.log("User document:", docSnap.data());
            } else {
                // console.log("No user document found.");
            }
        } catch (error) {
            console.error("Error getting user document:", error);
        }
    }

    function handleLoggedOutState() {
        const loginButton = document.getElementById("loginButton");
        const registerButton = document.getElementById("registerButton");

        if (loginButton) {
            loginButton.addEventListener("click", async (event) => {
                event.preventDefault();

                try {
                    const { auth, GoogleAuthProvider, signInWithPopup } = await getFirebaseModules();
                    const provider = new GoogleAuthProvider();
                    const result = await signInWithPopup(auth, provider);
                    // console.log("User signed in:", result.user);
                    localStorage.setItem('cachedUser', JSON.stringify(result.user));
                    handleUserLoggedIn(result.user);
                } catch (error) {
                    console.error("Google sign-in error:", error);
                }
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
                    // console.log("User registered and signed in.");
                    localStorage.setItem('cachedUser', JSON.stringify(result.user));
                    handleUserLoggedIn(result.user);
                } catch (error) {
                    console.error("Registration error:", error);
                }
            });
        }
    }

    window.onload = async () => {
        const cachedUser = localStorage.getItem('cachedUser');
        if (cachedUser) {
            handleUserLoggedIn(JSON.parse(cachedUser));
        } else {
            handleLoggedOutState();
        }
    };
});
