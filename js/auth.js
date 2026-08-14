/**
 * Urban Threads — Authentication Module
 * Handles sign up, login, logout, session management, and user data
 */

import { auth, db } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { showToast } from './ui.js';

// ============================================
// AUTH STATE
// ============================================
let currentUser = null;
let userData = null;
let authStateCallbacks = [];

/**
 * Subscribe to auth state changes
 * @param {Function} callback - Function to call when auth state changes
 * @returns {Function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
  authStateCallbacks.push(callback);
  // Immediately call with current state if available
  if (currentUser !== undefined) {
    callback(currentUser, userData);
  }
  return () => {
    authStateCallbacks = authStateCallbacks.filter(cb => cb !== callback);
  };
}

function notifyAuthStateChange() {
  authStateCallbacks.forEach(callback => {
    try {
      callback(currentUser, userData);
    } catch (err) {
      console.error('Auth state callback error:', err);
    }
  });
}

// ============================================
// AUTH STATE OBSERVER
// ============================================
onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (user) {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        userData = userDoc.data();
      } else {
        userData = { name: user.displayName || '', email: user.email };
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      userData = { name: user.displayName || '', email: user.email };
    }
  } else {
    userData = null;
  }

  notifyAuthStateChange();
});

// ============================================
// GETTERS
// ============================================
export function getCurrentUser() {
  return currentUser;
}

export function getUserData() {
  return userData;
}

export function isAuthenticated() {
  return !!currentUser;
}

// ============================================
// SIGN UP
// ============================================
export async function signUp(name, email, password, confirmPassword) {
  // Validation
  const errors = {};

  if (!name || name.trim().length < 2) {
    errors.name = 'Please enter your full name.';
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!password || password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update profile with display name
    await updateProfile(user, { displayName: name.trim() });

    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    showToast('Account created successfully! Welcome to Urban Threads.', 'success');
    return { success: true, user };
  } catch (err) {
    console.error('Sign up error:', err);
    const friendlyError = getFriendlyAuthError(err);
    return { success: false, errors: { general: friendlyError } };
  }
}

// ============================================
// LOGIN
// ============================================
export async function logIn(email, password) {
  const errors = {};

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Please enter your password.';
  }

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    showToast('Signed in successfully. Welcome back!', 'success');
    return { success: true, user: userCredential.user };
  } catch (err) {
    console.error('Login error:', err);
    const friendlyError = getFriendlyAuthError(err);
    return { success: false, errors: { general: friendlyError } };
  }
}

// ============================================
// LOGOUT
// ============================================
export async function logOut() {
  try {
    await signOut(auth);
    showToast('You have been signed out.', 'success');
    return { success: true };
  } catch (err) {
    console.error('Logout error:', err);
    showToast('Failed to sign out. Please try again.', 'error');
    return { success: false };
  }
}

// ============================================
// ERROR HANDLING
// ============================================
function getFriendlyAuthError(error) {
  const code = error.code || '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please log in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please check your email or sign up.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    case 'auth/invalid-login-credentials':
      return 'Invalid email or password. Please try again.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

// ============================================
// AUTH GUARD
// ============================================
export function requireAuth(redirectUrl = '/login.html') {
  if (!isAuthenticated()) {
    sessionStorage.setItem('authRedirect', window.location.pathname + window.location.search);
    window.location.href = redirectUrl;
    return false;
  }
  return true;
}

// ============================================
// NAVBAR UPDATE
// ============================================
export function initNavbar() {
  const authLinks = document.getElementById('nav-auth-links');
  const userLinks = document.getElementById('nav-user-links');
  const userNameEl = document.getElementById('nav-user-name');

  if (!authLinks || !userLinks) return;

  onAuthStateChange((user, data) => {
    if (user) {
      authLinks.classList.add('hidden');
      userLinks.classList.remove('hidden');
      if (userNameEl) {
        userNameEl.textContent = data?.name || user.displayName || user.email?.split('@')[0] || 'Account';
      }
    } else {
      authLinks.classList.remove('hidden');
      userLinks.classList.add('hidden');
    }
  });

  // Logout button
  const logoutBtn = document.getElementById('nav-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await logOut();
    });
  }
}
