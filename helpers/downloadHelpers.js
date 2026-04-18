export async function detectDownloadSection(page) {
  const downloadSection = page.locator('div[role="tabpanel"][id*="downloads"]');

  try {
    const count = await downloadSection.count();
    return count > 0 ? downloadSection.first() : null;
  } catch {
    return null;
  }
}

export async function collectDownloadUrls(page) {
  const accordionButtons = page.locator('button[aria-expanded="false"]');
  const accordionCount = await accordionButtons.count();

  if (accordionCount > 0) {
    for (let i = 0; i < accordionCount; i++) {
      try {
        const btn = accordionButtons.nth(i);
        await btn.scrollIntoViewIfNeeded();
        await btn.click();
        await page.waitForTimeout(300);
      } catch {
        continue;
      }
    }
  }

  const urls = await page.evaluate(() => {
    const downloadSection = document.querySelector(
      'div[role="tabpanel"][id*="downloads"]',
    );
    if (!downloadSection) return [];

    const links = Array.from(downloadSection.querySelectorAll("a[href]"));
    return links
      .filter((link) => {
        const href = link.getAttribute("href");
        return href && href.endsWith(".pdf");
      })
      .map((link) => link.getAttribute("href"))
      .filter((url, idx, arr) => arr.indexOf(url) === idx);
  });

  return urls;
}

export async function verifyPdfLink(request, url) {
  try {
    const response = await request.head(url, {
      timeout: 15000,
      ignoreHTTPSErrors: true,
    });

    const status = response.status();
    const contentType = response.headers()["content-type"] || "";

    const isPdf = contentType.includes("application/pdf");

    return {
      url,
      status,
      contentType,
      isPdf,
      valid: status === 200 && isPdf,
    };
  } catch (error) {
    return {
      url,
      status: 0,
      contentType: "error",
      isPdf: false,
      valid: false,
      error: error.message,
    };
  }
}

export async function testBulkDownload(page) {
  const downloadSection = await detectDownloadSection(page);
  if (!downloadSection) {
    console.log("[LOG] Bulk download: no download section");
    return false;
  }

  let checkboxButtons;
  let checkboxCount = 0;

  const checkboxSelectors = [
    'button[role="checkbox"][data-slot="checkbox"]',
    'button[role="checkbox"]',
    'input[type="checkbox"]',
    '[data-testid*="checkbox"]',
    ".checkbox",
  ];

  for (const selector of checkboxSelectors) {
    const locator = downloadSection.locator(selector);
    const count = await locator.count();
    if (count > 0) {
      console.log(`[LOG] Found ${count} checkboxes with selector: ${selector}`);
      checkboxButtons = locator;
      checkboxCount = count;
      break;
    }
  }

  if (checkboxCount === 0) {
    console.log("[LOG] Bulk download: no checkboxes found with any selector");
    return false;
  }

  const selectCount = Math.min(2, checkboxCount);
  let selectedCount = 0;

  for (let i = 0; i < selectCount; i++) {
    try {
      const checkbox = checkboxButtons.nth(i);
      await checkbox.scrollIntoViewIfNeeded({ timeout: 2000 });
      await page.waitForTimeout(100);
      await checkbox.click({ timeout: 5000 });
      selectedCount++;
      console.log(`[LOG] Bulk download: selected checkbox ${i + 1}`);
      await page.waitForTimeout(200);
    } catch (err) {
      console.log(`[WARN] Could not click checkbox ${i}: ${err.message}`);
    }
  }

  if (selectedCount === 0) {
    console.log("[LOG] Bulk download: failed to select any checkboxes");
    return false;
  }

  let bulkBtn;
  const bulkBtnSelectors = [
    'button[data-gtm-download-button="true"]',
    'button[data-slot="button"][data-gtm-download-button]',
    "button[data-gtm-download-button]",
    '[data-testid="download-all-btn"]',
    ".download-all-button",
  ];

  for (const selector of bulkBtnSelectors) {
    const locator = downloadSection.locator(selector).first();
    const count = await locator.count();
    if (count > 0) {
      console.log(
        `[LOG] Found bulk download button with selector: ${selector}`,
      );
      bulkBtn = locator;
      break;
    }
  }

  if (!bulkBtn) {
    console.log("[LOG] Bulk download: bulk button not found");
    return false;
  }

  try {
    await bulkBtn.scrollIntoViewIfNeeded({ timeout: 2000 });
    await page.waitForTimeout(100);
  } catch {
    console.log("[WARN] Could not scroll bulk button into view");
  }

  const bulkButtonText = await bulkBtn
    .textContent()
    .catch(() => `(${selectedCount})`);
  console.log(`[LOG] Bulk download: button ready, ${selectedCount} selected`);

  let resultType = "unknown";

  try {
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 3000 }),
      bulkBtn.click({ timeout: 5000 }),
    ]);

    const fileName = download.suggestedFilename();
    resultType = `download_${fileName}`;
    console.log(`[LOG] Bulk download: result = ${resultType}`);
    return true;
  } catch {
    try {
      const [newPage] = await Promise.all([
        page.context().waitForEvent("page", { timeout: 3000 }),
        bulkBtn.click({ timeout: 5000 }),
      ]);

      const newPageUrl = newPage.url();
      if (newPageUrl.includes(".pdf")) {
        resultType = `newPage_${newPageUrl.split("/").pop()}`;
        console.log(`[LOG] Bulk download: result = ${resultType}`);
        await newPage.close();
        return true;
      }

      await newPage.close();
    } catch {
      console.log("[LOG] Bulk download: result = no_event");
    }
  }

  return (
    resultType.startsWith("download_") || resultType.startsWith("newPage_")
  );
}
