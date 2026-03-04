document.addEventListener('DOMContentLoaded', () => {
    let currentDrugsData = {};

    function renderDrugsTable(drugsData) {
        const listBody = document.getElementById('listBody');
        listBody.innerHTML = '';
        for (const category in drugsData) {
            drugsData[category].forEach(drug => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${drug}</td>
                    <td>${category}</td>
                    <td><button class="delete-btn" data-drug="${drug}" data-category="${category}">Eliminar</button></td>
                `;
                listBody.appendChild(row);
            });
        }
    }

    // Load initial data
    currentDrugsData = HubTools.data.loadDrugsData();
    renderDrugsTable(currentDrugsData);

    // Event Listener for Add
    document.getElementById('addForm').addEventListener('submit', (event) => {
        event.preventDefault();
        const drugName = document.getElementById('drugName').value;
        const drugCategory = document.getElementById('drugCategory').value;
        if (drugName && drugCategory) {
            if (!currentDrugsData[drugCategory]) {
                currentDrugsData[drugCategory] = [];
            }
            currentDrugsData[drugCategory].push(drugName);
            renderDrugsTable(currentDrugsData);
            document.getElementById('addForm').reset();
        }
    });

    // Event Listener for Delete
    document.getElementById('listBody').addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-btn')) {
            const drugName = event.target.dataset.drug;
            const drugCategory = event.target.dataset.category;
            currentDrugsData[drugCategory] = currentDrugsData[drugCategory].filter(drug => drug !== drugName);
            renderDrugsTable(currentDrugsData);
        }
    });

    // Event Listener for Copy
    document.getElementById('copyToClipboardBtn').addEventListener('click', () => {
        HubTools.export.copyDrugsListToClipboard(currentDrugsData);
    });
});
