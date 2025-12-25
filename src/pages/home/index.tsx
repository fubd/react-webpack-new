import React from 'react';
import {Button, Modal, Typography, Space, theme} from 'antd';
import {ThunderboltOutlined, SafetyCertificateOutlined, CloudServerOutlined} from '@ant-design/icons';
import './index.less';
import {calc} from '@/utils';

const {Title, Paragraph} = Typography;

const Home: React.FC = () => {
  const [open, setOpen] = React.useState(false);
  const {token} = theme.useToken();

  return (
    <div className="homeWrapper">
      {/* Hero Section */}
      {calc(2, 2)}
      <div className="hero">
        <h1 className="heroTitle">Build Faster with Dot</h1>
        <p className="heroSubtitle">
          The ultimate SaaS boilerplates for React developers. 
          Stop wasting time on setup and start shipping features today.
        </p>
        <Space size="middle">
          <Button type="primary" size="large" onClick={() => setOpen(true)}>
            Get Started
          </Button>
          <Button size="large">Documentation</Button>
        </Space>
      </div>

      {/* Feature Grid */}
      <div className="grid">
        <div className="card">
          <Space orientation="vertical" size="small">
            <ThunderboltOutlined style={{fontSize: '32px', color: token.colorPrimary}} />
            <Title level={4} style={{marginTop: 16}}>Lightning Fast</Title>
            <Paragraph type="secondary">
              Powered by Webpack 5 and the latest React 19, optimized for maximum performance.
            </Paragraph>
          </Space>
        </div>
        
        <div className="card">
          <Space orientation="vertical" size="small">
            <SafetyCertificateOutlined style={{fontSize: '32px', color: token.colorSuccess}} />
            <Title level={4} style={{marginTop: 16}}>Type Safe</Title>
            <Paragraph type="secondary">
              Written in 100% TypeScript with strict mode enabled for robust and reliable code.
            </Paragraph>
          </Space>
        </div>

        <div className="card">
          <Space orientation="vertical" size="small">
            <CloudServerOutlined style={{fontSize: '32px', color: token.colorInfo}} />
            <Title level={4} style={{marginTop: 16}}>Cloud Ready</Title>
            <Paragraph type="secondary">
              Designed for modern cloud deployments with Docker support and environment config.
            </Paragraph>
          </Space>
        </div>
      </div>

      <Modal 
        title="Welcome to Dot" 
        open={open} 
        onCancel={() => setOpen(false)}
        footer={[
          <Button key="back" onClick={() => setOpen(false)}>
            Close
          </Button>,
          <Button key="submit" type="primary" onClick={() => setOpen(false)}>
            Let&apos;s Go
          </Button>,
        ]}
      >
        <p>This is a demonstration of the new design system.</p>
        <p>Notice the refined typography, rounded corners, and consistent color palette.</p>
      </Modal>
    </div>
  );
};

export default Home;
