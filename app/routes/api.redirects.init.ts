import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // First clear existing redirects for this shop
    await prisma.redirect.deleteMany({
      where: { 
        shopDomain: session.shop,
        isWildcard: false
       }
    });

    let hasNextPage = true;
    let cursor = null;
    let allRedirects: any[] = [];
    let totalImported = 0;

    console.log("Importing redirects...");
    // Fetch all redirects using pagination
    while (hasNextPage) {
      const response = await admin.graphql(`
        query UrlRedirects ${cursor ? `(after: "${cursor}")` : ''} {
          urlRedirects(first: 250${cursor ? `, after: "${cursor}"` : ''}) {
            edges {
              node {
                id
                path
                target
              }
              cursor
            }
            pageInfo {
              hasNextPage
            }
          }
        }
      `);

      const data = await response.json();
      
      if (data.errors) {
        console.error('GraphQL Errors:', data.errors);
        return json({ error: "Failed to fetch redirects from Shopify" }, { status: 500 });
      }

      const { edges, pageInfo } = data.data.urlRedirects;
      allRedirects = [...allRedirects, ...edges];
      hasNextPage = pageInfo.hasNextPage;
      cursor = edges[edges.length - 1]?.cursor;

      // Import in batches of 100
      if (allRedirects.length >= 100 || !hasNextPage) {
        await prisma.redirect.createMany({
          data: allRedirects.map((edge: any) => ({
            shopDomain: session.shop,
            fromPath: edge.node.path,
            toPath: edge.node.target,
            shopifyId: edge.node.id,
            isActive: true,
            isWildcard: false,
            pattern: null,
            createdAt: new Date(),
            updatedAt: new Date()
          })),
          skipDuplicates: true
        });

        totalImported += allRedirects.length;
        allRedirects = []; // Clear the array for next batch
        
        console.log(`Imported ${totalImported} redirects so far...`);
      }
    }

    return json({ 
      success: true, 
      message: `Successfully imported ${totalImported} redirects` 
    });

  } catch (error) {
    console.error('Failed to import redirects:', error);
    return json({ 
      error: "Failed to import redirects",
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500 
    });
  }
}; 