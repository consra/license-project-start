import { Link, useLoaderData } from "@remix-run/react";
import { Card, Layout, Page, Button, BlockStack, Text, Banner } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import React from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  return json({
    shop: session.shop,
    // You'll need to get these from your app's configuration
    extensionId: process.env.EXTENSION_ID || "404-redirect",
    extensionFileName: process.env.EXTENSION_FILE_NAME || "seo-wizzard-extension"
  });
};

export default function Index() {
  const { shop, extensionId, extensionFileName } = useLoaderData<typeof loader>();
  
  const themeEditorUrl = `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=${extensionId}/${extensionFileName}`;

  return (
    <Page title="404 Redirect Manager">
      <Layout>
        <Layout.Section>
          <Banner title="Setup Required" status="info">
            <p>Follow these steps to enable 404 redirects:</p>
            <BlockStack gap="300">
              <Text>1. Activate required scripts to enable app</Text>
              <Button
                primary
                external
                url={themeEditorUrl}
              >
                Go to Theme Editor
              </Button>
              <Text>2. In Theme Editor, open the "App embeds" tab</Text>
              <Text>3. Enable "404 Redirect" and click Save</Text>
            </BlockStack>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Button as={Link} to="/app/broken-links">View Broken Links Report</Button>
              <Button as={Link} to="/app/redirects">Manage Redirects</Button>
              <Button as={Link} to="/app/wildcards">Wildcard Redirects</Button>
              <Button as={Link} to="/app/analytics">View Analytics</Button>
              <Button as={Link} to="/app/settings">Notification Settings</Button>
              <Button as={Link} to="/app/help">Help & Support</Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
