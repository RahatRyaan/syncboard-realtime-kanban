import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: client.Registry;

  public readonly httpRequestDuration: client.Histogram<string>;
  public readonly activeSocketConnections: client.Gauge<string>;
  public readonly httpErrorsTotal: client.Counter<string>;
  public readonly cardMovesTotal: client.Counter<string>;

  constructor() {
    this.registry = new client.Registry();
    this.registry.setDefaultLabels({ app: 'syncboard-api' });

    client.collectDefaultMetrics({ register: this.registry });

    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.activeSocketConnections = new client.Gauge({
      name: 'active_socket_connections',
      help: 'Number of active Socket.io WebSocket connections',
      registers: [this.registry],
    });

    this.httpErrorsTotal = new client.Counter({
      name: 'http_errors_total',
      help: 'Total count of HTTP error responses',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.cardMovesTotal = new client.Counter({
      name: 'card_moves_total',
      help: 'Total card move attempts and results',
      labelNames: ['status'],
      registers: [this.registry],
    });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
