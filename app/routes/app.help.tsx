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
  TextContainer
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { useState, useCallback } from "react";
import React from "react";
import { sendNotificationEmail } from "../services/email.server";

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
    <Page title="Help & Support">
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
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Contact Support</Text>
              <Text color="subdued">
                Have a question? We're here to help!
              </Text>
              
              <TextField
                label="Your Name"
                value={name}
                onChange={setName}
                autoComplete="name"
                required
              />

              <TextField
                label="Email Address"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                required
              />

              <TextField
                label="Your Question"
                value={question}
                onChange={setQuestion}
                multiline
                minHeight="200px"
                required
              />

              <Box>
                <Button 
                  primary 
                  onClick={handleSubmit}
                  loading={isSubmitting}
                  disabled={!name || !email || !question}
                >
                  Submit Question
                </Button>
              </Box>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Common Questions</Text>
              
              <Text as="h3" variant="headingSm">How do wildcard redirects work?</Text>
              <Text as="p">Wildcard redirects allow you to create flexible rules using * to match multiple URLs.</Text>
              
              <Text as="h3" variant="headingSm">How often are notification emails sent?</Text>
              <Text as="p">You can choose to receive notifications daily, weekly, or monthly.</Text>
              
              <Text as="h3" variant="headingSm">What does the 404 analytics show?</Text>
              <Text as="p">The analytics dashboard shows your most common broken links and trends over time, helping you identify and fix critical issues.</Text>
              
              <Text as="h3" variant="headingSm">Can I export the broken links data?</Text>
              <Text as="p">Yes, you can export your 404 error data as CSV files for further analysis or record keeping.</Text>
              
              <Text as="h3" variant="headingSm">How do I set up automatic redirects?</Text>
              <Text as="p">Navigate to the Settings page to enable automatic redirects for common misspellings and old URLs.</Text>
              
              <Text as="h3" variant="headingSm">What's the difference between exact and wildcard matches?</Text>
              <Text as="p">Exact matches redirect specific URLs, while wildcards (*) can match multiple similar URLs following a pattern.</Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 