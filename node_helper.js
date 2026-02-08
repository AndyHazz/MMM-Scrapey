const NodeHelper = require("node_helper");
const cheerio = require("cheerio");
const fetch = require("node-fetch");
const AbortController = require("abort-controller");

let puppeteer;
try {
    puppeteer = require("puppeteer");
} catch (e) {
    puppeteer = null;
    console.warn("[MMM-Scrapey] Puppeteer not available. Dynamic table scraping will use fallback method.");
}

module.exports = NodeHelper.create({
    // Store browser instance for reuse
    browserInstance: null,
    browserPath: null,

    start: function () {
        console.log("[MMM-Scrapey] Starting node helper for module: " + this.name);
    },

    stop: function () {
        // Clean up browser instance on shutdown
        this.closeBrowser();
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "FETCH_SCRAPE_DATA") {
            if (payload.waitForSelector) {
                if (puppeteer) {
                    this.fetchDataWithPuppeteer(payload);
                } else {
                    // Warn that Puppeteer is unavailable but was requested
                    this.sendSocketNotification("SCRAPE_WARNING", {
                        instanceId: payload.instanceId,
                        message: "Puppeteer unavailable, falling back to basic fetch. Dynamic tables may not load correctly."
                    });
                    this.fetchData(payload);
                }
            } else {
                this.fetchData(payload);
            }
        }
    },

    // Helper: sleep for retry delays
    sleep: function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Fetch data with retry logic and timeout
    fetchData: async function (payload) {
        const { url, cssSelector, instanceId, userAgent, fetchTimeout = 30000, retryCount = 3, retryDelay = 2000 } = payload;

        let lastError = null;

        for (let attempt = 0; attempt <= retryCount; attempt++) {
            try {
                // Create abort controller for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), fetchTimeout);

                const headers = {};
                if (userAgent) {
                    headers['User-Agent'] = userAgent;
                }

                const response = await fetch(url, {
                    signal: controller.signal,
                    headers: headers
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const body = await response.text();
                const $ = cheerio.load(body);
                const scrapedData = $(cssSelector).html();

                if (!scrapedData) {
                    console.error(`[MMM-Scrapey] '${cssSelector}' not found in HTML.`);
                    this.sendSocketNotification("SCRAPE_DATA", {
                        instanceId: instanceId,
                        error: `Selector '${cssSelector}' not found`
                    });
                    return;
                }

                // Success - send data (always as string)
                this.sendSocketNotification("SCRAPE_DATA", {
                    instanceId: instanceId,
                    data: scrapedData
                });
                return;

            } catch (error) {
                lastError = error;

                if (error.name === 'AbortError') {
                    console.error(`[MMM-Scrapey] Fetch timeout after ${fetchTimeout}ms (attempt ${attempt + 1}/${retryCount + 1})`);
                } else {
                    console.error(`[MMM-Scrapey] Fetch error (attempt ${attempt + 1}/${retryCount + 1}): `, error.message);
                }

                // Retry with exponential backoff
                if (attempt < retryCount) {
                    const delay = retryDelay * Math.pow(2, attempt);
                    console.log(`[MMM-Scrapey] Retrying in ${delay}ms...`);
                    await this.sleep(delay);
                }
            }
        }

        // All retries failed - notify frontend with error (fixes network errors not notifying)
        this.sendSocketNotification("SCRAPE_DATA", {
            instanceId: instanceId,
            error: `Failed after ${retryCount + 1} attempts: ${lastError.message}`
        });
    },

    // Get or create browser instance (reuses browser for efficiency)
    getBrowser: async function (browserPath) {
        // If browser path changed or no instance exists, create new one
        if (this.browserInstance && this.browserPath !== browserPath) {
            await this.closeBrowser();
        }

        if (!this.browserInstance) {
            this.browserPath = browserPath;
            this.browserInstance = await puppeteer.launch({
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                executablePath: browserPath || '/usr/bin/chromium-browser',
                headless: 'new'
            });
            console.log("[MMM-Scrapey] Puppeteer browser instance created");

            // Handle unexpected browser close
            this.browserInstance.on('disconnected', () => {
                console.log("[MMM-Scrapey] Browser disconnected");
                this.browserInstance = null;
            });
        }

        return this.browserInstance;
    },

    // Close browser instance
    closeBrowser: async function () {
        if (this.browserInstance) {
            try {
                await this.browserInstance.close();
                console.log("[MMM-Scrapey] Browser instance closed");
            } catch (e) {
                console.error("[MMM-Scrapey] Error closing browser:", e.message);
            }
            this.browserInstance = null;
        }
    },

    // Fetch data with Puppeteer (with proper cleanup and retry)
    fetchDataWithPuppeteer: async function (payload) {
        const { url, cssSelector, instanceId, browserPath, userAgent, retryCount = 3, retryDelay = 2000 } = payload;

        let lastError = null;
        let page = null;

        for (let attempt = 0; attempt <= retryCount; attempt++) {
            try {
                const browser = await this.getBrowser(browserPath);
                page = await browser.newPage();

                // Set custom user agent if provided
                if (userAgent) {
                    await page.setUserAgent(userAgent);
                }

                await page.goto(url, {
                    waitUntil: 'networkidle2',
                    timeout: 30000
                });

                await page.waitForSelector(cssSelector, { timeout: 15000 });

                console.info(`[MMM-Scrapey] Selector "${cssSelector}" found, scraping for instanceId: ${instanceId}`);

                const scrapedData = await page.$eval(cssSelector, el => el.innerHTML);

                // Close page (but keep browser for reuse)
                await page.close();
                page = null;

                // Success - send data
                this.sendSocketNotification("SCRAPE_DATA", {
                    instanceId: instanceId,
                    data: scrapedData
                });
                return;

            } catch (error) {
                lastError = error;
                console.error(`[MMM-Scrapey] Puppeteer error (attempt ${attempt + 1}/${retryCount + 1}): `, error.message);

                // Clean up page on error (fixes browser resource leak)
                if (page) {
                    try {
                        await page.close();
                    } catch (e) {
                        // Page may already be closed
                    }
                    page = null;
                }

                // If browser crashed, reset instance
                if (error.message.includes('Target closed') || error.message.includes('Protocol error')) {
                    this.browserInstance = null;
                }

                // Retry with exponential backoff
                if (attempt < retryCount) {
                    const delay = retryDelay * Math.pow(2, attempt);
                    console.log(`[MMM-Scrapey] Retrying in ${delay}ms...`);
                    await this.sleep(delay);
                }
            }
        }

        // All retries failed - notify frontend with error
        this.sendSocketNotification("SCRAPE_DATA", {
            instanceId: instanceId,
            error: `Puppeteer failed after ${retryCount + 1} attempts: ${lastError.message}`
        });
    }
});
