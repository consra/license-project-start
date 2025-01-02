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

export default function Settings() {
  const { settings, redirectCount } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  
  const [email, setEmail] = useState(settings?.email || "");
  const [frequency, setFrequency] = useState(settings?.frequency || "weekly");
  const [enabled, setEnabled] = useState(settings?.enabled ?? true);
  const [autoRedirect, setAutoRedirect] = useState(true);
  const [threshold, setThreshold] = useState("3");

  const handleSubmit = useCallback(() => {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("frequency", frequency);
    formData.append("enabled", enabled.toString());
    formData.append("autoRedirect", autoRedirect.toString());
    formData.append("threshold", threshold);
    
    submit(formData, { method: "post" });
  }, [email, frequency, enabled, autoRedirect, threshold, submit]);

  return (
    <Page 
      title="Settings" 
      subtitle="Configure your SEO Wizard preferences"
      divider
    >
      <Layout>
        {/* Email Notifications Section */}
        <Layout.Section>
          <Card>
            <Box padding="500">
              <BlockStack gap="500">
                <InlineStack gap="200" blockAlign="center">
                  <div style={{ 
                    backgroundColor: 'var(--p-color-bg-success-subdued)',
                    padding: '12px',
                    borderRadius: '8px'
                  }}>
                    <Icon source={EmailIcon} tone="success" />
                  </div>
                  <BlockStack gap="100">
                    <Text variant="headingMd" as="h2">Email Notifications</Text>
                    <Text variant="bodySm" tone="subdued">Configure how you want to receive notifications</Text>
                  </BlockStack>
                </InlineStack>

                <Box
                  background="bg-surface-secondary"
                  borderRadius="300"
                  padding="500"
                  borderWidth="025"
                  borderColor="border-subdued"
                  shadow="100"
                >
                  <BlockStack gap="500">
                    <TextField
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={setEmail}
                      autoComplete="email"
                      helpText="Where to send notifications about new 404 errors"
                    />

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

                    <Box
                      background="bg-surface"
                      padding="300"
                      borderRadius="200"
                    >
                      <InlineStack align="space-between" blockAlign="center">
                        <BlockStack gap="100">
                          <Text variant="bodySm" fontWeight="medium">Notification Status</Text>
                          <Text variant="bodySm" tone="subdued">
                            {enabled ? "You will receive notifications" : "Notifications are disabled"}
                          </Text>
                        </BlockStack>
                        <Badge tone={enabled ? "success" : "critical"}>
                          {enabled ? "Active" : "Inactive"}
                        </Badge>
                      </InlineStack>
                    </Box>

                    <Button 
                      onClick={() => setEnabled(!enabled)}
                      tone={enabled ? "critical" : "success"}
                    >
                      {enabled ? "Disable" : "Enable"} Notifications
                    </Button>
                  </BlockStack>
                </Box>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>

        {/* Auto-Redirect Settings */}
        <Layout.Section>
          <Card>
            <Box padding="500">
              <BlockStack gap="500">
                <InlineStack gap="200" blockAlign="center">
                  <div style={{ 
                    backgroundColor: 'var(--p-color-bg-info-subdued)',
                    padding: '12px',
                    borderRadius: '8px'
                  }}>
                    <Icon source={SettingsIcon} tone="info" />
                  </div>
                  <BlockStack gap="100">
                    <Text variant="headingMd" as="h2">Auto-Redirect Settings</Text>
                    <Text variant="bodySm" tone="subdued">Manage how redirects are handled</Text>
                  </BlockStack>
                </InlineStack>

                <Box
                  background="bg-surface-secondary"
                  borderRadius="300"
                  padding="500"
                  borderWidth="025"
                  borderColor="border-subdued"
                  shadow="100"
                >
                  <BlockStack gap="500">
                    <Box
                      background="bg-surface"
                      padding="400"
                      borderRadius="200"
                    >
                      <ChoiceList
                        title="Automatic Redirects"
                        choices={[
                          {
                            label: "Automatically create redirects for common 404 errors",
                            value: "auto",
                            helpText: "System will suggest redirects based on similar URLs"
                          }
                        ]}
                        selected={autoRedirect ? ["auto"] : []}
                        onChange={(value) => setAutoRedirect(value.includes("auto"))}
                      />
                    </Box>

                    <TextField
                      label="Error Threshold"
                      type="number"
                      value={threshold}
                      onChange={setThreshold}
                      helpText="Minimum number of 404s before suggesting a redirect"
                      autoComplete="off"
                    />

                    <Box
                      background="bg-surface-active"
                      padding="400"
                      borderRadius="200"
                      shadow="100"
                    >
                      <InlineStack gap="200" align="center">
                        <div style={{ 
                          backgroundColor: 'var(--p-color-bg-info)',
                          padding: '8px',
                          borderRadius: '6px'
                        }}>
                          <Icon source={NotificationIcon} tone="info" />
                        </div>
                        <BlockStack gap="100">
                          <Text variant="bodySm" fontWeight="medium">Active Redirects</Text>
                          <Text variant="bodySm" tone="subdued">
                            Currently managing {redirectCount} redirects
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    </Box>
                  </BlockStack>
                </Box>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>

        {/* Save Button */}
        <Layout.Section>
          <Box padding="400">
            <Button primary size="large" onClick={handleSubmit} fullWidth>
              Save Settings
            </Button>
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 