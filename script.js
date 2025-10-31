// Tunggu sehingga semua kandungan HTML dan skrip Firebase dimuatkan
document.addEventListener('DOMContentLoaded', () => {

    // --- PEMBOLEHUBAH GLOBAL FIREBASE ---
    let db, auth;
    
    // Gunakan pembolehubah global yang disediakan oleh persekitaran
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'sistem-pinjaman-aset-ict-v2';
    
    // Pembolehubah untuk menyimpan pendengar (listeners) Firestore
    let assetsListener = null;
    let loansListener = null;

    // --- STATE PENGURUSAN GLOBAL ---
    // Ini menggantikan 'mockData'. Semua data dari Firestore akan disimpan di sini.
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
    const authSection = document.getElementById('auth-section');
    const navTabs = document.getElementById('nav-tabs');
    const contentArea = document.getElementById('content-area');

    // --- ELEMEN MODAL ---
    const deleteModal = document.getElementById('delete-modal');
    const editModal = document.getElementById('edit-modal');

    // --- INISIALISASI FIREBASE ---
    // Pastikan kod Firebase telah dimuatkan dari index.html
    if (window.firebase) {
        // Ambil fungsi dari 'window.firebase'
        const {
            initializeApp, getAuth, onAuthStateChanged, signInAnonymously,
            signInWithCustomToken, getFirestore, setLogLevel, doc, getDoc
        } = window.firebase;

        try {
            // 1. Dapatkan Konfigurasi Firebase
            // __firebase_config disediakan secara global dalam persekitaran
            const firebaseConfig = JSON.parse(__firebase_config);
            
            // 2. Inisialisasi Aplikasi Firebase
            const app = initializeApp(firebaseConfig);
            
            // 3. Dapatkan Servis Firestore dan Auth
            db = getFirestore(app);
            auth = getAuth(app);

            // 4. Set Log Level (untuk debugging)
            setLogLevel('Debug');

            // 5. Setup Pendengar Status Pengesahan (Auth)
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    // Pengguna telah log masuk
                    globalState.currentUser = user;
                    await checkAdminStatus(user.uid); // Semak jika pengguna adalah admin
                } else {
                    // Tiada pengguna log masuk, cuba log masuk
                    try {
                        if (typeof __initial_auth_token !== 'undefined') {
                            // Log masuk menggunakan token khas jika ada
                            await signInWithCustomToken(auth, __initial_auth_token);
                        } else {
                            // Jika tiada token, log masuk sebagai pengguna tanpa nama (guru)
                            await signInAnonymously(auth);
                        }
                    } catch (error) {
                        console.error("Ralat semasa log masuk:", error);
                        contentArea.innerHTML = "<p class='text-red-500'>Gagal mengesahkan pengguna.</p>";
                    }
                }
                // 'onAuthStateChanged' akan dipanggil sekali lagi selepas log masuk berjaya,
                // di mana 'if (user)' akan dijalankan.
            });

        } catch (error) {
            console.error("Ralat Inisialisasi Firebase:", error);
            contentArea.innerHTML = "<p class='text-red-500'>Ralat memuatkan konfigurasi Firebase. Sila pastikan __firebase_config ditetapkan dengan betul.</p>";
        }

    } else {
        console.error("Firebase SDK tidak dimuatkan!");
        contentArea.innerHTML = "<p class='text-red-500'>Fail Firebase SDK gagal dimuatkan. Sila semak index.html.</p>";
    }

    /**
     * Semak status admin pengguna dari Firestore
     * dan setup pendengar (listeners) data
     */
    async function checkAdminStatus(uid) {
        const { doc, getDoc } = window.firebase;
        const user = globalState.currentUser; // Ambil currentUser yang sudah disimpan

        // Senarai e-mel admin yang dibenarkan (seperti yang diminta)
        const adminEmails = [
            "gurubesar@sksa.com",
            "guruict@sksa.com"
        ];

        // Semak jika e-mel pengguna ada dalam senarai
        if (user && user.email && adminEmails.includes(user.email)) {
            globalState.isAdmin = true;
        } else {
            // Jika e-mel tiada, semak koleksi 'admins' di Firestore menggunakan UID (cara lama)
            // Ini membenarkan kedua-dua cara berfungsi
            try {
                const adminDocRef = doc(db, `/artifacts/${appId}/public/data/admins`, uid);
                const adminDoc = await getDoc(adminDocRef);
                
                globalState.isAdmin = adminDoc.exists(); // true jika dokumen wujud
                
            } catch (error) {
                console.error("Ralat menyemak status admin:", error);
                globalState.isAdmin = false; // Anggap bukan admin jika berlaku ralat
            }
        }

        // Tetapkan tab lalai berdasarkan status
        globalState.currentTab = globalState.isAdmin ? 'rekodPinjaman' : 'permohonan';
        
        // Mulakan pendengar (listeners) data selepas status auth diketahui
        setupFirestoreListeners();
        
        // Render aplikasi
        renderApp();
    }

    /**
     * Setup pendengar 'onSnapshot' untuk data real-time
     */
    function setupFirestoreListeners() {
        const { collection, onSnapshot } = window.firebase;
        
        // Pastikan pendengar lama ditutup sebelum memulakan yang baru
        if (assetsListener) assetsListener();
        if (loansListener) loansListener();

        // 1. Pendengar untuk koleksi 'assets'
        const assetsCollection = collection(db, `/artifacts/${appId}/public/data/assets`);
        assetsListener = onSnapshot(assetsCollection, (snapshot) => {
            globalState.assets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Data Aset dikemaskini:", globalState.assets);
            renderApp(); // Render semula aplikasi dengan data baru
        }, (error) => {
            console.error("Ralat mendengar data aset:", error);
        });

        // 2. Pendengar untuk koleksi 'loans'
        const loansCollection = collection(db, `/artifacts/${appId}/public/data/loans`);
        loansListener = onSnapshot(loansCollection, (snapshot) => {
            globalState.loans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Data Pinjaman dikemaskini:", globalState.loans);
            renderApp(); // Render semula aplikasi dengan data baru
        }, (error) => {
            console.error("Ralat mendengar data pinjaman:", error);
        });
    }

    // --- FUNGSI RENDER KANDUNGAN TAB ---

    /**
     * Helper: Kumpulan aset mengikut kategori
     */
    function groupAssets(assets) {
        return assets.reduce((acc, asset) => {
            const category = asset.category || 'Lain-lain';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(asset);
            return acc;
        }, {});
    }

    /**
     * Helper: Kira baki hari
     */
    function calculateDaysLeft(endDateString) {
        if (!endDateString) return 'N/A';
        try {
            // Anggap 'endDateString' adalah dari <input type="date"> (YYYY-MM-DD) atau ISO string
            const end = new Date(endDateString);
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Set ke permulaan hari
            end.setHours(0, 0, 0, 0); // Set ke permulaan hari
            
            const diffTime = end.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) return 'TERLEPAS';
            if (diffDays === 0) return 'HARI INI';
            return `${diffDays} HARI LAGI`;

        } catch (e) {
            console.warn("Format tarikh tidak sah:", endDateString);
            return 'N/A';
        }
    }
    
    /**
     * Helper: Format tarikh
     */
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch(e) {
            return dateString; // Kembalikan string asal jika format tidak sah
        }
    }


    /**
     * Menjana HTML untuk Tab Permohonan (Paparan Guru)
     */
    function renderPermohonan() {
        const availableAssets = globalState.assets.filter(a => a.status === 'available');
        const assetsByCat = groupAssets(availableAssets);
        
        return `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Bahagian 1: Borang Permohonan -->
                <div class="lg:col-span-2 bg-white p-6 rounded-lg shadow">
                    <h2 class="text-2xl font-bold text-blue-700 mb-6">1. Buat Permohonan Pinjaman</h2>
                    <form class="space-y-4" id="loan-form">
                        <div>
                            <label for="nama_guru" class="block text-sm font-medium text-gray-700">Nama Guru</label>
                            <input type="text" id="nama_guru" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" required>
                        </div>
                        <div>
                            <label for="no_kp" class="block text-sm font-medium text-gray-700">No Kad Pengenalan</label>
                            <input type="text" id="no_kp" placeholder="Cth: 900101-01-1234" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" required>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label for="tarikh_pinjam" class="block text-sm font-medium text-gray-700">Tarikh Pinjam</label>
                                <input type="date" id="tarikh_pinjam" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" required>
                            </div>
                            <div>
                                <label for="tarikh_pulang" class="block text-sm font-medium text-gray-700">Tarikh Pulang</label>
                                <input type="date" id="tarikh_pulang" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" required>
                            </div>
                        </div>
                        <div>
                            <label for="tujuan" class="block text-sm font-medium text-gray-700">Tujuan Pinjaman</label>
                            <textarea id="tujuan" rows="4" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" required></textarea>
                            <p class="mt-2 text-xs text-gray-500">Pilihan aset: ${globalState.selectedAssets.size} item dipilih.</p>
                        </div>
                        <div>
                            <button type="submit" class="w-full justify-center rounded-md border border-transparent bg-green-600 py-3 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                                Hantar Permohonan Untuk Item Dipilih
                            </button>
                        </div>
                    </form>
                </div>
                
                <!-- Bahagian 2: Senarai Aset (Accordion) -->
                <div class="lg:col-span-1 bg-white p-6 rounded-lg shadow">
                    <h2 class="text-2xl font-bold text-green-700 mb-6">2. Pilih Aset</h2>
                    <div class="space-y-2" id="accordion-container">
                        ${renderAccordionItem('Laptop', assetsByCat['Laptop'] || [], true, true)}
                        ${renderAccordionItem('Tablet', assetsByCat['Tablet'] || [], false, true)}
                        ${renderAccordionItem('Projector', assetsByCat['Projector'] || [], false, true)}
                        ${renderAccordionItem('Lain-lain', assetsByCat['Lain-lain'] || [], false, true)}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Menjana HTML untuk Tab Aset Tersedia (Paparan Guru/Admin)
     */
    function renderAsetTersedia() {
        const availableAssets = globalState.assets.filter(a => a.status === 'available');
        const assetsByCat = groupAssets(availableAssets);

        return `
            <div class="bg-white p-6 rounded-lg shadow">
                <h2 class="text-2xl font-bold text-green-700 mb-6">Aset Tersedia (Paparan Sahaja)</h2>
                <div class="space-y-2" id="accordion-container">
                    ${renderAccordionItem('Laptop', assetsByCat['Laptop'] || [], true, false)}
                    ${renderAccordionItem('Tablet', assetsByCat['Tablet'] || [], false, false)}
                    ${renderAccordionItem('Projector', assetsByCat['Projector'] || [], false, false)}
                    ${renderAccordionItem('Lain-lain', assetsByCat['Lain-lain'] || [], false, false)}
                </div>
            </div>
        `;
    }
    
    /**
     * Fungsi bantuan untuk menjana item accordion
     * @param {string} title - Tajuk accordion
     * @param {object[]} items - Senarai OBJEK aset (cth: {id: '123', name: 'Laptop 1'})
     * @param {boolean} [isOpen=false] - Dibuka secara lalai
     * @param {boolean} [isClickable=true] - Boleh diklik (untuk borang)
     */
    function renderAccordionItem(title, items, isOpen = false, isClickable = true) {
        const itemCount = items.length;
        
        return `
            <div class="rounded-md border border-gray-200">
                <button class="accordion-toggle flex w-full justify-between items-center p-4 bg-gray-50 rounded-t-md hover:bg-gray-100">
                    <div class="flex items-center space-x-2">
                        <span class="font-semibold text-gray-800">${title}</span>
                        <span class="text-xs font-bold text-white bg-green-600 rounded-full px-2 py-0.5">${itemCount}</span>
                    </div>
                    <svg class="accordion-icon w-5 h-5 text-gray-600 ${isOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                <div class="accordion-content p-4 grid grid-cols-2 sm:grid-cols-3 gap-2 ${isOpen ? '' : 'hidden'}">
                    ${items.map(item => {
                        const isSelected = globalState.selectedAssets.has(item.id);
                        const itemClass = isClickable 
                            ? `asset-item-clickable cursor-pointer hover:bg-green-100 border border-green-300 ${isSelected ? 'selected' : ''}`
                            : 'border border-gray-300';
                        
                        return `
                            <div class="text-sm text-green-800 bg-green-50 rounded-md p-2 text-center ${itemClass}" 
                                 data-asset-id="${item.id}" 
                                 data-asset-name="${item.name}">
                                ${item.name}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }


    /**
     * Menjana HTML untuk Tab Aset Dipinjam (Paparan Guru/Admin)
     */
    function renderAsetDipinjam() {
        // Ambil pinjaman yang sedang 'approved' atau 'pending'
        const loanedItems = globalState.loans.filter(l => l.status === 'approved' || l.status === 'pending');

        return `
            <h2 class="text-2xl font-bold text-red-700 mb-6">Aset Sedang Dipinjam & Dalam Proses</h2>
            ${loanedItems.length === 0 ? '<p class="text-gray-600">Tiada aset sedang dipinjam.</p>' : ''}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${loanedItems.map(item => `
                    <div class="bg-white border-2 ${item.status === 'pending' ? 'border-yellow-300' : 'border-red-200'} rounded-lg shadow-sm overflow-hidden flex flex-col">
                        <div class="p-5 flex-grow">
                            <div class="flex justify-between items-center">
                                <h3 class="text-lg font-bold text-red-800">${item.assetName}</h3>
                                <span class="text-xs font-bold px-2 py-1 rounded-full ${item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">
                                    ${item.status === 'pending' ? 'MENUNGGU LULUS' : 'DIPINJAM'}
                                </span>
                            </div>
                            <p class="text-sm text-gray-600 mt-2">Pemimjam: ${item.teacherName}</p>
                            <p class="text-sm text-gray-600">Pulang: ${formatDate(item.endDate)}</p>
                            <p class="text-xs text-gray-500 mt-1">Lulus oleh: ${item.approvedBy || 'N/A'}</p>
                        </div>
                        <div class="${item.status === 'pending' ? 'bg-yellow-50' : 'bg-red-50'} p-5 border-t ${item.status === 'pending' ? 'border-yellow-300' : 'border-red-200'}">
                            <p class="text-3xl font-bold text-blue-700 text-center">
                                ${item.status === 'pending' ? 'MENUNGGU' : calculateDaysLeft(item.endDate)}
                            </p>
                        </div>
                    </div>
                `).join('')}
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
                
                <!-- Jadual Rekod -->
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tindakan</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Guru</th>
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
                                        <div class="flex items-center space-x-3">
                                            ${rec.status === 'pending' ? `
                                                <button class="btn-approve text-green-600 hover:text-green-900" data-id="${rec.id}" data-asset-id="${rec.assetId}">Lulus</button>
                                                <button class="btn-reject text-red-600 hover:text-red-900" data-id="${rec.id}" data-asset-id="${rec.assetId}">Tolak</button>
                                            ` : ''}
                                            ${rec.status === 'approved' ? `
                                                <button class="btn-return text-blue-600 hover:text-blue-900" data-id="${rec.id}" data-asset-id="${rec.assetId}">Pulang</button>
                                            ` : ''}
                                            ${rec.status === 'returned' || rec.status === 'rejected' ? `
                                                <button class="btn-delete text-gray-400 hover:text-gray-600" data-id="${rec.id}">Padam</button>
                                            ` : ''}
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            rec.status === 'approved' ? 'bg-red-100 text-red-800' :
                                            rec.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            rec.status === 'returned' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }">
                                            ${rec.status || 'N/A'}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${rec.teacherName}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${rec.assetName}</td>
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
     * (BARU) Menjana HTML untuk Tab Pengurusan Aset (Paparan Admin)
     */
    function renderPengurusanAset() {
        return `
            <!-- Bahagian Tambah Aset Baru -->
            <div class="mb-6 bg-white rounded-lg shadow border border-gray-200">
                <button class="accordion-toggle flex w-full justify-between items-center p-5">
                    <h2 class="text-xl font-bold text-gray-800">Tambah Aset Baru</h2>
                    <svg class="accordion-icon w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                </button>
                <div class="accordion-content p-5 border-t border-gray-200 hidden">
                    <form id="add-asset-form" class="space-y-4">
                        <!-- (DIUBAH) Borang kini untuk tambah pukal -->
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
    
    function renderApp() {
        if (!globalState.currentUser) return; // Jangan render jika pengguna belum disahkan

        // 1. Render Bahagian Pengesahan (Header)
        renderAuthSection();
        
        // 2. Render Tab Navigasi
        renderNavTabs();
        
        // 3. Render Kandungan Tab Aktif
        renderContentArea();

        // 4. Tambah Event Listeners
        addDynamicEventListeners();
    }

    /**
     * Kemaskini bahagian header (info guru/admin)
     */
    function renderAuthSection() {
        const user = globalState.currentUser;
        if (globalState.isAdmin) {
            authSection.innerHTML = `
                <span class="text-sm text-gray-600">Admin: <span class="font-medium">${user.email || user.uid}</span></span>
                <!-- Butang Log Keluar tidak ditambah kerana auth dikawal oleh token persekitaran -->
            `;
        } else {
            authSection.innerHTML = `
                <span class="text-sm text-gray-600">Mod Guru (ID: <span class="font-medium">${user.uid.substring(0, 6)}</span>)</span>
            `;
        }
    }

    /**
     * Kemaskini senarai tab navigasi berdasarkan status log masuk
     */
    function renderNavTabs() {
        let tabs = [];
        if (globalState.isAdmin) {
            // Tab Admin
            tabs = [
                { id: 'rekodPinjaman', label: 'Rekod Pinjaman' },
                { id: 'pengurusanAset', label: 'Pengurusan Aset' }, // <-- TAB BARU
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
        }

        navTabs.innerHTML = tabs.map(tab => `
            <button class="tab-link py-4 px-1 mx-4 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:border-gray-300 hover:text-gray-700 ${globalState.currentTab === tab.id ? 'active' : ''}" data-tab-id="${tab.id}">
                ${tab.label}
            </button>
        `).join('');

        // Tambah event listener pada setiap tab
        navTabs.querySelectorAll('.tab-link').forEach(button => {
            button.addEventListener('click', handleTabClick);
        });
    }

    /**
     * Memuatkan kandungan tab yang betul ke dalam contentArea
     */
    function renderContentArea() {
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
                // Hanya admin boleh lihat tab ini
                contentArea.innerHTML = globalState.isAdmin ? renderRekodPinjaman() : '<p>Anda tiada kebenaran untuk melihat halaman ini.</p>';
                break;
            case 'pengurusanAset': // <-- KES BARU
                // Hanya admin boleh lihat tab ini
                contentArea.innerHTML = globalState.isAdmin ? renderPengurusanAset() : '<p>Anda tiada kebenaran untuk melihat halaman ini.</p>';
                break;
            default:
                contentArea.innerHTML = `<p>Tab tidak dijumpai.</p>`;
        }
    }
    
    /**
     * Tambah event listener untuk elemen dinamik
     */
    function addDynamicEventListeners() {
        // 1. Accordion Toggles
        document.querySelectorAll('.accordion-toggle').forEach(button => {
            button.addEventListener('click', () => {
                const content = button.nextElementSibling;
                const icon = button.querySelector('.accordion-icon');
                content.classList.toggle('hidden');
                icon.classList.toggle('rotate-180');
            });
        });

        // 2. Pemilihan Aset (dalam borang permohonan)
        document.querySelectorAll('.asset-item-clickable').forEach(item => {
            item.addEventListener('click', handleAssetSelect);
        });

        // 3. Borang Hantar Pinjaman
        document.getElementById('loan-form')?.addEventListener('submit', handleLoanSubmit);
        
        // 4. Borang Tambah Aset (Admin)
        document.getElementById('add-asset-form')?.addEventListener('submit', handleAssetSubmit);
        
        // 5. Butang Tindakan Jadual Admin
        document.querySelectorAll('.btn-approve').forEach(b => b.addEventListener('click', handleApproveLoan));
        document.querySelectorAll('.btn-reject').forEach(b => b.addEventListener('click', handleRejectLoan));
        document.querySelectorAll('.btn-return').forEach(b => b.addEventListener('click', handleReturnLoan));
        document.querySelectorAll('.btn-delete').forEach(b => b.addEventListener('click', handleDeleteLoan));
        
        // 6. (BARU) Butang Tindakan Pengurusan Aset
        document.querySelectorAll('.btn-edit-asset').forEach(b => b.addEventListener('click', handleShowEditModal));
        document.querySelectorAll('.btn-delete-asset').forEach(b => b.addEventListener('click', handleShowDeleteModal));

        // 7. (BARU) Butang Modals
        document.getElementById('btn-cancel-delete').addEventListener('click', handleCancelDelete);
        document.getElementById('btn-confirm-delete').addEventListener('click', handleConfirmDelete);
        document.getElementById('btn-cancel-edit').addEventListener('click', handleCancelEdit);
        document.getElementById('edit-asset-form').addEventListener('submit', handleUpdateAsset);
    }


    // --- PENGENDALI ACARA (EVENT HANDLERS) ---

    /**
     * Mengendalikan klik pada tab navigasi
     */
    function handleTabClick(event) {
        globalState.currentTab = event.target.dataset.tabId;
        renderApp(); // Render semula semua
    }

    /**
     * Mengendalikan pemilihan aset pada borang
     */
    function handleAssetSelect(event) {
        const assetId = event.target.dataset.assetId;
        const assetName = event.target.dataset.assetName;
        
        if (globalState.selectedAssets.has(assetId)) {
            globalState.selectedAssets.delete(assetId);
        } else {
            globalState.selectedAssets.set(assetId, assetName);
        }
        
        // Render semula kandungan untuk kemaskini borang
        renderContentArea();
        addDynamicEventListeners();
    }

    /**
     * Mengendalikan HANTAR BORANG PINJAMAN
     */
    async function handleLoanSubmit(event) {
        event.preventDefault();
        const { collection, addDoc, doc, writeBatch } = window.firebase;
        
        if (globalState.selectedAssets.size === 0) {
            alert("Sila pilih sekurang-kurangnya satu aset.");
            return;
        }

        const formData = {
            teacherName: document.getElementById('nama_guru').value,
            ic: document.getElementById('no_kp').value,
            startDate: document.getElementById('tarikh_pinjam').value,
            endDate: document.getElementById('tarikh_pulang').value,
            purpose: document.getElementById('tujuan').value,
            status: 'pending', // Status awal
            requestedAt: new Date().toISOString(),
            requestedBy: globalState.currentUser.uid
        };

        // Gunakan 'batch' untuk kemaskini semua aset dan cipta pinjaman
        const batch = writeBatch(db);
        const loansCollection = collection(db, `/artifacts/${appId}/public/data/loans`);

        for (const [assetId, assetName] of globalState.selectedAssets.entries()) {
            // 1. Cipta dokumen pinjaman baru
            batch.set(doc(loansCollection), {
                ...formData,
                assetId: assetId,
                assetName: assetName
            });
            
            // 2. Kemaskini status aset kepada 'pending'
            const assetRef = doc(db, `/artifacts/${appId}/public/data/assets`, assetId);
            batch.update(assetRef, { status: 'pending' });
        }
        
        try {
            await batch.commit();
            alert("Permohonan berjaya dihantar!");
            globalState.selectedAssets.clear();
            event.target.reset(); // Reset borang
            // renderApp() akan dipanggil secara automatik oleh onSnapshot
        } catch (error) {
            console.error("Ralat menghantar permohonan:", error);
            alert("Gagal menghantar permohonan. Sila cuba lagi.");
        }
    }

    /**
     * Mengendalikan HANTAR BORANG TAMBAH ASET (Admin)
     * (DIUBAH) Kini mengendalikan penambahan aset pukal
     */
    async function handleAssetSubmit(event) {
        event.preventDefault();
        // Perlukan 'collection', 'doc', dan 'writeBatch' dari Firebase
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
            // Pengehadan untuk elak batch terlalu besar
            alert("Tidak boleh menambah lebih dari 100 aset sekaligus. Sila masukkan jumlah yang lebih kecil.");
            return;
        }
        
        // Dapatkan pengesahan
        if (!confirm(`Anda akan menambah ${quantity} aset dengan nama asas "${baseName}".\n\nContoh: "${baseName} 1", "${baseName} 2", ...\n\nTeruskan?`)) {
            return; // Batal jika pengguna tekan 'Cancel'
        }

        const submitButton = event.target.querySelector('button[type="submit"]');

        try {
            // Tunjukkan 'loading'
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
                    status: 'available' // Status lalai
                });
            }
            
            await batch.commit(); // Hantar semua aset ke Firestore
            
            alert(`Berjaya! ${quantity} aset baru telah ditambah.`);
            event.target.reset();
            // onSnapshot akan kemaskini UI secara automatik
            
        } catch (error) {
            console.error("Ralat menambah aset pukal:", error);
            alert("Gagal menambah aset. Sila semak konsol untuk ralat.");
        } finally {
            // Pulihkan butang
            submitButton.disabled = false;
            submitButton.textContent = 'Tambah Aset Pukal';
        }
    }
    
    // --- Tindakan Admin ---
    
    async function handleApproveLoan(event) {
        const { doc, updateDoc } = window.firebase;
        const loanId = event.target.dataset.id;
        const assetId = event.target.dataset.assetId;
        
        const loanRef = doc(db, `/artifacts/${appId}/public/data/loans`, loanId);
        const assetRef = doc(db, `/artifacts/${appId}/public/data/assets`, assetId);

        try {
            const batch = window.firebase.writeBatch(db);
            batch.update(loanRef, { 
                status: 'approved',
                approvedBy: globalState.currentUser.email || globalState.currentUser.uid
            });
            batch.update(assetRef, { status: 'loaned' });
            await batch.commit();
            alert("Pinjaman diluluskan.");
        } catch (error) {
            console.error("Ralat meluluskan pinjaman:", error);
        }
    }
    
    async function handleRejectLoan(event) {
        const { doc, updateDoc } = window.firebase;
        const loanId = event.target.dataset.id;
        const assetId = event.target.dataset.assetId;

        const loanRef = doc(db, `/artifacts/${appId}/public/data/loans`, loanId);
        const assetRef = doc(db, `/artifacts/${appId}/public/data/assets`, assetId);

        try {
            const batch = window.firebase.writeBatch(db);
            batch.update(loanRef, { status: 'rejected' });
            batch.update(assetRef, { status: 'available' }); // Kembalikan status aset
            await batch.commit();
            alert("Pinjaman ditolak.");
        } catch (error) {
            console.error("Ralat menolak pinjaman:", error);
        }
    }
    
    async function handleReturnLoan(event) {
        const { doc, updateDoc } = window.firebase;
        const loanId = event.target.dataset.id;
        const assetId = event.target.dataset.assetId;
        
        const loanRef = doc(db, `/artifacts/${appId}/public/data/loans`, loanId);
        const assetRef = doc(db, `/artifacts/${appId}/public/data/assets`, assetId);

        try {
            const batch = window.firebase.writeBatch(db);
            batch.update(loanRef, { status: 'returned' });
            batch.update(assetRef, { status: 'available' }); // Aset kini tersedia
            await batch.commit();
            alert("Aset telah dipulangkan.");
        } catch (error) {
            console.error("Ralat memulangkan aset:", error);
        }
    }
    
    async function handleDeleteLoan(event) {
        if (!confirm("Adakah anda pasti mahu memadam rekod ini? Tindakan ini tidak boleh diundur.")) {
            return;
        }
        
        const { doc, deleteDoc } = window.firebase;
        const loanId = event.target.dataset.id;
        
        try {
            const loanRef = doc(db, `/artifacts/${appId}/public/data/loans`, loanId);
            await deleteDoc(loanRef);
            alert("Rekod telah dipadam.");
        } catch (error) {
            console.error("Ralat memadam rekod:", error);
        }
    }

    // --- (BARU) Tindakan Pengurusan Aset ---

    /**
     * Tunjukkan modal pengesahan padam
     */
    function handleShowDeleteModal(event) {
        const assetId = event.target.dataset.id;
        const assetStatus = event.target.dataset.status;
        
        // Semak jika aset sedang dipinjam
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

        globalState.assetToDelete = { id: assetId }; // Simpan ID aset
        deleteModal.style.display = 'flex'; // Tunjukkan modal
    }

    /**
     * Batal padam
     */
    function handleCancelDelete() {
        globalState.assetToDelete = null;
        deleteModal.style.display = 'none'; // Sembunyi modal
    }

    /**
     * Sahkan padam (butang merah)
     */
    async function handleConfirmDelete() {
        const { doc, deleteDoc } = window.firebase;
        const assetId = globalState.assetToDelete.id;

        if (!assetId) return;

        try {
            const assetRef = doc(db, `/artifacts/${appId}/public/data/assets`, assetId);
            await deleteDoc(assetRef);
            handleCancelDelete(); // Tutup modal
            // onSnapshot akan kemaskini UI secara automatik
        } catch (error) {
            console.error("Ralat memadam aset:", error);
            const errorDiv = deleteModal.querySelector('#delete-modal-error');
            errorDiv.textContent = "Gagal memadam aset. Sila cuba lagi.";
            errorDiv.classList.remove('hidden');
        }
    }

    /**
     * Tunjukkan modal edit dan isi data
     */
    function handleShowEditModal(event) {
        const assetId = event.target.dataset.id;
        const asset = globalState.assets.find(a => a.id === assetId);

        if (!asset) return;

        globalState.assetToEdit = asset; // Simpan objek aset

        // Isi borang modal
        document.getElementById('edit-asset-name').value = asset.name;
        document.getElementById('edit-asset-category').value = asset.category;
        document.getElementById('edit-asset-status').textContent = asset.status;
        
        editModal.style.display = 'flex'; // Tunjukkan modal
    }

    /**
     * Batal edit
     */
    function handleCancelEdit() {
        globalState.assetToEdit = null;
        editModal.style.display = 'none'; // Sembunyi modal
    }

    /**
     * Hantar borang kemaskini aset
     */
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
                // Status tidak diubah di sini
            });
            handleCancelEdit(); // Tutup modal
            // onSnapshot akan kemaskini UI
        } catch (error) {
            console.error("Ralat mengemaskini aset:", error);
            alert("Gagal mengemaskini aset.");
        }
    }


});


