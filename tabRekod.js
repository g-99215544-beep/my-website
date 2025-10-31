// (FIX) Alih keluar import Firebase yang rosak dari bahagian atas fail ini.

// Import modul Utiliti
import { showMessage, showConfirm, renderAssetItem, playSound } from './utils.js';

// Rujukan DOM
const adminPanel = document.getElementById('panel-admin-rekod');
const adminNav = document.getElementById('admin-nav');
const adminContent = document.getElementById('admin-content');
const schoolNameInput = document.getElementById('school-name-input');
const saveSchoolNameBtn = document.getElementById('save-school-name');
const bulkAssetForm = document.getElementById('bulk-asset-form');
const bulkAssetInput = document.getElementById('bulk-asset-input');

// Rujukan DOM - Panel Pengurus Pinjaman
const loanManagerPanel = document.getElementById('admin-panel-loans');
const pendingList = document.getElementById('pending-loan-list');
const pendingLoading = document.getElementById('pending-loan-loading');
const historyList = document.getElementById('history-loan-list');
const historyLoading = document.getElementById('history-loan-loading');
const historyFilter = document.getElementById('history-loan-filter');

// Rujukan DOM - Panel Pengurus Aset
const assetManagerPanel = document.getElementById('admin-panel-assets');
const assetManagerList = document.getElementById('asset-manager-list');
const assetManagerLoading = document.getElementById('asset-manager-loading');
const assetManagerFilter = document.getElementById('asset-manager-filter');

let db; // Akan ditetapkan oleh initTabRekod
let allLoans = []; // Simpan semua pinjaman
let allAssets = []; // Simpan semua aset
let currentAdminView = 'loans'; // 'loans' atau 'assets'

// Fungsi untuk memulakan tab rekod (Admin)
export function initTabRekod(database) {
    db = database;
    adminNav.addEventListener('click', handleAdminNavClick);
    saveSchoolNameBtn.addEventListener('click', saveSchoolName);
    bulkAssetForm.addEventListener('submit', handleBulkAssetAdd);
    historyFilter.addEventListener('input', (e) => filterAndDisplayHistory(e.target.value));
    assetManagerFilter.addEventListener('input', (e) => filterAndDisplayAssets(e.target.value));

    // Tambah pendengar untuk senarai (event delegation)
    pendingList.addEventListener('click', handlePendingListClick);
    historyList.addEventListener('click', handleHistoryListClick);
    assetManagerList.addEventListener('click', handleAssetManagerClick);
}

// Fungsi untuk tunjuk/sembunyi panel Admin (dipanggil dari script.js)
export function showAdminPanel(isAdmin) {
    const rekodTabButton = document.querySelector('button[data-tab="rekod"]');
    if (isAdmin) {
        rekodTabButton.classList.remove('hidden');
    } else {
        rekodTabButton.classList.add('hidden');
        // Jika admin log keluar semasa melihat tab admin, paksa kembali ke tab 'permohonan'
        if (adminPanel.classList.contains('active')) {
            document.querySelector('button[data-tab="permohonan"]').click();
        }
    }
}

// === PENGURUSAN SUB-NAVIGASI ADMIN ===

function handleAdminNavClick(e) {
    const clickedBtn = e.target.closest('button.admin-nav-button');
    if (!clickedBtn || clickedBtn.classList.contains('active')) return;
    
    currentAdminView = clickedBtn.dataset.panel;

    // Kemas kini butang
    adminNav.querySelectorAll('.admin-nav-button').forEach(btn => {
        btn.classList.remove('active', 'bg-blue-600', 'text-white');
        btn.classList.add('text-gray-600', 'hover:bg-gray-100');
    });
    clickedBtn.classList.add('active', 'bg-blue-600', 'text-white');
    clickedBtn.classList.remove('text-gray-600', 'hover:bg-gray-100');

    // Kemas kini panel
    adminContent.querySelectorAll('.admin-panel').forEach(panel => {
        panel.classList.add('hidden');
    });
    
    if (currentAdminView === 'loans') {
        loanManagerPanel.classList.remove('hidden');
    } else if (currentAdminView === 'assets') {
        assetManagerPanel.classList.remove('hidden');
    } else if (currentAdminView === 'settings') {
        document.getElementById('admin-panel-settings').classList.remove('hidden');
    }
}


// === PENGURUSAN TETAPAN (SETTINGS) ===

async function saveSchoolName() {
    const newName = schoolNameInput.value;
    if (!newName) {
        showMessage('Ralat', 'Nama sekolah tidak boleh kosong.');
        playSound('error');
        return;
    }
    
    const confirmed = await showConfirm('Simpan Nama Sekolah', `Anda pasti mahu menetapkan nama sekolah kepada "${newName}"?`);
    if (!confirmed) return;

    // Ambil ID Aplikasi (disediakan oleh Canvas)
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    
    try {
        // Laluan (path) dokumen: artifacts/{appId}/public/data/school_info/details
        // (FIX) Panggil window.firebase secara terus
        const schoolInfoRef = window.firebase.doc(db, `artifacts/${appId}/public/data/school_info`, 'details');
        await window.firebase.setDoc(schoolInfoRef, { name: newName });
        showMessage('Berjaya', 'Nama sekolah telah dikemas kini.');
        playSound('success');
    } catch (error) {
        console.error("Ralat simpan nama sekolah:", error);
        showMessage('Ralat', 'Gagal menyimpan nama sekolah.');
        playSound('error');
    }
}


// === PENGURUS PINJAMAN (LOAN MANAGER) ===

// Fungsi untuk menerima kemas kini pinjaman dari script.js
export function updateRekodPinjaman(loans) {
    allLoans = loans;
    
    // Paparkan pinjaman 'Pending'
    displayPendingLoans();
    
    // Paparkan sejarah (yang bukan 'Pending')
    filterAndDisplayHistory(historyFilter.value);
}

// Paparkan pinjaman 'Pending'
function displayPendingLoans() {
    pendingLoading.classList.add('hidden');
    pendingList.innerHTML = '';
    
    const pendingLoans = allLoans.filter(loan => loan.data.status === 'Pending');
    
    // Isih (sort) yang paling lama di atas
    pendingLoans.sort((a, b) => a.data.requestedAt?.toMillis() - b.data.requestedAt?.toMillis());

    if (pendingLoans.length > 0) {
        pendingLoans.forEach(loan => {
            pendingList.innerHTML += renderPendingLoanItem(loan.id, loan.data);
        });
    } else {
        pendingList.innerHTML = '<p class="text-gray-500 italic">Tiada permohonan pinjaman baharu.</p>';
    }
}

// Tapis dan paparkan sejarah pinjaman (Bukan 'Pending')
function filterAndDisplayHistory(searchTerm) {
    historyLoading.classList.add('hidden');
    historyList.innerHTML = '';
    
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    // Ambil semua KECUALI 'Pending'
    const historyLoans = allLoans.filter(loan => loan.data.status !== 'Pending');

    // Tapis berdasarkan carian
    const filteredLoans = historyLoans.filter(loan => {
        const name = loan.data.applicantName?.toLowerCase() || '';
        const ic = loan.data.applicantIC || '';
        const status = loan.data.status?.toLowerCase() || '';
        
        const assetMatch = loan.data.assets.some(asset => 
            (asset.name?.toLowerCase() || '').includes(lowerCaseSearchTerm) ||
            (asset.serialNumber?.toLowerCase() || '').includes(lowerCaseSearchTerm)
        );

        return name.includes(lowerCaseSearchTerm) || 
               ic.includes(lowerCaseSearchTerm) ||
               status.includes(lowerCaseSearchTerm) ||
               assetMatch;
    });

    if (filteredLoans.length > 0) {
        // Isih (sort) yang paling baru di atas
        filteredLoans.sort((a, b) => {
            const dateA = a.data.returnedAt || a.data.approvedAt || a.data.requestedAt;
            const dateB = b.data.returnedAt || b.data.approvedAt || b.data.requestedAt;
            return dateB?.toMillis() - dateA?.toMillis();
        });
        
        filteredLoans.forEach(loan => {
            historyList.innerHTML += renderHistoryLoanItem(loan.id, loan.data);
        });
    } else {
        if (historyLoans.length === 0) {
            historyList.innerHTML = '<p class="text-gray-500 italic">Tiada sejarah pinjaman lagi.</p>';
        } else {
            historyList.innerHTML = '<p class="text-gray-500 italic">Tiada rekod sepadan dengan carian anda.</p>';
        }
    }
}

// --- Paparan HTML untuk Pinjaman ---

function renderPendingLoanItem(loanId, loanData) {
    const requestedDate = loanData.requestedAt?.toDate().toLocaleString('ms-MY') || 'N/A';
    
    return `
        <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-3" data-id="${loanId}">
            <div>
                <h4 class="text-lg font-semibold text-gray-800">${loanData.applicantName}</h4>
                <p class="text-sm text-gray-500">No. K/P: ${loanData.applicantIC}</p>
                <p class="text-sm text-gray-500">Memohon pada: ${requestedDate}</p>
            </div>
            <p class="text-sm text-gray-600"><span class="font-medium">Tujuan:</span> ${loanData.purpose}</p>
            <p class="text-sm text-gray-600"><span class="font-medium">Tarikh:</span> ${new Date(loanData.loanDate).toLocaleDateString('ms-MY')} <span class="font-medium">hingga</span> ${new Date(loanData.returnDate).toLocaleDateString('ms-MY')}</p>
            
            <div class="pt-2">
                <h5 class="text-sm font-semibold text-gray-700 mb-1">Aset Dipohon:</h5>
                <ul class="list-disc list-inside space-y-1 pl-2">
                    ${loanData.assets.map(asset => `
                        <li class="text-sm text-gray-600">
                            ${asset.name} <span class="text-gray-400">(${asset.serialNumber || 'N/A'})</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
            
            <div class="flex gap-3 pt-2">
                <button data-action="approve" class="btn-approve flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded text-sm transition duration-150">
                    Luluskan
                </button>
                <button data-action="reject" class="btn-reject flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded text-sm transition duration-150">
                    Tolak
                </button>
            </div>
        </div>
    `;
}

function renderHistoryLoanItem(loanId, loanData) {
    let statusClass, statusText;
    switch (loanData.status) {
        case 'Approved':
            statusClass = 'bg-yellow-100 text-yellow-800';
            statusText = 'Dipinjam';
            break;
        case 'Completed':
            statusClass = 'bg-green-100 text-green-800';
            statusText = 'Dipulang';
            break;
        case 'Rejected':
            statusClass = 'bg-red-100 text-red-800';
            statusText = 'Ditolak';
            break;
        default:
            statusClass = 'bg-gray-100 text-gray-800';
            statusText = loanData.status;
    }
    
    const approvedDate = loanData.approvedAt?.toDate().toLocaleString('ms-MY');
    const returnedDate = loanData.returnedAt?.toDate().toLocaleString('ms-MY');

    return `
        <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-2" data-id="${loanId}">
            <div class="flex justify-between items-center">
                <h4 class="text-lg font-semibold text-gray-800">${loanData.applicantName}</h4>
                <span class="text-xs font-medium px-2.5 py-0.5 rounded-full ${statusClass}">${statusText}</span>
            </div>
            <p class="text-sm text-gray-500">No. K/P: ${loanData.applicantIC}</p>
            
            ${approvedDate ? `<p class="text-sm text-gray-500">Diluluskan: ${approvedDate} oleh ${loanData.approvedBy || 'Admin'}</p>` : ''}
            ${returnedDate ? `<p class="text-sm text-gray-500">Dipulangkan: ${returnedDate}</p>` : ''}

            <div class="pt-2">
                <h5 class="text-sm font-semibold text-gray-700 mb-1">Aset Terlibat:</h5>
                <ul class="list-disc list-inside space-y-1 pl-2">
                    ${loanData.assets.map(asset => `
                        <li class="text-sm text-gray-600">
                            ${asset.name} <span class="text-gray-400">(${asset.serialNumber || 'N/A'})</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
            
            ${loanData.status === 'Approved' ? `
            <div class="pt-2">
                <button data-action="return" class="btn-return w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded text-sm transition duration-150">
                    Tandakan Sebagai Dipulangkan
                </button>
            </div>
            ` : ''}
        </div>
    `;
}

// --- Tindakan (Actions) untuk Pinjaman ---

function handlePendingListClick(e) {
    const button = e.target.closest('button');
    if (!button) return;
    
    const action = button.dataset.action;
    const loanId = button.closest('.asset-item-admin, .p-4').dataset.id; // Dapatkan ID dari item induk
    
    if (action === 'approve') {
        handleApproveLoan(loanId, button);
    } else if (action === 'reject') {
        handleRejectLoan(loanId, button);
    }
}

function handleHistoryListClick(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const action = button.dataset.action;
    const loanId = button.closest('.asset-item-admin, .p-4').dataset.id;

    if (action === 'return') {
        handleReturnLoan(loanId, button);
    }
}

async function handleApproveLoan(loanId, button) {
    const loan = allLoans.find(l => l.id === loanId)?.data;
    if (!loan) return;

    const confirmed = await showConfirm('Luluskan Pinjaman', `Anda pasti mahu meluluskan pinjaman untuk ${loan.applicantName}?`);
    if (!confirmed) return;

    button.disabled = true;
    button.textContent = 'Memproses...';
    
    // Ambil ID Aplikasi (disediakan oleh Canvas)
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    try {
        // (FIX) Panggil window.firebase secara terus
        const batch = window.firebase.writeBatch(db);
        
        // 1. Kemas kini dokumen pinjaman (loan)
        const loanRef = window.firebase.doc(db, `artifacts/${appId}/public/data/loans`, loanId);
        batch.update(loanRef, {
            status: 'Approved',
            approvedAt: window.firebase.serverTimestamp(),
            approvedBy: 'Admin' // Nanti boleh tukar ke nama admin jika ada sistem auth penuh
        });

        // 2. Kemas kini semua aset yang terlibat
        loan.assets.forEach(asset => {
            const assetRef = window.firebase.doc(db, `artifacts/${appId}/public/data/assets`, asset.id);
            batch.update(assetRef, {
                status: 'On Loan',
                currentLoanId: loanId // Pastikan ID pinjaman dikaitkan
            });
        });

        await batch.commit();
        showMessage('Pinjaman Diluluskan', 'Pinjaman telah diluluskan dan aset telah dikemas kini.');
        playSound('success');
        // UI akan dikemas kini secara automatik oleh onSnapshot

    } catch (error) {
        console.error("Ralat meluluskan pinjaman:", error);
        showMessage('Ralat', 'Gagal meluluskan pinjaman.');
        playSound('error');
        button.disabled = false;
        button.textContent = 'Luluskan';
    }
}

async function handleRejectLoan(loanId, button) {
    const loan = allLoans.find(l => l.id === loanId)?.data;
    if (!loan) return;

    const confirmed = await showConfirm('Tolak Pinjaman', `Anda pasti mahu menolak pinjaman untuk ${loan.applicantName}?`);
    if (!confirmed) return;

    button.disabled = true;
    button.closest('div').querySelector('.btn-approve').disabled = true;
    button.textContent = 'Memproses...';
    
    // Ambil ID Aplikasi (disediakan oleh Canvas)
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    try {
        // (FIX) Panggil window.firebase secara terus
        const batch = window.firebase.writeBatch(db);
        
        // 1. Kemas kini dokumen pinjaman (loan)
        const loanRef = window.firebase.doc(db, `artifacts/${appId}/public/data/loans`, loanId);
        batch.update(loanRef, {
            status: 'Rejected',
            approvedAt: window.firebase.serverTimestamp(), // Tandakan masa ditolak
            approvedBy: 'Admin'
        });

        // 2. Kemas kini semua aset yang terlibat (kembali ke 'Available')
        loan.assets.forEach(asset => {
            const assetRef = window.firebase.doc(db, `artifacts/${appId}/public/data/assets`, asset.id);
            batch.update(assetRef, {
                status: 'Available',
                currentLoanId: null // Padam kaitan ID pinjaman
            });
        });

        await batch.commit();
        showMessage('Pinjaman Ditolak', 'Permohonan pinjaman telah ditolak.');
        playSound('success');
        // UI akan dikemas kini secara automatik oleh onSnapshot

    } catch (error) {
        console.error("Ralat menolak pinjaman:", error);
        showMessage('Ralat', 'Gagal menolak pinjaman.');
        playSound('error');
        button.disabled = false;
        button.closest('div').querySelector('.btn-approve').disabled = false;
        button.textContent = 'Tolak';
    }
}

async function handleReturnLoan(loanId, button) {
    const loan = allLoans.find(l => l.id === loanId)?.data;
    if (!loan) return;

    const confirmed = await showConfirm('Pulangan Aset', `Sahkan bahawa ${loan.applicantName} telah memulangkan semua aset?`);
    if (!confirmed) return;

    button.disabled = true;
    button.textContent = 'Memproses...';
    
    // Ambil ID Aplikasi (disediakan oleh Canvas)
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    try {
        // (FIX) Panggil window.firebase secara terus
        const batch = window.firebase.writeBatch(db);
        
        // 1. Kemas kini dokumen pinjaman (loan)
        const loanRef = window.firebase.doc(db, `artifacts/${appId}/public/data/loans`, loanId);
        batch.update(loanRef, {
            status: 'Completed',
            returnedAt: window.firebase.serverTimestamp()
        });

        // 2. Kemas kini semua aset yang terlibat (kembali ke 'Available')
        loan.assets.forEach(asset => {
            const assetRef = window.firebase.doc(db, `artifacts/${appId}/public/data/assets`, asset.id);
            batch.update(assetRef, {
                status: 'Available',
                currentLoanId: null // Padam kaitan ID pinjaman
            });
        });

        await batch.commit();
        showMessage('Aset Dipulangkan', 'Aset telah ditandakan sebagai dipulangkan dan kini tersedia.');
        playSound('success');
        // UI akan dikemas kini secara automatik oleh onSnapshot

    } catch (error) {
        console.error("Ralat pulangan aset:", error);
        showMessage('Ralat', 'Gagal mengemas kini status pulangan.');
        playSound('error');
        button.disabled = false;
        button.textContent = 'Tandakan Sebagai Dipulangkan';
    }
}


// === PENGURUS ASET (ASSET MANAGER) ===

// Fungsi untuk menerima kemas kini aset dari script.js
export function updateRekodAssets(assets) {
    allAssets = assets;
    // Paparkan aset jika panel aset sedang aktif
    if (currentAdminView === 'assets') {
        filterAndDisplayAssets(assetManagerFilter.value);
    }
}

// Fungsi untuk menapis dan memaparkan aset dalam panel admin
function filterAndDisplayAssets(searchTerm) {
    assetManagerLoading.classList.add('hidden');
    assetManagerList.innerHTML = '';
    
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    // Tapis berdasarkan carian
    const filteredAssets = allAssets.filter(asset => {
        const name = asset.data.name?.toLowerCase() || '';
        const serial = asset.data.serialNumber?.toLowerCase() || '';
        const category = asset.data.category?.toLowerCase() || '';
        const status = asset.data.status?.toLowerCase() || '';
        
        return name.includes(lowerCaseSearchTerm) || 
               serial.includes(lowerCaseSearchTerm) ||
               category.includes(lowerCaseSearchTerm) ||
               status.includes(lowerCaseSearchTerm);
    });

    if (filteredAssets.length > 0) {
        // Isihan (sort) sama seperti di senarai utama
        filteredAssets.sort((a, b) => a.data.name.localeCompare(b.data.name));
        
        filteredAssets.forEach(asset => {
            assetManagerList.innerHTML += renderAssetManagerItem(asset.id, asset.data);
        });
    } else {
        if (allAssets.length === 0) {
            assetManagerList.innerHTML = '<p class="text-gray-500 italic">Tiada aset wujud dalam pangkalan data. Gunakan borang "Tambah Aset Pukal" untuk bermula.</p>';
        } else {
            assetManagerList.innerHTML = '<p class="text-gray-500 italic">Tiada aset sepadan dengan carian anda.</p>';
        }
    }
}

// Paparan HTML untuk Item Pengurus Aset
function renderAssetManagerItem(assetId, assetData) {
    const { name, status, condition, serialNumber, category } = assetData;
    
    let statusClass, statusText;
    switch (status) {
        case 'Available':
            statusClass = 'bg-green-100 text-green-800';
            statusText = 'Tersedia';
            break;
        case 'On Loan':
            statusClass = 'bg-yellow-100 text-yellow-800';
            statusText = 'Dipinjam';
            break;
        case 'Under Maintenance':
            statusClass = 'bg-red-100 text-red-800';
            statusText = 'Rosak';
            break;
        default:
            statusClass = 'bg-gray-100 text-gray-800';
            statusText = status;
    }

    return `
        <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm space-y-3" data-id="${assetId}">
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="text-lg font-semibold text-gray-800">${name}</h4>
                    <p class="text-sm text-gray-500">No. Siri: ${serialNumber || 'N/A'}</p>
                    <p class="text-sm text-gray-500">Kategori: ${category || 'N/A'}</p>
                </div>
                <span class="text-xs font-medium px-2.5 py-0.5 rounded-full ${statusClass} flex-shrink-0">${statusText}</span>
            </div>
            
            <!-- Borang Kemas Kini (Tersorok) -->
            <form class="update-asset-form hidden space-y-2" data-action="update-form">
                <input type="text" value="${name}" data-field="name" class="form-input w-full" placeholder="Nama Aset">
                <input type="text" value="${serialNumber || ''}" data-field="serialNumber" class="form-input w-full" placeholder="No. Siri">
                <select data-field="category" class="form-input w-full">
                    <option value="Laptop" ${category === 'Laptop' ? 'selected' : ''}>Laptop</option>
                    <option value="Tablet" ${category === 'Tablet' ? 'selected' : ''}>Tablet</option>
                    <option value="Projector" ${category === 'Projector' ? 'selected' : ''}>Projector</option>
                    <option value="Lain-lain" ${category === 'Lain-lain' ? 'selected' : ''}>Lain-lain</option>
                </select>
                <select data-field="condition" class="form-input w-full">
                    <option value="Baik" ${condition === 'Baik' ? 'selected' : ''}>Baik</option>
                    <option value="Rosak" ${condition === 'Rosak' ? 'selected' : ''}>Rosak</option>
                </select>
                ${status === 'Available' || status === 'Under Maintenance' ? `
                <select data-field="status" class="form-input w-full">
                    <option value="Available" ${status === 'Available' ? 'selected' : ''}>Tersedia</option>
                    <option value="Under Maintenance" ${status === 'Under Maintenance' ? 'selected' : ''}>Dalam Selenggaraan</option>
                </select>
                ` : ''}
                <div class="flex gap-2">
                    <button type="submit" data-action="save-update" class="btn-save-update flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded text-sm">Simpan</button>
                    <button type="button" data-action="cancel-update" class="btn-cancel-update flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded text-sm">Batal</button>
                </div>
            </form>
            
            <!-- Butang Tindakan (Nampak) -->
            <div class="asset-actions flex gap-3 pt-2" data-action="buttons">
                <button data-action="edit" class="btn-edit flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded text-sm transition duration-150" ${status === 'On Loan' ? 'disabled' : ''}>
                    Kemas Kini
                </button>
                <button data-action="delete" class="btn-delete flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded text-sm transition duration-150" ${status === 'On Loan' ? 'disabled' : ''}>
                    Padam
                </button>
            </div>
            ${status === 'On Loan' ? '<p class="text-xs text-center text-red-600 italic mt-2">Aset tidak boleh dikemas kini atau dipadam semasa sedang dipinjam.</p>' : ''}
        </div>
    `;
}

// --- Tindakan (Actions) untuk Aset ---

function handleAssetManagerClick(e) {
    e.preventDefault(); // Hentikan penghantaran borang jika butang submit diklik
    const button = e.target.closest('button');
    if (!button) return;

    const action = button.dataset.action;
    const itemElement = button.closest('.p-4');
    const assetId = itemElement.dataset.id;

    switch (action) {
        case 'edit':
            // Tunjukkan borang kemas kini
            itemElement.querySelector('.update-asset-form').classList.remove('hidden');
            itemElement.querySelector('.asset-actions').classList.add('hidden');
            break;
        case 'cancel-update':
            // Sembunyikan borang kemas kini
            itemElement.querySelector('.update-asset-form').classList.add('hidden');
            itemElement.querySelector('.asset-actions').classList.remove('hidden');
            break;
        case 'save-update':
            handleUpdateAsset(assetId, itemElement, button);
            break;
        case 'delete':
            handleDeleteAsset(assetId, button);
            break;
    }
}

async function handleUpdateAsset(assetId, itemElement, button) {
    const form = itemElement.querySelector('.update-asset-form');
    const asset = allAssets.find(a => a.id === assetId)?.data;
    if (!asset) return;

    button.disabled = true;
    button.textContent = 'Menyimpan...';

    // Kumpul data baru dari borang
    const newData = {};
    form.querySelectorAll('input, select').forEach(input => {
        newData[input.dataset.field] = input.value;
    });

    // Ambil ID Aplikasi (disediakan oleh Canvas)
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    try {
        // (FIX) Panggil window.firebase secara terus
        const assetRef = window.firebase.doc(db, `artifacts/${appId}/public/data/assets`, assetId);
        await window.firebase.updateDoc(assetRef, newData);
        
        showMessage('Aset Dikemas Kini', `Aset "${newData.name}" telah berjaya dikemas kini.`);
        playSound('success');
        // UI akan dikemas kini secara automatik oleh onSnapshot
        // Sembunyikan borang selepas berjaya
        form.classList.add('hidden');
        itemElement.querySelector('.asset-actions').classList.remove('hidden');

    } catch (error) {
        console.error("Ralat mengemas kini aset:", error);
        showMessage('Ralat', 'Gagal mengemas kini aset.');
        playSound('error');
    } finally {
        button.disabled = false;
        button.textContent = 'Simpan';
    }
}

async function handleDeleteAsset(assetId, button) {
    const asset = allAssets.find(a => a.id === assetId)?.data;
    if (!asset || asset.status === 'On Loan') {
        showMessage('Ralat', 'Aset yang sedang dipinjam tidak boleh dipadam.');
        playSound('error');
        return;
    }

    const confirmed = await showConfirm('Padam Aset', `Anda pasti mahu memadam aset "${asset.name}" (${asset.serialNumber})? Tindakan ini tidak boleh diundur.`);
    if (!confirmed) return;

    button.disabled = true;
    button.textContent = 'Memadam...';
    
    // Ambil ID Aplikasi (disediakan oleh Canvas)
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    try {
        // (FIX) Panggil window.firebase secara terus
        const assetRef = window.firebase.doc(db, `artifacts/${appId}/public/data/assets`, assetId);
        await window.firebase.deleteDoc(assetRef);
        
        showMessage('Aset Dipadam', `Aset "${asset.name}" telah berjaya dipadam.`);
        playSound('success');
        // UI akan dikemas kini secara automatik oleh onSnapshot

    } catch (error) {
        console.error("Ralat memadam aset:", error);
        showMessage('Ralat', 'Gagal memadam aset.');
        playSound('error');
    }
    // Tidak perlu 'finally' kerana item akan hilang dari UI
}

// --- Tambah Aset Pukal ---

async function handleBulkAssetAdd(e) {
    e.preventDefault();
    const text = bulkAssetInput.value.trim();
    if (!text) return;

    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return;

    const confirmed = await showConfirm('Tambah Aset Pukal', `Anda pasti mahu menambah ${lines.length} aset baharu?`);
    if (!confirmed) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = `Memproses ${lines.length} aset...`;

    // Ambil ID Aplikasi (disediakan oleh Canvas)
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    // Format: Nama, NoSiri, Kategori, Keadaan
    // Contoh: 
    // Laptop Dell 001, DELL001, Laptop, Baik
    // Projector Epson, EPS001, Projector, Rosak
    
    let successCount = 0;
    let errorCount = 0;

    try {
        // (FIX) Panggil window.firebase secara terus
        const batch = window.firebase.writeBatch(db);
        const assetsCollectionRef = window.firebase.collection(db, `artifacts/${appId}/public/data/assets`);

        for (const line of lines) {
            const parts = line.split(',').map(p => p.trim());
            if (parts.length < 2) { // Sekurang-kurangnya perlu Nama dan NoSiri
                errorCount++;
                continue;
            }

            const [name, serialNumber, category, condition] = parts;
            
            // Periksa jika No Siri sudah wujud (untuk mengelakkan duplikasi)
            const q = window.firebase.query(assetsCollectionRef, window.firebase.where("serialNumber", "==", serialNumber));
            const querySnapshot = await window.firebase.getDocs(q);
            
            if (!querySnapshot.empty) {
                // Sudah wujud, langkau
                errorCount++;
                console.warn(`Aset dengan No Siri ${serialNumber} sudah wujud. Dilangkau.`);
                continue;
            }
            
            // Cipta dokumen baru dalam batch
            const newAssetRef = window.firebase.doc(assetsCollectionRef); // Auto-generate ID
            batch.set(newAssetRef, {
                name: name,
                serialNumber: serialNumber,
                category: category || 'Lain-lain',
                condition: condition || 'Baik',
                status: (condition === 'Rosak') ? 'Under Maintenance' : 'Available',
                currentLoanId: null,
                addedAt: window.firebase.serverTimestamp()
            });
            successCount++;
        }
        
        // Laksanakan batch
        if (successCount > 0) {
            await batch.commit();
        }

        showMessage('Proses Selesai', `${successCount} aset berjaya ditambah. ${errorCount} aset gagal (mungkin duplikasi atau format salah).`);
        playSound('success');
        bulkAssetInput.value = ''; // Kosongkan textarea

    } catch (error) {
        console.error("Ralat menambah aset pukal:", error);
        showMessage('Ralat Pukal', 'Berlaku ralat semasa menyimpan aset. Sebahagian mungkin telah disimpan.');
        playSound('error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Tambah Aset';
    }
}

