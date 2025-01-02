import { json, type LoaderFunctionArgs, redirect, type ActionFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { 
  Page, 
  Layout, 
  Text,
  Box,
  BlockStack,
  InlineStack,
  Button,
  List,
  Badge
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useState } from "react";
import { Check, X, Zap } from "lucide-react";

const FREE_PLAN = "Free";
const PREMIUM_PLAN = {
  name: "Premium",
  amount: 3.99,
  currencyCode: "USD",
  interval: "EVERY_30_DAYS" as const,
  trialDays: 7
};

const isTest = process.env.NODE_ENV !== 'production';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing } = await authenticate.admin(request);

  // Check current subscription status
  const response = await billing.check({
    plans: [PREMIUM_PLAN.name],
    isTest,
  });

  const { appSubscriptions, hasActivePayment } = response;
  const currentPlan = hasActivePayment ? appSubscriptions[0]?.name : FREE_PLAN;

  return json({ 
    currentPlan,
    appSubscriptions,
    hasActivePayment
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { billing } = await authenticate.admin(request);
  const formData = await request.formData();
  const selectedPlan = formData.get("planType") as string;

  // Check current subscription status
  const checkResponse = await billing.check({
    plans: [PREMIUM_PLAN.name],
    isTest,
  });
  console.log("checkResponse", JSON.stringify(checkResponse));

  // Cancel existing subscription if any
  if (checkResponse.hasActivePayment) {
    console.log('Canceling plan:', checkResponse.appSubscriptions[0].name);
    await billing.cancel({
      subscriptionId: checkResponse.appSubscriptions[0].id,
      isTest,
      prorate: false,
    });
  }

  // Handle plan selection
  if (selectedPlan.toLowerCase() === "free") {
    return json({ success: true });
  }

  if (selectedPlan.toLowerCase() === "premium") {
    try {
      const response = await billing.require({
        plans: [PREMIUM_PLAN.name],
        isTest,
        onFailure: async () => billing.request({
          plan: PREMIUM_PLAN.name,
          isTest
        }),
      });

      console.log('Subscription response:', JSON.stringify(response));

      if (response?.hasActivePayment) {
        return json({ success: true });
      }

      // Redirect to Shopify's confirmation URL if available
      if (response.confirmationUrl) {
        return redirect(response.confirmationUrl);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      return json({ error: "Failed to process subscription" }, { status: 500 });
    }
  }

  return json({ error: "Invalid plan selected" }, { status: 400 });
};

export default function Billing() {
  const { currentPlan, hasActivePayment } = useLoaderData<typeof loader>();
  const [selectedPlan] = useState(currentPlan);
  const fetcher = useFetcher();
  console.log("currentPlan", currentPlan);

  const handlePlanChange = (planType: string) => {
    const formData = new FormData();
    formData.append("planType", planType.toLowerCase());
    fetcher.submit(formData, { method: "post" });
  };

  const plans = [
    {
      name: "Free",
      price: "0",
      features: [
        "Basic 404 error tracking",
        "Simple redirects",
        "Weekly email reports",
        "Basic analytics",
        "Up to 100 redirects"
      ],
      limitations: [
        "No wildcard redirects",
        "Limited analytics",
        "Basic support only",
        "No bulk operations"
      ]
    },
    {
      name: "Premium",
      price: "3.99",
      features: [
        "Advanced 404 tracking",
        "Wildcard redirects",
        "Daily email reports",
        "Advanced analytics",
        "Unlimited redirects",
        "Bulk operations",
        "Priority support",
        "Custom rules",
        "API access"
      ]
    }
  ];

  return (
    <Page 
      title="Plans & Billing" 
      subtitle="Choose the plan that best fits your needs"
      divider
    >
      <Layout>
        <Layout.Section>
          <Box
            background="bg-surface-info-subdued"
            borderRadius="300"
            padding="400"
            borderWidth="025"
            borderColor="border-info"
          >
            <InlineStack gap="300" align="center">
              <Zap size={20} style={{ color: 'var(--p-color-text-info)' }} />
              <Text as="p">Try Premium free for {PREMIUM_PLAN.trialDays} days. Cancel anytime.</Text>
            </InlineStack>
          </Box>
        </Layout.Section>

        <Layout.Section>
          <InlineStack gap="500" wrap={false}>
            {plans.map((plan) => (
              <Box
                key={plan.name.toLowerCase()}
                background="bg-surface-secondary"
                borderRadius="300"
                padding="600"
                shadow="200"
                width="100%"
                borderWidth="025"
                borderColor={selectedPlan.toLowerCase() === plan.name.toLowerCase() ? "border-info" : "border-subdued"}
              >
                <BlockStack gap="600">
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <InlineStack gap="200" blockAlign="center">
                        {plan.name === "Premium" && (
                          <div style={{ 
                            backgroundColor: 'var(--p-color-bg-info-subdued)',
                            padding: '8px',
                            borderRadius: '6px'
                          }}>
                            <Zap size={20} style={{ color: 'var(--p-color-text-info)' }} />
                          </div>
                        )}
                        <Text variant="headingMd" as="h2">{plan.name}</Text>
                        {plan.name === "Premium" && (
                          <Badge tone="info">Most Popular</Badge>
                        )}
                      </InlineStack>
                    </InlineStack>
                    <InlineStack gap="100" align="baseline">
                      <Text variant="heading2xl" as="p">${plan.price}</Text>
                      <Text variant="bodyMd" as="p" tone="subdued">/month</Text>
                      {plan.name === "Premium" && (
                        <Text variant="bodySm" tone="subdued">
                          (billed monthly)
                        </Text>
                      )}
                    </InlineStack>
                  </BlockStack>

                  <Box
                    background="bg-surface"
                    padding="400"
                    borderRadius="200"
                    shadow="100"
                  >
                    <BlockStack gap="400">
                      <Text variant="headingSm" as="h3">Features included:</Text>
                      <List type="bullet">
                        {plan.features.map((feature, index) => (
                          <List.Item key={index}>
                            <InlineStack gap="200" blockAlign="center">
                              <Check 
                                size={16} 
                                style={{ color: 'var(--p-color-text-success)' }}
                              />
                              <Text variant="bodyMd" as="span">{feature}</Text>
                            </InlineStack>
                          </List.Item>
                        ))}
                      </List>

                      {plan.limitations && (
                        <>
                          <Text variant="headingSm" as="h3">Limitations:</Text>
                          <List type="bullet">
                            {plan.limitations.map((limitation, index) => (
                              <List.Item key={index}>
                                <InlineStack gap="200" blockAlign="center">
                                  <X 
                                    size={16} 
                                    style={{ color: 'var(--p-color-text-critical)' }}
                                  />
                                  <Text variant="bodyMd" as="span">{limitation}</Text>
                                </InlineStack>
                              </List.Item>
                            ))}
                          </List>
                        </>
                      )}
                    </BlockStack>
                  </Box>

                  <Box>
                    <Button
                      variant={plan.name === "Premium" ? "primary" : "secondary"}
                      onClick={() => handlePlanChange(plan.name.toLowerCase())}
                      disabled={selectedPlan.toLowerCase() === plan.name.toLowerCase()}
                      size="large"
                      fullWidth
                    >
                      {selectedPlan.toLowerCase() === plan.name.toLowerCase() 
                        ? "Current Plan" 
                        : plan.name === "Premium" 
                          ? `Upgrade to ${plan.name}` 
                          : "Downgrade to Free"}
                    </Button>
                    {plan.name === "Premium" && (
                      <Box paddingBlockStart="200">
                        <Text variant="bodySm" as="p" tone="subdued" alignment="center">
                          {PREMIUM_PLAN.trialDays}-day free trial, then ${PREMIUM_PLAN.amount}/month
                        </Text>
                      </Box>
                    )}
                  </Box>
                </BlockStack>
              </Box>
            ))}
          </InlineStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 