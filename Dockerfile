FROM node:20-alpine AS frontend
WORKDIR /app/frontend

# Önce sadece package.json kopyala ve kur
COPY frontend/package.json ./
RUN rm -rf node_modules package-lock.json && \
    npm cache clean --force && \
    npm install --legacy-peer-deps && \
    npm install ajv@8.12.0 --save-dev --legacy-peer-deps

# Sonra tüm frontend dosyalarını kopyala
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install -r requirements.txt
COPY backend/ ./backend/
COPY --from=frontend /app/frontend/build ./frontend/build

EXPOSE 5000
CMD ["python", "backend/server.py"]
