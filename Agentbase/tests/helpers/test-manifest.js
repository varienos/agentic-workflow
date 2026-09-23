'use strict';

module.exports = {
  project: {
    description: 'Hook test manifest',
    type: 'monorepo',
    language: 'en',
    structure: '../Codebase',
    subprojects: [
      {
        name: 'api',
        path: 'apps/api',
        role: 'Backend API',
        test_command: 'npm test',
        build_command: 'npm run build',
        modules: { orm: ['prisma'] },
      },
      {
        name: 'web',
        path: 'apps/web',
        role: 'Frontend',
        test_command: 'npm run test:web',
        build_command: 'npm run build:web',
        modules: {},
      },
    ],
    scripts: {
      test: 'npm test',
      build: 'npm run build',
    },
  },
  stack: {
    primary: 'Node.js',
    detected: ['TypeScript', 'React', 'Prisma'],
    orm: 'prisma',
    formatter: 'prettier',
    file_extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.md', '.yaml'],
    test_commands: {
      api: 'npm test',
      web: 'npm run test:web',
    },
  },
  modules: {
    active: {
      orm: ['prisma', 'eloquent', 'django-orm', 'typeorm'],
      backend: ['laravel', 'codeigniter4', 'django'],
      frontend: ['react'],
      api_docs: ['openapi'],
      monorepo: ['monorepo'],
    },
  },
  environments: [
    {
      name: 'production',
      url: 'https://api.example.test',
      health_check: 'https://api.example.test',
    },
  ],
};
