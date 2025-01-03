import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { prisma } from "../db.server";

// For checking redirects (GET)
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  const shopDomain = request.headers.get("X-Shop-Domain");
  const userAgent = request.headers.get("X-User-Agent");
  const referer = request.headers.get("X-Referrer");

  console.log("path", path);
  console.log("shopDomain", shopDomain);
  console.log("userAgent", userAgent);
  console.log("referer", referer);

  //list all headers
  console.log("headers", request.headers.keys());
  if (!path || !shopDomain) {
    return json({ redirect: false }, { status: 400 });
  }

  try {
    // Log the 404 first
    await prisma.notFoundError.create({
      data: {
        shopDomain,
        path,
        userAgent: userAgent || undefined,
        referer: referer || undefined,
        redirected: false
      }
    });

    // Check exact matches
    let redirect = await prisma.redirect.findFirst({
      where: {
        shopDomain,
        fromPath: path,
        isActive: true,
        isWildcard: false,
      },
    });

    // If no exact match, check wildcard patterns
    if (!redirect) {
      const wildcardRedirects = await prisma.redirect.findMany({
        where: {
          shopDomain,
          isActive: true,
          isWildcard: true,
        },
      });

      for (const wildcardRedirect of wildcardRedirects) {
        const pattern = wildcardRedirect.pattern?.replace('*', '.*');
        if (pattern && new RegExp(pattern).test(path)) {
          redirect = wildcardRedirect;
          break;
        }
      }
    }

    if (redirect) {
      // Update the 404 record to mark it as redirected
      await prisma.notFoundError.updateMany({
        where: {
          shopDomain,
          path,
          redirected: false
        },
        data: {
          redirected: true,
          redirectTo: redirect.toPath
        }
      });

      return json({
        redirect: true,
        redirectUrl: redirect.toPath,
        status: 301
      });
    }

    return json({ redirect: false });
  } catch (error) {
    console.error("Error handling redirect:", error);
    return json({ error: "Failed to process request" }, { status: 500 });
  }
}; 