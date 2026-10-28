"""
Minimal Python 3.x Calculator Module.
Supports add, subtract, and multiply for positive integers (> 0).
"""
import sys


def validate_positive_integer(value, name="Input"):
    """Validates that a value is a strictly positive integer (> 0)."""
    if not isinstance(value, int) or isinstance(value, bool):
        raise ValueError(f"{name} must be an integer, got {type(value).__name__}.")
    if value <= 0:
        raise ValueError(f"{name} must be a positive integer (> 0), got {value}.")
    return value


def add(a: int, b: int) -> int:
    """Adds two positive integers."""
    validate_positive_integer(a, "Argument 'a'")
    validate_positive_integer(b, "Argument 'b'")
    return a + b


def subtract(a: int, b: int) -> int:
    """Subtracts positive integer b from positive integer a."""
    validate_positive_integer(a, "Argument 'a'")
    validate_positive_integer(b, "Argument 'b'")
    return a - b


def multiply(a: int, b: int) -> int:
    """Multiplies two positive integers."""
    validate_positive_integer(a, "Argument 'a'")
    validate_positive_integer(b, "Argument 'b'")
    return a * b


def main():
    if len(sys.argv) < 4:
        print("Usage: python calculator.py <add|subtract|multiply> <a> <b>")
        sys.exit(1)

    op, a_str, b_str = sys.argv[1], sys.argv[2], sys.argv[3]
    try:
        a = int(a_str)
        b = int(b_str)
    except ValueError:
        print("Error: Operands must be integers.")
        sys.exit(1)

    operations = {
        "add": add,
        "subtract": subtract,
        "multiply": multiply,
    }

    if op not in operations:
        print(f"Error: Unknown operation '{op}'. Supported: add, subtract, multiply")
        sys.exit(1)

    try:
        result = operations[op](a, b)
        print(f"Result: {result}")
    except ValueError as err:
        print(f"Validation Error: {err}")
        sys.exit(1)


if __name__ == "__main__":
    main()

