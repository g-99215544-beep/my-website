// Rujukan DOM
const borrowedAssetList = document.getElementById('borrowed-asset-list');
const borrowedAssetLoading = document.getElementById('borrowed-asset-loading');
const borrowedAssetFilter = document.getElementById('borrowed-asset-filter');

let allLoans = []; // Simpan semua pinjaman di sini

// Fungsi untuk memulakan tab
export function initTabDipinjam() {
    borrowedAssetFilter.addEventListener('input', (e) => {
        filterAndDisplayLoans(e.target.value);
    });
}

// Fungsi untuk menerima kemas kini pinjaman dari script.js
export function updateAsetDipinjam(loans) {
    allLoans = loans;
    filterAndDisplayLoans(borrowedAssetFilter.value);
}

// Fungsi untuk menapis dan memaparkan pinjaman
function filterAndDisplayLoans(searchTerm) {
    borrowedAssetLoading.classList.add('hidden');
    borrowedAssetList.innerHTML = '';

    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    // Tapis pinjaman yang 'Approved' (sedang dipinjam) SAHAJA
    const activeLoans = allLoans.filter(loan => loan.data.status === 'Approved');

    // Tapis lebih lanjut berdasarkan carian
    const filteredLoans = activeLoans.filter(loan => {
        const name = loan.data.applicantName?.toLowerCase() || '';
        const ic = loan.data.applicantIC || '';
        
        // Carian juga di dalam senarai aset
        const assetMatch = loan.data.assets.some(asset => 
            (asset.name?.toLowerCase() || '').includes(lowerCaseSearchTerm) ||
            (asset.serialNumber?.toLowerCase() || '').includes(lowerCaseSearchTerm)
        );

        return name.includes(lowerCaseSearchTerm) || 
               ic.includes(lowerCaseSearchTerm) ||
               assetMatch;
    });

    if (filteredLoans.length > 0) {
        // Isih (sort) pinjaman yang paling baru di atas
        filteredLoans.sort((a, b) => b.data.approvedAt?.toMillis() - a.data.approvedAt?.toMillis());
        
        filteredLoans.forEach(loan => {
            const loanHtml = renderLoanItem(loan.data);
            borrowedAssetList.innerHTML += loanHtml;
        });
    } else {
        if (activeLoans.length === 0) {
            borrowedAssetList.innerHTML = '<p class="text-gray-500 italic">Tiada aset yang sedang dipinjam pada masa ini.</p>';
        } else {
            borrowedAssetList.innerHTML = '<p class="text-gray-500 italic">Tiada rekod pinjaman sepadan dengan carian anda.</p>';
        }
    }
}

// Fungsi untuk menjana HTML bagi satu item pinjaman
function renderLoanItem(loanData) {
    // Format tarikh
    const loanDate = loanData.loanDate ? new Date(loanData.loanDate).toLocaleDateString('ms-MY') : 'N/A';
    const returnDate = loanData.returnDate ? new Date(loanData.returnDate).toLocaleDateString('ms-MY') : 'N/A';
    
    // Semak jika tarikh pulang telah lepas
    const isOverdue = new Date(loanData.returnDate) < new Date() && !loanData.returnedAt;
    
    return `
        <div class="p-4 bg-white border ${isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'} rounded-lg shadow-sm space-y-2">
            <div>
                <div class="flex justify-between items-center">
                    <h4 class="text-lg font-semibold text-gray-800">${loanData.applicantName}</h4>
                    ${isOverdue ? '<span class="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-200 text-red-800">LEWAT PULANG</span>' : ''}
                </div>
                <p class="text-sm text-gray-500">No. K/P: ${loanData.applicantIC}</p>
            </div>
            
            <p class="text-sm text-gray-600"><span class="font-medium">Tujuan:</span> ${loanData.purpose}</p>
            <p class="text-sm text-gray-600"><span class="font-medium">Tarikh Pinjam:</span> ${loanDate}</p>
            <p class="text-sm ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-600'}"><span class="font-medium">Tarikh Pulang:</span> ${returnDate}</p>

            <!-- Senarai Aset -->
            <div class="pt-2">
                <h5 class="text-sm font-semibold text-gray-700 mb-1">Aset Dipinjam:</h5>
                <ul class="list-disc list-inside space-y-1 pl-2">
                    ${loanData.assets.map(asset => `
                        <li class="text-sm text-gray-600">
                            ${asset.name} <span class="text-gray-400">(${asset.serialNumber || 'N/A'})</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `;
}

