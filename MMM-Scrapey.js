Module.register("MMM-Scrapey", {
    // Default module config
    defaults: {
        updateInterval: 60, // 1 minute
        url: "https://webscraper.io/test-sites/tables/tables-semantically-correct", // URL to scrape from
        cssSelector: "table", // Selector for the output
        elementPrefix: "<table>",
        elementSuffix: "</table>",
        tableColumns: [1,2,3], // Specify which columns to display (1-based index)
        tableRows: [], // Specify which rows to display (1-based index), leave empty to show all
        showTableHeader: true, // Toggle header row formatting
        title: "Scrapey Data" // Default header text
    },

    start: function () {
        this.instanceId = this.identifier;
        Log.info("Starting module: " + this.name + " with instanceId: " + this.instanceId);
        this.scrapeData = null; 
        this.getData();
        setInterval(() => {
            this.getData();
        }, this.config.updateInterval * 1000);
    },

    getData: function () {
        this.sendSocketNotification("FETCH_SCRAPE_DATA", {
            instanceId: this.instanceId,
            url: this.config.url,
            cssSelector: this.config.cssSelector
        });
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "SCRAPE_DATA" && payload.instanceId === this.instanceId) {
            this.scrapeData = payload.data;
            this.updateDom();
        }
    },

    getDom: function () {
        var wrapper = document.createElement("div");
        if (!this.scrapeData) {
            wrapper.innerHTML = "Loading data...";
            return wrapper;
        }

        var scrapeHTML = new DOMParser().parseFromString(this.config.elementPrefix + this.scrapeData + this.config.elementSuffix, 'text/html');
        var table = scrapeHTML.querySelector("table");

        if (table) {
            var filteredTable = document.createElement("table");
            // Handle header if showHeader is true
            if (this.config.showHeader) {
                var thead = filteredTable.createTHead();
                var headerRow = thead.insertRow();
                var originalHeaderRow = table.tHead ? table.tHead.rows[0] : table.tBodies[0].rows[0];

                // If tableColumns is empty, show all columns
                var columnIndices = this.config.tableColumns.length > 0
                    ? this.config.tableColumns
                    : Array.from({ length: originalHeaderRow.cells.length }, (_, i) => i + 1);

                columnIndices.forEach((colIndex) => {
                    var cell = originalHeaderRow.cells[colIndex - 1];
                    if (cell) {
                        var th = document.createElement("th");
                        th.innerHTML = cell.innerHTML;
                        headerRow.appendChild(th);
                    }
                });

                if (!table.tHead) {
                    table.tBodies[0].deleteRow(0); // Remove header row from tbody if no thead exists
                }
            }

            var tbody = filteredTable.createTBody();
            var rows = table.tBodies[0].rows;
            var rowIndices = this.config.tableRows.length > 0 ? this.config.tableRows : Array.from({ length: rows.length }, (_, i) => i + 1);
            rowIndices.forEach((rowIndex) => {
                var row = rows[rowIndex - 1];
                if (row) {
                    var newRow = tbody.insertRow();
                    this.config.tableColumns.forEach((colIndex) => {
                        var cell = row.cells[colIndex - 1];
                        if (cell) {
                            var newCell = newRow.insertCell();
                            newCell.innerHTML = cell.innerHTML;
                        }
                    });
                }
            });

            wrapper.appendChild(filteredTable);
        } else {
            wrapper.innerHTML = "No data found for the selector.";
        }

        return wrapper;
    },

    getHeader: function () {
        return this.config.title;
    }
});
