import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Card, Page, Layout, TextField, Button, DataTable, Banner, Text, BlockStack, Box, InlineStack, Icon } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { useState, useCallback } from "react";
import React from "react";
import { CircleUpIcon, LinkIcon, ArrowRightIcon } from "@shopify/polaris-icons";

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

  const handleDelete = useCallback(async (pattern: string) => {
    const response = await fetch("/api/redirects/wildcard", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pattern }),
    });

    if (response.ok) {
      window.location.reload();
    }
  }, []);

  return (
    <Page 
      title="Wildcard Redirects" 
      subtitle="Create flexible redirect rules using wildcards (*)" 
    >
      <Layout>
        <Layout.Section>
          <Box
              background="bg-surface-secondary"
              borderRadius="300"
              padding="500"
              borderWidth="0165"
          >
            <BlockStack gap="300">
              <InlineStack gap="200" align="center">
                <div style={{ fontSize: '20px' }}>✨</div>
                <Text variant="headingMd" as="h2">How Wildcards Work</Text>
              </InlineStack>
              <BlockStack gap="100">
                <Text as="h2">Create flexible redirect rules using wildcards (*)</Text>
                <Box
                  background="bg-surface-active"
                  padding="200"
                  borderRadius="200"
                >
                  <InlineStack gap="100" align="start">
                    <Text variant="bodyMd" as="span" fontWeight="bold">/old-blog/*</Text>
                    <Text variant="bodyMd" tone="success" as="span">→</Text>
                    <Text variant="bodyMd" as="span" fontWeight="bold">/blog/*</Text>
                  </InlineStack>
                </Box>
                <Text tone="subdued" as="dd">
                  This will redirect all URLs starting with /old-blog/ to /blog/ while preserving the rest of the path
                </Text>
              </BlockStack>
            </BlockStack>
          </Box>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Box padding="200">
              <BlockStack>
                <BlockStack gap="100" align="start">
                  <Text variant="headingMd" as="h2">Add New Wildcard Redirect</Text>
                  <Text variant="bodySm" tone="subdued" as="span">
                      Manage your store's wildcard URL redirects
                  </Text>
                  <div/>
                </BlockStack>
                
                <Box 
                  background="bg-surface-secondary" 
                  borderRadius="300"
                  padding="300"
                >
                  <BlockStack gap="300">
                    <InlineStack gap="400" blockAlign="start">
                      <div style={{ flex: 1 }}>
                        <TextField
                          label={
                            <InlineStack gap="100" align="center">
                              <Icon source={LinkIcon} tone="subdued" />
                              <Text as="span">Pattern (with *)</Text>
                            </InlineStack>
                          }
                          value={pattern}
                          onChange={setPattern}
                          placeholder="/old-category/*"
                          autoComplete="off"
                          helpText="Use * to match any characters in the URL"
                        />
                      </div>

                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        paddingTop: '24px',
                        margin: '0 4px',
                        color: 'var(--p-color-text-success)'
                      }}>
                        →
                      </div>

                      <div style={{ flex: 1 }}>
                        <TextField
                          label={
                            <InlineStack gap="100" align="center">
                              <Icon source={LinkIcon} tone="success" />
                              <Text as="span">Redirect To</Text>
                            </InlineStack>
                          }
                          value={toPath}
                          onChange={setToPath}
                          placeholder="/new-category/*"
                          autoComplete="off"
                          helpText="Use * to preserve matched parts from the original URL"
                        />
                      </div>
                    </InlineStack>

                    <Box width="20%">
                      <Button 
                        tone="success"
                        onClick={handleSubmit}
                        disabled={!pattern || !toPath}
                        icon={CircleUpIcon}
                        size="slim"  
                      >
                        Add Wildcard Redirect
                      </Button>
                    </Box>
                  </BlockStack>
                </Box>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Box padding="400">
              <BlockStack gap="300">
                <InlineStack>
                  <BlockStack>
                    <Text variant="headingMd" as="h2">Active Wildcard Redirects</Text>
                    <Text variant="bodySm" tone="subdued" as="span">
                      Manage your store's wildcard URL redirects
                    </Text>
                  </BlockStack>
                </InlineStack>

                {wildcards.length > 0 ? (
                  <Box 
                    background="bg-surface-secondary"
                    padding="200" 
                    borderRadius="200"
                  >
                    <DataTable
                      columnContentTypes={["text", "text", "text"]}
                      headings={[
                        <Text variant="headingSm" as="span">Pattern</Text>,
                        <Text variant="headingSm" as="span">Redirects To</Text>,
                        <Text variant="headingSm" alignment="end" as="span">Action</Text>
                      ]}
                      rows={wildcards.map(w => [
                        <InlineStack gap="100" align="start">
                          <Text variant="bodyMd" as="span">{w.pattern || w.fromPath}</Text>
                        </InlineStack>,
                        <InlineStack gap="100" align="start">
                          <Text variant="bodyMd" as="span">{w.toPath}</Text>
                        </InlineStack>,
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            tone="critical"
                            size="slim"
                            onClick={() => handleDelete(w.pattern || w.fromPath)}
                          >
                            Delete
                          </Button>
                        </div>
                      ])}
                    />
                  </Box>
                ) : (
                  <Box
                    background="bg-surface-secondary"
                    padding="400"
                    borderRadius="200"
                  >
                    <BlockStack gap="200" align="center">
                      <Text as="h3" variant="headingSm">
                        No wildcard redirects yet
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Create your first wildcard redirect using the form above.
                      </Text>
                    </BlockStack>
                  </Box>
                )}
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 