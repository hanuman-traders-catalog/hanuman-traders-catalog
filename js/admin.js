import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
const auth = getAuth(app);
const db = getFirestore(app);

const CLOUDINARY_CLOUD_NAME = "do2wqztpp";
const CLOUDINARY_UPLOAD_PRESET = "hanuman_traders";

// DOM
const authSection = document.getElementById('authSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const addProductForm = document.getElementById('addProductForm');
const productImagesInput = document.getElementById('productImages');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const submitProductBtn = document.getElementById('submitProductBtn');
const adminProductList = document.getElementById('adminProductList');

// Multi-Image Preview
productImagesInput.addEventListener('change', (e) => {
  imagePreviewContainer.innerHTML = '';
  Array.from(e.target.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.src = event.target.result;
      img.className = 'h-16 w-16 object-cover border border-neutral-300 rounded';
      imagePreviewContainer.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});

// Auth
onAuthStateChanged(auth, (user) => {
  if (user) {
    authSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');
    loadProducts();
  } else {
    authSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    logoutBtn.classList.add('hidden');
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    document.getElementById('loginError').textContent = error.message;
    document.getElementById('loginError').classList.remove('hidden');
  }
});

logoutBtn.addEventListener('click', () => signOut(auth));

// FIXED: Upload multiple images in parallel using Promise.all
async function uploadImagesToCloudinary(files) {
  const uploadPromises = Array.from(files).map(async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    return data.secure_url; 
  });
  
  // Wait for all uploads to finish
  const results = await Promise.all(uploadPromises);
  // Remove any failed uploads (undefined)
  return results.filter(url => url); 
}

// Add Product
addProductForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitProductBtn.textContent = "Uploading Images (Please Wait)...";
  submitProductBtn.disabled = true;

  try {
    const imageUrls = await uploadImagesToCloudinary(productImagesInput.files);

    await addDoc(collection(db, "products"), {
      name: document.getElementById('productName').value,
      price: document.getElementById('productPrice').value || null,
      category: document.getElementById('productCategory').value,
      
      // Sizes & Colors logic
      colors: document.getElementById('productColors').value.split(',').map(c => c.trim()).filter(c => c),
      sizes: document.getElementById('productSizes').value.split(',').map(s => s.trim()).filter(s => s),
      
      images: imageUrls, 
      available: document.getElementById('isAvailable').checked,
      createdAt: serverTimestamp()
    });
    
    addProductForm.reset();
    imagePreviewContainer.innerHTML = '';
    loadProducts();
  } catch (error) {
    console.error(error);
    alert("Error uploading. Check console.");
  } finally {
    submitProductBtn.textContent = "Add Product";
    submitProductBtn.disabled = false;
  }
});

// Load Products
async function loadProducts() {
  const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  
  adminProductList.innerHTML = '';
  document.getElementById('productCount').textContent = `${snap.size} items`;

  snap.forEach(docSnap => {
    const p = docSnap.data();
    const id = docSnap.id;
    const thumb = p.images && p.images.length > 0 ? p.images[0] : (p.image || 'https://via.placeholder.com/150');
    
    const statusHtml = p.available === false 
      ? '<span class="text-red-600 font-semibold text-xs">Out of Stock</span>' 
      : '<span class="text-green-600 font-semibold text-xs">Available</span>';

    const div = document.createElement('div');
    div.className = 'flex items-center justify-between p-4 border border-neutral-200 rounded-sm';
    div.innerHTML = `
      <div class="flex items-center gap-4">
        <img src="${thumb}" class="w-16 h-16 object-cover border border-neutral-200">
        <div>
          <h3 class="font-medium">${p.name}</h3>
          <div class="text-xs text-neutral-500 flex items-center gap-2 mt-1">
            <span class="bg-neutral-100 px-2 py-0.5">${p.category}</span>
            <span>₹${p.price || 'N/A'}</span>
            <span>•</span>
            ${statusHtml}
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <button onclick="toggleStock('${id}', ${p.available !== false})" class="text-xs border border-neutral-300 px-3 py-1 hover:bg-neutral-100 transition">
          ${p.available === false ? 'Mark Available' : 'Mark Out of Stock'}
        </button>
        <button onclick="deleteProduct('${id}')" class="text-xs text-red-600 hover:underline text-right">Delete</button>
      </div>
    `;
    adminProductList.appendChild(div);
  });
}

window.toggleStock = async (id, currentStatus) => {
  await updateDoc(doc(db, "products", id), { available: !currentStatus });
  loadProducts();
};

window.deleteProduct = async (id) => {
  if (confirm("Delete this product?")) {
    await deleteDoc(doc(db, "products", id));
    loadProducts();
  }
};