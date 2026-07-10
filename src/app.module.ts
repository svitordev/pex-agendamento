import { Module } from '@nestjs/common';
import { ScheduleModule } from './schedule/schedule.module';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { AppointmentsModule } from './appointments/appointments.module';

@Module({
  imports: [ScheduleModule, UsersModule, OrdersModule, ProfessionalsModule, AppointmentsModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
