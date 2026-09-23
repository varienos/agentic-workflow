# No unmeasured claims

Do not state a root cause, a numeric threshold, or that a fix works without a falsifiable measurement. Label anything unmeasured.

A claim is allowed only when a measurement could prove it false.

## Do not say

- "This is probably caused by X" with no measurement.
- "The threshold should be N" with no distribution.
- "This class of error is common" with no count.
- "This setting is unused" without reading the effective value.
- "This fix works" without a before and after measurement.
- "This affects users" with no affected count.

## Measurement

Look at both failing and succeeding cases. A property that appears in both does not explain the failure. If you propose a gate, say how many legitimate cases it would have blocked. If you cannot measure, do not soften the claim into "probably". Write:

```
Unmeasured — hypothesis: <sentence>. To verify: <measurement>.
```

Separate the report:

```
## Measured
- <result with numbers>

## Unmeasured
- <explicit list, or "none">
```
