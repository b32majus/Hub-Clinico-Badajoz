document.addEventListener('DOMContentLoaded', () => {
    let currentDrugsData = {};

    function updateManagementSummary(drugsData) {
        const total = Object.values(drugsData).reduce((acc, items) => acc + items.length, 0);
        const recordsCount = document.getElementById('recordsCount');
        const tableCount = document.getElementById('tableCount');
        const tableSummary = document.getElementById('tableSummary');
        if (recordsCount) recordsCount.textContent = total;
        if (tableCount) tableCount.textContent = total;
        if (tableSummary) tableSummary.textContent = total === 1 ? '1 fármaco en catálogo.' : `${total} fármacos en catálogo.`;
    }

    function renderDrugsTable(drugsData) {
        const listBody = document.getElementById('listBody');
        listBody.innerHTML = '';
        updateManagementSummary(drugsData);

        const total = Object.values(drugsData).reduce((acc, items) => acc + items.length, 0);
        if (total === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="3" class="management-empty">No hay fármacos cargados todavía.</td>';
            listBody.appendChild(row);
            return;
        }

        for (const category in drugsData) {
            drugsData[category].forEach(drug => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${drug}</td>
                    <td><span class="management-chip">${category}</span></td>
                    <td><button type="button" class="delete-btn management-btn management-btn--danger" data-drug="${drug}" data-category="${category}"><i class="fas fa-trash-alt"></i><span>Eliminar</span></button></td>
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
        const deleteButton = event.target.closest('.delete-btn');
        if (deleteButton) {
            const drugName = deleteButton.dataset.drug;
            const drugCategory = deleteButton.dataset.category;
            currentDrugsData[drugCategory] = currentDrugsData[drugCategory].filter(drug => drug !== drugName);
            renderDrugsTable(currentDrugsData);
        }
    });

    // Event Listener for Copy
    document.getElementById('copyToClipboardBtn').addEventListener('click', () => {
        HubTools.export.copyDrugsListToClipboard(currentDrugsData);
    });
});
