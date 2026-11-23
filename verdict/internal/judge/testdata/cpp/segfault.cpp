// Writes through a null pointer. Both the pointer and the int it points to
// are volatile, so the optimizer can neither drop the store as dead nor
// replace it with a trap instruction: the write really happens.
int main() {
    volatile int *volatile p = nullptr;
    *p = 42;
    return 0;
}
