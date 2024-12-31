import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Card, Page, Layout, TextField, Button, DataTable, Banner, Text, BlockStack } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { useState, useCallback } from "react";
import React from "react";
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const wildcards = await prisma.redirect.findMany({
    where: {
      shopDomain: session.shop,
      isWildcard: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  return json({ wildcards, shop: session.shop });
};

export default function Wildcards() {
  const { wildcards } = useLoaderData<typeof loader>();
  const [pattern, setPattern] = useState("");
  const [toPath, setToPath] = useState("");

  const handleSubmit = useCallback(async () => {
    const response = await fetch("/api/redirects/wildcard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        pattern,
        toPath,
        isWildcard: true
      }),
    });

    if (response.ok) {
      setPattern("");
      setToPath("");
      // Refresh the list
      window.location.reload();
    }
  }, [pattern, toPath]);

  return (
    <Page title="Wildcard Redirects">
      <Layout>
        <Layout.Section>
          <Banner title="Wildcard Redirects" status="info">
            <BlockStack gap="200">
              <Text>Create flexible redirect rules using wildcards (*)</Text>
              <Text>Example: /old-blog/* → /blog/*</Text>
              <Text>This will redirect all URLs starting with /old-blog/ to /blog/ while preserving the rest of the path</Text>
            </BlockStack>
          </Banner>
        </Layout.Section>

        <Layout.Section>
          <Card sectioned>
            <BlockStack gap="400">
              <TextField
                label="Pattern (with *)"
                value={pattern}
                onChange={setPattern}
                placeholder="/old-category/*"
                helpText="Use * to match any characters in the URL"
              />
              <TextField
                label="Redirect To"
                value={toPath}
                onChange={setToPath}
                placeholder="/new-category/*"
                helpText="Use * to preserve matched parts from the original URL"
              />
              <Button primary onClick={handleSubmit}>Add Wildcard Redirect</Button>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <DataTable
              columnContentTypes={["text", "text"]}
              headings={["Pattern", "Redirects To"]}
              rows={wildcards.map(w => [w.pattern || w.fromPath, w.toPath])}
              emptyState={
                <Text alignment="center" color="subdued">
                  No wildcard redirects created yet
                </Text>
              }
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 