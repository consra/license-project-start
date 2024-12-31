import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, LegacyCard, Card, DataTable, Text, Banner } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import React from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const redirects = await prisma.redirect.findMany({
    where: {
      shopDomain: session.shop,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 100 // Limit to last 100 entries
  });

  return json({
    redirects,
    shop: session.shop
  });
};

export default function BrokenLinks() {
  const { redirects, shop } = useLoaderData<typeof loader>();

  const rows = redirects.map((redirect) => [
    redirect.fromPath,
    redirect.toPath,
    new Date(redirect.createdAt).toLocaleString(),
    redirect.isActive ? 'Active' : 'Inactive'
  ]);

  return (
    <Page title="Broken Links Report">
      <Layout>
        <Layout.Section>
          <Card>
            <Banner title="404 Redirect Report" status="info">
              <p>Showing the most recent 404 errors and their redirects for {shop}</p>
            </Banner>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            {rows.length > 0 ? (
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text']}
                headings={['Broken URL', 'Redirects To', 'First Seen', 'Status']}
                rows={rows}
              />
            ) : (
              <LegacyCard.Section>
                <Text as="p" alignment="center" color="subdued">
                  No broken links have been recorded yet.
                </Text>
              </LegacyCard.Section>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 