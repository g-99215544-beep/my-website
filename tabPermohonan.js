// === TABPERMOHONAN.JS ===
// Menguruskan semua logik untuk Tab 1: Permohonan

// Import fungsi utama dari Firebase (melalui tetingkap global)
const { collection, addDoc, serverTimestamp, getDocs, updateDoc, doc } = window.firebase;
// Import fungsi bantuan
import { showMessage, showConfirm, playSound, renderAssetItem } from './utils.js';

// Rujukan global dari script.js
let db;
let allAssets = []; // Cache tempatan untuk aset

// Rujukan DOM
const loanForm = document.getElementById('loan-form');
const submitButton = document.getElementById('submit-button');
const submitStatusError = document.getElementById('submit-status-error');

// Kategori Senarai Borang
const formCategoryLists = {
    'Laptop': document.getElementById('form-laptop-list'),
    'Tablet': document.getElementById('form-tablet-list'),
    'Projector': document.getElementById('form-projector-list'),
    'Lain': document.getElementById('form-others-list')
};
const formCategoryCounts = {
    'Laptop': document.getElementById('form-laptop-count'),
    'Tablet': document.getElementById('form-tablet-count'),
    'Projector': document.getElementById('form-projector-count'),
    'Lain': document.getElementById('form-others-count')
};


// Fungsi utama untuk memulakan tab ini
export function initTabPermohonan(database) {
    db = database;
    loanForm.addEventListener('submit', handleLoanSubmit);
    
    // Tambah pendengar acara untuk butang 'info' (toggle-details-btn)
    // Gunakan 'event delegation' pada panel
    document.getElementById('panel-permohonan').addEventListener('click', function(event) {
        const toggleBtn = event.target.closest('.toggle-details-btn');
        if (toggleBtn) {
            event.preventDefault(); // Hentikan <label> dari 'check' checkbox
            const itemDetails = toggleBtn.closest('.asset-item-details');
            if (itemDetails) {
                itemDetails.classList.toggle('open');
            }
        }
    });
}

// Kemas kini senarai aset apabila cache global berubah
export function updatePermohonanAssets(assets) {
    allAssets = assets; // Simpan cache aset
    
    // 1. Kosongkan semua senarai
    Object.values(formCategoryLists).forEach(list => list.innerHTML = '');
    
    // 2. Kumpulkan aset yang tersedia
    const availableAssets = assets.filter(asset => asset.data.status === 'Tersedia');
    
    // 3. Isih aset (kumpulan dahulu, kemudian mengikut nama)
    availableAssets.sort((a, b) => {
        const groupA = a.data.groupName || '';
        const groupB = b.data.groupName || '';
        const nameA = a.data.name.toLowerCase();
        const nameB = b.data.name.toLowerCase();

        // Utamakan item berkumpulan
        if (groupA && !groupB) return -1;
        if (!groupA && groupB) return 1;
        if (groupA && groupB) {
            if (groupA < groupB) return -1;
            if (groupA > groupB) return 1;
        }
        
        // Jika kumpulan sama (atau tiada), isih mengikut nama
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });

    // 4. Kira jumlah untuk setiap kategori
    const counts = { 'Laptop': 0, 'Tablet': 0, 'Projector': 0, 'Lain': 0 };
    
    // 5. Jana HTML dan tambah ke senarai yang betul
    availableAssets.forEach(asset => {
        const category = asset.data.category || 'Lain';
        const listContainer = formCategoryLists[category];
        
        if (listContainer) {
            const itemHtml = renderAssetItem(asset, 'form', availableAssets);
            
            // Hanya tambah jika HTML dijana (untuk mengelakkan 'child' berkumpulan)
            if (itemHtml) {
                listContainer.innerHTML += itemHtml;
                
                // Kiraan
                if (asset.data.groupName && !asset.data.isGroupChild) {
                    // Ini adalah kad kumpulan, kira semua item tersedia di dalamnya
                    const groupCount = availableAssets.filter(a => a.data.groupName === asset.data.groupName).length;
                    counts[category] += groupCount;
                } else if (!asset.data.groupName) {
                    // Ini adalah item individu
                    counts[category]++;
                }
            }
        }
    });

    // 6. Kemas kini kiraan dan tunjukkan 'badge'
    Object.keys(counts).forEach(category => {
        const count = counts[category];
        const countEl = formCategoryCounts[category];
        if (count > 0) {
            countEl.textContent = count;
            countEl.classList.remove('hidden');
        } else {
            countEl.classList.add('hidden');
        }
    });

    // 7. Tunjukkan mesej jika tiada aset
    Object.keys(formCategoryLists).forEach(category => {
        if (formCategoryLists[category].innerHTML === '') {
            formCategoryLists[category].innerHTML = '<p class="text-gray-500 text-sm italic">Tiada aset tersedia dalam kategori ini.</p>';
        }
    });
}

// Logik untuk menghantar borang pinjaman
async function handleLoanSubmit(e) {
    e.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'Menghantar...';
    submitStatusError.textContent = '';

    // 1. Dapatkan data borang
    const formData = new FormData(loanForm);
    const teacherName = formData.get('teacherName').trim();
    const teacherIC = formData.get('teacherIC').trim();
    const startDate = formData.get('startDate');
    const endDate = formData.get('endDate');
    const purpose = formData.get('purpose').trim();
    const selectedAssetIds = formData.getAll('selectedAssets');

    // 2. Pengesahan (Validation)
    if (selectedAssetIds.length === 0) {
        submitStatusError.textContent = 'Ralat: Sila pilih sekurang-kurangnya satu aset.';
        submitButton.disabled = false;
        submitButton.textContent = 'Hantar Permohonan';
        playSound('error');
        return;
    }
    
    if (new Date(endDate) < new Date(startDate)) {
        submitStatusError.textContent = 'Ralat: Tarikh pulang tidak boleh lebih awal dari tarikh pinjam.';
        submitButton.disabled = false;
        submitButton.textContent = 'Hantar Permohonan';
        playSound('error');
        return;
    }

    // 3. Dapatkan butiran aset yang dipilih dari cache
    const selectedAssetsDetails = allAssets
        .filter(asset => selectedAssetIds.includes(asset.id))
        .map(asset => ({
            id: asset.id,
            name: asset.data.name,
            category: asset.data.category,
            groupName: asset.data.groupName || ''
        }));
        
    // 4. Sahkan sekali lagi jika aset masih tersedia (Perlumbaan Keadaan - Race Condition)
    try {
        const assetDocs = await getDocs(collection(db, 'assets'));
        const serverAssets = {};
        assetDocs.forEach(doc => {
            serverAssets[doc.id] = doc.data();
        });

        const unavailableItems = [];
        for (const id of selectedAssetIds) {
            if (!serverAssets[id] || serverAssets[id].status !== 'Tersedia') {
                unavailableItems.push(serverAssets[id] ? serverAssets[id].name : `ID: ${id} (telah dipadam)`);
            }
        }

        if (unavailableItems.length > 0) {
            await showMessage(
                'Aset Tidak Lagi Tersedia',
                `Maaf, item berikut telah dipinjam atau dialih keluar semasa anda mengisi borang:<br>- <strong>${unavailableItems.join('<br>- ')}</strong><br><br>Sila muat semula (refresh) halaman dan cuba lagi.`
            );
            submitButton.disabled = false;
            submitButton.textContent = 'Hantar Permohonan';
            // (Kita mungkin mahu memuat semula senarai aset di sini secara automatik)
            return;
        }

    } catch (error) {
        console.error("Ralat memeriksa ketersediaan aset: ", error);
        submitStatusError.textContent = 'Ralat semasa mengesahkan aset. Sila cuba lagi.';
        submitButton.disabled = false;
        submitButton.textContent = 'Hantar Permohonan';
        playSound('error');
        return;
    }


    // 5. Tunjukkan modal pengesahan
    const confirmationMessage = `
        Sila sahkan butiran:<br>
        - <strong>Nama:</strong> ${teacherName}<br>
        - <strong>Tarikh:</strong> ${startDate} hingga ${endDate}<br>
        - <strong>Aset:</strong><br>
          <ul class="list-disc list-inside ml-4 text-sm">
            ${selectedAssetsDetails.map(item => `<li>${item.name}</li>`).join('')}
          </ul>
    `;
    
    const isConfirmed = await showConfirm('Sahkan Permohonan', confirmationMessage);

    if (!isConfirmed) {
        submitButton.disabled = false;
        submitButton.textContent = 'Hantar Permohonan';
        return;
    }

    // 6. Hantar ke Firestore
    try {
        // (a) Cipta rekod pinjaman (loans)
        await addDoc(collection(db, 'loans'), {
            teacherName,
            teacherIC,
            startDate,
            endDate,
            purpose,
            assets: selectedAssetsDetails, // Simpan butiran aset
            status: 'Pending', // Status: Pending, Approved, Returned, Rejected
            requestedAt: serverTimestamp()
        });

        // (b) Kemas kini status aset kepada 'Pending'
        // (Ini menghalangnya daripada dipilih oleh orang lain)
        // Kita guna 'writeBatch' jika ada banyak aset
        // Walaupun dalam sistem ini, 'Pending' pada 'loans' sudah mencukupi.
        // Mari kita kemas kini status aset kepada 'Dipohon'
        
        for (const assetId of selectedAssetIds) {
             const assetRef = doc(db, 'assets', assetId);
             await updateDoc(assetRef, {
                 status: 'Dipohon' // Tukar status kepada 'Dipohon'
             });
        }
        
        // 7. Berjaya
        await showMessage(
            'Permohonan Dihantar',
            'Permohonan anda telah berjaya dihantar.<br><br>Sila tunggu kelulusan daripada Admin.'
        );
        loanForm.reset();
        playSound('success');

    } catch (error) {
        console.error("Ralat menghantar permohonan: ", error);
        submitStatusError.textContent = `Ralat: ${error.message}`;
        playSound('error');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Hantar Permohonan';
    }
}

