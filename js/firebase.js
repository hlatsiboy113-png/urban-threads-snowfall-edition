import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDNx802wA6ony2ACYyZRUsHkW0ZdziuP4A",
  authDomain: "urban-threadz-snowfall-edition.firebaseapp.com",
  projectId: "urban-threadz-snowfall-edition",
  storageBucket: "urban-threadz-snowfall-edition.firebasestorage.app",
  messagingSenderId: "514741001875",
  appId: "1:514741001875:web:42650281ac873d326f3766"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;