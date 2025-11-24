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

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Configuração da API Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`; 

// ========== ROTA: GERAR ROADMAP ==========
app.post('/api/gerar-roadmap', async (req, res) => {
    const { objetivo } = req.body;

    console.log('� Requisição recebida:', objetivo);

    if (!objetivo) {
        return res.status(400).json({ error: 'Objetivo é obrigatório' });
    }

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY não configurada' });
    }

    // Schema JSON para forçar o formato correto da resposta
    const responseSchema = {
        type: "OBJECT",
        properties: {
            "objetivo": { 
                "type": "STRING", 
                "description": "O objetivo do roadmap" 
            },
            "tempo_total_estimado": { 
                "type": "STRING", 
                "description": "Tempo total estimado (ex: '6-8 meses')" 
            },
            "etapas": {
                "type": "ARRAY",
                "description": "Array de etapas do roadmap",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "id": { 
                            "type": "NUMBER", 
                            "description": "ID sequencial da etapa" 
                        },
                        "nome": { 
                            "type": "STRING", 
                            "description": "Nome da etapa" 
                        },
                        "descricao": { 
                            "type": "STRING", 
                            "description": "Descrição breve da etapa" 
                        },
                        "tecnologias": {
                            "type": "ARRAY",
                            "description": "Array de tecnologias da etapa",
                            "items": {
                                "type": "OBJECT",
                                "properties": {
                                    "nome": { 
                                        "type": "STRING", 
                                        "description": "Nome da tecnologia" 
                                    },
                                    "descricao": { 
                                        "type": "STRING", 
                                        "description": "Por que aprender esta tecnologia" 
                                    },
                                    "tempo_estimado": { 
                                        "type": "STRING", 
                                        "description": "Tempo estimado (ex: '2 semanas')" 
                                    },
                                                                         "importancia": { 
                                                                            "type": "STRING", 
                                                                            "description": "Nível de importância",
                                                                            "enum": ["Essencial", "Importante", "Diferencial"]
                                                                        },
                                                                    },
                                                                    "required": ["nome", "descricao", "tempo_estimado", "importancia"]
                                                                }
                                                            }
                                                        },
                                                        "required": ["id", "nome", "descricao", "tecnologias"]
                                                    }
                                                }
                                            },
                                            "required": ["objetivo", "tempo_total_estimado", "etapas"]
                                        };
                                    
                                        try {
                                            const systemPrompt = `Você é um mentor de carreira tech sênior. Sua tarefa é criar roadmaps de estudos completos, práticos e progressivos para objetivos de carreira em tecnologia. Responda sempre com o JSON completo e válido, sem truncar a resposta.`;
                                    
                                            const userPrompt = `Crie um roadmap de estudos completo e estruturado para o objetivo: "${objetivo}"

Requisitos:
1.  **Estrutura:** O JSON deve ser completo e bem formado, seguindo o schema definido.
2.  **Etapas:** Crie entre 3 a 5 etapas lógicas e progressivas (do básico ao avançado).
3.  **Tecnologias:** Cada etapa deve conter de 3 a 5 tecnologias ou conceitos essenciais.
4.  **Estimativas:** Forneça um tempo de estudo realista para cada tecnologia.
5.  **Ordenação:** Ordene as tecnologias do mais fundamental ao mais avançado dentro de cada etapa.
6.  **Classificação:** Classifique cada tecnologia como "Essencial", "Importante" ou "Diferencial".

O roadmap deve ser prático, focado no mercado de trabalho atual e garantir que a resposta JSON seja sempre completa e sem erros de sintaxe.`;
        const payload = {
            contents: [{ parts: [{ text: userPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                temperature: 1,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        };

        let retries = 3;
        while (retries > 0) {
            try {
                console.log(`🤖 Chamando API Gemini... (Tentativas restantes: ${retries})`);

                const response = await fetch(GEMINI_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Erro da API Gemini: ${errorText}`);
                }

                const data = await response.json();

                if (data.promptFeedback && data.promptFeedback.blockReason) {
                    throw new Error(`API bloqueou o prompt por: ${data.promptFeedback.blockReason}`);
                }
                if (data.candidates[0].finishReason !== 'STOP') {
                     throw new Error(`API terminou inesperadamente: ${data.candidates[0].finishReason}`);
                }

                const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!jsonText) {
                    throw new Error('Resposta da API vazia ou em formato inesperado.');
                }

                const roadmap = JSON.parse(jsonText);
                
                if (!roadmap.objetivo || !roadmap.etapas || roadmap.etapas.length === 0) {
                    throw new Error('JSON recebido é inválido ou incompleto.');
                }

                console.log('✅ Roadmap gerado e validado com sucesso!');
                return res.json(roadmap);

            } catch (error) {
                console.error(`❌ Erro ao gerar roadmap (Tentativa ${4 - retries}):`, error.message);
                retries--;
                if (retries === 0) {
                    return res.status(500).json({ 
                        error: 'Não foi possível gerar o roadmap após várias tentativas.',
                        details: error.message 
                    });
                }
            }
        }
    } catch (error) {
        console.error('❌ Erro ao gerar roadmap:', error);
        res.status(500).json({ 
            error: 'Erro ao gerar roadmap',
            details: error.message 
        });
    }
});

// ========== ROTA: GERAR DESAFIOS ==========
app.post('/api/gerar-desafios', async (req, res) => {
    const { techName } = req.body;

    if (!techName) {
        return res.status(400).json({ error: 'techName é obrigatório' });
    }

    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY não configurada' });
    }

    const prompt = `Crie 3 ideias de projetos práticos para um estudante que está aprendendo ${techName}. 
    Os projetos devem ser de diferentes níveis de dificuldade: iniciante, intermediário e avançado.
    Para cada projeto, forneça um nome, uma descrição curta e o nível de dificuldade.
    O objetivo é que o estudante possa aplicar os conhecimentos adquiridos em ${techName}.
    Responda em formato JSON, com a seguinte estrutura:
    {
        "projetos": [
            {
                "nome": "Nome do Projeto",
                "descricao": "Descrição do Projeto",
                "nivel": "Iniciante"
            }
        ]
    }`;

    try {
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 1,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
                responseMimeType: "application/json",
            }
        };

        console.log('🤖 Chamando API Gemini para gerar desafios...');

        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erro da API:', errorText);
            return res.status(response.status).json({ 
                error: 'Erro ao chamar API Gemini',
                details: errorText 
            });
        }

        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!jsonText) {
            console.error('❌ Resposta vazia da API');
            return res.status(500).json({ error: 'Resposta vazia da API' });
        }

        const desafios = JSON.parse(jsonText);
        console.log('✅ Desafios gerados com sucesso!');
        
        res.json(desafios);

    } catch (error) {
        console.error('❌ Erro ao gerar desafios:', error);
        res.status(500).json({ 
            error: 'Erro ao gerar desafios',
            details: error.message 
        });
    }
});

// ========== ROTA: HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'DevPath API está rodando',
        apiKey: GEMINI_API_KEY ? 'Configurada' : 'NÃO configurada'
    });
});

// ========== INICIAR SERVIDOR ==========
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log(`🔑 API Key: ${GEMINI_API_KEY ? 'Configurada ✅' : 'NÃO configurada ❌'}`);
    console.log(`📄 Acesse: http://localhost:${PORT}/index.html\n`);
});


app.use(cors({
    origin: "*",
    methods: "GET,POST",
    allowedHeaders: ["Content-Type", "Authorization"]
}));
