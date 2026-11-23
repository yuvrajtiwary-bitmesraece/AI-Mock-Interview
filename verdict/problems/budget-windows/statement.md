# Budget Windows

Mira keeps track of her money one day at a time. For each of the last `n` days she wrote down that day's net change: a positive number if she saved money, a negative number if she spent more than she earned, and zero if she broke even.

A *window* is a run of one or more consecutive days. Given a target `k`, count the windows whose daily changes add up to exactly `k`.

## Input

The first line contains two integers `n` and `k`.

The second line contains `n` integers `a1 a2 … an`, the daily changes in order.

## Output

Print one integer: the number of pairs `(l, r)` with `1 ≤ l ≤ r ≤ n` such that `al + al+1 + … + ar = k`.

## Constraints

- `1 ≤ n ≤ 200000`
- `-1000 ≤ ai ≤ 1000`
- `-10^9 ≤ k ≤ 10^9`

The answer can be larger than `2^31 - 1`.

## Examples

Input:

```
5 3
1 2 -1 3 0
```

Output:

```
3
```

The windows are days 1–2 (`1 + 2`), day 4 (`3`) and days 4–5 (`3 + 0`).

Input:

```
4 0
0 0 0 0
```

Output:

```
10
```

Every one of the 10 windows adds up to 0.

Input:

```
3 -2
-1 -1 -1
```

Output:

```
2
```
