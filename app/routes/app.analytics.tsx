import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { 
  Card, 
  Page, 
  Layout, 
  Select, 
  BlockStack,
  Text,
  Box,
  InlineStack,
  Button
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { prisma } from "../db.server";
import { useState, useCallback } from "react";
import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);
 
type TimeRange = "day" | "week" | "month";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);
  const url = new URL(request.url);
  const range = (url.searchParams.get("range") as TimeRange) || "week";
  const isTest = process.env.NODE_ENV !== 'production';
  const now = new Date();
  let startDate = new Date();

  // const billingCheck = await billing.check({
  //   plans: ["Premium"],
  //   isTest,
  // });

  const isPremium = true; //billingCheck.hasActivePayment || isTest;

  switch (range) {
    case "day":
      startDate.setDate(now.getDate() - 1);
      break;
    case "month":
      startDate.setMonth(now.getMonth() - 1);
      break;
    default: // week
      startDate.setDate(now.getDate() - 7);
  }

  const [dailyErrors, topPaths, totalRedirects, unfixedErrors, topReferrers] = isPremium 
  ? await Promise.all([
    // 404 Errors over time
    prisma.$queryRaw`
      SELECT DATE_TRUNC('day', "timestamp") AS day, COUNT(*)::integer AS count
      FROM not_found_errors
      WHERE "shop_domain" = ${session.shop}
        AND "timestamp" BETWEEN ${startDate} AND ${now}
      GROUP BY day
      ORDER BY day ASC;
    `,

    // Top Paths
    prisma.notFoundError.groupBy({
      by: ['path'],
      where: {
        shopDomain: session.shop,
        timestamp: {
          gte: startDate,
        },
      },
      _count: true,
      orderBy: [
        {
          path: 'desc'
        }
      ],
      take: 5,
    }),

    // Total Redirects in period
    prisma.redirect.count({
      where: { 
        shopDomain: session.shop,
        createdAt: {
          gte: startDate
        }
      }
    }),

    // Unfixed Errors in period
    prisma.notFoundError.count({
      where: {
        shopDomain: session.shop,
        redirected: false,
        timestamp: {
          gte: startDate
        }
      }
    }),

    // Top Referrers in period
    prisma.notFoundError.groupBy({
      by: ['userAgent'],
      where: { 
        shopDomain: session.shop,
        timestamp: {
          gte: startDate
        }
      },
      _count: true,
      orderBy: [
        {
          userAgent: 'desc'
        }
      ],
      take: 3
    })
  ]):[
    [],
    [],
    0,
    [],
    []
  ];

  const totalErrors = dailyErrors.reduce((sum, error) => sum + error.count, 0);
  const avgDaily = Math.round(totalErrors / (range === 'day' ? 1 : range === 'week' ? 7 : 30));

  return json({
    dailyErrors,
    topPaths,
    range,
    isPremium,
    additionalMetrics: {
      totalRedirects,
      totalErrors,
      avgDaily,
      unfixedErrors,
      topReferrers
    }
  });
};

export default function Analytics() {
  const { dailyErrors, topPaths, range, isPremium, additionalMetrics } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [selectedRange, setSelectedRange] = useState(range);
  const [isExporting, setIsExporting] = useState(false);

  const handleRangeChange = useCallback((value: string) => {
    setSelectedRange(value as TimeRange);
    navigate(`/app/analytics?range=${value}`);
  }, [navigate]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    
    try {
      const response = await fetch(`/api/analytics/export?range=${selectedRange}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Failed to export 404 routes');
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a link element to trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.download = `404-errors-${selectedRange}.xlsx`; 
      
      // Append to the document and click
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
        setIsExporting(false);
      }, 1000);
    } catch (error) {
      console.error('Error downloading file:', error);
      setIsExporting(false);
      // Show some error message to the user
      alert('Failed to download 404 data. Please try again.');
    }
  }, [selectedRange]);

  const lineChartData = isPremium ? {
    labels: dailyErrors.map(error => 
      new Date(error.day).toLocaleDateString()
    ),
    datasets: [
      {
        label: '404 Errors',
        data: dailyErrors.map(error => error.count),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  }: {};

  const barChartData = isPremium ? {
    labels: topPaths.map(path => path.path),
    datasets: [
      {
        label: 'Error Count',
        data: topPaths.map(path => path._count),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
    ],
  }: {};

  if (!isPremium) {
    return (
      <Page title="Analytics Dashboard" subtitle="Track and analyze your store's 404 errors and redirects">
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="600">
                <BlockStack gap="600">
                  {/* Hero Section */}
                  <Box
                    background="bg-surface-success-subdued"
                    borderRadius="300"
                    padding="600"
                    borderWidth="025"
                    borderColor="border-success"
                  >
                    <BlockStack gap="400" align="center">
                      <div style={{ 
                        backgroundColor: 'var(--p-color-bg-success)',
                        padding: '20px',
                        borderRadius: '50%',
                        display: 'inline-flex',
                        boxShadow: 'var(--p-shadow-200)'
                      }}>
                        {/* <Icon source={NotificationIcon} tone="success" size="large" /> */}
                      </div>
                      <BlockStack gap="200" align="center">
                        <Text variant="headingLg" as="h2">Advanced Analytics</Text>
                        <Text variant="bodyMd" as="p" alignment="center">
                          Get detailed insights into your store's broken links and redirects
                        </Text>
                      </BlockStack>
                    </BlockStack>
                  </Box>

                  {/* Analytics Preview */}
                  <BlockStack gap="400">
                    <Text variant="headingMd" as="h3" alignment="center">Premium Analytics Features</Text>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                      gap: '16px' 
                    }}>
                      {[
                        {
                          icon: "✨",
                          title: "Wildcard Patterns",
                          description: "Create flexible redirect rules using * wildcards"
                        },
                        {
                          icon: "📊",
                          title: "Advanced Analytics",
                          description: "Track and analyze redirect performance"
                        },
                        {
                          icon: "🚀",
                          title: "Priority Support",
                          description: "Get help when you need it"
                        }
                      ].map(feature => (
                        <Box
                          key={feature.title}
                          background="bg-surface-secondary"
                          padding="400"
                          borderRadius="200"
                          shadow="100"
                        >
                          <BlockStack gap="300">
                            <Text variant="headingMd" as="h4">
                              {feature.icon} {feature.title}
                            </Text>
                            <Text variant="bodyMd" tone="subdued">
                              {feature.description}
                            </Text>
                          </BlockStack>
                        </Box>
                      ))}
                    </div>
                  </BlockStack>

                  {/* CTA */}
                  <Box padding="500" alignment="center">
                    <BlockStack gap="300" align="center">
                      <Button
                        variant="primary"
                        tone="success"
                        url="/app/billing"
                        size="large"
                      >
                        Upgrade to Premium - $2.99/month
                      </Button>
                      <Text variant="bodySm" tone="subdued">
                        Includes 3-day free trial. Cancel anytime.
                      </Text>
                    </BlockStack>
                  </Box>
                </BlockStack>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page 
      title="404 Analytics Dashboard" 
      subtitle="Monitor and analyze your store's broken links and redirects performance"
      divider
      primaryAction={
        <InlineStack gap="300">
          <Button
            variant="primary"
            onClick={handleExport}
            loading={isExporting}
          >
            📊 Export 404 routes to Excel
          </Button>
          <Box minWidth="200px">
            <Select
              label="Time Range"
              labelInline
              options={[
                { label: 'Last 24 Hours', value: 'day' },
                { label: 'Last 7 Days', value: 'week' },
                { label: 'Last 30 Days', value: 'month' },
              ]}
              onChange={handleRangeChange}
              value={selectedRange}
            />
          </Box>
        </InlineStack>
      }
    >
      <Layout>
        <Layout.Section>

            <Box padding="500">
              <BlockStack gap="500">
                <InlineStack gap="500" wrap={false}>
                  {/* Total 404s Card */}
                  <Box 
                    padding="400" 
                    borderRadius="300"
                    shadow="200"
                    width="100%"
                    background="bg-surface-secondary"
                    borderWidth="025"
                    borderColor="border-critical"
                  >
                    <BlockStack gap="300" align="center">
                      <Text variant="headingSm" as="h3">Total 404s</Text>
                      <div style={{ 
                        backgroundColor: 'var(--p-color-bg-critical-subdued)',
                        padding: '16px',
                        borderRadius: '12px',
                        width: '100%',
                        textAlign: 'center'
                      }}>
                        <Text variant="heading2xl" as="p" fontWeight="bold">
                          {additionalMetrics?.totalErrors || 0}
                        </Text>
                      </div>
                      <Text variant="bodySm" tone="subdued">
                        Total broken links in selected period
                      </Text>
                    </BlockStack>
                  </Box>

                  {/* Active Redirects Card */}
                  <Box 
                    padding="400" 
                    borderRadius="300"
                    shadow="200"
                    width="100%"
                    background="bg-surface-secondary"
                    borderWidth="025"
                    borderColor="border-info"
                  >
                    <BlockStack gap="300" align="center">
                      <Text variant="headingSm" as="h3">Active Simple Redirects</Text>
                      <div style={{ 
                        backgroundColor: 'var(--p-color-bg-info-subdued)',
                        padding: '16px',
                        borderRadius: '12px',
                        width: '100%',
                        textAlign: 'center'
                      }}>
                        <Text variant="heading2xl" as="p" fontWeight="bold">
                          {additionalMetrics.totalRedirects}
                        </Text>
                      </div>
                      <Text variant="bodySm" tone="subdued">
                        Redirects added in the selected period
                      </Text>
                    </BlockStack>
                  </Box>

                  {/* Top Sources Card */}
                  <Box 
                    padding="400" 
                    borderRadius="300"
                    shadow="200"
                    width="100%"
                    background="bg-surface-secondary"
                    borderWidth="025"
                    borderColor="border-warning"
                  >
                    <BlockStack gap="300">
                      <Text variant="headingSm" as="h3" alignment="center">Top User</Text>
                      <BlockStack gap="200">
                        {additionalMetrics.topReferrers.map((ref, index) => (
                          <Box
                            key={ref.userAgent || 'direct'}
                            background="bg-surface"
                            padding="300"
                            borderRadius="200"
                            shadow="100"
                          >
                            <InlineStack align="space-between">
                              <Text variant="bodyMd" fontWeight="medium">
                                {ref.userAgent?.split(' ')[0].slice(0, 20) || 'Direct'}
                              </Text>
                              <Text variant="bodyMd" tone="subdued">
                                {ref._count}
                              </Text>
                            </InlineStack>
                          </Box>
                        ))}
                      </BlockStack>
                    </BlockStack>
                  </Box>
                </InlineStack>
              </BlockStack>
            </Box>
        </Layout.Section>

        {/* Time Series Chart */}
        <Layout.Section>
          <Card>
            <Box padding="500">
              <BlockStack gap="500">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="200">
                    <InlineStack gap="200" align="left">
                      <Text variant="headingMd" as="h2">404 Errors Over Time</Text>
                    </InlineStack>
                    <Text variant="bodySm" tone="subdued">
                      Track and analyze error patterns over different time periods
                    </Text>
                  </BlockStack>
                </InlineStack>
                
                <Box 
                  background="bg-surface-secondary" 
                  padding="600" 
                  borderRadius="300"
                  borderWidth="025"
                  borderColor="border-subdued"
                  shadow="100"
                >
                  <div style={{ height: '350px' }}>
                    <Line 
                      data={{
                        ...lineChartData,
                        datasets: [{
                          ...lineChartData.datasets[0],
                          borderColor: 'var(--p-color-text-success)',
                          backgroundColor: 'var(--p-color-bg-success-subdued)',
                          fill: true,
                          borderWidth: 2,
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              precision: 0
                            },
                            grid: {
                              color: 'var(--p-color-border-subdued)'
                            }
                          },
                          x: {
                            grid: {
                              color: 'var(--p-color-border-subdued)'
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </Box>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>

        {/* Top Paths Chart */}
        <Layout.Section>
          <Card>
            <Box padding="500">
              <BlockStack gap="500">
                <BlockStack gap="200">
                  <InlineStack gap="200" align="start">
                    <Text variant="headingMd" as="h2">Most Common 404 Paths</Text>
                  </InlineStack>
                  <Text variant="bodySm" tone="subdued">
                    Identify frequently occurring broken links
                  </Text>
                </BlockStack>
                
                <Box 
                  background="bg-surface-secondary" 
                  padding="600" 
                  borderRadius="300"
                  borderWidth="025"
                  borderColor="border-subdued"
                  shadow="100"
                >
                  <div style={{ height: '350px' }}>
                    <Bar 
                      data={{
                        ...barChartData,
                        datasets: [{
                          ...barChartData?.datasets[0] ?? [],
                          backgroundColor: 'var(--p-color-bg-info)',
                          borderRadius: 6,
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y' as const,
                        plugins: {
                          legend: {
                            display: false
                          }
                        },
                        scales: {
                          x: {
                            beginAtZero: true,
                            ticks: {
                              precision: 0
                            },
                            grid: {
                              color: 'var(--p-color-border-subdued)'
                            }
                          },
                          y: {
                            grid: {
                              display: false
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </Box>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 