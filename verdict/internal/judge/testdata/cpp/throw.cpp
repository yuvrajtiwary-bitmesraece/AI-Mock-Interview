// An uncaught exception: std::terminate calls abort.
#include <stdexcept>
int main() { throw std::runtime_error("boom"); }
