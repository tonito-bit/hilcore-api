import { Module } from '@nestjs/common';
import { CostLibraryController } from './cost-library.controller';
import { CostLibraryService } from './cost-library.service';

@Module({
  controllers: [CostLibraryController],
  providers: [CostLibraryService],
  exports: [CostLibraryService],
})
export class CostLibraryModule {}
