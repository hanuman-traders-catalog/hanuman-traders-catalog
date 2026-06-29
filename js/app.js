import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// !!! PASTE YOUR REAL FIREBASE CONFIG HERE !!!
const firebaseConfig = {
  apiKey: "AIzaSyAuGsN9u9nDMRDBQYFuJ2dzYIhnQfBElzo",
  authDomain: "uncle-shop-catalog.firebaseapp.com",
  projectId: "uncle-shop-catalog",
  storageBucket: "uncle-shop-catalog.firebasestorage.app",
  messagingSenderId: "54598741381",
  appId: "1:54598741381:web:9754a6a9038b1b3ac568ec"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let allProducts = [];
const grid = document.getElementById('productGrid');
const modal = document.getElementById('productModal');
const modalBody = document.getElementById('productModalBody');

async function fetchProducts() {
  const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  allProducts = [];
  snap.forEach(doc => allProducts.push({ id: doc.id, ...doc.data() }));
  renderProducts("ALL");
}

function renderProducts(category) {
  grid.innerHTML = '';
  const filtered = category === "ALL" ? allProducts : allProducts.filter(p => p.category === category);
  
  if (filtered.length === 0) {
    grid.innerHTML = '<p class="col-span-full text-center text-neutral-500 py-10">No items found in this category.</p>';
    return;
  }

  filtered.forEach(p => {
    const thumb = p.images && p.images.length > 0 ? p.images[0] : (p.image || 'https://via.placeholder.com/150');
    
    const badge = p.available === false 
      ? '<span class="absolute top-2 left-2 bg-red-600 text-white text-[10px] uppercase font-bold px-2 py-1 tracking-wider z-10">Out of Stock</span>'
      : '';

    const card = document.createElement('div');
    card.className = "group cursor-pointer block relative";
    card.innerHTML = `
      <div class="aspect-[3/4] bg-neutral-100 overflow-hidden relative">
        <img src="${thumb}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500" loading="lazy">
        ${badge}
      </div>
      <div class="mt-3">
        <h3 class="text-sm font-semibold truncate">${p.name}</h3>
        <p class="text-sm text-neutral-500 mt-1">₹${p.price || 'N/A'}</p>
      </div>
    `;
    card.addEventListener('click', () => openModal(p));
    grid.appendChild(card);
  });
}

function openModal(p) {
  const imagesArray = p.images && p.images.length > 0 ? p.images : [p.image || 'https://via.placeholder.com/400'];
  const imagesHtml = imagesArray.map(img => `<img src="${img}" class="w-full h-auto object-cover mb-4 border border-neutral-100">`).join('');
  
  const statusBadge = p.available === false
    ? '<span class="inline-block bg-red-100 text-red-800 text-xs font-bold px-3 py-1 uppercase tracking-widest mb-4">Out of Stock</span>'
    : '<span class="inline-block bg-green-100 text-green-800 text-xs font-bold px-3 py-1 uppercase tracking-widest mb-4">Available</span>';

  // Format Colors and Sizes for display
  const displayColors = p.colors && p.colors.length > 0 ? p.colors.join(', ') : 'Assorted';
  const displaySizes = p.sizes && p.sizes.length > 0 ? p.sizes.join(', ') : 'Free Size / Unspecified';

  modalBody.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
      <div class="max-h-[60vh] overflow-y-auto pr-2">
        ${imagesHtml}
      </div>
      <div>
        ${statusBadge}
        <h2 class="text-3xl font-serifd mb-2">${p.name}</h2>
        <p class="text-xl text-neutral-600 mb-6 border-b border-neutral-200 pb-6">₹${p.price || 'Price on Request'}</p>
        
        <div class="space-y-4 text-sm">
          <div><strong class="uppercase tracking-wider text-xs block text-neutral-500 mb-1">Category</strong> ${p.category}</div>
          <div><strong class="uppercase tracking-wider text-xs block text-neutral-500 mb-1">Available Colors</strong> ${displayColors}</div>
          <div><strong class="uppercase tracking-wider text-xs block text-neutral-500 mb-1">Available Sizes</strong> ${displaySizes}</div>
        </div>
        
        <div class="mt-8 bg-neutral-50 p-4 border border-neutral-200">
          <p class="text-sm font-medium mb-2">Interested in this item?</p>
          <p class="text-xs text-neutral-500 mb-4">Take a screenshot and share it with us on WhatsApp to place a wholesale order.</p>
          <a href="https://wa.me/910000000000" target="_blank" class="block w-full bg-green-600 text-white text-center py-3 text-sm font-semibold tracking-wider uppercase hover:bg-green-700 transition">Share on WhatsApp</a>
        </div>
      </div>
    </div>
  `;
  modal.classList.remove('hidden');
  modal.classList.add('open');
}

document.getElementById('productModalClose').addEventListener('click', () => {
  modal.classList.remove('open');
  setTimeout(() => modal.classList.add('hidden'), 250);
});

function setActiveCategory(categoryName) {
  document.querySelectorAll('[data-category]').forEach(b => {
    if (b.dataset.category === categoryName) {
      b.style.color = '#0a0a0a';
      b.style.borderBottom = '2px solid #0a0a0a';
    } else {
      b.style.color = '#9ca3af';
      b.style.borderBottom = 'none';
    }
  });
  renderProducts(categoryName);
}

document.querySelectorAll('[data-category]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    setActiveCategory(e.currentTarget.dataset.category);
  });
});

document.querySelectorAll('[data-category-link]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault(); 
    const cat = e.currentTarget.dataset.categoryLink;
    setActiveCategory(cat);
    document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
    
    document.getElementById('mobileMenu').classList.add('hidden');
    document.getElementById('mobileMenu').classList.remove('flex');
  });
});

/* SCROLL REVEAL ANIMATION */
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);
document.querySelectorAll(".fade-up").forEach((el) => revealObserver.observe(el));

fetchProducts();