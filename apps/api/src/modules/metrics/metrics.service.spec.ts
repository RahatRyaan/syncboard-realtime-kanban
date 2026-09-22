import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should collect and export prometheus metrics string', async () => {
    service.httpRequestDuration.labels('GET', '/api/v1/workspaces', '200').observe(0.05);
    service.activeSocketConnections.set(5);
    service.cardMovesTotal.labels('success').inc();

    const metrics = await service.getMetrics();
    expect(metrics).toContain('http_request_duration_seconds');
    expect(metrics).toContain('active_socket_connections');
    expect(metrics).toContain('card_moves_total');
  });
});
