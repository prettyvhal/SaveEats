import { app, auth, db } from "https://cadlaxa.github.io/SaveEats/Scripts/site/firebase-init.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  OAuthProvider,
  getRedirectResult,
  fetchSignInMethodsForEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

  const loginForm = document.getElementById("loginForm");
  const signUpForm = document.getElementById("SignUpForm");
  const restoBtn = document.getElementById("restoAcc");
  const restoBtn1 = document.getElementById("restoAcc1");
  const restoForm = document.getElementById("RestoSignUpForm");

  const submitModal = document.getElementById("submit-modal");
  const errorModal = document.getElementById("error-modal");
  const notifModal = document.getElementById("notif-modal");

  const errorMessageBox = errorModal?.querySelector(".error-message");
  const notifMessageBox = notifModal?.querySelector(".notif-message");

  const closeButtons = document.querySelectorAll(".close-btn");

  const googleLoginBtn = document.getElementById("googleLoginBtn");
  const appleLoginBtn = document.getElementById("appleLoginBtn");

  const isIOS = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  /* ---------------- MODALS ---------------- */

  window.showError = (msg) => {
    if (!errorModal) return;
    errorMessageBox.textContent = msg;
    errorModal.classList.add("visible");
  };

  window.showNotif = (msg) => {
    if (!notifModal) return;
    notifMessageBox.textContent = msg;
    notifModal.classList.add("visible");
  };

  closeButtons.forEach(btn => {
    btn.addEventListener("click", () =>
      btn.closest(".modal-container")?.classList.remove("visible")
    );
  });

  /* ---------------- FIRESTORE PROFILE ---------------- */

  const writeOrUpdateUserProfile = async (user) => {
    if (!user) return;

    await setDoc(
      doc(db, "users", user.uid),
      {
        email: user.email || "",
        username: user.displayName || "",
        profileImage: user.photoURL || null,
        type: "user"
      },
      { merge: true }
    );
  };

  /* ---------------- SUBMIT MODAL + REDIRECT ---------------- */

  async function showSubmitModalAndRedirect(passedType) {
    submitModal.classList.add("visible");

    let userType = passedType || "user";
    const user = auth.currentUser;

    if (!passedType && user) {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) userType = snap.data().type || "user";
      } catch {}
    }

    localStorage.setItem("loggedInUserType", userType);

    setTimeout(() => {
      window.location.href =
        userType === "restaurant"
          ? "resto-dashboard.html"
          : "home-user.html";
    }, 3000);
  }

  /* ---------------- HANDLE REDIRECT (iOS FIX) ---------------- */

  (async () => {
    try {
      const result = await getRedirectResult(auth);

      if (result?.user) {
        await writeOrUpdateUserProfile(result.user);

        // prevent onAuthStateChanged race
        localStorage.setItem("justRedirected", "true");

        showSubmitModalAndRedirect("user");
      }
    } catch (error) {
      showError(error.message);
    }
  })();

  /* ---------------- AUTH STATE ---------------- */

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    // Skip auto redirect right after redirect login
    if (localStorage.getItem("justRedirected")) {
      localStorage.removeItem("justRedirected");
      return;
    }

    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) return;

      const type = snap.data().type || "user";
      localStorage.setItem("loggedInUserType", type);

      const page = window.location.pathname.split("/").pop();
      if (
        page === "" ||
        page === "index.html" ||
        page === "sign-up.html" ||
        page === "sign-up-resto.html"
      ) {
        window.location.href =
          type === "restaurant"
            ? "resto-dashboard.html"
            : "home-user.html";
      }
    } catch (err) {
      showError(err.message);
    }
  });

  async function checkEmailExists(email) {
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      return methods; // [] = not registered
    } catch (err) {
      throw err;
    }
  }

  /* ---------------- EMAIL LOGIN ---------------- */

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);

      const snap = await getDoc(doc(db, "users", cred.user.uid));
      const type = snap.exists() ? snap.data().type : "user";

      showSubmitModalAndRedirect(type);
      loginForm.reset();

    } catch (err) {
      if (err.code === "auth/user-not-found") {
        showError("No account found with this email.");
      } else if (err.code === "auth/wrong-password") {
        showError("Incorrect password.");
      } else if (err.code === "auth/account-exists-with-different-credential") {
        showError("This email is registered using Google or Apple.");
      } else {
        showError(err.message);
      }
    }
  });

  /* ---------------- GOOGLE LOGIN ---------------- */
  googleLoginBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    const provider = new GoogleAuthProvider();

    try {
      if (isIOS()) {
        await signInWithRedirect(auth, provider);
        return;
      }

      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;

      const methods = await checkEmailExists(email);

      if (
        methods.length &&
        !methods.includes("google.com")
      ) {
        await auth.signOut();
        return showError(
          "This email is already registered using " +
          methods[0].replace(".com", "")
        );
      }

      await writeOrUpdateUserProfile(result.user);
      showSubmitModalAndRedirect("user");

    } catch (err) {
      showError(err.message);
    }
  });

  /* ---------------- APPLE LOGIN ---------------- */
  appleLoginBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");

    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;

      const methods = await checkEmailExists(email);

      if (
        methods.length &&
        !methods.includes("apple.com")
      ) {
        await auth.signOut();
        return showError(
          "This email is already registered using " +
          methods[0].replace(".com", "")
        );
      }

      await writeOrUpdateUserProfile(result.user);
      showSubmitModalAndRedirect("user");

    } catch (err) {
      showError(err.message);
    }
  });

  /* ---------------- USER SIGN UP ---------------- */

  signUpForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      const email = document.getElementById("signup-email").value.trim();
      const password = document.getElementById("signup-password").value;
      const rep = document.getElementById("password_rep").value;
      const username = document.getElementById("signup-username").value.trim();

      if (password !== rep) return showError("Passwords do not match");

      const cred = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, "users", cred.user.uid), {
        email,
        username,
        type: "user"
      });

      showSubmitModalAndRedirect("user");
      signUpForm.reset();
    } catch (err) {
      showError(err.message);
    }
  });

  /* ---------------- RESTO SIGN UP ---------------- */

  restoBtn1?.addEventListener("click", () =>
    window.location.href = "sign-up-resto.html"
  );

  restoBtn?.addEventListener("click", async () => {
    try {
      const email = document.getElementById("resto-email").value.trim();
      const password = document.getElementById("resto-password").value;
      const rep = document.getElementById("resto-password_rep").value;
      const name = document.getElementById("restoname").value.trim();

      if (password !== rep) return showError("Passwords do not match");

      const cred = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, "users", cred.user.uid), {
        email,
        username: name,
        type: "restaurant"
      });

      showSubmitModalAndRedirect("restaurant");
      restoForm.reset();
    } catch (err) {
      showError(err.message);
    }
  });

  /* ---------------- LOGOUT ---------------- */

  document.querySelector(".log-out-toggle")?.addEventListener("click", async () => {
    showNotif("Logging out...");
    setTimeout(async () => {
      await auth.signOut();
      localStorage.clear();
      window.location.href = "index.html";
    }, 2000);
  });

  /* ---------------- PASSWORD TOGGLE ---------------- */
  const passwordInput = document.getElementById("login-password");
  const togglePassword = document.getElementById("togglePassword");
  const toggleIcon = togglePassword.querySelector("i");

  togglePassword.addEventListener("click", () => {
    // Toggle input type
    const type = passwordInput.type === "password" ? "text" : "password";
    passwordInput.type = type;

    // Toggle icon
    toggleIcon.classList.toggle("fa-eye");
    toggleIcon.classList.toggle("fa-eye-slash");
  });



});
