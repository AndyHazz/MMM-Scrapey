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
        plainText: false, // If true, ignore any HTML formatting and just display the text
        title: "Scrapey Data", // Default header text
        waitForSelector: false, // Wait for selector to appear (for JS-loaded tables)
        browserPath: "/usr/bin/chromium-browser", // Default browser path for puppeteer
        tableWidth: "100%", // <--- Add this line for width preset
        headerStyle: {
            opacity: null,   // e.g. 1.0
            color: null      // e.g. "#fff"
        },
        rowStyle: {
            opacity: null,   // e.g. 0.92
            color: null      // e.g. "#fff"
        }
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
            cssSelector: this.config.cssSelector,
            waitForSelector: this.config.waitForSelector,
            browserPath: this.config.browserPath // Pass browser path
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
            // Set table width from config
            filteredTable.style.width = this.config.tableWidth;

            // Handle header if showTableHeader is true
            if (this.config.showTableHeader) {
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
                        if (this.config.headerStyle.opacity !== null) {
                            th.style.opacity = this.config.headerStyle.opacity;
                        }
                        if (this.config.headerStyle.color !== null) {
                            th.style.color = this.config.headerStyle.color;
                        }
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
                    if (this.config.rowStyle.opacity !== null) {
                        newRow.style.opacity = this.config.rowStyle.opacity;
                    }
                    if (this.config.rowStyle.color !== null) {
                        newRow.style.color = this.config.rowStyle.color;
                    }
                    this.config.tableColumns.forEach((colIndex) => {
                        var cell = row.cells[colIndex - 1];
                        if (cell) {
                            var newCell = newRow.insertCell();
                            if (this.config.plainText) {
                                newCell.innerHTML = cell.innerText;
                            } else  {
                                newCell.innerHTML = cell.innerHTML;
                            }
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
    },
});
