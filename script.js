/**
 * Fail Logik Aplikasi (script.js)
 * untuk Sistem Pinjaman Aset ICT v2
 * Sepadan dengan index.html yang dikemas kini
 */

// Tunggu sehingga semua kandungan HTML dan skrip Firebase dimuatkan
document.addEventListener('DOMContentLoaded', () => {

    // --- PEMBOLEHUBAH GLOBAL ---

    // Perkhidmatan Firebase (akan diisi oleh initializeFirebase)
    let db, auth;
    // App ID (diambil dari persekitaran atau lalai)
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    // Konfigurasi Firebase (dengan sandaran)
    const firebaseConfig = {
        apiKey: "AIzaSyCV5skKQO1i-T6pOckTEyhDG8H4fh7vS7s",
        authDomain: "sistem-pinjaman-aset-ict-v2.firebaseapp.com",
        projectId: "sistem-pinjaman-aset-ict-v2",
        storageBucket: "sistem-pinjaman-aset-ict-v2.firebasestorage.app",
        messagingSenderId: "1013418266777",
        appId: "1:1013418266777:web:f3ec4d5f38fe7b87b76808",
        measurementId: "G-9CQDWM207Z"
    };
    
    // Objek state global untuk menyimpan data
    const globalState = {
        isAdmin: false,
        user: null,
        assets: [],
        loans: [],
        selectedItems: [], // Item yang dipilih dalam borang permohonan
    };

    // Sintetizer bunyi (untuk notifikasi)
    const synth = new Tone.Synth().toDestination();
    
    // --- PEMILIH ELEMEN (ELEMENT SELECTORS) ---

    // Pengesahan (Auth)
    const authContainer = document.getElementById('auth-container');
    const authStatus = document.getElementById('auth-status');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    
    // Modal Log Masuk
    const loginModal = document.getElementById('login-modal');
    const closeLoginModalBtn = document.getElementById('close-login-modal');
    const loginForm = document.getElementById('login-form');
    const loginEmailInput = document.getElementById('email');
    const loginPasswordInput = document.getElementById('password');
    const loginSubmitBtn = document.getElementById('login-submit');
    const loginError = document.getElementById('login-error');

    // Navigasi Tab
    const tabNav = document.getElementById('tab-nav');
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const adminTab = document.querySelector('button[data-tab="rekod"]');
    const pendingBadge = document.getElementById('pending-badge');
    const pendingBadgeMain = document.getElementById('pending-badge-main');
    
    // Panel Permohonan
    const loanForm = document.getElementById('loan-form');
    const submitStatusError = document.getElementById('submit-status-error');
    const formAssetLists = {
        "Laptop": document.getElementById('form-laptop-list'),
        "Tablet": document.getElementById('form-tablet-list'),
        "Projector": document.getElementById('form-projector-list'),
        "Lain": document.getElementById('form-others-list')
    };
    const formAssetCounts = {
        "Laptop": document.getElementById('form-laptop-count'),
        "Tablet": document.getElementById('form-tablet-count'),
        "Projector": document.getElementById('form-projector-count'),
        "Lain": document.getElementById('form-others-count')
    };

    // Panel Aset Tersedia (Display Only)
    const displayAssetLists = {
        "Laptop": document.getElementById('display-laptop-list'),
        "Tablet": document.getElementById('display-tablet-list'),
        "Projector": document.getElementById('display-projector-list'),
        "Lain": document.getElementById('display-others-list')
    };
    const displayAssetCounts = {
        "Laptop": document.getElementById('display-laptop-count'),
        "Tablet": document.getElementById('display-tablet-count'),
        "Projector": document.getElementById('display-projector-count'),
        "Lain": document.getElementById('display-others-count')
    };

    // Panel Aset Dipinjam
    const borrowedList = document.getElementById('borrowed-list');
    
    // Panel Admin
    const adminPanelContainer = document.getElementById('panel-admin-rekod');
    const adminPanel = document.getElementById('admin-panel');
    const loansList = document.getElementById('loans-list');
    const bulkAddForm = document.getElementById('bulk-add-form');
    const bulkAddButton = document.getElementById('bulk-add-button');
    const bulkAddStatus = document.getElementById('bulk-add-status');
    const clearRecordsBtn = document.getElementById('clear-records-btn');
    
    // Modal Umum
    const confirmModal = document.getElementById('confirm-modal');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmOkBtn = document.getElementById('confirm-ok');
    const confirmCancelBtn = document.getElementById('confirm-cancel');
    const messageModal = document.getElementById('message-modal');
    const messageTitle = document.getElementById('message-title');
    const messageText = document.getElementById('message-text');
    const messageOkBtn = document.getElementById('message-ok');

    // Modal Edit Pinjaman
    const editLoanModal = document.getElementById('edit-loan-modal');
    const closeEditModalBtn = document.getElementById('close-edit-modal');
    const editLoanForm = document.getElementById('edit-loan-form');
    const editLoanError = document.getElementById('edit-loan-error');
    const editItemList = document.getElementById('edit-item-list');

    // Modal Pengurus Aset
    const openAssetManagerBtn = document.getElementById('open-asset-manager-btn');
    const assetManagerModal = document.getElementById('asset-manager-modal');
    const closeAssetManagerBtn = document.getElementById('close-asset-manager-btn');
    const assetManagerList = document.getElementById('asset-manager-list');
    
    // Modal Edit Aset
    const editAssetModal = document.getElementById('edit-asset-modal');
    const closeEditAssetBtn = document.getElementById('close-edit-asset-btn');
    const editAssetForm = document.getElementById('edit-asset-form');
    const editAssetStatus = document.getElementById('edit-asset-status');
    const copyToGroupBtn = document.getElementById('copy-to-group-btn');

    // --- 1. INISIALISASI FIREBASE ---
    
    async function initializeFirebaseApp() {
        // Dapatkan semua fungsi yang diperlukan dari 'window.firebase' (diimport dalam index.html)
        // Jika 'window.firebase' tidak wujud, ia akan gagal (yang sepatutnya)
        const {
            initializeApp, getAuth, onAuthStateChanged, signInAnonymously,
            signInWithCustomToken, getFirestore, setLogLevel, signOut,
            signInWithEmailAndPassword
        } = window.firebase;

        try {
            // Cuba gunakan config dari persekitaran (jika ada)
            let finalFirebaseConfig;
            if (typeof __firebase_config !== 'undefined' && __firebase_config) {
                try {
                    finalFirebaseConfig = JSON.parse(__firebase_config);
                } catch (e) {
                    console.warn("__firebase_config bukan JSON yang sah, guna config sandaran.");
                    finalFirebaseConfig = firebaseConfig;
                }
            } else {
                finalFirebaseConfig = firebaseConfig;
            }

            // Inisialisasi Aplikasi Firebase
            const app = initializeApp(finalFirebaseConfig);
            auth = getAuth(app);
            db = getFirestore(app);
            setLogLevel('Debug'); // Tunjuk log Firebase untuk debug

            // Sediakan pendengar auth
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    // Pengguna telah log masuk
                    globalState.user = user;
                    await checkAdminStatus(user.uid, user.email);
                    updateAuthUI(user);
                    // Muatkan data selepas auth sedia
                    loadAssets();
                    loadLoans();
                } else {
                    // Tiada pengguna, cuba log masuk secara anonymous
                    globalState.user = null;
                    globalState.isAdmin = false;
                    try {
                        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                            await signInWithCustomToken(auth, __initial_auth_token);
                            // onAuthStateChanged akan dipanggil semula
                        } else {
                            await signInAnonymously(auth);
                            // onAuthStateChanged akan dipanggil semula
                        }
                    } catch (authError) {
                        console.error("Ralat Auth (Anonymous/Token):", authError);
                        authStatus.textContent = "Ralat pengesahan.";
                    }
                }
                // Kemas kini UI berdasarkan status admin
                renderAdminUI();
            });

            // Pautkan semua pendengar acara (event listeners)
            setupEventListeners();

        } catch (error) {
            console.error("Gagal inisialisasi Firebase:", error);
            authStatus.textContent = "Gagal memuatkan sistem.";
            // Tunjukkan ralat pada semua bahagian "Memuatkan..."
            document.querySelectorAll('.text-gray-500.italic').forEach(el => {
                el.textContent = "Gagal memuatkan data. Sila refresh.";
                el.classList.add('text-red-500');
            });
        }
    }

    // --- 2. PENGESAHAN (AUTHENTICATION) & STATUS ADMIN ---

    /**
     * Semak jika pengguna semasa adalah admin.
     * @param {string} uid - ID Pengguna
     * @param {string | null} email - E-mel Pengguna
     */
    async function checkAdminStatus(uid, email) {
        // E-mel yang dikod keras (hardcoded)
        const hardcodedAdmins = [
            "guruict@sksa.com",
            "gurubesar@sksa.com"
        ];
        
        if (email && hardcodedAdmins.includes(email)) {
            globalState.isAdmin = true;
            return;
        }

        // Semak koleksi /admins
        const { doc, getDoc } = window.firebase;
        try {
            const adminDocRef = doc(db, `/artifacts/${appId}/public/data/admins`, uid);
            const adminDoc = await getDoc(adminDocRef);
            globalState.isAdmin = adminDoc.exists();
        } catch (error) {
            console.error("Ralat menyemak status admin:", error);
            globalState.isAdmin = false;
        }
    }

    /**
     * Kemas kini UI Auth (butang log masuk/keluar & status)
     * @param {object | null} user - Objek Pengguna Firebase
     */
    function updateAuthUI(user) {
        if (!user) {
            authStatus.textContent = "Tidak log masuk";
            loginButton.classList.remove('hidden');
            logoutButton.classList.add('hidden');
            return;
        }

        if (globalState.isAdmin) {
            authStatus.textContent = `Admin: ${user.email || user.uid.substring(0, 8)}`;
            loginButton.classList.add('hidden');
            logoutButton.classList.remove('hidden');
        } else {
            // Log masuk sebagai Guru (Anonymous atau lain-lain)
            const displayName = user.isAnonymous ? "Guru (Anonymous)" : (user.email || `Guru (${user.uid.substring(0, 8)})`);
            authStatus.textContent = displayName;
            loginButton.classList.remove('hidden'); // Benarkan "Log Masuk Admin"
            logoutButton.classList.add('hidden'); // Sembunyi log keluar (kerana akan log masuk sebagai admin)
        }
    }

    /**
     * Tunjukkan/Sembunyikan elemen UI khusus Admin
     */
    function renderAdminUI() {
        if (globalState.isAdmin) {
            adminTab.classList.remove('hidden');
            // Pindahkan panel admin ke dalam tab yang betul
            if (adminPanel) {
                adminPanelContainer.appendChild(adminPanel);
                adminPanel.classList.remove('hidden');
            }
        } else {
            adminTab.classList.add('hidden');
            if (adminPanel) {
                adminPanel.classList.add('hidden');
            }
            // Pastikan tab admin tidak aktif jika pengguna log keluar
            if (adminTab.classList.contains('active')) {
                handleTabClick(document.querySelector('button[data-tab="permohonan"]'));
            }
        }
    }
    
    // --- 3. PENGENDALI ACARA (EVENT LISTENERS) ---

    function setupEventListeners() {
        // Navigasi Tab
        tabButtons.forEach(button => {
            button.addEventListener('click', () => handleTabClick(button));
        });
        
        // Pengesahan (Auth)
        loginButton.addEventListener('click', () => showModal(loginModal));
        closeLoginModalBtn.addEventListener('click', () => hideModal(loginModal));
        loginForm.addEventListener('submit', handleAdminLogin);
        logoutButton.addEventListener('click', handleLogout);
        
        // Borang Permohonan
        loanForm.addEventListener('submit', handleLoanSubmit);
        
        // Borang Admin
        bulkAddForm.addEventListener('submit', handleBulkAddSubmit);
        clearRecordsBtn.addEventListener('click', handleClearRecords);

        // Modal Umum
        confirmCancelBtn.addEventListener('click', () => hideModal(confirmModal));
        messageOkBtn.addEventListener('click', () => hideModal(messageModal));

        // Modal Edit Pinjaman
        closeEditModalBtn.addEventListener('click', () => hideModal(editLoanModal));
        editLoanForm.addEventListener('submit', handleEditLoanSubmit);

        // Modal Pengurus Aset
        openAssetManagerBtn.addEventListener('click', loadAssetManager);
        closeAssetManagerBtn.addEventListener('click', () => hideModal(assetManagerModal));

        // Modal Edit Aset
        closeEditAssetBtn.addEventListener('click', () => {
            hideModal(editAssetModal);
            showModal(assetManagerModal); // Buka semula pengurus
        });
        editAssetForm.addEventListener('submit', handleEditAssetSubmit);
        copyToGroupBtn.addEventListener('click', handleCopyToGroup);
    }

    // --- 4. LOGIK TAB ---

    /**
     * Mengendalikan klik pada butang tab
     * @param {HTMLElement} clickedButton - Butang tab yang diklik
     */
    function handleTabClick(clickedButton) {
        // Nyahaktifkan semua tab
        tabButtons.forEach(button => button.classList.remove('active'));
        tabPanels.forEach(panel => panel.classList.add('hidden'));

        // Aktifkan tab yang diklik
        clickedButton.classList.add('active');
        const tabName = clickedButton.getAttribute('data-tab');
        
        let panelId;
        if (tabName === 'rekod') {
            panelId = 'panel-admin-rekod';
        } else {
            panelId = `panel-${tabName}`;
        }
        
        const activePanel = document.getElementById(panelId);
        if (activePanel) {
            activePanel.classList.remove('hidden');
        }
    }

    // --- 5. MEMUATKAN DATA (DATA LOADING) ---

    /**
     * Memuatkan koleksi 'assets' dari Firestore
     */
    function loadAssets() {
        const { collection, onSnapshot } = window.firebase;
        const assetsRef = collection(db, `/artifacts/${appId}/public/data/assets`);

        onSnapshot(assetsRef, (snapshot) => {
            globalState.assets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Isih aset: Kumpulan dulu, kemudian mengikut nama
            globalState.assets.sort((a, b) => {
                // Utamakan item berkumpulan
                if (a.group && !b.group) return -1;
                if (!a.group && b.group) return 1;
                // Jika kumpulan sama (atau tiada), isih ikut nama
                return a.name.localeCompare(b.name, undefined, { numeric: true });
            });

            renderAssetLists(); // Render kedua-dua senarai (borang & paparan)
        }, (error) => {
            console.error("Ralat memuatkan aset:", error);
            renderAssetLists(true); // Tunjuk ralat
        });
    }

    /**
     * Memuatkan koleksi 'loans' dari Firestore
     */
    function loadLoans() {
        const { collection, onSnapshot } = window.firebase;
        const loansRef = collection(db, `/artifacts/${appId}/public/data/loans`);

        onSnapshot(loansRef, (snapshot) => {
            globalState.loans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Isih pinjaman: 'pending' dulu, kemudian tarikh terbaru
            globalState.loans.sort((a, b) => {
                if (a.status === 'pending' && b.status !== 'pending') return -1;
                if (a.status !== 'pending' && b.status === 'pending') return 1;
                // Jika status sama, isih ikut tarikh (terbaru dulu)
                const dateA = a.startDate.seconds ? new Date(a.startDate.seconds * 1000) : new Date(a.startDate);
                const dateB = b.startDate.seconds ? new Date(b.startDate.seconds * 1000) : new Date(b.startDate);
                return dateB - dateA;
            });
            
            renderBorrowedList(); // Render senarai awam (public)
            renderAdminLoanList(); // Render jadual admin
        }, (error) => {
            console.error("Ralat memuatkan pinjaman:", error);
            borrowedList.innerHTML = `<p class="text-red-500 italic">Gagal memuatkan data pinjaman.</p>`;
            loansList.innerHTML = `<tr><td colspan="8" class="px-6 py-4 text-center text-red-500 italic">Gagal memuatkan rekod.</td></tr>`;
        });
    }

    // --- 6. MERENDER DATA (DATA RENDERING) ---

    /**
     * Merender senarai aset di Panel Permohonan dan Panel Aset Tersedia
     * @param {boolean} [isError=false] - Tetapkan true jika ada ralat memuatkan
     */
    function renderAssetLists(isError = false) {
        // Tetapkan semula semua senarai
        Object.values(formAssetLists).forEach(list => list.innerHTML = '');
        Object.values(displayAssetLists).forEach(list => list.innerHTML = '');
        Object.values(formAssetCounts).forEach(el => { el.textContent = '0'; el.classList.add('hidden'); });
        Object.values(displayAssetCounts).forEach(el => { el.textContent = '0'; el.classList.add('hidden'); });

        if (isError) {
            const errorMsg = `<p class="text-red-500 italic">Gagal memuatkan aset.</p>`;
            Object.values(formAssetLists).forEach(list => list.innerHTML = errorMsg);
            Object.values(displayAssetLists).forEach(list => list.innerHTML = errorMsg);
            return;
        }

        // Kumpulkan aset mengikut kumpulan (groupName)
        const groupedAssets = {};
        const individualAssets = [];
        
        globalState.assets.forEach(asset => {
            if (asset.group) {
                if (!groupedAssets[asset.group]) {
                    groupedAssets[asset.group] = {
                        items: [],
                        category: asset.category,
                        image: asset.image,
                        specs: asset.specs,
                        // Tentukan status kumpulan
                        status: 'available' // Anggap tersedia, akan dikemas kini di bawah
                    };
                }
                groupedAssets[asset.group].items.push(asset);
            } else {
                individualAssets.push(asset);
            }
        });

        // Tentukan status kumpulan (jika 1 item 'loaned', seluruh kumpulan 'loaned')
        Object.values(groupedAssets).forEach(group => {
            if (group.items.some(item => item.status !== 'available')) {
                group.status = 'loaned'; // Guna 'loaned' untuk wakili tidak tersedia
            }
        });

        // --- Proses Item Individu ---
        individualAssets.forEach(asset => {
            const category = asset.category || 'Lain';
            if (!formAssetLists[category]) return; // Langkau jika kategori tidak wujud

            // 1. Render untuk Senarai Paparan (Display List)
            if (asset.status === 'available') {
                const displayItem = createDisplayAssetItem(asset);
                displayAssetLists[category].appendChild(displayItem);
                incrementCount(displayAssetCounts[category]);
            }
            
            // 2. Render untuk Senarai Borang (Form List)
            const formItem = createFormAssetItem(asset);
            formAssetLists[category].appendChild(formItem);
            if(asset.status === 'available') {
                incrementCount(formAssetCounts[category]);
            }
        });

        // --- Proses Item Berkumpulan ---
        Object.values(groupedAssets).forEach(group => {
            const assetGroup = {
                id: group.items.map(i => i.id).join(','), // Gabung ID
                name: group.items[0].group, // Guna nama kumpulan
                category: group.category,
                image: group.image,
                specs: group.specs,
                status: group.status,
                isGroup: true,
                items: group.items
            };
            
            const category = assetGroup.category || 'Lain';
            if (!formAssetLists[category]) return;

            // 1. Render untuk Senarai Paparan (Display List)
            if (assetGroup.status === 'available') {
                const displayItem = createDisplayAssetItem(assetGroup);
                displayAssetLists[category].appendChild(displayItem);
                incrementCount(displayAssetCounts[category]);
            }
            
            // 2. Render untuk Senarai Borang (Form List)
            const formItem = createFormAssetItem(assetGroup);
            formAssetLists[category].appendChild(formItem);
            if(assetGroup.status === 'available') {
                incrementCount(formAssetCounts[category]);
            }
        });

        // Tunjuk 'tiada' jika senarai kosong
        const noDataMsg = `<p class="text-gray-500 italic">Tiada aset tersedia dalam kategori ini.</p>`;
        Object.keys(formAssetLists).forEach(cat => {
            if (formAssetLists[cat].innerHTML === '') formAssetLists[cat].innerHTML = noDataMsg;
            if (formAssetCounts[cat].textContent === '0') formAssetCounts[cat].classList.add('hidden');
        });
        Object.keys(displayAssetLists).forEach(cat => {
            if (displayAssetLists[cat].innerHTML === '') displayAssetLists[cat].innerHTML = noDataMsg;
            if (displayAssetCounts[cat].textContent === '0') displayAssetCounts[cat].classList.add('hidden');
        });
    }
    
    /**
     * Cipta elemen HTML untuk Senarai Paparan (Display Only)
     * @param {object} asset - Objek aset (individu atau berkumpulan)
     * @returns {HTMLElement} Elemen div
     */
    function createDisplayAssetItem(asset) {
        const div = document.createElement('div');
        div.className = 'asset-item-details border border-gray-200 rounded-lg overflow-hidden';
        
        // Cipta spesifikasi
        const specsHtml = (asset.specs || '')
            .split('\n')
            .filter(Boolean) // Abaikan baris kosong
            .map(line => `<li class="text-xs text-gray-600">${line}</li>`)
            .join('');

        div.innerHTML = `
            <div class="flex justify-between items-center p-3 cursor-pointer bg-white hover:bg-gray-50">
                <span class="font-medium text-gray-800">${asset.name}</span>
                ${(asset.image || specsHtml) ? `
                <button class="info-toggle-btn p-1 rounded-full hover:bg-gray-200 transition-transform duration-300">
                    <svg class="info-icon w-5 h-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
                ` : ''}
            </div>
            ${(asset.image || specsHtml || asset.isGroup) ? `
            <div class="asset-details p-4 border-t border-gray-100">
                ${asset.image ? `<img src="${asset.image}" alt="${asset.name}" class="rounded-md mb-3 max-h-40 object-cover" onerror="this.style.display='none'">` : ''}
                ${specsHtml ? `<ul class="list-disc list-inside space-y-1 mb-3">${specsHtml}</ul>` : ''}
                ${asset.isGroup ? `
                    <p class="text-xs font-semibold text-gray-700 mb-2">Item dalam kumpulan ini (${asset.items.length}):</p>
                    <div class="grouped-item-grid">
                        ${asset.items.map(item => `<span class="text-xs text-gray-600 bg-gray-100 p-1 rounded">${item.name}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
            ` : ''}
        `;
        
        // Tambah event listener untuk tunjuk/sembunyi butiran
        const toggleBtn = div.querySelector('.info-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                div.classList.toggle('open');
            });
        }
        return div;
    }

    /**
     * Cipta elemen HTML untuk Senarai Borang (Form List)
     * @param {object} asset - Objek aset (individu atau berkumpulan)
     * @returns {HTMLElement} Elemen div
     */
    function createFormAssetItem(asset) {
        const div = document.createElement('div');
        div.className = `p-3 border rounded-lg cursor-pointer transition ${
            asset.status === 'available' 
            ? 'border-gray-300 bg-white hover:bg-blue-50' 
            : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
        }`;
        
        const displayName = `${asset.name} ${asset.isGroup ? `(Kumpulan ${asset.items.length} unit)` : ''}`;
        div.textContent = displayName;

        if (asset.status === 'available') {
            div.setAttribute('data-asset-id', asset.id);
            div.setAttribute('data-asset-name', displayName);
            div.addEventListener('click', () => {
                // Logik untuk memilih item
                div.classList.toggle('bg-blue-100');
                div.classList.toggle('border-blue-400');
                div.classList.toggle('font-semibold');
                
                const assetId = asset.id;
                const assetName = displayName;
                
                if (globalState.selectedItems.some(item => item.id === assetId)) {
                    // Nyahpilih
                    globalState.selectedItems = globalState.selectedItems.filter(item => item.id !== assetId);
                } else {
                    // Pilih
                    globalState.selectedItems.push({ id: assetId, name: assetName });
                }
            });
        } else {
            div.title = `Tidak tersedia (Status: ${asset.status})`;
        }
        return div;
    }

    /**
     * Merender senarai awam aset yang sedang dipinjam
     */
    function renderBorrowedList() {
        borrowedList.innerHTML = '';
        const borrowedAssets = globalState.loans.filter(loan => loan.status === 'approved');

        if (borrowedAssets.length === 0) {
            borrowedList.innerHTML = `<p class="text-gray-500 italic">Tiada aset sedang dipinjam.</p>`;
            return;
        }
        
        borrowedAssets.forEach(loan => {
            const div = document.createElement('div');
            div.className = 'bg-gray-50 border border-gray-200 rounded-lg p-4';
            
            const endDate = loan.endDate.seconds ? new Date(loan.endDate.seconds * 1000) : new Date(loan.endDate);
            const isOverdue = new Date() > endDate;

            div.innerHTML = `
                <p class="font-semibold text-gray-800">${loan.teacherName}</p>
                <p class="text-sm text-gray-600">${loan.items.map(i => i.name).join(', ')}</p>
                <p class="text-sm text-gray-500 mt-2">
                    Pulang: 
                    <span class="font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}">
                        ${endDate.toLocaleDateString('ms-MY')}
                        ${isOverdue ? '(Terlewat)' : ''}
                    </span>
                </p>
            `;
            borrowedList.appendChild(div);
        });
    }

    /**
     * Merender jadual pinjaman di Panel Admin
     */
    function renderAdminLoanList() {
        loansList.innerHTML = '';
        const pendingLoans = globalState.loans.filter(loan => loan.status === 'pending');
        
        // Kemas kini badge notifikasi
        if (pendingLoans.length > 0) {
            pendingBadge.textContent = pendingLoans.length;
            pendingBadgeMain.textContent = pendingLoans.length;
            pendingBadge.classList.remove('hidden');
            pendingBadgeMain.classList.remove('hidden');
            // Mainkan bunyi notifikasi jika ada permohonan baru
            if (pendingLoans.length > (parseInt(pendingBadge.dataset.lastCount || 0))) {
                synth.triggerAttackRelease("C5", "0.2");
            }
            pendingBadge.dataset.lastCount = pendingLoans.length;
        } else {
            pendingBadge.classList.add('hidden');
            pendingBadgeMain.classList.add('hidden');
            pendingBadge.dataset.lastCount = 0;
        }

        if (globalState.loans.length === 0) {
            loansList.innerHTML = `<tr><td colspan="8" class="px-6 py-4 text-center text-gray-500 italic">Tiada rekod pinjaman.</td></tr>`;
            return;
        }
        
        globalState.loans.forEach(loan => {
            const tr = document.createElement('tr');
            tr.className = loan.status === 'pending' ? 'bg-yellow-50' : (loan.status === 'rejected' ? 'bg-red-50 opacity-70' : '');
            
            const startDate = loan.startDate.seconds ? new Date(loan.startDate.seconds * 1000) : new Date(loan.startDate);
            const endDate = loan.endDate.seconds ? new Date(loan.endDate.seconds * 1000) : new Date(loan.endDate);

            const statusColors = {
                pending: 'text-yellow-600',
                approved: 'text-green-600',
                returned: 'text-blue-600',
                rejected: 'text-red-600'
            };
            
            const statusText = {
                pending: 'Menunggu',
                approved: 'Diluluskan',
                returned: 'Telah Dipulang',
                rejected: 'Ditolak'
            };
            
            tr.innerHTML = `
                <!-- Tindakan (Actions) -->
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    ${loan.status === 'pending' ? `
                        <button data-id="${loan.id}" class="btn-approve text-green-600 hover:text-green-900 mr-2" title="Luluskan">Lulus</button>
                        <button data-id="${loan.id}" class="btn-reject text-red-600 hover:text-red-900 mr-2" title="Tolak">Tolak</button>
                    ` : ''}
                    ${loan.status === 'approved' ? `
                        <button data-id="${loan.id}" class="btn-return text-blue-600 hover:text-blue-900 mr-2" title="Tanda Telah Pulang">Pulang</button>
                    ` : ''}
                    ${loan.status === 'pending' || loan.status === 'rejected' ? `
                        <button data-id="${loan.id}" class="btn-edit-loan text-gray-500 hover:text-gray-800" title="Edit">Edit</button>
                    ` : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${loan.teacherName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${loan.teacherIC}</td>
                <td class="px-6 py-4 text-sm text-gray-600">
                    <ul class="list-disc list-inside">
                        ${loan.items.map(item => `<li>${item.name}</li>`).join('')}
                    </ul>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${startDate.toLocaleDateString('ms-MY')}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${endDate.toLocaleDateString('ms-MY')}</td>
                <td class="px-6 py-4 text-sm text-gray-500 min-w-[200px] whitespace-pre-wrap">${loan.purpose}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium ${statusColors[loan.status] || ''}">
                    ${statusText[loan.status] || loan.status}
                </td>
            `;
            loansList.appendChild(tr);
        });
        
        // Pautkan event listeners untuk butang admin
        document.querySelectorAll('.btn-approve').forEach(b => b.addEventListener('click', () => handleApproveLoan(b.dataset.id)));
        document.querySelectorAll('.btn-reject').forEach(b => b.addEventListener('click', () => handleRejectLoan(b.dataset.id)));
        document.querySelectorAll('.btn-return').forEach(b => b.addEventListener('click', () => handleReturnLoan(b.dataset.id)));
        document.querySelectorAll('.btn-edit-loan').forEach(b => b.addEventListener('click', () => showEditLoanModal(b.dataset.id)));
    }
    
    // --- 7. PENGENDALI BORANG (FORM HANDLERS) ---
    
    /**
     * Mengendalikan hantaran borang log masuk admin
     */
    async function handleAdminLogin(e) {
        e.preventDefault();
        const { signInWithEmailAndPassword } = window.firebase;
        
        loginError.textContent = '';
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.textContent = 'Memproses...';

        try {
            await signInWithEmailAndPassword(auth, loginEmailInput.value, loginPasswordInput.value);
            // Jika berjaya, onAuthStateChanged akan berjalan
            // Ia akan mengesan e-mel admin, set globalState.isAdmin = true
            // dan render semula UI (updateAuthUI, renderAdminUI)
            hideModal(loginModal);
            loginForm.reset();
        } catch (error) {
            console.error("Ralat Log Masuk:", error.code);
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                loginError.textContent = 'E-mel atau kata laluan salah.';
            } else {
                loginError.textContent = 'Ralat: ' + error.message;
            }
        } finally {
            loginSubmitBtn.disabled = false;
            loginSubmitBtn.textContent = 'Log Masuk';
        }
    }

    /**
     * Mengendalikan log keluar
     */
    async function handleLogout() {
        const { signOut } = window.firebase;
        try {
            await signOut(auth);
            // onAuthStateChanged akan berjalan, mengesan tiada pengguna
            // dan cuba log masuk anonymous
            globalState.isAdmin = false;
            globalState.user = null;
            // updateAuthUI dan renderAdminUI akan dipanggil oleh onAuthStateChanged
            handleTabClick(document.querySelector('button[data-tab="permohonan"]'));
        } catch (error) {
            console.error("Ralat Log Keluar:", error);
            showMessage("Ralat", "Gagal log keluar.");
        }
    }

    /**
     * Mengendalikan hantaran borang permohonan pinjaman
     */
    async function handleLoanSubmit(e) {
        e.preventDefault();
        submitStatusError.textContent = '';
        
        if (globalState.selectedItems.length === 0) {
            submitStatusError.textContent = "Sila pilih sekurang-kurangnya satu aset untuk dipinjam.";
            return;
        }
        
        const { addDoc, collection, writeBatch } = window.firebase;

        const formData = new FormData(loanForm);
        const loanData = {
            teacherName: formData.get('teacherName'),
            teacherIC: formData.get('teacherIC'),
            startDate: new Date(formData.get('startDate')),
            endDate: new Date(formData.get('endDate')),
            purpose: formData.get('purpose'),
            items: globalState.selectedItems, // [{id: "...", name: "..."}, ...]
            status: 'pending', // Status awal
            submittedAt: new Date(),
            submittedBy: globalState.user.uid
        };

        // Sahkan tarikh
        if (loanData.endDate < loanData.startDate) {
            submitStatusError.textContent = "Tarikh pulang tidak boleh lebih awal dari tarikh pinjam.";
            return;
        }

        const submitButton = document.getElementById('submit-button');
        submitButton.disabled = true;
        submitButton.textContent = "Menghantar...";

        try {
            const batch = writeBatch(db);

            // 1. Tambah dokumen pinjaman baru
            const loansRef = collection(db, `/artifacts/${appId}/public/data/loans`);
            batch.set(addDoc(loansRef)._key, loanData); // Guna ._key untuk set dalam batch

            // 2. Kemas kini status semua aset yang terlibat
            const { doc, updateDoc } = window.firebase;
            
            const allItemIds = globalState.selectedItems.flatMap(item => item.id.split(','));

            allItemIds.forEach(assetId => {
                const assetRef = doc(db, `/artifacts/${appId}/public/data/assets`, assetId);
                batch.update(assetRef, { status: 'pending' });
            });

            // Laksanakan batch
            await batch.commit();

            // Berjaya
            showMessage("Berjaya", "Permohonan anda telah dihantar. Sila tunggu kelulusan.");
            loanForm.reset();
            globalState.selectedItems = [];
            // Render semula senarai aset untuk nyahpilih item
            renderAssetLists();

        } catch (error) {
            console.error("Ralat menghantar permohonan:", error);
            submitStatusError.textContent = "Gagal menghantar permohonan. Sila cuba lagi.";
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Hantar Permohonan";
        }
    }

    /**
     * Mengendalikan hantaran borang tambah aset pukal (admin)
     */
    async function handleBulkAddSubmit(e) {
        e.preventDefault();
        bulkAddStatus.textContent = '';
        bulkAddButton.disabled = true;
        bulkAddButton.textContent = 'Memproses...';

        const baseName = document.getElementById('baseName').value;
        const groupName = document.getElementById('groupName').value.trim();
        const quantity = parseInt(document.getElementById('quantity').value);
        const category = document.getElementById('category').value;
        
        const { writeBatch, collection, addDoc } = window.firebase;

        try {
            const batch = writeBatch(db);
            const assetsRef = collection(db, `/artifacts/${appId}/public/data/assets`);

            for (let i = 1; i <= quantity; i++) {
                const newAsset = {
                    name: `${baseName} ${i}`,
                    category: category,
                    status: 'available', // Lalai
                    group: groupName || null,
                    image: null,
                    specs: null
                };
                // Guna ._key untuk tambah dokumen baru dalam batch
                batch.set(addDoc(assetsRef)._key, newAsset);
            }

            await batch.commit();
            
            bulkAddStatus.textContent = `Berjaya! ${quantity} aset telah ditambah.`;
            bulkAddStatus.className = 'text-sm text-green-600';
            bulkAddForm.reset();

        } catch (error) {
            console.error("Ralat menambah aset pukal:", error);
            bulkAddStatus.textContent = 'Gagal menambah aset. Sila cuba lagi.';
            bulkAddStatus.className = 'text-sm text-red-600';
        } finally {
            bulkAddButton.disabled = false;
            bulkAddButton.textContent = 'Tambah Aset';
        }
    }

    // --- 8. TINDAKAN ADMIN (KELULUSAN, DLL.) ---

    /**
     * Luluskan permohonan pinjaman
     * @param {string} loanId - ID dokumen pinjaman
     */
    async function handleApproveLoan(loanId) {
        const loan = globalState.loans.find(l => l.id === loanId);
        if (!loan) return;
        
        const { writeBatch, doc, updateDoc } = window.firebase;
        
        // Sahkan sekali lagi tiada item bertindih
        const allItemIds = loan.items.flatMap(item => item.id.split(','));
        const conflictingAssets = globalState.assets.filter(asset => 
            allItemIds.includes(asset.id) && asset.status !== 'pending'
        );

        if (conflictingAssets.length > 0) {
            const names = conflictingAssets.map(a => a.name).join(', ');
            showMessage("Ralat", `Gagal luluskan. Aset (${names}) tidak lagi berstatus 'pending'. Ia mungkin telah diluluskan untuk pinjaman lain.`);
            return;
        }

        try {
            const batch = writeBatch(db);
            
            // 1. Kemas kini status pinjaman
            const loanRef = doc(db, `/artifacts/${appId}/public/data/loans`, loanId);
            batch.update(loanRef, { status: 'approved' });

            // 2. Kemas kini status semua aset terlibat
            allItemIds.forEach(assetId => {
                const assetRef = doc(db, `/artifacts/${appId}/public/data/assets`, assetId);
                batch.update(assetRef, { status: 'loaned' });
            });
            
            await batch.commit();
            showMessage("Berjaya", "Pinjaman telah diluluskan.");
            synth.triggerAttackRelease("G5", "0.2");

        } catch (error) {
            console.error("Ralat meluluskan:", error);
            showMessage("Ralat", "Gagal meluluskan pinjaman.");
        }
    }

    /**
     * Tolak permohonan pinjaman
     * @param {string} loanId - ID dokumen pinjaman
     */
    async function handleRejectLoan(loanId) {
        const loan = globalState.loans.find(l => l.id === loanId);
        if (!loan) return;
        
        const { writeBatch, doc, updateDoc } = window.firebase;

        try {
            const batch = writeBatch(db);
            
            // 1. Kemas kini status pinjaman
            const loanRef = doc(db, `/artifacts/${appId}/public/data/loans`, loanId);
            batch.update(loanRef, { status: 'rejected' });
            
            // 2. Kemas kini status aset (kembali ke 'available')
            const allItemIds = loan.items.flatMap(item => item.id.split(','));
            
            allItemIds.forEach(assetId => {
                const assetRef = doc(db, `/artifacts/${appId}/public/data/assets`, assetId);
                batch.update(assetRef, { status: 'available' });
            });

            await batch.commit();
            showMessage("Berjaya", "Permohonan telah ditolak.");

        } catch (error) {
            console.error("Ralat menolak:", error);
            showMessage("Ralat", "Gagal menolak permohonan.");
        }
    }
    
    /**
     * Tanda aset telah dipulangkan
     * @param {string} loanId - ID dokumen pinjaman
     */
    async function handleReturnLoan(loanId) {
        const loan = globalState.loans.find(l => l.id === loanId);
        if (!loan) return;

        const { writeBatch, doc, updateDoc } = window.firebase;
        
        try {
            const batch = writeBatch(db);
            
            // 1. Kemas kini status pinjaman
            const loanRef = doc(db, `/artifacts/${appId}/public/data/loans`, loanId);
            batch.update(loanRef, { status: 'returned' });

            // 2. Kemas kini status aset (kembali ke 'available')
            const allItemIds = loan.items.flatMap(item => item.id.split(','));

            allItemIds.forEach(assetId => {
                const assetRef = doc(db, `/artifacts/${appId}/public/data/assets`, assetId);
                batch.update(assetRef, { status: 'available' });
            });

            await batch.commit();
            showMessage("Berjaya", "Aset telah ditanda sebagai pulang.");

        } catch (error) {
            console.error("Ralat memulangkan:", error);
            showMessage("Ralat", "Gagal memulangkan aset.");
        }
    }

    /**
     * Kosongkan rekod lama (status 'returned' atau 'rejected')
     */
    function handleClearRecords() {
        showConfirm(
            "Padam Rekod Lama?",
            "Adakah anda pasti mahu memadam semua rekod yang berstatus 'Telah Dipulang' atau 'Ditolak'? Tindakan ini tidak boleh diundur.",
            async () => {
                const { writeBatch, doc, deleteDoc } = window.firebase;
                const oldRecords = globalState.loans.filter(l => l.status === 'returned' || l.status === 'rejected');
                
                if (oldRecords.length === 0) {
                    showMessage("Tiada Rekod", "Tiada rekod lama untuk dipadam.");
                    return;
                }

                try {
                    const batch = writeBatch(db);
                    oldRecords.forEach(loan => {
                        const loanRef = doc(db, `/artifacts/${appId}/public/data/loans`, loan.id);
                        batch.delete(loanRef);
                    });
                    await batch.commit();
                    showMessage("Berjaya", `${oldRecords.length} rekod lama telah dipadam.`);
                } catch (error) {
                    console.error("Ralat memadam rekod:", error);
                    showMessage("Ralat", "Gagal memadam rekod lama.");
                }
            }
        );
    }
    
    // --- 9. MODAL EDIT PINJAMAN ---
    
    /**
     * Tunjukkan modal untuk edit permohonan pinjaman
     * @param {string} loanId - ID dokumen pinjaman
     */
    function showEditLoanModal(loanId) {
        const loan = globalState.loans.find(l => l.id === loanId);
        if (!loan) return;
        
        // Isi borang dengan data sedia ada
        document.getElementById('edit-loan-id').value = loanId;
        document.getElementById('edit-teacherName').value = loan.teacherName;
        document.getElementById('edit-teacherIC').value = loan.teacherIC;
        document.getElementById('edit-purpose').value = loan.purpose;
        
        // Format tarikh untuk input type="date" (YYYY-MM-DD)
        const startDate = loan.startDate.seconds ? new Date(loan.startDate.seconds * 1000) : new Date(loan.startDate);
        const endDate = loan.endDate.seconds ? new Date(loan.endDate.seconds * 1000) : new Date(loan.endDate);
        document.getElementById('edit-startDate').valueAsDate = startDate;
        document.getElementById('edit-endDate').valueAsDate = endDate;

        // Paparkan senarai item (read-only)
        editItemList.innerHTML = loan.items.map(item => `<span>- ${item.name}</span>`).join('<br>');
        
        editLoanError.textContent = '';
        showModal(editLoanModal);
    }
    
    /**
     * Hantar (submit) borang edit pinjaman
     */
    async function handleEditLoanSubmit(e) {
        e.preventDefault();
        const { doc, updateDoc } = window.firebase;
        
        const loanId = document.getElementById('edit-loan-id').value;
        const formData = new FormData(editLoanForm);
        
        const updatedData = {
            teacherName: formData.get('edit-teacherName'),
            teacherIC: formData.get('edit-teacherIC'),
            startDate: new Date(formData.get('edit-startDate')),
            endDate: new Date(formData.get('edit-endDate')),
            purpose: formData.get('edit-purpose')
        };
        
        if (updatedData.endDate < updatedData.startDate) {
            editLoanError.textContent = "Tarikh pulang tidak boleh lebih awal dari tarikh pinjam.";
            return;
        }

        const submitButton = document.getElementById('edit-loan-submit');
        submitButton.disabled = true;
        submitButton.textContent = "Menyimpan...";
        
        try {
            const loanRef = doc(db, `/artifacts/${appId}/public/data/loans`, loanId);
            await updateDoc(loanRef, updatedData);
            
            hideModal(editLoanModal);
            showMessage("Berjaya", "Maklumat pinjaman telah dikemas kini.");

        } catch (error) {
            console.error("Ralat mengemas kini pinjaman:", error);
            editLoanError.textContent = "Gagal menyimpan perubahan. Sila cuba lagi.";
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = "Simpan Perubahan";
        }
    }

    // --- 10. MODAL PENGURUS ASET ---
    
    /**
     * Memuatkan dan membuka modal Pengurus Aset
     */
    function loadAssetManager() {
        assetManagerList.innerHTML = ''; // Kosongkan
        
        if (globalState.assets.length === 0) {
            assetManagerList.innerHTML = `<p class="text-gray-500 italic">Tiada aset dalam sistem.</p>`;
            showModal(assetManagerModal);
            return;
        }
        
        // Isih ikut status dulu (pending, loaned), kemudian nama
        const sortedAssets = [...globalState.assets].sort((a, b) => {
            if (a.status !== 'available' && b.status === 'available') return -1;
            if (a.status === 'available' && b.status !== 'available') return 1;
            return a.name.localeCompare(b.name, undefined, { numeric: true });
        });
        
        sortedAssets.forEach(asset => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg';
            
            const statusColors = {
                available: 'text-green-600',
                pending: 'text-yellow-600',
                loaned: 'text-red-600'
            };
            
            div.innerHTML = `
                <div>
                    <p class="font-medium text-gray-800">${asset.name}</p>
                    <p class="text-xs text-gray-500">Kategori: ${asset.category} | Kumpulan: ${asset.group || 'N/A'}</p>
                </div>
                <div class="flex items-center space-x-3">
                    <span class="text-sm font-medium ${statusColors[asset.status] || ''}">${asset.status}</span>
                    <button data-id="${asset.id}" class="btn-edit-asset bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm py-1 px-3 rounded-md">Edit</button>
                    <button data-id="${asset.id}" class="btn-delete-asset bg-red-100 text-red-700 hover:bg-red-200 text-sm py-1 px-3 rounded-md">Padam</button>
                </div>
            `;
            assetManagerList.appendChild(div);
        });
        
        // Pautkan event listeners
        document.querySelectorAll('.btn-edit-asset').forEach(b => b.addEventListener('click', () => {
            hideModal(assetManagerModal);
            showEditAssetModal(b.dataset.id);
        }));
        
        document.querySelectorAll('.btn-delete-asset').forEach(b => b.addEventListener('click', () => {
            handleDeleteAsset(b.dataset.id);
        }));
        
        showModal(assetManagerModal);
    }
    
    /**
     * Tunjukkan modal untuk edit aset
     * @param {string} assetId - ID dokumen aset
     */
    function showEditAssetModal(assetId) {
        const asset = globalState.assets.find(a => a.id === assetId);
        if (!asset) return;
        
        // Isi borang
        document.getElementById('edit-asset-id').value = assetId;
        document.getElementById('edit-asset-name').value = asset.name;
        document.getElementById('edit-asset-group').value = asset.group || '';
        document.getElementById('edit-asset-category').value = asset.category;
        document.getElementById('edit-asset-image').value = asset.image || '';
        document.getElementById('edit-asset-specs').value = asset.specs || '';
        
        editAssetStatus.textContent = '';
        
        // Tunjukkan/sembunyikan butang "Salin ke Kumpulan"
        copyToGroupBtn.classList.toggle('hidden', !asset.group);

        showModal(editAssetModal);
    }

    /**
     * Hantar borang edit aset (Simpan 1 aset)
     */
    async function handleEditAssetSubmit(e) {
        e.preventDefault();
        const { doc, updateDoc } = window.firebase;
        
        const assetId = document.getElementById('edit-asset-id').value;
        const assetRef = doc(db, `/artifacts/${appId}/public/data/assets`, assetId);

        const updatedData = {
            name: document.getElementById('edit-asset-name').value,
            group: document.getElementById('edit-asset-group').value.trim() || null,
            category: document.getElementById('edit-asset-category').value,
            image: document.getElementById('edit-asset-image').value.trim() || null,
            specs: document.getElementById('edit-asset-specs').value.trim() || null,
        };
        
        editAssetStatus.textContent = "Menyimpan...";
        editAssetStatus.className = 'text-sm text-gray-600';
        document.getElementById('edit-asset-submit').disabled = true;

        try {
            await updateDoc(assetRef, updatedData);
            editAssetStatus.textContent = "Berjaya disimpan!";
            editAssetStatus.className = 'text-sm text-green-600';
            // Muat semula senarai pengurus aset di latar belakang
            loadAssetManagerListOnly();
        } catch (error) {
            console.error("Ralat mengemas kini aset:", error);
            editAssetStatus.textContent = "Gagal menyimpan.";
            editAssetStatus.className = 'text-sm text-red-600';
        } finally {
            document.getElementById('edit-asset-submit').disabled = false;
        }
    }
    
    /**
     * Salin maklumat aset ke semua item dalam kumpulan yang sama
     */
    async function handleCopyToGroup() {
        const { writeBatch, doc } = window.firebase;
        
        const groupName = document.getElementById('edit-asset-group').value.trim();
        if (!groupName) {
            editAssetStatus.textContent = "Nama Kumpulan diperlukan untuk menyalin.";
            editAssetStatus.className = 'text-sm text-red-600';
            return;
        }

        const itemsInGroup = globalState.assets.filter(a => a.group === groupName);
        if (itemsInGroup.length === 0) {
            editAssetStatus.textContent = "Tiada item lain dalam kumpulan ini.";
            editAssetStatus.className = 'text-sm text-yellow-600';
            return;
        }
        
        // Maklumat baru untuk disalin (tidak termasuk nama)
        const updatedData = {
            group: groupName,
            category: document.getElementById('edit-asset-category').value,
            image: document.getElementById('edit-asset-image').value.trim() || null,
            specs: document.getElementById('edit-asset-specs').value.trim() || null,
        };

        editAssetStatus.textContent = `Menyalin ke ${itemsInGroup.length} item...`;
        editAssetStatus.className = 'text-sm text-gray-600';
        copyToGroupBtn.disabled = true;
        
        try {
            const batch = writeBatch(db);
            itemsInGroup.forEach(asset => {
                const assetRef = doc(db, `/artifacts/${appId}/public/data/assets`, asset.id);
                // Salin semua KECUALI nama (setiap item kekal nama unik)
                batch.update(assetRef, updatedData);
            });
            await batch.commit();

            editAssetStatus.textContent = `Berjaya! Maklumat telah disalin ke ${itemsInGroup.length} item.`;
            editAssetStatus.className = 'text-sm text-green-600';
            
            // Muat semula senarai pengurus aset di latar belakang
            loadAssetManagerListOnly();
            
        } catch (error) {
            console.error("Ralat menyalin ke kumpulan:", error);
            editAssetStatus.textContent = "Gagal menyalin maklumat.";
            editAssetStatus.className = 'text-sm text-red-600';
        } finally {
            copyToGroupBtn.disabled = false;
        }
    }
    
    /**
     * Padam aset (hanya jika 'available')
     * @param {string} assetId - ID dokumen aset
     */
    function handleDeleteAsset(assetId) {
        const asset = globalState.assets.find(a => a.id === assetId);
        if (!asset) return;

        if (asset.status !== 'available') {
            showMessage("Tidak Boleh Dipadam", `Aset ini tidak boleh dipadam kerana statusnya ialah '${asset.status}'. Hanya aset 'available' boleh dipadam.`);
            return;
        }
        
        showConfirm(
            "Padam Aset?",
            `Adakah anda pasti mahu memadam aset: ${asset.name}? Tindakan ini tidak boleh diundur.`,
            async () => {
                const { doc, deleteDoc } = window.firebase;
                try {
                    const assetRef = doc(db, `/artifacts/${appId}/public/data/assets`, assetId);
                    await deleteDoc(assetRef);
                    showMessage("Berjaya", `Aset ${asset.name} telah dipadam.`);
                    // Muat semula senarai pengurus aset
                    loadAssetManagerListOnly();
                } catch (error) {
                    console.error("Ralat memadam aset:", error);
                    showMessage("Ralat", "Gagal memadam aset.");
                }
            }
        );
    }

    /**
     * Muat semula kandungan modal pengurus aset (tanpa membuka/menutup)
     */
    function loadAssetManagerListOnly() {
        // Logik yang sama seperti loadAssetManager, tetapi tanpa tunjuk modal
        assetManagerList.innerHTML = '';
        const sortedAssets = [...globalState.assets].sort((a, b) => {
            if (a.status !== 'available' && b.status === 'available') return -1;
            if (a.status === 'available' && b.status !== 'available') return 1;
            return a.name.localeCompare(b.name, undefined, { numeric: true });
        });
        
        sortedAssets.forEach(asset => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg';
            const statusColors = { available: 'text-green-600', pending: 'text-yellow-600', loaned: 'text-red-600' };
            div.innerHTML = `
                <div>
                    <p class="font-medium text-gray-800">${asset.name}</p>
                    <p class="text-xs text-gray-500">Kategori: ${asset.category} | Kumpulan: ${asset.group || 'N/A'}</p>
                </div>
                <div class="flex items-center space-x-3">
                    <span class="text-sm font-medium ${statusColors[asset.status] || ''}">${asset.status}</span>
                    <button data-id="${asset.id}" class="btn-edit-asset bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm py-1 px-3 rounded-md">Edit</button>
                    <button data-id="${asset.id}" class="btn-delete-asset bg-red-100 text-red-700 hover:bg-red-200 text-sm py-1 px-3 rounded-md">Padam</button>
                </div>
            `;
            assetManagerList.appendChild(div);
        });
        
        document.querySelectorAll('.btn-edit-asset').forEach(b => b.addEventListener('click', () => {
            hideModal(assetManagerModal);
            showEditAssetModal(b.dataset.id);
        }));
        document.querySelectorAll('.btn-delete-asset').forEach(b => b.addEventListener('click', () => {
            handleDeleteAsset(b.dataset.id);
        }));
    }
    
    // --- 11. FUNGSI UTILITI (MODAL, DLL.) ---

    /**
     * Tunjukkan modal generik
     * @param {HTMLElement} modal - Elemen modal
     */
    function showModal(modal) {
        modal.classList.remove('hidden');
    }

    /**
     * Sembunyikan modal generik
     * @param {HTMLElement} modal - Elemen modal
     */
    function hideModal(modal) {
        modal.classList.add('hidden');
    }

    /**
     * Tunjukkan modal pengesahan (confirm)
     * @param {string} title - Tajuk modal
     * @param {string} message - Mesej modal
     * @param {function} onConfirm - Fungsi callback jika 'OK' ditekan
     */
    function showConfirm(title, message, onConfirm) {
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        
        // Padam pendengar lama dan pautkan yang baru
        confirmOkBtn.replaceWith(confirmOkBtn.cloneNode(true));
        const newConfirmOkBtn = document.getElementById('confirm-ok');
        newConfirmOkBtn.addEventListener('click', () => {
            hideModal(confirmModal);
            onConfirm(); // Jalankan callback
        });
        
        showModal(confirmModal);
    }
    
    /**
     * Tunjukkan modal mesej (alert)
     * @param {string} title - Tajuk modal
     * @param {string} message - Mesej modal
     */
    function showMessage(title, message) {
        messageTitle.textContent = title;
        messageText.textContent = message;
        showModal(messageModal);
    }

    /**
     * Menambah nilai kaunter (badge)
     * @param {HTMLElement} element - Elemen 'span' kaunter
     */
    function incrementCount(element) {
        let count = parseInt(element.textContent) || 0;
        count++;
        element.textContent = count;
        element.classList.remove('hidden');
    }

    // --- MULAKAN APLIKASI ---
    initializeFirebaseApp();

});

