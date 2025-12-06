import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAZKYQvVJihtvRz7QHrXHNullNNadyQVMc",
  authDomain: "saveeats-395fd.firebaseapp.com",
  projectId: "saveeats-395fd",
  storageBucket: "saveeats-395fd.appspot.com",
  messagingSenderId: "1070958395954",
  appId: "1:1070958395954:web:41c17d243770545c58f22b"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
