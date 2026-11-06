import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { CertificatesController } from "./certificates/certificates.controller";
import { CertificadosService } from "./certificates/certificates.service";
import { AuditoriaService } from "./common/audit.service";
import { GuardaAcesso } from "./common/auth";
import { FiltroErros } from "./common/errors";
import { EscopoService } from "./common/scope.service";
import { DfeService } from "./fiscal/dfe.service";
import { FiscalController } from "./fiscal/fiscal.controller";
import { PainelController } from "./fiscal/painel.controller";
import { NfseService } from "./fiscal/nfse.service";
import { AgendadorService } from "./fiscal/scheduler.service";
import { HealthController } from "./health.controller";
import { AuthController, MeController } from "./identity/auth.controller";
import { UsersController } from "./identity/users.controller";
import { PrismaService } from "./prisma.service";

@Module({
  controllers: [HealthController, AuthController, MeController, UsersController, CertificatesController, FiscalController, PainelController],
  providers: [PrismaService, AuditoriaService, EscopoService, CertificadosService, NfseService, DfeService, AgendadorService,
    { provide: APP_GUARD, useClass: GuardaAcesso }, { provide: APP_FILTER, useClass: FiltroErros }],
})
export class AppModule {}
