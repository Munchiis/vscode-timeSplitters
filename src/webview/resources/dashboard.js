(function () {
    // Initialize with default sort (most recently accessed)
    let currentSort = 'lastSeen';
    let currentSortDir = 'desc';

    // Initial sort
    sortTable(currentSort, currentSortDir);

    // Setup sort handlers
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const sortKey = th.dataset.sort;

            // Toggle direction if same column
            if (sortKey === currentSort) {
                currentSortDir = currentSortDir === 'asc' ? 'desc' : 'asc';
            } else {
                currentSort = sortKey;
                currentSortDir = 'asc';
            }

            // Update UI
            document.querySelectorAll('th').forEach(el => {
                el.classList.remove('sort-asc', 'sort-desc');
            });

            th.classList.add(currentSortDir === 'asc' ? 'sort-asc' : 'sort-desc');

            // Sort the table
            sortTable(currentSort, currentSortDir);
        });
    });

    function sortTable(sortKey, direction) {
        const table = document.getElementById('branchTable');
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));

        // Get data type
        const dataType = document.querySelector(`th[data-sort="${sortKey}"]`).dataset.type || 'string';

        // Sort rows
        rows.sort((a, b) => {
            let aValue, bValue;

            if (sortKey === 'branch') {
                aValue = a.dataset.branch;
                bValue = b.dataset.branch;
            } else {
                const aCell = a.querySelector(`td[data-value]:nth-child(${getColumnIndex(sortKey) + 1})`);
                const bCell = b.querySelector(`td[data-value]:nth-child(${getColumnIndex(sortKey) + 1})`);

                aValue = aCell ? aCell.dataset.value : null;
                bValue = bCell ? bCell.dataset.value : null;

                if (dataType === 'number') {
                    aValue = parseFloat(aValue);
                    bValue = parseFloat(bValue);
                } else if (dataType === 'date') {
                    aValue = new Date(parseFloat(aValue)).getTime();
                    bValue = new Date(parseFloat(bValue)).getTime();
                }
            }

            // Compare values based on direction
            const result = aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
            return direction === 'asc' ? result : -result;
        });

        // Reorder the rows
        rows.forEach(row => tbody.appendChild(row));
    }

    function getColumnIndex(columnName) {
        const headers = Array.from(document.querySelectorAll('th[data-sort]'));
        return headers.findIndex(th => th.dataset.sort === columnName);
    }

    // Auto-refresh via client-side timer backup
    setInterval(() => {
        const vscode = acquireVsCodeApi();
        vscode.postMessage({
            type: 'refresh'
        });
    }, 5000);
})();
