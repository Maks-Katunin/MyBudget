import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDTvRUtQ9lxIa62bNidT0ylcYAtVulyxNo",
  authDomain: "mybudget-785b8.firebaseapp.com",
  projectId: "mybudget-785b8",
  storageBucket: "mybudget-785b8.firebasestorage.app",
  messagingSenderId: "999065641446",
  appId: "1:999065641446:web:004381bacf20e529e13627",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

console.log("Firebase initialized");

export { app, auth };
