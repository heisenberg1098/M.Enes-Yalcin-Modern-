import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBhTD31NWAq6DlnUQPwRcC4Q_-l-pNi1xs",
    authDomain: "okul-37a9d.firebaseapp.com",
    projectId: "okul-37a9d",
    storageBucket: "okul-37a9d.firebasestorage.app",
    messagingSenderId: "241414867800",
    appId: "1:241414867800:web:d32c7c7e88617e703e732d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);