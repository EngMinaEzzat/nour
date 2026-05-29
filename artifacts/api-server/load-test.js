import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 50 }, // ramp up to 50 users
    { duration: '20s', target: 50 }, // stay at 50 users
    { duration: '10s', target: 0 },  // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests should be below 200ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
  },
};

export default function () {
  // Simulate customer browsing
  const res = http.get('http://localhost:5000/api/storefront/1');
  
  check(res, {
    'status is 200 or 404': (r) => r.status === 200 || r.status === 404, // 404 is okay if seed data isn't there
  });
  
  sleep(1);
}
