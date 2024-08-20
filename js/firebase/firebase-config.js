const firebaseConfig = {
  apiKey: "AIzaSyB9KofLbx0_N9CKXUPJiuzRBMYizM-YPYw",
  authDomain: "bodyswap-389200.firebaseapp.com",
  projectId: "bodyswap-389200",
  storageBucket: "bodyswap-389200.appspot.com",
  messagingSenderId: "385732753036",
  appId: "1:385732753036:web:e078abf4bbf557938deda9",
  measurementId: "G-7PLJEN2Y0R"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

const usersRef = db.collection("users");
const paymentsRef = db.collection("payments");
const serversRef = db.collection("servers");

export { auth, usersRef, paymentsRef, serversRef };
