import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// ===== MIDDLEWARES =====
app.use(cors({
    origin: "*",
    methods: "GET,POST",
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use(express.static(__dirname)); // Serve index.html, script.js, etc.

// ===== CONFIG GEMINI =====
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

if (!GEMINI_API_KEY) {
    console.warn("⚠ ATENÇÃO: GEMINI_API_KEY NÃO FOI CONFIGURADA!");
}

// ===== ROTA PRINCIPAL (EVITA CANNOT GET /) =====
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// =========================================================
// ========== ROTA: GERAR ROADMAP ==========================
// =========================================================
app.post('/api/gerar-roadmap', async (req, res) => {
    const { objetivo } = req.body;

    console.log('📩 Requisição recebida:', objetivo);

    if (!objetivo) {
        return res.status(400).json({ error: 'Objetivo é obrigatório' });
    }

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY não configurada' });
    }

    const responseSchema = {
        type: "OBJECT",
        properties: {
            objetivo: { type: "STRING" },
            tempo_total_estimado: { type: "STRING" },
            etapas: {
                type: "ARRAY",
                items: {
                    type: "OBJECT",
                    properties: {
                        id: { type: "NUMBER" },
                        nome: { type: "STRING" },
                        descricao: { type: "STRING" },
                        tecnologias: {
                            type: "ARRAY",
                            items: {
                                type: "OBJECT",
                                properties: {
                                    nome: { type: "STRING" },
                                    descricao: { type: "STRING" },
                                    tempo_estimado: { type: "STRING" },
                                    importancia: { type: "STRING", enum: ["Essencial", "Importante", "Diferencial"] }
                                },
                                required: ["nome", "descricao", "tempo_estimado", "importancia"]
                            }
                        }
                    },
                    required: ["id", "nome", "descricao", "tecnologias"]
                }
            }
        },
        required: ["objetivo", "tempo_total_estimado", "etapas"]
    };

    const systemPrompt = `
        Você é um mentor de carreira tech sênior. Crie roadmaps completos e objetivos.
        Responda **apenas** em JSON válido seguindo EXATAMENTE o schema.
    `;

    const userPrompt = `
        Crie um roadmap completo para: "${objetivo}"
        - 3 a 5 etapas
        - 3 a 5 tecnologias por etapa
        - Ordem progressiva (do básico ao avançado)
        - Estimativas realistas
        - Classificação: Essencial, Importante, Diferencial
        Retorne APENAS JSON puro.
    `;

    const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            temperature: 1,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            responseSchema
        }
    };

    let retries = 3;

    while (retries > 0) {
        try {
            const response = await fetch(GEMINI_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(await response.text());
            }

            const data = await response.json();
            const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!jsonText) throw new Error("Resposta vazia da API");

            const roadmap = JSON.parse(jsonText);

            console.log("✅ Roadmap gerado!");
            return res.json(roadmap);

        } catch (error) {
            console.error("❌ Erro ao gerar roadmap:", error.message);
            retries--;

            if (retries === 0) {
                return res.status(500).json({
                    error: "Falha ao gerar roadmap",
                    details: error.message
                });
            }
        }
    }
});

// =========================================================
// ========== ROTA: GERAR DESAFIOS =========================
// =========================================================
app.post('/api/gerar-desafios', async (req, res) => {
    const { techName } = req.body;

    if (!techName) {
        return res.status(400).json({ error: 'techName é obrigatório' });
    }

    const prompt = `
        Crie 3 projetos práticos para quem está aprendendo ${techName}: iniciante, intermediário, avançado.
        Retorne APENAS JSON com:
        {
            "projetos": [
                { "nome": "", "descricao": "", "nivel": "" }
            ]
        }
    `;

    try {
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 1,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 4096,
                responseMimeType: "application/json"
            }
        };

        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!jsonText) {
            return res.status(500).json({ error: "Resposta vazia da API" });
        }

        res.json(JSON.parse(jsonText));

    } catch (error) {
        console.error("❌ Erro ao gerar desafios:", error.message);
        res.status(500).json({
            error: "Erro ao gerar desafios",
            details: error.message
        });
    }
});

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: "DevPath API está rodando"
    });
});

// ===== INICIAR SERVIDOR =====
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});
