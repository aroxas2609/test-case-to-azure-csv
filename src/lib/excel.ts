import ExcelJS from "exceljs";
import { CSV_HEADERS, type CsvRow } from "./csv";

/** Build an Excel workbook from CSV-style rows and return a Blob for download. */
export async function buildExcelBlob(rows: CsvRow[]): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Test Case Parser";
  const ws = wb.addWorksheet("Test Cases", {
    views: [{ state: "frozen", ySplit: 1, activeCell: "A2" }],
  });

  // Header row
  const headerRow = ws.addRow(CSV_HEADERS as unknown as string[]);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };
  headerRow.alignment = { wrapText: true, vertical: "middle" };
  headerRow.height = 22;

  // Data rows
  for (const row of rows) {
    const values = CSV_HEADERS.map((h) => row[h] ?? "");
    const dataRow = ws.addRow(values);
    dataRow.alignment = { wrapText: true, vertical: "top" };
  }

  // Column widths (reasonable defaults for Azure DevOps columns)
  const colWidths: number[] = [
    8,  // ID
    14, // Work Item Type
    42, // Title
    10, // Test Step
    36, // Step Action
    36, // Step Expected
    20, // Area Path
    18, // Assigned To
    12, // State
    18, // Tags
  ];
  CSV_HEADERS.forEach((_, i) => {
    ws.getColumn(i + 1).width = colWidths[i] ?? 16;
  });

  // Table borders for header + data
  const lastRow = rows.length + 1;
  const lastCol = CSV_HEADERS.length;
  const borderStyle: Partial<ExcelJS.Border> = { style: "thin" };
  for (let r = 1; r <= lastRow; r++) {
    for (let c = 1; c <= lastCol; c++) {
      const cell = ws.getCell(r, c);
      cell.border = {
        top: borderStyle,
        left: borderStyle,
        bottom: borderStyle,
        right: borderStyle,
      };
    }
  }

  // Header row bottom border slightly stronger
  for (let c = 1; c <= lastCol; c++) {
    ws.getCell(1, c).border = {
      ...ws.getCell(1, c).border,
      bottom: { style: "medium" },
    };
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
