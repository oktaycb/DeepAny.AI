import { auth, usersRef } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', function () {
    async function handleUserLoggedIn(user) {
        if (!user) return;

        const loginButton = document.getElementById("loginButton");
        const registerButton = document.getElementById("registerButton");

        if (loginButton) loginButton.remove();
        if (registerButton) registerButton.remove();

        const userId = user.uid;

        try {
            const doc = await usersRef.doc(userId).get();
            if (doc.exists) {
                console.log("User document:", doc.data());
            } else {
                console.log("No user document found.");
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
                    const provider = new firebase.auth.GoogleAuthProvider();
                    const result = await auth.signInWithPopup(provider);
                    console.log("User signed in:", result.user);
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
                    const email = prompt("Enter your email:");
                    const password = prompt("Enter your password:");
                    const result = await auth.createUserWithEmailAndPassword(email, password);
                    console.log("User registered and signed in.");
                    localStorage.setItem('cachedUser', JSON.stringify(result.user));
                    handleUserLoggedIn(result.user);
                } catch (error) {
                    console.error("Registration error:", error);
                }
            });
        }
    }

    const cachedUser = localStorage.getItem('cachedUser');
    if (cachedUser) {
        handleUserLoggedIn(JSON.parse(cachedUser));
    } else {
        auth.onAuthStateChanged(async function (user) {
            if (user) {
                localStorage.setItem('cachedUser', JSON.stringify(user));
                handleUserLoggedIn(user);
            } else {
                localStorage.removeItem('cachedUser');
                handleLoggedOutState();
            }
        });
    }
});
