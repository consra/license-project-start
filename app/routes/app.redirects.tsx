import React from "react";
import { Card, Page, Layout, TextField, Button, DataTable, Text, BlockStack, Box, InlineStack, Badge, Icon } from "@shopify/polaris";
import { useState, useCallback } from "react";
import { useNavigate } from "@remix-run/react";
import { 
  ArrowRightIcon, 
  CircleUpIcon,
  LinkIcon 
} from "@shopify/polaris-icons";

export default function Redirects() {
  const navigate = useNavigate();
  const [fromPath, setFromPath] = useState("");
  const [toPath, setToPath] = useState("");
  const [redirects, setRedirects] = useState([]);

  const handleSubmit = useCallback(async () => {
    const response = await fetch("/api/redirects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fromPath, toPath }),
    });
    
    if (response.ok) {
      setFromPath("");
      setToPath("");
      loadRedirects();
    }
  }, [fromPath, toPath]);

  const loadRedirects = useCallback(async () => {
    const response = await fetch("/api/redirects");
    const data = await response.json();
    setRedirects(data);
  }, []);

  return (
    <Page 
      title="Redirect Manager"
      subtitle="Create and manage redirects for your store's URLs"
    >
      <Layout>
        <Layout.Section>
          <Card>
            <Box padding="500">
              <BlockStack gap="100">
                <InlineStack align="start">
                  <Text variant="headingMd" as="h2">Create New Redirect</Text>
                </InlineStack>
                <BlockStack gap="400">
                  <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                    <InlineStack gap="400" blockAlign="start">
                      <div style={{ flex: 1 }}>
                        <TextField
                          label={
                            <InlineStack gap="200" align="center">
                              <Icon source={LinkIcon} tone="subdued" />
                              <Text as="span">From Path</Text>
                            </InlineStack>
                          }
                          value={fromPath}
                          onChange={setFromPath}
                          placeholder="/old-page"
                          autoComplete="off"
                          helpText="Original URL"
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
                            <InlineStack gap="200" align="center">
                              <Icon source={LinkIcon} tone="success" />
                              <Text as="span">To Path</Text>
                            </InlineStack>
                          }
                          value={toPath}
                          onChange={setToPath}
                          placeholder="/new-page"
                          autoComplete="off"
                          helpText="Destination URL"
                        />
                      </div>
                    </InlineStack>
                  </Box>

                  <Box>
                    <Button 
                      tone="success"
                      onClick={handleSubmit}
                      disabled={!fromPath || !toPath}
                      icon={CircleUpIcon}
                      size="slim"
                    >
                      Add Redirect
                    </Button>
                  </Box>
                </BlockStack>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Box padding="500">
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <BlockStack gap="100">
                    <InlineStack gap="300" align="start">
                      <Text variant="headingMd" as="h2">Active Redirects</Text>
                    </InlineStack>
                    <Text variant="bodySm" tone="subdued" as="span">
                      Manage your store's URL redirects
                    </Text>
                  </BlockStack>
                </InlineStack>

                {redirects.length > 0 ? (
                  <Box paddingBlockStart="400">
                    <DataTable
                      columnContentTypes={['text', 'text', 'text', 'text']}
                      headings={[
                        'From Path',
                        'To Path',
                        'Status',
                        'Created'
                      ]}
                      rows={redirects.map(r => [
                        <Box 
                          background="bg-surface-secondary" 
                          padding="200" 
                          borderRadius="150"
                        >
                          <InlineStack gap="200" align="center">
                            <Icon source={LinkIcon} tone="subdued" />
                            <Text variant="bodyMd" as="span">{r.from_path}</Text>
                          </InlineStack>
                        </Box>,
                        <InlineStack gap="200" align="center">
                          <Text variant="bodyMd" as="span">→</Text>
                          <Text variant="bodyMd" as="span">{r.to_path}</Text>
                        </InlineStack>,
                        <Badge tone="success">Active</Badge>,
                        <Text variant="bodyMd" as="span">
                          {new Date(r.created_at).toLocaleDateString()}
                        </Text>
                      ])}
                    />
                  </Box>
                ) : (
                  <Box
                    background="bg-surface-secondary"
                    padding="500"
                    borderRadius="200"
                  >
                    <BlockStack gap="300" align="center">
                      <BlockStack gap="200">
                        <Text as="h3" variant="headingSm">
                          No redirects yet
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Create your first redirect using the form above to help visitors find the right pages.
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
    </Page>
  );
}