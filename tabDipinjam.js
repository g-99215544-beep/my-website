// === TABDIPINJAM.JS ===
// Menguruskan semua logik untuk Tab 3: Aset Dipinjam

// Rujukan DOM
const borrowedListContainer = document.getElementById('borrowed-list');

// Fungsi utama untuk memulakan tab ini
export function initTabDipinjam() {
    // Tiada persediaan khusus diperlukan untuk tab ini setakat ini
}

// Kemas kini senarai aset apabila cache global berubah
export function updateAsetDipinjam(loans) {
    
    // 1. Tapis pinjaman yang sedang aktif (Approved)
    const activeLoans = loans.filter(loan => loan.data.status === 'Approved');

    if (activeLoans.length === 0) {
        borrowedListContainer.innerHTML = '<p class="text-gray-500 text-sm italic col-span-full">Tiada aset yang sedang dipinjam pada masa ini.</p>';
        return;
    }
    
    // 2. Kosongkan senarai
    borrowedListContainer.innerHTML = '';
    
    // 3. Isih mengikut tarikh pulang (paling awal)
    activeLoans.sort((a, b) => new Date(a.data.endDate) - new Date(b.data.endDate));

    // 4. Jana HTML untuk setiap pinjaman aktif
    activeLoans.forEach(loan => {
        const data = loan.data;
        
        // Semak jika tarikh pulang telah tamat
        const isOverdue = new Date(data.endDate) < new Date();
        const borderColor = isOverdue ? 'border-red-400' : 'border-gray-200';
        const bgColor = isOverdue ? 'bg-red-50' : 'bg-white';
        const titleColor = isOverdue ? 'text-red-700' : 'text-gray-800';

        const itemHtml = `
            <div class="border ${borderColor} ${bgColor} rounded-lg shadow-sm p-4">
                <h3 class="font-semibold ${titleColor}">${data.teacherName}</h3>
                <p class="text-sm text-gray-600">
                    Pulang pada: 
                    <strong class="${isOverdue ? 'text-red-600' : 'text-gray-700'}">${new Date(data.endDate).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                </p>
                ${isOverdue ? '<p class="text-xs font-semibold text-red-600 mt-1">TELAH TAMAT TEMPOH</p>' : ''}
                
                <hr class="my-2">
                
                <p class="text-xs text-gray-500 mb-1">Aset Dipinjam:</p>
                <ul class="list-disc list-inside space-y-1">
                    ${data.assets.map(asset => `
                        <li class="text-sm text-gray-700">${asset.name}</li>
                    `).join('')}
                </ul>
            </div>
        `;
        borrowedListContainer.innerHTML += itemHtml;
    });
}

