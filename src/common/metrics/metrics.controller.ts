import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { MetricsService } from './metrics.service';

@ApiTags('metrics')
@Controller('metrics')
@ApiExcludeController()
@SkipThrottle()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  async getMetrics(@Res() res: Response) {
    const metrics = await this.metricsService.getMetrics();
    const contentType = this.metricsService.getContentType();
    res.setHeader('Content-Type', contentType);
    res.send(metrics);
  }
}
