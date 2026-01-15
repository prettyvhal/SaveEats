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
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

  /* ---------------- HELPERS ---------------- */

  const isAuthPage = () => {
    const page = window.location.pathname.split("/").pop();
    return (
      page === "" ||
      page === "index.html" ||
      page === "sign-up.html" ||
      page === "index" ||
      page === "sign-up"
    );
  };

  const isIOS = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  const isIphone = () =>
    /iPhone/.test(navigator.userAgent) && !window.MSStream;

  const handleIPhoneUI = () => {
      const googleBtn = document.getElementById("googleLoginBtn");
      if (!googleBtn) return;
      const isIPhone = /iPhone/.test(navigator.userAgent);

      if (isIPhone) {
          googleBtn.style.display = "none";
      } else {
          googleBtn.style.display = "display"; 
      }
  };

  handleIPhoneUI();
  window.addEventListener("resize", handleIPhoneUI);

  /* ---------------- ELEMENTS ---------------- */

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

  const googleLoginBtn = document.getElementById("googleLoginBtn");
  const appleLoginBtn = document.getElementById("appleLoginBtn");
  const emailModal = document.getElementById("contact-modal");

  /* ---------------- MODALS ---------------- */

  window.showError = (msg) => {
    if (!errorModal) return;
    errorMessageBox.textContent = msg;
    safeVibrate([80, 150, 80, 150, 80]);
    errorModal.classList.add("visible");
    //window.modalManager.open(errorModal);
  };

  window.showNotif = (msg) => {
    if (!notifModal) return;
    notifMessageBox.textContent = msg;
    safeVibrate([80, 150, 80]);
    notifModal.classList.add("visible");
    //window.modalManager.open(notifModal);
  };

  // Optional: close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === submitModal || e.target === errorModal || e.target === notifModal) {
      e.target.classList.remove("visible");
    }
  });

  /* ---------------- FIRESTORE PROFILE ---------------- */

  const writeOrUpdateUserProfile = async (user) => {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    await setDoc(ref, {
      email: user.email,
      username: user.displayName || snap.data()?.username || "",
      profileImage: user.photoURL || snap.data()?.profileImage || "",
      type: snap.data()?.type || "user"
    }, { merge: true });
  };

  /* ---------------- REDIRECT RESULT (ONCE) ---------------- */

  (async () => {
    try {
      const result = await getRedirectResult(auth);
      if (result?.user) {
        await writeOrUpdateUserProfile(result.user);
      }
    } catch (err) {
      showError(err.message);
    }
  })();

  /* ---------------- AUTH STATE ---------------- */

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Optional: If on a protected page, send to login
      return;
    }

    // Prevent redirect loops: only redirect if we are on index/signup
    if (!isAuthPage()) return;

    try {
      // 1. Check local cache first for speed
      let type = localStorage.getItem("loggedInUserType");

      // 2. If no cache, fetch from Firestore
      if (!type) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          type = snap.data().type;
          localStorage.setItem("loggedInUserType", type);
        } else {
          type = "user";
        }
      }

      window.location.replace(
        type === "restaurant" ? "resto-dashboard.html" : "home-user.html"
      );

    } catch (err) {
      console.error("Redirect check failed:", err);
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

      localStorage.setItem(
        "loggedInUserType",
        snap.exists() ? snap.data().type : "user"
      );
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
      // Safari on iOS hates popups; Force redirect to avoid Session Storage errors
      if (isIOS()) {
        // Optional: Save a hint to localStorage that we are expecting a redirect login
        localStorage.setItem("pendingLogin", "true");
        await signInWithRedirect(auth, provider);
        return; 
      }

      const result = await signInWithPopup(auth, provider);
      await handleLoginPostProcess(result.user);

    } catch (err) {
      showError("Google Sign-In failed: " + err.message);
    }
  });

  // Helper to handle Firestore logic after any login type
  async function handleLoginPostProcess(user) {
    const snap = await getDoc(doc(db, "users", user.uid));
    const type = snap.exists() ? snap.data().type : "user";
    
    localStorage.setItem("loggedInUserType", type);
    await writeOrUpdateUserProfile(user);
  }

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
      localStorage.setItem(
        "loggedInUserType",
        snap.exists() ? snap.data().type : "user"
      );

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

      localStorage.setItem(
        "loggedInUserType",
        snap.exists() ? snap.data().type : "user"
      );
      signUpForm.reset();
    } catch (err) {
      showError(err.message);
    }
  });

  /* ---------------- RESTO SIGN UP ---------------- */

  restoBtn1?.addEventListener("click", () =>
    modalManager.open([emailModal])
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

      localStorage.setItem(
        "loggedInUserType",
        snap.exists() ? snap.data().type : "restaurant"
      );
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
  document.querySelectorAll(".toggle-password").forEach(toggle => {
    toggle.addEventListener("click", () => {
      const wrapper = toggle.closest(".password-wrapper");
      const input = wrapper.querySelector("input");
      const icon = toggle.querySelector("i");

      // Toggle password visibility
      input.type = input.type === "password" ? "text" : "password";

      // Toggle icon
      icon.classList.toggle("fa-eye");
      icon.classList.toggle("fa-eye-slash");
    });
  });

  /* ---------------- FORGOT PASSWORD ---------------- */
  window.handleForgotPassword = async function(btn) {
    const email = document.getElementById("login-email").value.trim();
    if (!email) return showError("Please enter your email first.");

    const originalText = btn.innerHTML; 
    btn.disabled = true;
    btn.style.opacity = "0.7";
    const spinner = btn.querySelector('.btn-spinner');
    if(spinner) spinner.style.display = 'inline-block';

    try {
        setTimeout(() => {
          showNotif("Reset link sent! Please check your inbox, including spam/junk folder.");
        }, 200);
        await sendPasswordResetEmail(auth, email);
    } catch (err) {
        console.error("Reset Error:", err);
        let msg = "Failed to send reset email.";
        if (err.code === "auth/user-not-found") msg = "No account found with this email.";
        if (err.code === "auth/invalid-email") msg = "Invalid email format.";
        if (err.code === "auth/too-many-requests") msg = "Too many requests. Try again later.";
        
        showError(msg);
    } finally {
        btn.disabled = false;
        btn.style.opacity = "1";
        if(spinner) spinner.style.display = 'none';
    }
  };

  document.getElementById("goToHome")?.addEventListener("click", () => {
        window.location.href = "index.html";
  });

});