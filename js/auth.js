import { auth, db } from './firebase.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { doc, setDoc, getDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { showToast } from './ui.js';

let currentUser = null;
let userData = null;
let authStateCallbacks = [];

/* ── Auth state resolution tracking ── */
let authResolved = false;
let authResolveFn = null;
const authReadyPromise = new Promise((resolve) => { authResolveFn = resolve; });

export function onAuthStateChange(callback) {
  authStateCallbacks.push(callback);
  if (authResolved) callback(currentUser, userData);
  return () => { authStateCallbacks = authStateCallbacks.filter(cb => cb !== callback); };
}

function notifyAuthStateChange() {
  authStateCallbacks.forEach(cb => { try { cb(currentUser, userData); } catch (e) { console.error(e); } });
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!authResolved) {
    authResolved = true;
    if (authResolveFn) { authResolveFn(); authResolveFn = null; }
  }
  if (user) {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      userData = userDoc.exists() ? userDoc.data() : { name: user.displayName || '', email: user.email };
    } catch (err) {
      userData = { name: user.displayName || '', email: user.email };
    }
  } else { userData = null; }
  notifyAuthStateChange();
});

export function getCurrentUser() { return currentUser; }
export function getUserData() { return userData; }
export function isAuthenticated() { return !!currentUser; }

/* ── Safe redirect validation ── */
function isSafeRedirect(url) {
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin !== window.location.origin) return false;
    // Allow .html pages, root, or empty
    const path = parsed.pathname;
    if (path === '/' || path === '') return true;
    return path.endsWith('.html');
  } catch { return false; }
}

/* ── Async requireAuth: waits for Firebase auth resolution ── */
export async function requireAuth(redirectUrl = 'login.html') {
  if (!authResolved) {
    await authReadyPromise;
  }
  if (!isAuthenticated()) {
    const redirectTarget = window.location.pathname + window.location.search;
    if (isSafeRedirect(redirectTarget)) {
      sessionStorage.setItem('authRedirect', redirectTarget);
    }
    const redirectParam = encodeURIComponent(redirectTarget);
    window.location.href = `${redirectUrl}?redirect=${redirectParam}`;
    return false;
  }
  return true;
}

export async function signUp(name, email, password, confirmPassword) {
  const errors = {};
  if (!name || name.trim().length < 2) errors.name = 'Please enter your full name.';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email address.';
  if (!password || password.length < 6) errors.password = 'Password must be at least 6 characters.';
  if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  if (Object.keys(errors).length > 0) return { success: false, errors };
  try {
    const uc = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(uc.user, { displayName: name.trim() });
    await setDoc(doc(db, 'users', uc.user.uid), { name: name.trim(), email: email.toLowerCase().trim(), createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    showToast('Account created successfully! Welcome to Urban Threads Kids.', 'success');
    return { success: true, user: uc.user };
  } catch (err) {
    return { success: false, errors: { general: getFriendlyError(err) } };
  }
}

export async function logIn(email, password) {
  const errors = {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email address.';
  if (!password) errors.password = 'Please enter your password.';
  if (Object.keys(errors).length > 0) return { success: false, errors };
  try {
    const uc = await signInWithEmailAndPassword(auth, email, password);
    showToast('Signed in successfully. Welcome back!', 'success');
    return { success: true, user: uc.user };
  } catch (err) {
    return { success: false, errors: { general: getFriendlyError(err) } };
  }
}

export async function logOut() {
  try { await signOut(auth); showToast('You have been signed out.', 'success'); return { success: true }; }
  catch (err) { showToast('Failed to sign out. Please try again.', 'error'); return { success: false }; }
}

function getFriendlyError(error) {
  const c = error.code || '';
  if (c === 'auth/email-already-in-use') return 'An account with this email already exists. Please log in instead.';
  if (c === 'auth/invalid-email') return 'Please enter a valid email address.';
  if (c === 'auth/user-disabled') return 'This account has been disabled. Please contact support.';
  if (c === 'auth/user-not-found') return 'No account found with this email. Please check your email or sign up.';
  if (c === 'auth/wrong-password' || c === 'auth/invalid-credential' || c === 'auth/invalid-login-credentials') return 'Invalid email or password. Please try again.';
  if (c === 'auth/weak-password') return 'Password must be at least 6 characters long.';
  if (c === 'auth/too-many-requests') return 'Too many failed attempts. Please try again later.';
  if (c === 'auth/network-request-failed') return 'Network error. Please check your internet connection and try again.';
  return 'An unexpected error occurred. Please try again.';
}

export function initNavbar() {
  const authLinks = document.getElementById('nav-auth-links');
  const userLinks = document.getElementById('nav-user-links');
  const userNameEl = document.getElementById('nav-user-name');
  if (!authLinks || !userLinks) return;
  onAuthStateChange((user, data) => {
    if (user) {
      authLinks.classList.add('hidden');
      userLinks.classList.remove('hidden');
      if (userNameEl) userNameEl.textContent = data?.name || user.displayName || user.email?.split('@')[0] || 'Account';
    } else {
      authLinks.classList.remove('hidden');
      userLinks.classList.add('hidden');
    }
  });
  const logoutBtn = document.getElementById('nav-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', async (e) => { e.preventDefault(); await logOut(); });
}
