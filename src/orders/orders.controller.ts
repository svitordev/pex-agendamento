import { Body, Controller, Post } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

  @Post()
  // 💡 Substituímos o tipo genérico pelo CreateOrderDto
  create(@Body() createOrderDto: CreateOrderDto) {
    // Repassa o DTO seguro e validado para o Service
    return this.ordersService.createOrder(createOrderDto);
  }
}
