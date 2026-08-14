/**
 * Urban Threads — Products Module
 * Handles product fetching, filtering, sorting, and search from Firestore
 */

import { db } from './firebase.js';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { showToast, escapeHtml, formatPrice, handleImageError } from './ui.js';

// ============================================
// STATE
// ============================================
let allProducts = [];
let productsCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// ============================================
// FETCH PRODUCTS
// ============================================
export async function fetchProducts(options = {}) {
  const { forceRefresh = false, category = null, limit: limitCount = null } = options;

  // Use cache if available and not expired
  if (!forceRefresh && productsCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
    let products = [...productsCache];
    if (category) {
      products = products.filter(p => p.category === category);
    }
    if (limitCount) {
      products = products.slice(0, limitCount);
    }
    return { success: true, products };
  }

  try {
    let q = collection(db, 'products');

    if (category) {
      q = query(q, where('category', '==', category));
    }

    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    const snapshot = await getDocs(q);
    const products = [];

    snapshot.forEach(docSnap => {
      products.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    // Cache all products
    if (!category && !limitCount) {
      productsCache = [...products];
      cacheTimestamp = Date.now();
    }

    allProducts = productsCache || products;

    return { success: true, products };
  } catch (err) {
    console.error('Error fetching products:', err);
    return { success: false, error: 'Failed to load products. Please try again later.', products: [] };
  }
}

// ============================================
// FETCH SINGLE PRODUCT
// ============================================
export async function fetchProduct(productId) {
  if (!productId) {
    return { success: false, error: 'Invalid product ID.' };
  }

  try {
    const docRef = doc(db, 'products', productId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'Product not found.' };
    }

    return {
      success: true,
      product: {
        id: docSnap.id,
        ...docSnap.data()
      }
    };
  } catch (err) {
    console.error('Error fetching product:', err);
    return { success: false, error: 'Failed to load product. Please try again later.' };
  }
}

// ============================================
// FILTER & SORT
// ============================================
export function filterProducts(products, filters) {
  let result = [...products];

  // Search
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter(p => 
      (p.name && p.name.toLowerCase().includes(searchLower)) ||
      (p.description && p.description.toLowerCase().includes(searchLower)) ||
      (p.category && p.category.toLowerCase().includes(searchLower))
    );
  }

  // Category
  if (filters.category && filters.category !== 'All') {
    result = result.filter(p => p.category === filters.category);
  }

  // Sort
  if (filters.sort) {
    switch (filters.sort) {
      case 'price-asc':
        result.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-desc':
        result.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'name-asc':
        result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        break;
      case 'featured':
      default:
        result.sort((a, b) => {
          if (a.featured && !b.featured) return -1;
          if (!a.featured && b.featured) return 1;
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        });
    }
  }

  return result;
}

// ============================================
// RENDER PRODUCT CARD
// ============================================
export function createProductCard(product, options = {}) {
  const { showWishlist = true, wishlistItems = [] } = options;
  const isWishlisted = wishlistItems.includes(product.id);

  const card = document.createElement('article');
  card.className = 'product-card fade-in';
  card.setAttribute('data-product-id', product.id);

  const badgeHtml = product.badge 
    ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` 
    : '';

  const wishlistHtml = showWishlist 
    ? `<button class="product-wishlist-btn ${isWishlisted ? 'active' : ''}" data-product-id="${product.id}" aria-label="${isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}" title="${isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}">
        <svg viewBox="0 0 24 24" ${isWishlisted ? 'fill="currentColor"' : ''}>
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>` 
    : '';

  card.innerHTML = `
    <a href="product.html?id=${product.id}" class="product-image-wrapper">
      ${badgeHtml}
      ${wishlistHtml}
      <img src="${escapeHtml(product.imageURL || '')}" alt="${escapeHtml(product.name || 'Product image')}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600&h=800&fit=crop'">
    </a>
    <div class="product-info">
      <p class="product-category">${escapeHtml(product.category || '')}</p>
      <h3 class="product-name">${escapeHtml(product.name || 'Untitled Product')}</h3>
      <p class="product-price">${formatPrice(product.price)}</p>
      <div class="product-actions">
        <button class="btn btn-dark btn-sm btn-full add-to-cart-btn" data-product-id="${product.id}">
          Add to Cart
        </button>
      </div>
    </div>
  `;

  // Handle image error
  const img = card.querySelector('img');
  if (img) {
    handleImageError(img);
  }

  return card;
}

// ============================================
// RENDER PRODUCTS GRID
// ============================================
export function renderProductsGrid(container, products, options = {}) {
  if (!container) return;

  container.innerHTML = '';

  if (products.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="8" y1="15" x2="16" y2="15"/>
          <line x1="9" y1="9" x2="9.01" y2="9"/>
          <line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
        <h3 class="empty-state-title">No products found</h3>
        <p class="empty-state-text">Try adjusting your search or filter to find what you're looking for.</p>
      </div>
    `;
    return;
  }

  products.forEach((product, index) => {
    const card = createProductCard(product, options);
    card.style.animationDelay = `${index * 0.05}s`;
    container.appendChild(card);
  });
}

// ============================================
// RENDER LOADING SKELETONS
// ============================================
export function renderProductSkeletons(container, count = 8) {
  if (!container) return;

  container.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'product-card';
    skeleton.innerHTML = `
      <div class="product-image-wrapper">
        <div class="skeleton" style="width:100%;height:100%;"></div>
      </div>
      <div class="product-info">
        <div class="skeleton" style="width:40%;height:12px;margin-bottom:8px;"></div>
        <div class="skeleton" style="width:80%;height:16px;margin-bottom:8px;"></div>
        <div class="skeleton" style="width:30%;height:16px;margin-bottom:12px;"></div>
        <div class="skeleton" style="width:100%;height:36px;"></div>
      </div>
    `;
    container.appendChild(skeleton);
  }
}

// ============================================
// CATEGORIES
// ============================================
export const CATEGORIES = ['All', 'Hoodies', 'T-Shirts', 'Sneakers', 'Accessories'];

// ============================================
// SEED PRODUCTS (for initial Firestore setup)
// ============================================
export const SEED_PRODUCTS = [
  {
    name: "Oversized Core Hoodie",
    price: 799,
    category: "Hoodies",
    description: "Heavyweight cotton hoodie with an oversized streetwear fit. Features dropped shoulders, kangaroo pocket, and premium brushed fleece interior for all-day comfort.",
    imageURL: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=800&fit=crop",
    featured: true,
    badge: "BEST SELLER"
  },
  {
    name: "Vintage Wash Hoodie",
    price: 899,
    category: "Hoodies",
    description: "Garment-dyed hoodie with a vintage wash finish. Relaxed fit with ribbed cuffs and hem for a timeless streetwear silhouette.",
    imageURL: "https://images.unsplash.com/photo-1578768079052-aa76e52ff62e?w=600&h=800&fit=crop",
    featured: false,
    badge: null
  },
  {
    name: "Tech Fleece Hoodie",
    price: 999,
    category: "Hoodies",
    description: "Performance tech fleece hoodie with water-resistant finish. Designed for urban movement with hidden zip pockets and reflective details.",
    imageURL: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&h=800&fit=crop",
    featured: true,
    badge: "NEW"
  },
  {
    name: "Essential Box Tee",
    price: 349,
    category: "T-Shirts",
    description: "Premium heavyweight cotton box-fit t-shirt. Dropped shoulders and a relaxed silhouette make this the ultimate everyday staple.",
    imageURL: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=800&fit=crop",
    featured: true,
    badge: "BEST SELLER"
  },
  {
    name: "Graphic Street Tee",
    price: 449,
    category: "T-Shirts",
    description: "Oversized graphic t-shirt featuring original Urban Threads artwork. Printed on 240gsm cotton with a vintage cracked finish.",
    imageURL: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&h=800&fit=crop",
    featured: false,
    badge: null
  },
  {
    name: "Longline Layer Tee",
    price: 399,
    category: "T-Shirts",
    description: "Extended hem longline t-shirt designed for layering. Soft-touch cotton with side slits for enhanced mobility and style.",
    imageURL: "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&h=800&fit=crop",
    featured: false,
    badge: null
  },
  {
    name: "Retro Runner Sneakers",
    price: 1299,
    category: "Sneakers",
    description: "Vintage-inspired runner silhouette with modern cushioning. Suede and mesh upper with gum rubber outsole for that classic street look.",
    imageURL: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=800&fit=crop",
    featured: true,
    badge: "BEST SELLER"
  },
  {
    name: "Urban High-Top",
    price: 1499,
    category: "Sneakers",
    description: "Premium leather high-top sneakers with padded collar and cushioned insole. Clean lines and minimal branding for versatile styling.",
    imageURL: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=600&h=800&fit=crop",
    featured: false,
    badge: null
  },
  {
    name: "Chunky Street Trainer",
    price: 1199,
    category: "Sneakers",
    description: "Bold chunky sole trainer with mixed material upper. Statement silhouette that anchors any streetwear fit with confident style.",
    imageURL: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=600&h=800&fit=crop",
    featured: true,
    badge: "NEW"
  },
  {
    name: "Minimal Court Shoe",
    price: 999,
    category: "Sneakers",
    description: "Clean court-inspired sneaker in premium leather. Low-profile design with subtle perforations and a comfortable cupsole.",
    imageURL: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=600&h=800&fit=crop",
    featured: false,
    badge: null
  },
  {
    name: "Canvas Skate Low",
    price: 699,
    category: "Sneakers",
    description: "Durable canvas skate shoe with vulcanized sole. Reinforced stitching and padded tongue for skate performance and street style.",
    imageURL: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&h=800&fit=crop",
    featured: false,
    badge: null
  },
  {
    name: "Classic Dad Cap",
    price: 299,
    category: "Accessories",
    description: "Six-panel unstructured dad cap with embroidered logo. Adjustable strap closure and curved brim for everyday wear.",
    imageURL: "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=600&h=800&fit=crop",
    featured: false,
    badge: null
  },
  {
    name: "Urban Crossbody Bag",
    price: 549,
    category: "Accessories",
    description: "Compact crossbody bag with multiple compartments. Water-resistant nylon with adjustable strap and reflective zipper pulls.",
    imageURL: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=800&fit=crop",
    featured: true,
    badge: "NEW"
  },
  {
    name: "Leather Belt",
    price: 399,
    category: "Accessories",
    description: "Full-grain leather belt with brushed metal buckle. Clean design that pairs with any outfit from casual to smart-casual.",
    imageURL: "https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=600&h=800&fit=crop",
    featured: false,
    badge: null
  },
  {
    name: "Street Socks 3-Pack",
    price: 199,
    category: "Accessories",
    description: "Three-pack of premium cotton crew socks with ribbed cuffs. Cushioned footbed and reinforced heel for all-day comfort.",
    imageURL: "https://images.unsplash.com/photo-1582966772680-860e372bb558?w=600&h=800&fit=crop",
    featured: false,
    badge: null
  },
  {
    name: "Beanie Knit",
    price: 249,
    category: "Accessories",
    description: "Ribbed knit beanie in soft acrylic blend. Fold-over cuff with subtle embroidered logo. One size fits most.",
    imageURL: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=600&h=800&fit=crop",
    featured: false,
    badge: null
  }
];
