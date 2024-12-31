import { Card, Page, Layout, TextField, Button, DataTable } from "@shopify/polaris";
import { useState, useCallback } from "react";
import { useAuthenticatedFetch } from "../hooks";

export function RedirectManager() {
  const fetch = useAuthenticatedFetch();
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
      // Reset form and refresh list
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
    <Page title="404 Redirect Manager">
      <Layout>
        <Layout.Section>
          <Card sectioned>
            <TextField
              label="From Path"
              value={fromPath}
              onChange={setFromPath}
              placeholder="/old-page"
            />
            <TextField
              label="To Path"
              value={toPath}
              onChange={setToPath}
              placeholder="/new-page"
            />
            <Button primary onClick={handleSubmit}>Add Redirect</Button>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <DataTable
              columnContentTypes={["text", "text"]}
              headings={["From Path", "To Path"]}
              rows={redirects.map(r => [r.from_path, r.to_path])}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 