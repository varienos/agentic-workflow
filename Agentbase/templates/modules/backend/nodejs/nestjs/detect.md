# NestJS Module Detection Rules

## Checks

- dependency: @nestjs/core|@nestjs/common
- file_exists: nest-cli.json|nest.json
- code_pattern: @Module()|@Controller()|@Injectable()

## Minimum Match

2/3

## Activates

- rules/nestjs-rules.skeleton.md

## Affects Core

- task-hunter: `test`, `lint`, and if present `test:e2e` conventions are expected
- CLAUDE.md: NestJS module/provider/controller rules are added
