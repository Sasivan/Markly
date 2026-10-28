"""
Unit tests for the Calculator app and Lambda handler.
"""
import json
import unittest
from calculator import add, subtract, multiply
from lambda_function import lambda_handler


class TestCalculator(unittest.TestCase):

    def test_add_success(self):
        self.assertEqual(add(10, 5), 15)
        self.assertEqual(add(1, 1), 2)
        self.assertEqual(add(999, 1), 1000)

    def test_subtract_success(self):
        self.assertEqual(subtract(10, 5), 5)
        self.assertEqual(subtract(5, 10), -5)
        self.assertEqual(subtract(7, 7), 0)

    def test_multiply_success(self):
        self.assertEqual(multiply(6, 7), 42)
        self.assertEqual(multiply(1, 100), 100)
        self.assertEqual(multiply(12, 12), 144)

    def test_zero_input_raises_error(self):
        with self.assertRaises(ValueError):
            add(0, 5)
        with self.assertRaises(ValueError):
            subtract(5, 0)
        with self.assertRaises(ValueError):
            multiply(0, 0)

    def test_negative_input_raises_error(self):
        with self.assertRaises(ValueError):
            add(-1, 5)
        with self.assertRaises(ValueError):
            subtract(10, -3)
        with self.assertRaises(ValueError):
            multiply(-4, -2)

    def test_invalid_types_raise_error(self):
        with self.assertRaises(ValueError):
            add(2.5, 3)  # Float
        with self.assertRaises(ValueError):
            subtract("5", 2)  # String
        with self.assertRaises(ValueError):
            multiply(True, 4)  # Boolean


class TestLambdaHandler(unittest.TestCase):

    def test_lambda_query_params_success(self):
        event = {
            "queryStringParameters": {
                "operation": "add",
                "a": "20",
                "b": "30"
            }
        }
        response = lambda_handler(event)
        self.assertEqual(response["statusCode"], 200)
        body = json.loads(response["body"])
        self.assertEqual(body["result"], 50)

    def test_lambda_json_body_success(self):
        event = {
            "body": json.dumps({
                "operation": "multiply",
                "a": 4,
                "b": 6
            })
        }
        response = lambda_handler(event)
        self.assertEqual(response["statusCode"], 200)
        body = json.loads(response["body"])
        self.assertEqual(body["result"], 24)

    def test_lambda_invalid_operation(self):
        event = {"queryStringParameters": {"operation": "divide", "a": "10", "b": "2"}}
        response = lambda_handler(event)
        self.assertEqual(response["statusCode"], 400)

    def test_lambda_negative_number_validation(self):
        event = {"queryStringParameters": {"operation": "add", "a": "-5", "b": "10"}}
        response = lambda_handler(event)
        self.assertEqual(response["statusCode"], 400)
        body = json.loads(response["body"])
        self.assertIn("positive integer", body["error"])


if __name__ == "__main__":
    unittest.main()

