# Build stage
FROM node:20-alpine as build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build args
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_URL
ARG VITE_GEMINI_API_KEY

# Set env vars for build
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy the built files from the build stage to the Nginx html directory
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
