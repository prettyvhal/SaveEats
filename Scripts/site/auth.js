import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const signUpForm = document.getElementById("SignUpForm");
  const restoBtn = document.getElementById("restoAcc");

  const submitModal = document.getElementById("submit-modal");
  const errorModal = document.getElementById("error-modal");
  const errorMessageBox = errorModal.querySelector(".error-message");
  const closeButtons = document.querySelectorAll(".close-btn");
  const googleLoginBtn = document.getElementById("googleLoginBtn");

  let accountType = "user"; // default type

  const firebaseConfig = {
    apiKey: "AIzaSyAZKYQvVJihtvRz7QHrXHNullNNadyQVMc",
    authDomain: "saveeats-395fd.firebaseapp.com",
    projectId: "saveeats-395fd",
    storageBucket: "saveeats-395fd.appspot.com",
    messagingSenderId: "1070958395954",
    appId: "1:1070958395954:web:41c17d243770545c58f22b",
    measurementId: "G-6QZMSPQEM9"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  // ---------------------------
  // MODALS
  // ---------------------------
  function showError(message) {
    errorMessageBox.textContent = message;
    errorModal?.classList.add("visible");
    navigator.vibrate?.([50, 150, 50]);
  }

  closeButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      btn.closest(".modal-container")?.classList.remove("visible");
    });
  });

  window.addEventListener("click", (e) => {
    if (e.target === submitModal || e.target === errorModal) {
      e.target.classList.remove("visible");
    }
  });

  function showSubmitModalAndRedirect(userType) {
    submitModal?.classList.add("visible");
    navigator.vibrate?.([50, 150, 50]);

    // save userType in localStorage
    localStorage.setItem("loggedInUserType", userType);

    setTimeout(() => {
      if (userType === "restaurant") {
        window.location.href = "restaurant_home.html";
      } else {
        window.location.href = "home-user.html";
      }
    }, 2000);
  }

  // ---------------------------
  // AUTO REDIRECT IF LOGGED IN
  // ---------------------------
  onAuthStateChanged(auth, (user) => {
    const savedType = localStorage.getItem("loggedInUserType");
    const currentPage = window.location.pathname.split("/").pop();

    if (!user || !savedType) return; // no user, no redirect

    if (currentPage === "index.html" || currentPage === "sign-up.html") {
      // only redirect from login/signup pages
      if (savedType === "restaurant") {
        window.location.href = "restaurant_home.html";
      } else {
        window.location.href = "home-user.html";
      }
    }
  });

  // ---------------------------
  // LOGIN
  // ---------------------------
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      showSubmitModalAndRedirect(accountType);
      loginForm.reset();
    } catch (error) {
      showError(error.message);
    }
  });

  // ---------------------------
  // GOOGLE LOGIN
  // ---------------------------
  googleLoginBtn?.addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      showSubmitModalAndRedirect(accountType);
    } catch (error) {
      showError(error.message);
    }
  });

  // ---------------------------
  // SIGN UP
  // ---------------------------
  restoBtn?.addEventListener("click", () => {
    accountType = "restaurant";
    signUpForm.requestSubmit();
  });

  signUpForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const email = document.getElementById("signup-email").value;
    const password = document.getElementById("signup-password").value;
    const passwordRep = document.getElementById("password_rep").value;

    if (password !== passwordRep) {
      showError("Passwords do not match!");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const redirectType = accountType;
      accountType = "user";
      signUpForm.reset();

      showSubmitModalAndRedirect(redirectType);
    } catch (error) {
      showError(error.message);
    }
  });
});
