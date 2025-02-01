import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { Card, Page, Layout, TextField, Button, DataTable, Banner, Text, BlockStack, Box, InlineStack, Icon, Divider } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { useState, useCallback } from "react";
import React from "react";
import { CircleUpIcon, LinkIcon, ArrowRightIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const isTest = process.env.NODE_ENV !== 'production';
  // Check if user has premium plan
  // const billingCheck = await billing.check({
  //   plans: ["Premium"],
  //   isTest,
  // });

  const isPremium = true; //billingCheck.hasActivePayment || isTest;

  const wildcards = isPremium ? await prisma.redirect.findMany({
    where: {
      shopDomain: session.shop,
      isWildcard: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  }) : [];

  return json({ wildcards, isPremium, shop: session.shop });
};

export default function Wildcards() {
  const { wildcards, isPremium } = useLoaderData<typeof loader>();
  const [pattern, setPattern] = useState("");
  const [toPath, setToPath] = useState("");
  const [currentWildcards, setCurrentWildcards] = useState(wildcards);

  const navigate = useNavigate();
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
      setCurrentWildcards([...currentWildcards, { pattern, toPath, status: "active", createdAt: new Date() }]);
      navigate(`/app/wildcards`);
      shopify.toast.show("Wildcard redirect created");
    }
  }, [pattern, toPath]);

  const handleDelete = useCallback(async (pattern: string) => {
    const response = await fetch("/api/redirects/wildcard", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pattern }),
    });

    if (response.ok) {
      shopify.toast.show("Wildcard redirect deleted");
      navigate(`/app/wildcards`);
    }
  }, []);

  if (!isPremium) {
    return (
      <Page title="Wildcard Redirects" subtitle="Create flexible redirect rules using wildcards (*)">
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="600">
                <BlockStack gap="600">
                  {/* Hero Section */}
                  <Box
                    background="bg-surface-info-subdued"
                    borderRadius="300"
                    padding="600"
                    borderWidth="025"
                    borderColor="border-info"
                  >
                    <BlockStack gap="400" align="center">
                      <div style={{ 
                        backgroundColor: 'var(--p-color-bg-info)',
                        padding: '20px',
                        borderRadius: '50%',
                        display: 'inline-flex',
                        boxShadow: 'var(--p-shadow-200)'
                      }}>
                        <Icon source={LinkIcon} tone="info" size="large" />
                      </div>
                      <BlockStack gap="200" align="center">
                        <Text variant="headingLg" as="h2">Unlock Wildcard Redirects</Text>
                        <Text variant="bodyMd" as="p" alignment="center">
                          Upgrade to Premium to create powerful redirect rules with wildcards
                        </Text>
                      </BlockStack>
                    </BlockStack>
                  </Box>

                  {/* Features Grid */}
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h3" alignment="center">Premium Features</Text>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                      gap: '16px' 
                    }}>
                      {[
                        {
                          icon: "✨",
                          title: "Wildcard Patterns",
                          description: "Create flexible redirect rules using * wildcards"
                        },
                        {
                          icon: "📊",
                          title: "Advanced Analytics",
                          description: "Track and analyze redirect performance"
                        },
                        {
                          icon: "🚀",
                          title: "Priority Support",
                          description: "Get help when you need it"
                        }
                      ].map(feature => (
                        <Box
                          key={feature.title}
                          background="bg-surface-secondary"
                          padding="400"
                          borderRadius="200"
                        >
                          <BlockStack gap="300">
                            <Text variant="headingMd" as="h4">
                              {feature.icon} {feature.title}
                            </Text>
                            <Text variant="bodyMd" tone="subdued">
                              {feature.description}
                            </Text>
                          </BlockStack>
                        </Box>
                      ))}
                    </div>
                  </BlockStack>

                  {/* Example Section */}
                  <Box
                    background="bg-surface-secondary"
                    borderRadius="300"
                    padding="500"
                    borderWidth="025"
                    borderColor="border-subdued"
                  >
                    <BlockStack gap="400">
                      <Text variant="headingMd" as="h3">Example Wildcard Rules</Text>
                      <InlineStack wrap={false} gap="300">
                        <Box padding="300" background="bg-surface" borderRadius="200" shadow="100">
                          <Text variant="bodyMd" as="span">/old-blog/* → /blog/*</Text>
                        </Box>
                        <Box padding="300" background="bg-surface" borderRadius="200" shadow="100">
                          <Text variant="bodyMd" as="span">/*/gift-car → /*/gift-card</Text>
                        </Box>
                      </InlineStack>
                    </BlockStack>
                  </Box>

                  {/* CTA */}
                  <Box padding="500" alignment="center">
                    <BlockStack gap="300" align="center">
                      <Button
                        variant="primary"
                        tone="success"
                        url="/app/billing"
                        size="large"
                      >
                        Upgrade to Premium - $2.99/month
                      </Button>
                      <Text variant="bodySm" tone="subdued">
                        Includes 3-day free trial. Cancel anytime.
                      </Text>
                    </BlockStack>
                  </Box>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

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
                <Text as="h2">Create flexible redirect rules using wildcards (*). Examples:</Text>
                <BlockStack gap="200" align="start">
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
                <Divider/>
                <Box
                background="bg-surface-active"
                padding="200"
                borderRadius="200"
                  >
                  <InlineStack gap="100" align="start">
                    <Text variant="bodyMd" as="span" fontWeight="bold">/*/gif-card</Text>
                    <Text variant="bodyMd" tone="success" as="span">→</Text>
                    <Text variant="bodyMd" as="span" fontWeight="bold">/*/gift-card</Text>
                    <Text variant="bodyMd" tone="success" as="span">OR</Text>
                    <Text variant="bodyMd" as="span" fontWeight="bold">/*/gift-card</Text>
                    <Text variant="bodyMd" tone="success" as="span">→</Text>
                    <Text variant="bodyMd" as="span" fontWeight="bold">/products/gift-card</Text>
                  </InlineStack>

                </Box>
              </BlockStack>
                <Text tone="subdued" as="dd">
                  This will redirect all URLs starting with like /old-products/gift-card to /products/gift-card while preserving the rest of the path
                </Text>
              </BlockStack>

              <Divider/>

              

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
                              <Text as="span">Redirect To (* is not mandatory)</Text>
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
                        disabled={!pattern || !toPath || wildcards.length >= 5}
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
                      Manage your store's wildcard URL redirects. Max 5 active wildcard redirects allowd.
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