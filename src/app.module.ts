import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { LeadsModule } from './modules/leads/leads.module';
import { BudgetsModule } from './modules/budgets/budgets.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { AiModule } from './modules/ai/ai.module';
// ERP modules
import { BankingModule } from './modules/banking/banking.module';
import { AccountsReceivableModule } from './modules/accounts-receivable/accounts-receivable.module';
import { AccountsPayableModule } from './modules/accounts-payable/accounts-payable.module';
import { SubcontractorContractsModule } from './modules/subcontractor-contracts/subcontractor-contracts.module';
import { CashFlowModule } from './modules/cash-flow/cash-flow.module';
import { PurchasingModule } from './modules/purchasing/purchasing.module';
import { CostLibraryModule } from './modules/cost-library/cost-library.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    LeadsModule,
    BudgetsModule,
    EmployeesModule,
    InvoicesModule,
    ProcurementModule,
    AiModule,
    // ERP modules — Construcloud/Versato parity
    BankingModule,
    AccountsReceivableModule,
    AccountsPayableModule,
    SubcontractorContractsModule,
    CashFlowModule,
    PurchasingModule,
    CostLibraryModule,
  ],
})
export class AppModule {}
