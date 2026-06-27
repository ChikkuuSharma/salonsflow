import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export abstract class BaseRepository<T, CreateDto, UpdateDto> {
  constructor(protected readonly prisma: PrismaService) {}

  abstract create(data: CreateDto): Promise<T>;
  abstract findAll(params: any): Promise<T[]>;
  abstract findOne(id: string): Promise<T | null>;
  abstract update(id: string, data: UpdateDto): Promise<T>;
  abstract remove(id: string): Promise<T>;
}
