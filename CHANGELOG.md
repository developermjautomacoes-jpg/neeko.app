# Changelog

Mudanças relevantes da Neeko Platform serão registradas aqui.

## [0.1.0] - Inicialização

- Criada documentação base do produto.
- Definida stack inicial TypeScript, Next.js, NestJS, PostgreSQL e Prisma.
- Definida arquitetura inicial de monólito modular.
- Documentados requisitos, domínios, multi-tenancy, segurança, integrações e roadmap.

## [Não lançado]

- Criados monorepo, API NestJS, web Next.js, PostgreSQL com Prisma e testes.
- Login e senha individuais, RBAC por organização e empresa, auditoria e gestão de usuários.
- Mensagens entre usuários com canal Geral, menções e notificações; cargo definido pelo administrador; controle de certificados com filtros e relatórios; ações das tabelas em ícones com dica.
- Empresas em Administração: cadastro e memorando na mesma tela. Mensagens com emoticons, grupos privados ou abertos e encaminhamento.
- Importação de pacotes desligada por padrão; volta com `OFFICE_IMPORT_ENABLED=true`.
- Administração com acesso total ao escritório, exceto excluir a proprietária.
- Exclusão de usuário e edição completa de nome, e-mail e cargo.
- Tema Marinho Clássico, de menu claro.
- Quatro temas por escritório: Verde Corporativo (padrão), Azul Tech, Roxo Premium e Dourado Elegante, no lugar das cores livres.
- A paleta do escritório passa a valer em todas as telas: fundos, menu, destaques, indicadores e gráficos.
- Paleta de cores por escritório, redefinição de senha por código no e-mail e importação de memorandos e certificados do app Facilitar.
- Links de acesso separados: `/login` para a Neeko e `/e/<slug>` personalizado para cada escritório.
- Exclusão de escritório com confirmação pelo nome e reinício da senha provisória do gestor.
- Gerencial de escritórios, planos e limites, com verificação em duas etapas opcional (ADR-007).
- Planos Piloto, Neeko Essencial, Neeko Profissional e Neeko Premium (CNPJs e usuários simultâneos), cliente piloto sem cobrança e perfil do escritório com logo no menu e nos relatórios.
- Memorando como cadastro único das empresas, com PDF, Word e histórico.
- Captura de NFS-e, NF-e e CT-e, certificados cifrados, Ciência da Operação, agendamento, Excel, XML e DANFSe (ADR-006).

- Consolidada a baseline da Fase 0 para stack, tenancy, identidade e autorização contextual.
- Registradas decisões ADR para identidade/empresa e RBAC inicial.
- Refinados critérios de saída da Fase 0 e aceite da Fase 1.
- Documentado o plano inicial de implementação e os gates pendentes antes do MVP.
