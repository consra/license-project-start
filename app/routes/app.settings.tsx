import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import { 
  Card, 
  Page, 
  Layout, 
  TextField, 
  Select, 
  Button, 
  Text,
  Box,
  BlockStack,
  InlineStack,
  Icon,
  ChoiceList,
  Badge
} from "@shopify/polaris";
import { EmailIcon, NotificationIcon, SettingsIcon } from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { useState, useCallback } from "react";
import React from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const [settings, redirectCount] = await Promise.all([
    prisma.notificationSettings.findFirst({
      where: { shopDomain: session.shop }
    }),
    prisma.redirect.count({
      where: { shopDomain: session.shop }
    })
  ]);

  return json({ settings, redirectCount, shop: session.shop });
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
        enabled,
      },
      create: {
        shopDomain: session.shop,
        email,
        frequency,
        enabled,
      }
    });

    return json({ success: true });
  } catch (error) {
    console.error("Failed to save settings:", error);
    return json(
      { error: "Failed to save notification settings" }, 
      { status: 500 }
    );
  }
};

export default function Settings() {
  const { settings, redirectCount } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  
  const [email, setEmail] = useState(settings?.email || "");
  const [frequency, setFrequency] = useState(settings?.frequency || "weekly");
  const [enabled, setEnabled] = useState(settings?.enabled ?? false);

  const handleSubmit = useCallback(() => {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("frequency", frequency);
    formData.append("enabled", enabled.toString());
    
    submit(formData, { method: "post" });
  }, [email, frequency, enabled, submit]);

  return (
    <Page 
      title="Settings" 
      subtitle="Configure your SEO Wizard preferences"
      divider
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Box
              background="bg-surface-secondary"
              borderRadius="300"
              padding="600"

              shadow="200"
            >
              <BlockStack gap="600">
                <InlineStack gap="400" blockAlign="center">
                  <div style={{ 
                    backgroundColor: 'var(--p-color-bg-success-subdued)',
                    padding: '16px',
                    borderRadius: '12px',
                    boxShadow: 'var(--p-shadow-100)'
                  }}>
                    <Icon source={EmailIcon} tone="success" />
                  </div>
                  <BlockStack gap="100">
                    <Text variant="headingMd" as="h2">Email Notifications</Text>
                    <Text variant="bodySm" tone="subdued">Configure how you want to receive notifications</Text>
                  </BlockStack>
                </InlineStack>

                <BlockStack gap="500">
                  <Box
                    background="bg-surface"
                    padding="400"
                    borderRadius="200"
                    shadow="100"
                  >
                    <TextField
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      autoComplete="email"
                      helpText="Where to send notifications about new 404 errors"
                    />
                  </Box>

                  <Box
                    background="bg-surface"
                    padding="400"
                    borderRadius="200"
                    shadow="100"
                  >
                    <Select
                      label="Notification Frequency"
                      options={[
                        { label: "Daily Digest", value: "daily" },
                        { label: "Weekly Summary", value: "weekly" },
                        { label: "Monthly Report", value: "monthly" }
                      ]}
                      value={frequency}
                      onChange={setFrequency}
                    />
                  </Box>

                  <Box
                    background="bg-surface"
                    padding="400"
                    borderRadius="200"
                    shadow="100"
                  >
                    <BlockStack gap="300">
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="100">
                          <Text variant="bodySm" fontWeight="medium">Notification Status</Text>
                          <Text variant="bodySm" tone="subdued">
                            {enabled ? "You will receive notifications" : "Notifications are disabled"}
                          </Text>
                        </BlockStack>
                        <Badge tone={enabled ? "success" : "critical"} size="large">
                          {enabled ? "Active" : "Inactive"}
                        </Badge>
                      </InlineStack>

                      <InlineStack gap="300">
                        <Button 
                          onClick={() => {
                            const formData = new FormData();
                            formData.append("email", email);
                            formData.append("frequency", frequency);
                            formData.append("enabled", (!enabled).toString());
                            submit(formData, { method: "post" });
                            setEnabled(!enabled);
                          }}
                          disabled={!email}
                          tone={enabled ? "critical" : "success"}
                          variant="secondary"
                          fullWidth
                        >
                          {enabled ? "Disable" : "Enable"} Notifications
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  </Box>
                </BlockStack>
              </BlockStack>
            </Box>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 