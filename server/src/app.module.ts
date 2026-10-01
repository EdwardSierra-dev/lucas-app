import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { LoansModule } from './loans/loans.module';
import { SharedBudgetsModule } from './shared-budgets/shared-budgets.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { ExpensesModule } from './expenses/expenses.module';
import { CategoriesModule } from './categories/categories.module';
import { MetricsModule } from './metrics/metrics.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    // Loads .env and makes ConfigService available globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('DATABASE_URL') ?? '';
        // Managed Postgres (Supabase, Neon, RDS, etc.) requires SSL. Enable it
        // when DB_SSL=true, or auto-detect common cloud hosts / sslmode=require.
        const sslFlag = config.get<string>('DB_SSL');
        const looksCloud =
          /supabase\.(co|com)|neon\.tech|render\.com|amazonaws\.com|sslmode=require/i.test(
            url,
          );
        const useSsl =
          sslFlag === 'true' || (sslFlag !== 'false' && looksCloud);
        // Schema bootstrap: when DB_SYNCHRONIZE=true, TypeORM creates/updates the
        // schema from the entities on boot (used for MVP/dev bring-up without the
        // Supabase CLI). Keep it false in production and rely on migrations.
        const synchronize = config.get<string>('DB_SYNCHRONIZE') === 'true';
        return {
          type: 'postgres' as const,
          url,
          autoLoadEntities: true,
          synchronize,
          ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
        };
      },
    }),
    // Enables @Cron scheduled jobs (payment reminders, vehicle expiry, monthly resets).
    ScheduleModule.forRoot(),
    UsersModule,
    MailModule,
    AuthModule,
    CategoriesModule,
    ExpensesModule,
    VehiclesModule,
    SharedBudgetsModule,
    LoansModule,
    MetricsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
