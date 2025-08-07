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

## Updating
Go to the module’s folder inside MagicMirror modules folder and pull the latest version from GitHub and install:
```sh
git pull
npm install
```

## Configuration Options

| Option            | Type      | Default                        | Description                                                                 |
|-------------------|-----------|--------------------------------|-----------------------------------------------------------------------------|
| `title`           | string    | "Scrapey Data"                 | Module header text                                                          |
| `url`             | string    | *required*                     | URL of the page to scrape                                                   |
| `updateInterval`  | int       | 60                             | Refresh interval in seconds                                                 |
| `cssSelector`     | string    | "table"                        | CSS selector for the table to scrape                                        |
| `tableColumns`    | array     | [1,2,3]                        | Columns to display (1-based index)                                          |
| `tableRows`       | array     | []                             | Rows to display (1-based index, empty for all)                              |
| `showTableHeader` | boolean   | true                           | Show the table header row                                                   |
| `plainText`       | boolean   | false                          | Display only plain text (no HTML)                                           |
| `waitForSelector` | boolean   | false                          | Wait for selector (for JS-loaded tables, requires Puppeteer)                |
| `browserPath`     | string    | "/usr/bin/chromium-browser"    | Path to Chromium/Chrome for Puppeteer                                       |
| `tableWidth`      | string    | "100%"                         | CSS width for the table (e.g., "100%", "1200px")                            |
| `headerStyle`     | object    | `{ opacity: null, color: null }` | Style for table header: set `opacity` (0.0–1.0, null for no style) and/or `color` (e.g., "#fff") |
| `rowStyle`        | object    | `{ opacity: null, color: null }` | Style for table rows: set `opacity` (0.0–1.0, null for no style) and/or `color` (e.g., "#fff")   |
