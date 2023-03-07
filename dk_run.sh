
docker run -d \
-p 3000:3000 \
-p 5800:5800 \
--restart always \
-v $(pwd)/.env:/app/.env \
-v $(pwd)/cert/:/app/cert/ \
--name node-gpt hsin/node-gpt
