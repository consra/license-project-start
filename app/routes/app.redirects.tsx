import React, { useEffect } from "react";
import { Card, Page, Layout, TextField, Button, DataTable, Text, BlockStack, Box, InlineStack, Badge, Icon, Pagination, TextField as SearchField } from "@shopify/polaris";
import { useState, useCallback } from "react";
import { json, useLoaderData, useNavigate } from "@remix-run/react";
import { 
  CircleUpIcon,
  LinkIcon,
  DeleteIcon,
  SearchIcon
} from "@shopify/polaris-icons";
import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import { prisma } from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const search = url.searchParams.get("search") || "";
  const pageSize = 10;

  const [redirects, total] = await Promise.all([
    prisma.redirect.findMany({
      where: {
        shopDomain: session.shop,
        isWildcard: false,
        OR: [
          { fromPath: { contains: search, mode: 'insensitive' } },
          { toPath: { contains: search, mode: 'insensitive' } }
        ]
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.redirect.count({
      where: {
        shopDomain: session.shop,
        isWildcard: false,
        OR: [
          { fromPath: { contains: search, mode: 'insensitive' } },
          { toPath: { contains: search, mode: 'insensitive' } }
        ]
      }
    })
  ]);

  return json({
    redirects,
    total,
    page,
    pageSize,
    shop: session.shop
  });
};

export default function Redirects() {
  const [fromPath, setFromPath] = useState("");
  const [toPath, setToPath] = useState("");
  const { redirects, total, page, pageSize } = useLoaderData<typeof loader>();
  console.log("redirects", JSON.stringify(redirects));
  const [searchValue, setSearchValue] = useState("");
  const navigate = useNavigate();
  const [currentRedirects, setRedirects] = useState(redirects);

  useEffect(() => {
    setRedirects(redirects);
  }, [redirects]);

  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
    navigate(`?search=${value}&page=1`);
  }, [navigate]);

  const handlePagination = useCallback((newPage: number) => {
    const searchParam = searchValue ? `&search=${searchValue}` : '';
    navigate(`?page=${newPage}${searchParam}`);
  }, [navigate, searchValue]);

  const handleSubmit = useCallback(async () => {
    const response = await fetch("/api/redirects/bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paths: [fromPath], toPath }),
    });
    
    if (response.ok) {
      navigate(`?page=1`);
      shopify.toast.show("Redirect created successfully");
      setFromPath("");
      setToPath("");
    }
  }, [fromPath, toPath]);

  const handleDelete = useCallback(async (fromPath: string) => {
    const response = await fetch("/api/redirects/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromPath }),
    });
    
    if (response.ok) {
      shopify.toast.show("Redirect deleted");
      setRedirects(currentRedirects.filter(r => r.fromPath !== fromPath));
    }
  }, [currentRedirects]);

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
                    <Text variant="headingMd" as="h2">Active Redirects</Text>
                    <Text variant="bodySm" tone="subdued" as="span">
                      {total} redirects total
                    </Text>
                  </BlockStack>
                  <SearchField
                    prefix={<Icon source={SearchIcon} />}
                    placeholder="Search redirects"
                    value={searchValue}
                    onChange={handleSearch}
                    autoComplete="off"
                  />
                </InlineStack>

                {currentRedirects.length > 0 ? (
                  <Box paddingBlockStart="400">
                    <DataTable
                      columnContentTypes={['text', 'text', 'text', 'text']}
                      headings={[
                        'From Path',
                        'To Path',
                        'Status',
                        'Created'
                      ]}
                      rows={currentRedirects.map(r => [
                        <Box 
                          background="bg-surface-secondary" 
                          padding="100" 
                          borderRadius="150"
                        >
                          <InlineStack gap="100" align="center">
                            <Text variant="bodyMd" as="span">{r.fromPath}</Text>
                          </InlineStack>
                        </Box>,
                        <InlineStack gap="100" align="center">
                          <Text variant="bodyMd" as="span">{r.toPath}</Text>
                        </InlineStack>,
                        <Badge tone="success">Active</Badge>,
                        <InlineStack gap="100" align="space-between">
                          <InlineStack gap="100" align="start">
                            <Text variant="bodyMd" as="span">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </Text>
                          </InlineStack>
                          <Button 
                            icon={DeleteIcon}
                            tone="critical"
                            variant="plain"
                            onClick={() => handleDelete(r.fromPath)}
                          />
                        </InlineStack>
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
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}