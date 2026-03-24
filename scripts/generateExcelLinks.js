import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

const INPUT_EXCEL = path.resolve(
  process.cwd(),
  "testDataExcel/migrationTable.xlsx",
);
const OUTPUT_DIR = path.resolve(process.cwd(), "dataBatches");
const targetTabs = process.argv.slice(2);

async function generateLinks() {
  if (!fs.existsSync(INPUT_EXCEL)) {
    return console.error(`[ERROR] Файл не найден: ${INPUT_EXCEL}`);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(INPUT_EXCEL);

  workbook.eachSheet((worksheet) => {
    const localeName = worksheet.name.trim();

    if (targetTabs.length && !targetTabs.includes(localeName)) return;

    const validPaths = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const cell = row.getCell(3);
      const v = cell.value;

      if (!v) return;

      const rawUrl =
        v?.richText?.map((rt) => rt.text).join("") ??
        v?.hyperlink ??
        (typeof v === "string" ? v : null) ??
        cell.text ??
        v?.toString() ??
        "";

      const url = String(rawUrl).trim();

      const hex = cell.fill?.fgColor?.argb?.toUpperCase();
      const isColored =
        cell.fill?.type === "pattern" &&
        cell.fill?.pattern === "solid" &&
        !!hex &&
        hex !== "FFFFFFFF" &&
        hex !== "00FFFFFF";

      if (isColored || !url || url === "undefined" || url === "null") return;

      try {
        validPaths.push(new URL(url).pathname);
      } catch (e) {}
    });

    if (validPaths.length) {
      const outputPath = path.join(OUTPUT_DIR, `${localeName}.txt`);
      fs.writeFileSync(outputPath, validPaths.join("\n"), "utf-8");
      console.log(
        `[SUCCESS] ${localeName}: сгенерировано ${validPaths.length} ссылок -> ${outputPath}`,
      );
    } else {
      console.log(`[INFO] ${localeName}: пропущена (нет валидных ссылок).`);
    }
  });
}

generateLinks();
