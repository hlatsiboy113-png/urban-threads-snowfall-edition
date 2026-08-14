/**
 * Urban Threads — Wishlist Module
 * Handles wishlist operations with Firestore persistence
 */

import { db } from './firebase.js';
import { getCurrentUser } from './auth.js';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { showToast } from './ui.js';

// ============================================
// STATE
// ============================================
let wishlistItems = [];
let wishlistCallbacks = [];

function notifyWishlistChange() {
  wishlistCallbacks.forEach(cb => {
    try { cb(wishlistItems); } catch (e) { console.error(e); }
  });
}

export function onWishlistChange(callback) {
  wishlistCallbacks.push(callback);
  callback(wishlistItems);
  return () => {
    wishlistCallbacks = wishlistCallbacks.filter(cb => cb !== callback);
  };
}

// ============================================
// LOAD WISHLIST
// ============================================
export async function loadWishlist() {
  const user = getCurrentUser();
  if (!user) {
    wishlistItems = [];
    notifyWishlistChange();
    return { success: true, items: [] };
  }

  try {
    const wishlistRef = collection(db, 'users', user.uid, 'wishlist');
    const snapshot = await getDocs(wishlistRef);

    wishlistItems = [];
    snapshot.forEach(docSnap => {
      wishlistItems.push(docSnap.id);
    });

    notifyWishlistChange();
    return { success: true, items: wishlistItems };
  } catch (err) {
    console.error('Error loading wishlist:', err);
    return { success: false, error: 'Failed to load wishlist.' };
  }
}

// ============================================
// ADD TO WISHLIST
// ============================================
export async function addToWishlist(product) {
  const user = getCurrentUser();
  if (!user) {
    showToast('Please log in to save items to your wishlist.', 'warning');
    return { success: false, error: 'Not authenticated' };
  }

  if (!product || !product.id) {
    return { success: false, error: 'Invalid product.' };
  }

  try {
    const wishlistRef = doc(db, 'users', user.uid, 'wishlist', product.id);

    await setDoc(wishlistRef, {
      productId: product.id,
      name: product.name || '',
      price: product.price || 0,
      imageURL: product.imageURL || '',
      category: product.category || '',
      addedAt: new Date()
    });

    if (!wishlistItems.includes(product.id)) {
      wishlistItems.push(product.id);
    }

    notifyWishlistChange();
    showToast(`Added "${product.name}" to wishlist.`, 'success');
    return { success: true };
  } catch (err) {
    console.error('Error adding to wishlist:', err);
    showToast('Failed to add to wishlist. Please try again.', 'error');
    return { success: false, error: 'Failed to add to wishlist.' };
  }
}

// ============================================
// REMOVE FROM WISHLIST
// ============================================
export async function removeFromWishlist(productId) {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  try {
    const wishlistRef = doc(db, 'users', user.uid, 'wishlist', productId);
    await deleteDoc(wishlistRef);

    wishlistItems = wishlistItems.filter(id => id !== productId);
    notifyWishlistChange();
    showToast('Removed from wishlist.', 'success');
    return { success: true };
  } catch (err) {
    console.error('Error removing from wishlist:', err);
    showToast('Failed to remove from wishlist. Please try again.', 'error');
    return { success: false, error: 'Failed to remove from wishlist.' };
  }
}

// ============================================
// TOGGLE WISHLIST
// ============================================
export async function toggleWishlist(product) {
  if (!product || !product.id) return { success: false };

  const isWishlisted = wishlistItems.includes(product.id);

  if (isWishlisted) {
    return removeFromWishlist(product.id);
  } else {
    return addToWishlist(product);
  }
}

// ============================================
// CHECK IF WISHLISTED
// ============================================
export function isWishlisted(productId) {
  return wishlistItems.includes(productId);
}

export function getWishlistItems() {
  return [...wishlistItems];
}

// ============================================
// INIT
// ============================================
export function initWishlist() {
  import('./auth.js').then(({ onAuthStateChange }) => {
    onAuthStateChange((user) => {
      if (user) {
        loadWishlist();
      } else {
        wishlistItems = [];
        notifyWishlistChange();
      }
    });
  });
}
