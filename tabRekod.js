// === TABREKOD.JS ===
// Menguruskan semua logik untuk Tab 4: Rekod (Panel Admin)

// Import fungsi utama dari Firebase (melalui tetingkap global)
const { doc, updateDoc, deleteDoc, writeBatch, collection, addDoc, serverTimestamp, getDocs, where, query } = window.firebase;
// Import fungsi bantuan
import { showMessage, showConfirm, playSound, renderAssetItem, openEditAssetModal, closeEditAssetModal, handleSaveAsset } from './utils.js';

// Rujukan global dari script.js
let db;
let allAssets = []; // Cache tempatan aset
let allLoans = []; // Cache tempatan pinjaman

// Rujukan DOM Panel Admin
const adminPanel = document.getElementById('admin-panel');
const loansListBody = document.getElementById('loans-list');
const pendingBadge = document.getElementById('pending-badge');
const pendingBadgeMain = document.getElementById('pending-badge-main');
const clearRecordsBtn = document.getElementById('clear-records-btn');

// Rujukan DOM Borang Tambah Pukal
const bulkAddForm = document.getElementById('bulk-add-form');
const bulkAddButton = document.getElementById('bulk-add-button');
const bulkAddStatus = document.getElementById('bulk-add-status');

// Rujukan DOM Edit Pinjaman
const editLoanModal = document.getElementById('edit-loan-modal');
const editLoanForm = document.getElementById('edit-loan-form');
const closeEditLoanModalBtn = document.getElementById('close-edit-modal');
const editLoanError = document.getElementById('edit-loan-error');

// Rujukan DOM Pengurus Aset
const openAssetManagerBtn = document.getElementById('open-asset-manager-btn');
const assetManagerModal = document.getElementById('asset-manager-modal');
const closeAssetManagerBtn = document.getElementById('close-asset-manager-btn');
const assetManagerList = document.getElementById('asset-manager-list');
const editAssetModal = document.getElementById('edit-asset-modal');
const editAssetForm = document.getElementById('edit-asset-form');
const closeEditAssetBtn = document.getElementById('close-edit-asset-btn');


// Fungsi utama untuk memulakan tab ini
export function initTabRekod(database) {
    db = database;
    
    // Pindahkan panel admin ke dalam tab
    const adminPanelContainer = document.getElementById('panel-admin-rekod');
    adminPanelContainer.appendChild(adminPanel);

    // Tambah pendengar acara (Event Listeners)
    loansListBody.addEventListener('click', handleLoanAction);
    clearRecordsBtn.addEventListener('click', clearOldRecords);
    
    // Borang Tambah Pukal
    bulkAddForm.addEventListener('submit', handleBulkAdd);
    
    // Modal Edit Pinjaman
    editLoanForm.addEventListener('submit', handleSaveLoanEdit);
    closeEditLoanModalBtn.addEventListener('click', () => editLoanModal.classList.add('hidden'));

    // Modal Pengurus Aset
    openAssetManagerBtn.addEventListener('click', openAssetManager);
    closeAssetManagerBtn.addEventListener('click', () => assetManagerModal.classList.add('hidden'));
    assetManagerList.addEventListener('click', handleAssetManagerAction);
    
    // Modal Edit Aset
    editAssetForm.addEventListener('submit', (e) => handleSaveAsset(e, db));
    closeEditAssetBtn.addEventListener('click', closeEditAssetModal);
}

// Tunjukkan panel admin jika log masuk
export function showAdminPanel(isAdmin) {
    const rekodTabButton = document.querySelector('button[data-tab="rekod"]');
    if (isAdmin) {
        rekodTabButton.classList.remove('hidden');
        adminPanel.classList.remove('hidden'); // Tunjukkan panel sebenar
    } else {
        rekodTabButton.classList.add('hidden');
        adminPanel.classList.add('hidden'); // Sembunyikan panel sebenar
    }
}

// Kemas kini paparan rekod pinjaman (dipanggil dari script.js)
export function updateRekodPinjaman(loans) {
    allLoans = loans; // Simpan cache
    loansListBody.innerHTML = '';
    
    // Isih: Pending dahulu, kemudian mengikut tarikh permohonan (terbaru dahulu)
    loans.sort((a, b) => {
        const statusA = a.data.status;
        const statusB = b.data.status;
        const dateA = a.data.requestedAt ? a.data.requestedAt.toMillis() : 0;
        const dateB = b.data.requestedAt ? b.data.requestedAt.toMillis() : 0;

        // Utamakan 'Pending'
        if (statusA === 'Pending' && statusB !== 'Pending') return -1;
        if (statusA !== 'Pending' && statusB === 'Pending') return 1;

        // Jika kedua-dua 'Pending' atau kedua-dua bukan 'Pending', isih ikut tarikh (terbaru dahulu)
        return dateB - dateA;
    });

    let pendingCount = 0;

    if (loans.length === 0) {
        loansListBody.innerHTML = '<tr><td colspan="8" class="px-6 py-4 text-center text-gray-500 italic">Tiada rekod pinjaman ditemui.</td></tr>';
    } else {
        loans.forEach(loan => {
            const rowHtml = renderLoanRow(loan.id, loan.data);
            loansListBody.innerHTML += rowHtml;
            if (loan.data.status === 'Pending') {
                pendingCount++;
            }
        });
    }

    // Kemas kini 'badge' notifikasi
    if (pendingCount > 0) {
        pendingBadge.textContent = pendingCount;
        pendingBadgeMain.textContent = pendingCount;
        pendingBadge.classList.remove('hidden');
        pendingBadgeMain.classList.remove('hidden');
    } else {
        pendingBadge.classList.add('hidden');
        pendingBadgeMain.classList.add('hidden');
    }
}

// Kemas kini cache aset (dipanggil dari script.js)
export function updateRekodAssets(assets) {
    allAssets = assets;
    // Jika modal pengurus aset terbuka, muat semula senarainya
    if (!assetManagerModal.classList.contains('hidden')) {
        openAssetManager();
    }
}


// --- FUNGSI-FUNGSI BANTUAN ---

// (A) Logik Paparan Jadual Pinjaman

function renderLoanRow(id, data) {
    const assetsHtml = data.assets.map(asset => 
        `<li class="text-sm" title="ID: ${asset.id}">${asset.name} ${asset.groupName ? `(${asset.groupName})` : ''}</li>`
    ).join('');
    
    const startDate = new Date(data.startDate).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' });
    const endDate = new Date(data.endDate).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short' });

    let statusHtml = '';
    let actionsHtml = '';

    switch (data.status) {
        case 'Pending':
            statusHtml = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Menunggu</span>';
            actionsHtml = `
                <button class="approve-btn text-green-600 hover:text-green-800" title="Luluskan">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg>
                </button>
                <button class="reject-btn text-red-600 hover:text-red-800" title="Tolak">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" /></svg>
                </button>
                <button class="edit-btn text-blue-600 hover:text-blue-800" title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                </button>
            `;
            break;
        case 'Approved':
            statusHtml = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Diluluskan</span>';
            actionsHtml = `
                <button class="return-btn text-blue-600 hover:text-blue-800" title="Tanda Sbg Dipulangkan">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clip-rule="evenodd" /></svg>
                </button>
            `;
            break;
        case 'Returned':
            statusHtml = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">Dipulangkan</span>';
            actionsHtml = `
                <button class="delete-btn text-gray-400 hover:text-red-600" title="Padam Rekod">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                </button>
            `;
            break;
        case 'Rejected':
            statusHtml = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Ditolak</span>';
            actionsHtml = `
                <button class="delete-btn text-gray-400 hover:text-red-600" title="Padam Rekod">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                </button>
            `;
            break;
        default:
            statusHtml = `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">${data.status}</span>`;
    }

    return `
        <tr data-id="${id}" class="${data.status === 'Pending' ? 'bg-yellow-50' : ''}">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center space-x-2">
                    ${actionsHtml}
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${data.teacherName}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-700">${data.teacherIC}</div>
            </td>
            <td class="px-6 py-4">
                <ul class="list-disc list-inside">${assetsHtml}</ul>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-700">${startDate}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-700">${endDate}</div>
            </td>
            <td class="px-6 py-4">
                <div class="text-sm text-gray-700 max-w-xs truncate" title="${data.purpose}">${data.purpose}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${statusHtml}
            </td>
        </tr>
    `;
}

// (B) Logik Tindakan Jadual Pinjaman

async function handleLoanAction(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const row = button.closest('tr');
    const loanId = row.dataset.id;
    const loan = allLoans.find(l => l.id === loanId)?.data;
    if (!loan) return;

    const assetIds = loan.assets.map(a => a.id);

    // LULUSKAN
    if (button.classList.contains('approve-btn')) {
        const confirmed = await showConfirm('Luluskan Pinjaman', `Anda pasti mahu luluskan permohonan untuk:<br><strong>${loan.teacherName}</strong>?`);
        if (confirmed) {
            try {
                const batch = writeBatch(db);
                // 1. Kemas kini status pinjaman
                const loanRef = doc(db, 'loans', loanId);
                batch.update(loanRef, { status: 'Approved' });
                // 2. Kemas kini status semua aset berkaitan
                assetIds.forEach(id => {
                    const assetRef = doc(db, 'assets', id);
                    batch.update(assetRef, { status: 'Dipinjam' });
                });
                await batch.commit();
                playSound('success');
            } catch (error) {
                console.error("Ralat meluluskan: ", error);
                showMessage('Ralat', `Gagal meluluskan: ${error.message}`);
            }
        }
    }
    
    // TOLAK
    else if (button.classList.contains('reject-btn')) {
        const confirmed = await showConfirm('Tolak Permohonan', `Anda pasti mahu tolak permohonan untuk:<br><strong>${loan.teacherName}</strong>?`);
        if (confirmed) {
            try {
                const batch = writeBatch(db);
                // 1. Kemas kini status pinjaman
                const loanRef = doc(db, 'loans', loanId);
                batch.update(loanRef, { status: 'Rejected' });
                // 2. Kembalikan status aset kepada 'Tersedia'
                assetIds.forEach(id => {
                    const assetRef = doc(db, 'assets', id);
                    batch.update(assetRef, { status: 'Tersedia' });
                });
                await batch.commit();
                playSound('error');
            } catch (error) {
                console.error("Ralat menolak: ", error);
                showMessage('Ralat', `Gagal menolak: ${error.message}`);
            }
        }
    }
    
    // PULANGKAN
    else if (button.classList.contains('return-btn')) {
        const confirmed = await showConfirm('Sahkan Pemulangan', `Sahkan <strong>${loan.teacherName}</strong> telah memulangkan semua aset?`);
        if (confirmed) {
            try {
                const batch = writeBatch(db);
                // 1. Kemas kini status pinjaman
                const loanRef = doc(db, 'loans', loanId);
                batch.update(loanRef, { status: 'Returned' });
                // 2. Kembalikan status aset kepada 'Tersedia'
                assetIds.forEach(id => {
                    const assetRef = doc(db, 'assets', id);
                    batch.update(assetRef, { status: 'Tersedia' });
                });
                await batch.commit();
                playSound('success');
            } catch (error) {
                console.error("Ralat memulangkan: ", error);
                showMessage('Ralat', `Gagal memulangkan: ${error.message}`);
            }
        }
    }
    
    // EDIT
    else if (button.classList.contains('edit-btn')) {
        // Buka modal edit
        document.getElementById('edit-loan-id').value = loanId;
        document.getElementById('edit-teacherName').value = loan.teacherName;
        document.getElementById('edit-teacherIC').value = loan.teacherIC;
        document.getElementById('edit-startDate').value = loan.startDate;
        document.getElementById('edit-endDate').value = loan.endDate;
        document.getElementById('edit-purpose').value = loan.purpose;
        document.getElementById('edit-item-list').innerHTML = loan.assets.map(a => `<li>${a.name}</li>`).join('');
        editLoanError.textContent = '';
        editLoanModal.classList.remove('hidden');
    }
    
    // PADAM REKOD (DELETE)
    else if (button.classList.contains('delete-btn')) {
        const confirmed = await showConfirm('Padam Rekod', `Anda pasti mahu padam rekod ini secara kekal?<br><strong>${loan.teacherName} (${loan.status})</strong><br><small>Tindakan ini tidak akan memulangkan aset jika ia masih 'Diluluskan'.</small>`);
        if (confirmed) {
            try {
                await deleteDoc(doc(db, 'loans', loanId));
                playSound('success');
            } catch (error) {
                console.error("Ralat memadam: ", error);
                showMessage('Ralat', `Gagal memadam: ${error.message}`);
            }
        }
    }
}

// (C) Logik Modal Edit Pinjaman

async function handleSaveLoanEdit(e) {
    e.preventDefault();
    const loanId = document.getElementById('edit-loan-id').value;
    const saveButton = document.getElementById('edit-loan-submit');
    saveButton.disabled = true;
    saveButton.textContent = 'Menyimpan...';
    editLoanError.textContent = '';

    const updatedData = {
        teacherName: document.getElementById('edit-teacherName').value,
        teacherIC: document.getElementById('edit-teacherIC').value,
        startDate: document.getElementById('edit-startDate').value,
        endDate: document.getElementById('edit-endDate').value,
        purpose: document.getElementById('edit-purpose').value,
    };

    try {
        const loanRef = doc(db, 'loans', loanId);
        await updateDoc(loanRef, updatedData);
        editLoanModal.classList.add('hidden');
        playSound('success');
    } catch (error) {
        console.error("Ralat menyimpan editan pinjaman: ", error);
        editLoanError.textContent = `Ralat: ${error.message}`;
        playSound('error');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Simpan Perubahan';
    }
}

// (D) Logik Kosongkan Rekod Lama

async function clearOldRecords() {
    const confirmed = await showConfirm(
        'Kosongkan Rekod Lama',
        "Anda pasti mahu memadam semua rekod yang berstatus 'Dipulangkan' atau 'Ditolak' secara kekal?<br><br><strong>Tindakan ini tidak boleh diundur.</strong>"
    );
    
    if (!confirmed) return;

    const recordsToDelete = allLoans.filter(l => l.data.status === 'Returned' || l.data.status === 'Rejected');
    
    if (recordsToDelete.length === 0) {
        showMessage('Tiada Rekod', 'Tiada rekod lama (Dipulangkan/Ditolak) untuk dipadam.');
        return;
    }

    try {
        const batch = writeBatch(db);
        recordsToDelete.forEach(loan => {
            const loanRef = doc(db, 'loans', loan.id);
            batch.delete(loanRef);
        });
        await batch.commit();
        showMessage('Berjaya', `Berjaya memadam ${recordsToDelete.length} rekod lama.`);
        playSound('success');
    } catch (error) {
        console.error("Ralat memadam rekod lama: ", error);
        showMessage('Ralat', `Gagal memadam rekod: ${error.message}`);
        playSound('error');
    }
}

// (E) Logik Tambah Aset Pukal

async function handleBulkAdd(e) {
    e.preventDefault();
    bulkAddButton.disabled = true;
    bulkAddButton.textContent = 'Memproses...';
    bulkAddStatus.textContent = '';

    const baseName = document.getElementById('baseName').value.trim();
    const groupName = document.getElementById('groupName').value.trim();
    const quantity = parseInt(document.getElementById('quantity').value, 10);
    const category = document.getElementById('category').value;

    if (quantity < 1 || quantity > 100) {
        bulkAddStatus.textContent = 'Ralat: Kuantiti mesti antara 1 dan 100.';
        bulkAddStatus.className = 'text-sm mt-2 text-red-600';
        bulkAddButton.disabled = false;
        bulkAddButton.textContent = 'Tambah Aset';
        playSound('error');
        return;
    }
    
    const isGrouped = groupName !== '';

    const confirmed = await showConfirm(
        'Tambah Aset Pukal',
        `Anda pasti mahu menambah ${quantity} aset dengan nama asas "${baseName}"?`
    );

    if (!confirmed) {
        bulkAddButton.disabled = false;
        bulkAddButton.textContent = 'Tambah Aset';
        return;
    }

    try {
        const batch = writeBatch(db);
        for (let i = 1; i <= quantity; i++) {
            const assetName = `${baseName} ${i}`;
            const assetRef = doc(collection(db, 'assets')); // Cipta rujukan baru
            batch.set(assetRef, {
                name: assetName,
                category: category,
                status: 'Tersedia', // 'Tersedia', 'Dipinjam', 'Rosak', 'Dipohon'
                groupName: groupName,
                isGroupChild: isGrouped, // Tandakan sebagai sebahagian dari kumpulan
                createdAt: serverTimestamp(),
                imageUrl: '',
                specs: ''
            });
        }
        await batch.commit();

        bulkAddStatus.textContent = `Berjaya! ${quantity} aset telah ditambah.`;
        bulkAddStatus.className = 'text-sm mt-2 text-green-600';
        bulkAddForm.reset();
        playSound('success');

    } catch (error) {
        console.error("Ralat menambah aset pukal: ", error);
        bulkAddStatus.textContent = `Ralat: ${error.message}`;
        bulkAddStatus.className = 'text-sm mt-2 text-red-600';
        playSound('error');
    } finally {
        bulkAddButton.disabled = false;
        bulkAddButton.textContent = 'Tambah Aset';
    }
}

// (F) Logik Pengurus Aset (Asset Manager)

function openAssetManager() {
    assetManagerList.innerHTML = ''; // Kosongkan
    
    // Isih aset (kumpulan dahulu, kemudian mengikut nama)
    const sortedAssets = [...allAssets].sort((a, b) => {
        const groupA = a.data.groupName || 'zzzz'; // Letak yang tiada kumpulan di bawah
        const groupB = b.data.groupName || 'zzzz';
        const nameA = a.data.name.toLowerCase();
        const nameB = b.data.name.toLowerCase();

        if (groupA < groupB) return -1;
        if (groupA > groupB) return 1;
        
        // Jika kumpulan sama, isih ikut nama
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });

    if (sortedAssets.length === 0) {
        assetManagerList.innerHTML = '<p class="text-gray-500 italic">Tiada aset ditemui.</p>';
    } else {
        sortedAssets.forEach(asset => {
            assetManagerList.innerHTML += renderAssetItem(asset, 'manager', allAssets);
        });
    }
    
    assetManagerModal.classList.remove('hidden');
}

async function handleAssetManagerAction(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const assetId = button.dataset.assetId;
    if (!assetId) {
        // Ini mungkin butang 'Salin ke Kumpulan' dalam modal edit
        const assetIdFromModal = document.getElementById('edit-asset-id').value;
        const assetFromModal = allAssets.find(a => a.id === assetIdFromModal);
        if (button.id === 'copy-to-group-btn' && assetFromModal) {
            // Logik 'Salin ke Kumpulan' dikendalikan dalam utils.js (melalui event listener)
            // Cuma pastikan ia tidak dianggap sebagai tindakan lain
            return; 
        }
        return; // Tiada ID aset, abaikan
    }

    const asset = allAssets.find(a => a.id === assetId);
    if (!asset) return;

    // EDIT ASET
    if (button.classList.contains('edit-asset-btn')) {
        openEditAssetModal(asset, allAssets);
    }
    
    // PADAM ASET
    else if (button.classList.contains('delete-asset-btn')) {
        if (asset.data.status !== 'Tersedia') {
            showMessage('Ralat', 'Hanya aset yang berstatus "Tersedia" boleh dipadam.');
            return;
        }
        
        const confirmed = await showConfirm(
            'Padam Aset',
            `Anda pasti mahu memadam aset <strong>${asset.data.name}</strong> secara kekal?`
        );
        
        if (confirmed) {
            try {
                // Periksa jika aset ini ada dalam mana-mana rekod pinjaman (walaupun lama)
                const q = query(collection(db, 'loans'), where('assets', 'array-contains', { id: asset.id, name: asset.data.name, category: asset.data.category, groupName: asset.data.groupName || '' }));
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    // Cara alternatif: Guna 'where' dengan tatasusunan (array)
                    // Ini mungkin tidak berfungsi jika objek 'asset' dalam tatasusunan 'loans' berbeza
                    // Pendekatan yang lebih selamat ialah menamakan semula aset kepada "Telah Dipadam"
                     await showMessage(
                         'Ralat Memadam',
                         `Aset <strong>${asset.data.name}</strong> tidak boleh dipadam kerana ia wujud dalam ${querySnapshot.size} rekod pinjaman (lama atau aktif).<br><br>Sila tukar statusnya kepada 'Rosak' atau 'Lupus' jika perlu (fungsi ini belum ditambah).`
                     );
                     return;
                }

                // Jika tiada dalam rekod pinjaman, padam
                await deleteDoc(doc(db, 'assets', assetId));
                showMessage('Aset Dipadam', `Aset ${asset.data.name} telah berjaya dipadam.`);
                playSound('success');
            } catch (error) {
                console.error("Ralat memadam aset: ", error);
                showMessage('Ralat', `Gagal memadam aset: ${error.message}`);
                playSound('error');
            }
        }
    }
    
    // PAKSA PULANG (FORCE RETURN)
    else if (button.classList.contains('force-return-btn')) {
        const confirmed = await showConfirm(
            'Paksa Pulang Aset',
            `Anda pasti mahu memaksa pulang <strong>${asset.data.name}</strong>?<br><br><small>Ini akan menetapkan status aset kepada 'Tersedia', tetapi tidak akan menukar rekod pinjaman yang berkaitan dengannya.</small>`
        );
        
        if (confirmed) {
            try {
                const assetRef = doc(db, 'assets', assetId);
                await updateDoc(assetRef, { status: 'Tersedia' });
                showMessage('Aset Dipulangkan', `Aset ${asset.data.name} kini ditanda sebagai 'Tersedia'.`);
                playSound('success');
            } catch (error) {
                console.error("Ralat paksa pulang: ", error);
                showMessage('Ralat', `Gagal: ${error.message}`);
                playSound('error');
            }
        }
    }
}

