import { json, type LoaderFunctionArgs, redirect, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
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

const PREMIUM_PLAN = {
  amount: 3.99,
  currencyCode: "USD",
  interval: "EVERY_30_DAYS" as const,
  trialDays: 7,
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  
  // Check if shop has active subscription through Shopify API
  const subscriptionData = await admin.graphql(`
    query getSubscription {
      appInstallation {
        activeSubscriptions {
          id
          name
          status
          currentPeriodEnd
          lineItems {
            plan {
              pricingDetails {
                ... on AppRecurringPricing {
                  price {
                    amount
                    currencyCode
                  }
                }
              }
            }
          }
        }
      }
    }
  `);

  const data = await subscriptionData.json();
  const activeSubscription = data.appInstallation?.activeSubscriptions[0];
  const isPremium = activeSubscription?.lineItems[0]?.plan?.pricingDetails?.price?.amount === PREMIUM_PLAN.amount;

  return json({
    isPremium,
    activeSubscription,
    shop: session.shop 
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const planType = formData.get("planType") as string;

  if (planType === "premium") {
    const response = await admin.graphql(`
      mutation createSubscription($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $returnUrl: URL!, $trialDays: Int!) {
        appSubscriptionCreate(
          name: $name,
          lineItems: $lineItems,
          returnUrl: $returnUrl,
          trialDays: $trialDays,
          test: true
        ) {
          appSubscription {
            id
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }
    `, {
      variables: {
        name: "Premium Plan",
        lineItems: [{
          plan: {
            appRecurringPricingDetails: {
              price: { amount: PREMIUM_PLAN.amount, currencyCode: PREMIUM_PLAN.currencyCode },
              interval: PREMIUM_PLAN.interval,
            },
          },
        }],
        returnUrl: `https://${session.shop}/admin/apps/seo-wizard`,
        trialDays: PREMIUM_PLAN.trialDays
      },
    });

    const { appSubscriptionCreate } = await response.json();

    if (appSubscriptionCreate.userErrors.length > 0) {
      return json({ errors: appSubscriptionCreate.userErrors });
    }

    return redirect(appSubscriptionCreate.confirmationUrl);
  }

  // For downgrading to free plan, we'll let Shopify handle it through their billing UI
  return json({ error: "Please manage your subscription through Shopify admin" }, { status: 400 });
};

export default function Billing() {
  const { isPremium, activeSubscription } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const [selectedPlan] = useState(isPremium ? 'premium' : 'free');

  const handlePlanChange = (planType: string) => {
    const formData = new FormData();
    formData.append("planType", planType);
    submit(formData, { method: "post" });
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
                borderColor={selectedPlan === plan.name.toLowerCase() ? "border-info" : "border-subdued"}
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
                      disabled={selectedPlan === plan.name.toLowerCase()}
                      size="large"
                      fullWidth
                    >
                      {selectedPlan === plan.name.toLowerCase() 
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

        <Layout.Section>
          <Box padding="400">
            <BlockStack gap="200" align="center">
              <Text variant="headingSm" as="h3">Questions about billing?</Text>
              <Text variant="bodySm" as="p" tone="subdued">
                Contact us at support@seowizard.com
              </Text>
            </BlockStack>
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 