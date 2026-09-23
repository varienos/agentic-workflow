# GitLab CI Module Detection

## Checks

- file_exists: .gitlab-ci.yml
- file_pattern: .gitlab/ci/*.yml | .gitlab/ci/*.yaml
- file_exists: .gitlab/ (directory)

## Minimum Match

2/3

## Activates

- rules/gitlab-ci-rules.skeleton.md

## Affects Core

- workflow-lifecycle: GitLab CI pipeline integration
- CLAUDE.md: GitLab CI best practice rules
