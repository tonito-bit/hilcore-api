import { Module } from '@nestjs/common';
import { SubcontractorContractsController } from './subcontractor-contracts.controller';
import { SubcontractorContractsService } from './subcontractor-contracts.service';

@Module({
  controllers: [SubcontractorContractsController],
  providers: [SubcontractorContractsService],
  exports: [SubcontractorContractsService],
})
export class SubcontractorContractsModule {}
