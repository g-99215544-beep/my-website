// Import fungsi utama dari Firebase (melalui tetingkap global)
const { 
    initializeApp, 
    getAuth, signInAnonymously, signInWithCustomToken, signInWithEmailAndPassword, onAuthStateChanged, signOut,
    getFirestore, doc, getDoc, onSnapshot, collection, query, orderBy
} = window.firebase;

// Import konfigurasi
// ... existing code ... -->
// ... existing code ... -->
    try {
        // 1. Inisialisasi Firebase
        const app = initializeApp(firebaseConfig);
// ... existing code ... -->
        db = getFirestore(app);

        // Tetapkan log level (berguna untuk debug)
        // setAuthLogLevel('Debug'); // Dibuang - Tidak dieksport oleh Firebase v11 CDN
        // setFirestoreLogLevel('Debug'); // Dibuang - Tidak dieksport oleh Firebase v11 CDN
        
        // 2. Pasang pendengar Auth
        setupAuthListeners();
// ... existing code ... -->

