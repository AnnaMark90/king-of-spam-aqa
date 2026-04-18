import { test, expect } from "@playwright/test";
import { safeRun, openStagePageContext } from "../../helpers/pageHelpers.js";
import {
  detectDownloadSection,
  collectDownloadUrls,
  verifyPdfLink,
  testBulkDownload,
} from "../../helpers/downloadHelpers.js";
import { AnyPage } from "../../pages/AnyPage.js";
import { TEST_PAGES } from "../../constants/constants.js";

for (const page of TEST_PAGES) {
  test.describe(`URL: /${page.path}`, () => {
    test.describe(`lang: ${page.lang}`, () => {
      let context, stagePage, hasDownloads, isMobile;

      test.beforeAll(async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const deviceConfig = testInfo.project.use;
        isMobile = deviceConfig?.viewport?.width <= 430;

        const ctxResult = await openStagePageContext({
          browser,
          url: page.stageUrl,
          PageObject: AnyPage,
          deviceConfig,
        });

        if (!ctxResult) {
          console.error(`[CRITICAL] Stage page failed: ${page.stageUrl}`);
          return;
        }

        context = ctxResult.context;
        stagePage = ctxResult.page;

        const downloadSection = await detectDownloadSection(stagePage);
        hasDownloads = downloadSection !== null;

        if (!hasDownloads) {
          console.log(`[SKIP] No download section on: ${page.stageUrl}`);
        } else {
          console.log(`[LOG] Download section found on: ${page.stageUrl}`);
        }
      });

      test("Verify PDF download links return valid responses", async ({
        request,
      }) => {
        test.skip(!hasDownloads, "No download section on this page");

        const urls = await collectDownloadUrls(stagePage);
        expect(
          urls.length,
          "No download URLs found in section",
        ).toBeGreaterThan(0);

        console.log(`[LOG] Found ${urls.length} PDF link(s) to verify`);

        for (const url of urls) {
          try {
            const result = await verifyPdfLink(request, url);

            expect.soft(result.status, `PDF link broken: ${url}`).toBe(200);

            if (result.status === 200) {
              expect
                .soft(
                  result.isPdf,
                  `Link has wrong content-type: ${url} -> ${result.contentType}`,
                )
                .toBe(true);
              console.log(`[LOG] PDF verified: ${url.split("/").pop()}`);
            }
          } catch (err) {
            console.error(`[ERROR] Failed to verify PDF: ${url}`, err.message);
            expect(false, `PDF verification failed: ${url}`).toBe(true);
          }
        }
      });

      test("Verify bulk download mechanism", async () => {
        test.skip(!hasDownloads, "No download section on this page");
        test.skip(isMobile, "Bulk download not applicable on mobile (430x932)");

        try {
          const downloadTriggered = await testBulkDownload(stagePage);
          expect
            .soft(
              downloadTriggered,
              "Bulk download did not complete successfully",
            )
            .toBe(true);
        } catch (err) {
          console.error("[ERROR] Bulk download test failed:", err.message);
          expect(false, `Bulk download test error: ${err.message}`).toBe(true);
        }
      });

      test.afterAll(async () => {
        await safeRun(
          context?.close(),
          null,
          `closeContext after ${page.stageUrl}`,
        );
      });
    });
  });
}
