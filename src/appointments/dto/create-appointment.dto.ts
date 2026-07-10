import { IsInt, IsDateString, IsString, IsNotEmpty } from "class-validator";
export class CreateAppointmentDto {
    @IsInt()
    professionalId: number; // No início, vai ser sempre o ID 1 (sua primeira manicure)

    @IsDateString() 
    dateTime: string; // ex: "2026-07-10T14:00:00.000Z"

    @IsString()
    @IsNotEmpty()
    clientName: string; // Enquanto não tem login, o cliente digita o nome/whatsapp
    clientWhats: string;
}