const firebaseConfig = {
  apiKey: "AIzaSyAQqc9khxreshF4LJVcRtigVqQNd0g-g3g",
  authDomain: "sistempengurusan-aset-ict-sksa.firebaseapp.com",
  projectId: "sistempengurusan-aset-ict-sksa",
  storageBucket: "sistempengurusan-aset-ict-sksa.firebasestorage.app",
  messagingSenderId: "891315232628",
  appId: "1:891315232628:web:ec691478c87cfec0985621",
  measurementId: "G-QKRJ0G00ZN"
};

// Import fungsi utama dari Firebase (melalui tetingkap global)
const { 
    initializeApp 
} = window.firebase;

// Inisialisasi Firebase
let app;
try {
    app = initializeApp(firebaseConfig);
} catch (e) {
    console.error("Ralat inisialisasi Firebase:", e);
}

export { firebaseConfig, app };

