// A C++ sample: macros, members, parameters, locals and globals.
#include <iostream>
#include <string>
#include <vector>
#define MAX_ORDERS 100
#define SQUARE(x) ((x) * (x))

namespace fili {
enum class Status { Pending, Shipped };
struct Line { int quantity; double price; };

template <typename T>
class Order {
public:
    explicit Order(std::string id) : id_(std::move(id)) {}
    void add(const T& line) { lines_.push_back(line); ++count; }
    static int count;
    Status status = Status::Pending;
private:
    std::string id_;
    std::vector<T> lines_;
};
template <typename T> int Order<T>::count = 0;
int g_limit = MAX_ORDERS;
double total(const Line& line, double tax) { return line.quantity * line.price * tax; }
}

int main() {
    fili::Order<fili::Line> order{"A-42"};
    order.add({SQUARE(2), 9.5});
    auto* raw = new int[3]{};
    delete[] raw;
    for (int i = 0; i < fili::g_limit; i++) if (i > 2) break;
    std::cout << "count: " << fili::Order<fili::Line>::count << '\n';
    return order.status == fili::Status::Shipped ? 0 : 0x1F;
}
