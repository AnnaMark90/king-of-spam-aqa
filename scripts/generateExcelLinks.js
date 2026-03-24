import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

const INPUT_EXCEL = path.resolve(
  process.cwd(),
  "test-data/migration_table.xlsx",
);
const OUTPUT_TXT = path.resolve(process.cwd(), "dataBatches/excelRun.txt");

async function parseExcel() {
  if (!fs.existsSync(INPUT_EXCEL)) {
    console.error(`[ERROR] Файл не найден: ${INPUT_EXCEL}`);
    return;
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(INPUT_EXCEL);

  const worksheet = workbook.worksheets[0];
  const validPaths = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const urlCell = row.getCell(3);
    const url = urlCell.text || urlCell.value;
    const fill = urlCell.fill;
    const isColored =
      fill && fill.type === "pattern" && fill.pattern === "solid";

    if (isColored || !url || url.trim() === "") {
      return;
    }

    try {
      const parsedUrl = new URL(url);
      validPaths.push(parsedUrl.pathname);
    } catch (e) {}
  });

  const dir = path.dirname(OUTPUT_TXT);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(OUTPUT_TXT, validPaths.join("\n"), "utf-8");
  console.log(
    `[SUCCESS] Обработано. Найдено ${validPaths.length} валидных URL. Сохранено в ${OUTPUT_TXT}`,
  );
}

parseExcel();
