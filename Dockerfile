FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# Copy backend requirements to the build context
COPY backend/requirements.txt .

# Install Python backend dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy all files from the backend directory to the container
COPY backend/ .

# Hugging Face Spaces dynamically routes port 7860 by default
EXPOSE 7860

# Start ASGI FastAPI application
CMD ["uvicorn", "main:combined_app", "--host", "0.0.0.0", "--port", "7860"]
