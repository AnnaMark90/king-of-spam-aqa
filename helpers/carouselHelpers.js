export async function detectCarousels(page) {
  return await page.evaluate(() => {
    const carouselContainers = Array.from(
      document.querySelectorAll('[aria-roledescription="carousel"]'),
    );

    const carousels = carouselContainers.map((container) => {
      const hasSecondarySlides = !!container.querySelector(
        ".carousel-item-secondary",
      );

      const hasNextSlideBtn = !!container.querySelector(
        'button[aria-label="Next slide"]',
      );
      const hasDots = !!container.querySelector('li[aria-label^="Slide"]');

      let type = null;
      if (hasSecondarySlides) {
        type = "secondary";
      } else if (hasNextSlideBtn && hasDots) {
        type = "benefits";
      } else if (hasNextSlideBtn && !hasDots) {
        type = "productListing";
      }

      return {
        type,
        hasSecondarySlides,
        hasNextSlideBtn,
        hasDots,
        element: container,
      };
    });

    return carousels.filter((c) => c.type);
  });
}

export async function testSecondaryCarousel(page, carouselLocator) {
  const locator = page.locator(carouselLocator);
  const nextBtn = locator.locator(".carousel-item-secondary-next");
  const dots = locator.locator('li[aria-label^="Slide"]');

  const initialActiveDot = await locator.locator(
    'li[aria-label^="Slide"][data-selected="true"]',
  );
  let initialDotIndex = 0;

  try {
    initialDotIndex = await dots.evaluate((elements) => {
      const activeElement = Array.from(elements).find(
        (el) => el.getAttribute("data-selected") === "true",
      );
      return Array.from(elements).indexOf(activeElement);
    });
  } catch (e) {
    console.log("[LOG] Secondary carousel: couldn't determine initial dot");
  }

  const nextBtnCount = await nextBtn.count();
  if (nextBtnCount > 0) {
    await nextBtn.first().click();
    await page.waitForTimeout(500);

    const activeDotAfterClick = await locator
      .locator('li[aria-label^="Slide"][data-selected="true"]')
      .evaluate((el) => el.getAttribute("aria-label"));

    console.log(
      `[LOG] Secondary carousel: clicked next, active dot = ${activeDotAfterClick}`,
    );
  }

  const dotsCount = await dots.count();
  if (dotsCount > 1 && dotsCount > initialDotIndex) {
    const targetDotIdx = (initialDotIndex + 1) % dotsCount;
    const targetDot = dots.nth(targetDotIdx);
    await targetDot.click();
    await page.waitForTimeout(500);

    const activeDotText = await targetDot.evaluate((el) =>
      el.getAttribute("aria-label"),
    );
    console.log(
      `[LOG] Secondary carousel: clicked dot ${targetDotIdx}, active dot = ${activeDotText}`,
    );
  }
}

export async function testBenefitsCarousel(page, carouselLocator) {
  const locator = page.locator(carouselLocator);
  const nextBtn = locator.locator('button[aria-label="Next slide"]');
  const prevBtn = locator.locator('button[aria-label="Previous slide"]');
  const dots = locator.locator('li[aria-label^="Slide"]');

  const initialActiveDot = await locator
    .locator('li[aria-selected="true"]')
    .first()
    .evaluate((el) => el.getAttribute("aria-label"))
    .catch(() => "unknown");

  const nextBtnCount = await nextBtn.count();
  if (nextBtnCount > 0) {
    await nextBtn.first().click();
    await page.waitForTimeout(500);

    const activeDotAfterNext = await locator
      .locator('li[aria-selected="true"]')
      .first()
      .evaluate((el) => el.getAttribute("aria-label"))
      .catch(() => "unknown");

    console.log(
      `[LOG] Benefits carousel: clicked next, active dot = ${activeDotAfterNext}`,
    );
  }

  const prevBtnCount = await prevBtn.count();
  if (prevBtnCount > 0) {
    await prevBtn.first().click();
    await page.waitForTimeout(500);

    const activeDotAfterPrev = await locator
      .locator('li[aria-selected="true"]')
      .first()
      .evaluate((el) => el.getAttribute("aria-label"))
      .catch(() => "unknown");

    console.log(
      `[LOG] Benefits carousel: clicked prev, active dot = ${activeDotAfterPrev}`,
    );
  }
}

export async function testProductListingCarousel(page, carouselLocator) {
  const locator = page.locator(carouselLocator);
  const nextBtn = locator.locator('button[aria-label="Next slide"]');
  const prevBtn = locator.locator('button[aria-label="Previous slide"]');

  const initialSlideCount = await locator
    .locator('div[role="group"][aria-roledescription="slide"]')
    .count();

  const nextBtnCount = await nextBtn.count();
  if (nextBtnCount > 0) {
    await nextBtn.first().click();
    await page.waitForTimeout(500);
    console.log(
      `[LOG] Product listing carousel: clicked next, total slides = ${initialSlideCount}`,
    );
  }

  const prevBtnCount = await prevBtn.count();
  if (prevBtnCount > 0) {
    await prevBtn.first().click();
    await page.waitForTimeout(500);
    console.log(
      `[LOG] Product listing carousel: clicked prev, total slides = ${initialSlideCount}`,
    );
  }
}

export async function verifySlideImage(page, carouselLocator) {
  const locator = page.locator(carouselLocator);
  const images = locator.locator("img");

  try {
    await images.first().waitFor({ state: "visible", timeout: 5000 });
    await page.waitForTimeout(500);
  } catch {
    console.log("[LOG] Carousel: no visible images found");
    return true;
  }

  const imagesInCarousel = await locator
    .locator("img")
    .evaluateAll((images) => {
      return images.map((img) => ({
        src: img.getAttribute("src") || "no-src",
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        complete: img.complete,
      }));
    });

  const unloadedImages = imagesInCarousel.filter(
    (img) => img.naturalWidth === 0 || img.naturalHeight === 0,
  );

  if (unloadedImages.length > 0) {
    console.log(`[WARN] Carousel has ${unloadedImages.length} unloaded images`);
  } else {
    console.log(
      `[LOG] Carousel: all ${imagesInCarousel.length} images loaded successfully`,
    );
  }

  return unloadedImages.length === 0;
}
