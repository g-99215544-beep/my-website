// Import fungsi yang diperlukan dari SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signInAnonymously, 
    signInWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    onSnapshot, 
    query, 
    where, 
    doc, 
    updateDoc, 
    Timestamp,
    writeBatch,
    getDocs,
    setLogLevel,
    deleteDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

// --- KONFIGURASI FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyAQqc9khxreshF4LJVcRtigVqQNd0g-g3g",
  authDomain: "sistempengurusan-aset-ict-sksa.firebaseapp.com",
  projectId: "sistempengurusan-aset-ict-sksa",
  storageBucket: "sistempengurusan-aset-ict-sksa.firebasestorage.app",
  messagingSenderId: "891315232628",
  appId: "1:891315232628:web:ec691478c87cfec0985621",
  measurementId: "G-QKRJ0G00ZN"
};
// -------------------------

// --- UID Admin ---
const ADMIN_EMAILS = [
    'gurubesar@sksa.com', 
    'guruict@gmail.com',
    'guruict@sksa.com' 
];
// -----------------

// Nama Koleksi
const ITEMS_COLLECTION = 'items';
const LOANS_COLLECTION = 'loans';

// (PEMBETULAN HANG) Mulakan semua kod HANYA selepas HTML sedia
window.addEventListener('DOMContentLoaded', () => {
    
    // Mulakan Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const analytics = getAnalytics(app);
    
    // setLogLevel('debug'); // Buka untuk debug

    let currentUser = null;
    let isAdmin = false;
    let synth = null; // Untuk notifikasi bunyi
    let pendingLoanCount = 0; // Untuk notifikasi bunyi
    let allAssetsCache = []; // (BARU) Cache untuk Pengurus Aset

    // --- ELEMEN DOM (UTAMA) ---
    const authContainer = document.getElementById('auth-container');
    const authStatus = document.getElementById('auth-status');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const adminPanel = document.getElementById('admin-panel'); // Panel admin yang asal (tersembunyi)

    // --- ELEMEN DOM (TAB) ---
    const tabNav = document.getElementById('tab-nav');
    const tabContent = document.getElementById('tab-content');
    const permohonanTabButton = tabNav.querySelector('button[data-tab="permohonan"]');
    const asetTabButton = tabNav.querySelector('button[data-tab="aset"]');
    const dipinjamTabButton = tabNav.querySelector('button[data-tab="dipinjam"]');
    const rekodTabButton = tabNav.querySelector('button[data-tab="rekod"]'); 
    const rekodTabPanel = document.getElementById('panel-admin-rekod');
    const pendingBadge = document.getElementById('pending-badge');
    const pendingBadgeMain = document.getElementById('pending-badge-main');

    // --- ELEMEN DOM (SENARAI) ---
    // Senarai Borang
    const formLaptopList = document.getElementById('form-laptop-list');
    const formTabletList = document.getElementById('form-tablet-list');
    const formProjectorList = document.getElementById('form-projector-list');
    const formOthersList = document.getElementById('form-others-list');
    const formLaptopCount = document.getElementById('form-laptop-count');
    const formTabletCount = document.getElementById('form-tablet-count');
    const formProjectorCount = document.getElementById('form-projector-count');
    const formOthersCount = document.getElementById('form-others-count');
    // Senarai Paparan
    const displayLaptopList = document.getElementById('display-laptop-list');
    const displayTabletList = document.getElementById('display-tablet-list');
    const displayProjectorList = document.getElementById('display-projector-list');
    const displayOthersList = document.getElementById('display-others-list');
    const displayLaptopCount = document.getElementById('display-laptop-count');
    const displayTabletCount = document.getElementById('display-tablet-count');
    const displayProjectorCount = document.getElementById('display-projector-count');
    const displayOthersCount = document.getElementById('display-others-count');
    // Senarai Lain
    const borrowedList = document.getElementById('borrowed-list');
    const loansList = document.getElementById('loans-list');
    
    // --- ELEMEN DOM (BORANG PERMOHONAN) ---
    const loanForm = document.getElementById('loan-form');
    const submitButton = document.getElementById('submit-button');
    const submitStatusError = document.getElementById('submit-status-error');
    const teacherNameInput = document.getElementById('teacherName');
    const teacherICInput = document.getElementById('teacherIC');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const purposeInput = document.getElementById('purpose');

    // --- ELEMEN DOM (MODAL) ---
    // Log Masuk
    const loginModal = document.getElementById('login-modal');
    const closeLoginModal = document.getElementById('close-login-modal');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    // Pengesahan
    const confirmModal = document.getElementById('confirm-modal');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmCancel = document.getElementById('confirm-cancel');
    const confirmOk = document.getElementById('confirm-ok');
    // Mesej
    const messageModal = document.getElementById('message-modal');
    const messageTitle = document.getElementById('message-title');
    const messageText = document.getElementById('message-text');
    const messageOk = document.getElementById('message-ok');
    // Edit Pinjaman
    const editLoanModal = document.getElementById('edit-loan-modal');
    const closeEditModal = document.getElementById('close-edit-modal');
    const editLoanForm = document.getElementById('edit-loan-form');
    const editLoanId = document.getElementById('edit-loan-id');
    const editTeacherName = document.getElementById('edit-teacherName');
    const editTeacherIC = document.getElementById('edit-teacherIC');
    const editStartDate = document.getElementById('edit-startDate');
    const editEndDate = document.getElementById('edit-endDate');
    const editPurpose = document.getElementById('edit-purpose');
    const editItemList = document.getElementById('edit-item-list');
    const editLoanError = document.getElementById('edit-loan-error');
    
    // --- ELEMEN DOM (ADMIN PANEL) ---
    const bulkAddForm = document.getElementById('bulk-add-form');
    const bulkAddButton = document.getElementById('bulk-add-button');
    const bulkAddStatus = document.getElementById('bulk-add-status');
    const clearRecordsBtn = document.getElementById('clear-records-btn');
    
    // (BARU) Pengurus Aset
    const openAssetManagerBtn = document.getElementById('open-asset-manager-btn');
    const assetManagerModal = document.getElementById('asset-manager-modal');
    const closeAssetManagerModal = document.getElementById('close-asset-manager-modal');
    const assetFilterInput = document.getElementById('asset-filter');
    const assetManagerList = document.getElementById('asset-manager-list');
    
    // (BARU) Edit Aset
    const editAssetModal = document.getElementById('edit-asset-modal');
    const closeEditAssetModal = document.getElementById('close-edit-asset-modal');
    const editAssetForm = document.getElementById('edit-asset-form');
    const editAssetId = document.getElementById('edit-asset-id');
    const editAssetGroupName = document.getElementById('edit-asset-groupName');
    const editAssetNameTitle = document.getElementById('edit-asset-name-title');
    const editAssetName = document.getElementById('edit-asset-name');
    const editAssetCategory = document.getElementById('edit-asset-category');
    const editAssetImageUrl = document.getElementById('edit-asset-imageUrl');
    const editAssetSpecs = document.getElementById('edit-asset-specs');
    const editAssetSubmit = document.getElementById('edit-asset-submit');
    const copyToGroupBtn = document.getElementById('copy-to-group-btn');
    const editAssetStatus = document.getElementById('edit-asset-status');


    // --- 1. PENGESAHAN (AUTH) & UI UTAMA ---

    /**
     * Pendengar utama untuk status log masuk.
     * Menguruskan UI dan memulakan pendengar pangkalan data.
     */
    onAuthStateChanged(auth, (user) => {
        if (user && !user.isAnonymous && ADMIN_EMAILS.includes(user.email)) {
            // Pengguna ialah ADMIN
            currentUser = user;
            isAdmin = true;
            authStatus.textContent = `Admin: ${user.email.split('@')[0]}`;
            authStatus.className = 'text-sm text-purple-600 font-semibold';
            updateUIVisibility(true);
            listenForData(true);
        } else if (user && user.isAnonymous) {
            // Pengguna ialah GURU (Anonymous)
            currentUser = user;
            isAdmin = false;
            authStatus.textContent = 'Mod Guru';
            authStatus.className = 'text-sm text-gray-600 italic';
            updateUIVisibility(false);
            listenForData(false);
        } else {
            // Pengguna tidak log masuk (keadaan awal)
            signInAnonymously(auth).catch((error) => {
                console.error("Gagal log masuk anonymous: ", error);
                authStatus.textContent = 'Gagal log masuk. Sila muat semula.';
            });
        }
    });

    /**
     * Mengemas kini UI (Tab/Panel) berdasarkan status admin.
     * @param {boolean} admin - Sama ada pengguna ialah admin.
     */
    function updateUIVisibility(admin) {
        if (admin) {
            // Paparan ADMIN
            loginButton.classList.add('hidden');
            logoutButton.classList.remove('hidden');
            permohonanTabButton.classList.add('hidden'); // Sembunyi tab "Permohonan"
            rekodTabButton.classList.remove('hidden'); // Papar tab "Rekod Pinjaman"
            
            // Pindahkan panel admin ke dalam tab "Rekod Pinjaman"
            rekodTabPanel.appendChild(adminPanel);
            adminPanel.classList.remove('hidden');
            
            // Tetapkan tab "Aset Tersedia" sebagai lalai untuk admin
            showTab('aset'); 
        } else {
            // Paparan GURU (Anonymous)
            loginButton.classList.remove('hidden');
            logoutButton.classList.add('hidden');
            permohonanTabButton.classList.remove('hidden'); // Papar tab "Permohonan"
            rekodTabButton.classList.add('hidden'); // Sembunyi tab "Rekod Pinjaman"
            
            // Sembunyikan panel admin (jika ia masih ada)
            adminPanel.classList.add('hidden');
            
            // Tetapkan tab "Permohonan" sebagai lalai untuk guru
            showTab('permohonan');
        }
    }

    /**
     * Memulakan semua pendengar pangkalan data.
     * @param {boolean} admin - Sama ada perlu memuatkan data admin.
     */
    function listenForData(admin) {
        listenForItems(); // Muat senarai aset (untuk semua)
        listenForBorrowedItems(); // Muat senarai dipinjam (untuk semua)
        
        if (admin) {
            listenForLoans(); // Muat rekod pinjaman (admin sahaja)
        }
    }

    // --- 2. LOGIK TAB ---

    /**
     * Menguruskan penukaran tab.
     * @param {string} tabId - ID tab ('permohonan', 'aset', 'dipinjam', 'rekod')
     */
    function showTab(tabId) {
        // Sembunyikan semua panel
        tabContent.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.add('hidden');
        });
        
        // Nyah-aktifkan semua butang tab
        tabNav.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        
        // Paparkan panel yang dipilih
        const panelToShow = document.getElementById(`panel-${tabId}`);
        if (panelToShow) {
            panelToShow.classList.remove('hidden');
        }
        
        // Aktifkan butang tab yang dipilih
        const buttonToActivate = tabNav.querySelector(`button[data-tab="${tabId}"]`);
        if (buttonToActivate) {
            buttonToActivate.classList.add('active');
        }
    }

    // Tambah pendengar klik pada semua butang tab
    tabNav.addEventListener('click', (e) => {
        const tabButton = e.target.closest('.tab-button');
        if (tabButton) {
            e.preventDefault();
            const tabId = tabButton.dataset.tab;
            showTab(tabId);
        }
    });

    // --- 3. FUNGSI PAPARAN ASET (listenForItems) ---

    /**
     * Mendengar perubahan pada koleksi 'items' dan memaparkannya.
     * Ini adalah fungsi yang kompleks kerana ia:
     * 1. Mengisih item ke dalam kategori.
     * 2. Mengumpulkan item (cth: Joi Classmate 1-34) jika 'groupName' wujud.
     * 3. Memaparkan item dalam DUA tab berbeza (Borang Permohonan & Paparan Aset).
     */
    function listenForItems() {
        const q = query(collection(db, ITEMS_COLLECTION));
        
        // Senarai sasaran untuk paparan aset (Tab Permohonan & Tab Paparan)
        const listTargets = {
            form: {
                Laptop: formLaptopList,
                Tablet: formTabletList,
                Projector: formProjectorList,
                Lain: formOthersList,
            },
            display: {
                Laptop: displayLaptopList,
                Tablet: displayTabletList,
                Projector: displayProjectorList,
                Lain: displayOthersList,
            }
        };
        
        // Senarai sasaran untuk kiraan (count) aset
        const countTargets = {
            form: {
                Laptop: formLaptopCount,
                Tablet: formTabletCount,
                Projector: formProjectorCount,
                Lain: formOthersCount,
            },
            display: {
                Laptop: displayLaptopCount,
                Tablet: displayTabletCount,
                Projector: displayProjectorCount,
                Lain: displayOthersCount,
            }
        };

        onSnapshot(q, (snapshot) => {
            // Kosongkan semua senarai
            Object.values(listTargets.form).forEach(list => list.innerHTML = '');
            Object.values(listTargets.display).forEach(list => list.innerHTML = '');

            if (snapshot.empty) {
                const msg = '<p class="text-gray-500 text-sm italic">Tiada aset ditambah dalam sistem.</p>';
                Object.values(listTargets.form).forEach(list => list.innerHTML = msg);
                Object.values(listTargets.display).forEach(list => list.innerHTML = msg);
                return;
            }

            let allItems = [];
            snapshot.forEach((doc) => {
                allItems.push({ id: doc.id, ...doc.data() });
            });
            
            allAssetsCache = [...allItems]; // Simpan cache untuk Pengurus Aset
            
            // Isih (sort) ikut nama
            allItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            // Kumpulkan item mengikut kategori
            const categorizedItems = {
                Laptop: [],
                Tablet: [],
                Projector: [],
                Lain: [] // Untuk fallback
            };

            allItems.forEach(item => {
                const category = item.category || 'Lain';
                if (categorizedItems[category]) {
                    categorizedItems[category].push(item);
                } else {
                    categorizedItems.Lain.push(item);
                }
            });

            // Sekarang, paparkan item dalam kategori masing-masing
            for (const category in categorizedItems) {
                const itemsInCategory = categorizedItems[category];
                const formTargetList = listTargets.form[category];
                const displayTargetList = listTargets.display[category];
                
                if (!formTargetList || !displayTargetList) continue; // Langkau jika tiada sasaran DOM

                // Kumpulkan item dalam kategori ini mengikut 'groupName'
                const groupedAssets = groupAssets(itemsInCategory);

                let availableCount = 0;
                
                if (itemsInCategory.length === 0) {
                    const msg = '<p class="text-gray-500 text-sm italic">Tiada aset dalam kategori ini.</p>';
                    formTargetList.innerHTML = msg;
                    displayTargetList.innerHTML = msg;
                    continue;
                }

                // Paparkan item (berkumpulan atau individu)
                groupedAssets.forEach(group => {
                    const availableItemsInGroup = group.items.filter(i => i.status === 'available');
                    availableCount += availableItemsInGroup.length;
                    
                    if (group.isGroup) {
                        // Papar sebagai KUMPULAN (group)
                        formTargetList.appendChild(renderAssetGroupHTML(group, true)); // Boleh ditanda (checkbox)
                        displayTargetList.appendChild(renderAssetGroupHTML(group, false)); // Paparan sahaja
                    } else {
                        // Papar sebagai INDIVIDU
                        group.items.forEach(item => {
                            if (item.status === 'available') {
                                formTargetList.appendChild(renderAssetItemHTML(item, true)); // Boleh ditanda
                                displayTargetList.appendChild(renderAssetItemHTML(item, false)); // Paparan sahaja
                            }
                        });
                    }
                });

                // Kemas kini kiraan (count) pada badge
                const countBadgeForm = countTargets.form[category];
                const countBadgeDisplay = countTargets.display[category];
                
                if (availableCount > 0) {
                    countBadgeForm.textContent = availableCount;
                    countBadgeForm.classList.remove('hidden');
                    countBadgeDisplay.textContent = availableCount;
                    countBadgeDisplay.classList.remove('hidden');
                } else {
                    countBadgeForm.classList.add('hidden');
                    countBadgeDisplay.classList.add('hidden');
                    const msg = '<p class="text-gray-500 text-sm italic">Tiada aset tersedia dalam kategori ini.</p>';
                    formTargetList.innerHTML = msg;
                    displayTargetList.innerHTML = msg;
                }
            }
            
            // (DIBETULKAN) Tambah event listener untuk toggle butiran (info) aset
            document.querySelectorAll('.asset-info-toggle').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const itemDetails = e.target.closest('.asset-item-details');
                    if (itemDetails) {
                        itemDetails.classList.toggle('open');
                    }
                });
            });

        }, (error) => {
            console.error("Error listening for items: ", error);
            const msg = `<p class="text-red-500">Gagal memuatkan senarai aset. (Ralat: ${error.code})</p>`;
            if (error.code === 'permission-denied') {
                Object.values(listTargets.form).forEach(list => list.innerHTML = '<p class="text-red-500 font-bold">RALAT: Sila semak `firestore.rules` anda.</p>');
                Object.values(listTargets.display).forEach(list => list.innerHTML = '<p class="text-red-500 font-bold">RALAT: Sila semak `firestore.rules` anda.</p>');
            } else {
                Object.values(listTargets.form).forEach(list => list.innerHTML = msg);
                Object.values(listTargets.display).forEach(list => list.innerHTML = msg);
            }
        });
    }

    /**
     * (BARU) Mengisih item ke dalam kumpulan berdasarkan 'groupName'
     * @param {Array} items - Senarai item dalam satu kategori
     * @returns {Array} - Senarai objek { isGroup, groupName, items }
     */
    function groupAssets(items) {
        const grouped = new Map();
        const ungrouped = [];

        items.forEach(item => {
            if (item.groupName) {
                if (!grouped.has(item.groupName)) {
                    grouped.set(item.groupName, []);
                }
                grouped.get(item.groupName).push(item);
            } else {
                ungrouped.push(item);
            }
        });

        const result = [];
        
        // Tambah item berkumpulan
        grouped.forEach((groupItems, groupName) => {
            result.push({
                isGroup: true,
                groupName: groupName,
                items: groupItems
            });
        });

        // Tambah item individu
        ungrouped.forEach(item => {
            result.push({
                isGroup: false,
                groupName: null,
                items: [item] // Letak dalam array untuk konsistensi
            });
        });
        
        return result;
    }

    /**
     * (DIBETULKAN) Memaparkan SATU item individu
     * @param {object} item - Objek aset
     * @param {boolean} includeCheckbox - Sama ada mahu letak checkbox (untuk tab borang)
     * @returns {HTMLElement} - Elemen DOM untuk item
     */
    function renderAssetItemHTML(item, includeCheckbox = false) {
        const itemName = (item.name || 'Aset Rosak');
        const element = document.createElement('div');
        element.className = 'bg-green-50 border border-green-200 rounded-lg asset-item-details';
        
        // Format spesifikasi
        const specsHtml = item.specs 
            ? item.specs.split('\n').map(spec => 
                `<li class="text-xs text-gray-500">${spec}</li>`
              ).join('') 
            : '';
        
        // Format gambar
        const placeholderImg = `https://placehold.co/48x48/e2e8f0/94a3b8?text=${encodeURIComponent(itemName.substring(0, 10))}`;
        const imageSrc = item.imageUrl ? item.imageUrl : placeholderImg;
        
        // (DIBETULKAN) Gambar kini di dalam header
        const imageHtml = `
            <img src="${imageSrc}" alt="${itemName}" 
                 class="w-12 h-12 object-contain rounded-md bg-gray-100 flex-shrink-0" 
                 onerror="this.src='${placeholderImg}'; this.onerror=null;">
        `;
        
        // (DIBETULKAN) Bahagian header utama
        let headerContentHtml = '';
        const checkboxId = `item-${item.id}`;
        
        if (includeCheckbox) {
            // Ini untuk tab "Permohonan"
            headerContentHtml = `
                <label for="${checkboxId}" class="flex items-center space-x-3 p-3 cursor-pointer flex-grow min-w-0" onclick="event.stopPropagation()">
                    <input type="checkbox" id="${checkboxId}" name="selectedItems" value="${item.id}" data-name="${itemName}"
                           class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 asset-checkbox flex-shrink-0">
                    ${imageHtml}
                    <div class="min-w-0">
                        <span class="font-medium text-green-800 break-words">${itemName}</span>
                    </div>
                </label>
            `;
        } else {
            // Ini untuk tab "Aset Tersedia (Paparan Sahaja)"
            headerContentHtml = `
                <div class="flex items-center space-x-3 p-3 flex-grow min-w-0">
                    ${imageHtml}
                    <div class="min-w-0">
                        <span class="font-medium text-green-800 break-words">${itemName}</span>
                    </div>
                </div>
            `;
        }
        
        // (DIBETULKAN) Bahagian butiran (Info)
        const detailsHtml = `
            <div class="asset-details">
                <div class="p-3 border-t border-green-200 bg-gray-50">
                    <h4 class="font-semibold text-sm text-gray-700">Spesifikasi:</h4>
                    ${specsHtml ? `<ul class="list-none mt-1">${specsHtml}</ul>` : '<p class="text-xs text-gray-500 italic">Tiada spesifikasi.</p>'}
                </div>
            </div>
        `;

        // (DIBETULKAN) Butang Info (hanya jika ada spec)
        const infoIconHtml = (item.specs) ? `
            <span class="p-3 text-blue-600">
                <svg class="w-5 h-5 transition-transform duration-200 info-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
            </span>
        ` : '<div class="w-11 p-3"></div>'; // Placeholder

        // (DIBETULKAN) Jadikan keseluruhan <summary> boleh diklik
        element.innerHTML = `
            <div class="flex justify-between items-stretch asset-info-toggle ${(item.specs) ? 'cursor-pointer' : ''}">
                ${headerContentHtml}
                ${infoIconHtml}
            </div>
            ${(item.specs) ? detailsHtml : ''}
        `;
        
        return element;
    }
    
    /**
     * (DIBETULKAN) Memaparkan KUMPULAN item (cth: Joi Classmate 1-34)
     * @param {object} group - Objek kumpulan { groupName, items }
     * @param {boolean} includeCheckbox - Sama ada mahu letak checkbox (untuk tab borang)
     * @returns {HTMLElement} - Elemen DOM untuk kumpulan
     */
    function renderAssetGroupHTML(group, includeCheckbox = false) {
        const element = document.createElement('div');
        element.className = 'border border-gray-200 rounded-lg asset-item-details'; // Guna 'asset-item-details' untuk 'open'
        
        const availableItemsInGroup = group.items.filter(i => i.status === 'available');
        const firstItem = group.items[0]; // Guna item pertama untuk info gambar/spec
        
        // Format spesifikasi
        const specsHtml = firstItem.specs 
            ? firstItem.specs.split('\n').map(spec => 
                `<li class="text-xs text-gray-500">${spec}</li>`
              ).join('') 
            : '';

        // Format gambar
        const placeholderImg = `https://placehold.co/48x48/e2e8f0/94a3b8?text=${encodeURIComponent(group.groupName.substring(0, 10))}`;
        const imageSrc = firstItem.imageUrl ? firstItem.imageUrl : placeholderImg;
        
        // (DIBETULKAN) Gambar kini di dalam header
        const imageHtml = `
            <img src="${imageSrc}" alt="${group.groupName}" 
                 class="w-12 h-12 object-contain rounded-md bg-gray-100 flex-shrink-0" 
                 onerror="this.src='${placeholderImg}'; this.onerror=null;">
        `;

        // Bahagian butiran (Info)
        const detailsHtml = `
            <div class="asset-details">
                <div class="p-3 bg-gray-50 border-t border-gray-200">
                    <div>
                        <h4 class="font-semibold text-sm text-gray-700">Spesifikasi Kumpulan:</h4>
                        ${specsHtml ? `<ul class="list-none mt-1">${specsHtml}</ul>` : '<p class="text-xs text-gray-500 italic">Tiada spesifikasi.</p>'}
                    </div>
                    <h4 class="font-semibold text-sm text-gray-700 mt-4 mb-2">Pilih Item:</h4>
                    <div class="grouped-item-grid p-2 bg-gray-100 rounded-md max-h-48 overflow-y-auto">
                        ${availableItemsInGroup.map(item => {
                            const itemName = (item.name || 'Aset Rosak');
                            const checkboxId = `item-${item.id}`;
                            if (includeCheckbox) {
                                // Ini untuk tab "Permohonan"
                                return `
                                    <label for="${checkboxId}" class="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-200 cursor-pointer">
                                        <input type="checkbox" id="${checkboxId}" name="selectedItems" value="${item.id}" data-name="${itemName}"
                                               class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 asset-checkbox">
                                        <span class="text-sm text-green-800 break-words">${itemName}</span>
                                    </label>
                                `;
                            } else {
                                // Ini untuk tab "Aset Tersedia (Paparan Sahaja)"
                                return `
                                    <div class="flex items-center space-x-2 p-2">
                                        <span class="h-4 w-4"></span> <!-- Placeholder untuk samakan 'alignment' -->
                                        <span class="text-sm text-green-800 break-words">${itemName}</span>
                                    </div>
                                `;
                            }
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
        
        // Bahagian <summary> (Header)
        // (DIBETULKAN) Letak gambar dalam header
        const summaryHtml = `
            <summary class="flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-t-lg cursor-pointer asset-info-toggle">
                <div class="flex items-center space-x-3 min-w-0">
                    ${imageHtml}
                    <div class="min-w-0">
                        <span class="text-lg font-semibold text-gray-800 break-words">${group.groupName}</span>
                    </div>
                    <span class="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-green-100 bg-green-600 rounded-full flex-shrink-0">${availableItemsInGroup.length} Tersedia</span>
                </div>
                <svg class="w-5 h-5 text-gray-600 transition-transform duration-200 info-icon ml-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
            </summary>
        `;

        element.innerHTML = summaryHtml + detailsHtml;
        return element;
    }


    // --- 4. FUNGSI PAPARAN PINJAMAN (Public) ---

    /**
     * Mendengar perubahan pada koleksi 'loans' untuk paparan awam.
     * Memaparkan SEMUA item yang sedang 'approved'.
     */
    function listenForBorrowedItems() {
        const q = query(collection(db, LOANS_COLLECTION)); // Ambil semua
        
        onSnapshot(q, (snapshot) => {
            borrowedList.innerHTML = '';
            
            if (snapshot.empty) {
                borrowedList.innerHTML = '<p class="text-gray-500 text-sm italic col-span-full">Tiada aset sedang dipinjam.</p>';
                return;
            }

            let borrowedDisplayItems = [];
            
            snapshot.forEach((doc) => {
                const loan = doc.data();
                
                // (PEMBETULAN) Boleh baca format lama (satu item) & baru (pukal)
                if (loan.status === 'approved') {
                    const itemsToDisplay = loan.items || (loan.itemName ? [{ id: loan.itemId, name: loan.itemName }] : []);
                    
                    itemsToDisplay.forEach(item => {
                        borrowedDisplayItems.push({
                            itemName: (item.name || 'Aset Rosak'),
                            teacherName: loan.teacherName,
                            endDate: loan.endDate,
                            approvedBy: loan.approvedBy
                        });
                    });
                }
            });

            if (borrowedDisplayItems.length === 0) {
                borrowedList.innerHTML = '<p class="text-gray-500 text-sm italic col-span-full">Tiada aset sedang dipinjam.</p>';
                return;
            }
            
            // Isih (sort) ikut tarikh pulang terdekat
            borrowedDisplayItems.sort((a, b) => (a.endDate?.toMillis() || 0) - (b.endDate?.toMillis() || 0));

            borrowedDisplayItems.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'p-4 bg-red-50 border border-red-200 rounded-lg flex flex-col justify-between h-full shadow';
                
                const countdownHtml = calculateCountdown(item.endDate);
                
                itemElement.innerHTML = `
                    <div>
                        <p class="font-semibold text-red-800">${item.itemName}</p>
                        <p class="text-sm text-gray-700">Peminjam: ${item.teacherName}</p>
                        <p class="text-sm text-gray-700">Pulang: ${formatDate(item.endDate)}</p>
                        <p class="text-sm text-gray-500 italic">Lulus oleh: ${item.approvedBy || 'N/A'}</p>
                    </div>
                    <div class="mt-3 text-center border-t border-red-200 pt-3">
                        ${countdownHtml}
                    </div>
                `;
                borrowedList.appendChild(itemElement);
            });

        }, (error) => {
            console.error("Error listening for borrowed items: ", error);
            borrowedList.innerHTML = `<p class="text-red-500">Gagal memuatkan senarai. (Ralat: ${error.code})</p>`;
        });
    }

    // --- 5. FUNGSI BORANG PERMOHONAN ---

    /**
     * Menetapkan tarikh minimum untuk input tarikh.
     */
    function setMinDates() {
        const today = new Date().toISOString().split('T')[0];
        startDateInput.setAttribute('min', today);
        endDateInput.setAttribute('min', today);
    }

    // Pastikan tarikh pulang tidak lebih awal dari tarikh pinjam
    startDateInput.addEventListener('change', () => {
        if (endDateInput.value && endDateInput.value < startDateInput.value) {
            endDateInput.value = startDateInput.value;
        }
        endDateInput.setAttribute('min', startDateInput.value || new Date().toISOString().split('T')[0]);
    });

    /**
     * Mengendalikan penghantaran borang permohonan.
     */
    async function handleFormSubmit(e) {
        e.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = 'Memproses...';
        submitStatusError.textContent = '';
        
        // 1. Kumpul semua item yang ditanda (checked)
        const selectedCheckboxes = document.querySelectorAll('input[name="selectedItems"]:checked');
        
        if (selectedCheckboxes.length === 0) {
            submitStatusError.textContent = 'Ralat: Sila pilih sekurang-kurangnya satu aset untuk dipinjam.';
            submitButton.disabled = false;
            submitButton.textContent = 'Hantar Permohonan';
            return;
        }
        
        // 2. Kumpul data borang
        const formData = {
            teacherName: teacherNameInput.value,
            teacherIC: teacherICInput.value,
            startDate: Timestamp.fromDate(new Date(startDateInput.value + 'T00:00:00')), // Set ke permulaan hari
            endDate: Timestamp.fromDate(new Date(endDateInput.value + 'T00:00:00')),
            purpose: purposeInput.value,
            status: 'pending',
            requestedAt: Timestamp.now(),
            approvedBy: null
        };
        
        // 3. (BARU) Kumpul item ke dalam array
        let selectedItemsArray = [];
        let itemNamesListHtml = ''; // Untuk modal mesej
        
        selectedCheckboxes.forEach(cb => {
            const itemName = (cb.dataset.name || 'Aset Rosak');
            selectedItemsArray.push({
                id: cb.value,
                name: itemName
            });
            itemNamesListHtml += `<li>${itemName}</li>`;
        });
        
        // 4. Cipta SATU dokumen pinjaman dengan senarai item
        try {
            await addDoc(collection(db, LOANS_COLLECTION), {
                ...formData,
                items: selectedItemsArray // Simpan sebagai array
            });
            
            // Berjaya
            loanForm.reset();
            setMinDates();
            // Kosongkan semua checkbox
            selectedCheckboxes.forEach(cb => cb.checked = false);
            
            // Papar modal kejayaan
            const message = `
                <p class="mb-3">Permohonan anda sedang diproses. Sila tunggu kelulusan.</p>
                <p class="font-semibold mb-2">Aset Dipohon:</p>
                <ul class="list-disc list-inside text-left text-sm">${itemNamesListHtml}</ul>
            `;
            showMessage('Permohonan Dihantar', message);
            
        } catch (error) {
            console.error("Error adding loan document: ", error);
            submitStatusError.textContent = `Gagal menghantar permohonan: ${error.message}`;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Hantar Permohonan';
        }
    }

    // --- 6. FUNGSI PANEL ADMIN ---

    /**
     * Mendengar perubahan pada koleksi 'loans' untuk panel admin.
     * Memaparkan SEMUA rekod (pending, approved, dll.).
     */
    function listenForLoans() {
        const q = query(collection(db, LOANS_COLLECTION));
        
        onSnapshot(q, (snapshot) => {
            loansList.innerHTML = ''; // Kosongkan jadual
            
            if (snapshot.empty) {
                loansList.innerHTML = '<tr><td colspan="8" class="px-6 py-4 text-center text-gray-500 italic">Tiada rekod permohonan.</td></tr>';
                return;
            }

            let allLoans = [];
            snapshot.forEach((doc) => {
                allLoans.push({ id: doc.id, ...doc.data() });
            });

            // Isih (sort) ikut tarikh permohonan (terbaru di atas)
            allLoans.sort((a, b) => (b.requestedAt?.toMillis() || 0) - (a.requestedAt?.toMillis() || 0));

            let newPendingCount = 0;
            
            allLoans.forEach(loan => {
                const tr = document.createElement('tr');
                tr.className = loan.status === 'pending' ? 'bg-yellow-50' : (loan.status === 'approved' ? 'bg-green-50' : 'bg-gray-50');
                
                // Kira permohonan "pending"
                if (loan.status === 'pending') {
                    newPendingCount++;
                }
                
                // (BARU) Papar senarai item (jika pukal) atau item tunggal
                const itemsToDisplay = loan.items || (loan.itemName ? [{ id: loan.itemId, name: loan.itemName }] : []);
                const itemsHtml = itemsToDisplay.length > 1
                    ? `<ol class="list-decimal list-inside">${itemsToDisplay.map(i => `<li>${(i.name || 'Aset Rosak')}</li>`).join('')}</ol>`
                    : (itemsToDisplay[0]?.name || 'Aset Rosak');

                // Tentukan status dan warna
                let statusHtml = '';
                switch (loan.status) {
                    case 'pending':
                        statusHtml = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Menunggu</span>';
                        break;
                    case 'approved':
                        statusHtml = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Diluluskan</span>
                                    <span class="text-xs text-gray-500 italic block">Oleh: ${loan.approvedBy || 'N/A'}</span>`;
                        break;
                    case 'rejected':
                        statusHtml = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Ditolak</span>';
                        break;
                    case 'completed':
                        statusHtml = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Selesai</span>';
                        break;
                    default:
                        statusHtml = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">${loan.status}</span>`;
                }
                
                // (BARU) Data untuk butang
                const loanData = encodeURIComponent(JSON.stringify(loan));

                // Butang Tindakan
                let actionButtons = '';
                if (loan.status === 'pending') {
                    actionButtons = `
                        <button data-loan-id="${loan.id}" data-action="approve" data-loan='${loanData}'
                                class="action-btn bg-green-500 hover:bg-green-600 text-white text-xs font-semibold py-1 px-2 rounded">Lulus</button>
                        <button data-loan-id="${loan.id}" data-action="reject" data-loan='${loanData}'
                                class="action-btn bg-red-500 hover:bg-red-600 text-white text-xs font-semibold py-1 px-2 rounded">Tolak</button>
                    `;
                } else if (loan.status === 'approved') {
                    actionButtons = `
                        <button data-loan-id="${loan.id}" data-action="return" data-loan='${loanData}'
                                class="action-btn bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold py-1 px-2 rounded">Pulang</button>
                    `;
                } else {
                    actionButtons = 'Tiada';
                }

                tr.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-y-1">
                        ${actionButtons}
                        <hr class="my-1">
                        <button data-loan-id="${loan.id}" data-action="edit" data-loan='${loanData}'
                                class="action-btn bg-gray-400 hover:bg-gray-500 text-white text-xs font-semibold py-1 px-2 rounded">Edit</button>
                        <button data-loan-id="${loan.id}" data-action="delete" data-loan='${loanData}'
                                class="action-btn bg-red-700 hover:bg-red-800 text-white text-xs font-semibold py-1 px-2 rounded">Padam</button>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-700">${loan.teacherName || 'N/A'}</td>
                    <td class="px-6 py-4 text-sm text-gray-700">${loan.teacherIC || 'N/A'}</td>
                    <td class="px-6 py-4 text-sm text-gray-700">${itemsHtml}</td>
                    <td class="px-6 py-4 text-sm text-gray-700">${formatDate(loan.startDate)}</td>
                    <td class="px-6 py-4 text-sm text-gray-700">${formatDate(loan.endDate)}</td>
                    <td class="px-6 py-4 text-sm text-gray-700 max-w-xs whitespace-normal">${loan.purpose}</td>
                    <td class="px-6 py-4 text-sm text-gray-700">${statusHtml}</td>
                `;
                loansList.appendChild(tr);
            });
            
            // Kemas kini badge notifikasi
            if (newPendingCount > 0) {
                pendingBadge.textContent = newPendingCount;
                pendingBadge.classList.remove('hidden');
                pendingBadgeMain.textContent = newPendingCount;
                pendingBadgeMain.classList.remove('hidden');
                
                // Mainkan bunyi jika kiraan bertambah
                if (newPendingCount > pendingLoanCount) {
                    playNotificationSound();
                }
            } else {
                pendingBadge.classList.add('hidden');
                pendingBadgeMain.classList.add('hidden');
            }
            pendingLoanCount = newPendingCount; // Simpan kiraan semasa

        }, (error) => {
            console.error("Error listening for loans: ", error);
            loansList.innerHTML = `<tr><td colspan="8" class="px-6 py-4 text-red-500">Gagal memuatkan rekod. (Ralat: ${error.code})</td></tr>`;
        });
    }

    /**
     * Menambah pendengar klik untuk semua butang tindakan admin (Lulus, Tolak, Edit, dll.)
     */
    function addAdminButtonListeners() {
        loansList.addEventListener('click', (e) => {
            const button = e.target.closest('.action-btn');
            if (!button) return;

            const loanId = button.dataset.loanId;
            const action = button.dataset.action;
            const loan = JSON.parse(decodeURIComponent(button.dataset.loan));
            
            // Tukar tarikh (string) dari JSON kembali ke objek Timestamp (jika wujud)
            if (loan.startDate) loan.startDate = new Timestamp(loan.startDate.seconds, loan.startDate.nanoseconds);
            if (loan.endDate) loan.endDate = new Timestamp(loan.endDate.seconds, loan.endDate.nanoseconds);
            if (loan.requestedAt) loan.requestedAt = new Timestamp(loan.requestedAt.seconds, loan.requestedAt.nanoseconds);

            switch (action) {
                case 'approve':
                    confirmAction(
                        'Luluskan Permohonan?',
                        `Anda pasti mahu meluluskan permohonan ini? Tindakan ini akan menukar status ${loan.items.length} aset kepada "dipinjam".`,
                        'Luluskan',
                        'green',
                        () => handleApproveLoan(loan)
                    );
                    break;
                case 'reject':
                    confirmAction(
                        'Tolak Permohonan?',
                        'Anda pasti mahu menolak permohonan ini?',
                        'Tolak',
                        'red',
                        () => handleRejectLoan(loan.id)
                    );
                    break;
                case 'return':
                    confirmAction(
                        'Sahkan Pemulangan?',
                        `Anda pasti mahu menandakan permohonan ini sebagai "Selesai"? Tindakan ini akan menukar status ${loan.items.length} aset kembali kepada "tersedia".`,
                        'Sahkan Pulang',
                        'blue',
                        () => handleReturnLoan(loan)
                    );
                    break;
                case 'edit':
                    handleEditLoan(loan);
                    break;
                case 'delete':
                    confirmAction(
                        'Padam Rekod?',
                        `Anda pasti mahu memadam rekod ini? Jika aset sedang dipinjam, status aset akan DITETAPKAN SEMULA kepada "tersedia".`,
                        'Padam',
                        'red',
                        () => handleDeleteLoan(loan)
                    );
                    break;
            }
        });
    }

    /**
     * (DIKEMAS KINI) Mengendalikan kelulusan (termasuk pukal).
     */
    async function handleApproveLoan(loan) {
        const batch = writeBatch(db);
        
        // 1. Kemas kini dokumen pinjaman
        const loanRef = doc(db, LOANS_COLLECTION, loan.id);
        batch.update(loanRef, { 
            status: 'approved',
            approvedBy: currentUser.email // Simpan siapa yang luluskan
        });
        
        // 2. Kemas kini setiap item dalam senarai
        loan.items.forEach(item => {
            const itemRef = doc(db, ITEMS_COLLECTION, item.id);
            batch.update(itemRef, { status: 'borrowed' });
        });
        
        try {
            await batch.commit();
            showMessage('Berjaya', 'Permohonan telah diluluskan.');
        } catch (error) {
            console.error("Error approving loan: ", error);
            showMessage('Ralat', `Gagal meluluskan permohonan: ${error.message}`, 'red');
        }
    }

    /**
     * Mengendalikan penolakan permohonan.
     */
    async function handleRejectLoan(loanId) {
        const loanRef = doc(db, LOANS_COLLECTION, loanId);
        try {
            await updateDoc(loanRef, { status: 'rejected' });
            showMessage('Berjaya', 'Permohonan telah ditolak.');
        } catch (error) {
            console.error("Error rejecting loan: ", error);
            showMessage('Ralat', `Gagal menolak permohonan: ${error.message}`, 'red');
        }
    }

    /**
     * (DIKEMAS KINI) Mengendalikan pemulangan (termasuk pukal).
     */
    async function handleReturnLoan(loan) {
        const batch = writeBatch(db);
        
        // 1. Kemas kini dokumen pinjaman
        const loanRef = doc(db, LOANS_COLLECTION, loan.id);
        batch.update(loanRef, { status: 'completed' });
        
        // 2. Kemas kini setiap item dalam senarai
        loan.items.forEach(item => {
            const itemRef = doc(db, ITEMS_COLLECTION, item.id);
            batch.update(itemRef, { status: 'available' });
        });
        
        try {
            await batch.commit();
            showMessage('Berjaya', 'Aset telah dipulangkan dan ditanda selesai.');
        } catch (error) {
            console.error("Error returning loan: ", error);
            showMessage('Ralat', `Gagal mengemas kini status: ${error.message}`, 'red');
        }
    }

    /**
     * (BARU) Mengendalikan pemadaman rekod.
     */
    async function handleDeleteLoan(loan) {
        const batch = writeBatch(db);
        
        // 1. Padam dokumen pinjaman
        const loanRef = doc(db, LOANS_COLLECTION, loan.id);
        batch.delete(loanRef);
        
        // 2. Jika status "approved", pulangkan item
        if (loan.status === 'approved') {
            loan.items.forEach(item => {
                const itemRef = doc(db, ITEMS_COLLECTION, item.id);
                batch.update(itemRef, { status: 'available' });
            });
        }
        
        try {
            await batch.commit();
            showMessage('Berjaya', 'Rekod pinjaman telah dipadamkan.');
        } catch (error) {
            console.error("Error deleting loan: ", error);
            showMessage('Ralat', `Gagal memadam rekod: ${error.message}`, 'red');
        }
    }

    /**
     * (BARU) Mengendalikan pembukaan modal "Edit Pinjaman".
     */
    function handleEditLoan(loan) {
        editLoanId.value = loan.id;
        editTeacherName.value = loan.teacherName || '';
        editTeacherIC.value = loan.teacherIC || '';
        editPurpose.value = loan.purpose || '';
        
        // Tukar Timestamp ke format YYYY-MM-DD
        editStartDate.value = loan.startDate ? loan.startDate.toDate().toISOString().split('T')[0] : '';
        editEndDate.value = loan.endDate ? loan.endDate.toDate().toISOString().split('T')[0] : '';
        
        // Papar senarai item (tidak boleh diedit)
        const itemsToDisplay = loan.items || (loan.itemName ? [{ id: loan.itemId, name: loan.itemName }] : []);
        editItemList.innerHTML = itemsToDisplay.map(i => `<li>${(i.name || 'Aset Rosak')}</li>`).join('');
        
        editLoanError.textContent = '';
        editLoanModal.classList.remove('hidden');
    }
    
    // Simpan perubahan dari modal "Edit Pinjaman"
    editLoanForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loanId = editLoanId.value;
        if (!loanId) return;

        const updatedData = {
            teacherName: editTeacherName.value,
            teacherIC: editTeacherIC.value,
            purpose: editPurpose.value,
            startDate: Timestamp.fromDate(new Date(editStartDate.value + 'T00:00:00')),
            endDate: Timestamp.fromDate(new Date(editEndDate.value + 'T00:00:00'))
        };

        try {
            const loanRef = doc(db, LOANS_COLLECTION, loanId);
            await updateDoc(loanRef, updatedData);
            editLoanModal.classList.add('hidden');
            showMessage('Berjaya', 'Maklumat pinjaman telah dikemas kini.');
        } catch (error) {
            console.error("Error updating loan: ", error);
            editLoanError.textContent = `Gagal mengemas kini: ${error.message}`;
        }
    });

    /**
     * Mengendalikan borang "Tambah Aset Pukal".
     */
    bulkAddForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        bulkAddButton.disabled = true;
        bulkAddButton.textContent = 'Memproses...';
        bulkAddStatus.textContent = '';

        const baseName = document.getElementById('baseName').value;
        const groupName = document.getElementById('groupName').value; // (BARU) Ambil groupName
        const quantity = parseInt(document.getElementById('quantity').value, 10);
        const category = document.getElementById('category').value;

        if (quantity > 100) { // Had keselamatan
            bulkAddStatus.textContent = 'Ralat: Jumlah tidak boleh melebihi 100 sekaligus.';
            bulkAddButton.disabled = false;
            bulkAddButton.textContent = 'Tambah Aset';
            return;
        }

        const batch = writeBatch(db);
        const itemsRef = collection(db, ITEMS_COLLECTION);
        
        for (let i = 1; i <= quantity; i++) {
            const newItemRef = doc(itemsRef); // Cipta rujukan baru
            const newItemData = {
                name: `${baseName} ${i}`,
                category: category,
                status: 'available',
                groupName: groupName || null, // (BARU) Simpan groupName
                imageUrl: null,
                specs: null
            };
            batch.set(newItemRef, newItemData);
        }

        try {
            await batch.commit();
            bulkAddStatus.textContent = `Berjaya! ${quantity} aset telah ditambah.`;
            bulkAddStatus.className = 'text-sm mt-2 text-green-600';
            bulkAddForm.reset();
        } catch (error) {
            console.error("Error adding bulk items: ", error);
            bulkAddStatus.textContent = `Gagal: ${error.message}`;
            bulkAddStatus.className = 'text-sm mt-2 text-red-600';
        } finally {
            bulkAddButton.disabled = false;
            bulkAddButton.textContent = 'Tambah Aset';
        }
    });

    /**
     * Mengendalikan butang "Kosongkan Rekod Lama".
     */
    clearRecordsBtn.addEventListener('click', () => {
        confirmAction(
            'Kosongkan Rekod Lama?',
            'Anda pasti mahu memadam semua rekod yang berstatus "Selesai" dan "Ditolak"? Tindakan ini tidak boleh diundur.',
            'Padam Rekod Lama',
            'red',
            async () => {
                const q = query(collection(db, LOANS_COLLECTION), where('status', 'in', ['completed', 'rejected']));
                try {
                    const querySnapshot = await getDocs(q);
                    if (querySnapshot.empty) {
                        showMessage('Tiada Rekod', 'Tiada rekod lama untuk dipadamkan.');
                        return;
                    }
                    
                    const batch = writeBatch(db);
                    querySnapshot.forEach((doc) => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                    showMessage('Berjaya', `Rekod lama (${querySnapshot.size}) telah berjaya dipadamkan.`);
                } catch (error) {
                    console.error("Error clearing old records: ", error);
                    showMessage('Ralat', `Gagal memadam rekod lama: ${error.message}`, 'red');
                }
            }
        );
    });
    
    // --- 7. (BARU) FUNGSI PENGURUS ASET ---
    
    // Buka Modal Pengurus Aset
    openAssetManagerBtn.addEventListener('click', () => {
        renderAssetManagerList(); // Muat senarai aset (dari cache)
        assetManagerModal.classList.remove('hidden');
    });
    
    // Tutup Modal Pengurus Aset
    closeAssetManagerModal.addEventListener('click', () => {
        assetManagerModal.classList.add('hidden');
    });
    
    // Tapis (Filter) senarai aset dalam modal
    assetFilterInput.addEventListener('input', (e) => {
        renderAssetManagerList(e.target.value.toLowerCase());
    });

    /**
     * Memaparkan senarai aset di dalam Modal Pengurus Aset (berdasarkan cache).
     * @param {string} filter - Teks untuk menapis senarai.
     */
    function renderAssetManagerList(filter = '') {
        assetManagerList.innerHTML = '';
        
        const filteredAssets = allAssetsCache.filter(asset => 
            asset.name && asset.name.toLowerCase().includes(filter)
        );
        
        if (filteredAssets.length === 0) {
            assetManagerList.innerHTML = '<p class="text-gray-500 text-sm italic p-4">Tiada aset ditemui.</p>';
            return;
        }

        filteredAssets.forEach(asset => {
            const itemElement = document.createElement('div');
            itemElement.className = 'flex justify-between items-center p-3 bg-white hover:bg-gray-50 border-b border-gray-100';
            
            // Data untuk butang edit
            const assetData = encodeURIComponent(JSON.stringify(asset));
            
            itemElement.innerHTML = `
                <div>
                    <p class="font-medium text-gray-800">${asset.name}</p>
                    <p class="text-sm text-gray-500">${asset.category || 'N/A'} ${asset.groupName ? `(${asset.groupName})` : ''}</p>
                </div>
                <button data-asset='${assetData}'
                        class="edit-asset-btn bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-1 px-3 rounded-md shadow-sm">
                    Edit
                </button>
            `;
            assetManagerList.appendChild(itemElement);
        });
    }

    // Pendengar untuk butang "Edit" di dalam Pengurus Aset
    assetManagerList.addEventListener('click', (e) => {
        const editButton = e.target.closest('.edit-asset-btn');
        if (editButton) {
            const asset = JSON.parse(decodeURIComponent(editButton.dataset.asset));
            openEditAssetModal(asset);
        }
    });

    /**
     * Membuka modal "Edit Aset" dan mengisi data.
     */
    function openEditAssetModal(asset) {
        editAssetId.value = asset.id;
        editAssetNameTitle.textContent = asset.name;
        editAssetName.value = asset.name || '';
        editAssetCategory.value = asset.category || 'Lain';
        editAssetImageUrl.value = asset.imageUrl || '';
        editAssetSpecs.value = asset.specs || '';
        editAssetGroupName.value = asset.groupName || ''; // Simpan groupName (tersembunyi)
        
        editAssetStatus.textContent = '';
        
        // Paparkan butang "Salin ke Kumpulan" hanya jika item ini mempunyai groupName
        if (asset.groupName) {
            copyToGroupBtn.textContent = `Salin Gambar & Spec ke Kumpulan (${asset.groupName})`;
            copyToGroupBtn.classList.remove('hidden');
        } else {
            copyToGroupBtn.classList.add('hidden');
        }
        
        editAssetModal.classList.remove('hidden');
    }
    
    // Tutup Modal Edit Aset
    closeEditAssetModal.addEventListener('click', () => {
        editAssetModal.classList.add('hidden');
    });
    
    // Simpan perubahan dari modal "Edit Aset"
    editAssetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        editAssetSubmit.disabled = true;
        editAssetSubmit.textContent = 'Menyimpan...';
        editAssetStatus.textContent = '';
        
        const assetId = editAssetId.value;
        const updatedData = {
            name: editAssetName.value,
            category: editAssetCategory.value,
            imageUrl: editAssetImageUrl.value || null,
            specs: editAssetSpecs.value || null
            // groupName tidak diubah di sini, hanya di "Tambah Pukal"
        };
        
        try {
            const assetRef = doc(db, ITEMS_COLLECTION, assetId);
            await updateDoc(assetRef, updatedData);
            editAssetStatus.textContent = 'Berjaya disimpan!';
            editAssetStatus.className = 'text-sm mt-2 text-green-600';
            
            // Kemas kini nama pada tajuk modal (jika berubah)
            editAssetNameTitle.textContent = updatedData.name;
            
            // Muat semula cache (selepas 1 saat)
            setTimeout(() => {
                editAssetModal.classList.add('hidden');
                // Kita tidak perlu muat semula cache secara manual kerana onSnapshot akan melakukannya.
            }, 1000);
            
        } catch (error) {
            console.error("Error updating asset: ", error);
            editAssetStatus.textContent = `Gagal: ${error.message}`;
            editAssetStatus.className = 'text-sm mt-2 text-red-600';
        } finally {
            editAssetSubmit.disabled = false;
            editAssetSubmit.textContent = 'Simpan Maklumat Aset';
        }
    });
    
    // (BARU) Kendalikan butang "Salin ke Kumpulan"
    copyToGroupBtn.addEventListener('click', () => {
        const groupName = editAssetGroupName.value;
        const imageUrl = editAssetImageUrl.value || null;
        const specs = editAssetSpecs.value || null;
        
        if (!groupName) return;
        
        confirmAction(
            'Salin Maklumat ke Kumpulan?',
            `Anda pasti mahu menyalin gambar dan spesifikasi ini ke SEMUA aset lain dalam kumpulan "${groupName}"?`,
            'Ya, Salin',
            'green',
            async () => {
                // Tunjukkan status pada modal edit
                editAssetStatus.textContent = 'Menyalin ke kumpulan...';
                editAssetStatus.className = 'text-sm mt-2 text-yellow-600';

                // Cari semua item dalam kumpulan ini
                const q = query(collection(db, ITEMS_COLLECTION), where("groupName", "==", groupName));
                
                try {
                    const querySnapshot = await getDocs(q);
                    const batch = writeBatch(db);
                    
                    querySnapshot.forEach((doc) => {
                        // Kemas kini setiap item dalam kumpulan
                        batch.update(doc.ref, {
                            imageUrl: imageUrl,
                            specs: specs
                        });
                    });
                    
                    await batch.commit();
                    editAssetStatus.textContent = `Berjaya! Maklumat telah disalin ke ${querySnapshot.size} aset.`;
                    editAssetStatus.className = 'text-sm mt-2 text-green-600';
                    
                    setTimeout(() => {
                        editAssetModal.classList.add('hidden');
                    }, 2000);
                    
                } catch (error) {
                    console.error("Error copying to group: ", error);
                    editAssetStatus.textContent = `Gagal menyalin: ${error.message}`;
                    editAssetStatus.className = 'text-sm mt-2 text-red-600';
                }
            }
        );
    });
    

    // --- 8. FUNGSI UTILITI (MODAL, TARIKH, BUNYI) ---

    /**
     * Memaparkan modal pengesahan (confirm).
     * @param {string} title - Tajuk modal.
     * @param {string} message - Mesej pengesahan.
     * @param {string} okText - Teks untuk butang OK.
     * @param {string} color - Warna butang OK (cth: 'red', 'green', 'blue').
     * @param {function} onOk - Fungsi yang akan dijalankan jika OK diklik.
     */
    function confirmAction(title, message, okText, color = 'red', onOk) {
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        confirmOk.textContent = okText;
        
        // Tetapkan warna butang
        const colors = {
            red: 'bg-red-600 hover:bg-red-700',
            green: 'bg-green-600 hover:bg-green-700',
            blue: 'bg-blue-600 hover:bg-blue-700',
        };
        confirmOk.className = `font-semibold py-2 px-4 rounded-lg text-white ${colors[color] || colors.red}`;
        
        confirmModal.classList.remove('hidden');
        
        // Cipta klon untuk mengalih keluar pendengar lama
        const newConfirmOk = confirmOk.cloneNode(true);
        confirmOk.parentNode.replaceChild(newConfirmOk, confirmOk);
        confirmOk = newConfirmOk; // Rujuk semula elemen baharu

        // Pendengar untuk butang OK
        newConfirmOk.onclick = () => {
            confirmModal.classList.add('hidden');
            if (onOk) onOk();
        };
    }
    
    // Tutup modal pengesahan
    confirmCancel.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
    });

    /**
     * Memaparkan modal mesej (alert).
     * @param {string} title - Tajuk modal.
     * @param {string} message - Mesej (HTML dibenarkan).
     * @param {string} color - Warna tajuk (cth: 'red', 'green').
     */
    function showMessage(title, message, color = 'blue') {
        messageTitle.textContent = title;
        messageText.innerHTML = message; // Guna innerHTML untuk senarai
        
        const colors = {
            red: 'text-red-600',
            green: 'text-green-600',
            blue: 'text-blue-600',
        };
        messageTitle.className = `text-lg font-medium ${colors[color] || colors.blue}`;
        
        messageModal.classList.remove('hidden');
    }
    
    // Tutup modal mesej
    messageOk.addEventListener('click', () => {
        messageModal.classList.add('hidden');
    });

    /**
     * Memformat Timestamp Firestore ke string (cth: 30 Okt 2025).
     * @param {Timestamp} timestamp - Objek Timestamp Firestore.
     * @returns {string} - Tarikh yang diformat.
     */
    function formatDate(timestamp) {
        if (!timestamp || typeof timestamp.toDate !== 'function') {
            return 'Tiada Tarikh';
        }
        try {
            const date = timestamp.toDate();
            return date.toLocaleDateString('ms-MY', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            console.warn("Ralat format tarikh: ", e, timestamp);
            return 'Tarikh Rosak';
        }
    }

    /**
     * Mengira baki hari untuk pemulangan.
     * @param {Timestamp} endDate - Tarikh pemulangan dari Firestore.
     * @returns {string} - HTML string untuk countdown.
     */
    function calculateCountdown(endDate) {
        if (!endDate || typeof endDate.toDate !== 'function') {
            return '<span class="text-lg font-bold text-gray-500">Tiada tarikh</span>';
        }
        
        const now = new Date();
        const returnDate = endDate.toDate();
        
        // Set kedua-dua tarikh ke tengah malam untuk perbandingan hari yang tepat
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const returnDay = new Date(returnDate.getFullYear(), returnDate.getMonth(), returnDate.getDate());

        const diffTime = returnDay.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return `<span class="text-2xl font-bold text-red-600">${Math.abs(diffDays)} HARI TERLEWAT</span>`;
        } else if (diffDays === 0) {
            return `<span class="text-2xl font-bold text-yellow-600">TAMAT HARI INI</span>`;
        } else if (diffDays === 1) {
            return `<span class="text-2xl font-bold text-blue-600">1 HARI LAGI</span>`;
        } else {
            return `<span class="text-2xl font-bold text-blue-600">${diffDays} HARI LAGI</span>`;
        }
    }

    /**
     * Memainkan bunyi notifikasi "bip" ringkas.
     */
    function playNotificationSound() {
        // Cipta synth hanya sekali
        if (!synth) {
            synth = new Tone.Synth().toDestination();
        }
        
        // Pastikan audio dimulakan (diperlukan oleh pelayar)
        Tone.start().then(() => {
            // Mainkan not C5 untuk 0.1 saat
            synth.triggerAttackRelease("C5", "8n");
        }).catch(e => {
            console.warn("Gagal memulakan audio:", e);
        });
    }

    // --- 9. FUNGSI LOG MASUK / LOG KELUAR ---

    // Buka Modal Log Masuk
    loginButton.addEventListener('click', () => {
        loginModal.classList.remove('hidden');
        loginError.textContent = '';
        loginForm.reset();
    });

    // Tutup Modal Log Masuk
    closeLoginModal.addEventListener('click', () => {
        loginModal.classList.add('hidden');
    });

    // Kendalikan penghantaran borang log masuk
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;
        loginError.textContent = '';
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged akan mengendalikan selebihnya
            loginModal.classList.add('hidden');
        } catch (error) {
            console.error("Gagal log masuk: ", error.code);
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                loginError.textContent = 'E-mel atau kata laluan salah.';
            } else {
                loginError.textContent = `Ralat: ${error.message}`;
            }
        }
    });

    // Kendalikan Log Keluar
    logoutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            // Log masuk semula sebagai anonymous (penting!)
            await signInAnonymously(auth);
            // onAuthStateChanged akan mengendalikan kemas kini UI
        } catch (error) {
            console.error("Ralat log keluar: ", error);
        }
    });
    
    // --- 10. PENUTUP MODAL & FUNGSI MULA ---
    
    // Tutup modal edit pinjaman
    closeEditModal.addEventListener('click', () => {
        editLoanModal.classList.add('hidden');
    });

    // Pendengar klik umum untuk menutup modal (klik di luar)
    [loginModal, confirmModal, messageModal, editLoanModal, assetManagerModal, editAssetModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                // Tutup jika klik pada latar belakang (div paling luar)
                if (e.target === modal) {
                    // Modal khas tidak boleh ditutup dengan klik luar
                    if (modal !== confirmModal && modal !== messageModal) {
                         modal.classList.add('hidden');
                    }
                }
            });
        }
    });

    // Mulakan pendengar butang admin
    addAdminButtonListeners();
    // Tetapkan tarikh minimum pada borang
    setMinDates();
    // Mulakan borang permohonan
    loanForm.addEventListener('submit', handleFormSubmit);

}); // <-- Kurungan penutup untuk DOMContentLoaded

};
// -------------------------

// --- UID Admin ---
const ADMIN_EMAILS = [
    'gurubesar@sksa.com', 
    'guruict@gmail.com',
    'guruict@sksa.com' 
];
// -----------------

// Nama Koleksi
const ITEMS_COLLECTION = 'items';
const LOANS_COLLECTION = 'loans';

// (PEMBETULAN HANG) Mulakan semua kod HANYA selepas HTML sedia
window.addEventListener('DOMContentLoaded', () => {
    
    // Mulakan Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const analytics = getAnalytics(app);
    
    // setLogLevel('debug'); // Buka untuk debug

    let currentUser = null;
    let isAdmin = false;
    let synth = null; // Untuk notifikasi bunyi
    let pendingLoanCount = 0; // Untuk notifikasi bunyi
    let allAssetsCache = []; // (BARU) Cache untuk Pengurus Aset

    // --- ELEMEN DOM (UTAMA) ---
    const authContainer = document.getElementById('auth-container');
    const authStatus = document.getElementById('auth-status');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const adminPanel = document.getElementById('admin-panel'); // Panel admin yang asal (tersembunyi)

    // --- ELEMEN DOM (TAB) ---
    const tabNav = document.getElementById('tab-nav');
    const tabContent = document.getElementById('tab-content');
    const permohonanTabButton = tabNav.querySelector('button[data-tab="permohonan"]');
    const asetTabButton = tabNav.querySelector('button[data-tab="aset"]');
    const dipinjamTabButton = tabNav.querySelector('button[data-tab="dipinjam"]');
    const rekodTabButton = tabNav.querySelector('button[data-tab="rekod"]'); 
    const rekodTabPanel = document.getElementById('panel-admin-rekod');
    const pendingBadge = document.getElementById('pending-badge');
    const pendingBadgeMain = document.getElementById('pending-badge-main');

    // --- ELEMEN DOM (SENARAI) ---
    // Senarai Borang
    const formLaptopList = document.getElementById('form-laptop-list');
    const formTabletList = document.getElementById('form-tablet-list');
    const formProjectorList = document.getElementById('form-projector-list');
    const formOthersList = document.getElementById('form-others-list');
    const formLaptopCount = document.getElementById('form-laptop-count');
    const formTabletCount = document.getElementById('form-tablet-count');
    const formProjectorCount = document.getElementById('form-projector-count');
    const formOthersCount = document.getElementById('form-others-count');
    // Senarai Paparan
    const displayLaptopList = document.getElementById('display-laptop-list');
    const displayTabletList = document.getElementById('display-tablet-list');
    const displayProjectorList = document.getElementById('display-projector-list');
    const displayOthersList = document.getElementById('display-others-list');
    const displayLaptopCount = document.getElementById('display-laptop-count');
    const displayTabletCount = document.getElementById('display-tablet-count');
    const displayProjectorCount = document.getElementById('display-projector-count');
    const displayOthersCount = document.getElementById('display-others-count');
    // Senarai Lain
    const borrowedList = document.getElementById('borrowed-list');
    const loansList = document.getElementById('loans-list');
    
    // --- ELEMEN DOM (BORANG PERMOHONAN) ---
    const loanForm = document.getElementById('loan-form');
    const submitButton = document.getElementById('submit-button');
    const submitStatusError = document.getElementById('submit-status-error');
    const teacherNameInput = document.getElementById('teacherName');
    const teacherICInput = document.getElementById('teacherIC');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const purposeInput = document.getElementById('purpose');

    // --- ELEMEN DOM (MODAL) ---
    // Log Masuk
    const loginModal = document.getElementById('login-modal');
    const closeLoginModal = document.getElementById('close-login-modal');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    // Pengesahan
    const confirmModal = document.getElementById('confirm-modal');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmCancel = document.getElementById('confirm-cancel');
    const confirmOk = document.getElementById('confirm-ok');
    // Mesej
    const messageModal = document.getElementById('message-modal');
    const messageTitle = document.getElementById('message-title');
    const messageText = document.getElementById('message-text');
    const messageOk = document.getElementById('message-ok');
    // Edit Pinjaman
    const editLoanModal = document.getElementById('edit-loan-modal');
    const closeEditModal = document.getElementById('close-edit-modal');
    const editLoanForm = document.getElementById('edit-loan-form');
    const editLoanId = document.getElementById('edit-loan-id');
    const editTeacherName = document.getElementById('edit-teacherName');
    const editTeacherIC = document.getElementById('edit-teacherIC');
    const editStartDate = document.getElementById('edit-startDate');
    const editEndDate = document.getElementById('edit-endDate');
    const editPurpose = document.getElementById('edit-purpose');
    const editItemList = document.getElementById('edit-item-list');
    const editLoanError = document.getElementById('edit-loan-error');
    
    // --- ELEMEN DOM (ADMIN PANEL) ---
    const bulkAddForm = document.getElementById('bulk-add-form');
    const bulkAddButton = document.getElementById('bulk-add-button');
    const bulkAddStatus = document.getElementById('bulk-add-status');
    const clearRecordsBtn = document.getElementById('clear-records-btn');
    
    // (BARU) Pengurus Aset
    const openAssetManagerBtn = document.getElementById('open-asset-manager-btn');
    const assetManagerModal = document.getElementById('asset-manager-modal');
    const closeAssetManagerModal = document.getElementById('close-asset-manager-modal');
    const assetFilterInput = document.getElementById('asset-filter');
    const assetManagerList = document.getElementById('asset-manager-list');
    
    // (BARU) Edit Aset
    const editAssetModal = document.getElementById('edit-asset-modal');
    const closeEditAssetModal = document.getElementById('close-edit-asset-modal');
    const editAssetForm = document.getElementById('edit-asset-form');
    const editAssetId = document.getElementById('edit-asset-id');
    const editAssetGroupName = document.getElementById('edit-asset-groupName');
    const editAssetNameTitle = document.getElementById('edit-asset-name-title');
    const editAssetName = document.getElementById('edit-asset-name');
    const editAssetCategory = document.getElementById('edit-asset-category');
    const editAssetImageUrl = document.getElementById('edit-asset-imageUrl');
    const editAssetSpecs = document.getElementById('edit-asset-specs');
    const editAssetSubmit = document.getElementById('edit-asset-submit');
    const copyToGroupBtn = document.getElementById('copy-to-group-btn');
    const editAssetStatus = document.getElementById('edit-asset-status');


    // --- 1. PENGESAHAN (AUTH) & UI UTAMA ---

    /**
     * Pendengar utama untuk status log masuk.
     * Menguruskan UI dan memulakan pendengar pangkalan data.
     */
    onAuthStateChanged(auth, (user) => {
        if (user && !user.isAnonymous && ADMIN_EMAILS.includes(user.email)) {
            // Pengguna ialah ADMIN
            currentUser = user;
            isAdmin = true;
            authStatus.textContent = `Admin: ${user.email.split('@')[0]}`;
            authStatus.className = 'text-sm text-purple-600 font-semibold';
            updateUIVisibility(true);
            listenForData(true);
        } else if (user && user.isAnonymous) {
            // Pengguna ialah GURU (Anonymous)
            currentUser = user;
            isAdmin = false;
            authStatus.textContent = 'Mod Guru';
            authStatus.className = 'text-sm text-gray-600 italic';
            updateUIVisibility(false);
            listenForData(false);
        } else {
            // Pengguna tidak log masuk (keadaan awal)
            signInAnonymously(auth).catch((error) => {
                console.error("Gagal log masuk anonymous: ", error);
                authStatus.textContent = 'Gagal log masuk. Sila muat semula.';
            });
        }
    });

    /**
     * Mengemas kini UI (Tab/Panel) berdasarkan status admin.
     * @param {boolean} admin - Sama ada pengguna ialah admin.
     */
    function updateUIVisibility(admin) {
        if (admin) {
            // Paparan ADMIN
            loginButton.classList.add('hidden');
            logoutButton.classList.remove('hidden');
            permohonanTabButton.classList.add('hidden'); // Sembunyi tab "Permohonan"
            rekodTabButton.classList.remove('hidden'); // Papar tab "Rekod Pinjaman"
            
            // Pindahkan panel admin ke dalam tab "Rekod Pinjaman"
            rekodTabPanel.appendChild(adminPanel);
            adminPanel.classList.remove('hidden');
            
            // Tetapkan tab "Aset Tersedia" sebagai lalai untuk admin
            showTab('aset'); 
        } else {
            // Paparan GURU (Anonymous)
            loginButton.classList.remove('hidden');
            logoutButton.classList.add('hidden');
            permohonanTabButton.classList.remove('hidden'); // Papar tab "Permohonan"
            rekodTabButton.classList.add('hidden'); // Sembunyi tab "Rekod Pinjaman"
            
            // Sembunyikan panel admin (jika ia masih ada)
            adminPanel.classList.add('hidden');
            
            // Tetapkan tab "Permohonan" sebagai lalai untuk guru
            showTab('permohonan');
        }
    }

    /**
     * Memulakan semua pendengar pangkalan data.
     * @param {boolean} admin - Sama ada perlu memuatkan data admin.
     */
    function listenForData(admin) {
        listenForItems(); // Muat senarai aset (untuk semua)
        listenForBorrowedItems(); // Muat senarai dipinjam (untuk semua)
        
        if (admin) {
            listenForLoans(); // Muat rekod pinjaman (admin sahaja)
        }
    }

    // --- 2. LOGIK TAB ---

    /**
     * Menguruskan penukaran tab.
     * @param {string} tabId - ID tab ('permohonan', 'aset', 'dipinjam', 'rekod')
     */
    function showTab(tabId) {
        // Sembunyikan semua panel
        tabContent.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.add('hidden');
        });
        
        // Nyah-aktifkan semua butang tab
        tabNav.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        
        // Paparkan panel yang dipilih
        const panelToShow = document.getElementById(`panel-${tabId}`);
        if (panelToShow) {
            panelToShow.classList.remove('hidden');
        }
        
        // Aktifkan butang tab yang dipilih
        const buttonToActivate = tabNav.querySelector(`button[data-tab="${tabId}"]`);
        if (buttonToActivate) {
            buttonToActivate.classList.add('active');
        }
    }

    // Tambah pendengar klik pada semua butang tab
    tabNav.addEventListener('click', (e) => {
        const tabButton = e.target.closest('.tab-button');
        if (tabButton) {
            e.preventDefault();
            const tabId = tabButton.dataset.tab;
            showTab(tabId);
        }
    });

    // --- 3. FUNGSI PAPARAN ASET (listenForItems) ---

    /**
     * Mendengar perubahan pada koleksi 'items' dan memaparkannya.
     * Ini adalah fungsi yang kompleks kerana ia:
     * 1. Mengisih item ke dalam kategori.
     * 2. Mengumpulkan item (cth: Joi Classmate 1-34) jika 'groupName' wujud.
     * 3. Memaparkan item dalam DUA tab berbeza (Borang Permohonan & Paparan Aset).
     */
    function listenForItems() {
        const q = query(collection(db, ITEMS_COLLECTION));
        
        // Senarai sasaran untuk paparan aset (Tab Permohonan & Tab Paparan)
        const listTargets = {
            form: {
                Laptop: formLaptopList,
                Tablet: formTabletList,
                Projector: formProjectorList,
                Lain: formOthersList,
            },
            display: {
                Laptop: displayLaptopList,
                Tablet: displayTabletList,
                Projector: displayProjectorList,
                Lain: displayOthersList,
            }
        };
        
        // Senarai sasaran untuk kiraan (count) aset
        const countTargets = {
            form: {
                Laptop: formLaptopCount,
                Tablet: formTabletCount,
                Projector: formProjectorCount,
                Lain: formOthersCount,
            },
            display: {
                Laptop: displayLaptopCount,
                Tablet: displayTabletCount,
                Projector: displayProjectorCount,
                Lain: displayOthersCount,
            }
        };

        onSnapshot(q, (snapshot) => {
            // Kosongkan semua senarai
            Object.values(listTargets.form).forEach(list => list.innerHTML = '');
            Object.values(listTargets.display).forEach(list => list.innerHTML = '');

            if (snapshot.empty) {
                const msg = '<p class="text-gray-500 text-sm italic">Tiada aset ditambah dalam sistem.</p>';
                Object.values(listTargets.form).forEach(list => list.innerHTML = msg);
                Object.values(listTargets.display).forEach(list => list.innerHTML = msg);
                return;
            }

            let allItems = [];
            snapshot.forEach((doc) => {
                allItems.push({ id: doc.id, ...doc.data() });
            });
            
            allAssetsCache = [...allItems]; // Simpan cache untuk Pengurus Aset
            
            // Isih (sort) ikut nama
            allItems.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            // Kumpulkan item mengikut kategori
            const categorizedItems = {
                Laptop: [],
                Tablet: [],
                Projector: [],
                Lain: [] // Untuk fallback
            };

            allItems.forEach(item => {
                const category = item.category || 'Lain';
                if (categorizedItems[category]) {
                    categorizedItems[category].push(item);
                } else {
                    categorizedItems.Lain.push(item);
                }
            });

            // Sekarang, paparkan item dalam kategori masing-masing
            for (const category in categorizedItems) {
                const itemsInCategory = categorizedItems[category];
                const formTargetList = listTargets.form[category];
                const displayTargetList = listTargets.display[category];
                
                if (!formTargetList || !displayTargetList) continue; // Langkau jika tiada sasaran DOM

                // Kumpulkan item dalam kategori ini mengikut 'groupName'
                const groupedAssets = groupAssets(itemsInCategory);

                let availableCount = 0;
                
                if (itemsInCategory.length === 0) {
                    const msg = '<p class="text-gray-500 text-sm italic">Tiada aset dalam kategori ini.</p>';
                    formTargetList.innerHTML = msg;
                    displayTargetList.innerHTML = msg;
                    continue;
                }

                // Paparkan item (berkumpulan atau individu)
                groupedAssets.forEach(group => {
                    const availableItemsInGroup = group.items.filter(i => i.status === 'available');
                    availableCount += availableItemsInGroup.length;
                    
                    if (group.isGroup) {
                        // Papar sebagai KUMPULAN (group)
                        formTargetList.appendChild(renderAssetGroupHTML(group, true)); // Boleh ditanda (checkbox)
                        displayTargetList.appendChild(renderAssetGroupHTML(group, false)); // Paparan sahaja
                    } else {
                        // Papar sebagai INDIVIDU
                        group.items.forEach(item => {
                            if (item.status === 'available') {
                                formTargetList.appendChild(renderAssetItemHTML(item, true)); // Boleh ditanda
                                displayTargetList.appendChild(renderAssetItemHTML(item, false)); // Paparan sahaja
                            }
                        });
                    }
                });

                // Kemas kini kiraan (count) pada badge
                const countBadgeForm = countTargets.form[category];
                const countBadgeDisplay = countTargets.display[category];
                
                if (availableCount > 0) {
                    countBadgeForm.textContent = availableCount;
                    countBadgeForm.classList.remove('hidden');
                    countBadgeDisplay.textContent = availableCount;
                    countBadgeDisplay.classList.remove('hidden');
                } else {
                    countBadgeForm.classList.add('hidden');
                    countBadgeDisplay.classList.add('hidden');
                    const msg = '<p class="text-gray-500 text-sm italic">Tiada aset tersedia dalam kategori ini.</p>';
                    formTargetList.innerHTML = msg;
                    displayTargetList.innerHTML = msg;
                }
            }
            
            // (DIBETULKAN) Tambah event listener untuk toggle butiran (info) aset
            document.querySelectorAll('.asset-info-toggle').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const itemDetails = e.target.closest('.asset-item-details');
                    if (itemDetails) {
                        itemDetails.classList.toggle('open');
                    }
                });
            });

        }, (error) => {
            console.error("Error listening for items: ", error);
            const msg = `<p class="text-red-500">Gagal memuatkan senarai aset. (Ralat: ${error.code})</p>`;
            if (error.code === 'permission-denied') {
                Object.values(listTargets.form).forEach(list => list.innerHTML = '<p class="text-red-500 font-bold">RALAT: Sila semak `firestore.rules` anda.</p>');
                Object.values(listTargets.display).forEach(list => list.innerHTML = '<p class="text-red-500 font-bold">RALAT: Sila semak `firestore.rules` anda.</p>');
            } else {
                Object.values(listTargets.form).forEach(list => list.innerHTML = msg);
                Object.values(listTargets.display).forEach(list => list.innerHTML = msg);
            }
        });
    }

    /**
     * (BARU) Mengisih item ke dalam kumpulan berdasarkan 'groupName'
     * @param {Array} items - Senarai item dalam satu kategori
     * @returns {Array} - Senarai objek { isGroup, groupName, items }
     */
    function groupAssets(items) {
        const grouped = new Map();
        const ungrouped = [];

        items.forEach(item => {
            if (item.groupName) {
                if (!grouped.has(item.groupName)) {
                    grouped.set(item.groupName, []);
                }
                grouped.get(item.groupName).push(item);
            } else {
                ungrouped.push(item);
            }
        });

        const result = [];
        
        // Tambah item berkumpulan
        grouped.forEach((groupItems, groupName) => {
            result.push({
                isGroup: true,
                groupName: groupName,
                items: groupItems
            });
        });

        // Tambah item individu
        ungrouped.forEach(item => {
            result.push({
                isGroup: false,
                groupName: null,
                items: [item] // Letak dalam array untuk konsistensi
            });
        });
        
        return result;
    }

    /**
     * (BARU & DIBETULKAN) Memaparkan SATU item individu
     * @param {object} item - Objek aset
     * @param {boolean} includeCheckbox - Sama ada mahu letak checkbox (untuk tab borang)
     * @returns {HTMLElement} - Elemen DOM untuk item
     */
    function renderAssetItemHTML(item, includeCheckbox = false) {
        const itemName = (item.name || 'Aset Rosak');
        const element = document.createElement('div');
        element.className = 'bg-green-50 border border-green-200 rounded-lg asset-item-details';
        
        // Format spesifikasi
        const specsHtml = item.specs 
            ? item.specs.split('\n').map(spec => 
                `<li class="text-xs text-gray-500">${spec}</li>`
              ).join('') 
            : '';
        
        // Format gambar
        const placeholderImg = `https://placehold.co/80x80/e2e8f0/94a3b8?text=${encodeURIComponent(itemName.substring(0, 10))}`;
        const imageSrc = item.imageUrl ? item.imageUrl : placeholderImg;
        
        const imageHtml = `
            <img src="${imageSrc}" alt="${itemName}" 
                 class="w-20 h-20 object-contain rounded-md bg-gray-100 flex-shrink-0" 
                 onerror="this.src='${placeholderImg}'; this.onerror=null;">
        `;

        // Bahagian utama (Checkbox atau Teks)
        let mainContentHtml = '';
        const checkboxId = `item-${item.id}`;
        
        if (includeCheckbox) {
            // Ini untuk tab "Permohonan"
            mainContentHtml = `
                <label for="${checkboxId}" class="flex items-center space-x-3 p-3 cursor-pointer">
                    <input type="checkbox" id="${checkboxId}" name="selectedItems" value="${item.id}" data-name="${itemName}"
                           class="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 asset-checkbox flex-shrink-0">
                    <div class="min-w-0">
                        <span class="font-medium text-green-800 break-words">${itemName}</span>
                    </div>
                </label>
            `;
        } else {
            // Ini untuk tab "Aset Tersedia (Paparan Sahaja)"
            mainContentHtml = `
                <div class="flex items-center space-x-3 p-3">
                    <div class="min-w-0">
                        <span class="font-medium text-green-800 break-words">${itemName}</span>
                    </div>
                </div>
            `;
        }
        
        // Bahagian butiran (Info)
        // (DIBETULKAN) Tambah padding & bg di sini, bukan di CSS
        const detailsHtml = `
            <div class="asset-details">
                <div class="p-3 border-t border-green-200 bg-gray-50">
                    <div class="flex space-x-3">
                        ${imageHtml}
                        <div>
                            <h4 class="font-semibold text-sm text-gray-700">Spesifikasi:</h4>
                            ${specsHtml ? `<ul class="list-none mt-1">${specsHtml}</ul>` : '<p class="text-xs text-gray-500 italic">Tiada spesifikasi.</p>'}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // (DIBETULKAN) Jadikan keseluruhan <summary> boleh diklik
        const infoIconHtml = (item.imageUrl || item.specs) ? `
            <span class="p-3 text-blue-600">
                <svg class="w-5 h-5 transition-transform duration-200 info-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
            </span>
        ` : '<div class="w-11 p-3"></div>'; // Placeholder

        element.innerHTML = `
            <div class="flex justify-between items-stretch asset-info-toggle ${(item.imageUrl || item.specs) ? 'cursor-pointer' : ''}">
                <div class="flex-grow">${mainContentHtml}</div>
                ${infoIconHtml}
            </div>
            ${(item.imageUrl || item.specs) ? detailsHtml : ''}
        `;
        
        return element;
    }
    
    /**
     * (BARU & DIBETULKAN) Memaparkan KUMPULAN item (cth: Joi Classmate 1-34)
     * @param {object} group - Objek kumpulan { groupName, items }
     * @param {boolean} includeCheckbox - Sama ada mahu letak checkbox (untuk tab borang)
     * @returns {HTMLElement} - Elemen DOM untuk kumpulan
     */
    function renderAssetGroupHTML(group, includeCheckbox = false) {
        const element = document.createElement('div');
        element.className = 'border border-gray-200 rounded-lg asset-item-details'; // Guna 'asset-item-details' untuk 'open'
        
        const availableItemsInGroup = group.items.filter(i => i.status === 'available');
        const firstItem = group.items[0]; // Guna item pertama untuk info gambar/spec
        
        // Format spesifikasi
        const specsHtml = firstItem.specs 
            ? firstItem.specs.split('\n').map(spec => 
                `<li class="text-xs text-gray-500">${spec}</li>`
              ).join('') 
            : '';

        // Format gambar
        const placeholderImg = `https://placehold.co/80x80/e2e8f0/94a3b8?text=${encodeURIComponent(group.groupName.substring(0, 10))}`;
        const imageSrc = firstItem.imageUrl ? firstItem.imageUrl : placeholderImg;
        
        const imageHtml = `
            <img src="${imageSrc}" alt="${group.groupName}" 
                 class="w-20 h-20 object-contain rounded-md bg-gray-100 flex-shrink-0" 
                 onerror="this.src='${placeholderImg}'; this.onerror=null;">
        `;

        // Bahagian butiran (Info)
        // (DIBETULKAN) Tambah padding & bg di sini
        const detailsHtml = `
            <div class="asset-details">
                <div class="p-3 bg-gray-50 border-t border-gray-200">
                    <div class="flex space-x-3">
                        ${imageHtml}
                        <div>
                            <h4 class="font-semibold text-sm text-gray-700">Spesifikasi Kumpulan:</h4>
                            ${specsHtml ? `<ul class="list-none mt-1">${specsHtml}</ul>` : '<p class="text-xs text-gray-500 italic">Tiada spesifikasi.</p>'}
                        </div>
                    </div>
                    <h4 class="font-semibold text-sm text-gray-700 mt-4 mb-2">Pilih Item:</h4>
                    <div class="grouped-item-grid p-2 bg-gray-100 rounded-md max-h-48 overflow-y-auto">
                        ${availableItemsInGroup.map(item => {
                            const itemName = (item.name || 'Aset Rosak');
                            const checkboxId = `item-${item.id}`;
                            if (includeCheckbox) {
                                // Ini untuk tab "Permohonan"
                                return `
                                    <label for="${checkboxId}" class="flex items-center space-x-2 p-2 rounded-md hover:bg-gray-200 cursor-pointer">
                                        <input type="checkbox" id="${checkboxId}" name="selectedItems" value="${item.id}" data-name="${itemName}"
                                               class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 asset-checkbox">
                                        <span class="text-sm text-green-800 break-words">${itemName}</span>
                                    </label>
                                `;
                            } else {
                                // Ini untuk tab "Aset Tersedia (Paparan Sahaja)"
                                return `
                                    <div class="flex items-center space-x-2 p-2">
                                        <span class="h-4 w-4"></span> <!-- Placeholder untuk samakan 'alignment' -->
                                        <span class="text-sm text-green-800 break-words">${itemName}</span>
                                    </div>
                                `;
                            }
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
        
        // Bahagian <summary> (Header)
        const summaryHtml = `
            <summary class="flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-t-lg cursor-pointer asset-info-toggle">
                <div class="flex items-center space-x-2">
                    <span class="text-lg font-semibold text-gray-800">${group.groupName}</span>
                    <span class="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-green-100 bg-green-600 rounded-full">${availableItemsInGroup.length} Tersedia</span>
                </div>
                <svg class="w-5 h-5 text-gray-600 transition-transform duration-200 info-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
            </summary>
        `;

        element.innerHTML = summaryHtml + detailsHtml;
        return element;
    }


    // --- 4. FUNGSI PAPARAN PINJAMAN (Public) ---

    /**
     * Mendengar perubahan pada koleksi 'loans' untuk paparan awam.
     * Memaparkan SEMUA item yang sedang 'approved'.
     */
    function listenForBorrowedItems() {
        const q = query(collection(db, LOANS_COLLECTION)); // Ambil semua
        
        onSnapshot(q, (snapshot) => {
            borrowedList.innerHTML = '';
            
            if (snapshot.empty) {
                borrowedList.innerHTML = '<p class="text-gray-500 text-sm italic col-span-full">Tiada aset sedang dipinjam.</p>';
                return;
            }

            let borrowedDisplayItems = [];
            
            snapshot.forEach((doc) => {
                const loan = doc.data();
                
                // (PEMBETULAN) Boleh baca format lama (satu item) & baru (pukal)
                if (loan.status === 'approved') {
                    const itemsToDisplay = loan.items || (loan.itemName ? [{ id: loan.itemId, name: loan.itemName }] : []);
                    
                    itemsToDisplay.forEach(item => {
                        borrowedDisplayItems.push({
                            itemName: (item.name || 'Aset Rosak'),
                            teacherName: loan.teacherName,
                            endDate: loan.endDate,
                            approvedBy: loan.approvedBy
                        });
                    });
                }
            });

            if (borrowedDisplayItems.length === 0) {
                borrowedList.innerHTML = '<p class="text-gray-500 text-sm italic col-span-full">Tiada aset sedang dipinjam.</p>';
                return;
            }
            
            // Isih (sort) ikut tarikh pulang terdekat
            borrowedDisplayItems.sort((a, b) => (a.endDate?.toMillis() || 0) - (b.endDate?.toMillis() || 0));

            borrowedDisplayItems.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'p-4 bg-red-50 border border-red-200 rounded-lg flex flex-col justify-between h-full shadow';
                
                const countdownHtml = calculateCountdown(item.endDate);
                
                itemElement.innerHTML = `
                    <div>
                        <p class="font-semibold text-red-800">${item.itemName}</p>
                        <p class="text-sm text-gray-700">Peminjam: ${item.teacherName}</p>
                        <p class="text-sm text-gray-700">Pulang: ${formatDate(item.endDate)}</p>
                        <p class="text-sm text-gray-500 italic">Lulus oleh: ${loan.approvedBy || 'N/A'}</p>
                    </div>
                    <div class="mt-3 text-center border-t border-red-200 pt-3">
                        ${countdownHtml}
                    </div>
                `;
                borrowedList.appendChild(itemElement);
            });

        }, (error) => {
            console.error("Error listening for borrowed items: ", error);
            borrowedList.innerHTML = `<p class="text-red-500">Gagal memuatkan senarai. (Ralat: ${error.code})</p>`;
        });
    }

    // --- 5. FUNGSI BORANG PERMOHONAN ---

    /**
     * Menetapkan tarikh minimum untuk input tarikh.
     */
    function setMinDates() {
        const today = new Date().toISOString().split('T')[0];
        startDateInput.setAttribute('min', today);
        endDateInput.setAttribute('min', today);
    }

    // Pastikan tarikh pulang tidak lebih awal dari tarikh pinjam
    startDateInput.addEventListener('change', () => {
        if (endDateInput.value && endDateInput.value < startDateInput.value) {
            endDateInput.value = startDateInput.value;
        }
        endDateInput.setAttribute('min', startDateInput.value || new Date().toISOString().split('T')[0]);
    });

    /**
     * Mengendalikan penghantaran borang permohonan.
     */
    async function handleFormSubmit(e) {
        e.preventDefault();
        submitButton.disabled = true;
        submitButton.textContent = 'Memproses...';
        submitStatusError.textContent = '';
        
        // 1. Kumpul semua item yang ditanda (checked)
        const selectedCheckboxes = document.querySelectorAll('input[name="selectedItems"]:checked');
        
        if (selectedCheckboxes.length === 0) {
            submitStatusError.textContent = 'Ralat: Sila pilih sekurang-kurangnya satu aset untuk dipinjam.';
            submitButton.disabled = false;
            submitButton.textContent = 'Hantar Permohonan';
            return;
        }
        
        // 2. Kumpul data borang
        const formData = {
            teacherName: teacherNameInput.value,
            teacherIC: teacherICInput.value,
            startDate: Timestamp.fromDate(new Date(startDateInput.value + 'T00:00:00')), // Set ke permulaan hari
            endDate: Timestamp.fromDate(new Date(endDateInput.value + 'T00:00:00')),
            purpose: purposeInput.value,
            status: 'pending',
            requestedAt: Timestamp.now(),
            approvedBy: null
        };
        
        // 3. (BARU) Kumpul item ke dalam array
        let selectedItemsArray = [];
        let itemNamesListHtml = ''; // Untuk modal mesej
        
        selectedCheckboxes.forEach(cb => {
            const itemName = (cb.dataset.name || 'Aset Rosak');
            selectedItemsArray.push({
                id: cb.value,
                name: itemName
            });
            itemNamesListHtml += `<li>${itemName}</li>`;
        });
        
        // 4. Cipta SATU dokumen pinjaman dengan senarai item
        try {
            await addDoc(collection(db, LOANS_COLLECTION), {
                ...formData,
                items: selectedItemsArray // Simpan sebagai array
            });
            
            // Berjaya
            loanForm.reset();
            setMinDates();
            // Kosongkan semua checkbox
            selectedCheckboxes.forEach(cb => cb.checked = false);
            
            // Papar modal kejayaan
            const message = `
                <p class="mb-3">Permohonan anda sedang diproses. Sila tunggu kelulusan.</p>
                <p class="font-semibold mb-2">Aset Dipohon:</p>
                <ul class="list-disc list-inside text-left text-sm">${itemNamesListHtml}</ul>
            `;
            showMessage('Permohonan Dihantar', message);
            
        } catch (error) {
            console.error("Error adding loan document: ", error);
            submitStatusError.textContent = `Gagal menghantar permohonan: ${error.message}`;
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Hantar Permohonan';
        }
    }

    // --- 6. FUNGSI PANEL ADMIN ---

    /**
     * Mendengar perubahan pada koleksi 'loans' untuk panel admin.
     * Memaparkan SEMUA rekod (pending, approved, dll.).
     */
    function listenForLoans() {
        const q = query(collection(db, LOANS_COLLECTION));
        
        onSnapshot(q, (snapshot) => {
            loansList.innerHTML = ''; // Kosongkan jadual
            
            if (snapshot.empty) {
                loansList.innerHTML = '<tr><td colspan="8" class="px-6 py-4 text-center text-gray-500 italic">Tiada rekod permohonan.</td></tr>';
                return;
            }

            let allLoans = [];
            snapshot.forEach((doc) => {
                allLoans.push({ id: doc.id, ...doc.data() });
            });

            // Isih (sort) ikut tarikh permohonan (terbaru di atas)
            allLoans.sort((a, b) => (b.requestedAt?.toMillis() || 0) - (a.requestedAt?.toMillis() || 0));

            let newPendingCount = 0;
            
            allLoans.forEach(loan => {
                const tr = document.createElement('tr');
                tr.className = loan.status === 'pending' ? 'bg-yellow-50' : (loan.status === 'approved' ? 'bg-green-50' : 'bg-gray-50');
                
                // Kira permohonan "pending"
                if (loan.status === 'pending') {
                    newPendingCount++;
                }
                
                // (BARU) Papar senarai item (jika pukal) atau item tunggal
                const itemsToDisplay = loan.items || (loan.itemName ? [{ id: loan.itemId, name: loan.itemName }] : []);
                const itemsHtml = itemsToDisplay.length > 1
                    ? `<ol class="list-decimal list-inside">${itemsToDisplay.map(i => `<li>${(i.name || 'Aset Rosak')}</li>`).join('')}</ol>`
                    : (itemsToDisplay[0]?.name || 'Aset Rosak');

                // Tentukan status dan warna
                let statusHtml = '';
                switch (loan.status) {
                    case 'pending':
                        statusHtml = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Menunggu</span>';
                        break;
                    case 'approved':
                        statusHtml = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Diluluskan</span>
                                    <span class="text-xs text-gray-500 italic block">Oleh: ${loan.approvedBy || 'N/A'}</span>`;
                        break;
                    case 'rejected':
                        statusHtml = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Ditolak</span>';
                        break;
                    case 'completed':
                        statusHtml = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Selesai</span>';
                        break;
                    default:
                        statusHtml = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">${loan.status}</span>`;
                }
                
                // (BARU) Data untuk butang
                const loanData = encodeURIComponent(JSON.stringify(loan));

                // Butang Tindakan
                let actionButtons = '';
                if (loan.status === 'pending') {
                    actionButtons = `
                        <button data-loan-id="${loan.id}" data-action="approve" data-loan='${loanData}'
                                class="action-btn bg-green-500 hover:bg-green-600 text-white text-xs font-semibold py-1 px-2 rounded">Lulus</button>
                        <button data-loan-id="${loan.id}" data-action="reject" data-loan='${loanData}'
                                class="action-btn bg-red-500 hover:bg-red-600 text-white text-xs font-semibold py-1 px-2 rounded">Tolak</button>
                    `;
                } else if (loan.status === 'approved') {
                    actionButtons = `
                        <button data-loan-id="${loan.id}" data-action="return" data-loan='${loanData}'
                                class="action-btn bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold py-1 px-2 rounded">Pulang</button>
                    `;
                } else {
                    actionButtons = 'Tiada';
                }

                tr.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-y-1">
                        ${actionButtons}
                        <hr class="my-1">
                        <button data-loan-id="${loan.id}" data-action="edit" data-loan='${loanData}'
                                class="action-btn bg-gray-400 hover:bg-gray-500 text-white text-xs font-semibold py-1 px-2 rounded">Edit</button>
                        <button data-loan-id="${loan.id}" data-action="delete" data-loan='${loanData}'
                                class="action-btn bg-red-700 hover:bg-red-800 text-white text-xs font-semibold py-1 px-2 rounded">Padam</button>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-700">${loan.teacherName || 'N/A'}</td>
                    <td class="px-6 py-4 text-sm text-gray-700">${loan.teacherIC || 'N/A'}</td>
                    <td class="px-6 py-4 text-sm text-gray-700">${itemsHtml}</td>
                    <td class="px-6 py-4 text-sm text-gray-700">${formatDate(loan.startDate)}</td>
                    <td class="px-6 py-4 text-sm text-gray-700">${formatDate(loan.endDate)}</td>
                    <td class="px-6 py-4 text-sm text-gray-700 max-w-xs whitespace-normal">${loan.purpose}</td>
                    <td class="px-6 py-4 text-sm text-gray-700">${statusHtml}</td>
                `;
                loansList.appendChild(tr);
            });
            
            // Kemas kini badge notifikasi
            if (newPendingCount > 0) {
                pendingBadge.textContent = newPendingCount;
                pendingBadge.classList.remove('hidden');
                pendingBadgeMain.textContent = newPendingCount;
                pendingBadgeMain.classList.remove('hidden');
                
                // Mainkan bunyi jika kiraan bertambah
                if (newPendingCount > pendingLoanCount) {
                    playNotificationSound();
                }
            } else {
                pendingBadge.classList.add('hidden');
                pendingBadgeMain.classList.add('hidden');
            }
            pendingLoanCount = newPendingCount; // Simpan kiraan semasa

        }, (error) => {
            console.error("Error listening for loans: ", error);
            loansList.innerHTML = `<tr><td colspan="8" class="px-6 py-4 text-red-500">Gagal memuatkan rekod. (Ralat: ${error.code})</td></tr>`;
        });
    }

    /**
     * Menambah pendengar klik untuk semua butang tindakan admin (Lulus, Tolak, Edit, dll.)
     */
    function addAdminButtonListeners() {
        loansList.addEventListener('click', (e) => {
            const button = e.target.closest('.action-btn');
            if (!button) return;

            const loanId = button.dataset.loanId;
            const action = button.dataset.action;
            const loan = JSON.parse(decodeURIComponent(button.dataset.loan));
            
            // Tukar tarikh (string) dari JSON kembali ke objek Timestamp (jika wujud)
            if (loan.startDate) loan.startDate = new Timestamp(loan.startDate.seconds, loan.startDate.nanoseconds);
            if (loan.endDate) loan.endDate = new Timestamp(loan.endDate.seconds, loan.endDate.nanoseconds);
            if (loan.requestedAt) loan.requestedAt = new Timestamp(loan.requestedAt.seconds, loan.requestedAt.nanoseconds);

            switch (action) {
                case 'approve':
                    confirmAction(
                        'Luluskan Permohonan?',
                        `Anda pasti mahu meluluskan permohonan ini? Tindakan ini akan menukar status ${loan.items.length} aset kepada "dipinjam".`,
                        'Luluskan',
                        'green',
                        () => handleApproveLoan(loan)
                    );
                    break;
                case 'reject':
                    confirmAction(
                        'Tolak Permohonan?',
                        'Anda pasti mahu menolak permohonan ini?',
                        'Tolak',
                        'red',
                        () => handleRejectLoan(loan.id)
                    );
                    break;
                case 'return':
                    confirmAction(
                        'Sahkan Pemulangan?',
                        `Anda pasti mahu menandakan permohonan ini sebagai "Selesai"? Tindakan ini akan menukar status ${loan.items.length} aset kembali kepada "tersedia".`,
                        'Sahkan Pulang',
                        'blue',
                        () => handleReturnLoan(loan)
                    );
                    break;
                case 'edit':
                    handleEditLoan(loan);
                    break;
                case 'delete':
                    confirmAction(
                        'Padam Rekod?',
                        `Anda pasti mahu memadam rekod ini? Jika aset sedang dipinjam, status aset akan DITETAPKAN SEMULA kepada "tersedia".`,
                        'Padam',
                        'red',
                        () => handleDeleteLoan(loan)
                    );
                    break;
            }
        });
    }

    /**
     * (DIKEMAS KINI) Mengendalikan kelulusan (termasuk pukal).
     */
    async function handleApproveLoan(loan) {
        const batch = writeBatch(db);
        
        // 1. Kemas kini dokumen pinjaman
        const loanRef = doc(db, LOANS_COLLECTION, loan.id);
        batch.update(loanRef, { 
            status: 'approved',
            approvedBy: currentUser.email // Simpan siapa yang luluskan
        });
        
        // 2. Kemas kini setiap item dalam senarai
        loan.items.forEach(item => {
            const itemRef = doc(db, ITEMS_COLLECTION, item.id);
            batch.update(itemRef, { status: 'borrowed' });
        });
        
        try {
            await batch.commit();
            showMessage('Berjaya', 'Permohonan telah diluluskan.');
        } catch (error) {
            console.error("Error approving loan: ", error);
            showMessage('Ralat', `Gagal meluluskan permohonan: ${error.message}`, 'red');
        }
    }

    /**
     * Mengendalikan penolakan permohonan.
     */
    async function handleRejectLoan(loanId) {
        const loanRef = doc(db, LOANS_COLLECTION, loanId);
        try {
            await updateDoc(loanRef, { status: 'rejected' });
            showMessage('Berjaya', 'Permohonan telah ditolak.');
        } catch (error) {
            console.error("Error rejecting loan: ", error);
            showMessage('Ralat', `Gagal menolak permohonan: ${error.message}`, 'red');
        }
    }

    /**
     * (DIKEMAS KINI) Mengendalikan pemulangan (termasuk pukal).
     */
    async function handleReturnLoan(loan) {
        const batch = writeBatch(db);
        
        // 1. Kemas kini dokumen pinjaman
        const loanRef = doc(db, LOANS_COLLECTION, loan.id);
        batch.update(loanRef, { status: 'completed' });
        
        // 2. Kemas kini setiap item dalam senarai
        loan.items.forEach(item => {
            const itemRef = doc(db, ITEMS_COLLECTION, item.id);
            batch.update(itemRef, { status: 'available' });
        });
        
        try {
            await batch.commit();
            showMessage('Berjaya', 'Aset telah dipulangkan dan ditanda selesai.');
        } catch (error) {
            console.error("Error returning loan: ", error);
            showMessage('Ralat', `Gagal mengemas kini status: ${error.message}`, 'red');
        }
    }

    /**
     * (BARU) Mengendalikan pemadaman rekod.
     */
    async function handleDeleteLoan(loan) {
        const batch = writeBatch(db);
        
        // 1. Padam dokumen pinjaman
        const loanRef = doc(db, LOANS_COLLECTION, loan.id);
        batch.delete(loanRef);
        
        // 2. Jika status "approved", pulangkan item
        if (loan.status === 'approved') {
            loan.items.forEach(item => {
                const itemRef = doc(db, ITEMS_COLLECTION, item.id);
                batch.update(itemRef, { status: 'available' });
            });
        }
        
        try {
            await batch.commit();
            showMessage('Berjaya', 'Rekod pinjaman telah dipadamkan.');
        } catch (error) {
            console.error("Error deleting loan: ", error);
            showMessage('Ralat', `Gagal memadam rekod: ${error.message}`, 'red');
        }
    }

    /**
     * (BARU) Mengendalikan pembukaan modal "Edit Pinjaman".
     */
    function handleEditLoan(loan) {
        editLoanId.value = loan.id;
        editTeacherName.value = loan.teacherName || '';
        editTeacherIC.value = loan.teacherIC || '';
        editPurpose.value = loan.purpose || '';
        
        // Tukar Timestamp ke format YYYY-MM-DD
        editStartDate.value = loan.startDate ? loan.startDate.toDate().toISOString().split('T')[0] : '';
        editEndDate.value = loan.endDate ? loan.endDate.toDate().toISOString().split('T')[0] : '';
        
        // Papar senarai item (tidak boleh diedit)
        const itemsToDisplay = loan.items || (loan.itemName ? [{ id: loan.itemId, name: loan.itemName }] : []);
        editItemList.innerHTML = itemsToDisplay.map(i => `<li>${(i.name || 'Aset Rosak')}</li>`).join('');
        
        editLoanError.textContent = '';
        editLoanModal.classList.remove('hidden');
    }
    
    // Simpan perubahan dari modal "Edit Pinjaman"
    editLoanForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const loanId = editLoanId.value;
        if (!loanId) return;

        const updatedData = {
            teacherName: editTeacherName.value,
            teacherIC: editTeacherIC.value,
            purpose: editPurpose.value,
            startDate: Timestamp.fromDate(new Date(editStartDate.value + 'T00:00:00')),
            endDate: Timestamp.fromDate(new Date(editEndDate.value + 'T00:00:00'))
        };

        try {
            const loanRef = doc(db, LOANS_COLLECTION, loanId);
            await updateDoc(loanRef, updatedData);
            editLoanModal.classList.add('hidden');
            showMessage('Berjaya', 'Maklumat pinjaman telah dikemas kini.');
        } catch (error) {
            console.error("Error updating loan: ", error);
            editLoanError.textContent = `Gagal mengemas kini: ${error.message}`;
        }
    });

    /**
     * Mengendalikan borang "Tambah Aset Pukal".
     */
    bulkAddForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        bulkAddButton.disabled = true;
        bulkAddButton.textContent = 'Memproses...';
        bulkAddStatus.textContent = '';

        const baseName = document.getElementById('baseName').value;
        const groupName = document.getElementById('groupName').value; // (BARU) Ambil groupName
        const quantity = parseInt(document.getElementById('quantity').value, 10);
        const category = document.getElementById('category').value;

        if (quantity > 100) { // Had keselamatan
            bulkAddStatus.textContent = 'Ralat: Jumlah tidak boleh melebihi 100 sekaligus.';
            bulkAddButton.disabled = false;
            bulkAddButton.textContent = 'Tambah Aset';
            return;
        }

        const batch = writeBatch(db);
        const itemsRef = collection(db, ITEMS_COLLECTION);
        
        for (let i = 1; i <= quantity; i++) {
            const newItemRef = doc(itemsRef); // Cipta rujukan baru
            const newItemData = {
                name: `${baseName} ${i}`,
                category: category,
                status: 'available',
                groupName: groupName || null, // (BARU) Simpan groupName
                imageUrl: null,
                specs: null
            };
            batch.set(newItemRef, newItemData);
        }

        try {
            await batch.commit();
            bulkAddStatus.textContent = `Berjaya! ${quantity} aset telah ditambah.`;
            bulkAddStatus.className = 'text-sm mt-2 text-green-600';
            bulkAddForm.reset();
        } catch (error) {
            console.error("Error adding bulk items: ", error);
            bulkAddStatus.textContent = `Gagal: ${error.message}`;
            bulkAddStatus.className = 'text-sm mt-2 text-red-600';
        } finally {
            bulkAddButton.disabled = false;
            bulkAddButton.textContent = 'Tambah Aset';
        }
    });

    /**
     * Mengendalikan butang "Kosongkan Rekod Lama".
     */
    clearRecordsBtn.addEventListener('click', () => {
        confirmAction(
            'Kosongkan Rekod Lama?',
            'Anda pasti mahu memadam semua rekod yang berstatus "Selesai" dan "Ditolak"? Tindakan ini tidak boleh diundur.',
            'Padam Rekod Lama',
            'red',
            async () => {
                const q = query(collection(db, LOANS_COLLECTION), where('status', 'in', ['completed', 'rejected']));
                try {
                    const querySnapshot = await getDocs(q);
                    if (querySnapshot.empty) {
                        showMessage('Tiada Rekod', 'Tiada rekod lama untuk dipadamkan.');
                        return;
                    }
                    
                    const batch = writeBatch(db);
                    querySnapshot.forEach((doc) => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                    showMessage('Berjaya', `Rekod lama (${querySnapshot.size}) telah berjaya dipadamkan.`);
                } catch (error) {
                    console.error("Error clearing old records: ", error);
                    showMessage('Ralat', `Gagal memadam rekod lama: ${error.message}`, 'red');
                }
            }
        );
    });
    
    // --- 7. (BARU) FUNGSI PENGURUS ASET ---
    
    // Buka Modal Pengurus Aset
    openAssetManagerBtn.addEventListener('click', () => {
        renderAssetManagerList(); // Muat senarai aset (dari cache)
        assetManagerModal.classList.remove('hidden');
    });
    
    // Tutup Modal Pengurus Aset
    closeAssetManagerModal.addEventListener('click', () => {
        assetManagerModal.classList.add('hidden');
    });
    
    // Tapis (Filter) senarai aset dalam modal
    assetFilterInput.addEventListener('input', (e) => {
        renderAssetManagerList(e.target.value.toLowerCase());
    });

    /**
     * Memaparkan senarai aset di dalam Modal Pengurus Aset (berdasarkan cache).
     * @param {string} filter - Teks untuk menapis senarai.
     */
    function renderAssetManagerList(filter = '') {
        assetManagerList.innerHTML = '';
        
        const filteredAssets = allAssetsCache.filter(asset => 
            asset.name && asset.name.toLowerCase().includes(filter)
        );
        
        if (filteredAssets.length === 0) {
            assetManagerList.innerHTML = '<p class="text-gray-500 text-sm italic p-4">Tiada aset ditemui.</p>';
            return;
        }

        filteredAssets.forEach(asset => {
            const itemElement = document.createElement('div');
            itemElement.className = 'flex justify-between items-center p-3 bg-white hover:bg-gray-50 border-b border-gray-100';
            
            // Data untuk butang edit
            const assetData = encodeURIComponent(JSON.stringify(asset));
            
            itemElement.innerHTML = `
                <div>
                    <p class="font-medium text-gray-800">${asset.name}</p>
                    <p class="text-sm text-gray-500">${asset.category || 'N/A'} ${asset.groupName ? `(${asset.groupName})` : ''}</p>
                </div>
                <button data-asset='${assetData}'
                        class="edit-asset-btn bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-1 px-3 rounded-md shadow-sm">
                    Edit
                </button>
            `;
            assetManagerList.appendChild(itemElement);
        });
    }

    // Pendengar untuk butang "Edit" di dalam Pengurus Aset
    assetManagerList.addEventListener('click', (e) => {
        const editButton = e.target.closest('.edit-asset-btn');
        if (editButton) {
            const asset = JSON.parse(decodeURIComponent(editButton.dataset.asset));
            openEditAssetModal(asset);
        }
    });

    /**
     * Membuka modal "Edit Aset" dan mengisi data.
     */
    function openEditAssetModal(asset) {
        editAssetId.value = asset.id;
        editAssetNameTitle.textContent = asset.name;
        editAssetName.value = asset.name || '';
        editAssetCategory.value = asset.category || 'Lain';
        editAssetImageUrl.value = asset.imageUrl || '';
        editAssetSpecs.value = asset.specs || '';
        editAssetGroupName.value = asset.groupName || ''; // Simpan groupName (tersembunyi)
        
        editAssetStatus.textContent = '';
        
        // Paparkan butang "Salin ke Kumpulan" hanya jika item ini mempunyai groupName
        if (asset.groupName) {
            copyToGroupBtn.textContent = `Salin Gambar & Spec ke Kumpulan (${asset.groupName})`;
            copyToGroupBtn.classList.remove('hidden');
        } else {
            copyToGroupBtn.classList.add('hidden');
        }
        
        editAssetModal.classList.remove('hidden');
    }
    
    // Tutup Modal Edit Aset
    closeEditAssetModal.addEventListener('click', () => {
        editAssetModal.classList.add('hidden');
    });
    
    // Simpan perubahan dari modal "Edit Aset"
    editAssetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        editAssetSubmit.disabled = true;
        editAssetSubmit.textContent = 'Menyimpan...';
        editAssetStatus.textContent = '';
        
        const assetId = editAssetId.value;
        const updatedData = {
            name: editAssetName.value,
            category: editAssetCategory.value,
            imageUrl: editAssetImageUrl.value || null,
            specs: editAssetSpecs.value || null
            // groupName tidak diubah di sini, hanya di "Tambah Pukal"
        };
        
        try {
            const assetRef = doc(db, ITEMS_COLLECTION, assetId);
            await updateDoc(assetRef, updatedData);
            editAssetStatus.textContent = 'Berjaya disimpan!';
            editAssetStatus.className = 'text-sm mt-2 text-green-600';
            
            // Kemas kini nama pada tajuk modal (jika berubah)
            editAssetNameTitle.textContent = updatedData.name;
            
            // Muat semula cache (selepas 1 saat)
            setTimeout(() => {
                editAssetModal.classList.add('hidden');
                // Kita tidak perlu muat semula cache secara manual kerana onSnapshot akan melakukannya.
            }, 1000);
            
        } catch (error) {
            console.error("Error updating asset: ", error);
            editAssetStatus.textContent = `Gagal: ${error.message}`;
            editAssetStatus.className = 'text-sm mt-2 text-red-600';
        } finally {
            editAssetSubmit.disabled = false;
            editAssetSubmit.textContent = 'Simpan Maklumat Aset';
        }
    });
    
    // (BARU) Kendalikan butang "Salin ke Kumpulan"
    copyToGroupBtn.addEventListener('click', () => {
        const groupName = editAssetGroupName.value;
        const imageUrl = editAssetImageUrl.value || null;
        const specs = editAssetSpecs.value || null;
        
        if (!groupName) return;
        
        confirmAction(
            'Salin Maklumat ke Kumpulan?',
            `Anda pasti mahu menyalin gambar dan spesifikasi ini ke SEMUA aset lain dalam kumpulan "${groupName}"?`,
            'Ya, Salin',
            'green',
            async () => {
                // Tunjukkan status pada modal edit
                editAssetStatus.textContent = 'Menyalin ke kumpulan...';
                editAssetStatus.className = 'text-sm mt-2 text-yellow-600';

                // Cari semua item dalam kumpulan ini
                const q = query(collection(db, ITEMS_COLLECTION), where("groupName", "==", groupName));
                
                try {
                    const querySnapshot = await getDocs(q);
                    const batch = writeBatch(db);
                    
                    querySnapshot.forEach((doc) => {
                        // Kemas kini setiap item dalam kumpulan
                        batch.update(doc.ref, {
                            imageUrl: imageUrl,
                            specs: specs
                        });
                    });
                    
                    await batch.commit();
                    editAssetStatus.textContent = `Berjaya! Maklumat telah disalin ke ${querySnapshot.size} aset.`;
                    editAssetStatus.className = 'text-sm mt-2 text-green-600';
                    
                    setTimeout(() => {
                        editAssetModal.classList.add('hidden');
                    }, 2000);
                    
                } catch (error) {
                    console.error("Error copying to group: ", error);
                    editAssetStatus.textContent = `Gagal menyalin: ${error.message}`;
                    editAssetStatus.className = 'text-sm mt-2 text-red-600';
                }
            }
        );
    });
    

    // --- 8. FUNGSI UTILITI (MODAL, TARIKH, BUNYI) ---

    /**
     * Memaparkan modal pengesahan (confirm).
     * @param {string} title - Tajuk modal.
     * @param {string} message - Mesej pengesahan.
     * @param {string} okText - Teks untuk butang OK.
     * @param {string} color - Warna butang OK (cth: 'red', 'green', 'blue').
     * @param {function} onOk - Fungsi yang akan dijalankan jika OK diklik.
     */
    function confirmAction(title, message, okText, color = 'red', onOk) {
        confirmTitle.textContent = title;
        confirmMessage.textContent = message;
        confirmOk.textContent = okText;
        
        // Tetapkan warna butang
        const colors = {
            red: 'bg-red-600 hover:bg-red-700',
            green: 'bg-green-600 hover:bg-green-700',
            blue: 'bg-blue-600 hover:bg-blue-700',
        };
        confirmOk.className = `font-semibold py-2 px-4 rounded-lg text-white ${colors[color] || colors.red}`;
        
        confirmModal.classList.remove('hidden');
        
        // Cipta klon untuk mengalih keluar pendengar lama
        const newConfirmOk = confirmOk.cloneNode(true);
        confirmOk.parentNode.replaceChild(newConfirmOk, confirmOk);
        confirmOk = newConfirmOk; // Rujuk semula elemen baharu

        // Pendengar untuk butang OK
        newConfirmOk.onclick = () => {
            confirmModal.classList.add('hidden');
            if (onOk) onOk();
        };
    }
    
    // Tutup modal pengesahan
    confirmCancel.addEventListener('click', () => {
        confirmModal.classList.add('hidden');
    });

    /**
     * Memaparkan modal mesej (alert).
     * @param {string} title - Tajuk modal.
     * @param {string} message - Mesej (HTML dibenarkan).
     * @param {string} color - Warna tajuk (cth: 'red', 'green').
     */
    function showMessage(title, message, color = 'blue') {
        messageTitle.textContent = title;
        messageText.innerHTML = message; // Guna innerHTML untuk senarai
        
        const colors = {
            red: 'text-red-600',
            green: 'text-green-600',
            blue: 'text-blue-600',
        };
        messageTitle.className = `text-lg font-medium ${colors[color] || colors.blue}`;
        
        messageModal.classList.remove('hidden');
    }
    
    // Tutup modal mesej
    messageOk.addEventListener('click', () => {
        messageModal.classList.add('hidden');
    });

    /**
     * Memformat Timestamp Firestore ke string (cth: 30 Okt 2025).
     * @param {Timestamp} timestamp - Objek Timestamp Firestore.
     * @returns {string} - Tarikh yang diformat.
     */
    function formatDate(timestamp) {
        if (!timestamp || typeof timestamp.toDate !== 'function') {
            return 'Tiada Tarikh';
        }
        try {
            const date = timestamp.toDate();
            return date.toLocaleDateString('ms-MY', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        } catch (e) {
            console.warn("Ralat format tarikh: ", e, timestamp);
            return 'Tarikh Rosak';
        }
    }

    /**
     * Mengira baki hari untuk pemulangan.
     * @param {Timestamp} endDate - Tarikh pemulangan dari Firestore.
     * @returns {string} - HTML string untuk countdown.
     */
    function calculateCountdown(endDate) {
        if (!endDate || typeof endDate.toDate !== 'function') {
            return '<span class="text-lg font-bold text-gray-500">Tiada tarikh</span>';
        }
        
        const now = new Date();
        const returnDate = endDate.toDate();
        
        // Set kedua-dua tarikh ke tengah malam untuk perbandingan hari yang tepat
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const returnDay = new Date(returnDate.getFullYear(), returnDate.getMonth(), returnDate.getDate());

        const diffTime = returnDay.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return `<span class="text-2xl font-bold text-red-600">${Math.abs(diffDays)} HARI TERLEWAT</span>`;
        } else if (diffDays === 0) {
            return `<span class="text-2xl font-bold text-yellow-600">TAMAT HARI INI</span>`;
        } else if (diffDays === 1) {
            return `<span class="text-2xl font-bold text-blue-600">1 HARI LAGI</span>`;
        } else {
            return `<span class="text-2xl font-bold text-blue-600">${diffDays} HARI LAGI</span>`;
        }
    }

    /**
     * Memainkan bunyi notifikasi "bip" ringkas.
     */
    function playNotificationSound() {
        // Cipta synth hanya sekali
        if (!synth) {
            synth = new Tone.Synth().toDestination();
        }
        
        // Pastikan audio dimulakan (diperlukan oleh pelayar)
        Tone.start().then(() => {
            // Mainkan not C5 untuk 0.1 saat
            synth.triggerAttackRelease("C5", "8n");
        }).catch(e => {
            console.warn("Gagal memulakan audio:", e);
        });
    }

    // --- 9. FUNGSI LOG MASUK / LOG KELUAR ---

    // Buka Modal Log Masuk
    loginButton.addEventListener('click', () => {
        loginModal.classList.remove('hidden');
        loginError.textContent = '';
        loginForm.reset();
    });

    // Tutup Modal Log Masuk
    closeLoginModal.addEventListener('click', () => {
        loginModal.classList.add('hidden');
    });

    // Kendalikan penghantaran borang log masuk
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;
        loginError.textContent = '';
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged akan mengendalikan selebihnya
            loginModal.classList.add('hidden');
        } catch (error) {
            console.error("Gagal log masuk: ", error.code);
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
                loginError.textContent = 'E-mel atau kata laluan salah.';
            } else {
                loginError.textContent = `Ralat: ${error.message}`;
            }
        }
    });

    // Kendalikan Log Keluar
    logoutButton.addEventListener('click', async () => {
        try {
            await signOut(auth);
            // Log masuk semula sebagai anonymous (penting!)
            await signInAnonymously(auth);
            // onAuthStateChanged akan mengendalikan kemas kini UI
        } catch (error) {
            console.error("Ralat log keluar: ", error);
        }
    });
    
    // --- 10. PENUTUP MODAL & FUNGSI MULA ---
    
    // Tutup modal edit pinjaman
    closeEditModal.addEventListener('click', () => {
        editLoanModal.classList.add('hidden');
    });

    // Pendengar klik umum untuk menutup modal (klik di luar)
    [loginModal, confirmModal, messageModal, editLoanModal, assetManagerModal, editAssetModal].forEach(modal => {
        if (modal) {
            modal.addEventListener('click', (e) => {
                // Tutup jika klik pada latar belakang (div paling luar)
                if (e.target === modal) {
                    // Modal khas tidak boleh ditutup dengan klik luar
                    if (modal !== confirmModal && modal !== messageModal) {
                         modal.classList.add('hidden');
                    }
                }
            });
        }
    });

    // Mulakan pendengar butang admin
    addAdminButtonListeners();
    // Tetapkan tarikh minimum pada borang
    setMinDates();
    // Mulakan borang permohonan
    loanForm.addEventListener('submit', handleFormSubmit);

}); // <-- Kurungan penutup untuk DOMContentLoaded


