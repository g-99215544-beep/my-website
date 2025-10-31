// (FIX) Alih keluar import Firebase yang rosak dari bahagian atas fail ini.

// Import modul Utiliti
import { showMessage, showConfirm, renderAssetSelectItem, playSound } from './utils.js';

// Rujukan DOM
const loanForm = document.getElementById('loan-form');
const assetCategoryLists = {
    'Laptop': document.getElementById('asset-list-Laptop'),
    'Tablet': document.getElementById('asset-list-Tablet'),
    'Projector': document.getElementById('asset-list-Projector'),
    'Lain-lain': document.getElementById('asset-list-Lain-lain')
};
const loadingIndicators = document.querySelectorAll('.loading-indicator');

let db; // Akan ditetapkan oleh initTabPermohonan

// Fungsi untuk memulakan tab permohonan
export function initTabPermohonan(database) {
    db = database;
    if (loanForm) {
        loanForm.addEventListener('submit', handleLoanSubmission);
    } else {
        console.error("Borang Pinjaman (loan-form) tidak ditemui!");
    }
}

// Fungsi untuk mengemas kini senarai aset yang boleh dipilih
export function updatePermohonanAssets(assets) {
    // 1. Kosongkan semua senarai dan penunjuk 'memuatkan'
    Object.values(assetCategoryLists).forEach(list => list.innerHTML = '');
    loadingIndicators.forEach(indicator => indicator.classList.add('hidden'));

    // 2. Tapis aset yang 'Tersedia' (Available) sahaja
    const availableAssets = assets.filter(asset => asset.data.status === 'Available');

    // 3. Isih aset ke dalam kategori
    availableAssets.forEach(asset => {
        const category = asset.data.category || 'Lain-lain';
        if (assetCategoryLists[category]) {
            const assetHtml = renderAssetSelectItem(asset);
            assetCategoryLists[category].innerHTML += assetHtml;
        }
    });

    // 4. Tunjukkan mesej "Tiada" jika kategori kosong
    Object.keys(assetCategoryLists).forEach(category => {
        if (assetCategoryLists[category].innerHTML === '') {
            assetCategoryLists[category].innerHTML = '<p class="text-sm text-gray-500 italic px-4">Tiada aset tersedia dalam kategori ini.</p>';
        }
    });
}

// Fungsi untuk mengendalikan penghantaran borang permohonan
async function handleLoanSubmission(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    // Ambil ID Aplikasi (disediakan oleh Canvas)
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

    // 1. Kumpul data borang
    const formData = new FormData(e.target);
    const applicantName = formData.get('applicantName');
    const applicantIC = formData.get('applicantIC');
    const loanDate = formData.get('loanDate');
    const returnDate = formData.get('returnDate');
    const purpose = formData.get('purpose');

    // 2. Kumpul item yang dipilih
    const selectedAssets = [];
    const checkedBoxes = document.querySelectorAll('.asset-checkbox:checked');
    
    if (checkedBoxes.length === 0) {
        showMessage('Borang Tidak Lengkap', 'Sila pilih sekurang-kurangnya satu aset untuk dipinjam.');
        playSound('error');
        return;
    }

    checkedBoxes.forEach(box => {
        selectedAssets.push({
            id: box.value,
            name: box.dataset.name,
            serialNumber: box.dataset.sn
        });
    });

    // 3. Sahkan data
    if (!applicantName || !applicantIC || !loanDate || !returnDate || !purpose) {
        showMessage('Borang Tidak Lengkap', 'Sila isi semua maklumat yang diperlukan.');
        playSound('error');
        return;
    }

    // 4. Sahkan tarikh
    if (new Date(returnDate) < new Date(loanDate)) {
        showMessage('Ralat Tarikh', 'Tarikh pulang mestilah selepas atau sama dengan tarikh pinjam.');
        playSound('error');
        return;
    }
    
    // Lumpuhkan butang
    submitBtn.disabled = true;
    submitBtn.textContent = 'Memproses...';

    try {
        // 5. Cipta dokumen 'loan' (pinjaman) baharu
        const loanData = {
            applicantName,
            applicantIC,
            loanDate,
            returnDate,
            purpose,
            assets: selectedAssets, // Simpan sebagai array of objects
            status: 'Pending', // Status awal: Menunggu kelulusan
            // (FIX) Panggil window.firebase secara terus
            requestedAt: window.firebase.serverTimestamp(),
            approvedBy: null,
            approvedAt: null,
            returnedAt: null
        };

        // (FIX) Panggil window.firebase secara terus
        const loansCollectionRef = window.firebase.collection(db, `artifacts/${appId}/public/data/loans`);
        const newLoanDoc = await window.firebase.addDoc(loansCollectionRef, loanData);

        // 6. Kemas kini status aset yang dipilih kepada 'Pending' (transaksi batch)
        // (FIX) Panggil window.firebase secara terus
        const batch = window.firebase.writeBatch(db);
        
        selectedAssets.forEach(asset => {
            // (FIX) Panggil window.firebase secara terus
            const assetRef = window.firebase.doc(db, `artifacts/${appId}/public/data/assets`, asset.id);
            batch.update(assetRef, { 
                status: 'Pending', // Tandakan sebagai 'Pending' sementara menunggu kelulusan
                currentLoanId: newLoanDoc.id // Pautkan ke permohonan pinjaman
            });
        });

        await batch.commit(); // Laksanakan kedua-dua kemas kini serentak

        // 7. Berjaya
        showMessage('Permohonan Dihantar', 'Permohonan anda telah dihantar dan sedang menunggu kelulusan admin.');
        playSound('success');
        e.target.reset(); // Reset borang
        // Senarai aset akan dikemas kini secara automatik oleh onSnapshot
        
    } catch (error) {
        console.error("Ralat menghantar permohonan:", error);
        showMessage('Ralat', 'Gagal menghantar permohonan. Sila cuba lagi.');
        playSound('error');
    } finally {
        // Aktifkan semula butang
        submitBtn.disabled = false;
        submitBtn.textContent = 'Hantar Permohonan';
    }
}

