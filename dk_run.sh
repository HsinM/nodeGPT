
docker run -d \
-p 3000:3000 \
-p 4500:4500 \
--restart always \
-v $(pwd)/.env:/app/.env \
-v $(pwd)/cert/:/app/cert/ \
--name node-gpt hsin/node-gpt
