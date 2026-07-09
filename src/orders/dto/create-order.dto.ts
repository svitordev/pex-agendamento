import { IsInt, IsPositive, Min } from 'class-validator';

export class CreateOrderDto {
  @IsInt({ message: 'O ID do produto deve ser um número inteiro.' })
  @IsPositive({ message: 'O ID do produto deve ser um número válido.' })
  productId: number;

  @IsInt({ message: 'A quantidade deve ser um número inteiro.' })
  @Min(1, { message: 'A quantidade mínima para um pedido é 1 unidade.' })
  quantity: number;
}