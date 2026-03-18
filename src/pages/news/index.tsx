import {
  Button,
  Card,
} from 'antd';
import {useState} from 'react';

function News() {
  const [count, setCount] = useState(0);

  return <div>
    <Card title="News">
      what the hell
      <br />
      look into the sky.
      <br />
      <Button type="primary" onClick={() => setCount(count + 1)}>click me, {count}</Button>
    </Card>
  </div>;
}

export default News;