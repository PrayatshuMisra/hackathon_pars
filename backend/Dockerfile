
# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
# libgl1-mesa-glx is often needed for cv2 (opencv) if used by dependencies,
# and build-essential for compiling some python packages.
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container at /app
COPY . .

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Run app.py using the PORT environment variable (default 8000)
CMD sh -c "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"
