# MMM-Scrapey Code Assessment

**Date:** 2026-01-24
**Branch:** claude/assess-bugs-improvements-TW53r

---

## Bugs Identified

### 1. Memory Leak - setInterval never cleared (HIGH)

**Location:** `MMM-Scrapey.js:32-34`

```javascript
setInterval(() => {
    this.getData();
}, this.config.updateInterval * 1000);
```

**Issue:** The interval ID is not stored, so it cannot be cleared when the module is suspended or stopped. This causes memory leaks if the module is started/stopped multiple times.

**Fix:** Store the interval ID and clear it in a `suspend()` method.

---

### 2. Browser resource leak in Puppeteer error path (HIGH)

**Location:** `node_helper.js:48-73`

**Issue:** If `page.waitForSelector()` times out or any error occurs after browser launch, `browser.close()` is not called:

```javascript
try {
    const browser = await puppeteer.launch({...});  // Browser opens
    const page = await browser.newPage();
    await page.goto(scrapeURL, { waitUntil: 'networkidle2' });
    await page.waitForSelector(cssSelector, { timeout: 15000 });  // Can timeout here
    // ...
    await browser.close();  // Only closed on success!
} catch (error) {
    console.error(...);  // Browser left open!
}
```

**Fix:** Use try/finally or declare browser outside try block and close in catch.

---

### 3. Error data format inconsistency causes frontend issues (HIGH)

**Location:** `node_helper.js:33` and `node_helper.js:71`

**Issue:** Error responses return an array:
```javascript
data: [["Scrape target not found"]]
```

But successful responses return a string. The frontend uses `DOMParser` expecting a string at `MMM-Scrapey.js:61`. When an error array is received, the parsing fails or produces unexpected output.

**Fix:** Return consistent data types - either always strings or add type checking in frontend.

---

### 4. Network errors leave frontend stuck in "Loading" state (MEDIUM)

**Location:** `node_helper.js:43-45`

**Issue:** When fetch fails, it only logs to console but doesn't notify the frontend:

```javascript
.catch((error) => {
    console.error("[MMM-Scrapey] Error fetching data: ", error);
});
```

The frontend stays showing "Loading data..." indefinitely.

**Fix:** Send an error notification to the frontend in the catch block.

---

### 5. Inconsistent column handling between header and body rows (MEDIUM)

**Location:** `MMM-Scrapey.js:76-78` vs `MMM-Scrapey.js:113`

**Issue:** For header rows, empty `tableColumns` is handled gracefully (shows all columns):

```javascript
var columnIndices = this.config.tableColumns.length > 0
    ? this.config.tableColumns
    : Array.from({ length: originalHeaderRow.cells.length }, (_, i) => i + 1);
```

But for body rows, it directly iterates `this.config.tableColumns`:

```javascript
this.config.tableColumns.forEach((colIndex) => {  // Line 113
```

If `tableColumns` is empty, headers show all columns but body rows show none.

**Fix:** Apply the same fallback logic to body row column iteration.

---

### 6. Potential null reference - table.tBodies[0] (MEDIUM)

**Location:** `MMM-Scrapey.js:96, 101`

**Issue:** Code assumes `table.tBodies[0]` always exists:

```javascript
table.tBodies[0].deleteRow(0);  // Line 96
var rows = table.tBodies[0].rows;  // Line 101
```

Malformed scraped HTML might not have this structure, causing a runtime error.

**Fix:** Add null check before accessing tBodies[0].

---

### 7. Unused defaults: elementPrefix/elementSuffix undocumented (LOW)

**Location:** `MMM-Scrapey.js:7-8`

**Issue:** These config options exist but are not in README documentation:

```javascript
elementPrefix: "<table>",
elementSuffix: "</table>",
```

Users cannot discover or properly use these features.

**Fix:** Add documentation to README or remove if not intended for user configuration.

---

## Potential Improvements

### 1. Implement suspend()/resume() lifecycle methods

MagicMirror modules should implement these to pause/resume data fetching when the display is off, saving resources:

```javascript
suspend: function() {
    clearInterval(this.updateTimer);
},
resume: function() {
    this.getData();
    this.updateTimer = setInterval(...);
}
```

---

### 2. Add retry logic for network failures

Currently, a single network hiccup causes complete failure. Adding exponential backoff retry (2-3 attempts) would improve reliability.

---

### 3. Add fetch timeout

The basic `fetch()` call has no timeout. If a server hangs, the request waits indefinitely. Using `AbortController` with a timeout would prevent this.

---

### 4. Reuse Puppeteer browser instance

Launching a new browser for every update (~60 seconds default) is resource-intensive, especially on Raspberry Pi. Reusing a browser instance would significantly reduce CPU/memory usage.

---

### 5. Add configurable User-Agent

Some websites block default scraper user agents. Adding a `userAgent` config option would help:

```javascript
headers: { 'User-Agent': this.config.userAgent || 'Mozilla/5.0...' }
```

---

### 6. Better error states in UI

Instead of generic "No data found", show specific error messages with timestamps so users know what went wrong and when.

---

### 7. Add notification for Puppeteer unavailable

When `waitForSelector: true` but Puppeteer failed to load, the module silently falls back to basic fetch. It should warn the user.

---

### 8. Sanitize scraped HTML (Security)

The code uses `innerHTML` directly with scraped content (`MMM-Scrapey.js:84, 119-120`). While MagicMirror runs in a controlled environment, sanitizing HTML would be safer. Consider using `textContent` by default or adding a sanitization option.

---

### 9. Validate configuration values

No validation that:
- `updateInterval` is a positive number
- `tableColumns`/`tableRows` contain valid positive integers
- `url` is a valid URL format

Adding validation in `start()` would catch configuration errors early.

---

### 10. Support scraping multiple tables

Currently only scrapes the first matching element. Adding support for an index or `:nth-of-type()` selector hint would allow targeting specific tables.

---

## Summary

| Category | Count | Breakdown |
|----------|-------|-----------|
| **Bugs** | 7 | 3 High, 3 Medium, 1 Low |
| **Improvements** | 10 | Various priority |

### Priority Recommendations

**Immediate fixes (High severity bugs):**
1. Fix memory leak by storing and clearing setInterval
2. Fix Puppeteer browser leak with proper cleanup
3. Fix error data format consistency

**Short-term fixes (Medium severity):**
4. Send error notifications to frontend on network failures
5. Fix inconsistent column handling
6. Add null checks for table.tBodies

**Enhancements (when time permits):**
7. Implement suspend/resume lifecycle
8. Add retry logic and timeouts
9. Reuse Puppeteer instance
10. Add configuration validation
