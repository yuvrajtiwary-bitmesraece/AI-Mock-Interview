// Integer division by zero: SIGFPE on x86-64. On arm64 the hardware returns
// 0 instead of trapping, so this prints 0.
#include <iostream>
int main() {
    volatile int zero = 0;
    int n;
    std::cin >> n;
    std::cout << n / zero << '\n';
}
