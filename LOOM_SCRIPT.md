# Urban Threads — Loom Demonstration Script

**Target Duration:** 5–7 minutes  
**Goal:** Demonstrate every rubric criterion with clear visual evidence.

---

## Introduction (30 sec)

"Hi, this is my submission for the Urban Threads e-commerce assessment. Urban Threads is a streetwear brand built as a complete single-page application experience using HTML, CSS, JavaScript, Firebase Authentication, and Firebase Firestore. Every feature you see is fully functional — no mock data, no fake buttons."

---

## Section 1: Visual Design & Responsive Layout (45 sec)

**Actions:**
1. Start on the homepage. Scroll slowly through the hero, categories, featured products, brand statement, and footer.
2. Resize the browser to mobile width (375px).
3. Open the mobile hamburger menu and navigate to Shop.
4. Resize back to desktop.

**Talking Points:**
- "The design follows an editorial streetwear aesthetic — high contrast, bold typography, generous whitespace, and a restrained warm-gold accent colour."
- "The site is fully responsive across all breakpoints from 375px mobile to 1440px+ desktop. Notice the mobile navigation, adapted grid layouts, and touch-optimized buttons."
- "Dark mode is fully implemented with intentional colour palettes for both themes, persisted in localStorage."

**Rubric:** Visual Presentation + Technical Organization (15 pts)

---

## Section 2: Firebase Firestore — Dynamic Products (60 sec)

**Actions:**
1. Open the Shop page.
2. Open the browser DevTools > Network tab.
3. Refresh the page and show the Firestore network requests loading products.
4. Open Firebase Console in a split screen or tab switch — show the `products` collection with real documents.

**Talking Points:**
- "All product data comes from Firebase Firestore. There are 16 products across four categories."
- "The products collection contains real documents with fields: name, price, category, description, imageURL, featured, and badge."
- "Products are never hardcoded in HTML. They are fetched dynamically and rendered client-side."
- "I have implemented caching to reduce unnecessary Firestore reads."

**Rubric:** Dynamic Firestore Products (20 pts)

---

## Section 3: Authentication — Sign Up (60 sec)

**Actions:**
1. Click Login in the navbar.
2. Switch to "Create account".
3. Enter invalid data (short password, mismatched passwords) to show validation errors.
4. Enter valid data and create a new account.
5. Show the navbar updating dynamically to display the user's name.
6. Open Firebase Console > Authentication to show the new user.

**Talking Points:**
- "The authentication system uses Firebase Authentication with email and password."
- "Validation includes required fields, valid email format, minimum password length, and password matching."
- "Errors are translated into user-friendly messages — never raw Firebase error codes."
- "On successful sign-up, a user document is created in Firestore at `users/{uid}` with their name, email, and timestamp."
- "The navbar updates instantly without a page refresh using the Firebase auth state observer."

**Rubric:** Login / Signup / Logout (15 pts) + Firebase Auth (10 pts)

---

## Section 4: Cart — Add, Update, Persist (90 sec)

**Actions:**
1. Go to the Shop page.
2. Add a product to the cart. Show the toast notification and cart count updating.
3. Add another product with a different quantity.
4. Navigate to the Cart page.
5. Show the cart items with images, names, prices, quantities, and subtotals.
6. Increase and decrease quantities.
7. Show the order summary with subtotal, shipping, and total.
8. Remove an item.
9. Show the empty cart state after clearing.
10. Log out and log back in — show the cart is still there.

**Talking Points:**
- "The cart is stored in Firestore under `users/{uid}/cart/{productId}`. It persists across sessions and devices."
- "Users can increase, decrease, and remove quantities. The subtotal, shipping, and total calculate in real time."
- "Shipping is R99, but free for orders over R1,500."
- "If the cart is empty, a designed empty state appears with a call-to-action back to the shop."
- "Cart data is user-isolated via Firestore security rules — no user can access another user's cart."

**Rubric:** Shopping Cart + Totals + Persistence (20 pts)

---

## Section 5: Advanced Features (90 sec)

**Actions:**

### Search & Filter
1. In the Shop page, type "hoodie" in the search box.
2. Click the "Hoodies" category pill.
3. Change the sort to "Price: Low to High".
4. Clear filters and show all products again.

### Product Detail
5. Click a product card to go to the product detail page.
6. Show the large image, description, quantity selector, add-to-cart, and wishlist button.
7. Scroll down to show the "Recently Viewed" section.

### Wishlist
8. Click the heart icon on a product to add it to the wishlist.
9. Show the visual feedback (filled heart, toast notification).
10. Remove it from the wishlist.

### Dark Mode
11. Toggle dark mode using the navbar button.
12. Navigate between pages to show the theme persists.

**Talking Points:**
- "Search filters products by name, description, and category in real time."
- "Category pills and sort dropdown work together — you can combine filters."
- "Each product has a dedicated detail page with full information, quantity controls, and wishlist functionality."
- "Recently viewed products are tracked in localStorage and displayed on product pages."
- "The wishlist is stored in Firestore and syncs across sessions."
- "Dark mode is intentionally designed — not just an inversion — with proper contrast and colour choices."
- "Toast notifications provide accessible feedback for every major action."

**Rubric:** Additional Features / Design Enhancements (20 pts)

---

## Section 6: Security & Accessibility (45 sec)

**Actions:**
1. Show the `firestore.rules` file in the code editor.
2. Tab through the page using only the keyboard to demonstrate focus states.
3. Show ARIA labels and semantic HTML in the DevTools inspector.

**Talking Points:**
- "Firestore security rules ensure users can only access their own data. Products are public, but carts and wishlists are strictly user-isolated."
- "The application is built with accessibility in mind: semantic HTML, ARIA labels, visible focus states, keyboard navigation, and proper form validation messages."
- "All interactive elements have appropriate touch targets for mobile."

**Rubric:** Security + Accessibility (embedded in other criteria)

---

## Conclusion (15 sec)

"This is Urban Threads — a fully functional, responsive, accessible, and secure e-commerce application built with real Firebase integration. Every feature works as demonstrated, and the codebase is modular, documented, and ready for assessment. Thank you."

---

## Quick Reference: What to Show

| Feature | Page | Evidence |
|---------|------|----------|
| Hero & branding | index.html | Visual design |
| Responsive layout | Any page | Resize to 375px |
| Dark mode | Any page | Theme toggle |
| Dynamic products | shop.html | DevTools Network + Firebase Console |
| Search | shop.html | Type in search box |
| Category filter | shop.html | Click category pills |
| Sorting | shop.html | Change sort dropdown |
| Sign up | login.html | Create account + Firebase Console |
| Login | login.html | Sign in + navbar update |
| Logout | Any page | Click logout |
| Add to cart | shop.html / product.html | Toast + cart count |
| Cart page | cart.html | Items, quantities, totals |
| Cart persistence | cart.html | Log out / log back in |
| Wishlist | shop.html / product.html | Heart icon toggle |
| Product detail | product.html | Full product view |
| Recently viewed | product.html | Scroll to section |
| Empty states | cart.html (empty) | Designed empty state |
| Error handling | login.html | Invalid credentials |
| Security rules | firestore.rules | Code view |
| Accessibility | Any page | Keyboard tab navigation |
