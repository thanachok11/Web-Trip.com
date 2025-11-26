# 🎯 ใช้ Playwright + Chromium พร้อม dependencies
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

# ตั้ง working directory
WORKDIR /app

# Copy package.json / package-lock.json
COPY package*.json ./

# ติดตั้ง dependencies server
RUN npm install

# Copy source code
COPY . .

# เปิดพอร์ต 4000 สำหรับ Express
EXPOSE 4000

# Start Express API
CMD ["node", "index.js"]
