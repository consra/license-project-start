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
  Grid
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
    <Page title="404 Analytics">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Select
                label="Time Range"
                options={options}
                onChange={handleRangeChange}
                value={selectedRange}
              />
              
              <div style={{ height: '300px' }}>
                <Line 
                  data={lineChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      title: {
                        display: true,
                        text: '404 Errors Over Time'
                      }
                    }
                  }}
                />
              </div>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Text variant="headingMd" as="h2">Top 404 Paths</Text>
            <div style={{ height: '300px' }}>
              <Bar 
                data={barChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    title: {
                      display: true,
                      text: 'Most Common 404 Paths'
                    }
                  }
                }}
              />
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 