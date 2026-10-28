"""
AWS Lambda Handler for Calculator API.
"""
import json
import calculator


def lambda_handler(event, context=None):
    """Handles API Gateway HTTP request or direct Lambda invocation."""
    try:
        # Check query string params or JSON body or root event
        params = {}
        if isinstance(event, dict):
            if "queryStringParameters" in event and event["queryStringParameters"]:
                params.update(event["queryStringParameters"])
            elif "body" in event and event["body"]:
                try:
                    body_data = json.loads(event["body"]) if isinstance(event["body"], str) else event["body"]
                    if isinstance(body_data, dict):
                        params.update(body_data)
                except Exception:
                    pass
            else:
                params.update(event)

        op = params.get("operation") or params.get("op")
        a_raw = params.get("a")
        b_raw = params.get("b")

        if not op or a_raw is None or b_raw is None:
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "Missing parameters. Required: op (or operation), a, b."})
            }

        # Parse integer inputs
        try:
            a = int(a_raw)
            b = int(b_raw)
        except (ValueError, TypeError):
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "Inputs 'a' and 'b' must be integers."})
            }

        operations = {
            "add": calculator.add,
            "subtract": calculator.subtract,
            "multiply": calculator.multiply,
        }

        if op not in operations:
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": f"Invalid operation '{op}'. Supported: add, subtract, multiply."})
            }

        result = operations[op](a, b)

        return {
            "statusCode": 200,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({
                "operation": op,
                "a": a,
                "b": b,
                "result": result
            })
        }

    except ValueError as val_err:
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": str(val_err)})
        }
    except Exception as exc:
        return {
            "statusCode": 500,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps({"error": f"Internal Server Error: {str(exc)}"})
        }

