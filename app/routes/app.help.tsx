import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import { 
  Card, 
  Page, 
  Layout, 
  TextField, 
  Button, 
  Banner,
  BlockStack,
  Text,
  Box,
  TextContainer,
  InlineStack,
  Icon
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { useState, useCallback } from "react";
import React from "react";
import { sendNotificationEmail } from "../services/email.server";
import { 
  Mail, 
  HelpCircle 
} from "lucide-react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return json({ shop: session.shop });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const question = formData.get("question") as string;

  try {
    // Create support ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        shopDomain: session.shop,
        name,
        email,
        question
      }
    });

    // Send notification email to support team
    await sendNotificationEmail({
      email: "support@your-domain.com",
      shopDomain: session.shop,
      subject: "New Support Ticket",
      htmlContent: `
        <h2>New Support Ticket</h2>
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Shop:</strong> ${session.shop}</p>
        <p><strong>Question:</strong></p>
        <p>${question}</p>
      `
    });

    return json({ success: true, ticket });
  } catch (error) {
    console.error("Failed to submit support ticket:", error);
    return json({ error: "Failed to submit support ticket" }, { status: 500 });
  }
};

export default function Help() {
  const { shop } = useLoaderData<typeof loader>();
  const submit = useSubmit();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = useCallback(() => {
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);
    formData.append("question", question);
    
    submit(formData, { method: "post" });
    setShowSuccess(true);
    // Reset form
    setName("");
    setEmail("");
    setQuestion("");
  }, [name, email, question, submit]);

  return (
    <Page 
      title="Help & Support" 
      subtitle="Get assistance and learn more about SEO Wizard features"
      divider
    >
      <Layout>
        {showSuccess && (
          <Layout.Section>
            <Banner
              title="Question submitted successfully"
              status="success"
              onDismiss={() => setShowSuccess(false)}
            >
              <p>We'll get back to you as soon as possible.</p>
            </Banner>
          </Layout.Section>
        )}

        <Layout.Section>
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
                  <Mail 
                    size={24}
                    style={{ color: 'var(--p-color-text-success)' }}
                  />
                </div>
                <BlockStack gap="100">
                  <Text variant="headingMd" as="h2">Contact Support</Text>
                  <Text variant="bodySm" tone="subdued">Have a question? We're here to help!</Text>
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
                    label="Your Name"
                    value={name}
                    onChange={setName}
                    autoComplete="name"
                    required
                  />
                </Box>

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
                    required
                  />
                </Box>

                <Box
                  background="bg-surface"
                  padding="400"
                  borderRadius="200"
                  shadow="100"
                >
                  <TextField
                    label="Your Question"
                    value={question}
                    onChange={setQuestion}
                    multiline
                    minHeight="200px"
                    required
                  />
                </Box>

                <Button 
                  primary 
                  onClick={handleSubmit}
                  loading={isSubmitting}
                  disabled={!name || !email || !question}
                  size="large"
                  fullWidth
                >
                  Submit Question
                </Button>
              </BlockStack>
            </BlockStack>
          </Box>
        </Layout.Section>

        <Layout.Section>
          <Box
            background="bg-surface-secondary"
            borderRadius="300"
            padding="600"
            shadow="200"
          >
            <BlockStack gap="600">
              <InlineStack gap="400" blockAlign="center">
                <div style={{ 
                  backgroundColor: 'var(--p-color-bg-info-subdued)',
                  padding: '16px',
                  borderRadius: '12px',
                  boxShadow: 'var(--p-shadow-100)'
                }}>
                  <HelpCircle 
                    size={24}
                    style={{ color: 'var(--p-color-text-info)' }}
                  />
                </div>
                <BlockStack gap="100">
                  <Text variant="headingMd" as="h2">Common Questions</Text>
                  <Text variant="bodySm" tone="subdued">Quick answers to frequently asked questions</Text>
                </BlockStack>
              </InlineStack>

              <BlockStack gap="500">
                {FAQs.map((faq, index) => (
                  <Box
                    key={index}
                    background="bg-surface"
                    padding="400"
                    borderRadius="200"
                    shadow="100"
                  >
                    <BlockStack gap="200">
                      <Text variant="headingSm" as="h3" fontWeight="medium">
                        {faq.question}
                      </Text>
                      <Text variant="bodyMd" tone="subdued" as="p">
                        {faq.answer}
                      </Text>
                    </BlockStack>
                  </Box>
                ))}
              </BlockStack>
            </BlockStack>
          </Box>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

const FAQs = [
  {
    question: "How do wildcard redirects work?",
    answer: "Wildcard redirects allow you to create flexible rules using * to match multiple URLs. For example, /old-blog/* can redirect all old blog URLs to their new location."
  },
  {
    question: "How often are notification emails sent?",
    answer: "You can customize your notification frequency to receive updates daily, weekly, or monthly based on your preferences in the Settings page."
  },
  {
    question: "What does the 404 analytics show?",
    answer: "The analytics dashboard provides insights into your most common broken links, traffic patterns, and trends over time to help you identify and fix critical issues."
  },
  {
    question: "Can I export the broken links data?",
    answer: "Yes, you can export your 404 error data as CSV files for further analysis or record keeping. Look for the export option in the analytics section."
  },
  {
    question: "What's the difference between exact and wildcard matches?",
    answer: "Exact matches redirect specific URLs, while wildcards (*) can match multiple similar URLs following a pattern, making them more flexible for handling groups of related URLs."
  }
]; 