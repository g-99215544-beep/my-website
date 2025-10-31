// Import modul Utiliti
import { renderAssetItem } from './utils.js';

// Rujukan DOM
const availableAssetList = document.getElementById('available-asset-list');
const availableAssetLoading = document.getElementById('available-asset-loading');
const availableAssetFilter = document.getElementById('available-asset-filter');

let allAssets = []; // Simpan semua aset di sini

// Fungsi untuk memulakan tab
export function initTabAset() {
    availableAssetFilter.addEventListener('input', (e) => {
        filterAndDisplayAssets(e.target.value);
    });
}

// Fungsi untuk menerima kemas kini aset dari script.js
export function updateAsetTersedia(assets) {
    // Simpan semua aset (walaupun bukan 'Available') untuk penapisan masa hadapan
    allAssets = assets; 
    
    // Paparkan aset 'Available' secara lalai
    filterAndDisplayAssets(availableAssetFilter.value);
}

// Fungsi untuk menapis dan memaparkan aset
function filterAndDisplayAssets(searchTerm) {
    availableAssetLoading.classList.add('hidden');
    availableAssetList.innerHTML = '';
    
    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    // Tapis aset yang 'Tersedia' (Available) SAHAJA
    const availableAssets = allAssets.filter(asset => asset.data.status === 'Available');

    // Tapis lebih lanjut berdasarkan carian
    const filteredAssets = availableAssets.filter(asset => {
        const name = asset.data.name?.toLowerCase() || '';
        const serial = asset.data.serialNumber?.toLowerCase() || '';
        const category = asset.data.category?.toLowerCase() || '';
        
        return name.includes(lowerCaseSearchTerm) || 
               serial.includes(lowerCaseSearchTerm) ||
               category.includes(lowerCaseSearchTerm);
    });

    if (filteredAssets.length > 0) {
        filteredAssets.forEach(asset => {
            // 'showCategory: true' kerana ini adalah senarai umum
            const assetHtml = renderAssetItem(asset, true); 
            availableAssetList.innerHTML += assetHtml;
        });
    } else {
        if (availableAssets.length === 0) {
             availableAssetList.innerHTML = '<p class="text-gray-500 italic">Tiada aset yang tersedia buat masa ini.</p>';
        } else {
             availableAssetList.innerHTML = '<p class="text-gray-500 italic">Tiada aset sepadan dengan carian anda.</p>';
        }
    }
}

