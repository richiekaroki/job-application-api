# Load Testing with k6

## Setup

Install k6:
```bash
# macOS
brew install k6

# Windows
choco install k6

# Docker
docker pull grafana/k6
```

## Run Tests

### Basic load test
```bash
k6 run loadtest/load-test.js
```

### Against production
```bash
k6 run loadtest/load-test.js --env BASE_URL=https://your-api.com/api/v1
```

### With JSON output
```bash
k6 run --out json=loadtest/results.json loadtest/load-test.js
```

### Docker
```bash
docker run --rm -i grafana/k6 run - < loadtest/load-test.js
```

## Test Stages

| Stage | Duration | Users | Purpose |
|-------|----------|-------|---------|
| Ramp up | 30s | 0→20 | Gradual increase |
| Steady | 1m | 20 | Normal load |
| Spike | 30s | 20→50 | Peak load |
| Steady peak | 1m | 50 | sustained peak |
| Ramp down | 30s | 50→0 | Cool down |

## Thresholds

- 95% of requests under 500ms
- Error rate under 10%

## Metrics

- `http_duration` — Request latency
- `errors` — Failed requests
- Built-in: requests/s, data transfer, iterations
