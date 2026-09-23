# Datadog Module Detection

## Checks

- dependency: dd-trace | @datadog/browser-rum | datadog-lambda-js
- file_exists: datadog.yaml | datadog.yml | dd-java-agent.jar
- env_var: DD_API_KEY | DD_TRACE_AGENT_URL | DD_ENV

## Minimum Match

2/3

## Activates

- rules/datadog-rules.skeleton.md

## Affects Core

- code-review: Tracing/span check is added
- CLAUDE.md: Datadog rules section is added
