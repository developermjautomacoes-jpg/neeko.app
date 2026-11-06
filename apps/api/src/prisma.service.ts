import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { config } from "./config";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() { super({ adapter: new PrismaPg({ connectionString: config().DATABASE_URL }) }); }
  async onModuleDestroy() { await this.$disconnect(); }
}
