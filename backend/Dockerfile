FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Copy dependency requirements
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application code
COPY . .

# Hugging Face Spaces dynamically routes port 7860 by default
EXPOSE 7860

# Start ASGI FastAPI application
CMD ["uvicorn", "main:combined_app", "--host", "0.0.0.0", "--port", "7860"]
