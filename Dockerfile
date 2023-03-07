FROM node:16
LABEL maintainer="hsinM"

ENV TZ=Asia/Taipei

WORKDIR /app

COPY ["package.json", "yarn.lock", "./"]

RUN yarn install --prod

COPY . ./

CMD [ "node", "app.js" ]
