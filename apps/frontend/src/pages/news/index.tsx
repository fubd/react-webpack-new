import React from 'react';
import {Alert, Card, Skeleton, Typography} from 'antd';

type NewsItem = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  body: string;
  publishedAt: string;
};

const News: React.FC = () => {
  const [items, setItems] = React.useState<NewsItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;

    const loadNews = async () => {
      try {
        const response = await fetch('/api/v1/news', {method: 'POST'});

        if (!response.ok) {
          throw new Error('Failed to load news from the backend.');
        }

        const payload = await response.json() as {items: NewsItem[]};

        if (!cancelled) {
          setItems(payload.items);
          setErrorMessage('');
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'Unknown request error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadNews();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <Skeleton active paragraph={{rows: 8}} />;
  }

  if (errorMessage) {
    return <Alert type="error" showIcon message={errorMessage} />;
  }

  return (
    <div style={{display: 'grid', gap: 20}}>
      <Typography.Title level={2} style={{marginBottom: 0}}>News now</Typography.Title>
      <Typography.Paragraph style={{marginTop: 0}}>
        These entries are coming from MySQL through the Hono API.11113z
      </Typography.Paragraph>
      {items.map((item) => (
        <Card key={item.id} title={item.title} extra={item.publishedAt}>
          <Typography.Paragraph>{item.summary}</Typography.Paragraph>
          <Typography.Paragraph type="secondary">{item.body}</Typography.Paragraph>
        </Card>
      ))}
    </div>
  );
};

export default News;
