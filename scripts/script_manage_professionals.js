document.addEventListener('DOMContentLoaded', () => {
    let currentProfessionalsData = [];

    function renderProfessionalsTable(professionalsData) {
        const listBody = document.getElementById('listBody');
        listBody.innerHTML = '';
        professionalsData.forEach((professional, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${professional.Nombre_Completo}</td>
                <td>${professional.cargo}</td>
                <td><button class="delete-btn" data-index="${index}">Eliminar</button></td>
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
        if (event.target.classList.contains('delete-btn')) {
            const index = event.target.dataset.index;
            currentProfessionalsData.splice(index, 1);
            renderProfessionalsTable(currentProfessionalsData);
        }
    });

    // Event Listener for Copy
    document.getElementById('copyToClipboardBtn').addEventListener('click', () => {
        HubTools.export.copyProfessionalsListToClipboard(currentProfessionalsData);
    });
});
