/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // 循環依存の禁止（type-only import は除外）
    {
      name: 'no-circular',
      severity: 'error',
      comment: '循環依存は禁止です（型のみのインポートは除外）',
      from: {},
      to: {
        circular: true,
        dependencyTypesNot: ['type-only'],
      },
    },

    // ============================================================
    // BC 間依存ルール
    //
    // auth は全 BC から独立（双方向禁止）。
    // ドメイン BC は Customer-Supplier パターンで
    //   community ← event ← participation ← checkin
    // の方向（下流→上流）のみ許可し、逆方向（上流→下流）は禁止する。
    // ============================================================

    // auth は他 BC から独立（双方向禁止）
    {
      name: 'no-cross-context-auth-to-domain',
      severity: 'error',
      comment: 'auth はドメイン BC に依存できません。shared を経由してください',
      from: { path: '^src/auth/' },
      to: { path: '^src/(community|event|participation|checkin)/' },
    },
    {
      name: 'no-cross-context-domain-to-auth',
      severity: 'error',
      comment: 'ドメイン BC は auth に依存できません。shared を経由してください',
      from: { path: '^src/(community|event|participation|checkin)/' },
      to: { path: '^src/auth/' },
    },

    // community は上流 BC。下流 BC (event/participation/checkin) に依存できない
    {
      name: 'no-community-to-downstream',
      severity: 'error',
      comment: 'community は下流 BC (event/participation/checkin) に依存できません',
      from: { path: '^src/community/' },
      to: { path: '^src/(event|participation|checkin)/' },
    },

    // event は participation/checkin に依存できない（event は participation の上流）
    {
      name: 'no-event-to-downstream',
      severity: 'error',
      comment: 'event は下流 BC (participation/checkin) に依存できません',
      from: { path: '^src/event/' },
      to: { path: '^src/(participation|checkin)/' },
    },

    // participation は checkin に依存できない（participation は checkin の上流）
    {
      name: 'no-participation-to-checkin',
      severity: 'error',
      comment: 'participation は checkin に依存できません',
      from: { path: '^src/participation/' },
      to: { path: '^src/checkin/' },
    },

    // infrastructure から domain への依存禁止（依存性逆転の原則）
    {
      name: 'no-infra-to-domain',
      severity: 'error',
      comment: 'infrastructure は domain 層（usecases, models, repositories, services）に依存できません',
      from: {
        path: '^src/infrastructure/',
      },
      to: {
        path: '^src/(auth|community)/(usecases|models|repositories|services)/',
      },
    },

    // controllers から repositories への直接依存禁止
    {
      name: 'no-controller-to-repository',
      severity: 'error',
      comment: 'Controller は Repository に直接依存できません。UseCase を経由してください',
      from: {
        path: '/controllers/',
      },
      to: {
        path: '/repositories/',
      },
    },

    // controllers から services への直接依存禁止（composition 経由で注入すべき）
    {
      name: 'no-controller-to-service-impl',
      severity: 'error',
      comment: 'Controller は Service 実装に直接依存できません。composition 経由で注入してください',
      from: {
        path: '/controllers/',
      },
      to: {
        path: '/services/(bcrypt|jwt|prisma)',
      },
    },

    // models は他の層に依存しない（純粋なドメインモデル）
    {
      name: 'models-independence',
      severity: 'warn',
      comment: 'models は usecases, controllers, repositories, infrastructure に依存すべきではありません',
      from: {
        path: '/models/',
      },
      to: {
        path: '/(usecases|controllers|repositories|infrastructure)/',
      },
    },

    // Command は PrismaClient に直接依存禁止（Repository を経由すること）
    {
      name: 'no-prisma-in-commands',
      severity: 'error',
      comment: 'Command は PrismaClient に直接依存できません。Repository を経由してください',
      from: {
        path: '/usecases/commands/',
      },
      to: {
        path: '@prisma/client',
      },
    },

    // ソースコードからの相対パスによる node_modules 参照を禁止
    {
      name: 'no-relative-node-modules',
      severity: 'error',
      comment: 'node_modules への相対パスインポートは禁止です',
      from: {},
      to: {
        dependencyTypes: ['local'],
        path: 'node_modules',
      },
    },

    // テストファイルからのみテストユーティリティを使用
    {
      name: 'no-test-utils-in-production',
      severity: 'error',
      comment: 'テストユーティリティは本番コードでは使用できません',
      from: {
        pathNot: '\\.test\\.ts$',
      },
      to: {
        path: '(vitest|@testing-library|jest)',
      },
    },
  ],

  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
