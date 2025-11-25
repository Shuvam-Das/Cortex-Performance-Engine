# Stage 1: Build the React application
FROM node:18-alpine as builder

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve the static files with Nginx
FROM nginx:1.23-alpine

COPY --from=builder /app/build /usr/share/nginx/html

# Nginx will automatically serve the index.html file