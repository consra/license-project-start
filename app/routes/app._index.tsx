import { Link, useLoaderData } from "@remix-run/react";
import { Card, Layout, Page, Button, Text, Banner, Modal, List, Icon } from "@shopify/polaris";
import { CheckIcon, XIcon } from '@shopify/polaris-icons';
import { authenticate } from "../shopify.server";
import { json, type LoaderFunctionArgs } from "@remix-run/node";
import React, { useState, useCallback } from "react";
import { PrismaClient } from '@prisma/client';

type Theme = {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
};

const prisma = new PrismaClient();

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Fetch themes from Shopify Admin API
  const response = await admin.graphql(
    `#graphql
      query getThemes {
        themes(first: 50) {
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
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [modalActive, setModalActive] = useState(false);

  const handleThemeClick = useCallback((theme: Theme) => {
    setSelectedTheme(theme);
    setModalActive(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalActive(false);
    setSelectedTheme(null);
  }, []);

  const getThemeEditorUrl = (themeId: string) => {
    return `https://${shop}/admin/themes/${themeId}/editor?context=apps&activateAppId=${extensionId}/${extensionFileName}`;
  };

  const rows = themes.map((theme) => [
    theme.name,
    theme.role === "main" ? "(Live)" : "",
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Icon
        source={theme.isActive ? CheckIcon : XIcon}
        tone={theme.isActive ? "success" : "critical"}
      />
      <Button onClick={() => handleThemeClick(theme)} plain>
        Configure
      </Button>
    </div>
  ] as const);

  return (
    <Page title="Theme Setup">
      <Layout>
        <Layout.Section variant="oneThird">
          <Card>
            <Text as="h2" variant="headingMd">Your Themes</Text>
            <List type="bullet">
              {rows.map((row, index) => (
                <List.Item key={index}>
                  {row}
                </List.Item>
              ))}
            </List>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <Text as="h2" variant="headingMd">Setup Instructions</Text>
            <Text as="p">Click on any theme to view setup instructions and activate the app.</Text>
          </Card>
        </Layout.Section>

        <Modal
          open={modalActive}
          onClose={handleModalClose}
          title={`Setup ${selectedTheme?.name || ''}`}
          primaryAction={{
            content: 'Go to Theme Editor',
            onAction: () => {
              window.open(getThemeEditorUrl(selectedTheme?.id || ''), '_blank');
            },
          }}
          secondaryActions={[
            {
              content: 'Close',
              onAction: handleModalClose,
            },
          ]}
        >
          <Modal.Section>
            <Text as="h3" variant="headingSm">Follow these steps:</Text>
            <List type="number">
              <List.Item>Click "Go to Theme Editor" button above</List.Item>
              <List.Item>In Theme Editor, open the "App embeds" tab</List.Item>
              <List.Item>Find "404 Redirect" in the list</List.Item>
              <List.Item>Toggle the switch to enable the app</List.Item>
              <List.Item>Click "Save" to apply changes</List.Item>
            </List>
          </Modal.Section>
        </Modal>
      </Layout>
    </Page>
  );
}
