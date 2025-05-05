import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { Page, Layout, Card, DataTable, Text, Button, Banner, Modal, TextField, BlockStack, Box, InlineStack, Badge, Icon, Pagination, Checkbox } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import React, { useState, useCallback, useEffect } from "react";
import { RefreshIcon, ArrowRightIcon, EyeCheckMarkIcon, SettingsIcon, AutomationIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = 10;

  const billingCheck = await billing.check({
    plans: ["Premium"],
    isTest: process.env.NODE_ENV !== 'production',
  });

  const isPremium = billingCheck?.hasActivePayment;

  const [brokenLinks, total, autoFixSettings] = await Promise.all([
    prisma.notFoundError.groupBy({
      by: ['path'],
      where: {
        shopDomain: session.shop,
        redirected: false,
      },
      orderBy: {
        _count: {
          path: 'desc',
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      _count: {
        path: true,
      },
      _min: {
        timestamp: true,
      },
    }),
    prisma.notFoundError.groupBy({
      by: ['path'],
      where: {
        shopDomain: session.shop,
        redirected: false,
      },
      _count: true
    }).then(result => result.length),
    prisma.autoFixSettings.findUnique({
      where: {
        shopDomain: session.shop,
      }
    })
  ]);

  return json({
    brokenLinks,
    total,
    page,
    pageSize,
    isPremium,
    shop: session.shop,
    autoFixSettings: autoFixSettings || { enabled: false, toPath: "" }
  });
};

export default function BrokenLinks() {
  const { brokenLinks, total, page, pageSize, isPremium, shop, autoFixSettings } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [currentBrokenLinks, setBrokenLinks] = useState(brokenLinks);
  const [modalActive, setModalActive] = useState(false);
  const [selectedPath, setSelectedPath] = useState("");
  const [redirectPath, setRedirectPath] = useState("");
  const [bulkModalActive, setBulkModalActive] = useState(false);
  const [bulkRedirectPath, setBulkRedirectPath] = useState("");
  const [autoFixEnabled, setAutoFixEnabled] = useState(autoFixSettings.enabled);
  const [autoFixPath, setAutoFixPath] = useState(autoFixSettings.toPath);
  const [autoFixModalActive, setAutoFixModalActive] = useState(false);

  useEffect(() => {
    setBrokenLinks(brokenLinks);
  }, [brokenLinks]);

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
    const response = await fetch("/api/redirects/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paths: [selectedPath],
        toPath: redirectPath,
      }),
    });

    if (response.ok) {
      handleModalClose();
      shopify.toast.show("Redirect created successfully");
      setBrokenLinks(currentBrokenLinks.filter(link => link.path !== selectedPath));
    }
  }, [selectedPath, redirectPath, currentBrokenLinks]);

  const handleBulkRedirect = useCallback(async () => {
    const response = await fetch("/api/redirects/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paths: currentBrokenLinks.map(link => link.path),
        toPath: bulkRedirectPath,
      }),
    });

    if (response.ok) {
      setBulkModalActive(false);
      setBulkRedirectPath("");
      shopify.toast.show("Redirects created successfully");
      setBrokenLinks(currentBrokenLinks.filter(link => !currentBrokenLinks.includes(link)));
    }
  }, [currentBrokenLinks, bulkRedirectPath]);

  const handlePagination = useCallback((newPage: number) => {
    navigate(`/app/broken-links?page=${newPage}`);
  }, [navigate]);

  const handleSaveAutoFix = useCallback(async () => {
    const response = await fetch("/api/redirects/auto-fix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        enabled: autoFixEnabled,
        toPath: autoFixPath,
      }),
    });

    if (response.ok) {
      setAutoFixModalActive(false);
      shopify.toast.show("Auto-fix settings saved successfully");
    }
  }, [autoFixEnabled, autoFixPath]);

  const rows = currentBrokenLinks.map((link) => [
    link.path,
    link._min.timestamp ? new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(link._min.timestamp)) : 'N/A',
    1,
    <Button onClick={() => handleModalOpen(link.path)}>Fix</Button>
  ]);

  return (
    <Page 
      title="New Broken Links"
      subtitle="View and fix the most common 404 paths by creating redirects for broken links."
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
                        Showing the most common unhandled broken links
                      </Text>
                    </BlockStack>
                    <InlineStack gap="300">
                      <Button 
                        variant="plain" 
                        onClick={() => navigate("/app/broken-links")}
                        icon={RefreshIcon}
                      >
                        Refresh
                      </Button>
                      {currentBrokenLinks.length > 0 && isPremium && (
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
                        rows={currentBrokenLinks.map((link) => [
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
                            {link._min.timestamp ? new Intl.DateTimeFormat('en-US', {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            }).format(new Date(link._min.timestamp)) : 'N/A'}
                          </Text>,
                          <Text variant="bodyMd" as="span" alignment="end">
                            <Badge tone="info" progress="complete">
                              {String(link?._count?.path || 1)}
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

          {true && (
            <Layout.Section>
              <Card>
                <Box padding="500">
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <Text as="h2" variant="headingMd">
                          <InlineStack blockAlign="center" gap="200">
                            <span>Auto-Fix Broken Links</span>
                          </InlineStack>
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Automatically redirect new 404 errors to a default destination
                        </Text>
                      </BlockStack>
                    </InlineStack>

                    <Box
                      background="bg-surface-secondary"
                      borderRadius="300"
                      padding="400"
                      borderWidth="025"
                      borderColor="border-highlight"
                    >
                      <BlockStack gap="400">
                        <Text variant="bodyMd" as="p">
                          {autoFixEnabled 
                            ? `Auto-Fix is enabled. All new 404 errors will be automatically redirected to: ${autoFixPath || "Not configured yet"}`
                            : "Auto-Fix is disabled. Enable this feature to automatically redirect all new 404 errors to a specific page."}
                        </Text>
                        
                        <InlineStack gap="300">
                          <Button
                            onClick={() => setAutoFixModalActive(true)}
                            tone={autoFixEnabled ? "success" : "critical"}
                          >
                            {autoFixEnabled ? "Update Settings" : "Enable Auto-Fix"}
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    </Box>
                  </BlockStack>
                </Box>
              </Card>
            </Layout.Section>
          )}
        </Layout>
      </BlockStack>

      <Box paddingBlockStart="400">
        <InlineStack align="center" gap="200">
          <Pagination
            hasPrevious={page > 1}
            onPrevious={() => handlePagination(page - 1)}
            hasNext={page * pageSize < total}
            onNext={() => handlePagination(page + 1)}
            label={`Page ${page} of ${Math.ceil(total / pageSize)}`}
          />
        </InlineStack>
      </Box>

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
              This will redirect all {currentBrokenLinks.length} broken links to the same destination.
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

      <Modal
        open={autoFixModalActive}
        onClose={() => setAutoFixModalActive(false)}
        title="Configure Auto-Fix Settings"
        primaryAction={{
          content: 'Save Settings',
          onAction: handleSaveAutoFix,
          disabled: autoFixEnabled && !autoFixPath
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setAutoFixModalActive(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            <Checkbox
              label="Enable Auto-Fix for 404 errors"
              checked={autoFixEnabled}
              onChange={setAutoFixEnabled}
              helpText="When enabled, all new 404 errors will be automatically redirected to the specified path"
            />

            {autoFixEnabled && (
              <TextField
                label="Default Redirect Path"
                value={autoFixPath}
                onChange={setAutoFixPath}
                autoComplete="off"
                placeholder="/404"
                helpText="Enter the default path where all new 404 errors should redirect to"
              />
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
