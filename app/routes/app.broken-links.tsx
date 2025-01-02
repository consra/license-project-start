import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { Page, Layout, Card, DataTable, Text, Button, Banner, Modal, TextField, BlockStack, Box, InlineStack, Badge, Icon } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import React, { useState, useCallback } from "react";
import { RefreshIcon, ArrowRightIcon, EyeCheckMarkIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const brokenLinks = await prisma.notFoundError.findMany({
    where: {
      shopDomain: session.shop,
      redirected: false,
    },
    orderBy: {
      timestamp: 'desc'
    },
    take: 100
  });

  return json({
    brokenLinks,
    shop: session.shop
  });
};

export default function BrokenLinks() {
  const { brokenLinks, shop } = useLoaderData<typeof loader>();
  const [modalActive, setModalActive] = useState(false);
  const [selectedPath, setSelectedPath] = useState("");
  const [redirectPath, setRedirectPath] = useState("");
  const [bulkModalActive, setBulkModalActive] = useState(false);
  const [bulkRedirectPath, setBulkRedirectPath] = useState("");

  const handleModalOpen = useCallback((path: string) => {
    setSelectedPath(path);
    setRedirectPath("");
    setModalActive(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalActive(false);
    setSelectedPath("");
    setRedirectPath("");
  }, []);

  const handleFixRedirect = useCallback(async () => {
    const response = await fetch("/api/redirects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fromPath: selectedPath,
        toPath: redirectPath,
      }),
    });

    if (response.ok) {
      handleModalClose();
      // Optionally refresh the page or update the list
      window.location.reload();
    }
  }, [selectedPath, redirectPath]);

  const handleBulkRedirect = useCallback(async () => {
    const response = await fetch("/api/redirects/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paths: brokenLinks.map(link => link.path),
        toPath: bulkRedirectPath,
      }),
    });

    if (response.ok) {
      setBulkModalActive(false);
      setBulkRedirectPath("");
      window.location.reload();
    }
  }, [brokenLinks, bulkRedirectPath]);

  const rows = brokenLinks.map((link) => [
    link.path,
    new Date(link.timestamp).toLocaleString(),
    1,
    <Button onClick={() => handleModalOpen(link.path)}>Fix</Button>
  ]);

  return (
    <Page 
      title="New Broken Links"
      subtitle="View and fix recent 404 errors by creating redirects for broken links."
    >
      <BlockStack gap="500">
        <Banner tone="warning">
          <Text variant="headingSm" as="h2">
            These are new broken links detected on your store that haven't been redirected yet. 
            Click "Fix" to create a redirect for any broken URL.
          </Text>
        </Banner>

        <Layout>
          <Layout.Section>
            <Card roundedAbove="xl">
              <Box padding="500">
                <BlockStack gap="400">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingMd">
                        Recent 404 Errors
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Showing the last 10 unhandled broken links
                      </Text>
                    </BlockStack>
                    <InlineStack gap="300">
                      <Button 
                        variant="plain" 
                        onClick={() => window.location.reload()}
                        icon={RefreshIcon}
                      >
                        Refresh
                      </Button>
                      {brokenLinks.length > 0 && (
                        <Button 
                          onClick={() => setBulkModalActive(true)}
                          tone="success"
                        >
                          Bulk Redirect
                        </Button>
                      )}
                    </InlineStack>
                  </InlineStack>

                  {rows.length > 0 ? (
                    <Box paddingBlockStart="400">
                      <DataTable
                        columnContentTypes={['text', 'text', 'numeric', 'text']}
                        headings={[
                          'Broken URL',
                          'First Seen', 
                          'Occurrences',
                          'Action'
                        ]}
                        rows={brokenLinks.map((link) => [
                          <InlineStack wrap={false}>
                            <Box 
                              background="bg-surface-secondary" 
                              padding="200" 
                              borderRadius="150"
                              minWidth="100%"
                            >
                              <Text variant="bodyMd" as="span">
                                {link.path}
                              </Text>
                            </Box>
                          </InlineStack>,
                          <Text variant="bodyMd" as="span">
                            {new Intl.DateTimeFormat('en-US', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            }).format(new Date(link.timestamp))}
                          </Text>,
                          <Text variant="bodyMd" as="span" alignment="end">
                            <Badge tone="info" progress="complete">
                              {link.count || 1}
                            </Badge>
                          </Text>,
                          <InlineStack align="start">
                            <Button 
                              size="slim"
                              onClick={() => handleModalOpen(link.path)}
                              tone="success"
                              icon={ArrowRightIcon}
                            >
                              Fix
                            </Button>
                          </InlineStack>
                        ])}
                      />
                    </Box>
                  ) : (
                    <Box
                      background="bg-surface-secondary"
                      padding="500"
                      borderRadius="200"
                      textAlign="center"
                    >
                      <BlockStack gap="300" align="center">
                        <Icon source={EyeCheckMarkIcon} tone="success" />
                        <BlockStack gap="200">
                          <Text as="h3" variant="headingSm">
                            No broken links detected
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Great job! Your store doesn't have any unhandled 404 errors.
                          </Text>
                        </BlockStack>
                      </BlockStack>
                    </Box>
                  )}
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>

      <Modal
        open={modalActive}
        onClose={handleModalClose}
        title="Create Redirect"
        primaryAction={{
          content: 'Create Redirect',
          onAction: handleFixRedirect,
          disabled: !redirectPath
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: handleModalClose,
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <TextField
              label="From Path"
              value={selectedPath}
              disabled
              autoComplete="off"
            />
            <TextField
              label="Redirect To"
              value={redirectPath}
              onChange={setRedirectPath}
              autoComplete="off"
              placeholder="/new-path"
              helpText="Enter the path where this URL should redirect to"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>

      <Modal
        open={bulkModalActive}
        onClose={() => {
          setBulkModalActive(false);
          setBulkRedirectPath("");
        }}
        title="Bulk Redirect"
        primaryAction={{
          content: 'Create Redirects',
          onAction: handleBulkRedirect,
          disabled: !bulkRedirectPath
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => {
              setBulkModalActive(false);
              setBulkRedirectPath("");
            },
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Text as="p" variant="bodyMd">
              This will redirect all {brokenLinks.length} broken links to the same destination.
            </Text>
            <TextField
              label="Redirect To"
              value={bulkRedirectPath}
              onChange={setBulkRedirectPath}
              autoComplete="off"
              placeholder="/new-path"
              helpText="Enter the path where all broken URLs should redirect to"
            />
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
