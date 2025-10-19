# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /code

# Copy the requirements file into the container
COPY ./requirements.txt /code/requirements.txt

# Install Python dependencies, including huggingface_hub for model download
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt && \
    pip install huggingface_hub

# Copy your application code and data into the container
COPY ./scripts /code/scripts
# COPY ./public/example-structuredDATA /code/public/example-structuredDATA

# --- Build Step ---
# Download the CLIP model and build the vector database during the image build
# This runs only once when Hugging Face builds your Space
RUN python -c "from huggingface_hub import snapshot_download; snapshot_download('openai/clip-vit-base-patch32', local_dir='./models/clip-vit-base-patch32')" 

# --- Copy Pre-built Database ---
# Copy the vector database files to built locally and pushed using Git LFS
COPY ./vector_database /code/vector_database

# Expose the port the app runs on (Hugging Face uses 7860 by default)
EXPOSE 7860

# --- Run Step ---
# This command starts your API server when the container launches
CMD ["uvicorn", "scripts.knowledge_api:app", "--host", "0.0.0.0", "--port", "7860"]