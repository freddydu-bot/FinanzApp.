import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text, categories } = await req.json()
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

    if (!GEMINI_API_KEY) {
      throw new Error('Missing GEMINI_API_KEY environment variable')
    }

    const systemPrompt = `
Eres un asistente financiero avanzado. Tu tarea es extraer la información de la transacción proporcionada por el usuario y devolver UNICAMENTE un objeto JSON válido, sin formato markdown ni texto adicional.

REGLAS DE INTERPRETACION:
1. Detectar si es "ingreso" o "gasto".
2. Extraer el valor numérico sin símbolos (ej: "45 mil" -> 45000, "2 millones" -> 2000000, "lucas" -> miles, "palos" -> millones). Si el valor es cero o nulo, pon 0.
3. Identificar categoría SOLO de esta lista dinámica proporcionada por la base de datos: [${categories.join(", ")}]. Si no coincide claramente, usa "Otros" o la categoría más parecida.
4. Extraer comercio o fuente (si no se menciona: "no especificado"). Si ya existe un comercio similar, estandarizarlo (ej: "uber", "exito").
5. Clasificar el subtipo (cost_type) como:
   - "fixed" (gastos fijos recurrentes: arriendo, suscripciones, servicios)
   - "variable" (gastos ocasionales)
   - "na" (para ingresos)
6. Detectar fecha:
   - "hoy" = fecha actual (${new Date().toISOString().split('T')[0]})
   - "ayer" = fecha de ayer
   - "mañana" = fecha de mañana
   - sin fecha clara = fecha actual
7. Generar descripción corta y clara.
8. Priorizar coherencia financiera sobre literalidad (ej. corregir errores del reconocimiento de voz por contexto).

FORMATO DE SALIDA OBLIGATORIO (JSON estricto):
{
  "type": "income" | "expense",
  "amount": number,
  "category_name": "string",
  "merchant": "string",
  "cost_type": "fixed" | "variable" | "na",
  "date": "YYYY-MM-DD",
  "description": "string"
}
`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: systemPrompt },
              { text: `Transacción a analizar: "${text}"` }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1
        }
      })
    })

    const data = await response.json()
    
    if (data.error) {
      console.error('Gemini API Error:', data.error)
      throw new Error(data.error.message || 'Error from Gemini API')
    }

    const resultText = data.candidates[0].content.parts[0].text
    const parsedData = JSON.parse(resultText)

    return new Response(
      JSON.stringify(parsedData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Edge Function Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
