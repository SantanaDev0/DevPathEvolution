# DevPath Evolution 🚀

Gerador de Roadmaps de Carreira Tech com IA Gemini

## 📁 Estrutura do Projeto (Simplificada)

```
Projeto_Final-ALURA/
├── .env                    # Chave da API Gemini
├── .gitignore             # Arquivos ignorados pelo Git
├── package.json           # Dependências do projeto
├── server.js              # ⭐ Servidor backend (ÚNICO)
├── index.html             # Interface do usuário
├── style.css              # Estilos da aplicação
├── script.js              # Lógica do frontend
├── README.md              # Este arquivo
└── data/                  # Dados da aplicação
    ├── baseDeConhecimento.json
    └── conquistas.json
```

## 🎯 Arquitetura Simplificada

### Backend (server.js)
- **1 arquivo único** que faz tudo
- Serve arquivos estáticos (HTML, CSS, JS)
- API REST com 1 endpoint principal: `/api/gerar-roadmap`
- Comunicação direta com Gemini via fetch

### Frontend (index.html + script.js + style.css)
- Interface moderna e responsiva
- Sistema de gamificação (XP, Levels, Achievements)
- Persistência local (localStorage)
- Comunicação com backend via fetch

## 🚀 Como Rodar

1. **Instalar dependências:**
```bash
npm install
```

2. **Configurar chave da API:**
Crie um arquivo `.env` na raiz:
```env
GEMINI_API_KEY="sua_chave_aqui"
```

3. **Iniciar servidor:**
```bash
npm start
```

4. **Acessar aplicação:**
```
http://localhost:3001
```

## 📊 Fluxo de Dados

```
[Frontend] → POST /api/gerar-roadmap → [server.js] → [Gemini API]
                                            ↓
[Frontend] ← JSON com roadmap ← [server.js] ← [Resposta]
```

## ✨ Funcionalidades

- ✅ Geração de roadmaps personalizados com IA
- ✅ Sistema de progresso e gamificação
- ✅ Conquistas desbloqueáveis
- ✅ Persistência de dados local
- ✅ Interface moderna e responsiva

## 🔧 Tecnologias

- **Backend:** Node.js + Express
- **Frontend:** HTML5 + CSS3 + JavaScript (Vanilla)
- **IA:** Google Gemini API
- **Estilo:** CSS moderno com glassmorphism

## 📝 Notas

- **Sem frameworks frontend** (requisito do projeto Alura)
- **Arquitetura simples e direta**
- **Código limpo e bem documentado**
- **Fácil de entender e manter**

## 🎓 Projeto Alura

Este projeto foi desenvolvido com a ajuda da Imersão Dev com Alura e Google.


LINK PARA ACESSAR O PROJETO -> https://devpathevolution.onrender.com/
