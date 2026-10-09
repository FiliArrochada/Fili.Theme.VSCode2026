"""A Python sample: classes, decorators, type hints and f-strings."""
import re
from dataclasses import dataclass
from enum import Enum

MAX_ORDERS = 100
PATTERN = re.compile(r"^[A-Z]-\d+$")

class Status(Enum):
    PENDING = 1
    SHIPPED = 2

@dataclass
class Line:
    quantity: int
    price: float = 0.0

class Order:
    count: int = 0

    def __init__(self, order_id: str, lines: list[Line] | None = None) -> None:
        self.order_id = order_id
        self.lines = lines or []
        self.status = Status.PENDING
        Order.count += 1

    @property
    def total(self) -> float:
        return sum(l.quantity * l.price for l in self.lines if l.quantity > 0)

async def describe(order: Order) -> str | None:
    # Shipped orders without lines are an error.
    if order.status is Status.SHIPPED and not order.lines:
        raise ValueError(f"shipped {order.order_id!r}\n")
    return "pending" if PATTERN.match(order.order_id) else None
