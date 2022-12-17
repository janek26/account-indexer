FROM golang:latest

# Set the working directory
WORKDIR /app

# Copy the source code to the working directory
COPY . .

# Build the Go program
RUN go build -o main .

# Expose the port the server listens on
EXPOSE 8080

# Run the server
CMD ["./main"]
