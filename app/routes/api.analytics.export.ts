import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import * as XLSX from 'xlsx';
import fs from 'fs';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const range = url.searchParams.get("range") || "week";
  
  // Calculate the date range
  const now = new Date();
  let startDate = new Date();
  
  switch (range) {
    case "day":
      startDate.setDate(now.getDate() - 1);
      break;
    case "month":
      startDate.setMonth(now.getMonth() - 1);
      break;
    default: // week
      startDate.setDate(now.getDate() - 7);
  }

  try {
    console.log(`Generating Excel export for shop ${session.shop} (range: ${range})`);
    
    // Get all not found errors with their redirects if available
    const notFoundErrors = await prisma.notFoundError.findMany({
      where: {
        shopDomain: session.shop,
        timestamp: {
          gte: startDate,
          lte: now,
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    console.log(`Found ${notFoundErrors.length} errors to export`);

    // Transform data for Excel export
    const data = notFoundErrors.map(error => ({
      Path: error.path,
      Timestamp: error.timestamp.toISOString(),
      UserAgent: error.userAgent || 'N/A',
      Referer: error.referer || 'N/A',
      Redirected: error.redirected ? 'Yes' : 'No',
      RedirectTo: error.redirectTo || 'N/A',
    }));

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    const columnWidths = [
      { wch: 40 }, // Path
      { wch: 25 }, // Timestamp
      { wch: 40 }, // UserAgent
      { wch: 40 }, // Referer
      { wch: 12 }, // Redirected
      { wch: 40 }, // RedirectTo
    ];
    worksheet['!cols'] = columnWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, "404 Errors");
    
    // Generate Excel data as an array buffer instead of buffer
    const excelData = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    
    // Create a Buffer from the array for proper binary handling
    const buffer = Buffer.from(excelData);
    
    // Set appropriate headers for Excel download
    const headers = new Headers();
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    headers.set('Content-Disposition', `attachment; filename="404-errors-${range}.xlsx"`);
    headers.set('Content-Length', buffer.length.toString());
    headers.set('Cache-Control', 'no-cache');
    
    // debug write the excel file to the public folder
    console.log(`Writing Excel file to public/404-errors-${range}.xlsx`);
    fs.writeFileSync(`public/404-errors-${range}.xlsx`, buffer);
    return new Response(buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return json({ error: "Failed to export data" }, { status: 500 });
  }
}; 