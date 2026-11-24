FROM node:20-alpine

WORKDIR /app

# Install dependencies first (cached layer)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

EXPOSE 5173

# Bind to 0.0.0.0 so Docker can expose the port
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
