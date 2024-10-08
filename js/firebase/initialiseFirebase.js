// initialiseFirebase.js
let firebaseModules = null;

export async function getFirebaseModules() {
    if (firebaseModules) {
        return firebaseModules;
    }

    const firebaseAppModule = await import('https://www.gstatic.com/firebasejs/9.17.2/firebase-app.js');
    const firebaseAuthModule = await import('https://www.gstatic.com/firebasejs/9.17.2/firebase-auth.js');
    const firebaseFirestoreModule = await import('https://www.gstatic.com/firebasejs/9.17.2/firebase-firestore.js');

    const { initializeApp } = firebaseAppModule;
    const { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, onAuthStateChanged } = firebaseAuthModule;
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
        signInWithPopup,
        createUserWithEmailAndPassword,
        onAuthStateChanged,
        doc,
        getDoc,
        getDocs,
        collection
    };

    return firebaseModules;
}

export async function getDocSnapshot(collectionId, documentId) {
    const { db, doc, getDoc, collection } = await getFirebaseModules();
    return await getDoc(doc(collection(db, collectionId), documentId));
}

export async function getDocsSnapshot(collectionId) {
    const { db, getDocs, collection } = await getFirebaseModules();
    return await getDocs(collection(db, collectionId));
}