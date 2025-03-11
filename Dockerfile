FROM node:alpine
WORKDIR /app
COPY package*.json yarn.lock ./
RUN yarn install --silent
COPY . .
RUN ls -la
EXPOSE 5007
CMD ["yarn", "start"]
