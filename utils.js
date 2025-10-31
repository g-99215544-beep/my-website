// (FIX) Alih keluar import Firebase yang rosak dari bahagian atas fail ini.

// Simpan rujukan 'db' apabila ia diinisialisasi dalam script.js
let db;
export function setUtilsDb(database) {
    db = database;
}

// === FUNGSI BUNYI ===
// Cipta AudioContext (mesti dicipta selepas interaksi pengguna, tetapi kita cuba cipta awal)
let audioCtx;
try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
} catch (e) {
    console.warn("AudioContext tidak disokong atau disekat.");
}

// Fungsi untuk memainkan bunyi
export function playSound(type) {
    if (!audioCtx) return; // Jangan buat apa-apa jika audio disekat

    try {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // Volum rendah
        
        if (type === 'success') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1);
        } else if (type === 'error') {
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);
        } else { // 'click' atau default
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.05);
        }

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
        console.warn("Gagal memainkan bunyi:", e);
    }
}


// === FUNGSI NOTIFIKASI MODAL ===

// Rujukan DOM untuk modal
const messageModal = document.getElementById('message-modal');
const messageTitle = document.getElementById('message-title');
const messageText = document.getElementById('message-text');
const messageCloseBtn = document.getElementById('message-close');

const confirmModal = document.getElementById('confirm-modal');
const confirmTitle = document.getElementById('confirm-title');
const confirmText = document.getElementById('confirm-text');
const confirmYesBtn = document.getElementById('confirm-yes');
const confirmNoBtn = document.getElementById('confirm-no');

// Sediakan pendengar (listener) sekali
messageCloseBtn?.addEventListener('click', () => messageModal.classList.add('hidden'));
confirmNoBtn?.addEventListener('click', () => confirmModal.classList.add('hidden'));

// Fungsi untuk tunjukkan mesej (alert)
export function showMessage(title, text) {
    messageTitle.textContent = title;
    messageText.textContent = text;
    messageModal.classList.remove('hidden');
}

// Fungsi untuk tunjukkan pengesahan (confirm)
// Menggunakan Promise untuk mengembalikan 'true' atau 'false'
export function showConfirm(title, text) {
    return new Promise((resolve) => {
        confirmTitle.textContent = title;
        confirmText.textContent = text;
        confirmModal.classList.remove('hidden');

        // Penting: Guna 'cloneNode' untuk mengalih keluar pendengar lama
        const newYesBtn = confirmYesBtn.cloneNode(true);
        confirmYesBtn.parentNode.replaceChild(newYesBtn, confirmYesBtn);
        
        newYesBtn.onclick = () => {
            confirmModal.classList.add('hidden');
            resolve(true);
        };

        const newNoBtn = confirmNoBtn.cloneNode(true);
        confirmNoBtn.parentNode.replaceChild(newNoBtn, confirmNoBtn);
        
        newNoBtn.onclick = () => {
            confirmModal.classList.add('hidden');
            resolve(false);
        };
    });
}


// === FUNGSI PAPARAN ASET (DIKONGSI) ===
// Fungsi ini menjana HTML untuk satu item aset

export function renderAssetItem(asset, showCategory = true) {
    const { name, status, condition, serialNumber, category } = asset.data;
    const assetId = asset.id;
    
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
        <div class="asset-item p-4 bg-white border border-gray-200 rounded-lg shadow-sm" data-id="${assetId}">
            <div class="flex justify-between items-center">
                <h4 class="text-lg font-semibold text-gray-800">${name}</h4>
                <span class="text-xs font-medium px-2.5 py-0.5 rounded-full ${statusClass}">${statusText}</span>
            </div>
            <p class="text-sm text-gray-500 mt-1">No. Siri: ${serialNumber || 'N/A'}</p>
            <p class="text-sm text-gray-500">Keadaan: ${condition || 'N/A'}</p>
            ${showCategory ? `<p class="text-sm text-gray-500">Kategori: ${category || 'N/A'}</p>` : ''}
        </div>
    `;
}

// === FUNGSI PAPARAN ASET UNTUK BORANG ===
// Fungsi ini menjana HTML untuk item yang boleh dipilih dalam borang permohonan

export function renderAssetSelectItem(asset) {
    const { name, serialNumber } = asset.data;
    const assetId = asset.id;

    return `
        <label for="asset-${assetId}" 
               class="asset-select-item p-4 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 transition duration-150
                      peer-checked:bg-blue-100 peer-checked:border-blue-400 peer-checked:ring-2 peer-checked:ring-blue-300">
            
            <input type="checkbox" id="asset-${assetId}" value="${assetId}" 
                   class="asset-checkbox hidden peer" 
                   data-name="${name}" 
                   data-sn="${serialNumber}">
            
            <div class="flex justify-between items-center">
                <span class="text-md font-medium text-gray-700">${name}</span>
                <svg class="h-6 w-6 text-blue-500 hidden checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
            </div>
            <p class="text-sm text-gray-500">No. Siri: ${serialNumber || 'N/A'}</p>
        </label>
    `;
}

