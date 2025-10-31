// Tunggu sehingga semua kandungan HTML dimuatkan
document.addEventListener('DOMContentLoaded', () => {

    // --- STATE PENGURUSAN ---
    // Ini adalah "state" aplikasi kita. Ia mengawal siapa yang log masuk
    // dan tab mana yang sedang aktif.
    const state = {
        isLoggedIn: false, // false = Paparan Guru, true = Paparan Admin
        currentTab: 'permohonan' // Tab lalai semasa dimuatkan
    };

    // --- ELEMEN DOM ---
    // Dapatkan elemen utama dari HTML untuk kita manipulasi
    const authSection = document.getElementById('auth-section');
    const navTabs = document.getElementById('nav-tabs');
    const contentArea = document.getElementById('content-area');

    // --- DATA MOCK (DATA CONTOH) ---
    // Data ini menggantikan pangkalan data sebenar untuk tujuan demonstrasi
    const mockData = {
        assets: {
            laptop: [
                "LAPTOP JOI CHROMEBOOK 1", "LAPTOP JOI CHROMEBOOK 2", "LAPTOP JOI CHROMEBOOK 3",
                "LAPTOP JOI CHROMEBOOK 4", "LAPTOP JOI CHROMEBOOK 5", "LAPTOP JOI CLASSROOM 1",
                "LAPTOP JOI CLASSROOM 2", "LAPTOP JOI CLASSROOM 3", "LAPTOP JOI CLASSROOM 4",
                "LAPTOP JOI CLASSROOM 5", "Lenovo Guru 2", "Lenovo Guru 3", "Lenovo Guru 4"
            ],
            tablet: ["Tablet 1", "Tablet 2", "Tablet 3"], // Data contoh
            projector: ["Projector 1"], // Data contoh
            lain: ["Lain-lain 1"] // Data contoh
        },
        loaned: [
            { id: 1, name: "LENOVO MAKER LAB 1", borrower: "MUHAMMAD IHSAN BIN SHAIK ALI", return: "2 Nov 2025", approved: "gurubesar@sksa.com", daysLeft: 2 },
            { id: 2, name: "LAPTOP BUDIMAS 5", borrower: "Soleha", return: "12 Dis 2025", approved: "gurubesar@sksa.com", daysLeft: 42 },
            { id: 3, name: "Lenovo Guru 1", borrower: "SHARIMAH BT MD ZIN", return: "19 Dis 2025", approved: "guruict@sksa.com", daysLeft: 49 },
            { id: 4, name: "Tablet LENOVO 1", borrower: "NUR IZZATI BINTI MOHD KHALIL", return: "19 Dis 2025", approved: "guruict@sksa.com", daysLeft: 49 },
            { id: 5, name: "Tablet LENOVO 12", borrower: "NUR IZZATI BINTI MOHD KHALIL", return: "19 Dis 2025", approved: "guruict@sksa.com", daysLeft: 49 },
            { id: 6, name: "TV 32 INCH 1", borrower: "NUR RAIHAN BINTI AHMAD FIRDAUS", return: "19 Dis 2025", approved: "guruict@sksa.com", daysLeft: 49 },
        ],
        records: [
            { id: 1, teacher: "MUHAMMAD IHSAN BIN SHAIK ALI", ic: "910310075175", asset: "LENOVO MAKER LAB 1", start: "29 Okt 2025", end: "2 Nov 2025" },
            { id: 2, teacher: "Soleha", ic: "910921075377", asset: "LAPTOP BUDIMAS 5", start: "29 Okt 2025", end: "12 Dis 2025" },
            { id: 3, teacher: "NUR RAIHAN BINTI AHMAD FIRDAUS", ic: "910112075166", asset: "TV 32 INCH 1", start: "29 Okt 2025", end: "19 Dis 2025" },
            { id: 4, teacher: "SANGARA NANDA A/L KARRUPPIAH", ic: "710424075521", asset: "1. LAPTOP BUDIMAS 2\n2. ...", start: "28 Okt 2025", end: "30 Nov 2025" },
        ]
    };

    // --- FUNGSI RENDER KANDUNGAN TAB ---
    // Setiap fungsi ini mengembalikan (return) string HTML untuk kandungan tab tertentu.

    /**
     * Menjana HTML untuk Tab Permohonan (Paparan Guru)
     */
    function renderPermohonan() {
        return `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Bahagian 1: Borang Permohonan -->
                <div class="lg:col-span-2 bg-white p-6 rounded-lg shadow">
                    <h2 class="text-2xl font-bold text-blue-700 mb-6">1. Buat Permohonan Pinjaman</h2>
                    <form class="space-y-4">
                        <div>
                            <label for="nama_guru" class="block text-sm font-medium text-gray-700">Nama Guru</label>
                            <input type="text" id="nama_guru" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                        </div>
                        <div>
                            <label for="no_kp" class="block text-sm font-medium text-gray-700">No Kad Pengenalan</label>
                            <input type="text" id="no_kp" placeholder="Cth: 900101-01-1234" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label for="tarikh_pinjam" class="block text-sm font-medium text-gray-700">Tarikh Pinjam</label>
                                <input type="text" id="tarikh_pinjam" placeholder="dd/mm/yyyy" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                            </div>
                            <div>
                                <label for="tarikh_pulang" class="block text-sm font-medium text-gray-700">Tarikh Pulang</label>
                                <input type="text" id="tarikh_pulang" placeholder="dd/mm/yyyy" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                            </div>
                        </div>
                        <div>
                            <label for="tujuan" class="block text-sm font-medium text-gray-700">Tujuan Pinjaman</label>
                            <textarea id="tujuan" rows="4" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"></textarea>
                            <p class="mt-2 text-xs text-gray-500">Sila pilih aset dari senarai di sebelah sebelum menghantar.</p>
                        </div>
                        <div>
                            <button type="submit" class="w-full justify-center rounded-md border border-transparent bg-green-600 py-3 px-4 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                                Hantar Permohonan Untuk Item Dipilih
                            </button>
                        </div>
                    </form>
                </div>
                
                <!-- Bahagian 2: Senarai Aset (Accordion) -->
                <div class="lg:col-span-1 bg-white p-6 rounded-lg shadow">
                    <h2 class="text-2xl font-bold text-green-700 mb-6">2. Pilih Aset (Pilih item untuk dipinjam)</h2>
                    <div class="space-y-2" id="accordion-container">
                        ${renderAccordionItem('Laptop', mockData.assets.laptop, true)}
                        ${renderAccordionItem('Tablet', mockData.assets.tablet)}
                        ${renderAccordionItem('Projector', mockData.assets.projector)}
                        ${renderAccordionItem('Lain-lain', mockData.assets.lain)}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Menjana HTML untuk Tab Aset Tersedia (Paparan Guru)
     */
    function renderAsetTersedia() {
        return `
            <div class="bg-white p-6 rounded-lg shadow">
                <h2 class="text-2xl font-bold text-green-700 mb-6">Aset Tersedia (Paparan Sahaja)</h2>
                <div class="space-y-2" id="accordion-container">
                    ${renderAccordionItem('Laptop', mockData.assets.laptop, true, false)}
                    ${renderAccordionItem('Tablet', mockData.assets.tablet, false, false)}
                    ${renderAccordionItem('Projector', mockData.assets.projector, false, false)}
                    ${renderAccordionItem('Lain-lain', mockData.assets.lain, false, false)}
                </div>
            </div>
        `;
    }
    
    /**
     * Fungsi bantuan untuk menjana item accordion
     * @param {string} title - Tajuk accordion (cth: "Laptop")
     * @param {string[]} items - Senarai item di dalam
     * @param {boolean} [isOpen=false] - Sama ada patut dibuka secara lalai
     * @param {boolean} [isClickable=true] - Sama ada item boleh diklik (untuk borang permohonan)
     */
    function renderAccordionItem(title, items, isOpen = false, isClickable = true) {
        const itemCount = items.length;
        const itemClass = isClickable 
            ? 'cursor-pointer hover:bg-green-100 border border-green-300' 
            : 'border border-gray-300';
        
        return `
            <div class="rounded-md border border-gray-200">
                <button class="accordion-toggle flex w-full justify-between items-center p-4 bg-gray-50 rounded-t-md hover:bg-gray-100">
                    <div class="flex items-center space-x-2">
                        <span class="font-semibold text-gray-800">${title}</span>
                        <span class="text-xs font-bold text-white bg-green-600 rounded-full px-2 py-0.5">${itemCount}</span>
                    </div>
                    <svg class="accordion-icon w-5 h-5 text-gray-600 ${isOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                <div class="accordion-content p-4 grid grid-cols-2 sm:grid-cols-3 gap-2 ${isOpen ? '' : 'hidden'}">
                    ${items.map(item => `
                        <div class="text-sm text-green-800 bg-green-50 rounded-md p-2 text-center ${itemClass}">
                            ${item}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }


    /**
     * Menjana HTML untuk Tab Aset Dipinjam (Paparan Guru)
     */
    function renderAsetDipinjam() {
        return `
            <h2 class="text-2xl font-bold text-red-700 mb-6">Aset Sedang Dipinjam</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${mockData.loaned.map(item => `
                    <div class="bg-white border-2 border-red-200 rounded-lg shadow-sm overflow-hidden flex flex-col">
                        <div class="p-5 flex-grow">
                            <h3 class="text-lg font-bold text-red-800">${item.name}</h3>
                            <p class="text-sm text-gray-600 mt-2">Pemimjam: ${item.borrower}</p>
                            <p class="text-sm text-gray-600">Pulang: ${item.return}</p>
                            <p class="text-xs text-gray-500 mt-1">Lulus oleh: ${item.approved}</p>
                        </div>
                        <div class="bg-red-50 p-5 border-t border-red-200">
                            <p class="text-3xl font-bold text-blue-700 text-center">${item.daysLeft} HARI LAGI</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Menjana HTML untuk Tab Rekod Pinjaman (Paparan Admin)
     */
    function renderRekodPinjaman() {
        return `
            <!-- Bahagian Tambah Aset Pukal -->
            <div class="mb-6 bg-white rounded-lg shadow border border-gray-200">
                <button class="accordion-toggle flex w-full justify-between items-center p-5">
                    <h2 class="text-xl font-bold text-gray-800">Tambah Aset Pukal (Admin)</h2>
                    <svg class="accordion-icon w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                </button>
                <div class="accordion-content p-5 border-t border-gray-200 hidden">
                    <p>Borang untuk tambah aset akan berada di sini.</p>
                    <!-- Di sini anda boleh letak borang untuk muat naik fail CSV atau tambah aset secara manual -->
                </div>
            </div>

            <!-- Bahagian Rekod Permohonan -->
            <div class="bg-white rounded-lg shadow overflow-hidden">
                <div class="flex justify-between items-center p-5">
                    <h2 class="text-xl font-bold text-indigo-700">Rekod Permohonan dan Pinjaman</h2>
                    <button class="px-4 py-2 bg-gray-700 text-white text-sm font-medium rounded-md hover:bg-gray-800">
                        Kosongkan Rekod Lama (Selesai/Ditolak)
                    </button>
                </div>
                
                <!-- Jadual Rekod -->
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tindakan</th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Guru</th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. K/P</th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aset Dipohon</th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarikh Pinjam</th>
                                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarikh Pulang</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${mockData.records.map(rec => `
                                <tr>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div class="flex items-center space-x-3">
                                            <a href="#" class="text-blue-600 hover:text-blue-900">Pulang</a>
                                            <a href="#" class="text-gray-400 hover:text-gray-600">
                                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path></svg>
                                            </a>
                                            <a href="#" class="text-red-400 hover:text-red-600">
                                                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>
                                            </a>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${rec.teacher}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${rec.ic}</td>
                                    <td class="px-6 py-4 text-sm text-gray-500" style="white-space: pre-wrap;">${rec.asset}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${rec.start}</td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${rec.end}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // --- FUNGSI RENDER UTAMA ---
    // Fungsi ini dipanggil setiap kali state berubah (cth: tukar tab, log masuk/keluar)
    
    function renderApp() {
        // 1. Render Bahagian Pengesahan (Header)
        renderAuthSection();
        
        // 2. Render Tab Navigasi
        renderNavTabs();
        
        // 3. Render Kandungan Tab Aktif
        renderContentArea();

        // 4. Tambah Event Listeners untuk elemen yang baru di-render (cth: accordion)
        addDynamicEventListeners();
    }

    /**
     * Kemaskini bahagian header (info guru/admin & butang log masuk/keluar)
     */
    function renderAuthSection() {
        if (state.isLoggedIn) {
            // Paparan Admin
            authSection.innerHTML = `
                <span class="text-sm text-gray-600">Admin: <span class="font-medium">gurubesar@sksa.com</span></span>
                <button id="auth-button" class="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700">
                    Log Keluar
                </button>
            `;
        } else {
            // Paparan Guru
            authSection.innerHTML = `
                <span class="text-sm text-gray-600">Mod Guru (ID: <span class="font-medium">xSNPYF</span>)</span>
                <button id="auth-button" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
                    Log Masuk Admin
                </button>
            `;
        }
        
        // Tambah event listener pada butang yang baru dicipta
        document.getElementById('auth-button').addEventListener('click', handleAuthToggle);
    }

    /**
     * Kemaskini senarai tab navigasi berdasarkan status log masuk
     */
    function renderNavTabs() {
        let tabs = [];
        if (state.isLoggedIn) {
            // Tab Admin
            tabs = [
                { id: 'asetTersedia', label: 'Aset Tersedia' },
                { id: 'asetDipinjam', label: 'Aset Dipinjam' },
                { id: 'rekodPinjaman', label: 'Rekod Pinjaman' },
            ];
        } else {
            // Tab Guru
            tabs = [
                { id: 'permohonan', label: 'Permohonan' },
                { id: 'asetTersedia', label: 'Aset Tersedia' },
                { id: 'asetDipinjam', label: 'Aset Dipinjam' },
            ];
        }

        navTabs.innerHTML = tabs.map(tab => `
            <button class="tab-link py-4 px-1 mx-4 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:border-gray-300 hover:text-gray-700 ${state.currentTab === tab.id ? 'active' : ''}" data-tab-id="${tab.id}">
                ${tab.label}
            </button>
        `).join('');

        // Tambah event listener pada setiap tab
        navTabs.querySelectorAll('.tab-link').forEach(button => {
            button.addEventListener('click', handleTabClick);
        });
    }

    /**
     * Memuatkan kandungan tab yang betul ke dalam contentArea
     */
    function renderContentArea() {
        switch (state.currentTab) {
            case 'permohonan':
                contentArea.innerHTML = renderPermohonan();
                break;
            case 'asetTersedia':
                contentArea.innerHTML = renderAsetTersedia();
                break;
            case 'asetDipinjam':
                contentArea.innerHTML = renderAsetDipinjam();
                break;
            case 'rekodPinjaman':
                contentArea.innerHTML = renderRekodPinjaman();
                break;
            default:
                contentArea.innerHTML = `<p>Tab tidak dijumpai.</p>`;
        }
    }
    
    /**
     * Tambah event listener untuk elemen dinamik seperti accordion
     */
    function addDynamicEventListeners() {
        const accordions = document.querySelectorAll('.accordion-toggle');
        accordions.forEach(button => {
            button.addEventListener('click', () => {
                const content = button.nextElementSibling;
                const icon = button.querySelector('.accordion-icon');
                
                content.classList.toggle('hidden');
                icon.classList.toggle('rotate-180');
            });
        });
    }


    // --- PENGENDALI ACARA (EVENT HANDLERS) ---

    /**
     * Mengendalikan klik pada butang Log Masuk / Log Keluar
     */
    function handleAuthToggle() {
        state.isLoggedIn = !state.isLoggedIn;
        
        // Tetapkan tab lalai baru selepas log masuk/keluar
        state.currentTab = state.isLoggedIn ? 'rekodPinjaman' : 'permohonan';
        
        // Render semula keseluruhan aplikasi
        renderApp();
    }

    /**
     * Mengendalikan klik pada tab navigasi
     */
    function handleTabClick(event) {
        const tabId = event.target.dataset.tabId;
        state.currentTab = tabId;
        
        // Hanya perlu render semula tab dan kandungan, bukan header
        renderNavTabs(); // Untuk kemaskini kelas 'active'
        renderContentArea();
        addDynamicEventListeners(); // Tambah semula listener untuk kandungan baru
    }

    // --- MULAKAN APLIKASI ---
    // Panggil renderApp() sekali semasa mula untuk memaparkan paparan lalai
    renderApp();

});
