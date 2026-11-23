// Never finishes.
int main() {
    volatile unsigned long spins = 0;
    for (;;) spins++;
}
