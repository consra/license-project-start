import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import * as XLSX from 'xlsx';

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

    // Define headers explicitly
    const headers = [
      "Path", 
      "Timestamp", 
      "User Agent", 
      "Referrer", 
      "Redirected", 
      "Redirect Destination"
    ];

    // Format the data for Excel
    const formattedData = notFoundErrors.map(error => [
      error.path,
      error.timestamp.toISOString(),
      error.userAgent || 'N/A',
      error.referer || 'N/A',
      error.redirected ? 'Yes' : 'No',
      error.redirectTo || 'N/A',
    ]);
    
    // Create worksheet with headers and data
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...formattedData]);
    
    // Set column widths for better readability
    const columnWidths = [
      { wch: 40 }, // Path
      { wch: 25 }, // Timestamp
      { wch: 40 }, // UserAgent
      { wch: 40 }, // Referer
      { wch: 12 }, // Redirected
      { wch: 40 }, // RedirectTo
    ];
    worksheet['!cols'] = columnWidths;
    
    // Add some styling to make the headers stand out
    // Note: Cell addresses are 0-indexed internally but A1 notation has 1-indexed rows
    for (let i = 0; i < headers.length; i++) {
      const cellRef = XLSX.utils.encode_cell({r: 0, c: i});
      if (!worksheet[cellRef]) worksheet[cellRef] = {};
      worksheet[cellRef].s = { 
        font: { bold: true },
        fill: { fgColor: { rgb: "EEEEEE" } }
      };
    }
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "404 Errors");
    
    // Write the workbook to a buffer as an array
    const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
    
    // Create a Buffer instance that Node.js can work with
    const buffer = Buffer.from(excelBuffer);
    
    // Set response headers for Excel download
    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    responseHeaders.set('Content-Disposition', `attachment; filename="404-errors-${range}.xlsx"`);
    responseHeaders.set('Content-Length', String(buffer.length));
    
    // Return the Excel file as a binary response
    return new Response(buffer, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Error exporting data:", error);
    return json({ error: "Failed to export data" }, { status: 500 });
  }
}; 