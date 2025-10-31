// Import fungsi utama dari Firebase (melalui tetingkap global)
const { 
    initializeApp, 
    getAuth, signInAnonymously, signInWithCustomToken, signInWithEmailAndPassword, onAuthStateChanged, signOut,
    getFirestore, doc, getDoc, onSnapshot, collection, query, orderBy
} = window.firebase;

// Import konfigurasi
import { firebaseConfig } from './firebaseConfig.js';

// Import modul Utiliti
import { showMessage, showConfirm, setUtilsDb, playSound } from './utils.js';

// Import modul Tab
import { initTabPermohonan, updatePermohonanAssets } from './tabPermohonan.js';
import { initTabAset, updateAsetTersedia } from './tabAset.js';
import { initTabDipinjam, updateAsetDipinjam } from './tabDipinjam.js';
import { initTabRekod, showAdminPanel, updateRekodPinjaman, updateRekodAssets } from './tabRekod.js';

// === PEMBOLEHUBAH GLOBAL ===
let db;
let auth;
let currentUserId = null;
let isAdmin = false;

// Pembolehubah untuk menyimpan pendengar (listeners) Firestore
let assetsListener = null;
let loansListener = null;
let schoolInfoListener = null;

// Rujukan DOM Utama
const tabNav = document.getElementById('tab-nav');
const tabContent = document.getElementById('tab-content');
const authStatus = document.getElementById('auth-status');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const closeLoginModalBtn = document.getElementById('close-login-modal');

// === FUNGSI PERMULAAN (INIT) ===

// Fungsi ini dipanggil apabila DOM selesai dimuatkan
document.addEventListener('DOMContentLoaded', () => {
    // 1. (FIX) Sediakan pendengar acara UI dahulu. Ini selamat dan tidak perlukan db.
    tabNav.addEventListener('click', handleTabClick);
    loginButton.addEventListener('click', () => loginModal.classList.remove('hidden'));
    logoutButton.addEventListener('click', handleLogout);
    closeLoginModalBtn.addEventListener('click', () => loginModal.classList.add('hidden'));
    loginForm.addEventListener('submit', handleLogin);
    
    // 2. Mulakan sambungan Firebase
    //    Fungsi ini akan menguruskan inisialisasi tab selepas db bersedia
    connectToFirebase();
});

// Fungsi untuk menyambung ke Firebase
async function connectToFirebase() {
    // Ambil ID Aplikasi (disediakan oleh Canvas)
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    
    try {
        // 1. Inisialisasi Firebase
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app); // <-- 'db' kini wujud
        
        // 2. (FIX) Panggil init function SELEPAS db wujud
        initTabPermohonan(db);
        initTabAset();
        initTabDipinjam();
        initTabRekod(db);

        // 3. Pasang pendengar Auth
        setupAuthListeners(appId); // Hantar appId ke pendengar

        // 4. Berikan 'db' kepada modul utiliti
        setUtilsDb(db);
        
        // 5. Mulakan pendengar (listener) untuk nama sekolah
        listenSchoolInfo(appId); // Hantar appId

    } catch (error) {
        console.error("Ralat Inisialisasi Firebase:", error);
        authStatus.textContent = 'Gagal menyambung ke pangkalan data.';
        authStatus.className = 'text-sm text-red-600 font-semibold';
    }
}


// === PENGURUSAN AUTENTIKASI (AUTH) ===

function setupAuthListeners(appId) { // Terima appId
    // Dapatkan token auth (disediakan oleh Canvas)
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Pengguna log masuk
            currentUserId = user.uid;
            isAdmin = !user.isAnonymous; // Jika bukan 'anonymous', anggap admin

            authStatus.textContent = isAdmin ? `Admin Log Masuk (ID: ${user.uid})` : 'Mod Tetamu';
            authStatus.className = 'text-sm text-green-700 font-semibold';
            loginButton.classList.add('hidden');
            logoutButton.classList.remove('hidden');
            loginModal.classList.add('hidden');
            
            // Tunjukkan panel admin jika admin
            showAdminPanel(isAdmin);
            
            // Pasang pendengar (listeners) Firestore
            attachFirestoreListeners(appId, user.uid); // Hantar appId
            
        } else {
            // Tiada pengguna / Log keluar
            currentUserId = null;
            isAdmin = false;
            authStatus.textContent = 'Menyambung...';
            authStatus.className = 'text-sm text-gray-600 italic';
            loginButton.classList.remove('hidden');
            logoutButton.classList.add('hidden');
            
            // Sembunyikan panel admin
            showAdminPanel(false);
            
            // Tanggalkan pendengar (listeners) Firestore
            detachFirestoreListeners();
            
            // Cuba log masuk (Token Khas atau Anonymous)
            try {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Ralat Log Masuk Automatik:", error);
                authStatus.textContent = 'Mod Offline. Gagal log masuk.';
                authStatus.className = 'text-sm text-red-600 font-semibold';
            }
        }
    });
}

// Log Masuk Admin Manual
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const loginSubmitBtn = document.getElementById('login-submit');
    
    loginError.textContent = '';
    loginSubmitBtn.disabled = true;
    loginSubmitBtn.textContent = 'Memproses...';

    try {
        // Log keluar pengguna 'anonymous' sedia ada dahulu
        if (auth.currentUser && auth.currentUser.isAnonymous) {
            await signOut(auth);
        }
        
        // Log masuk dengan e-mel & kata laluan
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged akan mengendalikan selebihnya
        playSound('success');
        
    } catch (error) {
        console.error("Ralat Log Masuk Manual:", error);
        loginError.textContent = 'E-mel atau kata laluan salah.';
        playSound('error');
        // Log masuk semula sebagai anonymous jika gagal
        await signInAnonymously(auth);
        
    } finally {
        loginSubmitBtn.disabled = false;
        loginSubmitBtn.textContent = 'Log Masuk';
    }
}

// Log Keluar
async function handleLogout() {
    const confirmed = await showConfirm('Log Keluar', 'Anda pasti mahu log keluar dari mod Admin?');
    if (confirmed) {
        try {
            await signOut(auth);
            // onAuthStateChanged akan log masuk sebagai anonymous secara automatik
        } catch (error) {
            console.error("Ralat Log Keluar:", error);
        }
    }
}


// === PENGURUSAN DATA (FIRESTORE LISTENERS) ===

// Pasang semua pendengar data
function attachFirestoreListeners(appId, userId) {
    // Pastikan pendengar lama ditanggalkan sebelum memasang yang baru
    detachFirestoreListeners();

    // 1. Pendengar untuk Aset (Koleksi Awam)
    // (FIX) Gunakan appId untuk laluan (path) yang betul
    const assetsPath = `artifacts/${appId}/public/data/assets`;
    const assetsQuery = query(collection(db, assetsPath)); 
    
    assetsListener = onSnapshot(assetsQuery, (snapshot) => {
        let assets = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
        
        // Isih (sort) di sini menggunakan JavaScript
        assets.sort((a, b) => {
            const nameA = a.data.name.toLowerCase();
            const nameB = b.data.name.toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });
    
        // Hantar data aset ke semua tab yang memerlukannya
        updatePermohonanAssets(assets);
        updateAsetTersedia(assets);
        updateRekodAssets(assets); // Untuk Pengurus Aset
        
    }, (error) => {
        console.error("Ralat pendengar aset (assets): ", error);
        showMessage('Ralat Pangkalan Data', 'Gagal memuatkan senarai aset.');
    });

    // 2. Pendengar untuk Pinjaman (Koleksi Awam)
    // (FIX) Gunakan appId untuk laluan (path) yang betul
    const loansPath = `artifacts/${appId}/public/data/loans`;
    const loansQuery = query(collection(db, loansPath)); // Ambil semua
    
    loansListener = onSnapshot(loansQuery, (snapshot) => {
        const loans = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
        
        // Hantar data pinjaman ke semua tab yang memerlukannya
        updateAsetDipinjam(loans);
        updateRekodPinjaman(loans); // Untuk Panel Admin

    }, (error) => {
        console.error("Ralat pendengar pinjaman (loans): ", error);
        showMessage('Ralat Pangkalan Data', 'Gagal memuatkan rekod pinjaman.');
    });
}

// Tanggalkan semua pendengar data (semasa log keluar)
function detachFirestoreListeners() {
    if (assetsListener) {
        assetsListener(); // Panggil fungsi 'unsubscribe'
        assetsListener = null;
    }
    if (loansListener) {
        loansListener();
        loansListener = null;
    }
}

// Pendengar untuk Maklumat Sekolah (Nama Sekolah)
function listenSchoolInfo(appId) { // Terima appId
    // (FIX) Gunakan appId untuk laluan (path) yang betul
    const schoolInfoPath = `artifacts/${appId}/public/data/school_info/details`;
    
    schoolInfoListener = onSnapshot(doc(db, schoolInfoPath), (doc) => {
        if (doc.exists()) {
            const schoolName = doc.data().name;
            if (schoolName) {
                document.getElementById('school-name').textContent = schoolName.toUpperCase();
                // Kemas kini juga tajuk dokumen
                document.title = `Sistem Pinjaman ICT - ${schoolName}`;
            }
        } else {
            // Jika tiada nama sekolah, tetapkan nama 'default'
            document.getElementById('school-name').textContent = "SISTEM PINJAMAN ASET ICT";
        }
    }, (error) => {
        console.error("Ralat memuatkan info sekolah: ", error);
        document.getElementById('school-name').textContent = "SISTEM PINJAMAN ASET ICT";
    });
}


// === PENGURUSAN NAVIGASI (TAB) ===

function handleTabClick(e) {
    const clickedTab = e.target.closest('button.tab-button');
    if (!clickedTab) return;

    // Jangan tukar tab jika ia sudah aktif
    if (clickedTab.classList.contains('active')) return;
    
    const targetPanelId = `panel-${clickedTab.dataset.tab === 'rekod' ? 'admin-rekod' : clickedTab.dataset.tab}`;

    // Nyahaktifkan semua tab dan panel
    tabNav.querySelectorAll('.tab-button').forEach(tab => {
        tab.classList.remove('active', 'border-blue-600', 'text-blue-600', 'bg-blue-100');
        tab.classList.add('text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
    });
    tabContent.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.add('hidden');
        panel.classList.remove('active');
    });

    // Aktifkan tab dan panel yang diklik
    clickedTab.classList.add('active', 'border-blue-600', 'text-blue-600', 'bg-blue-100');
    clickedTab.classList.remove('text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
    
    const activePanel = document.getElementById(targetPanelId);
    if (activePanel) {
        activePanel.classList.remove('hidden');
        activePanel.classList.add('active');
    }
}

