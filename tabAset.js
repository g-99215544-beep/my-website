// === TABASET.JS ===
// Menguruskan semua logik untuk Tab 2: Aset Tersedia (Paparan Sahaja)

// Import fungsi bantuan
import { renderAssetItem } from './utils.js';

// Rujukan DOM
const displayCategoryLists = {
    'Laptop': document.getElementById('display-laptop-list'),
    'Tablet': document.getElementById('display-tablet-list'),
    'Projector': document.getElementById('display-projector-list'),
    'Lain': document.getElementById('display-others-list')
};
const displayCategoryCounts = {
    'Laptop': document.getElementById('display-laptop-count'),
    'Tablet': document.getElementById('display-tablet-count'),
    'Projector': document.getElementById('display-projector-count'),
    'Lain': document.getElementById('display-others-count')
};

// Fungsi utama untuk memulakan tab ini
export function initTabAset() {
    // Tambah pendengar acara untuk butang 'info' (toggle-details-btn)
    // Gunakan 'event delegation' pada panel
    document.getElementById('panel-aset').addEventListener('click', function(event) {
        const toggleBtn = event.target.closest('.toggle-details-btn');
        if (toggleBtn) {
            const itemDetails = toggleBtn.closest('.asset-item-details');
            if (itemDetails) {
                itemDetails.classList.toggle('open');
            }
        }
    });
}

// Kemas kini senarai aset apabila cache global berubah
export function updateAsetTersedia(assets) {
    // 1. Kosongkan semua senarai
    Object.values(displayCategoryLists).forEach(list => list.innerHTML = '');
    
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
        const listContainer = displayCategoryLists[category];
        
        if (listContainer) {
            const itemHtml = renderAssetItem(asset, 'display', availableAssets);
            
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
        const countEl = displayCategoryCounts[category];
        if (count > 0) {
            countEl.textContent = count;
            countEl.classList.remove('hidden');
        } else {
            countEl.classList.add('hidden');
        }
    });

    // 7. Tunjukkan mesej jika tiada aset
    Object.keys(displayCategoryLists).forEach(category => {
        if (displayCategoryLists[category].innerHTML === '') {
            displayCategoryLists[category].innerHTML = '<p class="text-gray-500 text-sm italic">Tiada aset tersedia dalam kategori ini.</p>';
        }
    });
}

