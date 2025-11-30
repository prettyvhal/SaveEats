document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const signUpForm = document.getElementById("SignUpForm");
  const restoBtn = document.getElementById("restoAcc");

  const submitModal = document.getElementById("submit-modal");
  const errorModal = document.getElementById("error-modal");
  const errorMessageBox = errorModal.querySelector(".error-message");
  const closeButtons = document.querySelectorAll(".close-btn");
  const googleLoginBtn = document.getElementById("googleLoginBtn");

  let accountType = "user";

  const firebaseConfig = {
    apiKey: "AIzaSyAZKYQvVJihtvRz7QHrXHNullNNadyQVMc",
    authDomain: "saveeats-395fd.firebaseapp.com",
    projectId: "saveeats-395fd",
    storageBucket: "saveeats-395fd.firebasestorage.app",
    messagingSenderId: "1070958395954",
    appId: "1:1070958395954:web:41c17d243770545c58f22b",
    measurementId: "G-6QZMSPQEM9"
  };

  // Initialize Firebase (compat)
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();

  // ---------------------------
  // LOGIN
  // ---------------------------
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;

      const docSnap = await db.collection("users").doc(user.uid).get();
      if (!docSnap.exists) throw new Error("User data not found.");

      const userType = docSnap.data().type || "user";

      submitModal?.classList.add("visible");
      navigator.vibrate?.([50, 150, 50]);

      setTimeout(() => {
        if (userType === "restaurant") {
          window.location.href = "restaurant_home.html";
        } else {
          window.location.href = "user_home.html";
        }
      }, 1000);

      loginForm.reset();
    } catch (error) {
      showError(error.message);
    }
  });

  // ---------------------------
  // GOOGLE LOGIN
  // ---------------------------
  googleLoginBtn?.addEventListener("click", async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      const result = await auth.signInWithPopup(provider);
      const user = result.user;

      // Check Firestore for account type
      const docSnap = await db.collection("users").doc(user.uid).get();
      const userType = docSnap.exists ? docSnap.data().type || "user" : "user";

      submitModal?.classList.add("visible");
      navigator.vibrate?.([50, 150, 50]);

      setTimeout(() => {
        if (userType === "restaurant") {
          window.location.href = "restaurant_home.html";
        } else {
          window.location.href = "user_home.html";
        }
      }, 1000);
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
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      await db.collection("users").doc(user.uid).set({
        username: username,
        email: email,
        type: accountType,
        createdAt: new Date()
      });

      submitModal?.classList.add("visible");
      signUpForm.reset();
      accountType = "user";
    } catch (error) {
      showError(error.message);
    }
  });

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
      btn.closest(".modal-container").classList.remove("visible");
    });
  });

  window.addEventListener("click", (e) => {
    if (e.target === submitModal || e.target === errorModal) {
      e.target.classList.remove("visible");
    }
  });
});
