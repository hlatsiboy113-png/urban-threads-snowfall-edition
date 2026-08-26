import { db } from './firebase.js';
import { getCurrentUser } from './auth.js';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { showToast, formatPrice } from './ui.js';

let cartItems = [];
let cartCallbacks = [];
let isLoading = false;

function notifyCartChange() {
  cartCallbacks.forEach(cb => { try { cb(cartItems); } catch (e) { console.error(e); } });
}

export function onCartChange(callback) {
  cartCallbacks.push(callback);
  callback(cartItems);
  return () => { cartCallbacks = cartCallbacks.filter(cb => cb !== callback); };
}

export async function loadCart() {
  const user = getCurrentUser();
  if (!user) { cartItems = []; notifyCartChange(); return { success: true, items: [] }; }
  if (isLoading) return { success: false, error: 'Cart is already loading.' };
  isLoading = true;
  try {
    const snapshot = await getDocs(collection(db, 'users', user.uid, 'cart'));
    cartItems = [];
    snapshot.forEach(docSnap => cartItems.push({ id: docSnap.id, ...docSnap.data() }));
    notifyCartChange();
    return { success: true, items: cartItems };
  } catch (err) {
    console.error('Error loading cart:', err);
    return { success: false, error: 'Failed to load cart. Please try again.' };
  } finally { isLoading = false; }
}

function getCartItemId(product, size) {
  return size ? `${product.id}__${size}` : product.id;
}

export async function addToCart(product, quantity = 1, size = null) {
  const user = getCurrentUser();
  if (!user) { showToast('Please log in to add items to your cart.', 'warning'); return { success: false, error: 'Not authenticated' }; }
  if (!product || !product.id) return { success: false, error: 'Invalid product.' };
  try {
    const cartItemId = getCartItemId(product, size);
    const cartRef = doc(db, 'users', user.uid, 'cart', cartItemId);
    const existingDoc = await getDoc(cartRef);
    if (existingDoc.exists()) {
      const existing = existingDoc.data();
      const newQty = (existing.quantity || 0) + quantity;
      await setDoc(cartRef, { ...existing, quantity: newQty, size: size || existing.size || null, updatedAt: serverTimestamp() });
      const idx = cartItems.findIndex(i => i.id === cartItemId);
      if (idx >= 0) { cartItems[idx].quantity = newQty; cartItems[idx].size = size || existing.size || null; }
    } else {
      const cartItem = { productId: product.id, name: product.name || 'Unknown', price: product.price || 0, imageURL: product.imageURL || '', category: product.category || '', quantity, size, addedAt: serverTimestamp(), updatedAt: serverTimestamp() };
      await setDoc(cartRef, cartItem);
      cartItems.push({ id: cartItemId, ...cartItem });
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

export async function updateQuantity(productId, quantity) {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  if (quantity < 1) return removeFromCart(productId);
  try {
    const cartRef = doc(db, 'users', user.uid, 'cart', productId);
    const existingDoc = await getDoc(cartRef);
    if (!existingDoc.exists()) return { success: false, error: 'Item not found in cart.' };
    await setDoc(cartRef, { ...existingDoc.data(), quantity, updatedAt: serverTimestamp() });
    const idx = cartItems.findIndex(i => i.id === productId);
    if (idx >= 0) cartItems[idx].quantity = quantity;
    notifyCartChange();
    return { success: true };
  } catch (err) {
    showToast('Failed to update quantity. Please try again.', 'error');
    return { success: false, error: 'Failed to update quantity.' };
  }
}

export async function removeFromCart(productId) {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  try {
    const item = cartItems.find(i => i.id === productId);
    await deleteDoc(doc(db, 'users', user.uid, 'cart', productId));
    cartItems = cartItems.filter(i => i.id !== productId);
    notifyCartChange();
    if (item) showToast(`Removed "${item.name}" from cart.`, 'success');
    return { success: true };
  } catch (err) {
    showToast('Failed to remove item. Please try again.', 'error');
    return { success: false, error: 'Failed to remove item.' };
  }
}

export async function clearCart() {
  const user = getCurrentUser();
  if (!user) return { success: false, error: 'Not authenticated' };
  try {
    const snapshot = await getDocs(collection(db, 'users', user.uid, 'cart'));
    await Promise.all(snapshot.docs.map(d => deleteDoc(d.ref)));
    cartItems = [];
    notifyCartChange();
    showToast('Cart cleared.', 'success');
    return { success: true };
  } catch (err) {
    showToast('Failed to clear cart. Please try again.', 'error');
    return { success: false, error: 'Failed to clear cart.' };
  }
}

export function getCartCount() { return cartItems.reduce((sum, i) => sum + (i.quantity || 0), 0); }
export function getCartSubtotal() { return cartItems.reduce((sum, i) => sum + ((i.price || 0) * (i.quantity || 0)), 0); }
export function getShippingCost() { return getCartSubtotal() > 1500 ? 0 : 99; }
export function getCartTotal() { return getCartSubtotal() + getShippingCost(); }
export function getCartItems() { return [...cartItems]; }

export function updateCartUI() {
  const count = getCartCount();
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  });
}

export function initCart() {
  import('./auth.js').then(({ onAuthStateChange }) => {
    onAuthStateChange((user) => { if (user) loadCart(); else { cartItems = []; notifyCartChange(); } });
  });
  onCartChange(() => updateCartUI());
}
