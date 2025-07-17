// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBQ3Kg8-VePjvqTHLzMnIJSPSPuCYus5j4",
  authDomain: "mysnacks-f0e01.firebaseapp.com",
  databaseURL: "https://mysnacks-f0e01-default-rtdb.firebaseio.com",
  projectId: "mysnacks-f0e01",
  storageBucket: "mysnacks-f0e01.firebasestorage.app",
  messagingSenderId: "711668333862",
  appId: "1:711668333862:web:9355dc9bd9a73908ddd5e7",
  measurementId: "G-7SZ8PF9J77"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// Section show/hide logic
function showSection(id) {
  ["landing-section", "signup-section", "login-section", "forgot-section", "dashboard-section"].forEach(sec => {
    document.getElementById(sec).classList.add("hidden");
  });
  document.getElementById(id).classList.remove("hidden");
}

// Placeholder for signup logic
async function signup() {
  const username = document.getElementById('signup-username').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const errorDiv = document.getElementById('signup-error');
  errorDiv.textContent = '';

  if (!username || !email || !password) {
    errorDiv.textContent = 'Please fill in all fields.';
    return;
  }

  // Check for unique username and email
  try {
    // Check username uniqueness
    const usernameSnap = await db.ref('usernames/' + username).once('value');
    if (usernameSnap.exists()) {
      errorDiv.textContent = 'Username already taken.';
      return;
    }
    // Check email uniqueness
    const emailSnap = await db.ref('emails').orderByValue().equalTo(email).once('value');
    if (emailSnap.exists()) {
      errorDiv.textContent = 'Email already in use.';
      return;
    }
    // Create user
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    // Save username and email mapping
    await db.ref('usernames/' + username).set(user.uid);
    await db.ref('emails/' + user.uid).set(email);
    await db.ref('users/' + user.uid).set({ username, email });
    // Set displayName
    await user.updateProfile({ displayName: username });
    // Send email verification
    await user.sendEmailVerification();
    errorDiv.style.color = '#2ecc71';
    errorDiv.textContent = 'Signup successful! Please verify your email before logging in.';
    setTimeout(() => showSection('login-section'), 2000);
  } catch (err) {
    errorDiv.textContent = err.message;
  }
}

// Placeholder for login logic
async function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorDiv = document.getElementById('login-error');
  errorDiv.textContent = '';

  if (!email || !password) {
    errorDiv.textContent = 'Please enter both email and password.';
    return;
  }

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    if (!user.emailVerified) {
      errorDiv.textContent = 'Please verify your email before logging in.';
      await auth.signOut();
      return;
    }
    showDashboard(user);
  } catch (err) {
    errorDiv.textContent = err.message;
  }
}

// Placeholder for Google sign-in logic
async function googleSignIn() {
  const errorDiv = document.getElementById('login-error');
  errorDiv.textContent = '';
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    // Only allow sbs.org emails
    if (!user.email.endsWith('@sbs.org')) {
      errorDiv.textContent = 'Only sbs.org emails are allowed for Google sign-in.';
      await auth.signOut();
      return;
    }
    // If new user, create username/email mapping if not exists
    const userSnap = await db.ref('users/' + user.uid).once('value');
    if (!userSnap.exists()) {
      // Try to use the part before @ as username, fallback to uid if taken
      let username = user.email.split('@')[0];
      const usernameSnap = await db.ref('usernames/' + username).once('value');
      if (usernameSnap.exists()) {
        username = user.uid.substring(0, 8);
      }
      await db.ref('usernames/' + username).set(user.uid);
      await db.ref('emails/' + user.uid).set(user.email);
      await db.ref('users/' + user.uid).set({ username, email: user.email });
      await user.updateProfile({ displayName: username });
    }
    showDashboard(user);
  } catch (err) {
    errorDiv.textContent = err.message;
  }
}

// Placeholder for forgot password logic
async function forgotPassword() {
  const email = document.getElementById('forgot-email').value.trim();
  const errorDiv = document.getElementById('forgot-error');
  const successDiv = document.getElementById('forgot-success');
  errorDiv.textContent = '';
  successDiv.textContent = '';

  if (!email) {
    errorDiv.textContent = 'Please enter your email.';
    return;
  }

  try {
    await auth.sendPasswordResetEmail(email);
    successDiv.textContent = 'Password reset email sent! Check your inbox.';
  } catch (err) {
    errorDiv.textContent = err.message;
  }
}

// Placeholder for dashboard logic
async function showDashboard(user) {
  showSection('dashboard-section');
  document.getElementById('dashboard-email').textContent = user.email;
  // Get username from DB or displayName
  let username = user.displayName || '';
  try {
    const snap = await db.ref('users/' + user.uid + '/username').once('value');
    if (snap.exists()) {
      username = snap.val();
    }
  } catch {}
  document.getElementById('dashboard-username').textContent = username;

  // Email verification reminder
  const verifyMsg = document.getElementById('verify-email-message');
  if (!user.emailVerified) {
    verifyMsg.innerHTML = `Please verify your email. <button class='btn' style='background:var(--pink);margin-top:0.5em;' onclick='sendVerificationEmail()'>Resend Verification Email</button>`;
  } else {
    verifyMsg.textContent = '';
  }
}

async function sendVerificationEmail() {
  const user = auth.currentUser;
  if (user && !user.emailVerified) {
    await user.sendEmailVerification();
    document.getElementById('verify-email-message').textContent = 'Verification email sent! Check your inbox.';
  }
}

function logout() {
  auth.signOut();
  showSection('landing-section');
}

// On load, show landing or dashboard if logged in
window.onload = function() {
  auth.onAuthStateChanged(user => {
    if (user) {
      showDashboard(user);
    } else {
      showSection("landing-section");
    }
  });
}; 
