FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN npm run migrate

EXPOSE 3001

CMD ["npm", "start"]
