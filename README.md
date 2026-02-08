# MMM-Scrapey

Module for [MagicMirror²](https://github.com/MichMich/MagicMirror/), to scrape content from any table on a webpage, choose which rows and columns you want, and how often you want to refresh the display on your mirror.

![Alt text](/img/demo.png "A preview of the MMM-Scrapey module showing bus times.")
![Alt text](/img/demo-2.png "A preview of the MMM-Scrapey module reading from a scrape test page.")

## Installing

### Step 1 - Install the module
```sh
cd ~/MagicMirror/modules
git clone https://github.com/AndyHazz/MMM-Scrapey.git
cd MMM-Scrapey
npm install
```

### Step 2 - Add module to `~MagicMirror/config/config.js`
Add this configuration into your `config.js` file:
```js
{
    module: "MMM-Scrapey",
    position: "lower_third",
    config: {
        title: "Scrapey module", // Optional - remove or leave empty for no title
        url: "https://webscraper.io/test-sites/tables", // The URL of the page with the table to scrape
        updateInterval: 300, // Refresh time in seconds
        cssSelector: "table", // CSS selector for the table to scrape
        tableColumns: [1,3,4], // Specify which columns to display (1-based index)
        tableRows: [1,2,3], // Specify which rows to display (1-based index), leave empty to show all
        showTableHeader: true, // Toggle formatting the first row as a table header
        plainText: true, // Strip out any extra HTML and just keep the plain text content
        waitForSelector: false, // Set to true if the table loads dynamically via JavaScript
        browserPath: "/usr/bin/chromium-browser", // Path to Chromium/Chrome for Puppeteer (change if needed)
        tableWidth: "100%" // Set table width (e.g., "100%", "1200px", etc.)
    }
},
```

### Dynamic Table Support

If the table you want to scrape loads via JavaScript (not present in the initial HTML), set `waitForSelector: true` in your config.
**Note:** You must have [Puppeteer](https://pptr.dev/) and a compatible version of Chromium/Chrome installed.
You can specify the path to your browser with `browserPath`.
On Raspberry Pi, this is usually `/usr/bin/chromium-browser` or `/usr/bin/chromium`.

### Example for Raspberry Pi
```js
config: {
    // ...other config...
    waitForSelector: true,
    browserPath: "/usr/bin/chromium"
}
```

### Advanced Configuration Example
```js
{
    module: "MMM-Scrapey",
    position: "lower_third",
    config: {
        title: "Flight Arrivals",
        url: "https://example.com/arrivals",
        updateInterval: 120,
        cssSelector: "table.arrivals",
        tableColumns: [1, 2, 4, 5],
        tableRows: [],
        showTableHeader: true,
        plainText: false,
        waitForSelector: true,
        browserPath: "/usr/bin/chromium",
        tableWidth: "100%",
        headerStyle: {
            opacity: 1.0,
            color: "#4fc3f7"
        },
        rowStyle: {
            opacity: 0.9,
            color: "#ffffff"
        },
        // Network reliability options
        userAgent: "Mozilla/5.0 (compatible; MagicMirror)",
        fetchTimeout: 30000,
        retryCount: 3,
        retryDelay: 2000,
        // Security option
        sanitizeHtml: true
    }
}
```

## Updating
Go to the module's folder inside MagicMirror modules folder and pull the latest version from GitHub and install:
```sh
git pull
npm install
```

## Configuration Options

### Basic Options

| Option            | Type      | Default                        | Description                                                                 |
|-------------------|-----------|--------------------------------|-----------------------------------------------------------------------------|
| `title`           | string    | "Scrapey Data"                 | Module header text                                                          |
| `url`             | string    | *required*                     | URL of the page to scrape                                                   |
| `updateInterval`  | int       | 60                             | Refresh interval in seconds                                                 |
| `cssSelector`     | string    | "table"                        | CSS selector for the table to scrape                                        |
| `tableColumns`    | array     | [1,2,3]                        | Columns to display (1-based index), empty array shows all columns           |
| `tableRows`       | array     | []                             | Rows to display (1-based index, empty for all)                              |
| `showTableHeader` | boolean   | true                           | Show the table header row                                                   |
| `plainText`       | boolean   | false                          | Display only plain text (no HTML)                                           |
| `tableWidth`      | string    | "100%"                         | CSS width for the table (e.g., "100%", "1200px")                            |

### Dynamic Content Options

| Option            | Type      | Default                        | Description                                                                 |
|-------------------|-----------|--------------------------------|-----------------------------------------------------------------------------|
| `waitForSelector` | boolean   | false                          | Wait for selector (for JS-loaded tables, requires Puppeteer)                |
| `browserPath`     | string    | "/usr/bin/chromium-browser"    | Path to Chromium/Chrome for Puppeteer                                       |

### Styling Options

| Option            | Type      | Default                          | Description                                                                 |
|-------------------|-----------|----------------------------------|-----------------------------------------------------------------------------|
| `headerStyle`     | object    | `{ opacity: null, color: null }` | Style for table header: set `opacity` (0.0–1.0) and/or `color` (e.g., "#fff") |
| `rowStyle`        | object    | `{ opacity: null, color: null }` | Style for table rows: set `opacity` (0.0–1.0) and/or `color` (e.g., "#fff")   |

### Advanced/Wrapper Options

| Option            | Type      | Default                        | Description                                                                 |
|-------------------|-----------|--------------------------------|-----------------------------------------------------------------------------|
| `elementPrefix`   | string    | "\<table\>"                    | HTML prefix wrapped around scraped content before parsing                   |
| `elementSuffix`   | string    | "\</table\>"                   | HTML suffix wrapped around scraped content after parsing                    |

### Network & Reliability Options

| Option            | Type      | Default                        | Description                                                                 |
|-------------------|-----------|--------------------------------|-----------------------------------------------------------------------------|
| `userAgent`       | string    | null                           | Custom User-Agent string for HTTP requests (helps avoid blocks)             |
| `fetchTimeout`    | int       | 30000                          | Request timeout in milliseconds                                             |
| `retryCount`      | int       | 3                              | Number of retry attempts on network failure                                 |
| `retryDelay`      | int       | 2000                           | Initial retry delay in ms (uses exponential backoff)                        |

### Security Options

| Option            | Type      | Default                        | Description                                                                 |
|-------------------|-----------|--------------------------------|-----------------------------------------------------------------------------|
| `sanitizeHtml`    | boolean   | false                          | Strip potentially dangerous HTML tags (script, iframe, etc.) from scraped content |

## Features

- **Table Scraping**: Extract data from any HTML table on the web
- **Column/Row Selection**: Display only the columns and rows you need
- **Dynamic Tables**: Support for JavaScript-rendered tables via Puppeteer
- **Custom Styling**: Configure header and row colors/opacity
- **Network Resilience**: Automatic retry with exponential backoff on failures
- **Request Timeout**: Configurable timeout prevents hanging requests
- **Custom User-Agent**: Avoid bot detection on some websites
- **HTML Sanitization**: Optional security feature to strip dangerous content
- **Browser Reuse**: Efficient Puppeteer usage by reusing browser instances
- **Lifecycle Support**: Proper suspend/resume for power-saving modes

## Troubleshooting

### "Loading data..." never changes
- Check that your URL is correct and accessible
- Verify your CSS selector matches an element on the page
- Check MagicMirror logs for error messages
- Try increasing `fetchTimeout` if the server is slow

### Dynamic table not loading
- Ensure `waitForSelector: true` is set
- Verify Puppeteer is installed: `npm install puppeteer`
- Check that `browserPath` points to a valid Chromium/Chrome installation
- Try increasing the timeout in your browser path

### "Puppeteer unavailable" warning
- Install Puppeteer: `npm install puppeteer`
- On Raspberry Pi, you may need to install Chromium: `sudo apt install chromium-browser`

### Table appears but columns/rows are wrong
- Remember that `tableColumns` and `tableRows` use 1-based indexing
- An empty array `[]` means "show all"
- Use browser DevTools to inspect the table structure

## License

ISC
