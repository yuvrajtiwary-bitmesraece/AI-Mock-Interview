// Reference solution, O(n) expected time.
//
// With prefix sums P[0] = 0 and P[i] = a1 + ... + ai, the window (l, r) sums
// to k exactly when P[r] - P[l-1] = k. Walking left to right, count how many
// earlier prefix sums equal P[r] - k.
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long k;
    if (!(cin >> n >> k)) return 0;

    unordered_map<long long, long long> seen;
    seen.reserve(2 * n + 1);
    seen[0] = 1;

    long long prefix = 0, windows = 0;
    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;
        prefix += x;
        auto it = seen.find(prefix - k);
        if (it != seen.end()) windows += it->second;
        seen[prefix]++;
    }
    cout << windows << '\n';
    return 0;
}
