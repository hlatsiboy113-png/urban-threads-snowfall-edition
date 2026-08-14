/**
 * Urban Threads — Cart Module
 * Handles cart operations with Firestore persistence
 */

import { db } from './firebase.js';
import { auth } from './firebase.js';
import { getCurrentUser } from './auth.js';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { showToast, formatPrice } from './ui.js';

// ============================================
// STATE
// ============================================
let cartItems = [];
let cartCallbacks = [];
let isLoading = false;

function notifyCartChange() {
  cartCallbacks.forEach(cb => {
    try { cb(cartItems); } catch (e) { console.error(e); }
  });
}

export function onCartChange(callback) {
  cartCallbacks.push(callback);
  // Call immediately with current state
  callback(cartItems);
  return () => {
    cartCallbacks = cartCallbacks.filter(cb => cb !== callback);
  };
}

// ============================================
// GET CART REF
// ============================================
function getCartRef(productId = null) {
  const user = getCurrentUser();
  if (!user) return null;

  if (productId) {
    return doc(db, 'users', user.uid, 'cart', productId);
  }
  return collection(db, 'users', user.uid, 'cart');
}

// ============================================
// LOAD CART
// ============================================
export async function loadCart() {
  const user = getCurrentUser();
  if (!user) {
    cartItems = [];
    notifyCartChange();
    return { success: true, items: [] };
  }

  if (isLoading) return { success: false, error: 'Cart is already loading.' };

  isLoading = true;

  try {
    const cartRef = collection(db, 'users', user.uid, 'cart');
    const snapshot = await getDocs(cartRef);

    cartItems = [];
    snapshot.forEach(docSnap => {
      cartItems.push({
        productId: docSnap.id,
        ...docSnap.data()
      });
    });

    notifyCartChange();
    return { success: true, items: cartItems };
  } catch (err) {
    console.error('Error loading cart:', err);
    return { success: false, error: 'Failed to load cart. Please try again.' };
  } finally {
    isLoading = false;
  }
}

// ============================================
// ADD TO CART
// ============================================
export async function addToCart(product, quantity = 1) {
  const user = getCurrentUser();
  if (!user) {
    showToast('Please log in to add items to your cart.', 'warning');
    return { success: false, error: 'Not authenticated' };
  }

  if (!product || !product.id) {
    return { success: false, error: 'Invalid product.' };
  }

  try {
    const cartRef = doc(db, 'users', user.uid, 'cart', product.id);
    const existingDoc = await getDoc(cartRef);

    if (existingDoc.exists()) {
      const existing = existingDoc.data();
      const newQuantity = (existing.quantity || 0) + quantity;

      await setDoc(cartRef, {
        ...existing,
        quantity: newQuantity,
        updatedAt: serverTimestamp()
      });

      // Update local state
      const index = cartItems.findIndex(item => item.productId === product.id);
      if (index >= 0) {
        cartItems[index].quantity = newQuantity;
      }
    } else {
      const cartItem = {
        productId: product.id,
        name: product.name || 'Unknown Product',
        price: product.price || 0,
        imageURL: product.imageURL || '',
        category: product.category || '',
        quantity: quantity,
        addedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(cartRef, cartItem);
      cartItems.push(cartItem);
    }

    notifyCartChange();
    showToast(`Added "${product.name}" to cart.`, 'success');
    return { success: true };
  } catch (err) {
    console.error('Error adding to cart:', err);
    showToast('Failed to add item to cart. Please try again.', 'error');
    return { success: false, error: 'Failed to add to cart.' };
  }
}

// ============================================
// UPDATE QUANTITY
// ============================================
export async function updateQuantity(productId, quantity) {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  if (quantity < 1) {
    return removeFromCart(productId);
  }

  try {
    const cartRef = doc(db, 'users', user.uid, 'cart', productId);
    const existingDoc = await getDoc(cartRef);

    if (!existingDoc.exists()) {
      return { success: false, error: 'Item not found in cart.' };
    }

    await setDoc(cartRef, {
      ...existingDoc.data(),
      quantity: quantity,
      updatedAt: serverTimestamp()
    });

    const index = cartItems.findIndex(item => item.productId === productId);
    if (index >= 0) {
      cartItems[index].quantity = quantity;
    }

    notifyCartChange();
    return { success: true };
  } catch (err) {
    console.error('Error updating quantity:', err);
    showToast('Failed to update quantity. Please try again.', 'error');
    return { success: false, error: 'Failed to update quantity.' };
  }
}

// ============================================
// REMOVE FROM CART
// ============================================
export async function removeFromCart(productId) {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  try {
    const cartRef = doc(db, 'users', user.uid, 'cart', productId);
    await deleteDoc(cartRef);

    const item = cartItems.find(item => item.productId === productId);
    cartItems = cartItems.filter(item => item.productId !== productId);

    notifyCartChange();
    if (item) {
      showToast(`Removed "${item.name}" from cart.`, 'success');
    }
    return { success: true };
  } catch (err) {
    console.error('Error removing from cart:', err);
    showToast('Failed to remove item. Please try again.', 'error');
    return { success: false, error: 'Failed to remove item.' };
  }
}

// ============================================
// CLEAR CART
// ============================================
export async function clearCart() {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  try {
    const cartRef = collection(db, 'users', user.uid, 'cart');
    const snapshot = await getDocs(cartRef);

    const deletePromises = snapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
    await Promise.all(deletePromises);

    cartItems = [];
    notifyCartChange();
    showToast('Cart cleared.', 'success');
    return { success: true };
  } catch (err) {
    console.error('Error clearing cart:', err);
    showToast('Failed to clear cart. Please try again.', 'error');
    return { success: false, error: 'Failed to clear cart.' };
  }
}

// ============================================
// CALCULATIONS
// ============================================
export function getCartCount() {
  return cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
}

export function getCartSubtotal() {
  return cartItems.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
}

export function getShippingCost() {
  const subtotal = getCartSubtotal();
  return subtotal > 1500 ? 0 : 99;
}

export function getCartTotal() {
  return getCartSubtotal() + getShippingCost();
}

export function getCartItems() {
  return [...cartItems];
}

// ============================================
// UPDATE CART UI
// ============================================
export function updateCartUI() {
  // Update cart count badges
  const count = getCartCount();
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

// ============================================
// INIT
// ============================================
export function initCart() {
  // Listen for auth changes to load cart
  import('./auth.js').then(({ onAuthStateChange }) => {
    onAuthStateChange((user) => {
      if (user) {
        loadCart();
      } else {
        cartItems = [];
        notifyCartChange();
      }
    });
  });

  // Subscribe to cart changes for UI updates
  onCartChange(() => {
    updateCartUI();
  });
}
