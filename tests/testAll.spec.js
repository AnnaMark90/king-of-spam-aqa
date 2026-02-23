import { test } from "@playwright/test";
import { LANGS } from "../constants/constants.js";
import { buildUrl, getSnapshotPaths } from "../utils/utils.js";
import {
  collectEnvData,
  compareEnvsSnapshots,
  compareEnvsSeo,
} from "../helpers/helpers.js";
import { AnyPage } from "../pages/AnyPage.js";

const pageKey = "contact";

test.describe(`${pageKey} prod vs stage`, () => {
  for (const lang of Object.keys(LANGS)) {
    test.describe(`lang: ${lang}`, () => {
      let prodData;
      let stageData;
      let productionPath;
      let stagingPath;
      let diffPath;

      test.beforeAll(async ({ browser }, testInfo) => {
        const device = testInfo.project.name.split("-")[1];
        const productionUrl = buildUrl("production", pageKey, lang);
        const stagingUrl = buildUrl("staging", pageKey, lang);
        const paths = getSnapshotPaths({
          lang,
          device,
          pageKey,
        });

        productionPath = paths.production;
        stagingPath = paths.staging;
        diffPath = paths.diff;

        prodData = await collectEnvData({
          browser,
          url: productionUrl,
          PageObject: AnyPage,
          snapshotPath: productionPath,
        });

        stageData = await collectEnvData({
          browser,
          url: stagingUrl,
          PageObject: AnyPage,
          snapshotPath: stagingPath,
        });
      });
      test("visual compare", async ({}, testInfo) => {
        await compareEnvsSnapshots({
          prodPath: productionPath,
          stagePath: stagingPath,
          diffPath: diffPath,
          testInfo,
        });
      });
      test("seo compare", async ({}, testInfo) => {
        await compareEnvsSeo({
          prodSeo: prodData.seo,
          stageSeo: stageData.seo,
          testInfo,
        });
      });
    });
  }
});

// один контекст = одно окружение
// проверка seo полностью
// сохранение json всего html? различий seo?
