import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { 
  Card,
  Layout, 
  Page, 
  Button, 
  Text, 
  Modal, 
  IndexTable,
  Badge,
  useIndexResourceState,
  ButtonGroup,
  BlockStack,
  InlineStack,
  Box
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import React, { useState, useCallback } from "react";
import { RefreshIcon } from "@shopify/polaris-icons";

type Theme = {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const handleIsActive = async (theme: any) => {
    const id = theme.id.replace("gid://shopify/OnlineStoreTheme/", "");
    const response = await admin.rest.get({
      path: `themes/${id}/assets`,
      query: {
        asset: {
          key: 'config/settings_data.json'
        }
      }
    });

    const data = await response.json();
    const themeCode = data.asset.value;
    if (!themeCode) {
      return false;
    }

    let parsed = undefined;
    try {
      parsed = JSON.parse(themeCode);
    } catch (error) {
      return false;
    }

    if (!parsed.current.blocks) {
      return false;
    }
    let isActive = false;

    Object.entries(parsed.current.blocks).forEach(([key, value]) => {
      if (value?.type?.includes("seo-wizzard") && value?.disabled === false) {
        isActive = true;
      }
    });

    return isActive;
  };

  // Fetch themes from Shopify Admin API
  const response = await admin.graphql(
    `#graphql
      query getThemes {
        themes(first: 10) {
          nodes {
            id
            name
            role
          }
        }
      }`
  );

  const data = await response.json();
  

  const themes = await Promise.all(data.data.themes.nodes.map(async (theme: any) => ({
    ...theme,
    isActive: await handleIsActive(theme)
  })));

  return json({
    shop: session.shop,
    themes,
    extensionId: process.env.SHOPIFY_SEO_WIZARD_EXTENSION_ID || "0986e27a-90bf-4af8-8c79-9312c6e46f3a",
    extensionFileName: process.env.SHOPIFY_SEO_WIZARD_EXTENSION_FILE_NAME || "404-redirect"
  });
};

export default function Index() {
  const { shop, themes, extensionId, extensionFileName } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const resourceName = {
    singular: 'theme',
    plural: 'themes',
  };

  const getThemeEditorUrl = (themeId: string) => {
    const id = themeId.replace("gid://shopify/OnlineStoreTheme/", "");
    return `https://${shop}/admin/themes/${id}/editor?context=apps&activateAppId=${extensionId}/${extensionFileName}`;
  };

  const handleDeactivate = useCallback(async (theme: Theme) => {
    const response = await fetch("/api/theme-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        themeId: theme.id,
        isActive: false,
      }),
    });

    if (response.ok) {
      window.location.reload();
    }
  }, []);

  const handleRefresh = useCallback(() => {
    navigate(".", { replace: true });
  }, [navigate]);

  return (
    <Page title="Welcome to SEO Wizzard 👋" divider>
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Welcome Banner */}
            <Box
              background="bg-surface-secondary"
              borderRadius="300"
              padding="500"
              shadow="card"
            >
              <BlockStack gap="400">
                <InlineStack gap="400" align="center">
                  <div style={{ fontSize: '28px' }}>✨</div>
                  <Text variant="headingLg" as="h1">
                    Let's set up your 404 redirects
                  </Text>
                </InlineStack>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Improve your store's SEO by automatically managing 404 redirects and tracking broken links. 
                  Follow the quick setup guide below to get started.
                </Text>
              </BlockStack>
            </Box>

            {/* Setup Guide */}
            <Card roundedAbove="xl">
              <Box padding="500">
                <BlockStack gap="500">
                  <Text variant="headingMd" as="h2">Quick Setup Guide</Text>
                  <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '16px'
                  }}>
                    {[
                      {
                        step: 1,
                        title: "Choose Theme",
                        description: "Select the theme you want to activate the app on",
                        icon: "🎨"
                      },
                      {
                        step: 2,
                        title: "Configure App",
                        description: "Enable the app toggle in Theme Editor",
                        icon: "⚙️"
                      },
                      {
                        step: 3,
                        title: "Save Changes",
                        description: "Apply changes to activate the app",
                        icon: "✅"
                      }
                    ].map(({ step, title, description, icon }) => (
                      <Box
                        key={step}
                        background="bg-surface-secondary"
                        padding="400"
                        borderRadius="200"
                      >
                        <BlockStack gap="300">
                          <InlineStack gap="200" align="center">
                            <div style={{ fontSize: '20px' }}>{icon}</div>
                            <Text variant="headingSm" as="h3">{title}</Text>
                          </InlineStack>
                          <Text variant="bodyMd" tone="subdued">{description}</Text>
                        </BlockStack>
                      </Box>
                    ))}
                  </div>
                </BlockStack>
              </Box>
            </Card>

            {/* Themes Section */}
            <Card roundedAbove="xl">
              <Box padding="500">
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <InlineStack gap="200" align="center">
                      <Text as="h2" variant="headingMd">
                        Your Themes ({themes.length})
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Manage app activation for each theme
                      </Text>
                    </InlineStack>
                    <Button 
                      onClick={handleRefresh}
                      variant="plain"
                      icon={RefreshIcon}
                    >
                      Refresh
                    </Button>
                  </InlineStack>

                  {themes.length > 0 ? (
                    <Box paddingBlockStart="400">
                      <IndexTable
                        resourceName={resourceName}
                        itemCount={themes.length}
                        headings={[
                          { title: 'App Status', alignment: 'start' },
                          { title: 'Theme Name', alignment: 'start' },
                          { title: 'Actions', alignment: 'end' },
                        ]}
                        selectable={false}
                      >
                        {themes.map((theme, index) => (
                          <IndexTable.Row
                            id={theme.id}
                            key={theme.id}
                            position={index}
                          >
                            <IndexTable.Cell>
                              <Badge tone={theme.isActive ? "success" : "critical"}>
                                {theme.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </IndexTable.Cell>
                            <IndexTable.Cell>
                              <Text variant="bodyMd" fontWeight="bold" as="span">
                                {theme.name} {theme.role === "main" && "(Live)"}
                              </Text>
                            </IndexTable.Cell>
                            <IndexTable.Cell>
                              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <ButtonGroup>
                                  <Button 
                                    onClick={() => window.open(getThemeEditorUrl(theme.id), '_blank')}
                                    tone={theme.isActive ? "critical" : "success"}
                                  >
                                    {theme.isActive ? "Deactivate" : "Configure"}
                                  </Button>
                                </ButtonGroup>
                              </div>
                            </IndexTable.Cell>
                          </IndexTable.Row>
                        ))}
                      </IndexTable>
                    </Box>
                  ) : (
                    <Box
                      background="bg-surface-secondary"
                      padding="500"
                      borderRadius="200"
                      textAlign="center"
                    >
                      <BlockStack gap="300" align="center">
                        <Text as="p" variant="bodyMd" tone="subdued">
                          No themes found. Please make sure you have at least one theme installed in your store.
                        </Text>
                        <Button
                          url={`https://${shop}/admin/themes`}
                          external
                        >
                          Manage Themes
                        </Button>
                      </BlockStack>
                    </Box>
                  )}
                </BlockStack>
              </Box>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
function async() {
  throw new Error("Function not implemented.");
}

