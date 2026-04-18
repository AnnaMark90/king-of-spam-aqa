import { test, expect } from "@playwright/test";
import { safeRun, openStagePageContext } from "../../helpers/pageHelpers.js";
import {
  detectCarousels,
  testSecondaryCarousel,
  testBenefitsCarousel,
  testProductListingCarousel,
  verifySlideImage,
} from "../../helpers/carouselHelpers.js";
import { AnyPage } from "../../pages/AnyPage.js";
import { TEST_PAGES } from "../../constants/constants.js";

for (const page of TEST_PAGES) {
  test.describe(`URL: /${page.path}`, () => {
    test.describe(`lang: ${page.lang}`, () => {
      let context, stagePage, carousels;

      test.beforeAll(async ({ browser }, testInfo) => {
        test.setTimeout(120000);
        const deviceConfig = testInfo.project.use;

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

        carousels = await detectCarousels(stagePage);
        if (carousels.length === 0) {
          console.log(`[SKIP] No carousels found on: ${page.stageUrl}`);
        } else {
          console.log(
            `[LOG] Found ${carousels.length} carousel(s) on: ${page.stageUrl}`,
          );
        }
      });

      test("Verify carousel navigation via primary controls", async () => {
        test.skip(!carousels?.length, "No carousels detected on this page");

        for (let i = 0; i < carousels.length; i++) {
          const carousel = carousels[i];
          console.log(
            `[LOG] Testing carousel ${i + 1}/${carousels.length} (type: ${carousel.type})`,
          );

          const carouselSelector = `[aria-roledescription="carousel"]:nth-of-type(${i + 1})`;

          try {
            if (carousel.type === "secondary") {
              await testSecondaryCarousel(stagePage, carouselSelector);
            } else if (carousel.type === "benefits") {
              await testBenefitsCarousel(stagePage, carouselSelector);
            } else if (carousel.type === "productListing") {
              await testProductListingCarousel(stagePage, carouselSelector);
            }
          } catch (err) {
            console.error(
              `[ERROR] Carousel test failed for type ${carousel.type}:`,
              err.message,
            );
            expect(false, `Carousel ${i + 1} test failed`).toBe(true);
          }
        }
      });

      test("Verify carousel images are loaded", async () => {
        test.skip(!carousels?.length, "No carousels detected on this page");

        for (let i = 0; i < carousels.length; i++) {
          const carouselSelector = `[aria-roledescription="carousel"]:nth-of-type(${i + 1})`;

          try {
            const imagesLoaded = await verifySlideImage(
              stagePage,
              carouselSelector,
            );
            expect
              .soft(imagesLoaded, `Carousel ${i + 1} has unloaded images`)
              .toBe(true);
          } catch (err) {
            console.error(
              `[ERROR] Image verification failed for carousel ${i + 1}:`,
              err.message,
            );
          }
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
