# Base image
FROM node:10-alpine as build
# Prepare enviornament
RUN mkdir -p /opt/app
WORKDIR /opt/app
# Install packages
COPY package*.json ./
RUN npm install
# Install global dependencies
RUN npm install -g @angular/cli
# Copy source files
COPY . .
# Build production app
RUN npm run build:prod
# Switch to Nginx image
FROM nginx:1.9.15-alpine
# Install de app
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /opt/app/dist/browser /usr/share/nginx/html
EXPOSE 80
CMD [ "nginx", "-g", "daemon off;"]
