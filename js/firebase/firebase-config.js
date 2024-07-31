// Initialize Firebase
var firebaseConfig = {
  apiKey: "AIzaSyB9KofLbx0_N9CKXUPJiuzRBMYizM-YPYw",
  authDomain: "bodyswap-389200.firebaseapp.com",
  projectId: "bodyswap-389200",
  storageBucket: "bodyswap-389200.appspot.com",
  messagingSenderId: "385732753036",
  appId: "1:385732753036:web:e078abf4bbf557938deda9",
  measurementId: "G-7PLJEN2Y0R"
};
  
// Initialize app
firebase.initializeApp(firebaseConfig);

// Reference to the authentication service
var auth = firebase.auth();

// Get a reference to the Firestore database
var db = firebase.firestore();

// Reference to the users collection
var usersRef = db.collection("users");

// Reference to the users collection
var paymentsRef = db.collection("payments");

// Reference to the users collection
var serversRef = db.collection("servers");

// Export relevant variables or services
export { auth, usersRef, paymentsRef, serversRef };