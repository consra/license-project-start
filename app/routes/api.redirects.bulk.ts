import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { paths, toPath } = await request.json();

    const results = await Promise.all(paths.map(async (path: string) => {
      const response = await admin.graphql(`
        mutation urlRedirectCreate($urlRedirect: UrlRedirectInput!) {
          urlRedirectCreate(urlRedirect: $urlRedirect) {
            urlRedirect {
              id
              path
              target
            }
            userErrors {
              field
              message
            }
          }
        }`, {
          variables: {
            urlRedirect: {
              path: path,
              target: toPath,
            }
          }
        });

      const data = await response.json();
      
      if (data.data.urlRedirectCreate.userErrors?.length > 0) {
        throw new Error(`Failed to create redirect: ${data.data.urlRedirectCreate.userErrors[0].message}`);
      }
      
      return { 
        fromPath: path, 
        shopifyId: data.data.urlRedirectCreate.urlRedirect.id 
      };
    })).catch(error => {
      console.error('Failed to create redirects:', error);
      throw error;
    });

    // Create redirects in a transaction
    await prisma.$transaction(async (tx) => {
      // Create redirects
      await tx.redirect.createMany({
        data: results.map(({fromPath, shopifyId} : {fromPath: string, shopifyId: string}) => ({
          shopDomain: session.shop,
          fromPath,
          toPath: toPath,
          isActive: true,
          shopifyId,
          isWildcard: false,
          pattern: null,
          createdAt: new Date(),
          updatedAt: new Date()
        })),
      });

      // Update NotFoundError records
      await tx.notFoundError.updateMany({
        where: {
          shopDomain: session.shop,
          path: {
            in: paths,
          },
        },
        data: {
          redirected: true,
          redirectTo: toPath,
        },
      });
    });

    return json({ 
      success: true,
      count: paths.length 
    });

  } catch (error) {
    console.error('Failed to process redirects:', error);
    return json({ 
      error: "Failed to process redirects",
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500 
    });
  }
}; 