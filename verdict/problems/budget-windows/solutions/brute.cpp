// Brute force, O(n^2): correct, but far too slow for n = 200000. The running
// sum is a dependency chain, so the compiler cannot vectorize the inner loop.
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long k;
    cin >> n >> k;
    vector<long long> a(n);
    for (auto &x : a) cin >> x;

    long long windows = 0;
    for (int l = 0; l < n; l++) {
        long long sum = 0;
        for (int r = l; r < n; r++) {
            sum += a[r];
            if (sum == k) windows++;
        }
    }
    cout << windows << '\n';
    return 0;
}
