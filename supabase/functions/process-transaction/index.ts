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
    const { text, imageBase64, mimeType, categories } = await req.json()
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

    if (!GEMINI_API_KEY) {
      throw new Error('Missing GEMINI_API_KEY environment variable')
    }

    const systemPrompt = `
Eres un asistente financiero avanzado con visión. Tu tarea es extraer la información de la transacción proporcionada por el usuario (ya sea por voz, texto o imagen de un recibo/factura) y devolver UNICAMENTE un objeto JSON válido, sin formato markdown ni texto adicional.

REGLAS DE INTERPRETACION:
1. Detectar si es "ingreso" o "gasto" (las facturas o recibos de compra son gastos por defecto).
2. Extraer el valor numérico (total) sin símbolos (ej: "45 mil" -> 45000). Si el valor es cero o nulo, pon 0. Si hay propina en la factura, suma la propina al total.
3. Identificar categoría SOLO de esta lista dinámica: [${categories.join(", ")}].
4. Extraer comercio o fuente. Si lees el logo de un comercio en la imagen, úsalo (ej: "Carulla", "Uber"). Si no, pon "no especificado".
5. Clasificar el subtipo (cost_type): "fixed", "variable", o "na" (para ingresos).
6. Detectar fecha: Si la imagen tiene una fecha, usa esa en formato YYYY-MM-DD. Si es por texto: "hoy"=${new Date().toISOString().split('T')[0]}.
7. Generar descripción corta y clara de lo comprado.
8. Si hay imagen Y texto, usa la imagen para los montos y el comercio, y el texto para contexto adicional.

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
    const parts: any[] = [
      { text: systemPrompt },
      { text: text ? `Transacción a analizar: "${text}"` : "Por favor analiza la imagen adjunta." }
    ]

    if (imageBase64 && mimeType) {
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: imageBase64
        }
      })
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: parts
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
