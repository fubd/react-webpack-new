import React from 'react';
import {calc} from '@/utils';
import {Card} from 'antd';

function News() {
  return <div>
    <Card title="News">
      {calc(1,2)}
    </Card>
  </div>;
}
export default News;