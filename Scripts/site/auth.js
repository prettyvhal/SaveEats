import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  OAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const signUpForm = document.getElementById("SignUpForm");
  const restoBtn = document.getElementById("restoAcc");       // resto signup submit
  const restoBtn1 = document.getElementById("restoAcc1");    // go to resto signup page
  const restoForm = document.getElementById("RestoSignUpForm");

  const submitModal = document.getElementById("submit-modal");
  const errorModal = document.getElementById("error-modal");
  const errorMessageBox = errorModal?.querySelector(".error-message");
  const closeButtons = document.querySelectorAll(".close-btn");

  const googleLoginBtn = document.getElementById("googleLoginBtn");
  const appleLoginBtn = document.getElementById("appleLoginBtn");

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
  const db = getFirestore(app); // Firestore reference

  // ---------------------------
  // MODALS
  // ---------------------------
  function showError(message) {
    if (!errorMessageBox || !errorModal) return;
    errorMessageBox.textContent = message;
    errorModal.classList.add("visible");
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

  async function showSubmitModalAndRedirect(passedType) {
    const submitModal = document.getElementById("submit-modal");
    submitModal?.classList.add("visible");

    let userType = passedType || "user";
    const user = auth.currentUser;

    if (!passedType && user) {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          userType = docSnap.data().type || "user";
          localStorage.setItem("loggedInUserType", userType);
        } else {
          showError("User document not found, using default type.");
        }
      } catch (err) {
        showError("Firestore fetch failed:", err);
        const cachedType = localStorage.getItem("loggedInUserType");
        if (cachedType) userType = cachedType;
      }
    } else {
      localStorage.setItem("loggedInUserType", userType);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));

    setTimeout(() => {
      if (userType === "restaurant") {
        window.location.href = "resto-dashboard.html";
      } else {
        window.location.href = "home-user.html";
      }
    }, 1200);
  }

  // ---------------------------
  // AUTO REDIRECT IF LOGGED IN
  // ---------------------------
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        // No user data found, sign out and redirect
        await auth.signOut();
        window.location.href = "index.html";
        return;
      }

      // User data exists
      const userType = docSnap.data().type || "user";
      localStorage.setItem("loggedInUserType", userType);

      const currentPage = window.location.pathname.split("/").pop();
      if (
        currentPage === "" ||
        currentPage === "index.html" ||
        currentPage === "sign-up.html" ||
        currentPage === "sign-up-resto.html"
      ) {
        if (userType === "restaurant") {
          window.location.href = "resto-dashboard.html";
        } else {
          window.location.href = "home-user.html";
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      // Optional: sign out on error
      await auth.signOut();
      window.location.href = "index.html";
    }
  });

  // ---------------------------
  // LOGIN (EMAIL)
  // ---------------------------
  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get type from Firestore
      const docSnap = await getDoc(doc(db, "users", user.uid));
      const userType = docSnap.exists() ? docSnap.data().type : "user";

      showSubmitModalAndRedirect(userType);
      loginForm.reset();
    } catch (error) {
      showError(error.message);
    }
  });

  // ---------------------------
  // GOOGLE LOGIN (AUTO USER)
  // ---------------------------
  googleLoginBtn?.addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        username: user.displayName || "",
        type: "user"
      });

      showSubmitModalAndRedirect("user");
    } catch (error) {
      showError(error.message);
    }
  });

  // ---------------------------
  // APPLE LOGIN (AUTO USER)
  // ---------------------------
  appleLoginBtn?.addEventListener("click", async () => {
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        username: user.displayName || "",
        type: "user"
      });

      showSubmitModalAndRedirect("user");
    } catch (error) {
      showError(error.message);
    }
  });

  // ---------------------------
  // USER SIGN UP (ALWAYS USER)
  // ---------------------------
  restoBtn1?.addEventListener("click", () => {
    window.location.href = "sign-up-resto.html";
  });

  signUpForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value;
    const passwordRep = document.getElementById("password_rep").value;
    const username_email = document.getElementById("signup-username").value.trim();

    if (password !== passwordRep) {
      showError("Passwords do not match!");
      return;
    }
    if (!username_email) {
      showError("Username is required!");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email,
        username: username_email,
        type: "user"
      });

      showSubmitModalAndRedirect("user");
      signUpForm.reset();
    } catch (error) {
      showError(error.message);
    }
  });

  // ---------------------------
  // RESTO SIGN UP (ALWAYS RESTO)
  // ---------------------------
  restoBtn?.addEventListener("click", async () => {
    const email = document.getElementById("resto-email").value.trim();
    const password = document.getElementById("resto-password").value;
    const passwordRep = document.getElementById("resto-password_rep").value;
    const resto_username = document.getElementById("restoname").value.trim();

    if (password !== passwordRep) {
      alert("Passwords do not match!");
      return;
    }
    if (!resto_username) {
      showError("Restaurant name is required!");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save in Firestore
      await setDoc(doc(db, "users", user.uid), {
        email,
        username: resto_username,
        type: "restaurant"
      });

      localStorage.setItem("loggedInUserType", "restaurant");
      showSubmitModalAndRedirect("restaurant");
      restoForm.reset();
    } catch (error) {
      alert(error.message);
    }
  });
});
