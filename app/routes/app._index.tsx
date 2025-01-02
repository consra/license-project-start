import { Link, useLoaderData, useNavigate } from "@remix-run/react";
import { 
  Card,
  LegacyCard,
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
import { RefreshIcon, InfoIcon } from "@shopify/polaris-icons";
import { Icon } from '@shopify/polaris';

type Theme = {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

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
  
  // Get activation status for all themes
  const themeStatuses = await prisma.themeStatus.findMany({
    where: {
      shopDomain: session.shop,
    },
  });

  // Create a map for quick lookup
  const statusMap = new Map(
    themeStatuses.map(status => [status.themeId, status.isActive])
  );

  const themes = data.data.themes.nodes.map((theme: any) => ({
    ...theme,
    isActive: statusMap.get(theme.id) || false,
  }));

  return json({
    shop: session.shop,
    themes,
    extensionId: process.env.EXTENSION_ID || "404-redirect",
    extensionFileName: process.env.EXTENSION_FILE_NAME || "seo-wizzard-extension"
  });
};

export default function Index() {
  const { shop, themes, extensionId, extensionFileName } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const resourceName = {
    singular: 'theme',
    plural: 'themes',
  };

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(themes);

  const getThemeEditorUrl = (themeId: string) => {
    return `https://${shop}/admin/themes/${themeId}/editor?context=apps&activateAppId=${extensionId}/${extensionFileName}`;
  };

  const rowMarkup = themes.map(
    (theme, index) => (
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
          <ButtonGroup>
            <Button
              onClick={() => window.open(getThemeEditorUrl(theme.id), '_blank')}
              tone={theme.isActive ? "critical" : "success"}
            >
              {theme.isActive ? "Deactivate" : "Configure"}
            </Button>
          </ButtonGroup>
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

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
          <LegacyCard>
            <LegacyCard.Section>
              <BlockStack gap="600">
                <InlineStack
                  gap="400"
                  align="start"
                  style={{
                    padding: '24px',
                    backgroundColor: 'var(--p-surface-subdued)',
                    borderRadius: '12px',
                    border: '1px solid var(--p-border-subdued)',
                    boxShadow: 'var(--p-shadow-card)'
                  }}
                >
                  <BlockStack gap="200">
                    <Text as="h2" variant="headingSm">
                      Getting Started
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Get started by activating the app in your themes to enable automatic 404 redirects and improve your store's SEO. 
                      Our tools help you track and fix broken links automatically.
                    </Text>
                  </BlockStack>

                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h3">
                      Quick Setup Guide
                    </Text>
                    <div style={{ 
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '16px',
                      width: '100%'
                    }}>
                      {[
                        {
                          step: 1,
                          title: "Choose Theme",
                          description: "Select the theme you want to activate the app on"
                        },
                        {
                          step: 2,
                          title: "Configure App",
                          description: "Enable the app toggle in Theme Editor"
                        },
                        {
                          step: 3,
                          title: "Save Changes",
                          description: "Apply changes to activate the app"
                        }
                      ].map(({ step, title, description }) => (
                        <div
                          key={step}
                          style={{
                            padding: '16px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--p-surface-subdued)',
                            border: '1px solid var(--p-border-subdued)'
                          }}
                        >
                          <BlockStack gap="200">
                            <Badge tone="info" size="large">{step}</Badge>
                            <Text variant="headingSm" as="h4">{title}</Text>
                            <Text variant="bodySm" tone="subdued">{description}</Text>
                          </BlockStack>
                        </div>
                      ))}
                    </div>
                  </BlockStack>
                </InlineStack>
              </BlockStack>
            </LegacyCard.Section>
          </LegacyCard>
        </Layout.Section>

        <Layout.Section>
          <Box paddingBlockStart="400" paddingBlockEnd="400">
            <InlineStack align="space-between">
              <Text as="h3" variant="headingMd">
                Your Themes ({themes.length})
              </Text>
              <Button 
                onClick={handleRefresh}
                variant="plain"
                icon={RefreshIcon}
              >
                Refresh
              </Button>
            </InlineStack>
          </Box>
          <Card padding="0">
            {themes.length > 0 ? (
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
            ) : (
              <Box padding="400" textAlign="center">
                <BlockStack gap="400" align="center">
                  <Text as="p" variant="bodyMd" color="subdued">
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
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
