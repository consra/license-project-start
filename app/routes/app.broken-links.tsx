import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { Page, Layout, Card, DataTable, Text, Button, Banner, Modal, TextField } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import React, { useState, useCallback } from "react";

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

  const rows = brokenLinks.map((link) => [
    link.path,
    new Date(link.timestamp).toLocaleString(),
    1,
    <Button onClick={() => handleModalOpen(link.path)}>Fix</Button>
  ]);

  return (
    <Page title="New Broken Links">
      <Layout>
        <Layout.Section>
          <Card>
            <Banner tone="warning">
              <p>Showing new 404 errors that need to be fixed for {shop}</p>
            </Banner>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            {rows.length > 0 ? (
              <DataTable
                columnContentTypes={['text', 'text', 'numeric', 'text']}
                headings={['Broken URL', 'First Seen', 'Occurrences', 'Action']}
                rows={rows}
              />
            ) : (
              <Text as="p" alignment="center" tone="subdued">
                No new broken links have been detected.
              </Text>
            )}
          </Card>
        </Layout.Section>

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
          </Modal.Section>
        </Modal>
      </Layout>
    </Page>
  );
} 