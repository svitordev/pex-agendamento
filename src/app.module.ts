import { Module } from '@nestjs/common';
import { ProfessionalsModule } from './professionals/professionals.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { PrismaModule } from './prisma/prisma.module';
import { ServicesModule } from './services/services.module';
import { AvailabilitiesModule } from './availabilities/availabilities.module';

@Module({
  imports: [
    PrismaModule,
    ProfessionalsModule,
    AppointmentsModule,
    ServicesModule,
    AvailabilitiesModule,
  ],
})
export class AppModule {}