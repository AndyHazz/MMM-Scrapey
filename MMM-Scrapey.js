Module.register("MMM-Scrapey", {
    // Default module config
    defaults: {
        updateInterval: 60, // seconds
        url: "https://webscraper.io/test-sites/tables/tables-semantically-correct",
        cssSelector: "table",
        elementPrefix: "<table>",
        elementSuffix: "</table>",
        tableColumns: [1,2,3], // 1-based index
        tableRows: [], // 1-based index, empty = show all
        showTableHeader: true,
        plainText: false,
        title: "Scrapey Data",
        waitForSelector: false,
        browserPath: "/usr/bin/chromium-browser",
        tableWidth: "100%",
        headerStyle: {
            opacity: null,
            color: null
        },
        rowStyle: {
            opacity: null,
            color: null
        },
        // New configuration options
        userAgent: null, // Custom User-Agent string
        fetchTimeout: 30000, // Fetch timeout in ms (default 30s)
        retryCount: 3, // Number of retry attempts
        retryDelay: 2000, // Initial retry delay in ms
        sanitizeHtml: false // Strip potentially dangerous HTML tags
    },

    // Store state
    updateTimer: null,
    scrapeData: null,
    lastError: null,
    lastUpdate: null,

    start: function () {
        this.instanceId = this.identifier;
        Log.info("Starting module: " + this.name + " with instanceId: " + this.instanceId);

        // Validate configuration
        this.validateConfig();

        // Initialize state
        this.scrapeData = null;
        this.lastError = null;
        this.lastUpdate = null;

        // Initial data fetch
        this.getData();

        // Store interval reference so it can be cleared (fixes memory leak)
        this.updateTimer = setInterval(() => {
            this.getData();
        }, this.config.updateInterval * 1000);
    },

    // Validate configuration values
    validateConfig: function () {
        // Validate updateInterval
        if (typeof this.config.updateInterval !== 'number' || this.config.updateInterval <= 0) {
            Log.warn("[MMM-Scrapey] Invalid updateInterval, using default (60)");
            this.config.updateInterval = 60;
        }

        // Validate URL
        if (!this.config.url || typeof this.config.url !== 'string') {
            Log.error("[MMM-Scrapey] URL is required");
        }

        // Validate tableColumns - must be array of positive integers
        if (!Array.isArray(this.config.tableColumns)) {
            Log.warn("[MMM-Scrapey] tableColumns must be an array, using default");
            this.config.tableColumns = [1, 2, 3];
        } else {
            this.config.tableColumns = this.config.tableColumns.filter(col =>
                typeof col === 'number' && col > 0 && Number.isInteger(col)
            );
        }

        // Validate tableRows - must be array of positive integers
        if (!Array.isArray(this.config.tableRows)) {
            Log.warn("[MMM-Scrapey] tableRows must be an array, using default");
            this.config.tableRows = [];
        } else {
            this.config.tableRows = this.config.tableRows.filter(row =>
                typeof row === 'number' && row > 0 && Number.isInteger(row)
            );
        }

        // Validate fetchTimeout
        if (typeof this.config.fetchTimeout !== 'number' || this.config.fetchTimeout <= 0) {
            this.config.fetchTimeout = 30000;
        }

        // Validate retryCount
        if (typeof this.config.retryCount !== 'number' || this.config.retryCount < 0) {
            this.config.retryCount = 3;
        }

        // Validate retryDelay
        if (typeof this.config.retryDelay !== 'number' || this.config.retryDelay < 0) {
            this.config.retryDelay = 2000;
        }
    },

    // MagicMirror lifecycle: called when module should pause
    suspend: function () {
        Log.info("[MMM-Scrapey] Suspending module: " + this.instanceId);
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
    },

    // MagicMirror lifecycle: called when module should resume
    resume: function () {
        Log.info("[MMM-Scrapey] Resuming module: " + this.instanceId);
        this.getData();
        this.updateTimer = setInterval(() => {
            this.getData();
        }, this.config.updateInterval * 1000);
    },

    getData: function () {
        this.sendSocketNotification("FETCH_SCRAPE_DATA", {
            instanceId: this.instanceId,
            url: this.config.url,
            cssSelector: this.config.cssSelector,
            waitForSelector: this.config.waitForSelector,
            browserPath: this.config.browserPath,
            userAgent: this.config.userAgent,
            fetchTimeout: this.config.fetchTimeout,
            retryCount: this.config.retryCount,
            retryDelay: this.config.retryDelay
        });
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "SCRAPE_DATA" && payload.instanceId === this.instanceId) {
            this.lastUpdate = new Date();

            if (payload.error) {
                this.lastError = payload.error;
                this.scrapeData = null;
                Log.error("[MMM-Scrapey] Error received: " + payload.error);
            } else {
                this.lastError = null;
                this.scrapeData = payload.data;
            }
            this.updateDom();
        } else if (notification === "SCRAPE_WARNING" && payload.instanceId === this.instanceId) {
            Log.warn("[MMM-Scrapey] Warning: " + payload.message);
        }
    },

    // Sanitize HTML by removing potentially dangerous tags
    sanitizeHtmlContent: function (html) {
        if (!this.config.sanitizeHtml) {
            return html;
        }
        // Remove script, iframe, object, embed, form tags
        var sanitized = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
            .replace(/<embed\b[^>]*>/gi, '')
            .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
            .replace(/\bon\w+\s*=/gi, 'data-removed='); // Remove event handlers
        return sanitized;
    },

    getDom: function () {
        var wrapper = document.createElement("div");
        wrapper.className = "mmm-scrapey-wrapper";

        // Show error state
        if (this.lastError) {
            wrapper.className += " mmm-scrapey-error";
            var errorDiv = document.createElement("div");
            errorDiv.className = "mmm-scrapey-error-message";
            errorDiv.innerHTML = "Error: " + this.lastError;
            wrapper.appendChild(errorDiv);

            if (this.lastUpdate) {
                var timeDiv = document.createElement("div");
                timeDiv.className = "mmm-scrapey-error-time xsmall dimmed";
                timeDiv.innerHTML = "Last attempt: " + this.lastUpdate.toLocaleTimeString();
                wrapper.appendChild(timeDiv);
            }
            return wrapper;
        }

        // Show loading state
        if (!this.scrapeData) {
            wrapper.innerHTML = "Loading data...";
            return wrapper;
        }

        // Sanitize HTML if enabled
        var cleanData = this.sanitizeHtmlContent(this.scrapeData);

        var scrapeHTML = new DOMParser().parseFromString(
            this.config.elementPrefix + cleanData + this.config.elementSuffix,
            'text/html'
        );
        var table = scrapeHTML.querySelector("table");

        if (!table) {
            wrapper.innerHTML = "No table found in scraped data.";
            return wrapper;
        }

        // Check if table has tbody (fixes potential null reference)
        if (!table.tBodies || table.tBodies.length === 0) {
            wrapper.innerHTML = "Invalid table structure (no tbody).";
            return wrapper;
        }

        var filteredTable = document.createElement("table");
        filteredTable.style.width = this.config.tableWidth;

        // Determine column indices once for consistency between header and body
        var columnIndices = this.getColumnIndices(table);

        // Handle header if showTableHeader is true
        if (this.config.showTableHeader) {
            var thead = filteredTable.createTHead();
            var headerRow = thead.insertRow();
            var originalHeaderRow = table.tHead && table.tHead.rows.length > 0
                ? table.tHead.rows[0]
                : table.tBodies[0].rows[0];

            if (originalHeaderRow) {
                columnIndices.forEach((colIndex) => {
                    var cell = originalHeaderRow.cells[colIndex - 1];
                    if (cell) {
                        var th = document.createElement("th");
                        th.innerHTML = this.config.plainText ? cell.innerText : cell.innerHTML;
                        if (this.config.headerStyle.opacity !== null) {
                            th.style.opacity = this.config.headerStyle.opacity;
                        }
                        if (this.config.headerStyle.color !== null) {
                            th.style.color = this.config.headerStyle.color;
                        }
                        headerRow.appendChild(th);
                    }
                });

                // Remove header row from tbody if no thead exists
                if (!table.tHead && table.tBodies[0].rows.length > 0) {
                    table.tBodies[0].deleteRow(0);
                }
            }
        }

        var tbody = filteredTable.createTBody();
        var rows = table.tBodies[0].rows;
        var rowIndices = this.config.tableRows.length > 0
            ? this.config.tableRows
            : Array.from({ length: rows.length }, (_, i) => i + 1);

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

                // Use same columnIndices as header (fixes inconsistent column handling)
                columnIndices.forEach((colIndex) => {
                    var cell = row.cells[colIndex - 1];
                    if (cell) {
                        var newCell = newRow.insertCell();
                        if (this.config.plainText) {
                            newCell.innerHTML = cell.innerText;
                        } else {
                            newCell.innerHTML = cell.innerHTML;
                        }
                    }
                });
            }
        });

        wrapper.appendChild(filteredTable);
        return wrapper;
    },

    // Helper to get column indices consistently
    getColumnIndices: function (table) {
        if (this.config.tableColumns.length > 0) {
            return this.config.tableColumns;
        }

        // Determine from table structure
        var sampleRow = table.tHead && table.tHead.rows.length > 0
            ? table.tHead.rows[0]
            : (table.tBodies[0].rows.length > 0 ? table.tBodies[0].rows[0] : null);

        if (sampleRow) {
            return Array.from({ length: sampleRow.cells.length }, (_, i) => i + 1);
        }

        return [1, 2, 3]; // fallback
    },

    getHeader: function () {
        return this.config.title;
    }
});
