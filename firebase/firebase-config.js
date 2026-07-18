import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyASN1PL0PhQHj0odFDgGO5dm_eBvZOWlAs",
  authDomain: "mybudget-48ab5.firebaseapp.com",
  projectId: "mybudget-48ab5",
  storageBucket: "mybudget-48ab5.firebasestorage.app",
  messagingSenderId: "457608940301",
  appId: "1:457608940301:web:2c8e7d9220fad0ec76be44",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

console.log("Firebase initialized");

export { app, auth };
