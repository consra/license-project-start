import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { prisma } from "../db.server";

// For checking redirects (GET)
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  const shopDomain = request.headers.get("X-Shop-Domain");
  const userAgent = request.headers.get("X-User-Agent");
  const referer = request.headers.get("X-Referrer");

  //list all headers
  console.log("headers", request.headers.keys());
  if (!path || !shopDomain) {
    return json({ redirect: false }, { status: 400 });
  }

  try {
    let redirect = await prisma.redirect.findFirst({
        where: {
          shopDomain,
          fromPath: path,
          isActive: true,
          isWildcard: false,
        },
      });

    if (redirect) {
      return json({ redirect: true, redirectUrl: redirect.toPath });
    }

    const wildcardRedirects = await prisma.redirect.findMany({
        where: {
            shopDomain,
            isActive: true,
            isWildcard: true,
        },
    });

    for (const wildcardRedirect of wildcardRedirects) {
        const pattern = wildcardRedirect.pattern?.replace('*', '(.*)');
        if (pattern && new RegExp(pattern).test(path)) {
            // Extract the dynamic part and substitute it in the toPath
            const match = path.match(new RegExp(pattern));
            console.log("match", match);
            const dynamicPart = match?.[1] || '';
            const redirectUrl = wildcardRedirect.toPath.replace('*', dynamicPart);
            redirect = { ...wildcardRedirect, toPath: redirectUrl };
            break;
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

    return json({ redirect: false });
  } catch (error) {
    console.error("Error handling redirect:", error);
    return json({ error: "Failed to process request" }, { status: 500 });
  }
}; 