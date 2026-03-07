document.addEventListener('DOMContentLoaded', () => {
    let currentProfessionalsData = [];

    function updateManagementSummary(professionalsData) {
        const total = professionalsData.length;
        const recordsCount = document.getElementById('recordsCount');
        const tableCount = document.getElementById('tableCount');
        const tableSummary = document.getElementById('tableSummary');
        if (recordsCount) recordsCount.textContent = total;
        if (tableCount) tableCount.textContent = total;
        if (tableSummary) tableSummary.textContent = total === 1 ? '1 profesional registrado.' : `${total} profesionales registrados.`;
    }

    function renderProfessionalsTable(professionalsData) {
        const listBody = document.getElementById('listBody');
        listBody.innerHTML = '';
        updateManagementSummary(professionalsData);

        if (professionalsData.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="3" class="management-empty">No hay profesionales cargados todavía.</td>';
            listBody.appendChild(row);
            return;
        }

        professionalsData.forEach((professional, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${professional.Nombre_Completo}</td>
                <td><span class="management-chip">${professional.cargo}</span></td>
                <td><button type="button" class="delete-btn management-btn management-btn--danger" data-index="${index}"><i class="fas fa-trash-alt"></i><span>Eliminar</span></button></td>
            `;
            listBody.appendChild(row);
        });
    }

    // Load initial data
    currentProfessionalsData = HubTools.data.loadProfessionalsData();
    renderProfessionalsTable(currentProfessionalsData);

    // Event Listener for Add
    document.getElementById('addForm').addEventListener('submit', (event) => {
        event.preventDefault();
        const professionalName = document.getElementById('professionalName').value;
        const professionalRole = document.getElementById('professionalRole').value;
        if (professionalName && professionalRole) {
            currentProfessionalsData.push({ Nombre_Completo: professionalName, cargo: professionalRole });
            renderProfessionalsTable(currentProfessionalsData);
            document.getElementById('addForm').reset();
        }
    });

    // Event Listener for Delete
    document.getElementById('listBody').addEventListener('click', (event) => {
        const deleteButton = event.target.closest('.delete-btn');
        if (deleteButton) {
            const index = deleteButton.dataset.index;
            currentProfessionalsData.splice(index, 1);
            renderProfessionalsTable(currentProfessionalsData);
        }
    });

    // Event Listener for Copy
    document.getElementById('copyToClipboardBtn').addEventListener('click', () => {
        HubTools.export.copyProfessionalsListToClipboard(currentProfessionalsData);
    });
});
