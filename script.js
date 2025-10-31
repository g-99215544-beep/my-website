// Tunggu sehingga semua kandungan HTML dan skrip Firebase dimuatkan
document.addEventListener('DOMContentLoaded', () => {

    // --- PEMBOLEHUBAH GLOBAL ---
    // Objek untuk menyimpan semua data aplikasi
    const globalState = {
        assets: [],       // Senarai semua aset dari Firestore
        loans: [],        // Senarai semua pinjaman dari Firestore
        currentUser: null, // Objek pengguna Firebase
        isAdmin: false,   // Ditentukan selepas log masuk
        currentTab: 'permohonan', // Tab semasa
        selectedAssets: new Map(), // Untuk menyimpan aset yang dipilih dalam borang
        assetToDelete: null, // Untuk modal padam
        assetToEdit: null    // Untuk modal edit
    };

    // --- ELEMEN DOM ---
    // Simpan rujukan kepada elemen HTML yang kerap digunakan
    const authSection = document.getElementById('auth-section');
    const navTabs = document.getElementById('nav-tabs');
    const contentArea = document.getElementById('content-area');

    // --- ELEMEN MODAL ---
    const deleteModal = document.getElementById('delete-modal');
    const editModal = document.getElementById('edit-modal');

    // --- INISIALISASI FIREBASE ---
    // Pembolehubah untuk perkhidmatan Firebase
    let db, auth, appId;

    // Fungsi utama untuk memulakan Firebase
    async function initializeFirebaseApp() {
        // Dapatkan semua fungsi yang diperlukan dari 'window.firebase' (dari index.html)
        const {
            initializeApp, getAuth, onAuthStateChanged, signInAnonymously,
            signInWithCustomToken, getFirestore, setLogLevel, doc, getDoc
        } = window.firebase;

        try {
            // 1. Dapatkan Konfigurasi Firebase
            let firebaseConfig;
            if (typeof __firebase_config !== 'undefined' && __firebase_config) {
                firebaseConfig = JSON.parse(__firebase_config);
            } else {
                // Guna config sandaran (fallback) jika __firebase_config tidak wujud
                console.warn("Pembolehubah global __firebase_config tidak ditemui. Menggunakan konfigurasi sandaran.");
                firebaseConfig = {
                    apiKey: "AIzaSyCV5skKQO1i-T6pOckTEyhDG8H4fh7vS7s",
                    authDomain: "sistem-pinjaman-aset-ict-v2.firebaseapp.com",
                    projectId: "sistem-pinjaman-aset-ict-v2",
                    storageBucket: "sistem-pinjaman-aset-ict-v2.firebasestorage.app",
                    messagingSenderId: "1013418266777",
                    appId: "1:1013418266777:web:f3ec4d5f38fe7b87b76808",
                    measurementId: "G-9CQDWM207Z"
                };
            }
            
            // 2. Inisialisasi Aplikasi Firebase
            const app = initializeApp(firebaseConfig);
            
            // 3. Tetapkan pembolehubah global Firebase
            db = getFirestore(app);
            auth = getAuth(app);
            appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            
            // 4. Set Log Level (untuk debugging)
            setLogLevel('Debug');
            
            // 5. Setup Pendengar Status Pengesahan (Auth)
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    // Pengguna telah log masuk
                    globalState.currentUser = user;
                    // (DIUBAH) Hantar e-mel dan uid untuk semakan admin
                    await checkAdminStatus(user.uid, user.email); 
                    
                    // (BARU) Render bahagian auth di header (termasuk butang log keluar)
                    renderAuthSection();
                    
                    // Mula mendengar data dari Firestore
                    initializeDataListeners();

                } else {
                    // Tiada pengguna log masuk, cuba log masuk
                    try {
                        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                            await signInWithCustomToken(auth, __initial_auth_token);
                        } else {
                            await signInAnonymously(auth);
                        }
                    } catch (authError) {
                        console.error("Ralat Log Masuk:", authError);
                        authSection.innerHTML = `<span class="text-sm text-red-500">Gagal mengesahkan.</span>`;
                    }
                }
            });

        } catch (error) {
            console.error("Ralat memulakan Firebase:", error);
            authSection.innerHTML = `<span class="text-sm text-red-500">Ralat konfigurasi.</span>`;
            contentArea.innerHTML = `<p class="text-red-600">Ralat memuatkan konfigurasi Firebase: ${error.message}</p>`;
        }
    }

    /**
     * (DIUBAH) Render bahagian auth di header, kini termasuk butang Log Keluar
     */
    function renderAuthSection() {
        if (!authSection) return;

        const user = globalState.currentUser;
        if (!user) {
            authSection.innerHTML = `<span class="text-sm text-gray-500">Memuatkan...</span>`;
            return;
        }

        let userDisplay = '';
        let authButton = ''; // (BARU) Pembolehubah untuk butang

        if (globalState.isAdmin) {
            // (DIUBAH) Paparan Admin
            userDisplay = `<span class="text-sm font-medium text-red-700" title="ID: ${user.uid}">Admin: ${user.email || 'Mod Admin'}</span>`;
            // Butang Log Keluar (Merah) - seperti dalam image_6182bc.png
            authButton = `
                <button id="btn-logout" class="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-red-700">
                    Log Keluar
                </button>
            `;
        } else {
            // (DIUBAH) Paparan Guru
            userDisplay = `<span class="text-sm text-gray-700" title="${user.email || user.uid}">Mod Guru (ID: ${user.uid.substring(0, 6)})</span>`;
            // Butang Log Masuk Admin (Biru) - seperti dalam image_618260.png
            // Butang ini akan log keluar, membenarkan pengguna log masuk sebagai admin
            authButton = `
                <button id="btn-logout" class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
                    Log Masuk Admin
                </button>
            `;
        }

        // HTML untuk butang log keluar
        authSection.innerHTML = `
            ${userDisplay}
            ${authButton}
        `;

        // Tambah event listener untuk log keluar (kedua-dua butang berkongsi ID dan fungsi)
        document.getElementById('btn-logout').addEventListener('click', handleLogout);
    }

    /**
     * (BARU) Fungsi untuk mengendalikan Log Keluar
     */
    async function handleLogout() {
        const { signOut } = window.firebase;
        try {
            await signOut(auth);
            // Muat semula halaman untuk mencetuskan aliran log masuk yang baru
            location.reload(); 
        } catch (error) {
            console.error("Ralat log keluar:", error);
            alert("Gagal log keluar.");
        }
    }

    /**
     * (DIUBAH) Menyemak status admin menggunakan UID dan E-mel
     */
    async function checkAdminStatus(uid, email) {
        const { doc, getDoc } = window.firebase;

        // Senarai e-mel admin yang 'hardcoded'
        const hardcodedAdmins = [
            'gurubesar@sksa.com',
            'guruict@sksa.com'
        ];

        // 1. Semak e-mel 'hardcoded'
        if (email && hardcodedAdmins.includes(email)) {
            globalState.isAdmin = true;
            return; // Terus jadi admin
        }

        // 2. Jika tidak, semak koleksi 'admins' di Firestore
        try {
            const adminDocRef = doc(db, `/artifacts/${appId}/public/data/admins`, uid);
            const adminDoc = await getDoc(adminDocRef);
            
            if (adminDoc.exists()) {
                globalState.isAdmin = true;
            } else {
                globalState.isAdmin = false;
            }
        } catch (error) {
            console.error("Ralat menyemak status admin:", error);
            globalState.isAdmin = false;
        }
    }

    /**
     * Memulakan pendengar (listeners) data dari Firestore
     */
    function initializeDataListeners() {
        const { collection, onSnapshot } = window.firebase;

        // 1. Dengar perubahan pada koleksi 'assets'
        const assetsCollection = collection(db, `/artifacts/${appId}/public/data/assets`);
        onSnapshot(assetsCollection, (snapshot) => {
            globalState.assets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderCurrentTab(); // Muat semula paparan tab semasa
        }, (error) => {
            console.error("Ralat mendapatkan aset:", error);
            contentArea.innerHTML = "<p>Gagal memuatkan data aset.</p>";
        });

        // 2. Dengar perubahan pada koleksi 'loans'
        const loansCollection = collection(db, `/artifacts/${appId}/public/data/loans`);
        onSnapshot(loansCollection, (snapshot) => {
            globalState.loans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderCurrentTab(); // Muat semula paparan tab semasa
        }, (error) => {
            console.error("Ralat mendapatkan pinjaman:", error);
            contentArea.innerHTML = "<p>Gagal memuatkan data pinjaman.</p>";
        });

        // Selepas data dimuatkan kali pertama, render tab
        renderNavTabs();
        renderCurrentTab();
    }


    // --- FUNGSI RENDER HTML ---

    /**
     * Menjana HTML untuk Tab Permohonan
     */
    function renderPermohonan() {
        const availableAssets = globalState.assets.filter(a => a.status === 'available');
        const assetsByCategory = availableAssets.reduce((acc, asset) => {
            (acc[asset.category] = acc[asset.category] || []).push(asset);
            return acc;
        }, {});

        return `
            <div classgrid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Bahagian 1: Borang Permohonan -->
                <div class="lg:col-span-2 bg-white rounded-lg shadow p-6">
                    <form id="loan-form" class="space-y-4">
                        <h2 class="text-2xl font-bold text-blue-800 mb-4">1. Buat Permohonan Pinjaman</h2>
                        
                        <div>
                            <label for="teacher-name" class="block text-sm font-medium text-gray-700">Nama Guru</label>
                            <input type="text" id="teacher-name" value="${globalState.currentUser?.email || ''}" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                        </div>
                        <div>
                            <label for="teacher-ic" class="block text-sm font-medium text-gray-700">No Kad Pengenalan</label>
                            <input type="text" id="teacher-ic" placeholder="Cth: 900101-01-1234" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                        </div>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label for="start-date" class="block text-sm font-medium text-gray-700">Tarikh Pinjam</label>
                                <input type="date" id="start-date" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                            </div>
                            <div>
                                <label for="end-date" class="block text-sm font-medium text-gray-700">Tarikh Pulang</label>
                                <input type="date" id="end-date" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                            </div>
                        </div>

                        <div>
                            <label for="purpose" class="block text-sm font-medium text-gray-700">Tujuan Pinjaman</label>
                            <textarea id="purpose" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required></textarea>
                        </div>
                        
                        <div class="pt-2">
                            <p class="text-sm text-gray-600 mb-2">Pilihan aset: ${globalState.selectedAssets.size} item dipilih.</p>
                            <button type="submit" class="w-full rounded-md border border-transparent bg-green-600 py-3 px-4 text-base font-medium text-white shadow-sm hover:bg-green-700">
                                Hantar Permohonan Untuk Item Dipilih
                            </button>
                        </div>
                    </form>
                </div>
                
                <!-- Bahagian 2: Pilih Aset -->
                <div class="lg:col-span-1 bg-white rounded-lg shadow p-6">
                    <h2 class="text-2xl font-bold text-blue-800 mb-4">2. Pilih Aset</h2>
                    <div id="asset-selection" class="space-y-3">
                        ${Object.keys(assetsByCategory).length === 0 ? '<p class="text-gray-500">Tiada aset tersedia buat masa ini.</p>' : ''}
                        ${Object.entries(assetsByCategory).map(([category, assets]) => `
                            <div class="border rounded-md">
                                <button class="accordion-toggle flex w-full justify-between items-center p-3 bg-gray-50">
                                    <span class="font-medium text-gray-800">${category}</span>
                                    <span class="bg-blue-200 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full">${assets.length}</span>
                                </button>
                                <div class="accordion-content p-3 space-y-2 hidden">
                                    ${assets.map(asset => `
                                        <div 
                                            class="asset-item-clickable p-2 border rounded-md cursor-pointer hover:bg-gray-100 ${globalState.selectedAssets.has(asset.id) ? 'selected' : ''}"
                                            data-id="${asset.id}" 
                                            data-name="${asset.name}">
                                            ${asset.name}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Menjana HTML untuk Tab Aset Tersedia (Paparan Guru)
     */
    function renderAsetTersedia() {
        const availableAssets = globalState.assets.filter(a => a.status === 'available');
        const assetsByCategory = availableAssets.reduce((acc, asset) => {
            (acc[asset.category] = acc[asset.category] || []).push(asset);
            return acc;
        }, {});

        return `
            <div class="bg-white rounded-lg shadow p-6">
                <h2 class="text-2xl font-bold text-green-700 mb-4">Aset Tersedia (Paparan Sahaja)</h2>
                <div class="space-y-4">
                    ${Object.keys(assetsByCategory).length === 0 ? '<p class="text-gray-500">Tiada aset tersedia buat masa ini.</p>' : ''}
                    ${Object.entries(assetsByCategory).map(([category, assets]) => `
                        <div class="border rounded-md">
                            <button class="accordion-toggle flex w-full justify-between items-center p-4 bg-gray-50">
                                <span class="text-lg font-medium text-gray-800">${category}</span>
                                <span class="bg-green-200 text-green-800 text-sm font-semibold px-2.5 py-0.5 rounded-full">${assets.length}</span>
                            </button>
                            <div class="accordion-content p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 hidden">
                                ${assets.map(asset => `
                                    <span class="p-2 border rounded-md bg-green-50 text-green-700 text-sm">${asset.name}</span>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    /**
     * Menjana HTML untuk Tab Aset Dipinjam (Paparan Guru)
     */
    function renderAsetDipinjam() {
        const loanedAssets = globalState.loans.filter(loan => 
            loan.status === 'loaned' || (loan.status === 'pending' && loan.teacherUid === globalState.currentUser?.uid)
        );

        const calculateDaysRemaining = (endDateStr) => {
            const end = new Date(endDateStr);
            const now = new Date();
            const diffTime = end.getTime() - now.getTime();
            if (diffTime < 0) return { days: 0, label: 'TERLEPAS' };
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return { days: diffDays, label: `${diffDays} HARI LAGI` };
        };

        return `
            <div class="bg-white rounded-lg shadow p-6">
                <h2 class="text-2xl font-bold text-red-700 mb-4">Aset Sedang Dipinjam</h2>
                ${loanedAssets.length === 0 ? '<p class="text-gray-500">Tiada aset sedang dipinjam atau dalam proses kelulusan.</p>' : ''}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${loanedAssets.map(loan => {
                        const { days, label } = calculateDaysRemaining(loan.endDate);
                        const isPending = loan.status === 'pending';
                        return loan.assets.map(asset => `
                            <div class="rounded-lg border ${isPending ? 'border-yellow-400' : 'border-red-400'} bg-white p-4">
                                <h3 class="font-bold text-gray-900">${asset.name}</h3>
                                <p class="text-sm text-gray-600">Peminjam: ${loan.teacherName}</p>
                                <p class="text-sm text-gray-600">Tujuan: ${loan.purpose}</p>
                                <p class="text-sm text-gray-600">Pulang: ${formatDate(loan.endDate)}</p>
                                <div class="mt-3 text-center rounded-md ${isPending ? 'bg-yellow-100' : (days === 0 ? 'bg-red-200' : 'bg-red-100')} p-2">
                                    <span class="text-lg font-bold ${isPending ? 'text-yellow-800' : 'text-red-800'}">
                                        ${isPending ? 'MENUNGGU KELULUSAN' : label}
                                    </span>
                                </div>
                            </div>
                        `).join('');
                    }).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Menjana HTML untuk Tab Rekod Pinjaman (Paparan Admin)
     */
    function renderRekodPinjaman() {
        return `
            <!-- Bahagian Rekod Permohonan -->
            <div class="bg-white rounded-lg shadow overflow-hidden">
                <h2 class="text-xl font-bold text-indigo-700 p-5">Rekod Permohonan dan Pinjaman</h2>
                
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tindakan</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Guru</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">No. K/P</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aset Dipohon</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarikh Pinjam</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarikh Pulang</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${globalState.loans.length === 0 ? '<tr><td colspan="6" class="p-6 text-center text-gray-500">Tiada rekod pinjaman ditemui.</td></tr>' : ''}
                            ${globalState.loans.map(rec => `
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        ${rec.status === 'pending' ? `
                                            <button class="btn-approve text-green-600 hover:text-green-900 mr-2" data-id="${rec.id}">Lulus</button>
                                            <button class="btn-reject text-red-600 hover:text-red-900" data-id="${rec.id}">Tolak</button>
                                        ` : rec.status === 'loaned' ? `
                                            <button class="btn-return text-blue-600 hover:text-blue-900" data-id="${rec.id}">Pulang</button>
                                        ` : `
                                            <span class="text-xs text-gray-500">${rec.status === 'completed' ? 'Selesai' : 'Ditolak'}</span>
                                        `}
                                        <!-- Butang padam sentiasa ada untuk rekod lama -->
                                        ${rec.status === 'completed' || rec.status === 'rejected' ? `
                                            <button class="btn-delete text-gray-400 hover:text-red-600 ml-2" data-id="${rec.id}">Padam</button>
                                        ` : ''}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${rec.teacherName}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${rec.teacherIc}</td>
                                    <td class="px-6 py-4 text-sm text-gray-500">${rec.assets.map(a => a.name).join(', ')}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(rec.startDate)}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(rec.endDate)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    /**
     * Menjana HTML untuk Tab Pengurusan Aset (Paparan Admin)
     */
    function renderPengurusanAset() {
        return `
            <!-- Bahagian Tambah Aset Baru (Pukal) -->
            <div class="mb-6 bg-white rounded-lg shadow border border-gray-200">
                <button class="accordion-toggle flex w-full justify-between items-center p-5">
                    <h2 class="text-xl font-bold text-gray-800">Tambah Aset Pukal</h2>
                    <svg class="accordion-icon w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                </button>
                <div class="accordion-content p-5 border-t border-gray-200 hidden">
                    <form id="add-asset-form" class="space-y-4">
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div class="md:col-span-2">
                                <label for="asset-base-name" class="block text-sm font-medium text-gray-700">Nama Asas</label>
                                <input type="text" id="asset-base-name" placeholder="Cth: Tablet Makmal" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                            </div>
                            <div>
                                <label for="asset-quantity" class="block text-sm font-medium text-gray-700">Jumlah</label>
                                <input type="number" id="asset-quantity" placeholder="Cth: 10" min="1" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                            </div>
                            <div>
                                <label for="asset-category" class="block text-sm font-medium text-gray-700">Kategori</label>
                                <select id="asset-category" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required>
                                    <option value="">Pilih Kategori</option>
                                    <option value="Laptop">Laptop</option>
                                    <option value="Tablet">Tablet</option>
                                    <option value="Projector">Projector</option>
                                    <option value="Lain-lain">Lain-lain</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" class="rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
                            Tambah Aset Pukal
                        </button>
                    </form>
                </div>
            </div>

            <!-- Bahagian Senarai Semua Aset -->
            <div class="bg-white rounded-lg shadow overflow-hidden">
                <h2 class="text-xl font-bold text-indigo-700 p-5">Senarai Semua Aset</h2>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Aset</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tindakan</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${globalState.assets.length === 0 ? '<tr><td colspan="4" class="p-6 text-center text-gray-500">Tiada aset ditemui.</td></tr>' : ''}
                            ${globalState.assets.map(asset => `
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${asset.name}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${asset.category}</td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            asset.status === 'available' ? 'bg-green-100 text-green-800' :
                                            asset.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            asset.status === 'loaned' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                        }">
                                            ${asset.status || 'N/A'}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button class="btn-edit-asset text-blue-600 hover:text-blue-900 mr-3" data-id="${asset.id}">Edit</button>
                                        <button class="btn-delete-asset text-red-600 hover:text-red-900" data-id="${asset.id}" data-status="${asset.status}">Padam</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }


    // --- FUNGSI RENDER UTAMA ---

    /**
     * Menjana Tab Navigasi berdasarkan status admin
     */
    function renderNavTabs() {
        let tabs = [];
        if (globalState.isAdmin) {
            // Tab Admin
            tabs = [
                { id: 'rekodPinjaman', label: 'Rekod Pinjaman' },
                { id: 'pengurusanAset', label: 'Pengurusan Aset' },
                { id: 'asetTersedia', label: 'Aset Tersedia' },
                { id: 'asetDipinjam', label: 'Aset Dipinjam' },
            ];
        } else {
            // Tab Guru
            tabs = [
                { id: 'permohonan', label: 'Permohonan' },
                { id: 'asetTersedia', label: 'Aset Tersedia' },
                { id: 'asetDipinjam', label: 'Aset Dipinjam' },
            ];
            // Jika tab admin sedang aktif, tukar ke tab permohonan
            if (globalState.currentTab === 'rekodPinjaman' || globalState.currentTab === 'pengurusanAset') {
                globalState.currentTab = 'permohonan';
            }
        }
        
        navTabs.innerHTML = tabs.map(tab => `
            <a href="#" class="tab-link py-4 px-1 mx-2 sm:mx-4 border-b-2 text-sm font-medium
                ${globalState.currentTab === tab.id ? 'active' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
                data-tab="${tab.id}">
                ${tab.label}
            </a>
        `).join('');

        // Tambah pendengar acara pada setiap tab
        document.querySelectorAll('.tab-link').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                globalState.currentTab = e.target.dataset.tab;
                renderNavTabs(); // Render semula tab untuk kemaskini 'active'
                renderCurrentTab(); // Render semula kandungan
            });
        });
    }

    /**
     * Memaparkan kandungan untuk tab yang sedang aktif
     */
    function renderCurrentTab() {
        // Kosongkan kandungan sedia ada
        contentArea.innerHTML = '';
        
        switch (globalState.currentTab) {
            case 'permohonan':
                contentArea.innerHTML = renderPermohonan();
                break;
            case 'asetTersedia':
                contentArea.innerHTML = renderAsetTersedia();
                break;
            case 'asetDipinjam':
                contentArea.innerHTML = renderAsetDipinjam();
                break;
            case 'rekodPinjaman':
                contentArea.innerHTML = globalState.isAdmin ? renderRekodPinjaman() : '<p>Anda tiada kebenaran untuk melihat halaman ini.</p>';
                break;
            case 'pengurusanAset':
                contentArea.innerHTML = globalState.isAdmin ? renderPengurusanAset() : '<p>Anda tiada kebenaran untuk melihat halaman ini.</p>';
                break;
            default:
                contentArea.innerHTML = `<p>Tab tidak dijumpai.</p>`;
        }
        
        // Pautkan semula semua pendengar acara (event listeners)
        attachEventListeners();
    }
    
    /**
     * Memautkan semua pendengar acara untuk elemen dinamik
     */
    function attachEventListeners() {
        // 1. Borang Permohonan
        const loanForm = document.getElementById('loan-form');
        if (loanForm) {
            loanForm.addEventListener('submit', handleLoanSubmit);
        }

        // 2. Butang Akordion (Accordion)
        document.querySelectorAll('.accordion-toggle').forEach(button => {
            button.addEventListener('click', () => {
                const content = button.nextElementSibling;
                const icon = button.querySelector('.accordion-icon');
                content.classList.toggle('hidden');
                if (icon) {
                    icon.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(45deg)';
                }
            });
        });

        // 3. Item Aset yang Boleh Dipilih
        document.querySelectorAll('.asset-item-clickable').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.id;
                const name = item.dataset.name;
                if (globalState.selectedAssets.has(id)) {
                    globalState.selectedAssets.delete(id);
                    item.classList.remove('selected');
                } else {
                    globalState.selectedAssets.set(id, { name: name });
                    item.classList.add('selected');
                }
                // Kemaskini kiraan aset
                const countEl = document.querySelector('#loan-form p.text-sm');
                if (countEl) {
                    countEl.textContent = `Pilihan aset: ${globalState.selectedAssets.size} item dipilih.`;
                }
            });
        });
        
        // 4. Borang Tambah Aset (Admin)
        const addAssetForm = document.getElementById('add-asset-form');
        if (addAssetForm) {
            addAssetForm.addEventListener('submit', handleAssetSubmit);
        }
        
        // 5. Butang Tindakan Admin (Lulus/Tolak/Pulang/Padam)
        document.querySelectorAll('.btn-approve').forEach(b => b.addEventListener('click', handleApproveLoan));
        document.querySelectorAll('.btn-reject').forEach(b => b.addEventListener('click', handleRejectLoan));
        document.querySelectorAll('.btn-return').forEach(b => b.addEventListener('click', handleReturnLoan));
        document.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', handleDeleteLoan));
        
        // 6. Butang Tindakan Pengurusan Aset (Edit/Padam)
        document.querySelectorAll('.btn-edit-asset').forEach(b => b.addEventListener('click', handleShowEditModal));
        document.querySelectorAll('.btn-delete-asset').forEach(b => b.addEventListener('click', handleShowDeleteModal));

        // 7. Butang Modals
        document.getElementById('btn-cancel-delete').addEventListener('click', handleCancelDelete);
        document.getElementById('btn-confirm-delete').addEventListener('click', handleConfirmDelete);
        document.getElementById('btn-cancel-edit').addEventListener('click', handleCancelEdit);
        document.getElementById('edit-asset-form').addEventListener('submit', handleUpdateAsset);
    }


    // --- PENGENDALI ACARA (EVENT HANDLERS) ---

    /**
     * Mengendalikan HANTAR BORANG PINJAMAN (Guru)
     */
    async function handleLoanSubmit(event) {
        event.preventDefault();
        const { collection, addDoc, writeBatch, doc } = window.firebase;

        if (globalState.selectedAssets.size === 0) {
            alert("Sila pilih sekurang-kurangnya satu aset untuk dipinjam.");
            return;
        }

        const loanDetails = {
            teacherName: document.getElementById('teacher-name').value,
            teacherIc: document.getElementById('teacher-ic').value,
            startDate: document.getElementById('start-date').value,
            endDate: document.getElementById('end-date').value,
            purpose: document.getElementById('purpose').value,
            status: 'pending', // Status awal
            teacherUid: globalState.currentUser.uid,
            assets: Array.from(globalState.selectedAssets.entries()).map(([id, data]) => ({ id, name: data.name }))
        };
        
        const submitButton = event.target.querySelector('button[type="submit"]');

        try {
            submitButton.disabled = true;
            submitButton.textContent = 'Memproses...';

            // 1. Cipta rekod pinjaman baru
            const loansCollection = collection(db, `/artifacts/${appId}/public/data/loans`);
            await addDoc(loansCollection, loanDetails);
            
            // 2. Kemaskini status aset yang dipilih kepada 'pending'
            const batch = writeBatch(db);
            loanDetails.assets.forEach(asset => {
                const assetRef = doc(db, `/artifacts/${appId}/public/data/assets`, asset.id);
                batch.update(assetRef, { status: 'pending' });
            });
            await batch.commit();

            alert("Permohonan berjaya dihantar! Sila tunggu kelulusan.");
            globalState.selectedAssets.clear();
            event.target.reset();
            // onSnapshot akan kemaskini UI
            
        } catch (error) {
            console.error("Ralat menghantar permohonan:", error);
            alert("Gagal menghantar permohonan. Sila cuba lagi.");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Hantar Permohonan Untuk Item Dipilih';
        }
    }

    /**
     * Mengendalikan HANTAR BORANG TAMBAH ASET (Admin Pukal)
     */
    async function handleAssetSubmit(event) {
        event.preventDefault();
        const { collection, doc, writeBatch } = window.firebase;

        const baseName = document.getElementById('asset-base-name').value;
        const quantityInput = document.getElementById('asset-quantity').value;
        const category = document.getElementById('asset-category').value;

        if (!baseName || !quantityInput || !category) {
            alert("Sila isi semua ruangan: Nama Asas, Jumlah, dan Kategori.");
            return;
        }

        const quantity = parseInt(quantityInput, 10);
        if (isNaN(quantity) || quantity < 1) {
            alert("Jumlah mesti nombor yang sah dan sekurang-kurangnya 1.");
            return;
        }
        if (quantity > 100) {
            alert("Tidak boleh menambah lebih dari 100 aset sekaligus.");
            return;
        }
        
        if (!confirm(`Anda akan menambah ${quantity} aset dengan nama asas "${baseName}".\n\nContoh: "${baseName} 1", "${baseName} 2", ...\n\nTeruskan?`)) {
            return;
        }

        const submitButton = event.target.querySelector('button[type="submit"]');

        try {
            submitButton.disabled = true;
            submitButton.textContent = 'Memproses...';

            const batch = writeBatch(db);
            const assetsCollection = collection(db, `/artifacts/${appId}/public/data/assets`);

            for (let i = 1; i <= quantity; i++) {
                const newAssetName = `${baseName} ${i}`;
                const newAssetRef = doc(assetsCollection); // Cipta rujukan dokumen baru
                batch.set(newAssetRef, {
                    name: newAssetName,
                    category: category,
                    status: 'available'
                });
            }
            
            await batch.commit();
            alert(`Berjaya! ${quantity} aset baru telah ditambah.`);
            event.target.reset();
            
        } catch (error) {
            console.error("Ralat menambah aset pukal:", error);
            alert("Gagal menambah aset.");
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Tambah Aset Pukal';
        }
    }
    
    // --- Tindakan Admin (Kelulusan) ---

    async function handleApproveLoan(event) {
        const { doc, updateDoc, writeBatch } = window.firebase;
        const loanId = event.target.dataset.id;
        const loan = globalState.loans.find(l => l.id === loanId);
        if (!loan) return;

        try {
            // 1. Kemaskini status pinjaman kepada 'loaned'
            const loanRef = doc(db, `/artifacts/${appId}/public/data/loans`, loanId);
            await updateDoc(loanRef, { status: 'loaned' });

            // 2. Kemaskini status semua aset dalam pinjaman ini kepada 'loaned'
            const batch = writeBatch(db);
            loan.assets.forEach(asset => {
                const assetRef = doc(db, `/artifacts/${appId}/public/data/assets`, asset.id);
                batch.update(assetRef, { status: 'loaned' });
            });
            await batch.commit();
            // UI akan dikemaskini oleh onSnapshot
        } catch (error) {
            console.error("Ralat meluluskan pinjaman:", error);
        }
    }

    async function handleRejectLoan(event) {
        const { doc, updateDoc, writeBatch } = window.firebase;
        const loanId = event.target.dataset.id;
        const loan = globalState.loans.find(l => l.id === loanId);
        if (!loan) return;

        try {
            // 1. Kemaskini status pinjaman kepada 'rejected'
            const loanRef = doc(db, `/artifacts/${appId}/public/data/loans`, loanId);
            await updateDoc(loanRef, { status: 'rejected' });

            // 2. Kemaskini status semua aset dalam pinjaman ini kembali kepada 'available'
            const batch = writeBatch(db);
            loan.assets.forEach(asset => {
                const assetRef = doc(db, `/artifacts/${appId}/public/data/assets`, asset.id);
                batch.update(assetRef, { status: 'available' });
            });
            await batch.commit();
        } catch (error) {
            console.error("Ralat menolak pinjaman:", error);
        }
    }

    async function handleReturnLoan(event) {
        const { doc, updateDoc, writeBatch } = window.firebase;
        const loanId = event.target.dataset.id;
        const loan = globalState.loans.find(l => l.id === loanId);
        if (!loan) return;

        try {
            // 1. Kemaskini status pinjaman kepada 'completed'
            const loanRef = doc(db, `/artifacts/${appId}/public/data/loans`, loanId);
            await updateDoc(loanRef, { status: 'completed' });

            // 2. Kemaskini status semua aset dalam pinjaman ini kembali kepada 'available'
            const batch = writeBatch(db);
            loan.assets.forEach(asset => {
                const assetRef = doc(db, `/artifacts/${appId}/public/data/assets`, asset.id);
                batch.update(assetRef, { status: 'available' });
            });
            await batch.commit();
        } catch (error) {
            console.error("Ralat memulangkan pinjaman:", error);
        }
    }
    
    async function handleDeleteLoan(event) {
        const { doc, deleteDoc } = window.firebase;
        const loanId = event.target.dataset.id;
        // Hanya rekod yang selesai atau ditolak boleh dipadam
        if (confirm("Adakah anda pasti mahu memadam rekod ini secara kekal?")) {
            try {
                const loanRef = doc(db, `/artifacts/${appId}/public/data/loans`, loanId);
                await deleteDoc(loanRef);
                // UI akan dikemaskini oleh onSnapshot
            } catch (error) {
                console.error("Ralat memadam rekod:", error);
            }
        }
    }

    // --- Tindakan Pengurusan Aset (Admin) ---

    function handleShowDeleteModal(event) {
        const assetId = event.target.dataset.id;
        const assetStatus = event.target.dataset.status;
        
        if (assetStatus === 'loaned' || assetStatus === 'pending') {
            const errorDiv = deleteModal.querySelector('#delete-modal-error');
            errorDiv.textContent = "Aset tidak boleh dipadam kerana ia sedang dipinjam atau dalam proses permohonan.";
            errorDiv.classList.remove('hidden');
            deleteModal.querySelector('#btn-confirm-delete').disabled = true;
        } else {
            const errorDiv = deleteModal.querySelector('#delete-modal-error');
            errorDiv.classList.add('hidden');
            deleteModal.querySelector('#btn-confirm-delete').disabled = false;
        }
        globalState.assetToDelete = { id: assetId };
        deleteModal.style.display = 'flex';
    }

    function handleCancelDelete() {
        globalState.assetToDelete = null;
        deleteModal.style.display = 'none';
    }

    async function handleConfirmDelete() {
        const { doc, deleteDoc } = window.firebase;
        const assetId = globalState.assetToDelete.id;
        if (!assetId) return;

        try {
            const assetRef = doc(db, `/artifacts/${appId}/public/data/assets`, assetId);
            await deleteDoc(assetRef);
            handleCancelDelete();
        } catch (error) {
            console.error("Ralat memadam aset:", error);
            const errorDiv = deleteModal.querySelector('#delete-modal-error');
            errorDiv.textContent = "Gagal memadam aset. Sila cuba lagi.";
            errorDiv.classList.remove('hidden');
        }
    }

    function handleShowEditModal(event) {
        const assetId = event.target.dataset.id;
        const asset = globalState.assets.find(a => a.id === assetId);
        if (!asset) return;

        globalState.assetToEdit = asset;
        document.getElementById('edit-asset-name').value = asset.name;
        document.getElementById('edit-asset-category').value = asset.category;
        document.getElementById('edit-asset-status').textContent = asset.status;
        editModal.style.display = 'flex';
    }

    function handleCancelEdit() {
        globalState.assetToEdit = null;
        editModal.style.display = 'none';
    }

    async function handleUpdateAsset(event) {
        event.preventDefault();
        const { doc, updateDoc } = window.firebase;
        const assetId = globalState.assetToEdit.id;
        if (!assetId) return;

        const newName = document.getElementById('edit-asset-name').value;
        const newCategory = document.getElementById('edit-asset-category').value;

        try {
            const assetRef = doc(db, `/artifacts/${appId}/public/data/assets`, assetId);
            await updateDoc(assetRef, {
                name: newName,
                category: newCategory
            });
            handleCancelEdit();
        } catch (error) {
            console.error("Ralat mengemaskini aset:", error);
            alert("Gagal mengemaskini aset.");
        }
    }

    // --- FUNGSI BANTUAN ---

    /**
     * Memformat tarikh (YYYY-MM-DD) kepada (DD Jan YYYY)
     */
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            // Tambah 'timeZone: "UTC"' untuk elak masalah zon masa
            return date.toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric', timeZone: "UTC" });
        } catch (e) {
            return dateString;
        }
    }

    // --- MULAKAN APLIKASI ---
    initializeFirebaseApp();
});


