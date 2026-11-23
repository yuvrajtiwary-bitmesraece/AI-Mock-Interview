// The right algorithm with a 32-bit counter: passes the small samples, but
// the answer to the largest hidden test does not fit in an int.
#include <bits/stdc++.h>
using namespace std;
int main() {
    int n;
    long long k;
    cin >> n >> k;
    unordered_map<long long, int> seen{{0, 1}};
    long long prefix = 0;
    int windows = 0;
    for (int i = 0; i < n; i++) {
        long long x;
        cin >> x;
        prefix += x;
        windows += seen[prefix - k];
        seen[prefix]++;
    }
    cout << windows << '\n';
}
