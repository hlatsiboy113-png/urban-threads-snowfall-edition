import { db } from './firebase.js';
import { getCurrentUser } from './auth.js';
import { doc, setDoc, deleteDoc, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { showToast } from './ui.js';

let wishlistItems = [];
let wishlistCallbacks = [];

function notifyWishlistChange() {
  wishlistCallbacks.forEach(cb => { try { cb(wishlistItems); } catch (e) { console.error(e); } });
}

export function onWishlistChange(callback) {
  wishlistCallbacks.push(callback);
  callback(wishlistItems);
  return () => { wishlistCallbacks = wishlistCallbacks.filter(cb => cb !== callback); };
}

export async function loadWishlist() {
  const user = getCurrentUser();
  if (!user) { wishlistItems = []; notifyWishlistChange(); return { success: true, items: [] }; }
  try {
    const snapshot = await getDocs(collection(db, 'users', user.uid, 'wishlist'));
    wishlistItems = [];
    snapshot.forEach(docSnap => wishlistItems.push(docSnap.id));
    notifyWishlistChange();
    return { success: true, items: wishlistItems };
  } catch (err) {
    return { success: false, error: 'Failed to load wishlist.' };
  }
}

export async function addToWishlist(product) {
  const user = getCurrentUser();
  if (!user) { showToast('Please log in to save items to your wishlist.', 'warning'); return { success: false, error: 'Not authenticated' }; }
  if (!product || !product.id) return { success: false, error: 'Invalid product.' };
  try {
    await setDoc(doc(db, 'users', user.uid, 'wishlist', product.id), { productId: product.id, name: product.name || '', price: product.price || 0, imageURL: product.imageURL || '', category: product.category || '', addedAt: new Date() });
    if (!wishlistItems.includes(product.id)) wishlistItems.push(product.id);
    notifyWishlistChange();
    showToast(`Added "${product.name}" to wishlist.`, 'success');
    return { success: true };
  } catch (err) {
    showToast('Failed to add to wishlist. Please try again.', 'error');
    return { success: false, error: 'Failed to add to wishlist.' };
  }
}

export async function removeFromWishlist(productId) {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  try {
    await deleteDoc(doc(db, 'users', user.uid, 'wishlist', productId));
    wishlistItems = wishlistItems.filter(id => id !== productId);
    notifyWishlistChange();
    showToast('Removed from wishlist.', 'success');
    return { success: true };
  } catch (err) {
    showToast('Failed to remove from wishlist. Please try again.', 'error');
    return { success: false, error: 'Failed to remove from wishlist.' };
  }
}

export async function toggleWishlist(product) {
  if (!product || !product.id) return { success: false };
  return wishlistItems.includes(product.id) ? removeFromWishlist(product.id) : addToWishlist(product);
}

export function isWishlisted(productId) { return wishlistItems.includes(productId); }
export function getWishlistItems() { return [...wishlistItems]; }

export function initWishlist() {
  import('./auth.js').then(({ onAuthStateChange }) => {
    onAuthStateChange((user) => { if (user) loadWishlist(); else { wishlistItems = []; notifyWishlistChange(); } });
  });
}
