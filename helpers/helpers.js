import fs from "fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

// PageObject управляет страницей.
// Helpers управляют окружением.

export async function openPageInNewContext({ browser, url, PageObject }) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageObject = new PageObject(page);

  await pageObject.openPage(url);

  return { context, page, pageObject };
}

export async function closeContext(context) {
  if (context) {
    await context.close();
  }
}

export async function collectEnvData({
  browser,
  url,
  PageObject,
  snapshotPath,
}) {
  const { context, pageObject } = await openPageInNewContext({
    browser,
    url,
    PageObject,
  });

  try {
    const seo = await pageObject.getSeoContent();
    if (snapshotPath) {
      await pageObject.doScreenshot(snapshotPath);
    }
    return {
      seo,
      snapshotPath,
    };
  } finally {
    await closeContext(context);
  }
}

export async function compareEnvsSnapshots({
  prodPath,
  stagePath,
  diffPath,
  testInfo,
}) {
  const prodImage = PNG.sync.read(fs.readFileSync(prodPath));
  const stageImage = PNG.sync.read(fs.readFileSync(stagePath));

  if (
    prodImage.width !== stageImage.width ||
    prodImage.height !== stageImage.height
  ) {
    throw new Error("Images have different sizes");
  }

  const { width, height } = prodImage;
  const diffImage = new PNG({ width, height });

  const mismatchPixels = pixelmatch(
    prodImage.data,
    stageImage.data,
    diffImage.data,
    width,
    height,
    {
      threshold: 0.15,
      includeAA: false,
    },
  );

  const totalPixels = width * height;
  const diffPercent = (mismatchPixels / totalPixels) * 100;

  const allowedThreshold = 0; // допустимый процент

  if (diffPercent > allowedThreshold) {
    fs.writeFileSync(diffPath, PNG.sync.write(diffImage));

    if (testInfo) {
      await testInfo.attach("visual-diff.png", {
        path: diffPath,
        contentType: "image/png",
      });
    }

    throw new Error(
      `Visual difference detected: ${mismatchPixels} pixels (${diffPercent.toFixed(
        2,
      )}%) differ`,
    );
  }
}

export async function compareEnvsSeo({ prodSeo, stageSeo, testInfo }) {
  const prod = {
    images: prodSeo.images,
    headers: prodSeo.headers,
    title: prodSeo.meta.title,
    description: prodSeo.meta.description,
    robots: prodSeo.meta.robots,
    canonical: prodSeo.meta.canonical,
    hreflangs: prodSeo.meta.hreflangs,
  };

  const stage = {
    images: stageSeo.images,
    headers: stageSeo.headers,
    title: stageSeo.meta.title,
    description: stageSeo.meta.description,
    robots: stageSeo.meta.robots,
    canonical: stageSeo.meta.canonical,
    hreflangs: stageSeo.meta.hreflangs,
  };

  const diff = Object.keys(prod).reduce((acc, key) => {
    if (JSON.stringify(prod[key]) !== JSON.stringify(stage[key])) {
      acc[key] = {
        prod: prod[key],
        stage: stage[key],
      };
    }
    return acc;
  }, {});

  if (Object.keys(diff).length) {
    if (testInfo) {
      await testInfo.attach("seo-diff.json", {
        body: JSON.stringify(diff, null, 2),
        contentType: "application/json",
      });
    }

    throw new Error(
      `SEO differences detected: ${Object.keys(diff).join(", ")}`,
    );
  }
}

// оркестратор
// export async function compareEnvs({
//   browser,
//   productionUrl,
//   stagingUrl,
//   lang,
//   device,
//   pageKey,
//   PageObject,
//   testInfo,
// }) {
//   const { production, staging, diff } = getSnapshotPaths({
//     lang,
//     device,
//     pageKey,
//   });

//   const prodData = await collectEnvData({
//     browser,
//     url: productionUrl,
//     PageObject,
//     snapshotPath: production,
//   });

//   const stageData = await collectEnvData({
//     browser,
//     url: stagingUrl,
//     PageObject,
//     snapshotPath: staging,
//   });

//   await compareEnvsSnapshots({
//     prodPath: production,
//     stagePath: staging,
//     diffPath: diff,
//     testInfo,
//   });

//   await compareEnvsSeo({
//     prodSeo: prodData.seo,
//     stageSeo: stageData.seo,
//     testInfo,
//   });
// }
