import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// TODO: Add TypeOrmModule.forRootAsync once database entities are defined.
// Example:
//
// TypeOrmModule.forRootAsync({
//   imports: [ConfigModule],
//   inject: [ConfigService],
//   useFactory: (config: ConfigService) => ({
//     type: 'postgres',
//     url: config.get<string>('DATABASE_URL'),
//     autoLoadEntities: true,
//     synchronize: false, // use migrations in production
//   }),
// }),

@Module({
  imports: [
    // Loads .env and makes ConfigService available globally
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.example'],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
