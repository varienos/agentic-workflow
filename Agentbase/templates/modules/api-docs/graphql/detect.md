# GraphQL Module Detection

## Checks

- file_exists: schema.graphql | schema.gql | *.graphql
- dependency: graphql | @apollo/server | apollo-server | type-graphql | @nestjs/graphql
- file_pattern: **/*.resolver.ts | **/*.resolver.js | **/resolvers/**

## Minimum Match

2/3

## Activates

- rules/graphql-rules.skeleton.md

## Affects Core

- code-review: Schema <-> resolver consistency check
- CLAUDE.md: GraphQL rules
