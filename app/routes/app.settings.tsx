import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import { 
  Card, 
  Page, 
  Layout, 
  TextField, 
  Select, 
  Button, 
  Banner,
  BlockStack,
  Text,
  Box
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { useState, useCallback } from "react";
import React from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const settings = await prisma.notificationSettings.findFirst({
    where: {
      shopDomain: session.shop
    }
  });

  return json({ settings, shop: session.shop });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const email = formData.get("email") as string;
  const frequency = formData.get("frequency") as string;
  const enabled = formData.get("enabled") === "true";

  try {
    await prisma.notificationSettings.upsert({
      where: {
        shopDomain_email: {
          shopDomain: session.shop,
          email: email
        }
      },
      update: {
        frequency,
        enabled
      },
      create: {
        shopDomain: session.shop,
        email,
        frequency,
        enabled
      }
    });

    return json({ success: true });
  } catch (error) {
    console.error("Failed to save settings:", error);
    return json({ error: "Failed to save settings" }, { status: 500 });
  }
};

export default function Settings() {
  const { settings } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  
  const [email, setEmail] = useState(settings?.email || "");
  const [frequency, setFrequency] = useState(settings?.frequency || "weekly");
  const [enabled, setEnabled] = useState(settings?.enabled ?? true);

  const handleSubmit = useCallback(() => {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("frequency", frequency);
    formData.append("enabled", enabled.toString());
    
    submit(formData, { method: "post" });
  }, [email, frequency, enabled, submit]);

  const frequencyOptions = [
    { label: "Daily", value: "daily" },
    { label: "Weekly", value: "weekly" },
    { label: "Monthly", value: "monthly" }
  ];

  return (
    <Page title="Notification Settings">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Email Notifications</Text>
              <Text color="subdued">
                Get notified about new 404 errors on your store
              </Text>
              
              <TextField
                label="Email Address"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
              />

              <Select
                label="Notification Frequency"
                options={frequencyOptions}
                value={frequency}
                onChange={setFrequency}
              />

              <Box>
                <Button onClick={() => setEnabled(!enabled)}>
                  {enabled ? "Disable" : "Enable"} Notifications
                </Button>
              </Box>

              <Box>
                <Button primary onClick={handleSubmit}>
                  Save Settings
                </Button>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>

        {settings && (
          <Layout.Section>
            <Banner status="info">
              <p>Last notification sent: {settings.lastSentAt ? 
                new Date(settings.lastSentAt).toLocaleDateString() : 
                'No notifications sent yet'}
              </p>
            </Banner>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
} 