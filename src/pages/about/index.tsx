import React from 'react';
import {Typography} from 'antd';
import {calc} from '@/utils';

const About: React.FC = () => {
  return (
    <div>
      <div>
        {calc(1, 2)}
      </div>
      <Typography.Title level={2}>About Us</Typography.Title>
      <Typography.Paragraph>
        This is the About page. Authentication and more features coming soon.
      </Typography.Paragraph>
    </div>
  );
};

export default About;
