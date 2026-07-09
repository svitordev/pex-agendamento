// src/orders/orders.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { StockService } from './stock.service';
import { CreateOrderDto } from './dto/create-order.dto'; // Importando o DTO

@Injectable()
export class OrdersService {
  // Injetando os serviços necessários via construtor
  constructor(
    private readonly productsService: ProductsService,
    private readonly stockService: StockService,
  ) {}

  createOrder(dto: CreateOrderDto) {
    // 1. Busca o produto usando o ID validado que veio no DTO
    const product = this.productsService.findOne(dto.productId);
    
    // 2. Se o produto não existir, lança uma exceção HTTP 404 (Not Found)
    if (!product) {
      throw new NotFoundException(`Produto com ID ${dto.productId} não foi encontrado.`);
    }

    // 3. Usa o serviço de estoque para garantir que há unidades disponíveis
    // Passamos a quantidade que também veio validada no DTO
    this.stockService.verifyAndReserveStock(product.name, product.stock, dto.quantity);

    // 4. Cria e retorna o pedido simulado com as informações processadas
    return {
      orderId: Math.floor(Math.random() * 10000),
      product: product.name,
      quantity: dto.quantity,
      total: product.price * dto.quantity,
      status: 'CONFIRMED',
      createdAt: new Date(),
    };
  }
}