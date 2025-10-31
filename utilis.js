// === UTILS.JS ===
// Menyimpan fungsi-fungsi yang dikongsi bersama (Shared Functions)

// Import fungsi utama dari Firebase (melalui tetingkap global)
const { doc, updateDoc, writeBatch, collection } = window.firebase;

// Rujukan global dari script.js (akan ditetapkan semasa permulaan)
let db;
export function setUtilsDb(database) {
    db = database;
}

// 1. Fungsi Modal Mesej (Alert)
const messageModal = document.getElementById('message-modal');
const messageTitle = document.getElementById('message-title');
const messageText = document.getElementById('message-text');
const messageOkBtn = document.getElementById('message-ok');

export function showMessage(title, message) {
    return new Promise((resolve) => {
        messageTitle.textContent = title;
        messageText.innerHTML = message; // Guna innerHTML untuk membenarkan <br>
        messageModal.classList.remove('hidden');

        // Alih keluar pendengar sedia ada untuk mengelakkan panggilan berganda
        const newMessageOkBtn = messageOkBtn.cloneNode(true);
        messageOkBtn.parentNode.replaceChild(newMessageOkBtn, messageOkBtn);
        
        newMessageOkBtn.onclick = () => {
            messageModal.classList.add('hidden');
            resolve(true);
        };
    });
}

// 2. Fungsi Modal Pengesahan (Confirm)
const confirmModal = document.getElementById('confirm-modal');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmOkBtn = document.getElementById('confirm-ok');
const confirmCancelBtn = document.getElementById('confirm-cancel');

export function showConfirm(title, message) {
    return new Promise((resolve) => {
        confirmTitle.textContent = title;
        confirmMessage.innerHTML = message; // Guna innerHTML untuk membenarkan <br>
        confirmModal.classList.remove('hidden');

        // Alih keluar pendengar sedia ada
        const newConfirmOkBtn = confirmOkBtn.cloneNode(true);
        confirmOkBtn.parentNode.replaceChild(newConfirmOkBtn, confirmOkBtn);
        
        const newConfirmCancelBtn = confirmCancelBtn.cloneNode(true);
        confirmCancelBtn.parentNode.replaceChild(newConfirmCancelBtn, confirmCancelBtn);

        newConfirmOkBtn.onclick = () => {
            confirmModal.classList.add('hidden');
            resolve(true); // Pengguna klik "OK"
        };
        
        newConfirmCancelBtn.onclick = () => {
            confirmModal.classList.add('hidden');
            resolve(false); // Pengguna klik "Batal"
        };
    });
}

// 3. Fungsi Notifikasi Bunyi (Tone.js)
export function playSound(note) {
    // Pastikan Tone.js dimuatkan
    if (typeof Tone !== 'undefined') {
        try {
            const synth = new Tone.Synth().toDestination();
            if (note === 'success') {
                // Bunyi ceria pendek
                synth.triggerAttackRelease("C5", "8n", Tone.now());
                synth.triggerAttackRelease("G5", "8n", Tone.now() + 0.2);
            } else if (note === 'error') {
                // Bunyi amaran rendah
                synth.triggerAttackRelease("G2", "8n", Tone.now());
                synth.triggerAttackRelease("C2", "8n", Tone.now() + 0.1);
            } else if (note === 'notification') {
                // Bunyi notifikasi neutral
                synth.triggerAttackRelease("E5", "16n", Tone.now());
            }
        } catch (error) {
            console.warn("Tone.js ralat:", error);
        }
    }
}

// 4. (PALING PENTING) Fungsi Menjana HTML Aset (Asset Item Renderer)
// Fungsi ini dipanggil oleh semua tab (Permohonan, Aset, Rekod)
// 'context' boleh jadi 'form', 'display', atau 'manager'

export function renderAssetItem(asset, context, allAssets) {
    const assetId = asset.id;
    const data = asset.data;
    const isAvailable = data.status === 'Tersedia';
    const isGrouped = data.groupName && data.groupName.trim() !== '';
    const specsHtml = data.specs ? data.specs.split('\n').map(spec => `<li class="text-xs text-gray-600">${spec}</li>`).join('') : '';
    const imageUrl = data.imageUrl || `https://placehold.co/400x300/EBF8FF/3182CE?text=${encodeURIComponent(data.name)}`;
    const placeholderErrorUrl = `https://placehold.co/400x300/FEF2F2/DC2626?text=Ralat+Muat+Imej`;

    // --- (A) BINA HTML UNTUK MODUL PENGURUS ASET ('manager') ---
    if (context === 'manager') {
        // Ini ialah HTML untuk modal "Asset Manager"
        return `
            <div id="manager-item-${assetId}" class="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-md border border-gray-200" data-asset-id="${assetId}">
                <div class="flex items-center space-x-3">
                    <img src="${imageUrl}" alt="${data.name}" class="w-12 h-12 object-cover rounded-md bg-gray-200" onerror="this.src='${placeholderErrorUrl}'">
                    <div>
                        <p class="font-semibold text-gray-800">${data.name}</p>
                        <p class="text-xs text-gray-500">
                            ${isGrouped ? `Kump: ${data.groupName} |` : ''} 
                            Kategori: ${data.category} | 
                            Status: <span class="font-medium ${isAvailable ? 'text-green-600' : 'text-red-600'}">${data.status}</span>
                        </p>
                    </div>
                </div>
                <div class="space-x-2">
                    <button class="edit-asset-btn text-blue-600 hover:text-blue-800" data-asset-id="${assetId}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                    </button>
                    ${!isAvailable ? 
                        `<button class="force-return-btn text-yellow-600 hover:text-yellow-800" data-asset-id="${assetId}" title="Paksa Pulang (Force Return)">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clip-rule="evenodd" /></svg>
                         </button>` : 
                        `<button class="delete-asset-btn text-red-600 hover:text-red-800" data-asset-id="${assetId}" title="Padam Aset">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
                         </button>`
                    }
                </div>
            </div>
        `;
    }

    // --- (B) BINA HTML UNTUK MODUL PAPARAN ('display') ---
    // Ini ialah HTML untuk Tab 2: Aset Tersedia (Read-only)
    if (context === 'display') {
        // Jika item dikumpulkan, cari semua item dalam kumpulan itu
        if (isGrouped) {
            // Cari item 'induk' (yang pertama dalam kumpulan)
            const parent = allAssets.find(a => a.data.groupName === data.groupName && !a.data.isGroupChild);
            
            // Jika item ini bukan 'induk', jangan paparkan (ia akan dipaparkan di bawah induk)
            if (data.isGroupChild) return ''; 
            
            // Dapatkan semua item dalam kumpulan ini
            const groupItems = allAssets.filter(a => a.data.groupName === data.groupName && a.data.status === 'Tersedia');
            const groupCount = groupItems.length;
            
            // Jika tiada item tersedia dalam kumpulan, jangan paparkan
            if (groupCount === 0) return '';
            
            const groupParent = parent || asset; // Guna item pertama jika induk tidak dijumpai
            const groupImageUrl = groupParent.data.imageUrl || `https://placehold.co/400x300/EBF8FF/3182CE?text=${encodeURIComponent(groupParent.data.groupName)}`;
            const groupSpecsHtml = groupParent.data.specs ? groupParent.data.specs.split('\n').map(spec => `<li class="text-xs text-gray-600">${spec}</li>`).join('') : '';

            // Render sebagai 'Group Card'
            return `
                <div class="asset-item-details border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm" data-asset-id="${groupParent.id}">
                    <!-- Bahagian Atas (Header Kumpulan) -->
                    <div class="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50">
                        <div class="flex items-center space-x-3">
                            <div class="relative">
                                <img src="${groupImageUrl}" alt="${groupParent.data.groupName}" class="w-12 h-12 object-cover rounded-md bg-gray-200" onerror="this.src='${placeholderErrorUrl}'">
                                <span class="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">${groupCount}</span>
                            </div>
                            <div>
                                <p class="font-semibold text-gray-800">${groupParent.data.groupName} (Tersedia: ${groupCount})</p>
                                <p class="text-sm text-gray-500">${groupParent.data.name}</p>
                            </div>
                        </div>
                        <button class="toggle-details-btn text-gray-400 hover:text-gray-600">
                            <svg class="info-icon w-6 h-6 transition-transform duration-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                    </div>
                    <!-- Bahagian Bawah (Butiran Kumpulan) -->
                    <div class="asset-details border-t border-gray-200 p-4">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="md:col-span-1">
                                <img src="${groupImageUrl}" alt="${groupParent.data.groupName}" class="w-full h-auto object-cover rounded-md border" onerror="this.src='${placeholderErrorUrl}'">
                            </div>
                            <div class="md:col-span-2">
                                <h4 class="font-semibold text-sm mb-1">Spesifikasi:</h4>
                                <ul class="list-disc list-inside space-y-1 mb-3">${groupSpecsHtml || '<li class="text-xs text-gray-500 italic">Tiada spesifikasi.</li>'}</ul>
                                <h4 class="font-semibold text-sm mb-1">Item Tersedia:</h4>
                                <div class="grouped-item-grid">
                                    ${groupItems.map(item => `
                                        <span class="text-xs bg-green-100 text-green-800 p-2 rounded-md border border-green-200 text-center shadow-sm">
                                            ${item.data.name}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

        } else {
            // Render sebagai 'Individual Card' (jika tidak dikumpulkan)
            return `
                <div class="asset-item-details border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm" data-asset-id="${assetId}">
                    <!-- Bahagian Atas (Header Individu) -->
                    <div class="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50">
                        <div class="flex items-center space-x-3">
                            <img src="${imageUrl}" alt="${data.name}" class="w-12 h-12 object-cover rounded-md bg-gray-200" onerror="this.src='${placeholderErrorUrl}'">
                            <div>
                                <p class="font-semibold text-gray-800">${data.name}</p>
                                <p class="text-sm text-green-600 font-medium">${data.status}</p>
                            </div>
                        </div>
                        <button class="toggle-details-btn text-gray-400 hover:text-gray-600">
                            <svg class="info-icon w-6 h-6 transition-transform duration-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                    </div>
                    <!-- Bahagian Bawah (Butiran Individu) -->
                    <div class="asset-details border-t border-gray-200 p-4">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="md:col-span-1">
                                <img src="${imageUrl}" alt="${data.name}" class="w-full h-auto object-cover rounded-md border" onerror="this.src='${placeholderErrorUrl}'">
                            </div>
                            <div class="md:col-span-2">
                                <h4 class="font-semibold text-sm mb-1">Spesifikasi:</h4>
                                <ul class="list-disc list-inside space-y-1">${specsHtml || '<li class="text-xs text-gray-500 italic">Tiada spesifikasi.</li>'}</ul>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // --- (C) BINA HTML UNTUK MODUL BORANG ('form') ---
    // Ini ialah HTML untuk Tab 1: Permohonan (dengan Checkbox)
    if (context === 'form') {
        // Jika item dikumpulkan, cari semua item dalam kumpulan itu
        if (isGrouped) {
            // Cari item 'induk' (yang pertama dalam kumpulan)
            const parent = allAssets.find(a => a.data.groupName === data.groupName && !a.data.isGroupChild);
            
            // Jika item ini bukan 'induk', jangan paparkan
            if (data.isGroupChild) return '';
            
            // Dapatkan semua item dalam kumpulan ini
            const groupItems = allAssets.filter(a => a.data.groupName === data.groupName && a.data.status === 'Tersedia');
            const groupCount = groupItems.length;

            // Jika tiada item tersedia dalam kumpulan, jangan paparkan
            if (groupCount === 0) return '';
            
            const groupParent = parent || asset; // Guna item pertama jika induk tidak dijumpai
            const groupImageUrl = groupParent.data.imageUrl || `https://placehold.co/400x300/EBF8FF/3182CE?text=${encodeURIComponent(groupParent.data.groupName)}`;

            // Render sebagai 'Group Checkbox'
            return `
                <div class="asset-item-details border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm" data-asset-id="${groupParent.id}">
                    <!-- Bahagian Atas (Header Kumpulan) -->
                    <label class="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-50" for="group-header-${groupParent.id}">
                        <div class="flex items-center space-x-3">
                            <div class="relative">
                                <img src="${groupImageUrl}" alt="${groupParent.data.groupName}" class="w-12 h-12 object-cover rounded-md bg-gray-200" onerror="this.src='${placeholderErrorUrl}'">
                                <span class="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white">${groupCount}</span>
                            </div>
                            <div>
                                <p class="font-semibold text-gray-800">${groupParent.data.groupName} (Tersedia: ${groupCount})</p>
                                <p class="text-sm text-gray-500">${groupParent.data.name}</p>
                            </div>
                        </div>
                        <button type="button" class="toggle-details-btn text-gray-400 hover:text-gray-600">
                             <svg class="info-icon w-6 h-6 transition-transform duration-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                    </label>
                    <!-- Bahagian Bawah (Senarai Checkbox Kumpulan) -->
                    <div class="asset-details border-t border-gray-200 p-4">
                        <div class="grouped-item-grid">
                            ${groupItems.map(item => `
                                <label for="asset-${item.id}" class="flex items-center space-x-2 p-2 rounded-md border border-gray-200 hover:bg-blue-50 cursor-pointer shadow-sm">
                                    <input type="checkbox" id="asset-${item.id}" name="selectedAssets" value="${item.id}"
                                           class="form-checkbox h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                                    <span class="text-sm text-gray-700">${item.data.name}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Render sebagai 'Individual Checkbox'
            return `
                <div class="asset-item-details border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm" data-asset-id="${assetId}">
                    <!-- Bahagian Atas (Header Individu) -->
                    <div class="flex justify-between items-center p-3">
                        <label for="asset-${assetId}" class="flex items-center space-x-3 cursor-pointer">
                            <input type="checkbox" id="asset-${assetId}" name="selectedAssets" value="${assetId}"
                                   class="form-checkbox h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                            <img src="${imageUrl}" alt="${data.name}" class="w-12 h-12 object-cover rounded-md bg-gray-200" onerror="this.src='${placeholderErrorUrl}'">
                            <div>
                                <p class="font-semibold text-gray-800">${data.name}</p>
                                <p class="text-sm text-green-600 font-medium">${data.status}</p>
                            </div>
                        </label>
                        <button type="button" class="toggle-details-btn text-gray-400 hover:text-gray-600">
                             <svg class="info-icon w-6 h-6 transition-transform duration-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>
                    </div>
                    <!-- Bahagian Bawah (Butiran Individu) -->
                    <div class="asset-details border-t border-gray-200 p-4">
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div class="md:col-span-1">
                                <img src="${imageUrl}" alt="${data.name}" class="w-full h-auto object-cover rounded-md border" onerror="this.src='${placeholderErrorUrl}'">
                            </div>
                            <div class="md:col-span-2">
                                <h4 class="font-semibold text-sm mb-1">Spesifikasi:</h4>
                                <ul class="list-disc list-inside space-y-1">${specsHtml || '<li class="text-xs text-gray-500 italic">Tiada spesifikasi.</li>'}</ul>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }
}


// --- PENGURUS ASET (Fungsi Bantuan untuk tabRekod.js) ---
// Fungsi ini menguruskan logik untuk 'Asset Manager'

// Buka Modal Edit Aset
export function openEditAssetModal(asset, allAssets) {
    const data = asset.data;
    document.getElementById('edit-asset-id').value = asset.id;
    document.getElementById('edit-asset-name').value = data.name;
    document.getElementById('edit-asset-group').value = data.groupName || '';
    document.getElementById('edit-asset-category').value = data.category;
    document.getElementById('edit-asset-image').value = data.imageUrl || '';
    document.getElementById('edit-asset-specs').value = data.specs || '';
    document.getElementById('edit-asset-status').textContent = '';
    
    // Tunjukkan butang 'Salin ke Kumpulan' hanya jika ia mempunyai nama kumpulan
    const copyToGroupBtn = document.getElementById('copy-to-group-btn');
    if (data.groupName && data.groupName.trim() !== '') {
        copyToGroupBtn.classList.remove('hidden');
        copyToGroupBtn.onclick = () => handleCopyToGroup(asset.id, data.groupName, allAssets);
    } else {
        copyToGroupBtn.classList.add('hidden');
    }

    document.getElementById('edit-asset-modal').classList.remove('hidden');
}

// Tutup Modal Edit Aset
export function closeEditAssetModal() {
    document.getElementById('edit-asset-modal').classList.add('hidden');
}

// Simpan Perubahan Aset
export async function handleSaveAsset(event) {
    event.preventDefault();
    const assetId = document.getElementById('edit-asset-id').value;
    const statusEl = document.getElementById('edit-asset-status');
    statusEl.textContent = 'Menyimpan...';
    statusEl.className = 'text-sm mt-2 text-center text-blue-600';

    const updatedData = {
        name: document.getElementById('edit-asset-name').value,
        groupName: document.getElementById('edit-asset-group').value.trim(),
        category: document.getElementById('edit-asset-category').value,
        imageUrl: document.getElementById('edit-asset-image').value.trim(),
        specs: document.getElementById('edit-asset-specs').value.trim(),
    };
    
    // Tentukan jika ia adalah sebahagian daripada kumpulan
    updatedData.isGroupChild = updatedData.groupName !== '';

    try {
        const assetRef = doc(db, 'assets', assetId);
        await updateDoc(assetRef, updatedData);
        
        statusEl.textContent = 'Berjaya disimpan!';
        statusEl.className = 'text-sm mt-2 text-center text-green-600';
        playSound('success');
        
        setTimeout(() => {
            closeEditAssetModal();
        }, 1000);

    } catch (error) {
        console.error("Ralat menyimpan aset: ", error);
        statusEl.textContent = `Ralat: ${error.message}`;
        statusEl.className = 'text-sm mt-2 text-center text-red-600';
        playSound('error');
    }
}

// Salin Info ke Kumpulan
async function handleCopyToGroup(sourceId, groupName, allAssets) {
    if (!groupName) return;

    const sourceAsset = allAssets.find(a => a.id === sourceId);
    if (!sourceAsset) return;

    const { imageUrl, specs } = sourceAsset.data;

    const confirmed = await showConfirm(
        'Salin Maklumat Kumpulan',
        `Anda pasti mahu menyalin <strong>URL Gambar</strong> dan <strong>Spesifikasi</strong> dari aset ini ke <strong>SEMUA</strong> aset lain dalam kumpulan <strong>"${groupName}"</strong>?<br><br><small>Ini tidak boleh diundur.</small>`
    );

    if (!confirmed) return;

    const statusEl = document.getElementById('edit-asset-status');
    statusEl.textContent = 'Menyalin ke kumpulan...';
    statusEl.className = 'text-sm mt-2 text-center text-blue-600';

    try {
        const batch = writeBatch(db);
        const assetsToUpdate = allAssets.filter(a => a.data.groupName === groupName && a.id !== sourceId);
        
        assetsToUpdate.forEach(asset => {
            const assetRef = doc(db, 'assets', asset.id);
            batch.update(assetRef, { 
                imageUrl: imageUrl, 
                specs: specs,
                isGroupChild: true // Pastikan semua item lain ditanda sebagai 'child'
            });
        });
        
        // Juga kemas kini item sumber untuk memastikan ia bukan 'child' jika ia adalah 'induk'
        const sourceRef = doc(db, 'assets', sourceId);
        batch.update(sourceRef, { isGroupChild: false });

        await batch.commit();

        statusEl.textContent = `Berjaya disalin ke ${assetsToUpdate.length} aset lain!`;
        statusEl.className = 'text-sm mt-2 text-center text-green-600';
        playSound('success');
        
        setTimeout(() => {
            closeEditAssetModal();
        }, 1500);

    } catch (error) {
        console.error("Ralat menyalin ke kumpulan: ", error);
        statusEl.textContent = `Ralat: ${error.message}`;
        statusEl.className = 'text-sm mt-2 text-center text-red-600';
        playSound('error');
    }
}

