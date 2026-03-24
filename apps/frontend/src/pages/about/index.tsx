import React from 'react';
import {Typography} from 'antd';

const About: React.FC = () => {
  return (
    <div>
      <Typography.Title level={2}>About This Branch</Typography.Title>
      <Typography.Paragraph>
        This branch keeps the original React starter, then layers in a new full-stack architecture:
        Hono on the backend, MySQL for persistence, raw SQL through Drizzle, gateway nginx,
        Docker images based on Aliyun ACR mirrors, and Makefile-driven workflows for day-to-day operations.
      </Typography.Paragraph>
      <Typography.Paragraph>
        The container nginx only handles HTTP routing. SSL is intentionally left to the host machine nginx,
        which can forward requests into the stack without mixing certificate management into the application containers.
      </Typography.Paragraph>
    </div>
  );
};

export default About;
