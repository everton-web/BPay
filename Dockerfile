# Estágio de Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependência
COPY package*.json ./

# Instalar todas as dependências (incluindo devDependencies para o build)
RUN npm ci

# Copiar o código fonte
COPY . .

# Executar o build (Vite + esbuild)
RUN npm run build

# Estágio de Execução
FROM node:20-alpine AS runner

WORKDIR /app

# Copiar arquivos de dependência para instalação de produção
COPY package*.json ./

# Instalar apenas dependências de produção
RUN npm ci --omit=dev

# Copiar os artefatos construídos do estágio anterior
COPY --from=builder /app/dist ./dist

# Expor a porta que a aplicação usa
EXPOSE 5000

# Definir variável de ambiente para produção
ENV NODE_ENV=production
ENV PORT=5000

# Comando para iniciar a aplicação
CMD ["npm", "run", "start"]
