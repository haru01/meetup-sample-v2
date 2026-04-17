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

    // 境界づけられたコンテキスト間の直接依存を禁止
    {
      name: 'no-cross-context-auth-to-community',
      severity: 'error',
      comment: 'auth と community は直接依存できません。shared を経由してください',
      from: {
        path: '^src/auth/',
      },
      to: {
        path: '^src/community/',
      },
    },
    {
      name: 'no-cross-context-community-to-auth',
      severity: 'error',
      comment: 'community と auth は直接依存できません。shared を経由してください',
      from: {
        path: '^src/community/',
      },
      to: {
        path: '^src/auth/',
      },
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
