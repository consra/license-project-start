import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { 
  Card, 
  Page, 
  Layout, 
  Select, 
  DatePicker,
  Button,
  BlockStack,
  Text,
  Banner,
  Grid,
  Box,
  Icon,
  InlineStack
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
import { 
  BarcodeIcon, 
  ChartLineIcon,
  AlertDiamondIcon,
} from "@shopify/polaris-icons";
import { BarChartIcon } from "lucide-react";

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
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const range = (url.searchParams.get("range") as TimeRange) || "week";

  const now = new Date();
  let startDate = new Date();

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

  const errors = await prisma.notFoundError.groupBy({
    by: ['timestamp'],
    where: {
      shopDomain: session.shop,
      timestamp: {
        gte: startDate,
        lte: now,
      },
    },
    _count: true,
    orderBy: {
      timestamp: 'asc',
    },
  });

  const topPaths = await prisma.notFoundError.groupBy({
    by: ['path'],
    where: {
      shopDomain: session.shop,
      timestamp: {
        gte: startDate,
      },
    },
    _count: true,
    orderBy: {
      _count: {
        path: 'desc'
      }
    },
    take: 5,
  });

  return json({
    errors,
    topPaths,
    range,
  });
};

export default function Analytics() {
  const { errors, topPaths, range } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [selectedRange, setSelectedRange] = useState(range);

  const handleRangeChange = useCallback((value: string) => {
    setSelectedRange(value as TimeRange);
    navigate(`/app/analytics?range=${value}`);
  }, [navigate]);

  const options = [
    { label: 'Last 24 Hours', value: 'day' },
    { label: 'Last Week', value: 'week' },
    { label: 'Last Month', value: 'month' },
  ];

  const lineChartData = {
    labels: errors.map(error => 
      new Date(error.timestamp).toLocaleDateString()
    ),
    datasets: [
      {
        label: '404 Errors',
        data: errors.map(error => error._count),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  };

  const barChartData = {
    labels: topPaths.map(path => path.path),
    datasets: [
      {
        label: 'Error Count',
        data: topPaths.map(path => path._count),
        backgroundColor: 'rgba(75, 192, 192, 0.5)',
      },
    ],
  };

  return (
    <Page 
      title="404 Analytics" 
      subtitle="Track and analyze your store's broken links and redirects"
      divider
    >
      <Layout>
        {/* Metrics Overview */}
        <Layout.Section>
          <BlockStack gap="400">
            <InlineStack gap="400" wrap={false}>
              <Card>
                <Box padding="400">
                  <BlockStack gap="200" align="center">
                    <Icon source={BarChartIcon} tone="success" />
                    <Text variant="headingMd" as="h3">Total 404s</Text>
                    <Text variant="headingLg" as="p">
                      {errors.reduce((sum, error) => sum + error._count, 0)}
                    </Text>
                  </BlockStack>
                </Box>
              </Card>
              <Card>
                <Box padding="400">
                  <BlockStack gap="200" align="center">
                    {/* <Icon source={TimelineIcon} tone="success" /> */}
                    <Text variant="headingMd" as="h3">Average Daily</Text>
                    <Text variant="headingLg" as="p">
                      {Math.round(errors.reduce((sum, error) => sum + error._count, 0) / errors.length)}
                    </Text>
                  </BlockStack>
                </Box>
              </Card>
              <Card>
                <Box padding="400">
                  <BlockStack gap="200" align="center">
                    <Icon source={AlertDiamondIcon} tone="warning" />
                    <Text variant="headingMd" as="h3">Peak Errors</Text>
                    <Text variant="headingLg" as="p">
                      {Math.max(...errors.map(error => error._count))}
                    </Text>
                  </BlockStack>
                </Box>
              </Card>
            </InlineStack>
          </BlockStack>
        </Layout.Section>

        {/* Time Series Chart */}
        <Layout.Section>
          <Card>
            <Box padding="500">
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <BlockStack gap="200">
                    <Text variant="headingMd" as="h2">404 Errors Over Time</Text>
                    <Text variant="bodySm" tone="subdued">
                      Track error frequency patterns
                    </Text>
                  </BlockStack>
                  <Select
                    label="Time Range"
                    labelInline
                    options={options}
                    onChange={handleRangeChange}
                    value={selectedRange}
                  />
                </InlineStack>
                
                <Box 
                  background="bg-surface-secondary" 
                  padding="400" 
                  borderRadius="200"
                >
                  <div style={{ height: '300px' }}>
                    <Line 
                      data={lineChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top' as const,
                          },
                          title: {
                            display: false
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              precision: 0
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
              <BlockStack gap="400">
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h2">Most Common 404 Paths</Text>
                  <Text variant="bodySm" tone="subdued">
                    Top paths generating errors
                  </Text>
                </BlockStack>
                
                <Box 
                  background="bg-surface-secondary" 
                  padding="400" 
                  borderRadius="200"
                >
                  <div style={{ height: '300px' }}>
                    <Bar 
                      data={barChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y' as const,
                        plugins: {
                          legend: {
                            display: false
                          },
                          title: {
                            display: false
                          }
                        },
                        scales: {
                          x: {
                            beginAtZero: true,
                            ticks: {
                              precision: 0
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