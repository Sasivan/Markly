FROM python:3.11-slim

WORKDIR /app

COPY calculator.py test_calculator.py lambda_function.py ./

CMD ["python", "-m", "unittest", "test_calculator.py", "-v"]

