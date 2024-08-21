# Use the official Node.js 20 image as base
FROM node:20

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install app dependencies
RUN npm install
RUN npm install nodemon -g

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3079

# Command to run the app
CMD ["nodemon", "app.js"]
