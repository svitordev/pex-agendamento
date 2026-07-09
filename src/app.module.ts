import { Module } from '@nestjs/common';
import { ScheduleModule } from './schedule/schedule.module';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [ScheduleModule, UsersModule, OrdersModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
